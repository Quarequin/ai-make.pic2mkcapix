function isValidHexRGB(e) {
	return /^#[0-9A-Fa-f]{8}$/.test(e) || /^#[0-9A-Fa-f]{6}$/.test(e) || /^#[0-9A-Fa-f]{3,4}$/.test(e);
}

function hexToRgba(e) {
	const t = e.replace("#", ""), a = e => parseInt(e, 16), n = e => e << 4 | e;
	if (3 === t.length || 4 === t.length) {
		const e = 4 === t.length ? n(a(t[3])) : 255;
		return {
			r: n(a(t[0])),
			g: n(a(t[1])),
			b: n(a(t[2])),
			a: e
		};
	}
	const i = 8 === t.length ? parseInt(t.substring(6, 8), 16) : 255;
	return {
		r: parseInt(t.substring(0, 2), 16),
		g: parseInt(t.substring(2, 4), 16),
		b: parseInt(t.substring(4, 6), 16),
		a: Number.isNaN(i) ? 255 : i
	};
}

function hexRgbOnly(e) {
	const {r: t, g: a, b: n} = hexToRgba(e), i = e => e.toString(16).padStart(2, "0");
	return `#${i(t)}${i(a)}${i(n)}`;
}

function addToSessionLog(e, t, a) {
	const n = `[${(new Date).toISOString().split("T")[1].substring(0, 8)}] [${e}] ${t}${a ? "\nDetail: " + a : ""}`;
	htmlLog.push(n), console.log(n);
}

function detectWebGL() {
	try {
		const e = document.createElement("canvas");
		return !!(e.getContext("webgl2") || e.getContext("webgl") || e.getContext("experimental-webgl"));
	} catch (e) {
		return !1;
	}
}

addToSessionLog("SYSTEM", "Application initialized successfully.");

const webglSupported = detectWebGL();

// These two strings are the authoritative output values. The textareas only
// contain a viewport projection with newline placeholders outside the view.
let makecodeStringOutput = "";
let asciiTtyStringOutput = "";

const outputViewStates = {
	makecode: {
		textarea,
		lineStarts: [],
		followTail: false,
		rendering: false
	},
	ascii: {
		textarea: asciiOutputTA,
		lineStarts: [],
		followTail: false,
		rendering: false
	}
};

function getOutputState(name) {
	return outputViewStates[name];
}

function getOutputString(name) {
	return "makecode" === name ? makecodeStringOutput : asciiTtyStringOutput;
}

function setOutputString(name, value) {
	if ("makecode" === name) {
		makecodeStringOutput = value;
	} else {
		asciiTtyStringOutput = value;
	}
}

function resetOutputString(name, initial = "") {
	const state = getOutputState(name);
	const value = String(initial);
	state.lineStarts.length = 0;
	setOutputString(name, value);
	if (value) {
		state.lineStarts.push(0);
		for (let cursor = value.indexOf("\n"); cursor >= 0; cursor = value.indexOf("\n", cursor + 1)) {
			state.lineStarts.push(cursor + 1);
		}
	}
}

function appendOutputLine(name, line) {
	const state = getOutputState(name);
	const cleanLine = String(line ?? "").replace(/[\r\n]+/g, "");
	let value = getOutputString(name);
	if (state.lineStarts.length) {
		value += "\n";
	}
	state.lineStarts.push(value.length);
	value += cleanLine;
	setOutputString(name, value);
}

function getOutputLineEnd(value, lineStart) {
	const newline = value.indexOf("\n", lineStart);
	return newline < 0 ? value.length : newline;
}

function getOutputViewportMetrics(textareaElement) {
	const style = getComputedStyle(textareaElement);
	const fontSize = parseFloat(style.fontSize) || 13;
	const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
	const height = textareaElement.clientHeight || 320;
	return {
		lineHeight,
		visibleLines: Math.max(1, Math.ceil(height / lineHeight) + 2)
	};
}

function renderOutputViewport(name) {
	const state = getOutputState(name);
	const textareaElement = state.textarea;
	const value = getOutputString(name);
	const totalLines = state.lineStarts.length;
	if (state.rendering) {
		return;
	}
	if (!totalLines) {
		state.rendering = true;
		textareaElement.value = "";
		textareaElement.scrollTop = 0;
		state.rendering = false;
		return;
	}
	const metrics = getOutputViewportMetrics(textareaElement);
	const previousScrollTop = textareaElement.scrollTop;
	const firstLine = state.followTail ? Math.max(0, totalLines - metrics.visibleLines) : Math.max(0, Math.floor(previousScrollTop / metrics.lineHeight) - 1);
	const lastLine = Math.min(totalLines, firstLine + metrics.visibleLines);
	const visibleParts = [];
	for (let line = firstLine; line < lastLine; line += 1) {
		const start = state.lineStarts[line];
		const end = getOutputLineEnd(value, start);
		visibleParts.push(value.slice(start, end));
	}
	const visibleText = visibleParts.join("\n");
	const renderedValue = "\n".repeat(firstLine) + visibleText + "\n".repeat(totalLines - lastLine);
	state.rendering = true;
	textareaElement.value = renderedValue;
	if (state.followTail) {
		textareaElement.scrollTop = textareaElement.scrollHeight;
	} else {
		const maxScrollTop = Math.max(0, textareaElement.scrollHeight - textareaElement.clientHeight);
		textareaElement.scrollTop = Math.min(previousScrollTop, maxScrollTop);
	}
	state.rendering = false;
}

