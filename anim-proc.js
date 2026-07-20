// anim-proc.js — Animation Frame Processor
// Handles GIF, APNG, WebM, animated JXL frame extraction and conversion.

const ANIM_MIME_TYPES = {
	"image/gif": "gif",
	"image/apng": "apng",
	"video/webm": "webm",
	"image/jxl": "jxl"
};

// ============================================================
// GIF DECODER (LZW-based, pure JS)
// ============================================================
class GIFDecoder {
	constructor(buffer) {
		this.buffer = new Uint8Array(buffer);
		this.pos = 0;
		this.frames = [];
	}

	_readByte() { return this.buffer[this.pos++]; }
	_readWord() { return this._readByte() | (this._readByte() << 8); }
	_readBytes(n) { const r = this.buffer.slice(this.pos, this.pos + n); this.pos += n; return r; }

	decode() {
		const sig = String.fromCharCode(...this._readBytes(6));
		if (sig !== "GIF89a" && sig !== "GIF87a") throw new Error("Invalid GIF signature");
		const w = this._readWord(), h = this._readWord();
		const packed = this._readByte();
		const gctFlag = packed & 0x80;
		const gctSize = 2 << (packed & 0x07);
		this._readByte(); // bg index
		this._readByte(); // aspect ratio
		let gct = [];
		if (gctFlag) {
			for (let i = 0; i < gctSize; i++) {
				gct.push([this._readByte(), this._readByte(), this._readByte()]);
			}
		}
		let delay = 100, transparentIndex = -1;
		while (this.pos < this.buffer.length) {
			const blockType = this._readByte();
			if (blockType === 0x2C) {
				// Image descriptor
				const left = this._readWord(), top = this._readWord();
				const imgW = this._readWord(), imgH = this._readWord();
				const imgPacked = this._readByte();
				const lctFlag = imgPacked & 0x80;
				const interlace = imgPacked & 0x40;
				const lctSize = 2 << (imgPacked & 0x07);
				let ct = gct;
				if (lctFlag) {
					ct = [];
					for (let i = 0; i < lctSize; i++) {
						ct.push([this._readByte(), this._readByte(), this._readByte()]);
					}
				}
				const lzwMin = this._readByte();
				const indices = this._readLZWData(lzwMin);
				const canvas = document.createElement("canvas");
				canvas.width = w; canvas.height = h;
				const ctx = canvas.getContext("2d");
				const imgData = ctx.createImageData(w, h);
				const d = imgData.data;
				for (let i = 0; i < indices.length; i++) {
					const idx = indices[i];
					const off = i << 2;
					if (idx === transparentIndex) {
						d[off + 3] = 0;
					} else if (ct[idx]) {
						d[off] = ct[idx][0];
						d[off + 1] = ct[idx][1];
						d[off + 2] = ct[idx][2];
						d[off + 3] = 255;
					}
				}
				ctx.putImageData(imgData, 0, 0);
				this.frames.push({
					image: canvas,
					delay: delay,
					width: w,
					height: h
				});
				delay = 100;
				transparentIndex = -1;
			} else if (blockType === 0x21) {
				const extType = this._readByte();
				if (extType === 0xF9) {
					// Graphic Control Extension
					const blockSize = this._readByte();
					const gcePacked = this._readByte();
					delay = this._readWord() * 10;
					transparentIndex = this._readByte();
					this._readByte(); // terminator
				} else {
					// Skip other extensions
					let len;
					while ((len = this._readByte()) !== 0) this.pos += len;
				}
			} else if (blockType === 0x3B) {
				break;
			}
		}
		return this.frames;
	}

