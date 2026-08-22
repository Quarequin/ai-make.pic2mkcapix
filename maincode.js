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
let isAnimating = false;
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

window.addEventListener("error", function (e) {
	const stackTrace = e.error ? e.error.stack : "No call stack available.";
	addToSessionLog("CRITICAL_ERROR", e.message, stackTrace);
	displayErrorPopup("Uncaught Runtime Exception", e.message, stackTrace);
});

function displayErrorPopup(type, message, stack) {
	document.getElementById("popup-err-type").textContent = type;
	document.getElementById("popup-err-message").textContent = message;
	document.getElementById("popup-err-stack").textContent =
		stack || "No call stack trace records.";
	const logPanel = document.getElementById("popup-err-stack");
	const toggleBtn = document.getElementById("btn-toggle-log");
	logPanel.style.display = "none";
	toggleBtn.textContent = "Show Full Log ▼";
	document.getElementById("notification-popup-overlay").style.display =
		"block";
}

function toggleErrorLog() {
	const logPanel = document.getElementById("popup-err-stack");
	const toggleBtn = document.getElementById("btn-toggle-log");
	const isHidden =
		logPanel.style.display === "none" || logPanel.style.display === "";
	logPanel.style.display = isHidden ? "block" : "none";
	toggleBtn.textContent = isHidden ? "Hide Full Log ▲" : "Show Full Log ▼";
}

function closeErrorPopup() {
	if (!loaded) window.location.reload();
	document.getElementById("notification-popup-overlay").style.display =
		"none";
}

document
	.getElementById("popup-close-btn")
	.addEventListener("click", closeErrorPopup);
document
	.getElementById("btn-toggle-log")
	.addEventListener("click", toggleErrorLog);

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
	"vedio/webm":"webm"
};

