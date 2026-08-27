const clamp = t => t < 0 ? 0 : t > 255 ? 255 : t, COLOR_CACHE_LIMIT = 4096;

function findNearestColor(t, n, e, i) {
	let o = 1 / 0, a = 1;
	for (let r = 1; r < i.length; r += 1) {
		const l = i[r], c = t - l.r, s = n - l.g, u = e - l.b, d = c * c + s * s + u * u;
		if (d < o && (o = d, a = r, 0 === d)) break;
	}
	return a;
}

function cachedFindNearest(t, n, e, i, o) {
	const a = (255 & t) << 16 | (255 & n) << 8 | 255 & e;
	let r = o.get(a);
	return void 0 !== r || (r = findNearestColor(t, n, e, i), o.size >= 4096 && o.clear(), 
	o.set(a, r)), r;
}

const ASCII_CHARSETS = {
	standard: [ " ", "·", "░", "▒", "▓", "█", "■", "▪", "●", "#", "@" ],
	block: [ " ", "·", "░", "▒", "▓", "█" ],
	alphanumeric: [ " ", ".", ":", "i", "l", "c", "o", "v", "x", "X", "M", "W", "#", "&", "@" ],
	minimal: [ " ", ".", ":", "-", "=", "+", "*", "#", "%", "@" ],
	dense: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$".split("")
};

function makeAsciiLumaTable(t) {
	const n = new Float32Array(t.length);
	for (let e = 1; e < t.length; e += 1) {
		const i = t[e];
		n[e] = .2126 * i.r + .7152 * i.g + .0722 * i.b;
	}
	return n;
}

function buildAsciiLine(t, n, e, i, o, a, r, l) {
	const c = ASCII_CHARSETS[a] || ASCII_CHARSETS.standard, s = c.length - 1, u = Math.max(1, Math.min(r, n)), d = n / u, h = 2 * d, f = l || makeAsciiLumaTable(o);
	let m = "";
	for (let o = 0; o < u; o += 1) {
		const a = o * d | 0, r = t * h | 0, l = Math.min(n, Math.ceil((o + 1) * d)), u = Math.min(e, Math.ceil((t + 1) * h));
		let M = 0, b = 0, g = !1;
		for (let t = r; t < u; t += 1) {
			const e = t * n;
			for (let t = a; t < l; t += 1) {
				const n = i[e + t];
				n && (M += f[n], g = !0), b += 1;
			}
		}
		m += g ? c[Math.round(M / b / 255 * s)] : " ";
	}
	return m;
}

function exportAscii(t, n, e, i, o, a) {
	const r = Math.max(1, Math.min(a, n)), l = Math.max(1, Math.round(e / (n / r * 2))), c = makeAsciiLumaTable(i);
	let s = "";
	for (let a = 0; a < l; a += 1) s += buildAsciiLine(a, n, e, t, i, o, r, c) + "\n";
	return s;
}

function applySubpixel(t, n, e, i) {
	if ("solidIndexing" === e) {
		const e = 255 / (i - 1 || 15), o = 1 / e;
		for (let i = 0; i < n; i += 4) t[i + 3] < 128 || (t[i] = Math.min(255, Math.round(Math.round(t[i] * o) * e)), 
		t[i + 1] = Math.min(255, Math.round(Math.round(t[i + 1] * o) * e)), t[i + 2] = Math.min(255, Math.round(Math.round(t[i + 2] * o) * e)));
	} else if ("hinted" === e) for (let e = 0; e < n; e += 4) t[e + 3] < 128 || (t[e] = Math.min(255, 64 * Math.round(.015625 * t[e])), 
	t[e + 1] = Math.min(255, 64 * Math.round(.015625 * t[e + 1])), t[e + 2] = Math.min(255, 64 * Math.round(.015625 * t[e + 2]))); else if ("antialias" === e || "smallAntiAliasing" === e) {
		const i = "smallAntiAliasing" === e;
		for (let e = 0; e < n - 4; e += 4) t[e + 3] < 128 || t[e + 7] < 128 || (i ? (t[e] = .75 * t[e] + .25 * t[e + 4] | 0, 
		t[e + 1] = .75 * t[e + 1] + .25 * t[e + 5] | 0, t[e + 2] = .75 * t[e + 2] + .25 * t[e + 6] | 0) : (t[e] = t[e] + t[e + 4] >> 1, 
		t[e + 1] = t[e + 1] + t[e + 5] >> 1, t[e + 2] = t[e + 2] + t[e + 6] >> 1));
	} else if ("nearestNeighbor" === e) for (let e = 0; e < n; e += 4) t[e + 3] < 128 || (t[e] = t[e] < 64 ? 0 : t[e] > 192 ? 255 : t[e], 
	t[e + 1] = t[e + 1] < 64 ? 0 : t[e + 1] > 192 ? 255 : t[e + 1], t[e + 2] = t[e + 2] < 64 ? 0 : t[e + 2] > 192 ? 255 : t[e + 2]);
}