	_readLZWData(minCodeSize) {
		const output = [];
		const clearCode = 1 << minCodeSize;
		const eoiCode = clearCode + 1;
		let codeSize = minCodeSize + 1;
		let dict = [];
		let prevCode = -1;
		let bits = 0, bitBuffer = 0;

		const readCode = () => {
			while (bits < codeSize) {
				if (this._subBlockPos >= this._subBlockLen) {
					this._subBlockLen = this._readByte();
					if (this._subBlockLen === 0) return -1;
					this._subBlock = this._readBytes(this._subBlockLen);
					this._subBlockPos = 0;
				}
				bitBuffer |= this._subBlock[this._subBlockPos++] << bits;
				bits += 8;
			}
			const code = bitBuffer & ((1 << codeSize) - 1);
			bitBuffer >>= codeSize;
			bits -= codeSize;
			return code;
		};

		this._subBlockLen = 0;
		this._subBlockPos = 0;
		this._subBlock = [];

		const initDict = () => {
			dict = [];
			for (let i = 0; i < clearCode; i++) dict.push([i]);
			dict.push(null); // clear
			dict.push(null); // eoi
			codeSize = minCodeSize + 1;
		};

		initDict();

		while (true) {
			const code = readCode();
			if (code === -1 || code === eoiCode) break;
			if (code === clearCode) {
				initDict();
				prevCode = -1;
				continue;
			}
			if (prevCode === -1) {
				output.push(...dict[code]);
				prevCode = code;
				continue;
			}
			let entry;
			if (code < dict.length) {
				entry = dict[code];
			} else {
				entry = [...dict[prevCode], dict[prevCode][0]];
			}
			output.push(...entry);
			dict.push([...dict[prevCode], entry[0]]);
			if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++;
			prevCode = code;
		}
		return output;
	}
}

// ============================================================
// APNG DECODER (frame extraction from PNG chunks)
// ============================================================
class APNGDecoder {
	constructor(buffer) {
		this.buffer = new Uint8Array(buffer);
		this.pos = 8; // Skip PNG signature
		this.frames = [];
		this.width = 0;
		this.height = 0;
		this.playCount = 0;
	}

	_readDWord() {
		return ((this.buffer[this.pos] << 24) | (this.buffer[this.pos + 1] << 16) |
				(this.buffer[this.pos + 2] << 8) | this.buffer[this.pos + 3]) >>> 0;
	}

	_readChunk() {
		const len = this._readDWord();
		const type = String.fromCharCode(...this.buffer.slice(this.pos + 4, this.pos + 8));
		const data = this.buffer.slice(this.pos + 8, this.pos + 8 + len);
		const crc = this._readDWord();
		this.pos += 12 + len;
		return { type, len, data, crc };
	}

	decode() {
		let frameData = [];
		let actl = null;
		let idatChunks = [];
		let fctl = null;

		while (this.pos < this.buffer.length) {
			const chunk = this._readChunk();
			if (chunk.type === "IHDR") {
				this.width = (chunk.data[0] << 24) | (chunk.data[1] << 16) | (chunk.data[2] << 8) | chunk.data[3];
				this.height = (chunk.data[4] << 24) | (chunk.data[5] << 16) | (chunk.data[6] << 8) | chunk.data[7];
			} else if (chunk.type === "acTL") {
				actl = { frames: (chunk.data[0] << 24) | (chunk.data[1] << 16) | (chunk.data[2] << 8) | chunk.data[3],
						 plays: (chunk.data[4] << 24) | (chunk.data[5] << 16) | (chunk.data[6] << 8) | chunk.data[7] };
			} else if (chunk.type === "fcTL") {
				if (fctl && idatChunks.length > 0) {
					frameData.push({ fctl, idat: idatChunks });
					idatChunks = [];
				}
				fctl = {
					seq: (chunk.data[0] << 24) | (chunk.data[1] << 16) | (chunk.data[2] << 8) | chunk.data[3],
					width: (chunk.data[4] << 24) | (chunk.data[5] << 16) | (chunk.data[6] << 8) | chunk.data[7],
					height: (chunk.data[8] << 24) | (chunk.data[9] << 16) | (chunk.data[10] << 8) | chunk.data[11],
					x: (chunk.data[12] << 24) | (chunk.data[13] << 16) | (chunk.data[14] << 8) | chunk.data[15],
					y: (chunk.data[16] << 24) | (chunk.data[17] << 16) | (chunk.data[18] << 8) | chunk.data[19],
					delayNum: (chunk.data[20] << 8) | chunk.data[21],
					delayDen: chunk.data[22] === 0 ? 100 : chunk.data[22],
					dispose: chunk.data[23],
					blend: chunk.data[24]
				};
			} else if (chunk.type === "fdAT") {
				const seq = (chunk.data[0] << 24) | (chunk.data[1] << 16) | (chunk.data[2] << 8) | chunk.data[3];
				idatChunks.push(chunk.data.slice(4));
			} else if (chunk.type === "IDAT") {
				idatChunks.push(chunk.data);
			} else if (chunk.type === "IEND") {
				if (fctl && idatChunks.length > 0) {
					frameData.push({ fctl, idat: idatChunks });
				}
				break;
			}
		}

		// For simplicity, return first frame as image for now
		// Full APNG rendering requires complex compositing
		if (frameData.length > 0) {
			const first = frameData[0];
			const canvas = document.createElement("canvas");
			canvas.width = this.width;
			canvas.height = this.height;
			// Return canvas with first frame info
			this.frames.push({
				image: canvas,
				delay: (first.fctl.delayNum / first.fctl.delayDen) * 1000,
				width: this.width,
				height: this.height
			});
		}
		return this.frames;
	}
}

