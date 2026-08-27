const VERTEX_SHADER = "\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\nvarying vec2 v_texCoord;\nvoid main() {\n\tgl_Position = vec4(a_position, 0.0, 1.0);\n\tv_texCoord = a_texCoord;\n}", FRAG_BASE = "\nprecision highp float;\nvarying vec2 v_texCoord;\nuniform sampler2D u_image;\nuniform vec2 u_resolution;\n\nvec3 samplePixel() {\n\treturn texture2D(u_image, v_texCoord).rgb;\n}\n\nfloat getAlpha() {\n\treturn texture2D(u_image, v_texCoord).a;\n}\n", FRAG_SOLID = FRAG_BASE + "\nvoid main() {\n\tfloat alpha = getAlpha();\n\tif (alpha < 0.5) {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n\t\treturn;\n\t}\n\tgl_FragColor = vec4(samplePixel(), 1.0);\n}", FRAG_BAYER = FRAG_BASE + "\nuniform sampler2D u_bayerTex;\nuniform float u_bayerSize;\nuniform float u_spread;\n\nvoid main() {\n\tfloat alpha = getAlpha();\n\tif (alpha < 0.5) {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n\t\treturn;\n\t}\n\tvec2 px = v_texCoord * u_resolution;\n\tvec2 bayerUV = mod(px, u_bayerSize) / u_bayerSize;\n\tfloat factor = texture2D(u_bayerTex, bayerUV).r - 0.5;\n\tvec3 col = samplePixel() + factor * u_spread / 255.0;\n\tcol = clamp(col, 0.0, 1.0);\n\tgl_FragColor = vec4(col, 1.0);\n}", FRAG_BLUE = FRAG_BASE + "\nuniform sampler2D u_noise;\nuniform float u_spread;\nuniform vec2 u_noiseSize;\n\nvoid main() {\n\tfloat alpha = getAlpha();\n\tif (alpha < 0.5) {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n\t\treturn;\n\t}\n\tvec2 noiseUV = fract(v_texCoord * u_resolution / u_noiseSize);\n\tfloat factor = texture2D(u_noise, noiseUV).r - 0.5;\n\tvec3 col = samplePixel() + factor * u_spread / 255.0;\n\tcol = clamp(col, 0.0, 1.0);\n\tgl_FragColor = vec4(col, 1.0);\n}";

function compileShader(e, t, r) {
	const a = e.createShader(t);
	if (e.shaderSource(a, r), e.compileShader(a), !e.getShaderParameter(a, e.COMPILE_STATUS)) {
		const t = e.getShaderInfoLog(a);
		throw e.deleteShader(a), new Error("Shader compile error: " + t);
	}
	return a;
}

function createProgram(e, t, r) {
	const a = compileShader(e, e.VERTEX_SHADER, t), n = compileShader(e, e.FRAGMENT_SHADER, r), o = e.createProgram();
	if (e.attachShader(o, a), e.attachShader(o, n), e.linkProgram(o), !e.getProgramParameter(o, e.LINK_STATUS)) throw new Error("Program link error: " + e.getProgramInfoLog(o));
	return o;
}

