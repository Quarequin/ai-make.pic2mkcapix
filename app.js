// app.js
import { runConversionPipeline } from './matrix-engine.js';

let htmlLog = [];

function addToSessionLog(type, message, detail = "") {
  const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
  const logEntry = `[${timestamp}] [${type}] ${message} ${detail ? '\nDetail: ' + detail : ''}`;
  htmlLog.push(logEntry);
  console.log(logEntry);
}

addToSessionLog("SYSTEM", "Application initialized successfully.");

window.addEventListener("error", function(e) {
  const stackTrace = e.error ? e.error.stack : "No call stack available.";
  addToSessionLog("CRITICAL_ERROR", e.message, stackTrace);
  displayErrorPopup("Uncaught Runtime Exception", e.message, stackTrace);
});

function displayErrorPopup(type, message, stack) {
  document.getElementById("popup-err-type").textContent = type;
  document.getElementById("popup-err-message").textContent = message;
  document.getElementById("popup-err-stack").textContent = stack || "No call stack trace records.";
  
  const logPanel = document.getElementById("popup-err-stack");
  const toggleBtn = document.getElementById("btn-toggle-log");
  logPanel.style.display = "none";
  toggleBtn.textContent = "ดู log ตัวเต็ม (Show Full Log) ▼";
  
  document.getElementById("notification-popup-overlay").style.display = "block";
}

function toggleErrorLog() {
  const logPanel = document.getElementById("popup-err-stack");
  const toggleBtn = document.getElementById("btn-toggle-log");
  if (logPanel.style.display === "none" || logPanel.style.display === "") {
    logPanel.style.display = "block";
    toggleBtn.textContent = "ซ่อน log ตัวเต็ม (Hide Full Log) ▲";
  } else {
    logPanel.style.display = "none";
    toggleBtn.textContent = "ดู log ตัวเต็ม (Show Full Log) ▼";
  }
}

function closeErrorPopup() {
  document.getElementById("notification-popup-overlay").style.display = "none";
}

document.getElementById("popup-close-btn").addEventListener("click", closeErrorPopup);
document.getElementById("btn-toggle-log").addEventListener("click", toggleErrorLog);

const fileInput = document.getElementById("file");
const paletteFileInput = document.getElementById("palette-file-reader");
const predefinedPaletteSelect = document.getElementById("predefined-palette-select");
const modeSelect = document.getElementById("mode-select");
const subpixelSelect = document.getElementById("subpixel-select");

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

let originalImageSize = { width: 0, height: 0 };
let originalMimeType = "image/png";
let canvasName = "pic2mkca.png";
let canvasLastName = ".png"; 
let rgbPalette = [];

// ชุดพาเลทสีสำเร็จรูปที่อ้างอิงจาก MakeCode Arcade ย้ายตำแหน่ง null ทิ้งดึงเฉพาะสี 1-15 ใช้งานตรงสล็อต
const predefinedPalettes = {
  arcade: [
    "#ffffff", "#ff2121", "#ff93c4", "#ff8135", "#fff609", "#249ca3", "#78dc52",
    "#003fad", "#87f2ff", "#8e2ec4", "#a4839f", "#5c406c", "#e5cdc4", "#91463d", "#000000"
  ],
  matte: [
    "#ffffff", "#ff455a", "#ffaebc", "#ffab3c", "#fffa40", "#278c3f", "#37e650",
    "#5e70d4", "#99d5e5", "#a845ff", "#cfa4ff", "#7a4a8b", "#ffcca4", "#bd7f47", "#41344e"
  ],
  pastel: [
    "#ffffff", "#ffb0a1", "#ffd6ec", "#ffdca1", "#fffda1", "#a1ffe1", "#baffc1",
    "#a1d6ff", "#e1ffff", "#d6a1ff", "#eaccff", "#bdb0d6", "#fff0e1", "#d6a1a1", "#696a6a"
  ],
  sweet: [
    "#ffffff", "#803d41", "#9ad46a", "#eb8b4a", "#f6d86e", "#18544a", "#31a477",
    "#365f91", "#6bd0ff", "#653780", "#9f7bb1", "#d6b8c0", "#e7d7c1", "#ac896e", "#4f455a"
  ],
  poke: [
    "#ffffff", "#e4595d", "#f7a171", "#fced8c", "#69d8af", "#71aa6a", "#2c6eb7",
    "#5196d8", "#8aa7cc", "#b070cc", "#dea3ea", "#ace6a2", "#e7ccae", "#9a6d5f", "#454545"
  ],
  adventure: [
    "#ffffff", "#e9d4a9", "#c57e7d", "#a74e5a", "#f8ae49", "#9d9d5a", "#557d4a",
    "#0f4a6d", "#3b83a1", "#4d5061", "#6e81a1", "#a1acbd", "#e7e7e7", "#714a47", "#1c1f21"
  ],
  diy: [
    "#ffffff", "#ff0000", "#ff99aa", "#ffcc00", "#ffff00", "#00ff00", "#00cc00",
    "#000000", "#00ffff", "#aa00ff", "#cc99ff", "#aaaaaa", "#eebbaa", "#884400", "#000000"
  ],
  adafruit: [
    "#ffffff", "#ff0000", "#ff5500", "#ffaa00", "#ffff00", "#00ff00", "#00aa55",
    "#000000", "#00aaff", "#aa00ff", "#ff00ff", "#aaaaaa", "#555555", "#ff55aa", "#000000"
  ],
  still_life: [
    "#ffffff", "#9be2de", "#ff6f5a", "#e0946a", "#e8c466", "#adcdd5", "#69b477",
    "#54818e", "#61a4c4", "#9d94d1", "#6b5a83", "#8d796e", "#c7ae9e", "#706059", "#3d3a4f"
  ],
  steam_punk: [
    "#ffffff", "#b4dad6", "#3b3740", "#664d49", "#9f6751", "#737156", "#9f0866",
    "#647d87", "#8aa1ab", "#7d7187", "#a392a5", "#bdbdc5", "#e4e7ea", "#a59487", "#59555a"
  ],
  grayscale: [
    "#ffffff", "#f7f7f7", "#e1e1e1", "#cccccc", "#b8b8b8", "#a3a3a3", "#8e8e8e",
    "#7a7a7a", "#666666", "#515151", "#3d3d3d", "#292929", "#141414", "#000000", "#000000"
  ]
};

