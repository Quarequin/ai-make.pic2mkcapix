// animproc.js — MIME detection and animation frame decoding.
// Safe HTML guidance: https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML

const ANIM_MIME_TYPES = Object.freeze({
	'image/gif': 'gif',
	'image/apng': 'apng',
	'video/webm': 'webm',
	'image/jxl': 'jxl',
});

const clampDelay = (value) => Math.max(10, Number.isFinite(value) ? value : 100);
const readU32 = (bytes, offset) => (
	((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
);
const readU16 = (bytes, offset) => bytes[offset] | (bytes[offset + 1] << 8);
const ascii = (bytes, offset, length) => String.fromCharCode(...bytes.slice(offset, offset + length));

function isAnimatedFormat(mimeType) {
	return Object.prototype.hasOwnProperty.call(ANIM_MIME_TYPES, String(mimeType).toLowerCase());
}

function readGifRepeat(bytes) {
	if (bytes.length < 13) return null;
	let pos = 13;
	const packed = bytes[10];
	if (packed & 0x80) pos += 3 * (1 << ((packed & 0x07) + 1));
	while (pos < bytes.length) {
		const marker = bytes[pos++];
		if (marker === 0x3b || marker === 0x2c) break;
		if (marker !== 0x21 || pos >= bytes.length) return null;
		const type = bytes[pos++];
		const data = [];
		if (type === 0xff) {
			if (pos >= bytes.length) return null;
			const blockSize = bytes[pos++];
			if (pos + blockSize > bytes.length) return null;
			const application = ascii(bytes, pos, blockSize);
			pos += blockSize;
			while (pos < bytes.length) {
				const length = bytes[pos++];
				if (!length) break;
				if (pos + length > bytes.length) return null;
				data.push(...bytes.slice(pos, pos + length));
				pos += length;
			}
			if ((application.startsWith('NETSCAPE') || application.startsWith('ANIMEXTS')) && data[0] === 1 && data.length >= 3) return data[1] | (data[2] << 8);
		} else {
			while (pos < bytes.length) {
				const length = bytes[pos++];
				if (!length) break;
				pos += length;
			}
		}
	}
	return null;
}

function countGifImageDescriptors(bytes) {
	if (bytes.length < 13) return 0;
	let pos = 13;
	const packed = bytes[10];
	if (packed & 0x80) pos += 3 * (1 << ((packed & 0x07) + 1));
	let count = 0;
	const skipSubBlocks = () => {
		while (pos < bytes.length) {
			const length = bytes[pos++];
			if (!length) return;
			pos += length;
		}
	};
	while (pos < bytes.length) {
		const marker = bytes[pos++];
		if (marker === 0x3b) break;
		if (marker === 0x2c) {
			if (pos + 9 > bytes.length) break;
			const framePacked = bytes[pos + 8];
			pos += 9;
			if (framePacked & 0x80) pos += 3 * (1 << ((framePacked & 0x07) + 1));
			if (pos >= bytes.length) break;
			pos += 1;
			skipSubBlocks();
			count += 1;
			continue;
		}
		if (marker === 0x21) {
			if (pos >= bytes.length) break;
			pos += 1;
			skipSubBlocks();
			continue;
		}
		break;
	}
	return count;
}

function isAnimatedBuffer(buffer, mimeType) {
	const bytes = new Uint8Array(buffer);
	const mime = String(mimeType || '').toLowerCase();
	if (mime === 'image/gif') return countGifImageDescriptors(bytes) > 1;
	if (mime === 'image/apng' || mime === 'image/png') {
		for (let pos = 8; pos + 12 <= bytes.length;) {
			const length = readU32(bytes, pos);
			const type = ascii(bytes, pos + 4, 4);
			if (type === 'acTL') return true;
			pos += length + 12;
		}
		return false;
	}
	if (mime === 'image/webp' && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
		const chunk = ascii(bytes, 12, 4);
		return chunk === 'ANIM' || chunk === 'ANMF' || (chunk === 'VP8X' && Boolean(bytes[20] & 0x02));
	}
	return mime === 'video/webm' || mime === 'image/jxl';
}

function cloneCanvas(source) {
	const canvas = document.createElement('canvas');
	canvas.width = source.width;
	canvas.height = source.height;
	canvas.getContext('2d').drawImage(source, 0, 0);
	return canvas;
}

function imageDataToCanvas(data, width, height) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d').putImageData(data, 0, 0);
	return canvas;
}

async function openImageDecoderStream(buffer, mimeType) {
	if (!('ImageDecoder' in window)) return null;
	const type = mimeType === 'image/apng' ? 'image/png' : mimeType;
	let decoder;
	try {
		decoder = new ImageDecoder({ data: buffer, type });
		await decoder.tracks.ready;
		const track = decoder.tracks.selectedTrack;
		const count = Math.max(0, track?.frameCount || 0);
		const repeat = Number.isFinite(track?.repetitionCount) ? track.repetitionCount : null;
		const stream = (async function* () {
			try {
				for (let index = 0; index < count; index += 1) {
					const result = await decoder.decode({ frameIndex: index });
					const image = result.image;
					const width = image.displayWidth || image.codedWidth;
					const height = image.displayHeight || image.codedHeight;
					const canvas = document.createElement('canvas');
					canvas.width = width;
					canvas.height = height;
					canvas.getContext('2d').drawImage(image, 0, 0, width, height);
					yield {
						image: canvas,
						delay: clampDelay((image.duration || 100000) / 1000),
						width,
						height,
						rect: { x: 0, y: 0, width, height },
						changedOnly: false,
						composited: true,
						compositionMode: 'replace',
					};
					image.close?.();
				}
			} finally {
				decoder.close?.();
			}
		})();
		stream.repeat = repeat;
		stream.frameCount = count;
		return stream;
	} catch (error) {
		decoder?.close?.();
		return null;
	}
}

class GIFDecoder {
	constructor(buffer) {
		this.bytes = new Uint8Array(buffer);
		this.pos = 0;
		this.frames = [];
		this.screen = null;
		this.width = 0;
		this.height = 0;
		this.globalTable = [];
		this.backgroundIndex = 0;
		this.delay = 100;
		this.transparentIndex = -1;
		this.disposal = 0;
		this.repeat = null;
	}

	readByte() {
		if (this.pos >= this.bytes.length) throw new Error('Unexpected end of GIF data.');
		return this.bytes[this.pos++];
	}

	readWord() {
		return this.readByte() | (this.readByte() << 8);
	}

	readBytes(length) {
		const end = this.pos + length;
		if (end > this.bytes.length) throw new Error('Invalid GIF block length.');
		const value = this.bytes.slice(this.pos, end);
		this.pos = end;
		return value;
	}

	readColorTable(size) {
		const table = [];
		for (let index = 0; index < size; index += 1) {
			table.push([this.readByte(), this.readByte(), this.readByte()]);
		}
		return table;
	}

	clearRect(imageData, x, y, width, height) {
		const left = Math.max(0, x);
		const top = Math.max(0, y);
		const right = Math.min(this.width, x + width);
		const bottom = Math.min(this.height, y + height);
		for (let row = top; row < bottom; row += 1) {
			const start = (row * this.width + left) * 4;
			imageData.data.fill(0, start, start + (right - left) * 4);
		}
	}

	decode() {
		const signature = ascii(this.readBytes(6), 0, 6);
		if (signature !== 'GIF87a' && signature !== 'GIF89a') throw new Error('Invalid GIF signature.');
		this.width = this.readWord();
		this.height = this.readWord();
		const packed = this.readByte();
		const hasGlobalTable = Boolean(packed & 0x80);
		const globalSize = 2 ** ((packed & 0x07) + 1);
		this.backgroundIndex = this.readByte();
		this.readByte();
		this.globalTable = hasGlobalTable ? this.readColorTable(globalSize) : [];
		this.screen = new ImageData(this.width, this.height);

		while (this.pos < this.bytes.length) {
			const marker = this.readByte();
			if (marker === 0x3b) break;
			if (marker === 0x21) {
				this.readExtension();
				continue;
			}
			if (marker !== 0x2c) throw new Error('Unknown GIF block marker.');
			const frame = this.readFrame();
			if (frame) this.frames.push(frame);
		}
		if (!this.frames.length) throw new Error('GIF contains no image frames.');
		this.frames.repeat = this.repeat;
		return this.frames;
	}

	readExtension() {
		const type = this.readByte();
		if (type === 0xf9) {
			const blockSize = this.readByte();
			if (blockSize !== 4) throw new Error('Invalid GIF graphic control extension.');
			const packed = this.readByte();
			this.disposal = (packed >> 2) & 0x07;
			this.delay = Math.max(10, this.readWord() * 10);
			const transparentIndex = this.readByte();
			this.transparentIndex = packed & 1 ? transparentIndex : -1;
			this.readByte();
			return;
		}
		if (type === 0xff) {
			const blockSize = this.readByte();
			const application = ascii(this.readBytes(blockSize), 0, blockSize);
			const data = [];
			let length;
			while ((length = this.readByte()) !== 0) data.push(...this.readBytes(length));
			if ((application.startsWith('NETSCAPE') || application.startsWith('ANIMEXTS')) && data[0] === 1 && data.length >= 3) this.repeat = data[1] | (data[2] << 8);
			return;
		}
		let length;
		while ((length = this.readByte()) !== 0) this.readBytes(length);
	}

	readFrame() {
		const x = this.readWord();
		const y = this.readWord();
		const width = this.readWord();
		const height = this.readWord();
		const packed = this.readByte();
		const hasLocalTable = Boolean(packed & 0x80);
		const interlaced = Boolean(packed & 0x40);
		const tableSize = 2 ** ((packed & 0x07) + 1);
		const table = hasLocalTable ? this.readColorTable(tableSize) : this.globalTable;
		const indices = this.readLZWData(this.readByte(), width * height);
		const before = this.disposal === 3 ? new Uint8ClampedArray(this.screen.data) : null;
		const rows = [];
		if (interlaced) {
			for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) {
				for (let row = start; row < height; row += step) rows.push(row);
			}
		} else {
			for (let row = 0; row < height; row += 1) rows.push(row);
		}
		let source = 0;
		for (const row of rows) {
			for (let col = 0; col < width; col += 1) {
				const colorIndex = indices[source++];
				if (colorIndex === this.transparentIndex) continue;
				const color = table[colorIndex];
				if (!color) continue;
				const px = x + col;
				const py = y + row;
				if (px < 0 || py < 0 || px >= this.width || py >= this.height) continue;
				const offset = (py * this.width + px) * 4;
				this.screen.data[offset] = color[0];
				this.screen.data[offset + 1] = color[1];
				this.screen.data[offset + 2] = color[2];
				this.screen.data[offset + 3] = 255;
			}
		}
		const image = imageDataToCanvas(this.screen, this.width, this.height);
		const changedOnly = x !== 0 || y !== 0 || width !== this.width || height !== this.height;
		const frame = {
			image,
			delay: clampDelay(this.delay),
			width: this.width,
			height: this.height,
			rect: { x, y, width, height },
			changedOnly,
			composited: true,
			compositionMode: changedOnly ? 'latest' : 'replace',
			disposal: this.disposal,
		};
		if (this.disposal === 2) this.clearRect(this.screen, x, y, width, height);
		if (this.disposal === 3 && before) this.screen.data.set(before);
		this.delay = 100;
		this.transparentIndex = -1;
		this.disposal = 0;
		return frame;
	}

	async *stream() {
		this.pos = 0;
		this.frames = [];
		const signature = ascii(this.readBytes(6), 0, 6);
		if (signature !== 'GIF87a' && signature !== 'GIF89a') throw new Error('Invalid GIF signature.');
		this.width = this.readWord();
		this.height = this.readWord();
		const packed = this.readByte();
		const hasGlobalTable = Boolean(packed & 0x80);
		const globalSize = 2 ** ((packed & 0x07) + 1);
		this.backgroundIndex = this.readByte();
		this.readByte();
		this.globalTable = hasGlobalTable ? this.readColorTable(globalSize) : [];
		this.screen = new ImageData(this.width, this.height);
		while (this.pos < this.bytes.length) {
			const marker = this.readByte();
			if (marker === 0x3b) break;
			if (marker === 0x21) {
				this.readExtension();
				continue;
			}
			if (marker !== 0x2c) throw new Error('Unknown GIF block marker.');
			yield this.readFrame();
		}
		if (!this.width || !this.height) throw new Error('GIF contains no image frames.');
	}

	readLZWData(minCodeSize, expectedLength) {
		const compressed = [];
		let blockLength;
		while ((blockLength = this.readByte()) !== 0) compressed.push(...this.readBytes(blockLength));
		const clear = 1 << minCodeSize;
		const end = clear + 1;
		let codeSize = minCodeSize + 1;
		let dictionary;
		let nextCode;
		let bitBuffer = 0;
		let bitCount = 0;
		let offset = 0;
		const output = [];
		const reset = () => {
			dictionary = Array.from({ length: clear }, (_, index) => [index]);
			dictionary.push(null, null);
			nextCode = end + 1;
			codeSize = minCodeSize + 1;
		};
		const readCode = () => {
			while (bitCount < codeSize && offset < compressed.length) {
				bitBuffer |= compressed[offset++] << bitCount;
				bitCount += 8;
			}
			if (bitCount < codeSize) return -1;
			const code = bitBuffer & ((1 << codeSize) - 1);
			bitBuffer >>= codeSize;
			bitCount -= codeSize;
			return code;
		};
		reset();
		let previous = null;
		while (output.length < expectedLength) {
			const code = readCode();
			if (code < 0 || code === end) break;
			if (code === clear) {
				reset();
				previous = null;
				continue;
			}
			let entry;
			if (code < dictionary.length && dictionary[code]) entry = dictionary[code];
			else if (code === nextCode && previous) entry = [...previous, previous[0]];
			else throw new Error('Invalid GIF LZW code.');
			output.push(...entry);
			if (previous && nextCode < 4096) {
				dictionary[nextCode++] = [...previous, entry[0]];
				if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
			}
			previous = entry;
		}
		return output.slice(0, expectedLength);
	}
}