function buildRowString(t, n, e, i, o, a, r) {
	const l = t * n;
	let c = "";
	for (let t = 0; t < n; t += 1) {
		const n = l + t, s = e[n];
		c += a[s];
		const u = n << 2;
		if (!s) {
			i[u] = i[u + 1] = i[u + 2] = i[u + 3] = 0;
			continue;
		}
		const d = o[s];
		i[u] = d.r, i[u + 1] = d.g, i[u + 2] = d.b, i[u + 3] = r && void 0 !== d.a ? d.a : 255;
	}
	return c;
}

async function modeDither(t, n, e, i, o, a, r, l, c, s, u, d, h, f) {
	const m = new Uint8Array(n * e), M = new Map, b = null !== c, g = s - 1, A = 1 / u;
	let p = h ? "" : "img`\n";
	for (let u = 0; u < e; u += 1) {
		const S = u * n, w = (u & g) * s;
		let x = 0, E = 0, y = 0;
		for (let e = 0; e < n; e += 1) {
			const n = S + e, o = n << 2;
			if (t[o + 3] < 128) {
				b && (x = E = y = 0);
				continue;
			}
			let a = t[o], r = t[o + 1], l = t[o + 2];
			if (b) {
				const t = (c[w + (e & g)] * A - .5) * d;
				a = clamp(a + x + t), r = clamp(r + E + t), l = clamp(l + y + t);
			}
			const s = cachedFindNearest(a, r, l, i, M);
			if (m[n] = s, b) {
				const t = i[s];
				x = .6 * (a - t.r), E = .6 * (r - t.g), y = .6 * (l - t.b);
			}
		}
		const C = buildRowString(u, n, m, o, i, r, f);
		h ? await h(u, C, m) : p += C + "\n", u % l !== 0 && u !== e - 1 || await a((100 * (u + 1) / e).toFixed(4));
	}
	return {
		hexString: h ? "" : p + "`",
		indexMap: m
	};
}

async function modeFloydSteinberg(t, n, e, i, o, a, r, l, c, s) {
	const u = new Uint8Array(n * e), d = new Float32Array(t), h = new Map;
	let f = c ? "" : "img`\n";
	for (let t = 0; t < e; t += 1) {
		const m = t * n;
		for (let o = 0; o < n; o += 1) {
			const a = m + o, r = a << 2;
			if (d[r + 3] < 128) continue;
			const l = clamp(d[r]), c = clamp(d[r + 1]), s = clamp(d[r + 2]), f = cachedFindNearest(l, c, s, i, h);
			u[a] = f;
			const M = i[f], b = l - M.r, g = c - M.g, A = s - M.b;
			if (o + 1 < n && (d[r + 4] += .4375 * b, d[r + 5] += .4375 * g, d[r + 6] += .4375 * A), 
			t + 1 < e) {
				if (o) {
					const e = (t + 1) * n + o - 1 << 2;
					d[e] += .1875 * b, d[e + 1] += .1875 * g, d[e + 2] += .1875 * A;
				}
				const e = (t + 1) * n + o << 2;
				if (d[e] += .3125 * b, d[e + 1] += .3125 * g, d[e + 2] += .3125 * A, o + 1 < n) {
					const t = e + 4;
					d[t] += .0625 * b, d[t + 1] += .0625 * g, d[t + 2] += .0625 * A;
				}
			}
		}
		const M = buildRowString(t, n, u, o, i, r, s);
		c ? await c(t, M, u) : f += M + "\n", t % l !== 0 && t !== e - 1 || await a((100 * (t + 1) / e).toFixed(4));
	}
	return {
		hexString: c ? "" : f + "`",
		indexMap: u
	};
}

const DITHER_MODES = {
	bayer4: [ BAYER4, 4, 16, 72 ],
	bayer8: [ BAYER8, 8, 64, 72 ],
	bayer16: [ BAYER16, 16, 256, 72 ],
	blue8: [ BLUE8, 8, 255, 80 ],
	blue16: [ BLUE16, 16, 255, 80 ],
	blue32: [ BLUE32, 32, 255, 80 ]
};

async function runConversionPipeline({data: t, w: n, h: e, mode: i, subPixelOption: o, rgbPalette: a, outImgData: r, onProgress: l, onRow: c, hasAlpha: s}) {
	applySubpixel(t, t.length, o, a.length);
	const u = r.data, d = CHAR_TABLE, h = 1 + Math.sqrt(e + n) * (e / n) | 0, f = DITHER_MODES[i];
	return f ? modeDither(t, n, e, a, u, l, d, h, f[0], f[1], f[2], f[3], c, s) : "error" === i ? modeFloydSteinberg(t, n, e, a, u, l, d, h, c, s) : modeDither(t, n, e, a, u, l, d, h, null, 1, 1, 0, c, s);
}