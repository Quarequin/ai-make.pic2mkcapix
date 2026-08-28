
function writeGifWord(e, t) {
	e.push(255 & t, t >> 8 & 255);
}

function encodeGifLzw(e, t) {
	const a = 1 << t, n = a + 1, i = t + 1;
	let o = 0, r = 0;
	const s = [], l = e => {
		for (o |= e << r, r += i; r >= 8; ) s.push(255 & o), o >>= 8, r -= 8;
	};
	l(a);
	for (const t of e) l(t), l(a);
	return l(n), r && s.push(255 & o), s;
}

function encodeAnimatedGif(e) {
	const t = rgbPalette.slice(0, 256).map(e => ({
		r: e.r,
		g: e.g,
		b: e.b,
		a: e.a
	}));
	t.length && 0 === t[0].a || t.unshift({
		r: 0,
		g: 0,
		b: 0,
		a: 0
	});
	const a = Math.max(2, 2 ** Math.ceil(Math.log2(t.length)));
	for (;t.length < a; ) t.push({
		r: 0,
		g: 0,
		b: 0,
		a: 0
	});
	const n = Math.max(2, Math.ceil(Math.log2(a))), i = [ ..."GIF89a" ].map(e => e.charCodeAt(0));
	writeGifWord(i, e.width), writeGifWord(i, e.height), i.push(240 | n - 1, 0, 0);
	for (const e of t) i.push(e.r, e.g, e.b);
	if (null !== e.repeat && void 0 !== e.repeat) {
		i.push(33, 255, 11);
		for (const e of "NETSCAPE2.0") i.push(e.charCodeAt(0));
		i.push(3, 1, 255 & e.repeat, e.repeat >> 8 & 255, 0);
	}
	for (const t of e.frames) {
		const a = t.rect || {
			x: 0,
			y: 0,
			width: e.width,
			height: e.height
		}, o = t.indexMap || new Uint8Array(a.width * a.height), r = Math.min(65535, Math.max(1, Math.round((t.delay || 100) / 10))), s = Math.max(0, Math.min(7, 0 | t.disposal));
		i.push(33, 249, 4, s << 2 | 1), writeGifWord(i, r), i.push(0, 0), i.push(44), writeGifWord(i, a.x), 
		writeGifWord(i, a.y), writeGifWord(i, a.width), writeGifWord(i, a.height), i.push(0);
		const l = encodeGifLzw(o, n);
		i.push(n);
		for (let e = 0; e < l.length; e += 255) {
			const t = l.slice(e, e + 255);
			i.push(t.length, ...t);
		}
		i.push(0);
	}
	return i.push(59), new Blob([ new Uint8Array(i) ], {
		type: "image/gif"
	});
}

function createGifStreamWriter(e) {
	const t = paletteForOutput(), a = Math.max(2, 2 ** Math.ceil(Math.log2(t.length)));
	for (;t.length < a; ) t.push({
		r: 0,
		g: 0,
		b: 0,
		a: 0
	});
	const n = Math.max(2, Math.ceil(Math.log2(a))), i = [ ..."GIF89a" ].map(e => e.charCodeAt(0));
	writeGifWord(i, e.width), writeGifWord(i, e.height), i.push(240 | n - 1, 0, 0);
	for (const e of t) i.push(e.r, e.g, e.b);
	const o = [ new Uint8Array(i) ];
	if (null !== e.repeat && void 0 !== e.repeat) {
		const t = [ 33, 255, 11, ..."NETSCAPE2.0".split("").map(e => e.charCodeAt(0)), 3, 1, 255 & e.repeat, e.repeat >> 8 & 255, 0 ];
		o.push(new Uint8Array(t));
	}
	return {
		add(t) {
			const a = t.rect || {
				x: 0,
				y: 0,
				width: e.width,
				height: e.height
			}, i = t.indexMap || new Uint8Array(a.width * a.height), r = Math.min(65535, Math.max(1, Math.round((t.delay || 100) / 10))), s = [ 33, 249, 4, Math.max(0, Math.min(7, 0 | t.disposal)) << 2 | 1 ];
			writeGifWord(s, r), s.push(0, 0, 44), writeGifWord(s, a.x), writeGifWord(s, a.y), 
			writeGifWord(s, a.width), writeGifWord(s, a.height), s.push(0);
			const l = encodeGifLzw(i, n);
			s.push(n);
			for (let e = 0; e < l.length; e += 255) {
				const t = l.slice(e, e + 255);
				s.push(t.length, ...t);
			}
			s.push(0), o.push(new Uint8Array(s));
		},
		finish: () => (o.push(new Uint8Array([ 59 ])), new Blob(o, {
			type: "image/gif"
		}))
	};
}

function crc32(e) {
	let t = 4294967295;
	for (const a of e) {
		t ^= a;
		for (let e = 0; e < 8; e += 1) t = t >>> 1 ^ 3988292384 & -(1 & t);
	}
	return (4294967295 ^ t) >>> 0;
}

function pngChunk(e, t) {
	const a = new Uint8Array([ ...e ].map(e => e.charCodeAt(0))), n = new Uint8Array(a.length + t.length);
	n.set(a), n.set(t, a.length);
	const i = new Uint8Array(12 + t.length), o = new DataView(i.buffer);
	return o.setUint32(0, t.length), i.set(n, 4), o.setUint32(8 + t.length, crc32(n)), 
	i;
}

function adler32(e) {
	let t = 1, a = 0;
	for (const n of e) t = (t + n) % 65521, a = (a + t) % 65521;
	return (a << 16 | t) >>> 0;
}