function renderOutputViewports() {
	renderOutputViewport("makecode");
	renderOutputViewport("ascii");
}

function finishOutputViewports() {
	for (const name of ["makecode", "ascii"]) {
		const state = getOutputState(name);
		state.followTail = false;
		state.textarea.scrollTop = 0;
	}
	renderOutputViewports();
}

function createStringOutputWriter(name) {
	return {
		reset(initial = "") {
			resetOutputString(name, initial);
		},
		appendLine(line) {
			appendOutputLine(name, line);
		}
	};
}

for (const [name, state] of Object.entries(outputViewStates)) {
	state.textarea.addEventListener("scroll", () => {
		if (!state.rendering) {
			renderOutputViewport(name);
		}
	});
}

document.querySelectorAll(".tab-btn").forEach(button => {
	button.addEventListener("click", function() {
		document.querySelectorAll(".tab-btn").forEach(tab => tab.classList.remove("active"));
		document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
		this.classList.add("active");
		document.getElementById("tab-" + this.dataset.tab).classList.add("active");
		renderOutputViewports();
	});
});

asciiEnableCheck.addEventListener("change", function() {
	asciiSubOptions.style.display = this.checked ? "block" : "none";
	asciiTabBtn.disabled = !this.checked;
	if (!this.checked) {
		resetOutputString("ascii");
		renderOutputViewport("ascii");
		const asciiTab = document.querySelector('.tab-btn[data-tab="ascii"]');
		asciiTab && asciiTab.classList.contains("active") && document.querySelector('.tab-btn[data-tab="pixelart"]').click();
	}
	addToSessionLog("ASCII", `ASCII output ${this.checked ? "enabled" : "disabled"}.`);
});

if (!webglSupported) {
	const e = engineSelect.querySelector('option[value="gpu"]');
	e && (e.disabled = !0, e.textContent += " (Not Supported)"), addToSessionLog("SYSTEM", "WebGL not detected. GPU mode disabled.");
}

engineSelect.addEventListener("change", function() {
	if ("gpu" === this.value && !webglSupported) return displayErrorPopup("WebGL Not Supported", "Your browser or device does not support WebGL.", "The GPU processing engine requires WebGL. Falling back to CPU mode."), 
	void (this.value = "cpu");
	const e = "gpu" === this.value, t = document.getElementById("optgroup-error"), a = modeSelect.querySelector('option[value="error"]');
	e ? ("error" === modeSelect.value && (modeSelect.value = "solid"), t && (t.style.display = "none"), 
	a && (a.style.display = "none")) : (t && (t.style.display = "block"), a && (a.style.display = "block")), 
	addToSessionLog("ENGINE", `Switched to ${this.value.toUpperCase()} processing mode.`);
});

const BUTTON_STATES = Object.freeze({
	noImage: {
		run: !0,
		copy: !0,
		dl: !0,
		copyText: "Copy to Clipboard",
		text: "Convert Image"
	},
	imageLoaded: {
		run: !1,
		copy: !0,
		dl: !0,
		copyText: "Copy to Clipboard",
		text: "Convert Image"
	},
	processing: {
		run: !0,
		copy: !0,
		dl: !0,
		copyText: "Copy to Clipboard",
		text: "Converting..."
	},
	almost: {
		run: !0,
		copy: !1,
		dl: !1,
		copyText: "Stop Processing",
		text: "Almost There..."
	},
	done: {
		run: !1,
		copy: !1,
		dl: !1,
		copyText: "Copy to Clipboard",
		text: "Convert Image"
	}
});

function setButtonState(e) {
	const t = BUTTON_STATES[e] || BUTTON_STATES.noImage;
	runButton.disabled = t.run, copyButton.disabled = t.copy, downloadButton.disabled = t.dl, 
	copyButton.textContent = t.copyText, "processing" !== e && (runButton.textContent = t.text);
}

setButtonState("noImage");

const MIN_PALETTE_SLOTS = 2, MAX_PALETTE_SLOTS = 64;

function updatePaletteCountLabel() {
	const e = colorpad.querySelectorAll(".color-pair").length;
	paletteCountLbl.textContent = `Active Color Registers (1–${e}):`, paletteRemoveBtn.disabled = e <= 2, 
	paletteAddBtn.disabled = e >= 64;
}

function makeCustomPaletteLabel() {
	predefinedPaletteSelect.querySelector('option[value="custom"]').classList.remove("hidden"), 
	predefinedPaletteSelect.value = "custom";
}

function createPalettePair(e, t = "#888888") {
	const a = document.createElement("div");
	a.className = "color-pair";
	const n = document.createElement("label"), i = document.createElement("input"), o = document.createElement("input");
	return n.textContent = `Color ${e + 1}`, i.type = "color", i.value = hexRgbOnly(t), 
	o.type = "text", o.className = "colortext", o.value = t, a.append(n, i, o), colorpad.appendChild(a), 
	bindColorPairEvents(a, e), a;
}

function syncPaletteSize(e) {
	const t = Math.max(2, Math.min(64, e));
	for (;colorpad.querySelectorAll(".color-pair").length > t; ) colorpad.lastElementChild.remove();
	for (;colorpad.querySelectorAll(".color-pair").length < t; ) createPalettePair(colorpad.querySelectorAll(".color-pair").length);
	reindexColorPairs();
}

