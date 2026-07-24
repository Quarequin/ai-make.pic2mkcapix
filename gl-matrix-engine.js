// gl-matrix-engine.js — GPU PixelArt Conversion Engine (WebGL 2.0)
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

// Base fragment shader with palette matching
const FRAG_BASE = `
precision highp float;
varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec3 u_palette[64];
uniform int u_paletteCount;
uniform vec2 u_resolution;

float colorDist(vec3 a, vec3 b) {
	vec3 d = a - b;
	return dot(d, d);
}

// GLSL ES 1.00 only allows arrays to be indexed by a constant expression
// or the index variable of an enclosing bounded for-loop. Returning an
// int from a "findNearest" function and indexing u_palette[] with it
// afterwards is "dynamic" indexing and gets rejected by strict
// validators ("Index expression can only contain const or loop
// symbols"). To stay within that rule, the nearest palette color is
// selected and returned directly here, using only the loop counter i
// (and the constant 1) to index u_palette[].
//
// This loop intentionally never uses break. Data-dependent early
// exits inside a fragment-shader loop are a documented source of
// per-fragment divergence bugs on some GPU compilers — fragments are
// rasterized in 2x2 quads, and a driver that mishandles a break that
// only some fragments in a quad take can corrupt output in an
// alternating (checkerboard) pattern across the whole image. Instead,
// every fragment runs the same fixed number of iterations and simply
// masks out entries past u_paletteCount with an unreachable distance.
vec3 findNearestColor(vec3 col) {
	float minDist = 1e9;
	vec3 nearest = u_palette[1];
	for (int i = 1; i < 64; i++) {
		bool active = i < u_paletteCount;
		float d = active ? colorDist(col, u_palette[i]) : 1e9;
		if (d < minDist) {
			minDist = d;
			nearest = u_palette[i];
		}
	}
	return nearest;
}

vec3 samplePixel() {
	return texture2D(u_image, v_texCoord).rgb;
}

float getAlpha() {
	return texture2D(u_image, v_texCoord).a;
}
`;

// ---- SOLID MODE ----
const FRAG_SOLID = FRAG_BASE + `
void main() {
	float alpha = getAlpha();
	if (alpha < 0.5) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
		return;
	}
	vec3 col = samplePixel();
	vec3 nearest = findNearestColor(col);
	gl_FragColor = vec4(nearest, 1.0);
}`;

