// Modular imports: CPU engine, GPU engine, animation processor

//import { runConversionPipeline, exportAscii } from "./matrixcl.js";
//import { runGLPipeline } from "./matrixgl.js";
//import { decodeAnimation, isAnimatedFormat } from "./animproc.js";

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
function revokeOutputObjectUrl() {
	if (outputObjectUrl) URL.revokeObjectURL(outputObjectUrl);
	outputObjectUrl = null;
}

function setOutputBlob(blob) {
	if (!outputImage || !blob) return;
	revokeOutputObjectUrl();
	outputBlob = blob;
	outputObjectUrl = URL.createObjectURL(blob);
	outputImage.src = outputObjectUrl;
	outputImage.style.display = 'block';
	outputImage.style.visibility = 'visible';
	outputImage.setAttribute('aria-hidden', 'false');
}

function resetLoadedState() {
	textarea.value = '';
	asciiOutputTA.value = '';
	lastIndexMap = null;
	animSource = null;
	processedAnimation = null;
	outputBlob = null;
	revokeOutputObjectUrl();
	if (outputImage) {
		outputImage.removeAttribute('src');
		outputImage.style.display = 'block';
		outputImage.style.visibility = 'hidden';
		outputImage.setAttribute('aria-hidden', 'true');
	}
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

function sourceExtensionOf(file) {
	const match = String(file.name || '').match(/\.([^.]+)$/);
	return (match ? match[1] : '').toLowerCase() || ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/apng': 'apng', 'video/webm': 'webm' }[file.type] || 'png');
}

function sourceMime(file) {
	const extension = sourceExtensionOf(file);
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
		statusDiv.textContent = `Invalid: "${file.name}" is not a supported image or WebM file.`;
		return;
	}
	statusDiv.textContent = `System: Loading asset of "${file.name}".`;
	originalMimeType = mime;
	sourceExtension = sourceExtensionOf(file);
	canvasLastName = `.${sourceExtension}`;
	uploadedFileBuffer = await file.arrayBuffer();
	try {
		const animated = mime === 'video/webm' || isAnimatedBuffer(uploadedFileBuffer, mime);
		if (animated) {
			const source = await decodeAnimation(uploadedFileBuffer, mime);
			const inspection = await inspectAnimationSource(source);
			if (!inspection.first) throw new Error('No decodable animation frames were found.');
			const preview = canvasPreviewImage(inspection.first.image);
			const frameCount = inspection.frameCount || source.frameCount || 0;
			if (inspection.visuallyStatic) {
				animSource = null;
				showLoadedPreview(preview, inspection.first.width, inspection.first.height);
				uploadedFileBuffer = null;
				statusDiv.textContent = `Ready: "${file.name}" Loaded as a static image.`;
				addToSessionLog('IMAGE', `Loaded "${mime}" as static output (${frameCount || 1} visually identical frame(s)).`);
			} else {
				animSource = source;
				showLoadedPreview(preview, inspection.first.width, inspection.first.height, frameCount);
				statusDiv.textContent = `Ready: "${file.name}" Loaded (${frameCount ? `${frameCount} ` : ''}frame${frameCount === 1 ? '' : 's'}).`;
				addToSessionLog('ANIM', `Loaded "${mime}" as a streaming animation source${frameCount ? ` with ${frameCount} frame(s)` : ''}.`);
			}
			releaseFrame(inspection.first);
		} else {
			const url = URL.createObjectURL(file);
			const image = new Image();
			image.onload = () => {
				URL.revokeObjectURL(url);
				showLoadedPreview(image, image.naturalWidth, image.naturalHeight);
				statusDiv.textContent = `Ready: "${file.name}" Loaded Successfully.`;
				addToSessionLog('IMAGE', `Loaded "${mime}" source image.`);
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

function canvasPreviewImage(source) {
	if (!(source instanceof HTMLCanvasElement)) return source;
	const image = new Image();
	image.alt = 'Original image preview';
	image.src = source.toDataURL('image/png');
	return image;
}

async function inspectAnimationSource(source) {
	const stream = await source.open();
	if (!stream) return { first: null, frameCount: 0, visuallyStatic: false };
	let first = null;
	let reference = null;
	let frameCount = 0;
	let visuallyStatic = true;
	for await (const frame of stream) {
		frameCount += 1;
		if (!first) {
			first = frame;
			reference = frame.image.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, frame.width, frame.height).data;
			continue;
		}
		if (frame.width !== first.width || frame.height !== first.height) visuallyStatic = false;
		if (visuallyStatic) {
			const data = frame.image.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, frame.width, frame.height).data;
			if (data.length !== reference.length) visuallyStatic = false;
			else for (let pixel = 0; pixel < data.length; pixel += 1) {
				if (data[pixel] !== reference[pixel]) {
					visuallyStatic = false;
					break;
				}
			}
		}
		releaseFrame(frame);
	}
	return { first, frameCount, visuallyStatic };
}

function fileStem() {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	return `pic2pa-${timestamp}`;
}

function canvasToBlob(targetCanvas, mimeType = 'image/png', quality) {
	return new Promise((resolve, reject) => {
		if (targetCanvas.toBlob) {
			targetCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas export returned no data.')), mimeType, quality);
			return;
		}
		try {
			const dataUrl = targetCanvas.toDataURL(mimeType, quality);
			const [header, body] = dataUrl.split(',');
			const binary = atob(body);
			const bytes = new Uint8Array(binary.length);
			for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
			resolve(new Blob([bytes], { type: header.match(/data:([^;]+)/)?.[1] || mimeType }));
		} catch (error) { reject(error); }
	});
}

const OUTPUT_MIME_TYPES = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', jpe: 'image/jpeg', bmp: 'image/bmp', gif: 'image/gif', webp: 'image/webp', apng: 'image/apng' });

function outputMimeForExtension(extension) {
	return OUTPUT_MIME_TYPES[extension] || '';
}

function assertBlobType(blob, expectedType, extension) {
	if (!blob || (expectedType && blob.type && blob.type.toLowerCase() !== expectedType)) throw new Error(`This browser could not produce a valid ${extension.toUpperCase()} output.`);
	return blob;
}

async function encodeStaticOutput(result, width, height) {
	if (sourceExtension === 'jxl' || sourceExtension === 'webm') throw new Error(`This browser cannot encode processed ${sourceExtension.toUpperCase()} output without changing the requested extension.`);
	if (sourceExtension === 'gif') return encodeAnimatedGif({ width, height, frames: [{ indexMap: result.indexMap, width, height, rect: { x: 0, y: 0, width, height }, delay: 100, disposal: 0 }], repeat: null });
	if (sourceExtension === 'bmp') return encodeBmpFromCanvas(canvas);
	if (sourceExtension === 'apng') {
		const writer = createApngStreamWriter({ width, height, frameCount: 1, repeat: null });
		writer.add({ indexMap: result.indexMap, rect: { x: 0, y: 0, width, height }, delay: 100, disposal: 0, changedOnly: false });
		return writer.finish();
	}
	const mime = outputMimeForExtension(sourceExtension) || 'image/png';
	return assertBlobType(await canvasToBlob(canvas, mime), mime, sourceExtension);
}

function releaseFrame(frame) {
	if (frame?.image instanceof HTMLCanvasElement) {
		frame.image.width = 0;
		frame.image.height = 0;
		frame.image = null;
	}
}

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
	textarea.value = "";

	try {
		const img = document.querySelector(
			"#original-preview-zone img, #original-preview-zone canvas",
		);
		if (!img) return;

		canvasName = `${fileStem()}.${sourceExtension}`;
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
		if (animSource) {
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
		const asciiCols = parseInt(asciiWidthInput.value) || 80;
		const textOutput = createProcessedTextOutput(w, h, asciiEnableCheck.checked, asciiCols);
		textOutput.startStatic();
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
				onRow: textOutput.onRow,
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
			result = await runCPUPipelineFallback(imgData, w, h, outImgData, null, hasAlpha, textOutput.onRow);
		}
		ctx.putImageData(outImgData, 0, 0);
		await textOutput.finishStatic();
		setButtonState("almost");

		lastIndexMap = result.indexMap;
		lastW = w;
		lastH = h;

		if (asciiEnableCheck.checked) {
			addToSessionLog(
				"ASCII",
				`ASCII output generated during image processing (${asciiCols} cols, charset: ${asciiCharsetSelect.value}).`,
			);
		}

		setButtonState("done");
			outputBlob = await encodeStaticOutput(result, w, h);
		setOutputBlob(outputBlob);
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

// Streaming output writers: each logical output line is inserted separately.
function createLineWriter(target) {
	let lineCount = 0;
	const insert = (text) => {
		if (typeof target.setRangeText === "function") {
			const end = target.value.length;
			target.setRangeText(text, end, end, "end");
		} else {
			target.value = target.value + text;
		}
	};
	return {
		reset(value = "") {
			target.value = value;
			lineCount = value ? String(value).split(/\r\n|\r|\n/).length : 0;
		},
		appendLine(line) {
			const safeLine = String(line ?? "").replace(/[\r\n]+/g, "");
			if (lineCount) insert("\n");
			insert(safeLine);
			lineCount += 1;
		},
	};
}

function createAsciiRowStream(width, height, writer, enabled, asciiCols) {
	if (!enabled) return { beginFrame() {}, async onSourceRow() {}, finish() {} };
	const columns = Math.max(1, Math.min(asciiCols, width));
	const charWidth = width / columns;
	const charHeight = charWidth * 2;
	const rowCount = Math.max(1, Math.round(height / charHeight));
	let nextRow = 0;
	let latestIndexMap = null;
	return {
		beginFrame(label) {
			nextRow = 0;
			latestIndexMap = null;
			if (label) writer.appendLine(label);
		},
		async onSourceRow(sourceRow, indexMap) {
			latestIndexMap = indexMap;
			while (nextRow < rowCount) {
				const rowEnd = Math.min(height, Math.ceil((nextRow + 1) * charHeight));
				if (sourceRow + 1 < rowEnd) break;
				writer.appendLine(buildAsciiLine(nextRow, width, height, indexMap, rgbPalette, asciiCharsetSelect.value, columns));
				nextRow += 1;
			}
		},
		finish() {
			while (nextRow < rowCount) {
				writer.appendLine(buildAsciiLine(nextRow, width, height, latestIndexMap || new Uint8Array(width * height), rgbPalette, asciiCharsetSelect.value, columns));
				nextRow += 1;
			}
		},
	};
}

async function yieldOutputFrame() {
	await new Promise((resolve) => {
		if (typeof requestAnimationFrame === "function") requestAnimationFrame(resolve);
		else setTimeout(resolve, 0);
	});
}

function createProcessedTextOutput(width, height, asciiEnabled, asciiCols) {
	const makecodeWriter = createLineWriter(textarea);
	const asciiWriter = createLineWriter(asciiOutputTA);
	const asciiRows = createAsciiRowStream(width, height, asciiWriter, asciiEnabled, asciiCols);
	let rowsSinceYield = 0;
	return {
		startStatic() {
			makecodeWriter.reset();
			asciiWriter.reset();
			makecodeWriter.appendLine("img`");
			asciiRows.beginFrame();
			rowsSinceYield = 0;
		},
		startAnimation() {
			makecodeWriter.reset("[");
			asciiWriter.reset();
			rowsSinceYield = 0;
		},
		beginFrame(frameIndex, frameCount) {
			if (frameIndex > 1) {
				makecodeWriter.appendLine(",");
				if (asciiEnabled) asciiWriter.appendLine("");
			}
			makecodeWriter.appendLine("img`");
			asciiRows.beginFrame(`Frame ${frameIndex}${frameCount ? `/${frameCount}` : ""}:`);
			rowsSinceYield = 0;
		},
		async onRow(rowIndex, rowString, indexMap) {
			makecodeWriter.appendLine(rowString);
			await asciiRows.onSourceRow(rowIndex, indexMap);
			rowsSinceYield += 1;
			if (rowsSinceYield >= 16) {
				rowsSinceYield = 0;
				await yieldOutputFrame();
			}
		},
		finishStatic() {
			makecodeWriter.appendLine("`");
			asciiRows.finish();
		},
		finishFrame() {
			makecodeWriter.appendLine("`");
			asciiRows.finish();
		},
		finishAnimation() {
			makecodeWriter.appendLine("]");
		},
	};
}

async function processAnimation(w, h) {
	const source = animSource;
	const stream = await source.open();
	if (!stream) throw new Error('Unable to open animation frame stream.');
	const repeat = source.repeat ?? stream.repeat ?? null;
	const frameCount = source.frameCount || stream.frameCount || 0;
	const writer = createAnimatedOutputWriter(sourceExtension, { width: w, height: h, repeat, frameCount });
	const engine = engineSelect.value;
	const asciiCols = parseInt(asciiWidthInput.value) || 80;
	const textOutput = createProcessedTextOutput(w, h, asciiEnableCheck.checked, asciiCols);
	textOutput.startAnimation();
	let previousIndexMap = null;
	let index = 0;
	for await (const frame of stream) {
		const frameNumber = index + 1;
		const totalLabel = frameCount ? `/${frameCount}` : '';
		textOutput.beginFrame(frameNumber, frameCount);
		ctx.globalCompositeOperation = 'copy';
		ctx.clearRect(0, 0, w, h);
		// Animation decoders yield a composited screen. This preserves the
		// latest frame when the source frame is a delta/overlay rectangle.
		ctx.drawImage(frame.image, 0, 0, w, h);
		ctx.globalCompositeOperation = 'source-over';
		const imgData = ctx.getImageData(0, 0, w, h);
		const outImgData = ctx.createImageData(w, h);
		const hasAlpha = imageDataHasAlpha(imgData.data);
		const onRow = textOutput.onRow;
		const result = engine === 'gpu'
			? await runGLPipeline({ canvas, data: imgData.data, w, h, mode: modeSelect.value, rgbPalette, outImgData, hasAlpha, onRow, onProgress: async (pct) => {
				runButton.textContent = `Converting frame ${frameNumber}${totalLabel}: ${pct}%`;
				statusDiv.textContent = `Processing frame ${frameNumber}${totalLabel}: ${pct}%`;
				await yieldOutputFrame();
			} })
			: await runCPUPipelineFallback(imgData, w, h, outImgData, `Frame: ${frameNumber}${totalLabel}`, hasAlpha, onRow);
		const fullIndexMap = result.indexMap instanceof Uint8Array ? result.indexMap : new Uint8Array(result.indexMap);
		const delta = makeOutputDelta(fullIndexMap, previousIndexMap, w, h, frame);
		previousIndexMap = fullIndexMap;
		ctx.putImageData(outImgData, 0, 0);
		await writer.add({ ...delta, delay: frame.delay, disposal: frame.disposal ?? 0, compositionMode: delta.changedOnly ? 'overlay' : 'replace' });
		await textOutput.finishFrame();
		index += 1;
		runButton.textContent = `Converting frame ${index}${totalLabel}...`;
		statusDiv.textContent = `Processing frame ${index}${totalLabel}...`;
		releaseFrame(frame);
		await yieldOutputFrame();
	}
	if (!index) throw new Error('Animation stream returned no frames.');
	textOutput.finishAnimation();
	processedAnimation = {
		mimeType: originalMimeType,
		width: w,
		height: h,
		frameCount: index,
		repeat,
		streamed: true,
		asciiFrames: asciiEnableCheck.checked,
	};
	setOutputBlob(await writer.finish());
	setButtonState('almost');
	isTextProcessing = false;
	copyButton.textContent = 'Copy to Clipboard';
}

function makeOutputDelta(current, previous, width, height, sourceFrame) {
	if (!previous || !sourceFrame.changedOnly) return { indexMap: current, width, height, rect: { x: 0, y: 0, width, height }, changedOnly: false };
	const sourceWidth = sourceFrame.sourceWidth || sourceFrame.width || width;
	const sourceHeight = sourceFrame.sourceHeight || sourceFrame.height || height;
	const sourceRect = sourceFrame.rect || { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
	const scaleX = width / sourceWidth;
	const scaleY = height / sourceHeight;
	let left = Math.max(0, Math.floor(sourceRect.x * scaleX));
	let top = Math.max(0, Math.floor(sourceRect.y * scaleY));
	let right = Math.min(width, Math.ceil((sourceRect.x + sourceRect.width) * scaleX));
	let bottom = Math.min(height, Math.ceil((sourceRect.y + sourceRect.height) * scaleY));
	let found = false;
	for (let y = top; y < bottom; y += 1) {
		for (let x = left; x < right; x += 1) {
			const offset = y * width + x;
			if (current[offset] !== previous[offset]) {
				found = true;
				left = Math.min(left, x); right = Math.max(right, x + 1); top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
			}
		}
	}
	if (!found) { left = Math.max(0, Math.min(width - 1, Math.floor(sourceRect.x * scaleX))); top = Math.max(0, Math.min(height - 1, Math.floor(sourceRect.y * scaleY))); right = left + 1; bottom = top + 1; }
	const patch = new Uint8Array(Math.max(1, right - left) * Math.max(1, bottom - top));
	let target = 0;
	for (let y = top; y < bottom; y += 1) {
		for (let x = left; x < right; x += 1) {
			const offset = y * width + x;
			patch[target++] = current[offset] === previous[offset] ? 0 : current[offset];
		}
	}
	return { indexMap: patch, width: right - left, height: bottom - top, rect: { x: left, y: top, width: right - left, height: bottom - top }, changedOnly: true };
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

async function runCPUPipelineFallback(imgData, w, h, outImgData, exstatus, hasAlpha = imageDataHasAlpha(imgData.data), onRow) {
	return runConversionPipeline({
		data: imgData.data,
		w,
		h,
		mode: modeSelect.value,
		subPixelOption: subpixelSelect.value,
		rgbPalette,
		outImgData,
		hasAlpha,
		onRow,
		onProgress: async (progressPercent) => {
			ctx.putImageData(outImgData, 0, 0);
			runButton.textContent = `${exstatus?`${exstatus}, `:""}Converting... ${progressPercent}%`;
			statusDiv.textContent = `${exstatus?`${exstatus}, `:""}Processing CPU pipeline... ${progressPercent}%`;
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
	for (const index of indices) { writeCode(index); writeCode(clear); }
	writeCode(end);
	if (bitCount) output.push(bitBuffer & 255);
	return output;
}

function encodeAnimatedGif(animation) {
	const palette = rgbPalette.slice(0, 256).map((color) => ({ r: color.r, g: color.g, b: color.b, a: color.a }));
	if (!palette.length || palette[0].a !== 0) palette.unshift({ r: 0, g: 0, b: 0, a: 0 });
	const tableSize = Math.max(2, 2 ** Math.ceil(Math.log2(palette.length)));
	while (palette.length < tableSize) palette.push({ r: 0, g: 0, b: 0, a: 0 });
	const minimumCodeSize = Math.max(2, Math.ceil(Math.log2(tableSize)));
	const bytes = [...'GIF89a'].map((char) => char.charCodeAt(0));
	writeGifWord(bytes, animation.width); writeGifWord(bytes, animation.height);
	bytes.push(0x80 | 0x70 | (minimumCodeSize - 1), 0, 0);
	for (const color of palette) bytes.push(color.r, color.g, color.b);
	if (animation.repeat !== null && animation.repeat !== undefined) {
		bytes.push(0x21, 0xff, 0x0b);
		for (const char of 'NETSCAPE2.0') bytes.push(char.charCodeAt(0));
		bytes.push(0x03, 0x01, animation.repeat & 255, (animation.repeat >> 8) & 255, 0x00);
	}
	for (const frame of animation.frames) {
		const rect = frame.rect || { x: 0, y: 0, width: animation.width, height: animation.height };
		const indices = frame.indexMap || new Uint8Array(rect.width * rect.height);
		const delay = Math.min(65535, Math.max(1, Math.round((frame.delay || 100) / 10)));
		const disposal = Math.max(0, Math.min(7, frame.disposal | 0));
		bytes.push(0x21, 0xf9, 0x04, (disposal << 2) | 0x01);
		writeGifWord(bytes, delay); bytes.push(0, 0);
		bytes.push(0x2c); writeGifWord(bytes, rect.x); writeGifWord(bytes, rect.y); writeGifWord(bytes, rect.width); writeGifWord(bytes, rect.height); bytes.push(0);
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

function paletteForOutput() {
	const palette = rgbPalette.slice(0, 256).map((color) => ({ r: color.r, g: color.g, b: color.b, a: color.a }));
	if (!palette.length || palette[0].a !== 0) palette.unshift({ r: 0, g: 0, b: 0, a: 0 });
	return palette;
}

function createGifStreamWriter(animation) {
	const palette = paletteForOutput();
	const tableSize = Math.max(2, 2 ** Math.ceil(Math.log2(palette.length)));
	while (palette.length < tableSize) palette.push({ r: 0, g: 0, b: 0, a: 0 });
	const minimumCodeSize = Math.max(2, Math.ceil(Math.log2(tableSize)));
	const header = [...'GIF89a'].map((char) => char.charCodeAt(0));
	writeGifWord(header, animation.width);
	writeGifWord(header, animation.height);
	header.push(0x80 | 0x70 | (minimumCodeSize - 1), 0, 0);
	for (const color of palette) header.push(color.r, color.g, color.b);
	const parts = [new Uint8Array(header)];
	if (animation.repeat !== null && animation.repeat !== undefined) {
		const loop = [0x21, 0xff, 0x0b, ...'NETSCAPE2.0'.split('').map((char) => char.charCodeAt(0)), 0x03, 0x01, animation.repeat & 255, (animation.repeat >> 8) & 255, 0x00];
		parts.push(new Uint8Array(loop));
	}
	return {
		add(frame) {
			const rect = frame.rect || { x: 0, y: 0, width: animation.width, height: animation.height };
			const indices = frame.indexMap || new Uint8Array(rect.width * rect.height);
			const delay = Math.min(65535, Math.max(1, Math.round((frame.delay || 100) / 10)));
			const disposal = Math.max(0, Math.min(7, frame.disposal | 0));
			const bytes = [0x21, 0xf9, 0x04, (disposal << 2) | 0x01];
			writeGifWord(bytes, delay);
			bytes.push(0, 0, 0x2c);
			writeGifWord(bytes, rect.x);
			writeGifWord(bytes, rect.y);
			writeGifWord(bytes, rect.width);
			writeGifWord(bytes, rect.height);
			bytes.push(0);
			const compressed = encodeGifLzw(indices, minimumCodeSize);
			bytes.push(minimumCodeSize);
			for (let offset = 0; offset < compressed.length; offset += 255) {
				const block = compressed.slice(offset, offset + 255);
				bytes.push(block.length, ...block);
			}
			bytes.push(0);
			parts.push(new Uint8Array(bytes));
		},
		finish() {
			parts.push(new Uint8Array([0x3b]));
			return new Blob(parts, { type: 'image/gif' });
		},
	};
}

function crc32(bytes) {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
	const typeBytes = new Uint8Array([...type].map((char) => char.charCodeAt(0)));
	const body = new Uint8Array(typeBytes.length + data.length);
	body.set(typeBytes);
	body.set(data, typeBytes.length);
	const result = new Uint8Array(12 + data.length);
	const view = new DataView(result.buffer);
	view.setUint32(0, data.length);
	result.set(body, 4);
	view.setUint32(8 + data.length, crc32(body));
	return result;
}

function adler32(bytes) {
	let a = 1;
	let b = 0;
	for (const byte of bytes) {
		a = (a + byte) % 65521;
		b = (b + a) % 65521;
	}
	return ((b << 16) | a) >>> 0;
}

function zlibStore(bytes) {
	const parts = [new Uint8Array([0x78, 0x01])];
	for (let offset = 0; offset < bytes.length || offset === 0; offset += 65535) {
		const end = Math.min(bytes.length, offset + 65535);
		const length = end - offset;
		const block = new Uint8Array(5 + length);
		block[0] = end >= bytes.length ? 1 : 0;
		block[1] = length & 255;
		block[2] = (length >> 8) & 255;
		const inverse = (~length) & 0xffff;
		block[3] = inverse & 255;
		block[4] = inverse >> 8;
		block.set(bytes.subarray(offset, end), 5);
		parts.push(block);
		if (end >= bytes.length) break;
	}
	const checksum = new Uint8Array(4);
	new DataView(checksum.buffer).setUint32(0, adler32(bytes));
	parts.push(checksum);
	const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
	let target = 0;
	for (const part of parts) {
		result.set(part, target);
		target += part.length;
	}
	return result;
}

function pngIndexedFrame(indexMap, width, height) {
	const raw = new Uint8Array((width + 1) * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * (width + 1)] = 0;
		raw.set(indexMap.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
	}
	return zlibStore(raw);
}

function createApngStreamWriter(animation) {
	const palette = paletteForOutput();
	const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])];
	const ihdr = new Uint8Array(13);
	const ihdrView = new DataView(ihdr.buffer);
	ihdrView.setUint32(0, animation.width);
	ihdrView.setUint32(4, animation.height);
	ihdr[8] = 8;
	ihdr[9] = 3;
	parts.push(pngChunk('IHDR', ihdr));
	const plte = new Uint8Array(palette.length * 3);
	const trns = new Uint8Array(palette.length);
	palette.forEach((color, index) => {
		plte[index * 3] = color.r;
		plte[index * 3 + 1] = color.g;
		plte[index * 3 + 2] = color.b;
		trns[index] = color.a;
	});
	parts.push(pngChunk('PLTE', plte), pngChunk('tRNS', trns));
	const acTL = new Uint8Array(8);
	const acTLView = new DataView(acTL.buffer);
	acTLView.setUint32(0, animation.frameCount || 1);
	acTLView.setUint32(4, animation.repeat ?? 0);
	parts.push(pngChunk('acTL', acTL));
	let sequence = 0;
	let frameIndex = 0;
	return {
		add(frame) {
			const rect = frame.rect || { x: 0, y: 0, width: animation.width, height: animation.height };
			const control = new Uint8Array(26);
			const view = new DataView(control.buffer);
			view.setUint32(0, sequence++);
			view.setUint32(4, rect.width);
			view.setUint32(8, rect.height);
			view.setUint32(12, rect.x);
			view.setUint32(16, rect.y);
			const delay = Math.max(1, Math.round(frame.delay || 100));
			view.setUint16(20, Math.min(65535, delay));
			view.setUint16(22, 1000);
			control[24] = frame.disposal === 3 ? 2 : frame.disposal === 2 ? 1 : 0;
			control[25] = frame.changedOnly ? 1 : 0;
			parts.push(pngChunk('fcTL', control));
			const compressed = pngIndexedFrame(frame.indexMap || new Uint8Array(rect.width * rect.height), rect.width, rect.height);
			if (frameIndex === 0) parts.push(pngChunk('IDAT', compressed));
			else {
				const data = new Uint8Array(compressed.length + 4);
				new DataView(data.buffer).setUint32(0, sequence++);
				data.set(compressed, 4);
				parts.push(pngChunk('fdAT', data));
			}
			frameIndex += 1;
		},
		finish() {
			parts.push(pngChunk('IEND', new Uint8Array(0)));
			return new Blob(parts, { type: 'image/apng' });
		},
	};
}

function createWebmStreamWriter(animation) {
	if (!canvas.captureStream || typeof MediaRecorder === 'undefined') throw new Error('This browser cannot encode processed WebM output safely.');
	const capture = canvas.captureStream(0);
	const track = capture.getVideoTracks()[0];
	const mimeType = typeof MediaRecorder.isTypeSupported !== 'function' || MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : '';
	if (!mimeType) {
		capture.getTracks().forEach((item) => item.stop());
		throw new Error('This browser does not provide a WebM MediaRecorder.');
	}
	const chunks = [];
	const recorder = new MediaRecorder(capture, { mimeType, videoBitsPerSecond: 4_000_000 });
	const stopped = new Promise((resolve, reject) => {
		recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
		recorder.addEventListener('stop', resolve, { once: true });
		recorder.addEventListener('error', () => reject(new Error('WebM recording failed.')), { once: true });
	});
	recorder.start();
	return {
		async add(frame) {
			if (track.requestFrame) track.requestFrame();
			else await new Promise((resolve) => setTimeout(resolve, Math.max(10, frame.delay || 100)));
		},
		async finish() {
			if (recorder.state !== 'inactive') recorder.stop();
			await stopped;
			capture.getTracks().forEach((item) => item.stop());
			return new Blob(chunks, { type: mimeType });
		},
	};
}

function createAnimatedOutputWriter(extension, animation) {
	if (extension === 'gif') return createGifStreamWriter(animation);
	if (extension === 'apng' || extension === 'png') return createApngStreamWriter(animation);
	if (extension === 'webm') return createWebmStreamWriter(animation);
	throw new Error(`Animated ${extension.toUpperCase()} output cannot be encoded safely in this browser without changing the requested extension.`);
}

function encodeBmpFromCanvas(targetCanvas) {
	const width = targetCanvas.width;
	const height = targetCanvas.height;
	const pixels = targetCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height).data;
	const rowSize = Math.ceil((width * 3) / 4) * 4;
	const pixelSize = rowSize * height;
	const result = new Uint8Array(54 + pixelSize);
	const view = new DataView(result.buffer);
	result[0] = 0x42; result[1] = 0x4d;
	view.setUint32(2, result.length, true);
	view.setUint32(10, 54, true);
	view.setUint32(14, 40, true);
	view.setInt32(18, width, true);
	view.setInt32(22, -height, true);
	view.setUint16(26, 1, true);
	view.setUint16(28, 24, true);
	view.setUint32(34, pixelSize, true);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const source = (y * width + x) * 4;
			const target = 54 + y * rowSize + x * 3;
			result[target] = pixels[source + 2];
			result[target + 1] = pixels[source + 1];
			result[target + 2] = pixels[source];
		}
	}
	return new Blob([result], { type: 'image/bmp' });
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
		if (processedAnimation?.streamed) {
			if (!outputBlob) throw new Error('The streamed animation output is not ready.');
			downloadBlob(outputBlob, canvasName);
			addToSessionLog('IO', `Downloaded processed animation (${processedAnimation.frameCount} frames).`);
			return;
		}
		const blob = outputBlob || await encodeStaticOutput({ indexMap: lastIndexMap }, lastW, lastH);
		setOutputBlob(blob);
		downloadBlob(blob, canvasName);
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