function bindColorPairEvents(e, t) {
	let a = "";
	try {
		a = predefinedPalettes[predefinedPaletteSelect.value][t + 1];
	} catch {
		a = "";
	}
	const n = e.querySelector('input[type="color"]'), i = e.querySelector(".colortext");
	void 0 === e.dataset.alpha && (e.dataset.alpha = String(hexToRgba(i.value).a)), 
	n.addEventListener("input", function() {
		e.dataset.alpha = "255", i.value = this.value;
	}), i.addEventListener("input", function() {
		let t = this.value.trim();
		t.startsWith("#") || (t = "#" + t), isValidHexRGB(t) && (n.value = hexRgbOnly(t), 
		e.dataset.alpha = String(hexToRgba(t).a), this.value = t, isValidHexRGB(a) && t !== a && makeCustomPaletteLabel());
	}), i.addEventListener("change", function() {
		let i = this.value.trim();
		i.startsWith("#") || (i = "#" + i), isValidHexRGB(i) ? (n.value = hexRgbOnly(i), 
		e.dataset.alpha = String(hexToRgba(i).a), this.value = i, addToSessionLog("PALETTE", `Color slot ${t + 1} updated to ${i}`), 
		isValidHexRGB(a) && i !== a && makeCustomPaletteLabel()) : (addToSessionLog("PALETTE_FAULT", `Invalid hex code typed: ${i}`), 
		displayErrorPopup("Invalid Color HEX Input", `The color code "${i}" is invalid.`, "Please use Hexadecimal format such as #FFF, #FFFF, #FFFFFF or #FFFFFFFF only."), 
		this.value = n.value);
	});
}

function reindexColorPairs() {
	colorpad.querySelectorAll(".color-pair").forEach((e, t) => {
		e.querySelector("label").textContent = `Color ${t + 1}`;
	}), updatePaletteCountLabel();
}

function parseCurrentPalette() {
	rgbPalette = [ {
		r: 0,
		g: 0,
		b: 0,
		a: 0
	} ].concat(Array.from(colorpad.querySelectorAll(".color-pair")).map(e => {
		const {r: t, g: a, b: n} = hexToRgba(e.querySelector('input[type="color"]').value), i = parseInt(e.dataset.alpha, 10);
		return {
			r: t,
			g: a,
			b: n,
			a: Number.isNaN(i) ? 255 : i
		};
	}));
}

function revokeOutputObjectUrl() {
	outputObjectUrl && URL.revokeObjectURL(outputObjectUrl), outputObjectUrl = null;
}

function setOutputBlob(e) {
	outputImage && e && (revokeOutputObjectUrl(), outputBlob = e, outputObjectUrl = URL.createObjectURL(e), 
	outputImage.src = outputObjectUrl, outputImage.style.display = "block", outputImage.style.visibility = "visible", 
	outputImage.setAttribute("aria-hidden", "false"));
}

function resetLoadedState() {
	resetOutputString("makecode");
	resetOutputString("ascii");
	makecodeStringOutput = "";
	asciiTtyStringOutput = "";
	renderOutputViewports();
	lastIndexMap = null;
	animSource = null;
	processedAnimation = null;
	outputBlob = null;
	revokeOutputObjectUrl();
	if (outputImage) {
		outputImage.removeAttribute("src");
		outputImage.style.display = "block";
		outputImage.style.visibility = "hidden";
		outputImage.setAttribute("aria-hidden", "true");
	}
	uploadedFileBuffer = null;
	setButtonState("noImage");
}

function showLoadedPreview(e, t, a, n = 0) {
	previewContainer && (previewContainer.style.display = "block"), document.getElementById("original-res").textContent = `Size: ${t} x ${a} px${n ? ` | Frames: ${n}` : ""}`, 
	document.getElementById("original-preview-zone").replaceChildren(e), document.querySelectorAll("input[disabled]").forEach(e => e.removeAttribute("disabled")), 
	originalImageSize = {
		width: t,
		height: a
	}, setButtonState("imageLoaded"), updateCalculatedDimensions();
}

function sourceExtensionOf(e) {
	const t = String(e.name || "").match(/\.([^.]+)$/);
	return (t ? t[1] : "").toLowerCase() || {
		"image/png": "png",
		"image/jpeg": "jpg",
		"image/gif": "gif",
		"image/webp": "webp",
		"image/apng": "apng",
		"video/webm": "webm"
	}[e.type] || "png";
}

function sourceMime(e) {
	const t = sourceExtensionOf(e);
	return e.type || {
		gif: "image/gif",
		apng: "image/apng",
		png: "image/png",
		webp: "image/webp",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		jpe: "image/jpeg",
		bmp: "image/bmp",
		jxl: "image/jxl",
		webm: "video/webm"
	}[t] || "";
}

function canvasPreviewImage(e) {
	if (!(e instanceof HTMLCanvasElement)) return e;
	const t = new Image;
	return t.alt = "Original image preview", t.src = e.toDataURL("image/png"), t;
}