// ---- BAYER MODE (pre-computed matrix, sampled from a texture so the
// lookup coordinate can be a runtime-computed value — texture sampling
// has no "constant/loop index only" restriction, unlike uniform arrays) ----
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
	vec3 nearest = findNearestColor(col);
	gl_FragColor = vec4(nearest, 1.0);
}`;

// ---- BLUE NOISE MODE ----
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
	vec3 nearest = findNearestColor(col);
	gl_FragColor = vec4(nearest, 1.0);
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

// ---- Full-screen quad ----
const QUAD_VERTICES = new Float32Array([
	-1, -1, 0, 0,
	 1, -1, 1, 0,
	-1,	1, 0, 1,
	 1,	1, 1, 1
]);

// ============================================================
// PRE-COMPUTED BAYER MATRICES (Classical) — flattened to Float32
// ============================================================
const BAYER4_F32 = new Float32Array([
	0, 8, 2, 10,
	12, 4, 14, 6,
	3, 11, 1, 9,
	15, 7, 13, 5
].map(v => v / 16.0));

const BAYER8_F32 = new Float32Array([
	0, 32, 8, 40, 2, 34, 10, 42,
	48, 16, 56, 24, 50, 18, 58, 26,
	12, 44, 4, 36, 14, 46, 6, 38,
	60, 28, 52, 20, 62, 30, 54, 22,
	3, 35, 11, 43, 1, 33, 9, 41,
	51, 19, 59, 27, 49, 17, 57, 25,
	15, 47, 7, 39, 13, 45, 5, 37,
	63, 31, 55, 23, 61, 29, 53, 21
].map(v => v / 64.0));

const BAYER16_F32 = new Float32Array([
	0, 128, 32, 160, 8, 136, 40, 168, 2, 130, 34, 162, 10, 138, 42, 170,
	192, 64, 224, 96, 200, 72, 232, 104, 194, 66, 226, 98, 202, 74, 234, 106,
	48, 176, 16, 144, 56, 184, 24, 152, 50, 178, 18, 146, 58, 186, 26, 154,
	240, 112, 208, 80, 248, 120, 216, 88, 242, 114, 210, 82, 250, 122, 218, 90,
	12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166,
	204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102,
	60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150,
	252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86,
	3, 131, 35, 163, 11, 139, 43, 171, 1, 129, 33, 161, 9, 137, 41, 169,
	195, 67, 227, 99, 203, 75, 235, 107, 193, 65, 225, 97, 201, 73, 233, 105,
	51, 179, 19, 147, 59, 187, 27, 155, 49, 177, 17, 145, 57, 185, 25, 153,
	243, 115, 211, 83, 251, 123, 219, 91, 241, 113, 209, 81, 249, 121, 217, 89,
	15, 143, 47, 175, 7, 135, 39, 167, 13, 141, 45, 173, 5, 133, 37, 165,
	207, 79, 239, 111, 199, 71, 231, 103, 205, 77, 237, 109, 197, 69, 229, 101,
	63, 191, 31, 159, 55, 183, 23, 151, 61, 189, 29, 157, 53, 181, 21, 149,
	255, 127, 223, 95, 247, 119, 215, 87, 253, 125, 221, 93, 245, 117, 213, 85
].map(v => v / 256.0));

// Uint8 texture versions of the same matrices — the Bayer lookup is now
// done via texture2D() sampling (like the Blue Noise mode already did)
// instead of indexing a uniform float array by a runtime-computed
// index, which GLSL ES 1.00 rejects (see FRAG_BASE comment above).
function _floatMatrixToU8(floatArr) {
	const out = new Uint8Array(floatArr.length);
	for (let i = 0; i < floatArr.length; i++) out[i] = Math.round(floatArr[i] * 255);
	return out;
}
const BAYER4_U8 = _floatMatrixToU8(BAYER4_F32);
const BAYER8_U8 = _floatMatrixToU8(BAYER8_F32);
const BAYER16_U8 = _floatMatrixToU8(BAYER16_F32);

// ============================================================
// PRE-COMPUTED BLUE NOISE MATRICES
// ============================================================
const BLUE8_U8 = new Uint8Array([
	141, 186, 149, 52, 101, 182, 137, 105,
	170, 113, 206, 20, 242, 153, 202, 246,
	64, 222, 80, 32, 117, 12, 89, 40,
	16, 48, 161, 210, 178, 60, 24, 0,
	230, 93, 250, 145, 72, 234, 190, 109,
	56, 4, 121, 198, 157, 125, 36, 214,
	68, 8, 44, 174, 133, 255, 85, 28,
	226, 97, 238, 76, 218, 129, 194, 165
]);

const BLUE16_U8 = new Uint8Array([
	227, 141, 129, 236, 160, 134, 71, 30, 162, 235, 99, 209, 108, 192, 94, 155,
	78, 190, 153, 53, 86, 224, 178, 148, 93, 42, 183, 144, 26, 73, 10, 41,
	139, 3, 248, 115, 200, 13, 63, 249, 170, 126, 213, 56, 166, 232, 118, 204,
	59, 220, 172, 112, 33, 154, 245, 88, 195, 14, 48, 104, 185, 6, 150, 80,
	131, 241, 96, 21, 180, 70, 137, 22, 237, 84, 38, 202, 1, 67, 222, 122,
	252, 46, 164, 128, 255, 107, 52, 191, 143, 218, 11, 158, 91, 176, 40, 207,
	17, 110, 74, 233, 45, 198, 25, 120, 60, 247, 101, 29, 134, 50, 240, 168,
	82, 197, 5, 187, 159, 77, 212, 35, 173, 8, 114, 69, 226, 147, 19, 94,
	234, 136, 58, 181, 14, 92, 250, 44, 211, 132, 54, 193, 12, 86, 223, 105,
	49, 171, 109, 28, 243, 125, 68, 156, 4, 182, 97, 36, 254, 151, 64, 216,
	189, 31, 238, 83, 167, 47, 206, 116, 244, 17, 146, 79, 199, 42, 117, 230,
	2, 161, 100, 19, 140, 221, 57, 185, 102, 72, 215, 10, 127, 253, 89, 178,
	75, 208, 43, 251, 111, 6, 163, 34, 188, 129, 61, 239, 24, 165, 55, 196,
	145, 27, 124, 95, 230, 152, 81, 246, 15, 113, 48, 175, 204, 37, 142, 9,
	219, 66, 194, 18, 76, 135, 23, 106, 231, 51, 183, 7, 121, 247, 103, 214,
	62, 169, 0, 149, 210, 87, 201, 39, 168, 98, 33, 158, 20, 228, 141, 184
]);

const BLUE32_U8 = new Uint8Array([
	154, 181, 42, 20, 79, 34, 109, 18, 95, 135, 190, 84, 202, 128, 190, 68, 34, 1, 23, 84, 237, 70, 225, 144, 237, 165, 49, 102, 237, 109, 186, 70,
	9, 116, 220, 248, 163, 253, 147, 212, 55, 245, 14, 167, 38, 57, 11, 233, 152, 197, 139, 174, 54, 122, 14, 92, 63, 13, 197, 180, 26, 142, 59, 217,
	131, 204, 88, 52, 137, 101, 28, 194, 230, 119, 176, 244, 96, 214, 156, 46, 111, 81, 219, 32, 241, 160, 206, 132, 227, 120, 251, 89, 194, 5, 103, 168,
	36, 173, 15, 229, 64, 185, 239, 73, 4, 50, 21, 126, 35, 78, 191, 138, 28, 149, 64, 113, 17, 72, 38, 177, 48, 155, 33, 67, 218, 161, 78, 21,
	243, 105, 199, 58, 222, 12, 158, 91, 169, 201, 143, 59, 249, 17, 106, 223, 182, 95, 236, 6, 151, 100, 211, 10, 83, 201, 123, 242, 12, 133, 230, 47,
	80, 41, 250, 124, 39, 171, 48, 134, 255, 110, 82, 188, 40, 129, 71, 195, 53, 164, 20, 127, 189, 44, 136, 254, 29, 172, 52, 107, 187, 94, 25, 209,
	216, 145, 27, 183, 96, 235, 77, 19, 61, 226, 151, 8, 166, 93, 247, 31, 115, 75, 198, 58, 232, 81, 19, 117, 223, 41, 158, 76, 255, 57, 150, 114,
	62, 232, 112, 7, 213, 53, 141, 203, 125, 37, 104, 197, 49, 179, 13, 85, 240, 46, 130, 243, 15, 169, 62, 146, 96, 181, 8, 199, 35, 126, 205, 88,
	175, 2, 193, 66, 156, 30, 102, 247, 86, 173, 21, 68, 157, 221, 108, 194, 60, 153, 11, 87, 184, 128, 236, 51, 134, 220, 69, 148, 242, 16, 44, 179,
	118, 229, 47, 139, 11, 224, 67, 181, 42, 250, 145, 33, 84, 6, 238, 74, 165, 101, 217, 43, 99, 24, 163, 79, 11, 252, 106, 31, 171, 83, 197, 121,
	54, 161, 100, 255, 74, 189, 116, 5, 159, 97, 54, 210, 127, 45, 161, 29, 212, 56, 140, 191, 70, 208, 45, 190, 147, 60, 183, 224, 55, 140, 10, 236,
	207, 23, 132, 81, 214, 46, 152, 231, 19, 136, 77, 186, 253, 118, 203, 52, 34, 123, 226, 5, 155, 37, 114, 234, 28, 95, 215, 40, 129, 249, 72, 165,
	38, 187, 14, 172, 60, 129, 245, 108, 63, 204, 28, 92, 144, 67, 12, 176, 247, 91, 48, 170, 102, 250, 84, 6, 173, 131, 51, 199, 22, 104, 188, 53,
	143, 68, 228, 93, 201, 38, 17, 78, 168, 113, 242, 56, 185, 230, 89, 41, 158, 22, 135, 59, 218, 141, 193, 122, 57, 246, 110, 80, 154, 37, 231, 98,
	251, 122, 49, 195, 8, 166, 220, 44, 137, 2, 75, 149, 23, 105, 254, 147, 78, 204, 33, 116, 63, 180, 29, 159, 100, 21, 164, 235, 48, 213, 117, 7,
	16, 177, 106, 34, 157, 85, 54, 192, 117, 234, 43, 162, 198, 61, 128, 19, 187, 49, 225, 94, 213, 46, 126, 205, 73, 145, 30, 112, 191, 62, 136, 219,
	182, 65, 240, 13, 111, 203, 26, 91, 14, 179, 101, 38, 81, 172, 56, 221, 14, 168, 77, 151, 35, 108, 244, 17, 156, 88, 207, 42, 125, 254, 20, 96,
	44, 209, 124, 50, 173, 7, 148, 63, 246, 120, 53, 209, 28, 143, 95, 34, 192, 115, 58, 230, 12, 185, 71, 138, 50, 241, 169, 28, 181, 74, 159, 46,
	233, 28, 158, 86, 197, 36, 225, 131, 72, 19, 160, 247, 110, 64, 187, 252, 106, 44, 199, 82, 167, 54, 219, 97, 10, 196, 121, 64, 233, 8, 143, 111,
	102, 55, 236, 19, 141, 250, 94, 43, 188, 83, 230, 15, 76, 155, 42, 128, 73, 161, 27, 113, 237, 129, 32, 176, 85, 218, 47, 153, 102, 194, 57, 248,
	167, 78, 217, 60, 32, 115, 177, 57, 204, 134, 48, 171, 222, 9, 198, 61, 214, 136, 93, 181, 20, 63, 150, 242, 38, 127, 255, 70, 137, 29, 226, 84,
	13, 194, 110, 147, 229, 68, 21, 165, 100, 38, 116, 195, 52, 140, 24, 83, 47, 172, 38, 248, 105, 200, 89, 25, 174, 58, 211, 95, 19, 166, 51, 123,
	145, 42, 255, 92, 5, 183, 109, 237, 79, 155, 253, 69, 163, 237, 117, 45, 156, 29, 119, 68, 214, 48, 133, 61, 222, 145, 35, 189, 245, 108, 200, 75,
	35, 172, 79, 21, 161, 54, 128, 46, 214, 12, 88, 146, 31, 102, 189, 254, 97, 184, 52, 227, 11, 163, 78, 236, 103, 30, 152, 81, 17, 132, 62, 238,
	204, 118, 53, 198, 113, 244, 33, 191, 152, 67, 180, 41, 207, 74, 136, 21, 60, 141, 249, 16, 94, 128, 44, 191, 56, 220, 128, 194, 90, 247, 43, 156,
	11, 230, 141, 37, 86, 18, 156, 96, 25, 123, 201, 58, 149, 232, 57, 166, 205, 79, 34, 117, 173, 55, 210, 123, 167, 12, 71, 185, 54, 116, 203, 31,
	99, 64, 189, 246, 169, 76, 210, 139, 222, 49, 85, 173, 40, 115, 253, 88, 46, 151, 223, 62, 139, 2, 80, 158, 229, 97, 146, 38, 219, 177, 9, 68,
	152, 25, 107, 14, 58, 193, 45, 235, 162, 106, 37, 154, 245, 18, 131, 72, 186, 101, 54, 193, 28, 115, 237, 49, 126, 213, 65, 251, 133, 40, 95, 182,
	219, 82, 175, 128, 231, 3, 120, 71, 14, 199, 126, 61, 96, 179, 43, 210, 129, 17, 164, 88, 206, 70, 152, 34, 181, 57, 112, 29, 158, 224, 77, 144,
	48, 201, 40, 91, 165, 134, 51, 187, 250, 92, 144, 28, 68, 151, 234, 57, 242, 125, 73, 195, 42, 129, 223, 91, 20, 138, 246, 84, 191, 53, 121, 0,
	116, 56, 213, 30, 149, 80, 205, 110, 53, 168, 35, 113, 202, 84, 19, 160, 103, 48, 212, 36, 154, 247, 66, 175, 108, 32, 170, 63, 235, 147, 26, 198,
	67, 180, 12, 241, 104, 226, 63, 19, 143, 218, 76, 183, 47, 132, 251, 95, 38, 171, 59, 140, 218, 101, 45, 133, 241, 155, 87, 199, 44, 110, 179, 250
]);

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
			// WebGL1 for older browsers. Note: the shaders themselves must
			// still avoid GLSL ES 1.00's "array index must be a constant or
			// loop symbol" restriction regardless of context version — see
			// the comment above findNearestColor() in FRAG_BASE — since
			// several drivers enforce it identically under both webgl and
			// webgl2 contexts.
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
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}

	// Uploads a single-channel (LUMINANCE) lookup texture, cached per key.
	// Used for both the Blue Noise texture and the Bayer matrix texture —
	// sampling a texture with a runtime-computed UV has no GLSL ES 1.00
	// "constant/loop index only" restriction, unlike a uniform array.
	_uploadLuminanceTexture(key, texData, size) {
		const gl = this.gl;
		let tex = this.textures[key];
		if (!tex) {
			tex = gl.createTexture();
			this.textures[key] = tex;
		}
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
	render({ data, w, h, mode, rgbPalette, outImgData }) {
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

		// Upload image
		this._uploadImageTexture(data, w, h);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.textures["image"]);
		gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);

		// Set palette
		const palLoc = gl.getUniformLocation(program, "u_palette");
		const palFlat = new Float32Array(64 * 3);
		for (let i = 0; i < rgbPalette.length && i < 64; i++) {
			const c = rgbPalette[i];
			palFlat[i * 3] = c.r / 255;
			palFlat[i * 3 + 1] = c.g / 255;
			palFlat[i * 3 + 2] = c.b / 255;
		}
		gl.uniform3fv(palLoc, palFlat);
		gl.uniform1i(gl.getUniformLocation(program, "u_paletteCount"), rgbPalette.length);
		gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), w, h);

		// Mode-specific uniforms
		if (mode.startsWith("bayer")) {
			const bayer = this._getBayerArray(mode);
			this._uploadLuminanceTexture("bayer", bayer.data, bayer.size);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.textures["bayer"]);
			gl.uniform1i(gl.getUniformLocation(program, "u_bayerTex"), 1);
			gl.uniform1f(gl.getUniformLocation(program, "u_bayerSize"), bayer.size);
			gl.uniform1f(gl.getUniformLocation(program, "u_spread"), 72.0);
		} else if (mode.startsWith("blue")) {
			const noise = this._getBlueNoiseArray(mode);
			this._uploadLuminanceTexture("noise", noise.data, noise.size);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.textures["noise"]);
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

		// Build index map and string from output
		const indexMap = new Uint8Array(w * h);
		const colorCount = rgbPalette.length;
		const HEX_TABLE = "0123456789ABCDEF";
		const B32_TABLE = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
		const B64_TABLE = "0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz#&@%$?^:+/";
		const tmpTable = colorCount > B32_TABLE.length ? B64_TABLE : (colorCount > HEX_TABLE.length ? B32_TABLE : HEX_TABLE);

		let partialStr = "img`\n";
		for (let y = 0; y < h; y++) {
			let rowStr = "";
			const rowBase = y * w;
			for (let x = 0; x < w; x++) {
				const px = rowBase + x;
				const off = px << 2;
				const r = outData[off];
				const g = outData[off + 1];
				const b = outData[off + 2];
				const a = outData[off + 3];
				if (a < 128) {
					indexMap[px] = 0;
					rowStr += tmpTable[0];
					outData[off] = 0; outData[off + 1] = 0;
					outData[off + 2] = 0; outData[off + 3] = 0;
				} else {
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
					outData[off] = c.r; outData[off + 1] = c.g;
					outData[off + 2] = c.b; outData[off + 3] = c.a !== undefined ? c.a : 255;
				}
			}
			partialStr += rowStr + "\n";
		}

		return { hexString: partialStr + "`", indexMap };
	}
}

/*export*/ async function runGLPipeline({ canvas, data, w, h, mode, rgbPalette, outImgData, onProgress }) {
	const engine = new GLEngine(canvas);
	// GPU renders all at once — simulate progress
	onProgress("25.00");
	await new Promise(r => requestAnimationFrame(r));
	onProgress("50.00");
	await new Promise(r => requestAnimationFrame(r));
	const result = engine.render({ data, w, h, mode, rgbPalette, outImgData });
	onProgress("100.00");
	return result;
}
