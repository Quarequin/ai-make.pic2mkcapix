const ANIM_MIME_TYPES = Object.freeze({
	"image/gif": "gif",
	"image/apng": "apng",
	"video/webm": "webm",
	"image/jxl": "jxl"
}), clampDelay = e => Math.max(10, Number.isFinite(e) ? e : 100), readU32 = (e, t) => (e[t] << 24 | e[t + 1] << 16 | e[t + 2] << 8 | e[t + 3]) >>> 0, readU16 = (e, t) => e[t] | e[t + 1] << 8, ascii = (e, t, r) => String.fromCharCode(...e.slice(t, t + r));

function isAnimatedFormat(e) {
	return Object.prototype.hasOwnProperty.call(ANIM_MIME_TYPES, String(e).toLowerCase());
}

function readGifRepeat(e) {
	if (e.length < 13) return null;
	let t = 13;
	const r = e[10];
	for (128 & r && (t += 3 * (1 << 1 + (7 & r))); t < e.length; ) {
		const r = e[t++];
		if (59 === r || 44 === r) break;
		if (33 !== r || t >= e.length) return null;
		const i = [];
		if (255 === e[t++]) {
			if (t >= e.length) return null;
			const r = e[t++];
			if (t + r > e.length) return null;
			const n = ascii(e, t, r);
			for (t += r; t < e.length; ) {
				const r = e[t++];
				if (!r) break;
				if (t + r > e.length) return null;
				i.push(...e.slice(t, t + r)), t += r;
			}
			if ((n.startsWith("NETSCAPE") || n.startsWith("ANIMEXTS")) && 1 === i[0] && i.length >= 3) return i[1] | i[2] << 8;
		} else for (;t < e.length; ) {
			const r = e[t++];
			if (!r) break;
			t += r;
		}
	}
	return null;
}

function countGifImageDescriptors(e) {
	if (e.length < 13) return 0;
	let t = 13;
	const r = e[10];
	128 & r && (t += 3 * (1 << 1 + (7 & r)));
	let i = 0;
	const n = () => {
		for (;t < e.length; ) {
			const r = e[t++];
			if (!r) return;
			t += r;
		}
	};
	for (;t < e.length; ) {
		const r = e[t++];
		if (59 === r) break;
		if (44 === r) {
			if (t + 9 > e.length) break;
			const r = e[t + 8];
			if (t += 9, 128 & r && (t += 3 * (1 << 1 + (7 & r))), t >= e.length) break;
			t += 1, n(), i += 1;
			continue;
		}
		if (33 !== r) break;
		if (t >= e.length) break;
		t += 1, n();
	}
	return i;
}

function isAnimatedBuffer(e, t) {
	const r = new Uint8Array(e), i = String(t || "").toLowerCase();
	if ("image/gif" === i) return countGifImageDescriptors(r) > 1;
	if ("image/apng" === i || "image/png" === i) {
		for (let e = 8; e + 12 <= r.length; ) {
			const t = readU32(r, e);
			if ("acTL" === ascii(r, e + 4, 4)) return !0;
			e += t + 12;
		}
		return !1;
	}
	if ("image/webp" === i && "RIFF" === ascii(r, 0, 4) && "WEBP" === ascii(r, 8, 4)) {
		const e = ascii(r, 12, 4);
		return "ANIM" === e || "ANMF" === e || "VP8X" === e && Boolean(2 & r[20]);
	}
	return "video/webm" === i || "image/jxl" === i;
}

function cloneCanvas(e) {
	const t = document.createElement("canvas");
	return t.width = e.width, t.height = e.height, t.getContext("2d").drawImage(e, 0, 0), 
	t;
}

function imageDataToCanvas(e, t, r) {
	const i = document.createElement("canvas");
	return i.width = t, i.height = r, i.getContext("2d").putImageData(e, 0, 0), i;
}

async function openImageDecoderStream(e, t) {
	if (!("ImageDecoder" in window)) return null;
	const r = "image/apng" === t ? "image/png" : t;
	let i;
	try {
		i = new ImageDecoder({
			data: e,
			type: r
		}), await i.tracks.ready;
		const t = i.tracks.selectedTrack, n = Math.max(0, t?.frameCount || 0), a = Number.isFinite(t?.repetitionCount) ? t.repetitionCount : null, s = async function*() {
			try {
				for (let e = 0; e < n; e += 1) {
					const t = (await i.decode({
						frameIndex: e
					})).image, r = t.displayWidth || t.codedWidth, n = t.displayHeight || t.codedHeight, a = document.createElement("canvas");
					a.width = r, a.height = n, a.getContext("2d").drawImage(t, 0, 0, r, n), yield {
						image: a,
						delay: clampDelay((t.duration || 1e5) / 1e3),
						width: r,
						height: n,
						rect: {
							x: 0,
							y: 0,
							width: r,
							height: n
						},
						changedOnly: !1,
						composited: !0,
						compositionMode: "replace"
					}, t.close?.();
				}
			} finally {
				i.close?.();
			}
		}();
		return s.repeat = a, s.frameCount = n, s;
	} catch (e) {
		return i?.close?.(), null;
	}
}