async function inspectAnimationSource(e) {
	const t = await e.open();
	if (!t) return {
		first: null,
		frameCount: 0,
		visuallyStatic: !1
	};
	let a = null, n = null, i = 0, o = !0;
	for await (const e of t) if (i += 1, a) {
		if (e.width === a.width && e.height === a.height || (o = !1), o) {
			const t = e.image.getContext("2d", {
				willReadFrequently: !0
			}).getImageData(0, 0, e.width, e.height).data;
			if (t.length !== n.length) o = !1; else for (let e = 0; e < t.length; e += 1) if (t[e] !== n[e]) {
				o = !1;
				break;
			}
		}
		releaseFrame(e);
	} else a = e, n = e.image.getContext("2d", {
		willReadFrequently: !0
	}).getImageData(0, 0, e.width, e.height).data;
	return {
		first: a,
		frameCount: i,
		visuallyStatic: o
	};
}

function fileStem() {
	return `pic2pa-${(new Date).toISOString().replace(/[:.]/g, "-")}`;
}

function canvasToBlob(e, t = "image/png", a) {
	return new Promise((n, i) => {
		if (e.toBlob) e.toBlob(e => e ? n(e) : i(new Error("Canvas export returned no data.")), t, a); else try {
			const i = e.toDataURL(t, a), [o, r] = i.split(","), s = atob(r), l = new Uint8Array(s.length);
			for (let e = 0; e < s.length; e += 1) l[e] = s.charCodeAt(e);
			n(new Blob([ l ], {
				type: o.match(/data:([^;]+)/)?.[1] || t
			}));
		} catch (e) {
			i(e);
		}
	});
}