class PNGDecoder {
	constructor(buffer) {
		this.bytes = new Uint8Array(buffer);
		this.width = 0;
		this.height = 0;
		this.bitDepth = 0;
		this.colorType = 0;
		this.palette = [];
		this.transparency = [];
		this.playCount = 0;
		this.frames = [];
	}

	async inflate(chunks) {
		if (!('DecompressionStream' in window)) throw new Error('APNG decoding needs browser DecompressionStream support.');
		const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
		const joined = new Uint8Array(total);
		let offset = 0;
		for (const chunk of chunks) {
			joined.set(chunk, offset);
			offset += chunk.length;
		}
		const stream = new Blob([joined]).stream().pipeThrough(new DecompressionStream('deflate'));
		return new Uint8Array(await new Response(stream).arrayBuffer());
	}

	parseChunks() {
		const signature = [137, 80, 78, 71, 13, 10, 26, 10];
		if (!signature.every((value, index) => this.bytes[index] === value)) throw new Error('Invalid PNG signature.');
		const defaultChunks = [];
		const frames = [];
		let current = null;
		for (let pos = 8; pos + 12 <= this.bytes.length;) {
			const length = readU32(this.bytes, pos);
			const type = ascii(this.bytes, pos + 4, 4);
			const data = this.bytes.subarray(pos + 8, pos + 8 + length);
			pos += length + 12;
			if (type === 'IHDR') {
				this.width = readU32(data, 0);
				this.height = readU32(data, 4);
				this.bitDepth = data[8];
				this.colorType = data[9];
			} else if (type === 'acTL') {
				this.playCount = readU32(data, 4);
			} else if (type === 'PLTE') {
				for (let index = 0; index < data.length; index += 3) this.palette.push([data[index], data[index + 1], data[index + 2]]);
			} else if (type === 'tRNS') {
				this.transparency = [...data];
			} else if (type === 'fcTL') {
				if (current) frames.push(current);
				current = {
					control: {
						width: readU32(data, 4),
						height: readU32(data, 8),
						x: readU32(data, 12),
						y: readU32(data, 16),
						delayNum: (data[20] << 8) | data[21],
						delayDen: ((data[22] << 8) | data[23]) || 100,
						dispose: data[24],
						blend: data[25],
					},
					chunks: [],
				};
			} else if (type === 'IDAT') {
				(current ? current.chunks : defaultChunks).push(data);
			} else if (type === 'fdAT' && current) {
				current.chunks.push(data.slice(4));
			} else if (type === 'IEND') {
				break;
			}
		}
		if (current) frames.push(current);
		if (defaultChunks.length && frames.length && !frames[0].chunks.length) frames[0].chunks = defaultChunks;
		return { frames, defaultChunks };
	}