class GIFDecoder {
	constructor(e) {
		this.bytes = new Uint8Array(e), this.pos = 0, this.screen = null, this.width = 0, 
		this.height = 0, this.globalTable = [], this.backgroundIndex = 0, this.delay = 100, 
		this.transparentIndex = -1, this.disposal = 0, this.repeat = null;
	}
	readByte() {
		if (this.pos >= this.bytes.length) throw new Error("Unexpected end of GIF data.");
		return this.bytes[this.pos++];
	}
	readWord() {
		return this.readByte() | this.readByte() << 8;
	}
	readBytes(e) {
		const t = this.pos + e;
		if (t > this.bytes.length) throw new Error("Invalid GIF block length.");
		const r = this.bytes.subarray(this.pos, t);
		return this.pos = t, r;
	}
	readColorTable(e) {
		const t = new Uint8Array(3 * e);
		for (let e = 0; e < t.length; e += 1) t[e] = this.readByte();
		return t;
	}
	clearRect(e, t, r, i, n) {
		const a = Math.max(0, t), s = Math.max(0, r), o = Math.min(this.width, t + i), h = Math.min(this.height, r + n);
		for (let t = s; t < h; t += 1) {
			const r = 4 * (t * this.width + a);
			e.data.fill(0, r, r + 4 * (o - a));
		}
	}
	readExtension() {
		const e = this.readByte();
		if (249 === e) {
			if (4 !== this.readByte()) throw new Error("Invalid GIF graphic control extension.");
			const e = this.readByte();
			this.disposal = e >> 2 & 7, this.delay = Math.max(10, 10 * this.readWord());
			const t = this.readByte();
			return this.transparentIndex = 1 & e ? t : -1, void this.readByte();
		}
		if (255 === e) {
			const e = this.readByte(), t = ascii(this.readBytes(e), 0, e), r = [];
			let i;
			for (;0 !== (i = this.readByte()); ) r.push(...this.readBytes(i));
			return void ((t.startsWith("NETSCAPE") || t.startsWith("ANIMEXTS")) && 1 === r[0] && r.length >= 3 && (this.repeat = r[1] | r[2] << 8));
		}
		let t;
		for (;0 !== (t = this.readByte()); ) this.readBytes(t);
	}
	readFrame() {
		const e = this.readWord(), t = this.readWord(), r = this.readWord(), i = this.readWord(), n = this.readByte(), a = Boolean(128 & n), s = Boolean(64 & n), o = 2 ** (1 + (7 & n)), h = a ? this.readColorTable(o) : this.globalTable, c = this.readLZWData(this.readByte(), r * i), d = 3 === this.disposal ? new Uint8ClampedArray(this.screen.data) : null;
		let l = 0;
		const f = s ? 4 : 1;
		for (let n = 0; n < f; n += 1) {
			const a = s ? n < 2 ? 8 : 2 === n ? 4 : 2 : 1;
			for (let o = s ? 1 === n ? 4 : 2 === n ? 2 : 3 === n ? 1 : 0 : 0; o < i; o += a) for (let i = 0; i < r; i += 1) {
				const r = c[l++];
				if (r === this.transparentIndex) continue;
				const n = 3 * r;
				if (n + 2 >= h.length) continue;
				const a = e + i, s = t + o;
				if (a < 0 || s < 0 || a >= this.width || s >= this.height) continue;
				const d = 4 * (s * this.width + a);
				this.screen.data[d] = h[n], this.screen.data[d + 1] = h[n + 1], this.screen.data[d + 2] = h[n + 2], 
				this.screen.data[d + 3] = 255;
			}
		}
		const u = imageDataToCanvas(this.screen, this.width, this.height), g = 0 !== e || 0 !== t || r !== this.width || i !== this.height, p = {
			image: u,
			delay: clampDelay(this.delay),
			width: this.width,
			height: this.height,
			rect: {
				x: e,
				y: t,
				width: r,
				height: i
			},
			changedOnly: g,
			composited: !0,
			compositionMode: g ? "latest" : "replace",
			disposal: this.disposal
		};
		return 2 === this.disposal && this.clearRect(this.screen, e, t, r, i), 3 === this.disposal && d && this.screen.data.set(d), 
		this.delay = 100, this.transparentIndex = -1, this.disposal = 0, p;
	}
	async* stream() {
		this.pos = 0;
		const e = ascii(this.readBytes(6), 0, 6);
		if ("GIF87a" !== e && "GIF89a" !== e) throw new Error("Invalid GIF signature.");
		this.width = this.readWord(), this.height = this.readWord();
		const t = this.readByte(), r = Boolean(128 & t), i = 2 ** (1 + (7 & t));
		for (this.backgroundIndex = this.readByte(), this.readByte(), this.globalTable = r ? this.readColorTable(i) : [], 
		this.screen = new ImageData(this.width, this.height); this.pos < this.bytes.length; ) {
			const e = this.readByte();
			if (59 === e) break;
			if (33 !== e) {
				if (44 !== e) throw new Error("Unknown GIF block marker.");
				yield this.readFrame();
			} else this.readExtension();
		}
		if (!this.width || !this.height) throw new Error("GIF contains no image frames.");
	}
	readLZWData(e, t) {
		const r = [];
		let i, n = 0;
		for (;0 !== (i = this.readByte()); ) {
			const e = this.readBytes(i);
			r.push(e), n += e.length;
		}
		const a = new Uint8Array(n);
		let s = 0;
		for (const e of r) a.set(e, s), s += e.length;
		const o = 1 << e, h = o + 1;
		let c, d, l = e + 1, f = 0, u = 0, g = 0;
		const p = new Uint8Array(t);
		let m = 0;
		const y = () => {
			c = new Array(o);
			for (let e = 0; e < o; e += 1) c[e] = [ e ];
			c.push(null, null), d = h + 1, l = e + 1;
		}, w = () => {
			for (;u < l && g < a.length; ) f |= a[g++] << u, u += 8;
			if (u < l) return -1;
			const e = f & (1 << l) - 1;
			return f >>= l, u -= l, e;
		};
		y();
		let b = null;
		for (;m < t; ) {
			const e = w();
			if (e < 0 || e === h) break;
			if (e === o) {
				y(), b = null;
				continue;
			}
			let r;
			if (e < c.length && c[e]) r = c[e]; else {
				if (e !== d || !b) throw new Error("Invalid GIF LZW code.");
				r = [ ...b, b[0] ];
			}
			for (const e of r) {
				if (m >= t) break;
				p[m++] = e;
			}
			b && d < 4096 && (c[d++] = [ ...b, r[0] ], d === 1 << l && l < 12 && (l += 1)), 
			b = r;
		}
		return m === t ? p : p.subarray(0, m);
	}
}