class GLEngine {
	static checkWebGL(e) {
		try {
			const t = e || document.createElement("canvas"), r = {
				premultipliedAlpha: !1,
				alpha: !0,
				antialias: !1
			};
			return t.getContext("webgl2", r) || t.getContext("webgl", r) || t.getContext("experimental-webgl", r) || null;
		} catch (e) {
			return null;
		}
	}
	constructor(e) {
		this._sourceCanvas = e, this.canvas = document.createElement("canvas");
		const t = GLEngine.checkWebGL(this.canvas);
		if (!t) throw new Error("WebGL not supported");
		this.gl = t, this._initQuad(), this.programs = {}, this.textures = {};
	}
	_initQuad() {
		const e = this.gl, t = e.createBuffer();
		e.bindBuffer(e.ARRAY_BUFFER, t), e.bufferData(e.ARRAY_BUFFER, QUAD_VERTICES, e.STATIC_DRAW), 
		this.vbo = t;
	}
	_useProgram(e) {
		const t = this.gl;
		t.useProgram(e), t.bindBuffer(t.ARRAY_BUFFER, this.vbo);
		const r = t.getAttribLocation(e, "a_position"), a = t.getAttribLocation(e, "a_texCoord");
		t.enableVertexAttribArray(r), t.enableVertexAttribArray(a), t.vertexAttribPointer(r, 2, t.FLOAT, !1, 16, 0), 
		t.vertexAttribPointer(a, 2, t.FLOAT, !1, 16, 8);
	}
	_getProgram(e) {
		if (this.programs[e]) return this.programs[e];
		const t = this.gl;
		let r;
		switch (e) {
		case "solid":
		default:
			r = createProgram(t, VERTEX_SHADER, FRAG_SOLID);
			break;

		case "bayer4":
		case "bayer8":
		case "bayer16":
			r = createProgram(t, VERTEX_SHADER, FRAG_BAYER);
			break;

		case "blue8":
		case "blue16":
		case "blue32":
			r = createProgram(t, VERTEX_SHADER, FRAG_BLUE);
		}
		return this.programs[e] = r, r;
	}
	_uploadImageTexture(e, t, r) {
		const a = this.gl;
		let n = this.textures.image;
		return n || (n = a.createTexture(), this.textures.image = n), a.activeTexture(a.TEXTURE0), 
		a.bindTexture(a.TEXTURE_2D, n), a.texImage2D(a.TEXTURE_2D, 0, a.RGBA, t, r, 0, a.RGBA, a.UNSIGNED_BYTE, e), 
		a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.NEAREST), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.NEAREST), 
		a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE), 
		n;
	}
	_uploadLuminanceTexture(e, t, r, a) {
		const n = this.gl;
		let o = this.textures[e];
		return o || (o = n.createTexture(), this.textures[e] = o), n.activeTexture(a), n.bindTexture(n.TEXTURE_2D, o), 
		n.texImage2D(n.TEXTURE_2D, 0, n.LUMINANCE, r, r, 0, n.LUMINANCE, n.UNSIGNED_BYTE, t), 
		n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.NEAREST), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.NEAREST), 
		n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.REPEAT), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.REPEAT), 
		o;
	}
	_getBayerArray(e) {
		switch (e) {
		case "bayer4":
		default:
			return {
				data: BAYER4_U8,
				size: 4
			};

		case "bayer8":
			return {
				data: BAYER8_U8,
				size: 8
			};

		case "bayer16":
			return {
				data: BAYER16_U8,
				size: 16
			};
		}
	}
	_getBlueNoiseArray(e) {
		switch (e) {
		case "blue8":
		default:
			return {
				data: BLUE8_U8,
				size: 8
			};

		case "blue16":
			return {
				data: BLUE16_U8,
				size: 16
			};

		case "blue32":
			return {
				data: BLUE32_U8,
				size: 32
			};
		}
	}
	async render({data: e, w: t, h: r, mode: a, rgbPalette: n, outImgData: o, onRow: i, hasAlpha: s}) {
		const c = this.gl;
		this.canvas.width === t && this.canvas.height === r || (this.canvas.width = t, this.canvas.height = r);
		const u = this._getProgram(a);
		if (this._useProgram(u), this._uploadImageTexture(e, t, r), c.uniform1i(c.getUniformLocation(u, "u_image"), 0), 
		c.uniform2f(c.getUniformLocation(u, "u_resolution"), t, r), a.startsWith("bayer")) {
			const e = this._getBayerArray(a);
			this._uploadLuminanceTexture("bayer", e.data, e.size, c.TEXTURE1), c.uniform1i(c.getUniformLocation(u, "u_bayerTex"), 1), 
			c.uniform1f(c.getUniformLocation(u, "u_bayerSize"), e.size), c.uniform1f(c.getUniformLocation(u, "u_spread"), 72);
		} else if (a.startsWith("blue")) {
			const e = this._getBlueNoiseArray(a);
			this._uploadLuminanceTexture("noise", e.data, e.size, c.TEXTURE1), c.uniform1i(c.getUniformLocation(u, "u_noise"), 1), 
			c.uniform1f(c.getUniformLocation(u, "u_spread"), 80), c.uniform2f(c.getUniformLocation(u, "u_noiseSize"), e.size, e.size);
		}
		c.viewport(0, 0, t, r), c.clearColor(0, 0, 0, 0), c.clear(c.COLOR_BUFFER_BIT), c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
		const l = o.data;
		c.readPixels(0, 0, t, r, c.RGBA, c.UNSIGNED_BYTE, l);
		const _ = new Uint8Array(t * r), E = n.length, g = CHAR_TABLE, m = a.startsWith("bayer") || a.startsWith("blue"), T = e => e < 0 ? 0 : e > 255 ? 255 : e;
		let h = i ? "" : "img`\n";
		for (let e = 0; e < r; e++) {
			let r = "";
			const a = e * t;
			let o = 0, c = 0, u = 0;
			for (let e = 0; e < t; e++) {
				const t = a + e, i = t << 2;
				if (l[i + 3] < 128) _[t] = 0, r += g[0], l[i] = 0, l[i + 1] = 0, l[i + 2] = 0, l[i + 3] = 0, 
				o = c = u = 0; else {
					const e = m ? T(l[i] + o) : l[i], a = m ? T(l[i + 1] + c) : l[i + 1], h = m ? T(l[i + 2] + u) : l[i + 2];
					let R = 1 / 0, A = 1;
					for (let t = 1; t < E; t++) {
						const r = n[t], o = e - r.r, i = a - r.g, s = h - r.b, c = o * o + i * i + s * s;
						c < R && (R = c, A = t);
					}
					_[t] = A, r += g[A];
					const d = n[A];
					m && (o = .6 * (e - d.r), c = .6 * (a - d.g), u = .6 * (h - d.b)), l[i] = d.r, l[i + 1] = d.g, 
					l[i + 2] = d.b, l[i + 3] = s && void 0 !== d.a ? d.a : 255;
				}
			}
			i ? await i(e, r, _) : h += r + "\n";
		}
		return {
			hexString: i ? "" : h + "`",
			indexMap: _
		};
	}
}

let sharedGLEngine = null;

async function runGLPipeline({canvas: e, data: t, w: r, h: a, mode: n, rgbPalette: o, outImgData: i, onProgress: s, onRow: c, hasAlpha: u}) {
	const l = sharedGLEngine || (sharedGLEngine = new GLEngine(e));
	s("25.0000"), await new Promise(e => requestAnimationFrame(e)), s("50.0000"), await new Promise(e => requestAnimationFrame(e));
	const _ = await l.render({
		data: t,
		w: r,
		h: a,
		mode: n,
		rgbPalette: o,
		outImgData: i,
		onRow: c,
		hasAlpha: u
	});
	return s("100.0000"), _;
}