colorpad.querySelectorAll(".color-pair").forEach((e, t) => {
	bindColorPairEvents(e, t);
}), updatePaletteCountLabel(), paletteAddBtn.addEventListener("click", function() {
	const e = colorpad.querySelectorAll(".color-pair").length;
	e >= 64 || (createPalettePair(e), reindexColorPairs(), makeCustomPaletteLabel(), 
	addToSessionLog("PALETTE", `Added color slot ${e + 1}.`));
}), paletteRemoveBtn.addEventListener("click", function() {
	const e = colorpad.querySelectorAll(".color-pair");
	e.length <= 2 || (colorpad.removeChild(e[e.length - 1]), reindexColorPairs(), makeCustomPaletteLabel(), 
	addToSessionLog("PALETTE", `Removed last color slot (now ${e.length - 1} slots).`));
}), predefinedPaletteSelect.addEventListener("change", function() {
	if ("custom" === this.value || !predefinedPalettes[this.value]) return;
	this.querySelector('option[value="custom"]').classList.add("hidden");
	const e = predefinedPalettes[this.value];
	e && (syncPaletteSize(e.length), colorpad.querySelectorAll(".color-pair").forEach((t, a) => {
		e[a] && (t.querySelector('input[type="color"]').value = hexRgbOnly(e[a]), t.querySelector(".colortext").value = e[a], 
		t.dataset.alpha = String(hexToRgba(e[a]).a));
	}), reindexColorPairs(), statusDiv.textContent = `System: Loaded predefined "${this.value}" palette schema.`, 
	addToSessionLog("PALETTE", `Switched layout to predefined scheme: ${this.value}`));
}), paletteFileInput.addEventListener("change", function(e) {
	const t = e.target.files[0];
	if (!t) return;
	const a = new FileReader;
	a.onerror = () => displayErrorPopup("Palette File IO Exception", "An error occurred while reading the palette source file.", a.error ? a.error.message : "Unknown fault."), 
	a.onload = function(e) {
		try {
			const a = [];
			e.target.result.split(/\r?\n/).forEach(e => {
				const t = e.trim().replace(/;.*$/, "").trim(), n = t.match(/#?([0-9A-Fa-f]{8})/) || t.match(/#?([0-9A-Fa-f]{6})/) || t.match(/#?([0-9A-Fa-f]{3,4})/);
				n && a.push("#" + n[1].toLowerCase());
			}), a.length > 0 ? (syncPaletteSize(a.length), colorpad.querySelectorAll(".color-pair").forEach((e, t) => {
				a[t] && (e.querySelector('input[type="color"]').value = hexRgbOnly(a[t]), e.querySelector(".colortext").value = a[t], 
				e.dataset.alpha = String(hexToRgba(a[t]).a));
			}), reindexColorPairs(), statusDiv.textContent = `System: Loaded ${a.length} colors from palette file.`, 
			addToSessionLog("PALETTE", `Imported external palette from ${t.name}.`)) : displayErrorPopup("Palette Parsing Exception", "No valid Hexadecimal color codes found in this file.", "Please verify the file contents."), 
			makeCustomPaletteLabel();
		} catch (e) {
			displayErrorPopup("Palette Processor Runtime Fault", e.message, e.stack);
		}
	}, a.readAsText(t);
}), fileInput.addEventListener("change", async function() {
	resetLoadedState();
	const e = fileInput.files[0];
	if (!e) return void (statusDiv.textContent = "Invalid: No image file. Try selecting an image such as PNG, JPG, GIF, APNG, WebP, or WebM.");
	const t = sourceMime(e);
	if (/^image\//.test(t) || "video/webm" === t) {
		statusDiv.textContent = `System: Loading asset of "${e.name}".`, originalMimeType = t, 
		sourceExtension = sourceExtensionOf(e), uploadedFileBuffer = await e.arrayBuffer();
		try {
			if ("video/webm" === t || isAnimatedBuffer(uploadedFileBuffer, t)) {
				const a = await decodeAnimation(uploadedFileBuffer, t), n = await inspectAnimationSource(a);
				if (!n.first) throw new Error("No decodable animation frames were found.");
				const i = canvasPreviewImage(n.first.image), o = n.frameCount || a.frameCount || 0;
				n.visuallyStatic ? (animSource = null, showLoadedPreview(i, n.first.width, n.first.height), 
				uploadedFileBuffer = null, statusDiv.textContent = `Ready: "${e.name}" Loaded as a static image.`, 
				addToSessionLog("IMAGE", `Loaded "${t}" as static output (${o || 1} visually identical frame(s)).`)) : (animSource = a, 
				showLoadedPreview(i, n.first.width, n.first.height, o), statusDiv.textContent = `Ready: "${e.name}" Loaded (${o ? `${o} ` : ""}frame${1 === o ? "" : "s"}).`, 
				addToSessionLog("ANIM", `Loaded "${t}" as a streaming animation source${o ? ` with ${o} frame(s)` : ""}.`)), 
				releaseFrame(n.first);
			} else {
				const a = URL.createObjectURL(e), n = new Image;
				n.onload = () => {
					URL.revokeObjectURL(a), showLoadedPreview(n, n.naturalWidth, n.naturalHeight), statusDiv.textContent = `Ready: "${e.name}" Loaded Successfully.`, 
					addToSessionLog("IMAGE", `Loaded "${t}" source image.`);
				}, n.onerror = () => {
					URL.revokeObjectURL(a), displayErrorPopup("Image Decoding Exception", "Unable to decode this image file.", "The file may be corrupted or unsupported.");
				}, n.src = a;
			}
		} catch (e) {
			displayErrorPopup("Animation Decode Error", e.message, e.stack), resetLoadedState();
		}
	} else statusDiv.textContent = `Invalid: "${e.name}" is not a supported image or WebM file.`;
});

const OUTPUT_MIME_TYPES = Object.freeze({
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	jpe: "image/jpeg",
	bmp: "image/bmp",
	gif: "image/gif",
	webp: "image/webp",
	apng: "image/apng"
});

function outputMimeForExtension(e) {
	return OUTPUT_MIME_TYPES[e] || "";
}

function assertBlobType(e, t, a) {
	if (!e || t && e.type && e.type.toLowerCase() !== t) throw new Error(`This browser could not produce a valid ${a.toUpperCase()} output.`);
	return e;
}

async function encodeStaticOutput(e, t, a) {
	if ("jxl" === sourceExtension || "webm" === sourceExtension) throw new Error(`This browser cannot encode processed ${sourceExtension.toUpperCase()} output without changing the requested extension.`);
	if ("gif" === sourceExtension) return encodeAnimatedGif({
		width: t,
		height: a,
		frames: [ {
			indexMap: e.indexMap,
			width: t,
			height: a,
			rect: {
				x: 0,
				y: 0,
				width: t,
				height: a
			},
			delay: 100,
			disposal: 0
		} ],
		repeat: null
	});
	if ("bmp" === sourceExtension) return encodeBmpFromCanvas(canvas);
	if ("apng" === sourceExtension) {
		const n = createApngStreamWriter({
			width: t,
			height: a,
			frameCount: 1,
			repeat: null
		});
		return n.add({
			indexMap: e.indexMap,
			rect: {
				x: 0,
				y: 0,
				width: t,
				height: a
			},
			delay: 100,
			disposal: 0,
			changedOnly: !1
		}), n.finish();
	}
	const n = outputMimeForExtension(sourceExtension) || "image/png";
	return assertBlobType(await canvasToBlob(canvas, n), n, sourceExtension);
}

function releaseFrame(e) {
	e?.image instanceof HTMLCanvasElement && (e.image.width = 0, e.image.height = 0, 
	e.image = null);
}

function updateCalculatedDimensions() {
	if (!document.querySelector("#original-preview-zone img, #original-preview-zone canvas")) return;
	const e = (e, t) => {
		inputWidth.disabled = e, inputHeight.disabled = e, inputFactor.disabled = t;
	};
	if (document.getElementById("original-size").checked) {
		nextResizeMode = "original-size", nextResizeMode !== curResizeMode && (inputFactor.value = 1);
		const t = parseFloat(inputFactor.value) || .1;
		inputWidth.value = Math.round(originalImageSize.width * t), inputHeight.value = Math.round(originalImageSize.height * t), 
		e(!0, !1);
	} else if (document.getElementById("full-width").checked) nextResizeMode = "full-width", 
	nextResizeMode !== curResizeMode && (inputFactor.value = 0), inputWidth.value = 160, 
	inputHeight.value = Math.round(originalImageSize.height * (160 / originalImageSize.width)), 
	e(!0, !0); else if (document.getElementById("full-height").checked) nextResizeMode = "full-height", 
	nextResizeMode !== curResizeMode && (inputFactor.value = 0), inputHeight.value = 120, 
	inputWidth.value = Math.round(originalImageSize.width * (120 / originalImageSize.height)), 
	e(!0, !0); else if (document.getElementById("scale").checked) {
		nextResizeMode = "scale", nextResizeMode !== curResizeMode && (inputFactor.value = .25);
		const t = parseFloat(inputFactor.value) || .1;
		inputWidth.value = Math.round(originalImageSize.width * t), inputHeight.value = Math.round(originalImageSize.height * t), 
		e(!1, !1);
	}
	curResizeMode = nextResizeMode, document.getElementById("canvas-res").textContent = `Size: ${inputWidth.value} x ${inputHeight.value} px`;
}

function createAsciiRowStream(e, t, a, n, i) {
	if (!n) {
		return {
			beginFrame() {},
			onSourceRow() {},
			finish() {}
		};
	}
	const o = Math.max(1, Math.min(i, e));
	const r = e / o * 2;
	const s = Math.max(1, Math.round(t / r));
	const l = asciiCharsetSelect.value;
	const c = makeAsciiLumaTable(rgbPalette);
	const u = new Uint8Array(e * t);
	let d = 0;
	let p = null;
	const h = (n, i) => a.appendLine(buildAsciiLine(n, e, t, i, rgbPalette, l, o, c));
	return {
		beginFrame(e) {
			d = 0;
			p = null;
			if (e) {
				a.appendLine(e);
			}
		},
		onSourceRow(e, a) {
			p = a;
			while (d < s && !(e + 1 < Math.min(t, Math.ceil((d + 1) * r)))) {
				h(d, a);
				d += 1;
			}
		},
		finish() {
			const e = p || u;
			while (d < s) {
				h(d, e);
				d += 1;
			}
		}
	};
}

async function yieldOutputFrame() {
	await new Promise(e => {
		("function" == typeof requestAnimationFrame ? requestAnimationFrame : setTimeout)(e, 0);
	});
}

function createProcessedTextOutput(e, t, a, n) {
	const i = createStringOutputWriter("makecode");
	const o = createStringOutputWriter("ascii");
	const r = createAsciiRowStream(e, t, o, a, n);
	let s = 0;
	const startFollowTail = () => {
		getOutputState("makecode").followTail = true;
		getOutputState("ascii").followTail = true;
	};
	return {
		startStatic() {
			i.reset();
			o.reset();
			i.appendLine("img`");
			r.beginFrame();
			s = 0;
			startFollowTail();
			renderOutputViewports();
		},
		startAnimation() {
			i.reset("[");
			o.reset();
			s = 0;
			startFollowTail();
			renderOutputViewports();
		},
		beginFrame(e, t) {
			if (e > 1) {
				i.appendLine(",");
				a && o.appendLine("");
			}
			i.appendLine("img`");
			r.beginFrame(`Frame ${e}${t ? `/${t}` : ""}:`);
			s = 0;
			renderOutputViewports();
		},
		async onRow(e, t, a) {
			i.appendLine(t);
			r.onSourceRow(e, a);
			s += 1;
			if (s >= 16) {
				s = 0;
				renderOutputViewports();
				await yieldOutputFrame();
			}
		},
		finishStatic() {
			i.appendLine("`");
			r.finish();
			finishOutputViewports();
		},
		finishFrame() {
			i.appendLine("`");
			r.finish();
			renderOutputViewports();
		},
		finishAnimation() {
			i.appendLine("]");
			finishOutputViewports();
		}
	};
}

async function processAnimation(e, t) {
	const a = animSource, n = await a.open();
	if (!n) throw new Error("Unable to open animation frame stream.");
	const i = a.repeat ?? n.repeat ?? null, o = a.frameCount || n.frameCount || 0, r = createAnimatedOutputWriter(sourceExtension, {
		width: e,
		height: t,
		repeat: i,
		frameCount: o
	}), s = engineSelect.value, l = parseInt(asciiWidthInput.value) || 80, c = createProcessedTextOutput(e, t, asciiEnableCheck.checked, l);
	c.startAnimation();
	let u = null, d = 0;
	for await (const a of n) {
		const n = d + 1, i = o ? `/${o}` : "";
		c.beginFrame(n, o), ctx.globalCompositeOperation = "copy", ctx.clearRect(0, 0, e, t), 
		ctx.drawImage(a.image, 0, 0, e, t), ctx.globalCompositeOperation = "source-over";
		const l = ctx.getImageData(0, 0, e, t), p = ctx.createImageData(e, t), h = imageDataHasAlpha(l.data), g = c.onRow, m = "gpu" === s ? await runGLPipeline({
			canvas: canvas,
			data: l.data,
			w: e,
			h: t,
			mode: modeSelect.value,
			rgbPalette: rgbPalette,
			outImgData: p,
			hasAlpha: h,
			onRow: g,
			onProgress: async e => {
				runButton.textContent = `Converting frame ${n}${i}: ${e}%`, statusDiv.textContent = `Processing frame ${n}${i}: ${e}%`, 
				await yieldOutputFrame();
			}
		}) : await runCPUPipelineFallback(l, e, t, p, `Frame: ${n}${i}`, h, g), f = m.indexMap instanceof Uint8Array ? m.indexMap : new Uint8Array(m.indexMap), w = makeOutputDelta(f, u, e, t, a);
		u = f, ctx.putImageData(p, 0, 0), await r.add({
			...w,
			delay: a.delay,
			disposal: a.disposal ?? 0,
			compositionMode: w.changedOnly ? "overlay" : "replace"
		}), await c.finishFrame(), d += 1, runButton.textContent = `Converting frame ${d}${i}...`, 
		statusDiv.textContent = `Processing frame ${d}${i}...`, releaseFrame(a), await yieldOutputFrame();
	}
	if (!d) throw new Error("Animation stream returned no frames.");
	c.finishAnimation(), processedAnimation = {
		mimeType: originalMimeType,
		width: e,
		height: t,
		frameCount: d,
		repeat: i,
		streamed: !0,
		asciiFrames: asciiEnableCheck.checked
	}, setOutputBlob(await r.finish()), setButtonState("almost"), isTextProcessing = !1, 
	copyButton.textContent = "Copy to Clipboard";
}

function makeOutputDelta(e, t, a, n, i) {
	if (!t || !i.changedOnly) return {
		indexMap: e,
		width: a,
		height: n,
		rect: {
			x: 0,
			y: 0,
			width: a,
			height: n
		},
		changedOnly: !1
	};
	const o = i.sourceWidth || i.width || a, r = i.sourceHeight || i.height || n, s = i.rect || {
		x: 0,
		y: 0,
		width: o,
		height: r
	}, l = a / o, c = n / r;
	let u = Math.max(0, Math.floor(s.x * l)), d = Math.max(0, Math.floor(s.y * c)), p = Math.min(a, Math.ceil((s.x + s.width) * l)), h = Math.min(n, Math.ceil((s.y + s.height) * c)), g = !1;
	for (let n = d; n < h; n += 1) for (let i = u; i < p; i += 1) {
		const o = n * a + i;
		e[o] !== t[o] && (g = !0, u = Math.min(u, i), p = Math.max(p, i + 1), d = Math.min(d, n), 
		h = Math.max(h, n + 1));
	}
	g || (u = Math.max(0, Math.min(a - 1, Math.floor(s.x * l))), d = Math.max(0, Math.min(n - 1, Math.floor(s.y * c))), 
	p = u + 1, h = d + 1);
	const m = new Uint8Array(Math.max(1, p - u) * Math.max(1, h - d));
	let f = 0;
	for (let n = d; n < h; n += 1) for (let i = u; i < p; i += 1) {
		const o = n * a + i;
		m[f++] = e[o] === t[o] ? 0 : e[o];
	}
	return {
		indexMap: m,
		width: p - u,
		height: h - d,
		rect: {
			x: u,
			y: d,
			width: p - u,
			height: h - d
		},
		changedOnly: !0
	};
}

function imageDataHasAlpha(e) {
	for (let t = 3; t < e.length; t += 4) if (e[t] < 255) return !0;
	return !1;
}

async function runCPUPipelineFallback(e, t, a, n, i, o = imageDataHasAlpha(e.data), r) {
	return runConversionPipeline({
		data: e.data,
		w: t,
		h: a,
		mode: modeSelect.value,
		subPixelOption: subpixelSelect.value,
		rgbPalette: rgbPalette,
		outImgData: n,
		hasAlpha: o,
		onRow: r,
		onProgress: async e => {
			ctx.putImageData(n, 0, 0), runButton.textContent = `${i ? `${i}, ` : ""}Converting... ${e}%`, 
			statusDiv.textContent = `${i ? `${i}, ` : ""}Processing CPU pipeline... ${e}%`, 
			await new Promise(e => requestAnimationFrame(e));
		}
	});
}

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

function paletteForOutput() {
	const e = rgbPalette.slice(0, 256);
	return e.length && 0 === e[0].a || e.unshift({
		r: 0,
		g: 0,
		b: 0,
		a: 0
	}), e;
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

function createAnimatedOutputWriter(e, t) {
	if ("gif" === e) return createGifStreamWriter(t);
	if ("apng" === e || "png" === e) return createApngStreamWriter(t);
	if ("webm" === e) return createWebmStreamWriter(t);
	throw new Error(`Animated ${e.toUpperCase()} output cannot be encoded safely in this browser without changing the requested extension.`);
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

function downloadBlob(e, t) {
	const a = URL.createObjectURL(e), n = document.createElement("a");
	n.href = a, n.download = t, n.click(), setTimeout(() => {
		URL.revokeObjectURL(a), n.remove();
	}, 0);
}

document.querySelectorAll('input[name="resize"], #factor').forEach(e => {
	e.addEventListener("change", updateCalculatedDimensions), e.addEventListener("input", updateCalculatedDimensions);
}), inputWidth.addEventListener("input", function() {
	inputRatio.checked && originalImageSize.width > 0 && (inputHeight.value = Math.round(originalImageSize.height * (parseInt(this.value) || 1) / originalImageSize.width)), 
	document.getElementById("canvas-res").textContent = `Size: ${inputWidth.value} x ${inputHeight.value} px`;
}), inputHeight.addEventListener("input", function() {
	inputRatio.checked && originalImageSize.height > 0 && (inputWidth.value = Math.round(originalImageSize.width * (parseInt(this.value) || 1) / originalImageSize.height)), 
	document.getElementById("canvas-res").textContent = `Size: ${inputWidth.value} x ${inputHeight.value} px`;
}), parametersForm.addEventListener("submit", async function(e) {
	if (e.preventDefault(), !runButton.disabled) {
		resetOutputString("makecode");
		renderOutputViewport("makecode");
		try {
			const e = document.querySelector("#original-preview-zone img, #original-preview-zone canvas");
			if (!e) return;
			canvasName = `${fileStem()}.${sourceExtension}`, processedAnimation = null, parseCurrentPalette();
			const t = parseInt(inputWidth.value) || 16, a = parseInt(inputHeight.value) || 16;
			if (Math.sqrt(a + t), canvas.width = t, canvas.height = a, setButtonState("processing"), 
			runButton.textContent = "Converting...",
			resetOutputString("makecode"), renderOutputViewport("makecode"),
			resetOutputString("ascii"), renderOutputViewport("ascii"), animSource) return await processAnimation(t, a), setButtonState("done"), 
			void (stopTextProcessingFlag ? statusDiv.textContent = "Text output generation stopped by user." : statusDiv.textContent = "Success: Animation conversion completed!");
			ctx.globalCompositeOperation = "copy", ctx.clearRect(0, 0, t, a), ctx.drawImage(e, 0, 0, t, a), 
			ctx.globalCompositeOperation = "source-over";
			const n = ctx.getImageData(0, 0, t, a);
			ctx.clearRect(0, 0, t, a);
			const i = ctx.createImageData(t, a), o = engineSelect.value, r = parseInt(asciiWidthInput.value) || 80, s = createProcessedTextOutput(t, a, asciiEnableCheck.checked, r);
			let l;
			s.startStatic();
			const c = imageDataHasAlpha(n.data);
			"gpu" === o ? (l = await runGLPipeline({
				canvas: canvas,
				data: n.data,
				w: t,
				h: a,
				mode: modeSelect.value,
				rgbPalette: rgbPalette,
				outImgData: i,
				hasAlpha: c,
				onRow: s.onRow,
				onProgress: async e => {
					runButton.textContent = `Converting... ${e}%`, statusDiv.textContent = `Processing GPU pipeline... ${e}%`, 
					await new Promise(e => requestAnimationFrame(e));
				}
			}), ctx.putImageData(i, 0, 0)) : l = await runCPUPipelineFallback(n, t, a, i, null, c, s.onRow), 
			ctx.putImageData(i, 0, 0), await s.finishStatic(), setButtonState("almost"), lastIndexMap = l.indexMap, 
			lastW = t, lastH = a, asciiEnableCheck.checked && addToSessionLog("ASCII", `ASCII output generated during image processing (${r} cols, charset: ${asciiCharsetSelect.value}).`), 
			setButtonState("done"), outputBlob = await encodeStaticOutput(l, t, a), setOutputBlob(outputBlob), 
			stopTextProcessingFlag ? statusDiv.textContent = "Text output generation stopped by user." : statusDiv.textContent = "Success: Conversion completed successfully!";
		} catch (e) {
			setButtonState("imageLoaded"), displayErrorPopup("Pipeline Processing Fatal Exception", e.message, e.stack);
		}
	}
});

function getActiveOutputName() {
	return document.getElementById("tab-ascii").classList.contains("active") ? "ascii" : "makecode";
}

async function copyOutputString(value) {
	if (navigator.clipboard && window.isSecureContext) {
		try {
			await Promise.race([
				navigator.clipboard.writeText(value),
				new Promise((resolve, reject) => setTimeout(() => reject(new Error("Clipboard API timeout.")), 1500))
			]);
			return;
		} catch (error) {
			addToSessionLog("CLIPBOARD", `Clipboard API fallback: ${error.message}`);
		}
	}
	const temporaryCopyArea = document.createElement("textarea");
	temporaryCopyArea.value = value;
	temporaryCopyArea.setAttribute("readonly", "");
	temporaryCopyArea.style.position = "fixed";
	temporaryCopyArea.style.left = "-100000px";
	temporaryCopyArea.style.top = "0";
	temporaryCopyArea.style.opacity = "0";
	document.body.appendChild(temporaryCopyArea);
	temporaryCopyArea.select();
	const copied = document.execCommand("copy");
	temporaryCopyArea.remove();
	if (!copied) {
		throw new Error("Denied copy.");
	}
}

copyButton.addEventListener("click", async function(e) {
	e.preventDefault();
	if (isTextProcessing) {
		stopTextProcessingFlag = !0;
		return;
	}
	try {
		await copyOutputString(getOutputString(getActiveOutputName()));
		copyButton.textContent = "Copied!";
		setTimeout(() => {
			copyButton.textContent = "Copy to Clipboard";
		}, 2e3);
	} catch (e) {
		displayErrorPopup("Clipboard Copy Exception", "Unable to copy to clipboard.", e.message);
	}
	});

downloadButton.addEventListener("click", async function(e) {
	e.preventDefault();
	try {
		if (processedAnimation?.streamed) {
			if (!outputBlob) throw new Error("The streamed animation output is not ready.");
			return downloadBlob(outputBlob, canvasName), void addToSessionLog("IO", `Downloaded processed animation (${processedAnimation.frameCount} frames).`);
		}
		const e = outputBlob || await encodeStaticOutput({
			indexMap: lastIndexMap
		}, lastW, lastH);
		setOutputBlob(e), downloadBlob(e, canvasName);
	} catch (e) {
		displayErrorPopup("IO Canvas Download Error", e.message, e.stack);
	}
}), window.addEventListener("DOMContentLoaded", () => {
	const e = document.getElementById("page-loader");
	e && setTimeout(() => {
		e.classList.add("hidden");
	}, 400);
});