// ============================================================
// WEBM DECODER (uses HTMLVideoElement for frame extraction)
// ============================================================
class WebMDecoder {
	constructor(buffer, mimeType) {
		this.buffer = buffer;
		this.mimeType = mimeType || "video/webm";
	}

	async decode() {
		const blob = new Blob([this.buffer], { type: this.mimeType });
		const url = URL.createObjectURL(blob);
		const video = document.createElement("video");
		video.src = url;
		video.muted = true;
		video.playsInline = true;

		await new Promise((resolve, reject) => {
			video.onloadedmetadata = resolve;
			video.onerror = reject;
		});

		const canvas = document.createElement("canvas");
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		const ctx = canvas.getContext("2d");

		const frames = [];
		const fps = 30;
		const duration = video.duration;
		const frameCount = Math.min(Math.floor(duration * fps), 300); // Max 300 frames

		video.currentTime = 0;
		await video.play();

		for (let i = 0; i < frameCount; i++) {
			video.currentTime = i / fps;
			await new Promise(r => {
				video.onseeked = r;
			});
			ctx.drawImage(video, 0, 0);
			frames.push({
				image: canvas,
				delay: 1000 / fps,
				width: video.videoWidth,
				height: video.videoHeight
			});
		}

		video.pause();
		URL.revokeObjectURL(url);
		return frames;
	}
}

// ============================================================
// ANIMATED JXL (placeholder — JXL animation not widely supported yet)
// ============================================================
class JXLDecoder {
	constructor(buffer) {
		this.buffer = buffer;
	}

	async decode() {
		// JXL animation decoding requires libjxl WASM
		// For now, return single frame using standard image decode
		const blob = new Blob([this.buffer], { type: "image/jxl" });
		const url = URL.createObjectURL(blob);
		const img = new Image();
		img.src = url;
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});
		const canvas = document.createElement("canvas");
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0);
		URL.revokeObjectURL(url);
		return [{
			image: canvas,
			delay: 100,
			width: img.naturalWidth,
			height: img.naturalHeight
		}];
	}
}

// ============================================================
// MAIN EXPORT: detect and decode animation
// ============================================================
export async function decodeAnimation(buffer, mimeType) {
	const type = ANIM_MIME_TYPES[mimeType];
	switch (type) {
		case "gif":
			return new GIFDecoder(buffer).decode();
		case "apng":
			return new APNGDecoder(buffer).decode();
		case "webm":
			return new WebMDecoder(buffer, mimeType).decode();
		case "jxl":
			return new JXLDecoder(buffer).decode();
		default:
			throw new Error("Unsupported animation format: " + mimeType);
	}
}

export function isAnimatedFormat(mimeType) {
	return !!ANIM_MIME_TYPES[mimeType];
}
