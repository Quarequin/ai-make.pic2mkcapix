// maincode.js — Main Application Controller
// Modular imports: CPU engine, GPU engine, animation processor

//import { runConversionPipeline, exportAscii } from "./matrixcl.js";
//import { runGLPipeline } from "./matrixgl.js";
//import { decodeAnimation, isAnimatedFormat } from "./animproc.js";

const htmlLog = [];
let loaded = false;
let lastIndexMap = null;
let lastW = 0,
	lastH = 0;
let animFrames = [];
let currentFrameIndex = 0;
let processedAnimation = null;
function isValidHexRGB(val) {
	return (/^#[0-9A-Fa-f]{8}$/.test(val)||/^#[0-9A-Fa-f]{6}$/.test(val)||/^#[0-9A-Fa-f]{3,4}$/.test(val))
}
// Shared hex -> {r,g,b,a} parser (0-255 each). Correctly expands 3/4-digit
// shorthand by duplicating each nibble (per CSS shorthand-color spec) instead
// of left-shifting it, and treats a=0 (fully transparent) as valid rather
// than falling back to opaque via `|| 255`.
function hexToRgba(hex) {
	const h = hex.replace("#", "");
	const nib = (c) => parseInt(c, 16);
	const dup = (n) => (n << 4) | n;
	if (h.length === 3 || h.length === 4) {
		const a = h.length === 4 ? dup(nib(h[3])) : 255;
		return { r: dup(nib(h[0])), g: dup(nib(h[1])), b: dup(nib(h[2])), a };
	}
	const a = h.length === 8 ? parseInt(h.substring(6, 8), 16) : 255;
	return {
		r: parseInt(h.substring(0, 2), 16),
		g: parseInt(h.substring(2, 4), 16),
		b: parseInt(h.substring(4, 6), 16),
		a: Number.isNaN(a) ? 255 : a,
	};
}
// #rrggbb string for the 6-char-only native <input type="color">, dropping alpha.
function hexRgbOnly(hex) {
	const { r, g, b } = hexToRgba(hex);
	const h2 = (n) => n.toString(16).padStart(2, "0");
	return `#${h2(r)}${h2(g)}${h2(b)}`;
}

function addToSessionLog(type, message, detail) {
	const timestamp = new Date().toISOString().split("T")[1].substring(0, 8);
	const logEntry = `[${timestamp}] [${type}] ${message}${detail ? "\nDetail: " + detail : ""}`;
	htmlLog.push(logEntry);
	console.log(logEntry);
}

addToSessionLog("SYSTEM", "Application initialized successfully.");

// ---- WEBGL 2.0 DETECTION ----
function detectWebGL() {
	try {
		const c = document.createElement("canvas");
		// gl-matrix-engine.js relies on dynamic (non-constant) array
		// indexing in its shaders, which requires a WebGL2 context — a
		// plain WebGL1 context can fail to compile those shaders on some
		// drivers. Match GLEngine.checkWebGL()'s context preference here.
		return !!(
			c.getContext('webgl2') ||
			c.getContext('webgl') ||
			c.getContext('experimental-webgl')
		);
	} catch (e) {
		return false;
	}
}
const webglSupported = detectWebGL();

// ---- ELEMENT REFS ----
const fileInput = document.getElementById("file");
const paletteFileInput = document.getElementById("palette-file-reader");
const predefinedPaletteSelect = document.getElementById(
	"predefined-palette-select",
);
const modeSelect = document.getElementById("mode-select");
const subpixelSelect = document.getElementById("subpixel-select");
const engineSelect = document.getElementById("engine-select");
const asciiEnableCheck = document.getElementById("ascii-enable");
const asciiSubOptions = document.getElementById("ascii-sub-options");
const asciiCharsetSelect = document.getElementById("ascii-charset-select");
const asciiWidthInput = document.getElementById("ascii-width-input");
const asciiTabBtn = document.getElementById("ascii-tab-btn");
const asciiOutputTA = document.getElementById("ascii-output");
const runButton = document.getElementById("run");
const copyButton = document.getElementById("copy");
const downloadButton = document.getElementById("download");
const statusDiv = document.getElementById("status");
const textarea = document.getElementById("output");
const previewContainer = document.querySelector(".image-preview-container");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const inputWidth = document.getElementById("width");
const inputHeight = document.getElementById("height");
const inputFactor = document.getElementById("factor");
const inputRatio = document.getElementById("ratio");
const parametersForm = document.getElementById("parameters");
const colorpad = document.getElementById("colorpad");
const paletteAddBtn = document.getElementById("palette-add-btn");
const paletteRemoveBtn = document.getElementById("palette-remove-btn");
const paletteCountLbl = document.getElementById("palette-count-label");
const predefinedFileMediaType = {
	"image/png":"png","image/jpeg":"jpeg","image/jpg":"jpg",
	"image/jpe":"jpe","image/jxl":"jxl","image/bmp":"bmp",
	"image/gif":"gif","image/webp":"webp","image/apng":"apng",
	"video/webm":"webm"
};

let originalImageSize = { width: 0, height: 0 };
let originalMimeType = "image/png";
let canvasName = "pic2pa.png";
let canvasLastName = ".png";
let rgbPalette = [];
let uploadedFileBuffer = null;
let isTextProcessing = false;
let stopTextProcessingFlag = false;
let curResizeMode = "=";
let nextResizeMode = "-"

// ---- OUTPUT TABS ----
document.querySelectorAll(".tab-btn").forEach((btn) => {
	btn.addEventListener("click", function () {
		document
			.querySelectorAll(".tab-btn")
			.forEach((b) => b.classList.remove("active"));
		document
			.querySelectorAll(".tab-panel")
			.forEach((p) => p.classList.remove("active"));
		this.classList.add("active");
		document
			.getElementById("tab-" + this.dataset.tab)
			.classList.add("active");
	});
});

// ---- ASCII TOGGLE ----
asciiEnableCheck.addEventListener("change", function () {
	asciiSubOptions.style.display = this.checked ? "block" : "none";
	asciiTabBtn.disabled = !this.checked;
	if (!this.checked) {
		asciiOutputTA.value = "";
		const asciiTab = document.querySelector('.tab-btn[data-tab="ascii"]');
		if (asciiTab && asciiTab.classList.contains("active")) {
			document.querySelector('.tab-btn[data-tab="pixelart"]').click();
		}
	}
	addToSessionLog(
		"ASCII",
		`ASCII output ${this.checked ? "enabled" : "disabled"}.`,
	);
});

// ---- ENGINE SELECT (CPU/GPU toggle + Floyd-Steinberg visibility) ----
// Disable GPU option if WebGL2 is not supported
if (!webglSupported) {
	const gpuOpt = engineSelect.querySelector('option[value="gpu"]');
	if (gpuOpt) {
		gpuOpt.disabled = true;
		gpuOpt.textContent += " (Not Supported)";
	}
	addToSessionLog("SYSTEM", "WebGL not detected. GPU mode disabled.");
}

engineSelect.addEventListener("change", function () {
	// Guard: fallback to CPU if GPU selected but WebGL2 unavailable
	if (this.value === "gpu" && !webglSupported) {
		displayErrorPopup(
			"WebGL Not Supported",
			"Your browser or device does not support WebGL.",
			"The GPU processing engine requires WebGL. Falling back to CPU mode.",
		);
		this.value = "cpu";
		return;
	}

	const isGPU = this.value === "gpu";
	const errorOptgroup = document.getElementById("optgroup-error");
	const errorOption = modeSelect.querySelector('option[value="error"]');
	if (isGPU) {
		if (modeSelect.value === "error") modeSelect.value = "solid";
		if (errorOptgroup) errorOptgroup.style.display = "none";
		if (errorOption) errorOption.style.display = "none";
	} else {
		if (errorOptgroup) errorOptgroup.style.display = "block";
		if (errorOption) errorOption.style.display = "block";
	}
	addToSessionLog(
		"ENGINE",
		`Switched to ${this.value.toUpperCase()} processing mode.`,
	);
});

// ---- BUTTON STATE ----
const BUTTON_STATES = Object.freeze({
	noImage: { run: true, copy: true, dl: true, copyText: "Copy to Clipboard", text: "Convert Image" },
	imageLoaded: { run: false, copy: true, dl: true, copyText: "Copy to Clipboard", text: "Convert Image" },
	processing: { run: true, copy: true, dl: true, copyText: "Copy to Clipboard", text: "Converting..." },
	almost: { run: true, copy: false, dl: false, copyText: "Stop Processing", text: "Almost There..." },
	done: { run: false, copy: false, dl: false, copyText: "Copy to Clipboard", text: "Convert Image" },
});

function setButtonState(state) {
	const current = BUTTON_STATES[state] || BUTTON_STATES.noImage;
	runButton.disabled = current.run;
	copyButton.disabled = current.copy;
	downloadButton.disabled = current.dl;
	copyButton.textContent = current.copyText;
	if (state !== "processing") runButton.textContent = current.text;
}
setButtonState("noImage");

// ============================================================
//  DYNAMIC PALETTE SLOT MANAGEMENT
// ============================================================
const MIN_PALETTE_SLOTS = 2;
const MAX_PALETTE_SLOTS = 64;

function updatePaletteCountLabel() {
	const count = colorpad.querySelectorAll(".color-pair").length;
	paletteCountLbl.textContent = `Active Color Registers (1–${count}):`;
	paletteRemoveBtn.disabled = count <= MIN_PALETTE_SLOTS;
	paletteAddBtn.disabled = count >= MAX_PALETTE_SLOTS;
}

function makeCustomPaletteLabel() {
	predefinedPaletteSelect.querySelector('option[value="custom"]').classList.remove("hidden");
	predefinedPaletteSelect.value = "custom";
}

function createPalettePair(index, value = '#888888') {
	const pair = document.createElement('div');
	pair.className = 'color-pair';
	const label = document.createElement('label');
	const picker = document.createElement('input');
	const text = document.createElement('input');
	label.textContent = `Color ${index + 1}`;
	picker.type = 'color';
	picker.value = hexRgbOnly(value);
	text.type = 'text';
	text.className = 'colortext';
	text.value = value;
	pair.append(label, picker, text);
	colorpad.appendChild(pair);
	bindColorPairEvents(pair, index);
	return pair;
}

function syncPaletteSize(targetCount) {
	const count = Math.max(MIN_PALETTE_SLOTS, Math.min(MAX_PALETTE_SLOTS, targetCount));
	while (colorpad.querySelectorAll('.color-pair').length > count) colorpad.lastElementChild.remove();
	while (colorpad.querySelectorAll('.color-pair').length < count) createPalettePair(colorpad.querySelectorAll('.color-pair').length);
	reindexColorPairs();
}

function bindColorPairEvents(pair, idx) {
	let palColor = "";
	try {
		palColor = predefinedPalettes[predefinedPaletteSelect.value][idx+1];
	} catch {
		palColor = "";
	}
	const picker = pair.querySelector('input[type="color"]');
	const txt = pair.querySelector(".colortext");
	// alphaColor (an optional 4th hex byte, e.g. #rrggbbaa) can't be stored in
	// the native <input type="color"> — it always normalizes to 6 digits — so
	// it's kept alongside it on pair.dataset.alpha instead. Typing it is never
	// required: a plain #rrggbb still works exactly as before (defaults to 255).
	if (pair.dataset.alpha === undefined) pair.dataset.alpha = String(hexToRgba(txt.value).a);
	picker.addEventListener("input", function () {
		// Native swatch has no alpha channel — picking a new color resets to opaque.
		pair.dataset.alpha = "255";
		txt.value = this.value;
	});
	txt.addEventListener("input", function () {
		let val = this.value.trim();
		if (!val.startsWith("#")) val = "#" + val;
		if (isValidHexRGB(val)) {
			picker.value = hexRgbOnly(val);
			pair.dataset.alpha = String(hexToRgba(val).a);
			this.value = val;
			if (isValidHexRGB(palColor) && val !== palColor) makeCustomPaletteLabel();
		}
	});
	txt.addEventListener("change", function () {
		let val = this.value.trim();
		if (!val.startsWith("#")) val = "#" + val;
		if (isValidHexRGB(val)) {
			picker.value = hexRgbOnly(val);
			pair.dataset.alpha = String(hexToRgba(val).a);
			this.value = val;
			addToSessionLog(
				"PALETTE",
				`Color slot ${idx + 1} updated to ${val}`,
			);
			if (isValidHexRGB(palColor) && val !== palColor) makeCustomPaletteLabel();
		} else {
			addToSessionLog("PALETTE_FAULT", `Invalid hex code typed: ${val}`);
			displayErrorPopup(
				"Invalid Color HEX Input",
				`The color code "${val}" is invalid.`,
				"Please use Hexadecimal format such as #FFF, #FFFF, #FFFFFF or #FFFFFFFF only.",
			);
			this.value = picker.value;
		}
	});
}

function reindexColorPairs() {
	colorpad.querySelectorAll(".color-pair").forEach((pair, i) => {
		pair.querySelector("label").textContent = `Color ${i + 1}`;
	});
	updatePaletteCountLabel();
}

colorpad.querySelectorAll(".color-pair").forEach((pair, idx) => {
	bindColorPairEvents(pair, idx);
});
updatePaletteCountLabel();

paletteAddBtn.addEventListener('click', function () {
	const count = colorpad.querySelectorAll('.color-pair').length;
	if (count >= MAX_PALETTE_SLOTS) return;
	createPalettePair(count);
	reindexColorPairs();
	makeCustomPaletteLabel();
	addToSessionLog('PALETTE', `Added color slot ${count + 1}.`);
});

paletteRemoveBtn.addEventListener("click", function () {
	const pairs = colorpad.querySelectorAll(".color-pair");
	if (pairs.length <= MIN_PALETTE_SLOTS) return;
	colorpad.removeChild(pairs[pairs.length - 1]);
	reindexColorPairs();
	makeCustomPaletteLabel();
	addToSessionLog(
		"PALETTE",
		`Removed last color slot (now ${pairs.length - 1} slots).`,
	);
});

predefinedPaletteSelect.addEventListener("change", function () {
	if (this.value === "custom" || !predefinedPalettes[this.value]) return;
	this.querySelector('option[value="custom"]').classList.add("hidden");
	const colors = predefinedPalettes[this.value];
	if (!colors) return;
	const targetCount = colors.length;
	syncPaletteSize(targetCount);
	colorpad.querySelectorAll(".color-pair").forEach((pair, i) => {
		if (colors[i]) {
			pair.querySelector('input[type="color"]').value = hexRgbOnly(colors[i]);
			pair.querySelector(".colortext").value = colors[i];
			pair.dataset.alpha = String(hexToRgba(colors[i]).a);
		}
	});
	reindexColorPairs();
	statusDiv.textContent = `System: Loaded predefined "${this.value}" palette schema.`;
	addToSessionLog(
		"PALETTE",
		`Switched layout to predefined scheme: ${this.value}`,
	);
});

paletteFileInput.addEventListener("change", function (e) {
	const file = e.target.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onerror = () =>
		displayErrorPopup(
			"Palette File IO Exception",
			"An error occurred while reading the palette source file.",
			reader.error ? reader.error.message : "Unknown fault.",
		);
	reader.onload = function (evt) {
		try {
			const colorsFound = [];
			evt.target.result.split(/\r?\n/).forEach((line) => {
				const clean = line.trim().replace(/;.*$/, "").trim();
				const match = clean.match(/#?([0-9A-Fa-f]{8})/)||clean.match(/#?([0-9A-Fa-f]{6})/)||clean.match(/#?([0-9A-Fa-f]{3,4})/);
				if (match) colorsFound.push("#" + match[1].toLowerCase());
			});
			if (colorsFound.length > 0) {
				syncPaletteSize(colorsFound.length);
				colorpad.querySelectorAll(".color-pair").forEach((pair, i) => {
					if (colorsFound[i]) {
						pair.querySelector('input[type="color"]').value =
							hexRgbOnly(colorsFound[i]);
						pair.querySelector(".colortext").value = colorsFound[i];
						pair.dataset.alpha = String(hexToRgba(colorsFound[i]).a);
					}
				});
				reindexColorPairs();
				statusDiv.textContent = `System: Loaded ${colorsFound.length} colors from palette file.`;
				addToSessionLog(
					"PALETTE",
					`Imported external palette from ${file.name}.`,
				);
			} else {
				displayErrorPopup(
					"Palette Parsing Exception",
					"No valid Hexadecimal color codes found in this file.",
					"Please verify the file contents.",
				);
			}
			makeCustomPaletteLabel();
		} catch (err) {
			displayErrorPopup(
				"Palette Processor Runtime Fault",
				err.message,
				err.stack,
			);
		}
	};
	reader.readAsText(file);
});

// rgbPalette[0] is always the implicit transparent/background register;
// user slots (indices 1..N) read r/g/b from the color picker and alpha from
// pair.dataset.alpha. Whether this alpha is actually used in the output is
// decided later, per-conversion, based on whether the source image itself
// has transparency — see imageDataHasAlpha() and the hasAlpha pipeline flag.
function parseCurrentPalette() {
	rgbPalette = [
		{
			r: 0,
			g: 0,
			b: 0,
			a: 0,
		},
	].concat(
		Array.from(colorpad.querySelectorAll(".color-pair")).map((pair) => {
			const { r, g, b } = hexToRgba(pair.querySelector('input[type="color"]').value);
			const a = parseInt(pair.dataset.alpha, 10);
			return { r, g, b, a: Number.isNaN(a) ? 255 : a };
		}),
	);
}

// ============================================================
//  IMAGE / ANIMATION LOAD
// ============================================================
function resetLoadedState() {
	textarea.value = '';
	asciiOutputTA.value = '';
	lastIndexMap = null;
	animFrames = [];
	processedAnimation = null;
	uploadedFileBuffer = null;
	setButtonState('noImage');
}

function showLoadedPreview(preview, width, height, frameCount = 0) {
	if (previewContainer) previewContainer.style.display = 'block';
	document.getElementById('original-res').textContent = `Size: ${width} x ${height} px${frameCount ? ` | Frames: ${frameCount}` : ''}`;
	document.getElementById('original-preview-zone').replaceChildren(preview);
	document.querySelectorAll('input[disabled]').forEach((element) => element.removeAttribute('disabled'));
	originalImageSize = { width, height };
	setButtonState('imageLoaded');
	updateCalculatedDimensions();
}

function sourceMime(file) {
	const extension = file.name.toLowerCase().split('.').pop();
	const byExtension = { gif: 'image/gif', apng: 'image/apng', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg', bmp: 'image/bmp', jxl: 'image/jxl', webm: 'video/webm' };
	return file.type || byExtension[extension] || '';
}

fileInput.addEventListener('change', async function () {
	resetLoadedState();
	const file = fileInput.files[0];
	if (!file) {
		statusDiv.textContent = 'Invalid: No image file. Try selecting an image such as PNG, JPG, GIF, APNG, WebP, or WebM.';
		return;
	}
	const mime = sourceMime(file);
	if (!/^image\//.test(mime) && mime !== 'video/webm') {
		statusDiv.textContent = `Invalid: ${file.name} is not a supported image or WebM file.`;
		return;
	}
	originalMimeType = mime;
	canvasLastName = isAnimatedFormat(mime) || mime === 'video/webm' ? '.gif' : '.png';
	uploadedFileBuffer = await file.arrayBuffer();
	try {
		const animated = isAnimatedFormat(mime) || isAnimatedBuffer(uploadedFileBuffer, mime);
		if (animated) {
			animFrames = await decodeAnimation(uploadedFileBuffer, mime);
			if (!animFrames.length) throw new Error('No decodable animation frames were found.');
			const first = animFrames[0];
			showLoadedPreview(first.image, first.width, first.height, animFrames.length);
			statusDiv.textContent = `Ready: ${file.name} Loaded (${animFrames.length} frame${animFrames.length === 1 ? '' : 's'}).`;
			addToSessionLog('ANIM', `Loaded ${mime} with ${animFrames.length} composited frame(s).`);
		} else {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.onload = () => {
				URL.revokeObjectURL(url);
				showLoadedPreview(image, image.naturalWidth, image.naturalHeight);
				statusDiv.textContent = `Ready: ${file.name} Loaded Successfully.`;
				addToSessionLog('IMAGE', `Loaded ${mime} source image.`);
			};
			image.onerror = () => {
				URL.revokeObjectURL(url);
				displayErrorPopup('Image Decoding Exception', 'Unable to decode this image file.', 'The file may be corrupted or unsupported.');
			};
			image.src = url;
		}
	} catch (error) {
		displayErrorPopup('Animation Decode Error', error.message, error.stack);
		resetLoadedState();
	}
});

function updateCalculatedDimensions() {
	if (
		!document.querySelector(
			"#original-preview-zone img, #original-preview-zone canvas",
		)
	)
		return;
	const disableImageSizeProp = (sized, factored) => {
		inputWidth.disabled = sized;
		inputHeight.disabled = sized;
		inputFactor.disabled = factored;
	}
	if (document.getElementById("original-size").checked) {
		nextResizeMode = "original-size"
		if (nextResizeMode !== curResizeMode) inputFactor.value = 1;
		const f = parseFloat(inputFactor.value) || 0.1;
		inputWidth.value = Math.round(originalImageSize.width * f);
		inputHeight.value = Math.round(originalImageSize.height * f);
		disableImageSizeProp(true, false);
	} else if (document.getElementById("full-width").checked) {
		nextResizeMode = "full-width"
		if (nextResizeMode !== curResizeMode) inputFactor.value = 0;
		inputWidth.value = 160;
		inputHeight.value = Math.round(
			originalImageSize.height * (160 / originalImageSize.width),
		);
		disableImageSizeProp(true, true);
	} else if (document.getElementById("full-height").checked) {
		nextResizeMode = "full-height"
		if (nextResizeMode !== curResizeMode) inputFactor.value = 0;
		inputHeight.value = 120;
		inputWidth.value = Math.round(
			originalImageSize.width * (120 / originalImageSize.height),
		);
		disableImageSizeProp(true, true);
	} else if (document.getElementById("scale").checked) {
		nextResizeMode = "scale"
		if (nextResizeMode !== curResizeMode) inputFactor.value = 0.25;
		const f = parseFloat(inputFactor.value) || 0.1;
		inputWidth.value = Math.round(originalImageSize.width * f);
		inputHeight.value = Math.round(originalImageSize.height * f);
		disableImageSizeProp(false, false);
	}
	curResizeMode = nextResizeMode;
	document.getElementById("canvas-res").textContent =
		`Size: ${inputWidth.value} x ${inputHeight.value} px`;
}

document.querySelectorAll('input[name="resize"], #factor').forEach((el) => {
	el.addEventListener("change", updateCalculatedDimensions);
	el.addEventListener("input", updateCalculatedDimensions);
});

inputWidth.addEventListener("input", function () {
	if (inputRatio.checked && originalImageSize.width > 0) {
		inputHeight.value = Math.round(
			(originalImageSize.height * (parseInt(this.value) || 1)) /
				originalImageSize.width,
		);
	}
	document.getElementById("canvas-res").textContent =
		`Size: ${inputWidth.value} x ${inputHeight.value} px`;
});
inputHeight.addEventListener("input", function () {
	if (inputRatio.checked && originalImageSize.height > 0) {
		inputWidth.value = Math.round(
			(originalImageSize.width * (parseInt(this.value) || 1)) /
				originalImageSize.height,
		);
	}
	document.getElementById("canvas-res").textContent =
		`Size: ${inputWidth.value} x ${inputHeight.value} px`;
});

// ============================================================
//  MAIN CONVERSION
// ============================================================
parametersForm.addEventListener("submit", async function (e) {
	e.preventDefault();
	if (runButton.disabled) return;

	try {
		const img = document.querySelector(
			"#original-preview-zone img, #original-preview-zone canvas",
		);
		if (!img) return;

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		canvasName = `pic2pa-${timestamp}${animFrames.length ? '.gif' : '.png'}`;
		processedAnimation = null;
		parseCurrentPalette();

		const w = parseInt(inputWidth.value) || 16;
		const h = parseInt(inputHeight.value) || 16;
		const progressInterval = 1 + (Math.sqrt(h + w) * (h / w)) | 0;
		canvas.width = w;
		canvas.height = h;

		setButtonState("processing");
		runButton.textContent = "Converting...";
		textarea.value = "Executing conversion pipeline, please wait...";
		asciiOutputTA.value = "";

		// Handle animation frames
		if (animFrames.length > 0) {
			await processAnimation(w, h);
			setButtonState("done");
			if (stopTextProcessingFlag) {
				statusDiv.textContent = "Text output generation stopped by user.";
			} else {
				statusDiv.textContent = `Success: Animation conversion completed!`;
			}
			return;
		}

		// Static image conversion
		ctx.globalCompositeOperation = "copy";
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(img, 0, 0, w, h);
		ctx.globalCompositeOperation = "source-over";
		const imgData = ctx.getImageData(0, 0, w, h);
		ctx.clearRect(0, 0, w, h);
		const outImgData = ctx.createImageData(w, h);

		const engine = engineSelect.value;
		let result;
		// alphaColor only takes effect when the source image itself has
		// transparency — see matrixcl.js runConversionPipeline / matrixgl.js runGLPipeline.
		const hasAlpha = imageDataHasAlpha(imgData.data);
		if (engine === "gpu") {
			result = await runGLPipeline({
				canvas,
				data: imgData.data,
				w,
				h,
				mode: modeSelect.value,
				rgbPalette,
				outImgData,
				hasAlpha,
				onProgress: async (pct) => {
					runButton.textContent = `Converting... ${pct}%`;
					statusDiv.textContent = `Processing GPU pipeline... ${pct}%`;
					await new Promise((resolve) =>
						requestAnimationFrame(resolve),
					);
				},
			});
			ctx.putImageData(outImgData, 0, 0);
		} else {
			result = await runCPUPipelineFallback(imgData, w, h, outImgData, hasAlpha);
		}
		setButtonState("almost");

		// Progressive textarea output: append line by line
		await progressiveTextOutput(result.hexString, progressInterval);

		lastIndexMap = result.indexMap;
		lastW = w;
		lastH = h;

		if (asciiEnableCheck.checked) {
			const asciiCols = parseInt(asciiWidthInput.value) || 80;
			const charsetKey = asciiCharsetSelect.value;
			asciiOutputTA.value = exportAscii(
				lastIndexMap,
				lastW,
				lastH,
				rgbPalette,
				charsetKey,
				asciiCols,
			);
			addToSessionLog(
				"ASCII",
				`ASCII output generated (${asciiCols} cols, charset: ${charsetKey}).`,
			);
		}

		setButtonState("done");
		if (stopTextProcessingFlag) {
			statusDiv.textContent = "Text output generation stopped by user.";
		} else {
			statusDiv.textContent = `Success: Conversion completed successfully!`;
		}
	} catch (pipelineErr) {
		setButtonState("imageLoaded");
		displayErrorPopup(
			"Pipeline Processing Fatal Exception",
			pipelineErr.message,
			pipelineErr.stack,
		);
	}
});

// Progressive output: show result line by line in textarea
async function progressiveTextOutput(fullString, progressInterval) {
	isTextProcessing = true;
	stopTextProcessingFlag = false;
	const lines = fullString.split("\n");
	const totalLines = lines.length;
	textarea.value = "";
	let curstring = "";
	let resultString = "";
	for (let i = 0; i < totalLines; i++) {
		if (stopTextProcessingFlag) {
			if (i < totalLines) {
				resultString += lines.slice(i).join("\n");
			}
			curstring = resultString;
			break;
		}
		resultString += lines[i] + (i < totalLines - 1 ? "\n" : "");
		if (i % (progressInterval | 0) === 0 || i === totalLines - 1) {
			curstring = resultString;
			//textarea.scrollTop = textarea.scrollHeight;
			const pct = ((i + 1) * 100 / totalLines).toFixed(4);
			statusDiv.textContent = `Converting to text output... ${pct}%`;
			textarea.value = statusDiv.textContent;
			runButton.textContent = `Converting... ${pct}%`;
			await new Promise((r) => setTimeout(r, 0));
		}
	}
	textarea.value = curstring;
	isTextProcessing = false;
	copyButton.textContent = "Copy to Clipboard";
}

async function processAnimation(w, h) {
	const allResults = [];
	const outputFrames = [];
	const engine = engineSelect.value;
	for (let index = 0; index < animFrames.length; index += 1) {
		const frame = animFrames[index];
		ctx.globalCompositeOperation = 'copy';
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(frame.image, 0, 0, w, h);
		ctx.globalCompositeOperation = 'source-over';
		const imgData = ctx.getImageData(0, 0, w, h);
		const outImgData = ctx.createImageData(w, h);
		const hasAlpha = imageDataHasAlpha(imgData.data);
		const result = engine === 'gpu'
			? await runGLPipeline({ canvas, data: imgData.data, w, h, mode: modeSelect.value, rgbPalette, outImgData, hasAlpha, onProgress: async () => {} })
			: await runCPUPipelineFallback(imgData, w, h, outImgData, hasAlpha);
		allResults.push(result.hexString);
		outputFrames.push({
			indexMap: new Uint8Array(result.indexMap),
			delay: frame.delay,
			width: w,
			height: h,
		});
		ctx.putImageData(outImgData, 0, 0);
		runButton.textContent = `Converting frame ${index + 1}/${animFrames.length}...`;
		statusDiv.textContent = `Processing frame ${index + 1} of ${animFrames.length}...`;
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
	processedAnimation = {
		mimeType: 'image/gif',
		width: w,
		height: h,
		frames: outputFrames,
		repeat: animFrames.repeat ?? 0,
	};
	setButtonState('almost');
	await progressiveTextOutput(`[\n${allResults.join(',\n')}\n]`);
}

// True if any pixel in this ImageData has partial/zero alpha — i.e. the
// source image actually has a transparent background, not just a fully
// opaque photo/JPEG. Used to decide whether alphaColor is honored.
function imageDataHasAlpha(data) {
	for (let i = 3; i < data.length; i += 4) {
		if (data[i] < 255) return true;
	}
	return false;
}

async function runCPUPipelineFallback(imgData, w, h, outImgData, hasAlpha = imageDataHasAlpha(imgData.data)) {
	return runConversionPipeline({
		data: imgData.data,
		w,
		h,
		mode: modeSelect.value,
		subPixelOption: subpixelSelect.value,
		rgbPalette,
		outImgData,
		hasAlpha,
		onProgress: async (progressPercent) => {
			ctx.putImageData(outImgData, 0, 0);
			runButton.textContent = `Converting... ${progressPercent}%`;
			statusDiv.textContent = `Processing CPU pipeline... ${progressPercent}%`;
			await new Promise((resolve) => requestAnimationFrame(resolve));
		},
	});
}

// ---- COPY BUTTON ----
copyButton.addEventListener("click", function (e) {
	e.preventDefault();
	if (isTextProcessing) {
		stopTextProcessingFlag = true;
		return;
	}
	try {
		const activePanel = document.querySelector(".tab-panel.active");
		const ta = activePanel.querySelector("textarea");
		ta.select();
		if (!document.execCommand("copy")) throw new Error("Denied copy.");
		copyButton.textContent = "Copied!";
		setTimeout(() => {
			copyButton.textContent = "Copy to Clipboard";
		}, 2000);
	} catch (copyErr) {
		displayErrorPopup(
			"Clipboard Copy Exception",
			"Unable to copy to clipboard.",
			copyErr.message,
		);
	}
});

// ---- DOWNLOAD BUTTON ----
function writeGifWord(bytes, value) {
	bytes.push(value & 255, (value >> 8) & 255);
}

function encodeGifLzw(indices, minimumCodeSize) {
	// Emit literal palette indices with a clear code before each index. This
	// deliberately keeps the code width constant and avoids malformed streams
	// caused by encoder/decoder dictionary-width drift on large frames.
	const clear = 1 << minimumCodeSize;
	const end = clear + 1;
	const codeSize = minimumCodeSize + 1;
	let bitBuffer = 0;
	let bitCount = 0;
	const output = [];
	const writeCode = (code) => {
		bitBuffer |= code << bitCount;
		bitCount += codeSize;
		while (bitCount >= 8) {
			output.push(bitBuffer & 255);
			bitBuffer >>= 8;
			bitCount -= 8;
		}
	};
	writeCode(clear);
	for (const index of indices) {
		writeCode(index);
		writeCode(clear);
	}
	writeCode(end);
	if (bitCount) output.push(bitBuffer & 255);
	return output;
}

function paletteIndexData(frame, palette) {
	const indices = new Uint8Array(frame.width * frame.height);
	const cache = new Map();
	for (let pixel = 0; pixel < indices.length; pixel += 1) {
		const offset = pixel * 4;
		if (frame.data[offset + 3] < 128) {
			indices[pixel] = 0;
			continue;
		}
		const key = (frame.data[offset] << 16) | (frame.data[offset + 1] << 8) | frame.data[offset + 2];
		let best = cache.get(key);
		if (best === undefined) {
			best = 1;
			let score = Infinity;
			for (let index = 1; index < palette.length; index += 1) {
				const color = palette[index];
				const dr = frame.data[offset] - color.r;
				const dg = frame.data[offset + 1] - color.g;
				const db = frame.data[offset + 2] - color.b;
				const current = dr * dr + dg * dg + db * db;
				if (current < score) { score = current; best = index; }
			}
			cache.set(key, best);
		}
		indices[pixel] = best;
	}
	return indices;
}

function encodeAnimatedGif(animation) {
	const palette = rgbPalette.slice(0, 256);
	if (!palette.length || palette[0].a !== 0) palette.unshift({ r: 0, g: 0, b: 0, a: 0 });
	const tableSize = Math.max(2, 2 ** Math.ceil(Math.log2(palette.length)));
	while (palette.length < tableSize) palette.push({ r: 0, g: 0, b: 0, a: 0 });
	const minimumCodeSize = Math.max(2, Math.ceil(Math.log2(tableSize)));
	const bytes = [...'GIF89a'].map((char) => char.charCodeAt(0));
	writeGifWord(bytes, animation.width); writeGifWord(bytes, animation.height);
	const colorResolution = 0x70;
	bytes.push(0x80 | colorResolution | (minimumCodeSize - 1), 0, 0);
	for (const color of palette) bytes.push(color.r, color.g, color.b);
	for (const frame of animation.frames) {
		const indices = frame.indexMap || paletteIndexData(frame, palette);
		const delay = Math.min(65535, Math.max(1, Math.round(frame.delay / 10)));
		bytes.push(0x21, 0xf9, 0x04, 0x01); writeGifWord(bytes, delay); bytes.push(0, 0);
		bytes.push(0x2c); writeGifWord(bytes, 0); writeGifWord(bytes, 0); writeGifWord(bytes, animation.width); writeGifWord(bytes, animation.height); bytes.push(0);
		const compressed = encodeGifLzw(indices, minimumCodeSize);
		bytes.push(minimumCodeSize);
		for (let offset = 0; offset < compressed.length; offset += 255) {
			const block = compressed.slice(offset, offset + 255);
			bytes.push(block.length, ...block);
		}
		bytes.push(0);
	}
	bytes.push(0x3b);
	return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url; link.download = filename; link.click();
	setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 0);
}

downloadButton.addEventListener('click', async function (e) {
	e.preventDefault();
	try {
		if (processedAnimation?.frames?.length) {
			downloadBlob(encodeAnimatedGif(processedAnimation), canvasName.replace(/\.[^.]+$/, '.gif'));
			addToSessionLog('IO', `Downloaded processed animation (${processedAnimation.frames.length} frames).`);
			return;
		}
		const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Canvas export returned no data.')), 'image/png'));
		downloadBlob(blob, canvasName.replace(/\.[^.]+$/, '.png'));
	} catch (error) {
		displayErrorPopup('IO Canvas Download Error', error.message, error.stack);
	}
});

// ---- HIDE LOADING SCREEN WHEN DOM READY ----
window.addEventListener("DOMContentLoaded", () => {
	loaded = true;
	const loader = document.getElementById("page-loader");
	if (loader) {
		// Give a small delay so the user sees the loader on fast connections
		setTimeout(() => {
			loader.classList.add("hidden");
		}, 400);
	}
});