class PNGDecoder {
	constructor(e) {
		this.bytes = new Uint8Array(e), this.width = 0, this.height = 0, this.bitDepth = 0, 
		this.colorType = 0, this.palette = [], this.transparency = [], this.playCount = 0, 
		this.frames = [];
	}
	async inflate(e) {
		if (!("DecompressionStream" in window)) throw new Error("APNG decoding needs browser DecompressionStream support.");
		const t = e.reduce((e, t) => e + t.length, 0), r = new Uint8Array(t);
		let i = 0;
		for (const t of e) r.set(t, i), i += t.length;
		const n = new Blob([ r ]).stream().pipeThrough(new DecompressionStream("deflate"));
		return new Uint8Array(await new Response(n).arrayBuffer());
	}
	parseChunks() {
		if (![ 137, 80, 78, 71, 13, 10, 26, 10 ].every((e, t) => this.bytes[t] === e)) throw new Error("Invalid PNG signature.");
		const e = [], t = [];
		let r = null;
		for (let i = 8; i + 12 <= this.bytes.length; ) {
			const n = readU32(this.bytes, i), a = ascii(this.bytes, i + 4, 4), s = this.bytes.subarray(i + 8, i + 8 + n);
			if (i += n + 12, "IHDR" === a) this.width = readU32(s, 0), this.height = readU32(s, 4), 
			this.bitDepth = s[8], this.colorType = s[9]; else if ("acTL" === a) this.playCount = readU32(s, 4); else if ("PLTE" === a) this.palette = s; else if ("tRNS" === a) this.transparency = s; else if ("fcTL" === a) r && t.push(r), 
			r = {
				control: {
					width: readU32(s, 4),
					height: readU32(s, 8),
					x: readU32(s, 12),
					y: readU32(s, 16),
					delayNum: s[20] << 8 | s[21],
					delayDen: s[22] << 8 | s[23] || 100,
					dispose: s[24],
					blend: s[25]
				},
				chunks: []
			}; else if ("IDAT" === a) (r ? r.chunks : e).push(s); else if ("fdAT" === a && r) r.chunks.push(s.subarray(4)); else if ("IEND" === a) break;
		}
		return r && t.push(r), e.length && t.length && !t[0].chunks.length && (t[0].chunks = e), 
		{
			frames: t,
			defaultChunks: e
		};
	}
	unfilter(e, t, r, i) {
		const n = t * i, a = new Uint8Array(n * r);
		let s = 0;
		for (let t = 0; t < r; t += 1) {
			const r = e[s++], o = t * n;
			for (let h = 0; h < n; h += 1) {
				const c = e[s++], d = h >= i ? a[o + h - i] : 0, l = t ? a[o - n + h] : 0, f = t && h >= i ? a[o - n + h - i] : 0;
				let u = c;
				if (1 === r) u = c + d; else if (2 === r) u = c + l; else if (3 === r) u = c + Math.floor((d + l) / 2); else if (4 === r) {
					const e = d + l - f, t = Math.abs(e - d), r = Math.abs(e - l), i = Math.abs(e - f);
					u = c + (t <= r && t <= i ? d : r <= i ? l : f);
				}
				a[o + h] = 255 & u;
			}
		}
		return a;
	}
	async decodePixels(e, t, r) {
		if (8 !== this.bitDepth) throw new Error("Only 8-bit PNG/APNG frames are supported.");
		const i = {
			0: 1,
			2: 3,
			3: 1,
			4: 2,
			6: 4
		}[this.colorType];
		if (!i) throw new Error(`Unsupported PNG color type: ${this.colorType}.`);
		const n = this.unfilter(await this.inflate(e), t, r, i), a = new Uint8ClampedArray(t * r * 4);
		for (let e = 0; e < r; e += 1) for (let r = 0; r < t; r += 1) {
			const s = (e * t + r) * i, o = 4 * (e * t + r);
			let h = 0, c = 0, d = 0, l = 255;
			if (6 === this.colorType) h = n[s], c = n[s + 1], d = n[s + 2], l = n[s + 3]; else if (2 === this.colorType) h = n[s], 
			c = n[s + 1], d = n[s + 2]; else if (4 === this.colorType) h = n[s], c = h, d = h, 
			l = n[s + 1]; else if (0 === this.colorType) h = c = d = n[s]; else if (3 === this.colorType) {
				const e = 3 * n[s];
				h = this.palette[e] ?? 0, c = this.palette[e + 1] ?? 0, d = this.palette[e + 2] ?? 0, 
				l = this.transparency[n[s]] ?? 255;
			}
			a[o] = h, a[o + 1] = c, a[o + 2] = d, a[o + 3] = l;
		}
		return new ImageData(a, t, r);
	}
	async* stream() {
		const e = this.parseChunks();
		if (!e.frames.length) throw new Error("PNG does not contain APNG frame controls.");
		const t = document.createElement("canvas");
		t.width = this.width, t.height = this.height;
		const r = t.getContext("2d");
		for (const i of e.frames) {
			const e = i.control, n = await this.decodePixels(i.chunks, e.width, e.height), a = 2 === e.dispose ? r.getImageData(0, 0, this.width, this.height) : null;
			0 === e.blend && r.clearRect(e.x, e.y, e.width, e.height);
			const s = imageDataToCanvas(n, e.width, e.height);
			r.drawImage(s, e.x, e.y);
			const o = cloneCanvas(t);
			s.width = 0, s.height = 0;
			const h = 0 !== e.x || 0 !== e.y || e.width !== this.width || e.height !== this.height;
			yield {
				image: o,
				delay: clampDelay(1e3 * e.delayNum / e.delayDen),
				width: this.width,
				height: this.height,
				rect: {
					x: e.x,
					y: e.y,
					width: e.width,
					height: e.height
				},
				changedOnly: h,
				composited: !0,
				compositionMode: 1 === e.blend ? "overlay" : "replace",
				disposal: e.dispose
			}, 1 === e.dispose ? r.clearRect(e.x, e.y, e.width, e.height) : 2 === e.dispose && a && r.putImageData(a, 0, 0);
		}
	}
	async decode() {
		const e = [];
		for await (const t of this.stream()) e.push(t);
		return e.repeat = this.playCount, e;
	}
}