	unfilter(raw, width, height, bytesPerPixel) {
		const stride = width * bytesPerPixel;
		const result = new Uint8Array(stride * height);
		let source = 0;
		for (let y = 0; y < height; y += 1) {
			const filter = raw[source++];
			const rowStart = y * stride;
			for (let x = 0; x < stride; x += 1) {
				const value = raw[source++];
				const left = x >= bytesPerPixel ? result[rowStart + x - bytesPerPixel] : 0;
				const above = y ? result[rowStart - stride + x] : 0;
				const upperLeft = y && x >= bytesPerPixel ? result[rowStart - stride + x - bytesPerPixel] : 0;
				let decoded = value;
				if (filter === 1) decoded = value + left;
				else if (filter === 2) decoded = value + above;
				else if (filter === 3) decoded = value + Math.floor((left + above) / 2);
				else if (filter === 4) {
					const estimate = left + above - upperLeft;
					const pa = Math.abs(estimate - left);
					const pb = Math.abs(estimate - above);
					const pc = Math.abs(estimate - upperLeft);
					decoded = value + (pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft);
				}
				result[rowStart + x] = decoded & 255;
			}
		}
		return result;
	}

	async decodePixels(chunks, width, height) {
		if (this.bitDepth !== 8) throw new Error('Only 8-bit PNG/APNG frames are supported.');
		const bytesPerPixel = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[this.colorType];
		if (!bytesPerPixel) throw new Error(`Unsupported PNG color type: ${this.colorType}.`);
		const raw = this.unfilter(await this.inflate(chunks), width, height, bytesPerPixel);
		const data = new Uint8ClampedArray(width * height * 4);
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const source = (y * width + x) * bytesPerPixel;
				const target = (y * width + x) * 4;
				let r = 0; let g = 0; let b = 0; let a = 255;
				if (this.colorType === 6) [r, g, b, a] = raw.slice(source, source + 4);
				else if (this.colorType === 2) [r, g, b] = raw.slice(source, source + 3);
				else if (this.colorType === 4) [r, a] = raw.slice(source, source + 2), g = r, b = r;
				else if (this.colorType === 0) r = g = b = raw[source];
				else if (this.colorType === 3) {
					const color = this.palette[raw[source]] || [0, 0, 0];
					[r, g, b] = color;
					a = this.transparency[raw[source]] ?? 255;
				}
				data[target] = r; data[target + 1] = g; data[target + 2] = b; data[target + 3] = a;
			}
		}
		return new ImageData(data, width, height);
	}

	async *stream() {
		const parsed = this.parseChunks();
		if (!parsed.frames.length) throw new Error('PNG does not contain APNG frame controls.');
		const screen = document.createElement('canvas');
		screen.width = this.width;
		screen.height = this.height;
		const screenContext = screen.getContext('2d');
		for (const frame of parsed.frames) {
			const control = frame.control;
			const frameData = await this.decodePixels(frame.chunks, control.width, control.height);
			const backup = control.dispose === 2 ? screenContext.getImageData(0, 0, this.width, this.height) : null;
			if (control.blend === 0) screenContext.clearRect(control.x, control.y, control.width, control.height);
			const patch = imageDataToCanvas(frameData, control.width, control.height);
			screenContext.drawImage(patch, control.x, control.y);
			const image = cloneCanvas(screen);
			patch.width = 0;
			patch.height = 0;
			const changedOnly = control.x !== 0 || control.y !== 0 || control.width !== this.width || control.height !== this.height;
			yield {
				image,
				delay: clampDelay(1000 * control.delayNum / control.delayDen),
				width: this.width,
				height: this.height,
				rect: { x: control.x, y: control.y, width: control.width, height: control.height },
				changedOnly,
				composited: true,
				compositionMode: control.blend === 1 ? 'overlay' : 'replace',
				disposal: control.dispose,
			};
			if (control.dispose === 1) screenContext.clearRect(control.x, control.y, control.width, control.height);
			else if (control.dispose === 2 && backup) screenContext.putImageData(backup, 0, 0);
		}
	}

	async decode() {
		const frames = [];
		for await (const frame of this.stream()) frames.push(frame);
		frames.repeat = this.playCount;
		return frames;
	}
}