document.querySelectorAll(".color-pair").forEach((pair, idx) => {
  const picker = pair.querySelector('input[type="color"]');
  const txt = pair.querySelector('.colortext');
  picker.addEventListener("input", function() { txt.value = this.value; });
  txt.addEventListener("change", function() {
    let val = this.value.trim();
    if(!val.startsWith("#")) val = "#" + val;
    if(/^#[0-9A-Fa-f]{6}$/.test(val)) {
      picker.value = val;
      this.value = val;
      addToSessionLog("PALETTE", `Color slot ${idx + 1} updated to ${val}`);
    } else {
      addToSessionLog("PALETTE_FAULT", `Invalid hex code typed: ${val}`);
      displayErrorPopup("Invalid Color HEX Input", `โครงสร้างรหัสสี "${val}" ไม่ถูกต้อง`, "กรุณาระบุในฟอร์แมต Hexadecimal เช่น #FFFFFF เท่านั้น");
      this.value = picker.value;
    }
  });
});

// ดักจับเหตุการณ์เมื่อผู้ใช้เลือกพาเลทสีสำเร็จรูป
predefinedPaletteSelect.addEventListener("change", function() {
  const selectedPalette = this.value;
  if (predefinedPalettes[selectedPalette]) {
    const colors = predefinedPalettes[selectedPalette];
    const pairs = document.querySelectorAll(".color-pair");
    for (let i = 0; i < pairs.length && i < colors.length; i++) {
      const picker = pairs[i].querySelector('input[type="color"]');
      const txt = pairs[i].querySelector('.colortext');
      picker.value = colors[i];
      txt.value = colors[i];
    }
    statusDiv.textContent = `System: Loaded predefined "${selectedPalette}" palette schema.`;
    addToSessionLog("PALETTE", `Switched layout to predefined scheme: ${selectedPalette}`);
  }
});

paletteFileInput.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();

  reader.onerror = function() {
    displayErrorPopup("Palette File IO Exception", "เกิดข้อผิดพลาดในการอ่านไฟล์ Palette ต้นฉบับ", reader.error ? reader.error.message : "Unknown file reader fault.");
  };

  reader.onload = function(evt) {
    try {
      const lines = evt.target.result.split(/\r?\n/);
      let colorsFound = [];
      lines.forEach(line => {
        let clean = line.trim().replace(/;.*$/, "").trim();
        if (!clean) return;
        let match = clean.match(/#?([0-9A-Fa-f]{6})/);
        if (match) {
          colorsFound.push("#" + match[1].toLowerCase());
        }
      });
      if (colorsFound.length > 0) {
        const pairs = document.querySelectorAll(".color-pair");
        for (let i = 0; i < pairs.length && i < colorsFound.length; i++) {
          const picker = pairs[i].querySelector('input[type="color"]');
          const txt = pairs[i].querySelector('.colortext');
          picker.value = colorsFound[i];
          txt.value = colorsFound[i];
        }
        statusDiv.textContent = `System: Loaded ${Math.min(pairs.length, colorsFound.length)} colors from palette file.`;
        addToSessionLog("PALETTE", `Imported external palette from ${file.name}. Total found: ${colorsFound.length}`);
      } else {
        addToSessionLog("PALETTE_PARSE_EMPTY", `No valid hex found inside ${file.name}`);
        displayErrorPopup("Palette Parsing Exception", "ไม่พบรหัสสี Hexadecimal ที่ถูกต้องภายในไฟล์นี้", "กรุณาตรวจสอบว่าไฟล์มีรหัสสี 6 หลักอยู่จริง");
      }
    } catch(err) {
      displayErrorPopup("Palette Processor Runtime Fault", err.message, err.stack);
    }
  };
  reader.readAsText(file);
});

