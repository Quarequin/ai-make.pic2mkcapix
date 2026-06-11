// matrix-engine.js

/**
 * คำนวณหารหัสสีที่ใกล้เคียงที่สุดจาก Palette ที่กำหนด
 */
export function findNearestColor(r, g, b, rgbPalette) {
  let minDistance = Infinity;
  let nearestIndex = 1; 
  for (let i = 0; i < rgbPalette.length; i++) {
    const distance = Math.pow(r - rgbPalette[i].r, 2) + 
                     Math.pow(g - rgbPalette[i].g, 2) + 
                     Math.pow(b - rgbPalette[i].b, 2);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i + 1; 
    }
  }
  return nearestIndex;
}

/**
 * Pipeline หลักในการแปลงพิกเซลภาพเป็นเมทริกซ์ MakeCode Arcade
 */
export async function runConversionPipeline({ data, w, h, mode, subPixelOption, rgbPalette, outImgData, onProgress }) {
  
  // --- SUB-PIXEL PRE-PROCESSING LAYER ---
  if (subPixelOption === "1bit") {
    // ปรับปรุงเป็น 1bit-grayscale-subpixel อ้างอิงจากค่าความสว่างของแสง (Luma)
    for (let i = 0; i < data.length; i += 4) {
      let luma = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
      let val = luma > 127 ? 255 : 0;
      data[i] = data[i+1] = data[i+2] = val;
    }
  } else if (subPixelOption === "hinted") {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] >= 128) {
        data[i]   = Math.min(255, Math.round(data[i] / 64) * 64);
        data[i+1] = Math.min(255, Math.round(data[i+1] / 64) * 64);
        data[i+2] = Math.min(255, Math.round(data[i+2] / 64) * 64);
      }
    }
  } else if (subPixelOption === "antialias") {
    for (let i = 0; i < data.length - 4; i += 4) {
      if (data[i + 3] >= 128 && data[i + 7] >= 128) {
        data[i]   = (data[i] + data[i+4]) / 2;
        data[i+1] = (data[i+1] + data[i+5]) / 2;
        data[i+2] = (data[i+2] + data[i+6]) / 2;
      }
    }
  } else if (subPixelOption === "nearestNeighbor") {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] >= 128) {
        data[i]   = data[i]   < 64 ? 0 : (data[i]   > 192 ? 255 : data[i]);
        data[i+1] = data[i+1] < 64 ? 0 : (data[i+1] > 192 ? 255 : data[i+1]);
        data[i+2] = data[i+2] < 64 ? 0 : (data[i+2] > 192 ? 255 : data[i+2]);
      }
    }
  } else if (subPixelOption === "smallAntiAliasing") {
    for (let i = 0; i < data.length - 4; i += 4) {
      if (data[i + 3] >= 128 && data[i + 7] >= 128) {
        data[i]   = (data[i]   * 0.75) + (data[i+4] * 0.25);
        data[i+1] = (data[i+1] * 0.75) + (data[i+5] * 0.25);
        data[i+2] = (data[i+2] * 0.75) + (data[i+6] * 0.25);
      }
    }
  }

  let outputHexArray = [];
  for (let y = 0; y < h; y++) {
    outputHexArray[y] = new Array(w);
  }

  // --- MODE: SOLID COLOR MATCHING ---
  if (mode === "solid") {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let char = "0";
        if (data[idx + 3] >= 128) {
          const nIdx = findNearestColor(data[idx], data[idx + 1], data[idx + 2], rgbPalette);
          char = nIdx.toString(16);
        }
        outputHexArray[y][x] = char;

        const outIdx = (y * w + x) * 4;
        if (char === "0") {
          outImgData.data[outIdx+3] = 0;
        } else {
          const palColor = rgbPalette[parseInt(char, 16) - 1];
          outImgData.data[outIdx] = palColor.r;
          outImgData.data[outIdx+1] = palColor.g;
          outImgData.data[outIdx+2] = palColor.b;
          outImgData.data[outIdx+3] = 255;
        }
      }
      
      if (y % 5 === 0 || y === h - 1) {
        let currentProgress = Math.round((y / h) * 100);
        await onProgress(currentProgress, outImgData);
      }
    }
  }

  // --- MODE: FLOYD-STEINBERG ERROR DIFFUSION (แก้ไขจุดบัคสีแหว่งมุมขวาล่าง) ---
  if (mode === "error") {
    let sBuf = new Float32Array(data);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let char = "0";

        if (sBuf[idx + 3] >= 128) {
          //ทำการ Clamp ค่าสีดั้งเดิมให้อยู่ระหว่าง 0 ถึง 255 ป้องกันค่าติดลบหรือทะลุขอบ
          const oldR = Math.max(0, Math.min(255, sBuf[idx]));
          const oldG = Math.max(0, Math.min(255, sBuf[idx + 1]));
          const oldB = Math.max(0, Math.min(255, sBuf[idx + 2]));

          const nIdx = findNearestColor(oldR, oldG, oldB, rgbPalette);
          char = nIdx.toString(16);

          const targetColor = rgbPalette[nIdx - 1];
          const errR = oldR - targetColor.r;
          const errG = oldG - targetColor.g;
          const errB = oldB - targetColor.b;

          // กระจายค่า Error ไปยังพิกเซลรอบๆ อย่างปลอดภัย
          if (x + 1 < w) {
            const nData = (y * w + (x + 1)) * 4;
            sBuf[nData] += errR * 7 / 16; sBuf[nData+1] += errG * 7 / 16; sBuf[nData+2] += errB * 7 / 16;
          }
          if (x - 1 >= 0 && y + 1 < h) {
            const nData = ((y + 1) * w + (x - 1)) * 4;
            sBuf[nData] += errR * 3 / 16; sBuf[nData+1] += errG * 3 / 16; sBuf[nData+2] += errB * 3 / 16;
          }
          if (y + 1 < h) {
            const nData = ((y + 1) * w + x) * 4;
            sBuf[nData] += errR * 5 / 16; sBuf[nData+1] += errG * 5 / 16; sBuf[nData+2] += errB * 5 / 16;
          }
          if (x + 1 < w && y + 1 < h) {
            const nData = ((y + 1) * w + (x + 1)) * 4;
            sBuf[nData] += errR * 1 / 16; sBuf[nData+1] += errG * 1 / 16; sBuf[nData+2] += errB * 1 / 16;
          }
        }

        outputHexArray[y][x] = char;
        const outIdx = (y * w + x) * 4;
        if (char === "0") {
          outImgData.data[outIdx+3] = 0;
        } else {
          const palColor = rgbPalette[parseInt(char, 16) - 1];
          outImgData.data[outIdx] = palColor.r;
          outImgData.data[outIdx+1] = palColor.g;
          outImgData.data[outIdx+2] = palColor.b;
          outImgData.data[outIdx+3] = 255;
        }
      }

      if (y % 5 === 0 || y === h - 1) {
        let currentProgress = Math.round((y / h) * 100);
        await onProgress(currentProgress, outImgData);
      }
    }
  }

  // --- MODE: ORDERED BAYER MATRIX 4X4 DIFFUSION ---
  if (mode === "bayer") {
    const bayer = [
      [ 0, 12,  3, 15],
      [ 8,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];
    const spread = 48; 
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        let char = "0";
        if (data[idx + 3] >= 128) {
          const bayerValue = bayer[y % 4][x % 4];
          const factor = (bayerValue / 16) - 0.5;
          
          let r = data[idx] + factor * spread;
          let g = data[idx+1] + factor * spread;
          let b = data[idx+2] + factor * spread;

          const nIdx = findNearestColor(r, g, b, rgbPalette);
          char = nIdx.toString(16);
        }
        
        outputHexArray[y][x] = char;

        const outIdx = (y * w + x) * 4;
        if (char === "0") {
          outImgData.data[outIdx+3] = 0;
        } else {
          const palColor = rgbPalette[parseInt(char, 16) - 1];
          outImgData.data[outIdx] = palColor.r;
          outImgData.data[outIdx+1] = palColor.g;
          outImgData.data[outIdx+2] = palColor.b;
          outImgData.data[outIdx+3] = 255;
        }
      }

      if (y % 5 === 0 || y === h - 1) {
        let currentProgress = Math.round((y / h) * 100);
        await onProgress(currentProgress, outImgData);
      }
    }
  }

  // แปลงผลลัพธ์เป็นโครงสร้างโค้ดเมทริกซ์แบบ MakeCode Arcade แท้
  let resultStr = `img\`\n`;
  for (let y = 0; y < h; y++) {
    resultStr += outputHexArray[y].join("") + "\n";
  }
  resultStr += `\``;

  return resultStr;
}