class WebMDecoder {
	constructor(buffer, mimeType) {
		this.buffer = buffer;
		this.mimeType = mimeType || 'video/webm';
	}

	async open() {
		const url = URL.createObjectURL(new Blob([this.buffer], { type: this.mimeType }));
		const video = document.createElement('video');
		video.src = url;
		video.muted = true;
		video.playsInline = true;
		video.preload = 'auto';
		try {
			await new Promise((resolve, reject) => {
				video.onloadedmetadata = resolve;
				video.onerror = () => reject(new Error('Unable to decode WebM video.'));
			});
			const width = video.videoWidth;
			const height = video.videoHeight;
			const duration = Number.isFinite(video.duration) ? video.duration : 0;
			const fps = 30;
			const frameCount = Math.max(1, Math.ceil(duration * fps));
			const stream = (async function* () {
				try {
					video.pause();
					for (let index = 0; index < frameCount; index += 1) {
						const time = duration ? Math.min(index / fps, Math.max(0, duration - 0.001)) : 0;
						await new Promise((resolve, reject) => {
							const done = () => { video.removeEventListener('seeked', done); resolve(); };
							const failed = () => { video.removeEventListener('error', failed); reject(new Error('WebM frame seek failed.')); };
							video.addEventListener('seeked', done, { once: true });
							video.addEventListener('error', failed, { once: true });
							video.currentTime = time;
						});
						const canvas = document.createElement('canvas');
						canvas.width = width;
						canvas.height = height;
						canvas.getContext('2d').drawImage(video, 0, 0, width, height);
						yield { image: canvas, delay: 1000 / fps, width, height, rect: { x: 0, y: 0, width, height }, changedOnly: false, composited: true, compositionMode: 'replace' };
					}
				} finally {
					video.pause();
					video.removeAttribute('src');
					video.load();
					URL.revokeObjectURL(url);
				}
			})();
			stream.frameCount = frameCount;
			stream.repeat = 0;
			return stream;
		} catch (error) {
			video.removeAttribute('src');
			video.load();
			URL.revokeObjectURL(url);
			throw error;
		}
	}