function parseCurrentPalette() {
  rgbPalette = [];
  document.querySelectorAll(".color-pair").forEach((pair) => {
    const hex = pair.querySelector('input[type="color"]').value;
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    rgbPalette.push({ r, g, b });
  });
}

fileInput.addEventListener("change", function () {
  textarea.value = "";
  const file = fileInput.files[0];
  if (!file) return;

  originalMimeType = file.type || "image/png";
  const lastDotIdx = file.name.lastIndexOf('.');
  canvasLastName = lastDotIdx !== -1 ? file.name.substring(lastDotIdx) : ".png";
  if (canvasLastName.toLowerCase() === ".gif") canvasLastName = ".png";

  const reader = new FileReader();
  reader.onerror = function() {
    displayErrorPopup("Image File IO Exception", "เกิดข้อผิดพลาดในการโหลดอ่านไฟล์ภาพต้นฉบับ", reader.error ? reader.error.message : "Unknown file reader fault.");
  };

  reader.onload = function (e) {
    const img = new Image();
    img.onerror = function() {
      statusDiv.textContent = `Error: Failed to decode image asset.`;
      addToSessionLog("IMAGE_DECODE_FAULT", "Image decoding failed via HTMLImageElement asset stream.");
      displayErrorPopup("Image Decoding Exception", "ไม่สามารถแปลงข้อมูลไฟล์นี้เป็นรูปภาพที่สมบูรณ์ได้", "ไฟล์อาจชำรุดหรือเป็นประเภทฟอร์แมตที่บราว์เซอร์ไม่รองรับ");
    };

    img.onload = () => {
      try {
        if (previewContainer) previewContainer.style.display = "block";
        originalImageSize.width = img.naturalWidth;
        originalImageSize.height = img.naturalHeight;

        document.getElementById("original-res").textContent = `Size: ${img.naturalWidth} x ${img.naturalHeight} px`;

        const zone = document.getElementById("original-preview-zone");
        zone.innerHTML = "";
        zone.appendChild(img);

        document.querySelectorAll("input[disabled]").forEach((el) => el.removeAttribute("disabled"));
        runButton.removeAttribute("disabled");
        downloadButton.removeAttribute("disabled");

        updateCalculatedDimensions();
        statusDiv.textContent = `Ready: ${file.name} Loaded Successfully.`;
        addToSessionLog("IMAGE", `Loaded target resource file: ${file.name} (${img.naturalWidth}x${img.naturalHeight})`);
      } catch (innerErr) {
        displayErrorPopup("Image Allocation Core Exception", innerErr.message, innerErr.stack);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function updateCalculatedDimensions() {
  const img = document.querySelector("#original-preview-zone img");
  if (!img) return;

  if (document.getElementById("full-width").checked) {
    inputWidth.value = 160;
    inputHeight.value = Math.round(originalImageSize.height * (160 / originalImageSize.width));
  } else if (document.getElementById("full-height").checked) {
    inputHeight.value = 120;
    inputWidth.value = Math.round(originalImageSize.width * (120 / originalImageSize.height));
  } else if (document.getElementById("scale").checked) {
    const f = parseFloat(inputFactor.value) || 0.1;
    inputWidth.value = Math.round(originalImageSize.width * f);
    inputHeight.value = Math.round(originalImageSize.height * f);
  }
  
  document.getElementById("canvas-res").textContent = `Size: ${inputWidth.value} x ${inputHeight.value} px`;
}

document.querySelectorAll('input[name="resize"], #factor').forEach((el) => {
  el.addEventListener("change", updateCalculatedDimensions);
  el.addEventListener("input", updateCalculatedDimensions);
});

inputWidth.addEventListener("input", function() {
  if (inputRatio.checked && originalImageSize.width > 0) {
    inputHeight.value = Math.round(originalImageSize.height * (parseInt(this.value) || 1) / originalImageSize.width);
  }
  document.getElementById("canvas-res").textContent = `Size: ${inputWidth.value} x ${inputHeight.value} px`;
});
inputHeight.addEventListener("input", function() {
  if (inputRatio.checked && originalImageSize.height > 0) {
    inputWidth.value = Math.round(originalImageSize.width * (parseInt(this.value) || 1) / originalImageSize.height);
  }
  document.getElementById("canvas-res").textContent = `Size: ${inputWidth.value} x ${inputHeight.value} px`;
});

parametersForm.addEventListener("submit", async function (e) {
  e.preventDefault(); 
  
  if (runButton.hasAttribute("disabled") || runButton.disabled) {
    return;
  }

  try {
    const img = document.querySelector("#original-preview-zone img");
    if (!img) return;

    const now = new Date();
    const dateString = now.toISOString().replace(/:/g, "-").replace(/\.\d{3}/, ""); 
    canvasName = `pic2mkca.${dateString}${canvasLastName}`;

    parseCurrentPalette();

    const w = parseInt(inputWidth.value) || 16;
    const h = parseInt(inputHeight.value) || 16;
    canvas.width = w;
    canvas.height = h;

    // ดึงค่าของโหมดการดิทเธอร์และซับพิกเซลจาก Dropdown
    const mode = modeSelect.value;
    const subpixelMode = subpixelSelect.value;
    
    document.getElementById("canvas-res").textContent = `Size: ${w} x ${h} px (0%)`;
    statusDiv.textContent = `Processing matrix pipeline [Dither: ${mode.toUpperCase()} | Subpixel: ${subpixelMode.toUpperCase()}]... 0%`;
    addToSessionLog("PIPELINE", `Start conversion. Mode: ${mode}, Subpixel: ${subpixelMode}`);

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    
    ctx.clearRect(0, 0, w, h);
    const outImgData = ctx.createImageData(w, h);

    const finalCode = await runConversionPipeline({
      data: imgData.data,
      w,
      h,
      mode,
      subPixelOption: subpixelMode, 
      rgbPalette,
      outImgData,
      onProgress: async (progressPercent, updatedOutImgData) => {
        ctx.putImageData(updatedOutImgData, 0, 0);
        statusDiv.textContent = `Processing matrix pipeline... ${progressPercent}%`;
        document.getElementById("canvas-res").textContent = `Size: ${w} x ${h} px (${progressPercent}%)`;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    });

    textarea.value = finalCode;
    copyButton.removeAttribute("disabled");
    statusDiv.textContent = `Success: Convert completed! [Dither: ${mode.toUpperCase()} | Subpixel: ${subpixelMode.toUpperCase()}]`;
    document.getElementById("canvas-res").textContent = `Size: ${w} x ${h} px`;
    addToSessionLog("PIPELINE", `Render successful.`);
    
  } catch (pipelineErr) {
    addToSessionLog("MATRIX_FAULT", pipelineErr.message, pipelineErr.stack);
    displayErrorPopup("Matrix Pipeline Conversion Fault", pipelineErr.message, pipelineErr.stack);
  }
});

copyButton.addEventListener("click", function (e) {
  e.preventDefault();
  try {
    textarea.select();
    const copyStatus = document.execCommand("copy");
    if(!copyStatus) throw new Error("Browser execution command denied copy.");
    copyButton.innerText = "Code copied to clipboard!";
    addToSessionLog("IO", "Output vector text data copied into clipboard register.");
    setTimeout(() => { copyButton.innerText = "Copy code"; }, 2000);
  } catch(copyErr) {
    addToSessionLog("CLIPBOARD_FAULT", copyErr.message, copyErr.stack);
    displayErrorPopup("Clipboard Copy Register Exception", "ไม่สามารถคัดลอกข้อความลง Clipboard ได้", copyErr.message);
  }
});

downloadButton.addEventListener("click", function (e) {
  e.preventDefault();
  try {
    const imgInfo = document.querySelector("#original-preview-zone img");
    if (!imgInfo) throw new Error("No active canvas render image context.");
    
    let exportMimeType = originalMimeType === "image/gif" ? "image/png" : originalMimeType;
    const dataUrl = canvas.toDataURL(exportMimeType);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = canvasName; 
    link.click();
    link.remove();
    addToSessionLog("IO", `Triggered canvas attachment file download: ${canvasName}`);
  } catch (dnErr) {
    addToSessionLog("DOWNLOAD_FAULT", dnErr.message, dnErr.stack);
    displayErrorPopup("IO Canvas Download Error", dnErr.message, dnErr.stack);
  }
});