class WebMDecoder {
	constructor(e, t) {
		this.buffer = e, this.mimeType = t || "video/webm";
	}
	async open() {
		const e = URL.createObjectURL(new Blob([ this.buffer ], {
			type: this.mimeType
		})), t = document.createElement("video");
		t.src = e, t.muted = !0, t.playsInline = !0, t.preload = "auto";
		try {
			await new Promise((e, r) => {
				t.onloadedmetadata = e, t.onerror = () => r(new Error("Unable to decode WebM video."));
			});
			const r = t.videoWidth, i = t.videoHeight, n = Number.isFinite(t.duration) ? t.duration : 0, a = 30, s = Math.max(1, Math.ceil(n * a)), o = async function*() {
				try {
					t.pause();
					for (let e = 0; e < s; e += 1) {
						const s = n ? Math.min(e / a, Math.max(0, n - .001)) : 0;
						await new Promise((e, r) => {
							const i = () => {
								t.removeEventListener("seeked", i), e();
							}, n = () => {
								t.removeEventListener("error", n), r(new Error("WebM frame seek failed."));
							};
							t.addEventListener("seeked", i, {
								once: !0
							}), t.addEventListener("error", n, {
								once: !0
							}), t.currentTime = s;
						});
						const o = document.createElement("canvas");
						o.width = r, o.height = i, o.getContext("2d").drawImage(t, 0, 0, r, i), yield {
							image: o,
							delay: 1e3 / a,
							width: r,
							height: i,
							rect: {
								x: 0,
								y: 0,
								width: r,
								height: i
							},
							changedOnly: !1,
							composited: !0,
							compositionMode: "replace"
						};
					}
				} finally {
					t.pause(), t.removeAttribute("src"), t.load(), URL.revokeObjectURL(e);
				}
			}();
			return o.frameCount = s, o.repeat = 0, o;
		} catch (r) {
			throw t.removeAttribute("src"), t.load(), URL.revokeObjectURL(e), r;
		}
	}
	async decode() {
		const e = await this.open(), t = [];
		for await (const r of e) t.push(r);
		return t.repeat = e.repeat, t;
	}
}

