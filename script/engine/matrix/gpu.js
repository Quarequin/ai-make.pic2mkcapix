// matrixgl.js — GPU PixelArt Conversion Engine (WebGL 2.0)
// Modular shader pipeline: each dithering mode is a standalone shader module.
// Pre-computed Bayer & Blue Noise data embedded for zero runtime overhead.

const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
	v_texCoord = a_texCoord;
}`;

// Base fragment shader: image sampling only. Palette quantization is
// intentionally NOT done here — see the render()/JS-side comment for why.
const FRAG_BASE = `
precision highp float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_resolution;

vec3 samplePixel() {
	return texture2D(u_image, v_texCoord).rgb;
}

float getAlpha() {
	return texture2D(u_image, v_texCoord).a;
}
`;

// ---- SOLID MODE (no dithering — straight resample) ----
const FRAG_SOLID = FRAG_BASE + `
void main() {
	float alpha = getAlpha();
	if (alpha < 0.5) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
	}
	gl_FragColor = vec4(samplePixel(), 1.0);
}`;

// ---- BAYER MODE — outputs the resampled color plus the ordered-dither
// offset, NOT yet snapped to the palette. Snapping (with the row-wise
// error-carry that keeps this from looking like a raw tiled matrix — see
// the note in render()) happens afterward in JS. ----
const FRAG_BAYER = FRAG_BASE + `
uniform sampler2D u_bayerTex;
uniform float u_bayerSize;
uniform float u_spread;

void main() {
	float alpha = getAlpha();
	if (alpha < 0.5) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
	}
	vec2 px = v_texCoord * u_resolution;
	vec2 bayerUV = mod(px, u_bayerSize) / u_bayerSize;
	float factor = texture2D(u_bayerTex, bayerUV).r - 0.5;
	vec3 col = samplePixel() + factor * u_spread / 255.0;
	col = clamp(col, 0.0, 1.0);
	gl_FragColor = vec4(col, 1.0);
}`;

// ---- BLUE NOISE MODE — same idea as Bayer above ----
const FRAG_BLUE = FRAG_BASE + `
uniform sampler2D u_noise;
uniform float u_spread;
uniform vec2 u_noiseSize;