function zlibStore(e) {
	const t = [ new Uint8Array([ 120, 1 ]) ];
	for (let a = 0; a < e.length || 0 === a; a += 65535) {
		const n = Math.min(e.length, a + 65535), i = n - a, o = new Uint8Array(5 + i);
		o[0] = n >= e.length ? 1 : 0, o[1] = 255 & i, o[2] = i >> 8 & 255;
		const r = 65535 & ~i;
		if (o[3] = 255 & r, o[4] = r >> 8, o.set(e.subarray(a, n), 5), t.push(o), n >= e.length) break;
	}
	const a = new Uint8Array(4);
	new DataView(a.buffer).setUint32(0, adler32(e)), t.push(a);
	const n = new Uint8Array(t.reduce((e, t) => e + t.length, 0));
	let i = 0;
	for (const e of t) n.set(e, i), i += e.length;
	return n;
}

function pngIndexedFrame(e, t, a) {
	const n = new Uint8Array((t + 1) * a);
	for (let i = 0; i < a; i += 1) n[i * (t + 1)] = 0, n.set(e.subarray(i * t, (i + 1) * t), i * (t + 1) + 1);
	return zlibStore(n);
}

function createApngStreamWriter(e) {
	const t = paletteForOutput(), a = [ new Uint8Array([ 137, 80, 78, 71, 13, 10, 26, 10 ]) ], n = new Uint8Array(13), i = new DataView(n.buffer);
	i.setUint32(0, e.width), i.setUint32(4, e.height), n[8] = 8, n[9] = 3, a.push(pngChunk("IHDR", n));
	const o = new Uint8Array(3 * t.length), r = new Uint8Array(t.length);
	t.forEach((e, t) => {
		o[3 * t] = e.r, o[3 * t + 1] = e.g, o[3 * t + 2] = e.b, r[t] = e.a;
	}), a.push(pngChunk("PLTE", o), pngChunk("tRNS", r));
	const s = new Uint8Array(8), l = new DataView(s.buffer);
	l.setUint32(0, e.frameCount || 1), l.setUint32(4, e.repeat ?? 0), a.push(pngChunk("acTL", s));
	let c = 0, u = 0;
	return {
		add(t) {
			const n = t.rect || {
				x: 0,
				y: 0,
				width: e.width,
				height: e.height
			}, i = new Uint8Array(26), o = new DataView(i.buffer);
			o.setUint32(0, c++), o.setUint32(4, n.width), o.setUint32(8, n.height), o.setUint32(12, n.x), 
			o.setUint32(16, n.y);
			const r = Math.max(1, Math.round(t.delay || 100));
			o.setUint16(20, Math.min(65535, r)), o.setUint16(22, 1e3), i[24] = 3 === t.disposal ? 2 : 2 === t.disposal ? 1 : 0, 
			i[25] = t.changedOnly ? 1 : 0, a.push(pngChunk("fcTL", i));
			const s = pngIndexedFrame(t.indexMap || new Uint8Array(n.width * n.height), n.width, n.height);
			if (0 === u) a.push(pngChunk("IDAT", s)); else {
				const e = new Uint8Array(s.length + 4);
				new DataView(e.buffer).setUint32(0, c++), e.set(s, 4), a.push(pngChunk("fdAT", e));
			}
			u += 1;
		},
		finish: () => (a.push(pngChunk("IEND", new Uint8Array(0))), new Blob(a, {
			type: "image/apng"
		}))
	};
}

function createWebmStreamWriter(e) {
	if (!canvas.captureStream || "undefined" == typeof MediaRecorder) throw new Error("This browser cannot encode processed WebM output safely.");
	const t = canvas.captureStream(0), a = t.getVideoTracks()[0], n = "function" != typeof MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
	if (!n) throw t.getTracks().forEach(e => e.stop()), new Error("This browser does not provide a WebM MediaRecorder.");
	const i = [], o = new MediaRecorder(t, {
		mimeType: n,
		videoBitsPerSecond: 4e6
	}), r = new Promise((e, t) => {
		o.addEventListener("dataavailable", e => {
			e.data?.size && i.push(e.data);
		}), o.addEventListener("stop", e, {
			once: !0
		}), o.addEventListener("error", () => t(new Error("WebM recording failed.")), {
			once: !0
		});
	});
	return o.start(), {
		async add(e) {
			a.requestFrame ? a.requestFrame() : await new Promise(t => setTimeout(t, Math.max(10, e.delay || 100)));
		},
		finish: async () => ("inactive" !== o.state && o.stop(), await r, t.getTracks().forEach(e => e.stop()), 
		new Blob(i, {
			type: n
		}))
	};
}

function encodeBmpFromCanvas(e) {
	const t = e.width, a = e.height, n = e.getContext("2d", {
		willReadFrequently: !0
	}).getImageData(0, 0, t, a).data, i = 4 * Math.ceil(3 * t / 4), o = i * a, r = new Uint8Array(54 + o), s = new DataView(r.buffer);
	r[0] = 66, r[1] = 77, s.setUint32(2, r.length, !0), s.setUint32(10, 54, !0), s.setUint32(14, 40, !0), 
	s.setInt32(18, t, !0), s.setInt32(22, -a, !0), s.setUint16(26, 1, !0), s.setUint16(28, 24, !0), 
	s.setUint32(34, o, !0);
	for (let e = 0; e < a; e += 1) for (let a = 0; a < t; a += 1) {
		const o = 4 * (e * t + a), s = 54 + e * i + 3 * a;
		r[s] = n[o + 2], r[s + 1] = n[o + 1], r[s + 2] = n[o];
	}
	return new Blob([ r ], {
		type: "image/bmp"
	});
}