let originalImageSize = { width: 0, height: 0 };
let originalMimeType = "image/png";
let canvasName = "pic2pa.png";
let canvasLastName = ".png";
let rgbPalette = [];
let uploadedFileBuffer = null;
let isTextProcessing = false;
let stopTextProcessingFlag = false;

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
function setButtonState(state) {
	const states = {
		noImage: { run: true, copy: true, dl: true, copyText: "Copy to Clipboard", text: "Convert Image" },
		imageLoaded: {
			run: false,
			copy: true,
			dl: true,
			copyText: "Copy to Clipboard",
			text: "Convert Image",
		},
		processing: { run: true, copy: true, dl: true, copyText: "Copy to Clipboard", text: "Converting..." },
		almost: { run: true, copy: false, dl: false, copyText: "Stop Processing", text: "Almost There..." },
		done: { run: false, copy: false, dl: false, copyText: "Copy to Clipboard", text: "Convert Image" },
	};
	const current = states[state] || states.noImage;
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

paletteAddBtn.addEventListener("click", function () {
	const currentCount = colorpad.querySelectorAll(".color-pair").length;
	if (currentCount >= MAX_PALETTE_SLOTS) return;
	const newPair = document.createElement("div");
	newPair.className = "color-pair";
	newPair.innerHTML = `<label>Color ${currentCount + 1}</label><input type="color" value="#888888" /><input type="text" class="colortext" value="#888888" />`;
	colorpad.appendChild(newPair);
	bindColorPairEvents(newPair, currentCount);
	reindexColorPairs();
	makeCustomPaletteLabel();
	addToSessionLog("PALETTE", `Added color slot ${currentCount + 1}.`);
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
	while (colorpad.querySelectorAll(".color-pair").length > targetCount) {
		const pairs = colorpad.querySelectorAll(".color-pair");
		if (pairs.length <= MIN_PALETTE_SLOTS) break;
		colorpad.removeChild(pairs[pairs.length - 1]);
	}
	while (
		colorpad.querySelectorAll(".color-pair").length < targetCount &&
		colorpad.querySelectorAll(".color-pair").length < MAX_PALETTE_SLOTS
	) {
		const count = colorpad.querySelectorAll(".color-pair").length;
		const newPair = document.createElement("div");
		newPair.className = "color-pair";
		newPair.innerHTML = `<label>Color ${count + 1}</label><input type="color" value="#888888" /><input type="text" class="colortext" value="#888888" />`;
		colorpad.appendChild(newPair);
		bindColorPairEvents(newPair, count);
	}
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
				while (
					colorpad.querySelectorAll(".color-pair").length >
					colorsFound.length
				) {
					const pairs = colorpad.querySelectorAll(".color-pair");
					if (pairs.length <= MIN_PALETTE_SLOTS) break;
					colorpad.removeChild(pairs[pairs.length - 1]);
				}
				while (
					colorpad.querySelectorAll(".color-pair").length <
						colorsFound.length
				) {
					const count = colorpad.querySelectorAll(".color-pair").length;
					if (count >= MAX_PALETTE_SLOTS) break;
					const newPair = document.createElement("div");
					newPair.className = "color-pair";
					newPair.innerHTML = `<label>Color ${count + 1}</label><input type="color" value="#888888" /><input type="text" class="colortext" value="#888888" />`;
					colorpad.appendChild(newPair);
					bindColorPairEvents(newPair, count);
				}
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
fileInput.addEventListener("change", async function () {
	textarea.value = "";
	asciiOutputTA.value = "";
	lastIndexMap = null;
	animFrames = [];
	currentFrameIndex = 0;
	isAnimating = false;

	const file = fileInput.files[0];
	if (!file || (file && !predefinedFileMediaType[file.type])) {
		if (file) statusDiv.textContent = `Invalid: ${file.name} is not image file,
		try selecting image file like .png,.jpg,.bmp,.gif,etc.`;
		else statusDiv.textContent = `Invalid: No image file.
		try selecting image file like .png,.jpg,.bmp,.gif,etc.`;
		return setButtonState("noImage");
	}

	originalMimeType = file.type || "image/png";
	const lastDotIdx = file.name.lastIndexOf(".");
	canvasLastName =
		lastDotIdx !== -1 ? file.name.substring(lastDotIdx) : ".png";
	//if (canvasLastName.toLowerCase() === ".gif") canvasLastName = ".png";

	// Check if animated format
	if (isAnimatedFormat(originalMimeType)) {
		try {
			const buffer = await file.arrayBuffer();
			uploadedFileBuffer = buffer;
			animFrames = await decodeAnimation(buffer, originalMimeType);
			if (animFrames.length > 0) {
				const firstFrame = animFrames[0];
				originalImageSize = {
					width: firstFrame.width,
					height: firstFrame.height,
				};
				if (previewContainer) previewContainer.style.display = "block";
				document.getElementById("original-res").textContent =
					`Size: ${firstFrame.width} x ${firstFrame.height} px | Frames: ${animFrames.length}`;
				const zone = document.getElementById("original-preview-zone");
				zone.innerHTML = "";
				zone.appendChild(firstFrame.image);
				document
					.querySelectorAll("input[disabled]")
					.forEach((el) => el.removeAttribute("disabled"));
				setButtonState("imageLoaded");
				updateCalculatedDimensions();
				statusDiv.textContent = `Ready: ${file.name} Loaded (${animFrames.length} frames).`;
				addToSessionLog(
					"ANIM",
					`Loaded animated ${originalMimeType} with ${animFrames.length} frames.`,
				);
				canvas.width = inputWidth.value;
				canvas.height = inputHeight.value;
			}
		} catch (animErr) {
			displayErrorPopup(
				"Animation Decode Error",
				animErr.message,
				animErr.stack,
			);
			setButtonState("noImage");
		}
		return;
	}

	// Static image
	const reader = new FileReader();
	reader.onerror = () =>
		displayErrorPopup(
			"Image File IO Exception",
			"An error occurred while loading the source image file.",
			reader.error ? reader.error.message : "Unknown fault.",
		);
	reader.onload = function (e) {
		const img = new Image();
		img.onerror = () => {
			statusDiv.textContent = "Error: Failed to decode image asset.";
			displayErrorPopup(
				"Image Decoding Exception",
				"Unable to convert this file data into a complete image.",
				"The file may be corrupted.",
			);
		};
		img.onload = () => {
			if (previewContainer) previewContainer.style.display = "block";
			originalImageSize = {
				width: img.naturalWidth,
				height: img.naturalHeight,
			};
			document.getElementById("original-res").textContent =
				`Size: ${img.naturalWidth} x ${img.naturalHeight} px`;
			const zone = document.getElementById("original-preview-zone");
			zone.innerHTML = "";
			zone.appendChild(img);
			document
				.querySelectorAll("input[disabled]")
				.forEach((el) => el.removeAttribute("disabled"));
			setButtonState("imageLoaded");
			updateCalculatedDimensions();
			statusDiv.textContent = `Ready: ${file.name} Loaded Successfully.`;
			canvas.width = inputWidth.value;
			canvas.height = inputHeight.value;
		};
		img.src = e.target.result;
	};
	reader.readAsDataURL(file);
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
		inputWidth.value = Math.round(originalImageSize.width);
		inputHeight.value = Math.round(originalImageSize.height);
		disableImageSizeProp(true, true);
	} else if (document.getElementById("full-width").checked) {
		inputWidth.value = 160;
		inputHeight.value = Math.round(
			originalImageSize.height * (160 / originalImageSize.width),
		);
		disableImageSizeProp(true, false);
	} else if (document.getElementById("full-height").checked) {
		inputHeight.value = 120;
		inputWidth.value = Math.round(
			originalImageSize.width * (120 / originalImageSize.height),
		);
		disableImageSizeProp(true, false);
	} else if (document.getElementById("scale").checked) {
		const f = parseFloat(inputFactor.value) || 0.1;
		inputWidth.value = Math.round(originalImageSize.width * f);
		inputHeight.value = Math.round(originalImageSize.height * f);
		disableImageSizeProp(false, false);
	}
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

		canvasName = `pic2pa.${new Date()
			.toISOString()
			.replace(/:/g, "-")
			.replace(/\.\d{3}/, "")}${canvasLastName}`;
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
			result = await runCPUPipelineFallback(imgData, w, h, outImgData);
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

// Process animation frames
async function processAnimation(w, h) {
	const allResults = [];
	const totalFrames = animFrames.length;
	const engine = engineSelect.value;

	for (let f = 0; f < totalFrames; f++) {
		const frame = animFrames[f];
		ctx.globalCompositeOperation = "copy";
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(frame.image, 0, 0, w, h);
		ctx.globalCompositeOperation = "source-over";
		const imgData = ctx.getImageData(0, 0, w, h);
		const outImgData = ctx.createImageData(w, h);

		let result;
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
				onProgress: async () => {},
			});
		} else {
			result = await runCPUPipelineFallback(imgData, w, h, outImgData);
		}
		allResults.push(result.hexString);
		runButton.textContent = `Converting frame ${f + 1}/${totalFrames}...`;
		statusDiv.textContent = `Processing frame ${f + 1} of ${totalFrames}...`;
		await new Promise((r) => requestAnimationFrame(r));
	}
	setButtonState("almost");

	// Combine all frames
	const combined = "[\n" + allResults.join(",\n") + "\n]";
	await progressiveTextOutput(combined);
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

async function runCPUPipelineFallback(imgData, w, h, outImgData) {
	return await runConversionPipeline({
		data: imgData.data,
		w,
		h,
		mode: modeSelect.value,
		subPixelOption: subpixelSelect.value,
		rgbPalette,
		outImgData,
		hasAlpha: imageDataHasAlpha(imgData.data),
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
downloadButton.addEventListener("click", function (e) {
	e.preventDefault();
	try {
		const dataUrl = canvas.toDataURL(
			originalMimeType,
		);
		const link = document.createElement("a");
		link.href = dataUrl;
		link.download = canvasName;
		link.click();
		link.remove();
	} catch (dnErr) {
		displayErrorPopup(
			"IO Canvas Download Error",
			dnErr.message,
			dnErr.stack,
		);
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