	async decode() {
		const stream = await this.open();
		const frames = [];
		for await (const frame of stream) frames.push(frame);
		frames.repeat = stream.repeat;
		return frames;
	}
}

async function decodeJXL(buffer) {
	const url = URL.createObjectURL(new Blob([buffer], { type: 'image/jxl' }));
	try {
		const image = new Image();
		image.src = url;
		await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Unable to decode JXL image.')); });
		const canvas = document.createElement('canvas');
		canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
		canvas.getContext('2d').drawImage(image, 0, 0);
		return [{ image: canvas, delay: 100, width: canvas.width, height: canvas.height, rect: { x: 0, y: 0, width: canvas.width, height: canvas.height }, changedOnly: false, composited: true, compositionMode: 'latest' }];
	} finally {
		URL.revokeObjectURL(url);
	}
}

function frameArraySource(frames) {
	const source = {
		frameCount: frames.length,
		repeat: frames.repeat ?? null,
		open: async () => (async function* () {
			for (const frame of frames) yield frame;
		}()),
	};
	return source;
}

async function decodeAnimation(buffer, mimeType) {
	const mime = String(mimeType || '').toLowerCase();
	if (mime === 'image/gif') {
		const source = {
			frameCount: countGifImageDescriptors(new Uint8Array(buffer)),
			repeat: readGifRepeat(new Uint8Array(buffer)),
			open: async () => {
				const decoder = new GIFDecoder(buffer);
				const stream = (async function* () {
					for await (const frame of decoder.stream()) yield frame;
					source.repeat = decoder.repeat;
				})();
				return stream;
			},
		};
		return source;
	}
	if (mime === 'image/apng' || (mime === 'image/png' && isAnimatedBuffer(buffer, mime))) {
		const probe = new PNGDecoder(buffer);
		const parsed = probe.parseChunks();
		return {
			frameCount: parsed.frames.length,
			repeat: probe.playCount,
			open: async () => {
				const decoder = new PNGDecoder(buffer);
				return decoder.stream();
			},
		};
	}
	const nativeStream = await openImageDecoderStream(buffer, mime);
	if (nativeStream) {
		const frameCount = nativeStream.frameCount;
		const repeat = nativeStream.repeat;
		await nativeStream.return?.();
		return {
			frameCount,
			repeat,
			open: async () => openImageDecoderStream(buffer, mime),
		};
	}
	if (mime === 'video/webm') {
		return {
			frameCount: null,
			repeat: 0,
			open: async () => new WebMDecoder(buffer, mime).open(),
		};
	}
	if (mime === 'image/jxl') return frameArraySource(await decodeJXL(buffer));
	if (mime === 'image/webp') throw new Error('Animated WebP requires browser ImageDecoder support.');
	throw new Error(`Unsupported animation format: ${mimeType}.`);
}