async function decodeJXL(e) {
	const t = URL.createObjectURL(new Blob([ e ], {
		type: "image/jxl"
	}));
	try {
		const e = new Image;
		e.src = t, await new Promise((t, r) => {
			e.onload = t, e.onerror = () => r(new Error("Unable to decode JXL image."));
		});
		const r = document.createElement("canvas");
		return r.width = e.naturalWidth, r.height = e.naturalHeight, r.getContext("2d").drawImage(e, 0, 0), 
		[ {
			image: r,
			delay: 100,
			width: r.width,
			height: r.height,
			rect: {
				x: 0,
				y: 0,
				width: r.width,
				height: r.height
			},
			changedOnly: !1,
			composited: !0,
			compositionMode: "latest"
		} ];
	} finally {
		URL.revokeObjectURL(t);
	}
}

function frameArraySource(e) {
	return {
		frameCount: e.length,
		repeat: e.repeat ?? null,
		open: async () => async function*() {
			for (const t of e) yield t;
		}()
	};
}

async function decodeAnimation(e, t) {
	const r = String(t || "").toLowerCase();
	if ("image/gif" === r) {
		const t = new Uint8Array(e), r = {
			frameCount: countGifImageDescriptors(t),
			repeat: readGifRepeat(t),
			open: async () => {
				const t = new GIFDecoder(e);
				return async function*() {
					for await (const e of t.stream()) yield e;
					r.repeat = t.repeat;
				}();
			}
		};
		return r;
	}
	if ("image/apng" === r || "image/png" === r && isAnimatedBuffer(e, r)) {
		const t = new PNGDecoder(e);
		return {
			frameCount: t.parseChunks().frames.length,
			repeat: t.playCount,
			open: async () => new PNGDecoder(e).stream()
		};
	}
	const i = await openImageDecoderStream(e, r);
	if (i) {
		const t = i.frameCount, n = i.repeat;
		return await (i.return?.()), {
			frameCount: t,
			repeat: n,
			open: async () => openImageDecoderStream(e, r)
		};
	}
	if ("video/webm" === r) return {
		frameCount: null,
		repeat: 0,
		open: async () => new WebMDecoder(e, r).open()
	};
	if ("image/jxl" === r) return frameArraySource(await decodeJXL(e));
	if ("image/webp" === r) throw new Error("Animated WebP requires browser ImageDecoder support.");
	throw new Error(`Unsupported animation format: ${t}.`);
}