void main() {
	float alpha = getAlpha();
	if (alpha < 0.5) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
	}
	vec2 noiseUV = fract(v_texCoord * u_resolution / u_noiseSize);
	float factor = texture2D(u_noise, noiseUV).r - 0.5;
	vec3 col = samplePixel() + factor * u_spread / 255.0;
	col = clamp(col, 0.0, 1.0);
	gl_FragColor = vec4(col, 1.0);
}`;

// ---- Helper: compile shader ----
function compileShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const err = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error("Shader compile error: " + err);
	}
	return shader;
}

function createProgram(gl, vsSource, fsSource) {
	const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
	const program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		throw new Error("Program link error: " + gl.getProgramInfoLog(program));
	}
	return program;
}

// ============================================================
// GL ENGINE CLASS (modular)
// ============================================================
/*export*/ class GLEngine {

	static checkWebGL(canvas) {
		try {
			const c = canvas || document.createElement("canvas");
			const opts = { premultipliedAlpha: false, alpha: true, antialias: false };
			// Prefer a WebGL2 context where available (more consistent
			// feature set / no functional downside here), falling back to
			// WebGL1 for older browsers.
			const gl = c.getContext('webgl2', opts)
				|| c.getContext('webgl', opts)
				|| c.getContext('experimental-webgl', opts);
			return gl || null;
		} catch (e) {
			return null;
		}
	}

	constructor(canvas) {
		// IMPORTANT: do NOT request a WebGL context on the canvas passed in
		// from app.js — that element is already bound to a "2d" context
		// there (canvas.getContext("2d", ...)) for the preview/output
		// display. A <canvas> element can only ever be bound to ONE
		// context type (2d XOR webgl) for its entire lifetime; once it's
		// "2d", every later getContext('webgl'/'webgl2'/...) call on that
		// same element returns null forever — which is what was throwing
		// "WebGL not supported" even on GPUs/browsers that support it.
		// GLEngine owns its own private offscreen canvas instead.
		this._sourceCanvas = canvas; // kept only for reference, unused for GL
		this.canvas = document.createElement("canvas");
		const gl = GLEngine.checkWebGL(this.canvas);
		if (!gl) throw new Error("WebGL not supported");
		this.gl = gl;
		this._initQuad();
		this.programs = {};
		this.textures = {};
	}

	_initQuad() {
		const gl = this.gl;
		const vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
		this.vbo = vbo;
	}

	_useProgram(program) {
		const gl = this.gl;
		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
		const posLoc = gl.getAttribLocation(program, "a_position");
		const texLoc = gl.getAttribLocation(program, "a_texCoord");
		gl.enableVertexAttribArray(posLoc);
		gl.enableVertexAttribArray(texLoc);
		gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
		gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
	}

	_getProgram(mode) {
		if (this.programs[mode]) return this.programs[mode];
		const gl = this.gl;
		let prog;
		switch (mode) {
			case "solid":
				prog = createProgram(gl, VERTEX_SHADER, FRAG_SOLID);
				break;
			case "bayer4":
			case "bayer8":
			case "bayer16":
				prog = createProgram(gl, VERTEX_SHADER, FRAG_BAYER);
				break;
			case "blue8":
			case "blue16":
			case "blue32":
				prog = createProgram(gl, VERTEX_SHADER, FRAG_BLUE);
				break;
			default:
				prog = createProgram(gl, VERTEX_SHADER, FRAG_SOLID);
		}
		this.programs[mode] = prog;
		return prog;
	}

	_uploadImageTexture(imageData, w, h) {
		const gl = this.gl;
		let tex = this.textures["image"];
		if (!tex) {
			tex = gl.createTexture();
			this.textures["image"] = tex;
		}
		// Always bind on TEXTURE0 ourselves — never rely on whatever unit
		// happened to be active when this is called (see the comment on
		// _uploadLuminanceTexture below for why that's not safe here).
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}

	// Uploads a single-channel (LUMINANCE) lookup texture, cached per key,
	// onto the given texture unit (gl.TEXTURE0, gl.TEXTURE1, ...). Used for
	// both the Blue Noise texture and the Bayer matrix texture — sampling a
	// texture with a runtime-computed UV has no GLSL ES 1.00 "constant/loop
	// index only" restriction, unlike a uniform array.
	//
	// IMPORTANT: this must set gl.activeTexture(unit) itself, rather than
	// trusting the caller to have already set the active unit — WebGL's
	// active-texture-unit is global GL state that persists across calls.
	// This used to only gl.bindTexture() without activating a unit first,
	// which silently bound onto whatever unit a *previous, unrelated* call
	// had left active (in practice: TEXTURE0, right after the real image
	// texture had just been bound there for u_image) — overwriting the
	// image texture's binding on unit 0 with the Bayer/noise texture
	// before the subsequent `gl.activeTexture(gl.TEXTURE1)` call even ran.
	// The shader's u_image sampler (still pointed at unit 0) ended up
	// reading the tiny 4x4/8x8 dither texture instead of the actual photo
	// — producing output with the dither pattern but none of the source
	// image's content, which is exactly the "checkerboard unrelated to the
	// source image" bug.
	_uploadLuminanceTexture(key, texData, size, unit) {
		const gl = this.gl;
		let tex = this.textures[key];
		if (!tex) {
			tex = gl.createTexture();
			this.textures[key] = tex;
		}
		gl.activeTexture(unit);
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, size, size, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, texData);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		return tex;
	}

	_getBayerArray(mode) {
		switch (mode) {
			case "bayer4": return { data: BAYER4_U8, size: 4 };
			case "bayer8": return { data: BAYER8_U8, size: 8 };
			case "bayer16": return { data: BAYER16_U8, size: 16 };
			default: return { data: BAYER4_U8, size: 4 };
		}
	}

	_getBlueNoiseArray(mode) {
		switch (mode) {
			case "blue8": return { data: BLUE8_U8, size: 8 };
			case "blue16": return { data: BLUE16_U8, size: 16 };
			case "blue32": return { data: BLUE32_U8, size: 32 };
			default: return { data: BLUE8_U8, size: 8 };
		}
	}

	// ============================================================
	// MAIN RENDER METHOD
	// ============================================================
	async render({ data, w, h, mode, rgbPalette, outImgData, onRow }) {
		const gl = this.gl;

		// The GL framebuffer's backing store size follows canvas.width/
		// height, which drives both the viewport and what readPixels can
		// read back. Resize the internal canvas to match this render's
		// output dimensions (resizing a canvas implicitly clears/reallocates
		// its backing store, which is what we want here).
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
		}

		const program = this._getProgram(mode);
		this._useProgram(program);

		// Upload image (binds itself onto TEXTURE0)
		this._uploadImageTexture(data, w, h);
		gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);

		gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), w, h);

		// Mode-specific uniforms.
		//
		// spread=72/80 matches matrix-engine.js (CPU) exactly. The GPU
		// shaders only add the ordered-dither offset and hand back a raw
		// (unquantized) color — palette snapping, including the row-wise
		// error-carry that keeps the result from looking like the raw
		// Bayer/Blue-Noise matrix tiled across the image, happens below in
		// JS after readback (see the loop after gl.readPixels), using the
		// same algorithm as modeBayer()/modeBlueNoise() in matrix-engine.js.
		if (mode.startsWith("bayer")) {
			const bayer = this._getBayerArray(mode);
			this._uploadLuminanceTexture("bayer", bayer.data, bayer.size, gl.TEXTURE1);
			gl.uniform1i(gl.getUniformLocation(program, "u_bayerTex"), 1);
			gl.uniform1f(gl.getUniformLocation(program, "u_bayerSize"), bayer.size);
			gl.uniform1f(gl.getUniformLocation(program, "u_spread"), 72.0);
		} else if (mode.startsWith("blue")) {
			const noise = this._getBlueNoiseArray(mode);
			this._uploadLuminanceTexture("noise", noise.data, noise.size, gl.TEXTURE1);
			gl.uniform1i(gl.getUniformLocation(program, "u_noise"), 1);
			gl.uniform1f(gl.getUniformLocation(program, "u_spread"), 80.0);
			gl.uniform2f(gl.getUniformLocation(program, "u_noiseSize"), noise.size, noise.size);
		}

		// Render
		gl.viewport(0, 0, w, h);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		// Read back
		const outData = outImgData.data;
		gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, outData);

		// Build index map and string from output.
		//
		// The GPU shaders above only resample the image (plus, for
		// bayer/blue, add the ordered-dither offset) — they do NOT snap to
		// the palette. That happens here, in JS, so bayer/blue modes can
		// use the same row-wise error-carry as modeBayer()/modeBlueNoise()
		// in matrix-engine.js: 60% of each pixel's leftover quantization
		// error is carried into the next pixel along the row. That carry
		// is what keeps the result from looking like the raw Bayer/Blue-
		// Noise matrix tiled across the image — it's an inherently serial,
		// row-wise dependency (pixel x needs pixel x-1's residual) that a
		// parallel fragment shader has no way to express, so it has to
		// happen after readback rather than inside the shader.
		const indexMap = new Uint8Array(w * h);
		const colorCount = rgbPalette.length;
		const tmpTable = CHAR_TABLE; //colorCount > B32_TABLE.length ? B64_TABLE : (colorCount > HEX_TABLE.length ? B32_TABLE : HEX_TABLE);
		const useCarry = mode.startsWith("bayer") || mode.startsWith("blue");
		const carryStrength = 0.6;
		const clampByte = (v) => v < 0 ? 0 : (v > 255 ? 255 : v);

		let partialStr = onRow ? "" : "img`\n";
		for (let y = 0; y < h; y++) {
			let rowStr = "";
			const rowBase = y * w;
			let carryR = 0, carryG = 0, carryB = 0;
			for (let x = 0; x < w; x++) {
				const px = rowBase + x;
				const off = px << 2;
				const a = outData[off + 3];
				if (a < 128) {
					indexMap[px] = 0;
					rowStr += tmpTable[0];
					outData[off] = 0; outData[off + 1] = 0;
					outData[off + 2] = 0; outData[off + 3] = 0;
					carryR = carryG = carryB = 0;
				} else {
					const r = useCarry ? clampByte(outData[off] + carryR) : outData[off];
					const g = useCarry ? clampByte(outData[off + 1] + carryG) : outData[off + 1];
					const b = useCarry ? clampByte(outData[off + 2] + carryB) : outData[off + 2];
					let minDist = Infinity, nearest = 1;
					for (let i = 1; i < colorCount; i++) {
						const p = rgbPalette[i];
						const dr = r - p.r, dg = g - p.g, db = b - p.b;
						const dist = dr * dr + dg * dg + db * db;
						if (dist < minDist) { minDist = dist; nearest = i; }
					}
					indexMap[px] = nearest;
					rowStr += tmpTable[nearest];
					const c = rgbPalette[nearest];
					if (useCarry) {
						carryR = (r - c.r) * carryStrength;
						carryG = (g - c.g) * carryStrength;
						carryB = (b - c.b) * carryStrength;
					}
					outData[off] = c.r; outData[off + 1] = c.g;
					outData[off + 2] = c.b; outData[off + 3] = c.a !== undefined ? c.a : 255;
				}
			}
			if (onRow) await onRow(y, rowStr, indexMap); else partialStr += rowStr + "\n";
		}

		return { hexString: onRow ? "" : partialStr + "`", indexMap };
	}
}

/*export*/ async function runGLPipeline({ canvas, data, w, h, mode, rgbPalette, outImgData, onProgress, onRow, hasAlpha }) {
	const engine = new GLEngine(canvas);
	// GPU renders all at once — simulate progress
	onProgress("25.0000");
	await new Promise(r => requestAnimationFrame(r));
	onProgress("50.0000");
	await new Promise(r => requestAnimationFrame(r));
	// See matrixcl.js runConversionPipeline for why alphaColor is gated on hasAlpha.
	const activePalette = hasAlpha
		? rgbPalette
		: rgbPalette.map((c, i) => (i === 0 ? c : { r: c.r, g: c.g, b: c.b, a: 255 }));
	const result = await engine.render({ data, w, h, mode, rgbPalette: activePalette, outImgData, onRow });
	onProgress("100.0000");
	return result;
}
