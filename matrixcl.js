// matrixcl.js — CPU PixelArt Conversion Engine (Optimized)
// Modular pipeline: each dithering mode is a standalone function.
// Pre-computed Bayer & Blue Noise matrices embedded for zero runtime overhead.

const clamp = (val) => val < 0 ? 0 : (val > 255 ? 255 : val);

// ============================================================
// COLOR MATCHING ENGINE
// ============================================================
/*export*/ function findNearestColor(r, g, b, rgbPalette) {
	let minDist = Infinity, nearestIndex = 1;
	const len = rgbPalette.length;
	for (let i = 1; i < len; i++) {
		const p = rgbPalette[i];
		const dr = r - p.r, dg = g - p.g, db = b - p.b;
		const dist = dr * dr + dg * dg + db * db;
		if (dist < minDist) {
			minDist = dist;
			nearestIndex = i;
			if (dist === 0) break;
		}
	}
	return nearestIndex;
}

function cachedFindNearest(r, g, b, rgbPalette, cache) {
	const key = ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
	let idx = cache.get(key);
	if (idx === undefined) {
		idx = findNearestColor(r, g, b, rgbPalette);
		cache.set(key, idx);
	}
	return idx;
}

// ============================================================
// ASCII EXPORT ENGINE
// ============================================================
const ASCII_CHARSETS = {
	standard: [' ', '·', '░', '▒', '▓', '█', '■', '▪', '●', '#', '@'],
	block:	[' ', '·', '░', '▒', '▓', '█'],
	alphanumeric: [' ', '.', ':', 'i', 'l', 'c', 'o', 'v', 'x', 'X', 'M', 'W', '#', '&', '@'],
	minimal:	[' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'],
	dense:	" .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$".split('')
};

/*export*/ function exportAscii(indexMap, w, h, rgbPalette, charsetKey, asciiCols) {
	const chars = ASCII_CHARSETS[charsetKey] || ASCII_CHARSETS.standard;
	const maxLevels = chars.length - 1;
	const colCount = Math.min(asciiCols, w);
	const charW = w / colCount;
	const charH = charW * 2;
	const rowCount = Math.max(1, Math.round(h / charH));
	let result = '';

	for (let row = 0; row < rowCount; row++) {
		let line = '';
		for (let col = 0; col < colCount; col++) {
			const x0 = (col * charW) | 0;
			const y0 = (row * charH) | 0;
			const x1 = Math.min(w, Math.ceil((col + 1) * charW));
			const y1 = Math.min(h, Math.ceil((row + 1) * charH));
			let totalLum = 0, count = 0, hasOpaque = false;

			for (let py = y0; py < y1; py++) {
				const rowOff = py * w;
				for (let px = x0; px < x1; px++) {
					const pIdx = indexMap[rowOff + px];
					if (pIdx !== 0) {
						const c = rgbPalette[pIdx];
						totalLum += 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
						hasOpaque = true;
					}
					count++;
				}
			}

			if (!hasOpaque) {
				line += ' ';
				continue;
			}
			const avgLum = count > 0 ? totalLum / count : 0;
			const charIdx = Math.round((avgLum / 255) * maxLevels);
			line += chars[charIdx];
		}
		result += line + '\n';
	}
	return result;
}

// ============================================================
// SUB-PIXEL PRE-PROCESSING
// ============================================================
function applySubpixel(data, totalPx4, subPixelOption, paletteLen) {
	if (subPixelOption === "solidIndexing") {
		const step = 255 / (paletteLen - 1 || 15), invStep = 1 / step;
		for (let i = 0; i < totalPx4; i += 4) {
			if (data[i + 3] >= 128) {
				data[i]	 = Math.min(255, Math.round(Math.round(data[i]	 * invStep) * step));
				data[i + 1] = Math.min(255, Math.round(Math.round(data[i + 1] * invStep) * step));
				data[i + 2] = Math.min(255, Math.round(Math.round(data[i + 2] * invStep) * step));
			}
		}
	} else if (subPixelOption === "hinted") {
		for (let i = 0; i < totalPx4; i += 4) {
			if (data[i + 3] >= 128) {
				data[i]	 = Math.min(255, Math.round(data[i]	 * 0.015625) * 64);
				data[i + 1] = Math.min(255, Math.round(data[i + 1] * 0.015625) * 64);
				data[i + 2] = Math.min(255, Math.round(data[i + 2] * 0.015625) * 64);
			}
		}
	} else if (subPixelOption === "antialias") {
		for (let i = 0; i < totalPx4 - 4; i += 4) {
			if (data[i + 3] >= 128 && data[i + 7] >= 128) {
				data[i]	 = (data[i]	 + data[i + 4]) >> 1;
				data[i + 1] = (data[i + 1] + data[i + 5]) >> 1;
				data[i + 2] = (data[i + 2] + data[i + 6]) >> 1;
			}
		}
	} else if (subPixelOption === "nearestNeighbor") {
		for (let i = 0; i < totalPx4; i += 4) {
			if (data[i + 3] >= 128) {
				data[i]	 = data[i]	 < 64 ? 0 : (data[i]	 > 192 ? 255 : data[i]);
				data[i + 1] = data[i + 1] < 64 ? 0 : (data[i + 1] > 192 ? 255 : data[i + 1]);
				data[i + 2] = data[i + 2] < 64 ? 0 : (data[i + 2] > 192 ? 255 : data[i + 2]);
			}
		}
	} else if (subPixelOption === "smallAntiAliasing") {
		for (let i = 0; i < totalPx4 - 4; i += 4) {
			if (data[i + 3] >= 128 && data[i + 7] >= 128) {
				data[i]	 = (data[i]	 * 0.75 + data[i + 4] * 0.25) | 0;
				data[i + 1] = (data[i + 1] * 0.75 + data[i + 5] * 0.25) | 0;
				data[i + 2] = (data[i + 2] * 0.75 + data[i + 6] * 0.25) | 0;
			}
		}
	}
}

// ============================================================
// ROW STRING BUILDER (shared)
// ============================================================
function buildRowString(y, w, indexMap, outData, rgbPalette, tmpTable) {
	const rowBase = y * w;
	let rowStr = "";
	for (let x = 0; x < w; x++) {
		const pi = rowBase + x;
		const idx = indexMap[pi];
		rowStr += tmpTable[idx];
		const outIdx = pi << 2;
		if (idx === 0) {
			outData[outIdx] = 0; outData[outIdx + 1] = 0;
			outData[outIdx + 2] = 0; outData[outIdx + 3] = 0;
		} else {
			const c = rgbPalette[idx];
			outData[outIdx] = c.r; outData[outIdx + 1] = c.g;
			outData[outIdx + 2] = c.b; outData[outIdx + 3] = c.a !== undefined ? c.a : 255;
		}
	}
	return rowStr + "\n";
}

// ============================================================
// DITHERING MODULES (modular — each is a standalone function)
// ============================================================

// ---- SOLID (no dithering) ----
async function modeSolid(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval) {
	const indexMap = new Uint8Array(w * h);
	const cache = new Map();
	let partialStr = "img`\n";
	for (let y = 0; y < h; y++) {
		const rowBase = y * w;
		for (let x = 0; x < w; x++) {
			const px = rowBase + x, srcIdx = px << 2;
			if (data[srcIdx + 3] >= 128) {
				indexMap[px] = cachedFindNearest(data[srcIdx], data[srcIdx + 1], data[srcIdx + 2], rgbPalette, cache);
			}
		}
		partialStr += buildRowString(y, w, indexMap, outData, rgbPalette, tmpTable);
		if (y % progressInterval === 0 || y === h - 1) {
			await onProgress(((y + 1) * 100 / h).toFixed(4));
		}
	}
	return { hexString: partialStr + "`", indexMap };
}

// ---- ORDERED BAYER (enhanced with 1D error diffusion for smoother blending) ----
async function modeBayer(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, bayerMatrix, matrixSize) {
	const indexMap = new Uint8Array(w * h);
	const cache = new Map();
	const mask = matrixSize - 1;
	const invSizeSq = 1 / (matrixSize * matrixSize);
	const spread = 72; // Increased from 48 for stronger dithering blend
	let partialStr = "img`\n";
	for (let y = 0; y < h; y++) {
		const rowBase = y * w;
		const by = (y & mask) * matrixSize;
		let carryR = 0, carryG = 0, carryB = 0;
		const carryStrength = 0.6;
		for (let x = 0; x < w; x++) {
			const px = rowBase + x, srcIdx = px << 2;
			if (data[srcIdx + 3] >= 128) {
				const factor = (bayerMatrix[by + (x & mask)] * invSizeSq) - 0.5;
				const r = clamp(data[srcIdx]	 + carryR + factor * spread);
				const g = clamp(data[srcIdx + 1] + carryG + factor * spread);
				const b = clamp(data[srcIdx + 2] + carryB + factor * spread);
				indexMap[px] = cachedFindNearest(r, g, b, rgbPalette, cache);
				const tc = rgbPalette[indexMap[px]];
				carryR = (r - tc.r) * carryStrength;
				carryG = (g - tc.g) * carryStrength;
				carryB = (b - tc.b) * carryStrength;
			} else {
				carryR = carryG = carryB = 0;
			}
		}
		partialStr += buildRowString(y, w, indexMap, outData, rgbPalette, tmpTable);
		if (y % progressInterval === 0 || y === h - 1) {
			await onProgress(((y + 1) * 100 / h).toFixed(4));
		}
	}
	return { hexString: partialStr + "`", indexMap };
}

// ---- BLUE NOISE (enhanced with 1D error diffusion for smoother blending) ----
async function modeBlueNoise(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, noiseMatrix, matrixSize) {
	const indexMap = new Uint8Array(w * h);
	const cache = new Map();
	const mask = matrixSize - 1;
	const inv255 = 1 / 255;
	const spread = 80; // Increased from 52 for stronger dithering blend
	let partialStr = "img`\n";
	for (let y = 0; y < h; y++) {
		const rowBase = y * w;
		const ny = (y & mask) * matrixSize;
		let carryR = 0, carryG = 0, carryB = 0;
		const carryStrength = 0.6;
		for (let x = 0; x < w; x++) {
			const px = rowBase + x, srcIdx = px << 2;
			if (data[srcIdx + 3] >= 128) {
				const factor = (noiseMatrix[ny + (x & mask)] * inv255) - 0.5;
				const r = clamp(data[srcIdx]	 + carryR + factor * spread);
				const g = clamp(data[srcIdx + 1] + carryG + factor * spread);
				const b = clamp(data[srcIdx + 2] + carryB + factor * spread);
				indexMap[px] = cachedFindNearest(r, g, b, rgbPalette, cache);
				const tc = rgbPalette[indexMap[px]];
				carryR = (r - tc.r) * carryStrength;
				carryG = (g - tc.g) * carryStrength;
				carryB = (b - tc.b) * carryStrength;
			} else {
				carryR = carryG = carryB = 0;
			}
		}
		partialStr += buildRowString(y, w, indexMap, outData, rgbPalette, tmpTable);
		if (y % progressInterval === 0 || y === h - 1) {
			await onProgress(((y + 1) * 100 / h).toFixed(4));
		}
	}
	return { hexString: partialStr + "`", indexMap };
}

// ---- FLOYD-STEINBERG ERROR DIFFUSION ----
async function modeFloydSteinberg(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval) {
	const indexMap = new Uint8Array(w * h);
	const sBuf = new Float32Array(data);
	const cache = new Map();
	const inv16 = 1 / 16;
	let partialStr = "img`\n";
	for (let y = 0; y < h; y++) {
		const rowBase = y * w;
		for (let x = 0; x < w; x++) {
			const px = rowBase + x, idx = px << 2;
			if (sBuf[idx + 3] >= 128) {
				const oldR = clamp(sBuf[idx]), oldG = clamp(sBuf[idx + 1]), oldB = clamp(sBuf[idx + 2]);
				const nIdx = cachedFindNearest(oldR, oldG, oldB, rgbPalette, cache);
				indexMap[px] = nIdx;
				const tc = rgbPalette[nIdx];
				const errR = oldR - tc.r, errG = oldG - tc.g, errB = oldB - tc.b;
				if (x + 1 < w) {
					sBuf[idx + 4] += errR * 7 * inv16;
					sBuf[idx + 5] += errG * 7 * inv16;
					sBuf[idx + 6] += errB * 7 * inv16;
				}
				if (y + 1 < h) {
					if (x - 1 >= 0) {
						const n2 = ((y + 1) * w + (x - 1)) << 2;
						sBuf[n2]	 += errR * 3 * inv16;
						sBuf[n2 + 1] += errG * 3 * inv16;
						sBuf[n2 + 2] += errB * 3 * inv16;
					}
					const n3 = ((y + 1) * w + x) << 2;
					sBuf[n3]	 += errR * 5 * inv16;
					sBuf[n3 + 1] += errG * 5 * inv16;
					sBuf[n3 + 2] += errB * 5 * inv16;
					if (x + 1 < w) {
						const n4 = ((y + 1) * w + (x + 1)) << 2;
						sBuf[n4]	 += errR * inv16;
						sBuf[n4 + 1] += errG * inv16;
						sBuf[n4 + 2] += errB * inv16;
					}
				}
			}
		}
		partialStr += buildRowString(y, w, indexMap, outData, rgbPalette, tmpTable);
		if (y % progressInterval === 0 || y === h - 1) {
			await onProgress(((y + 1) * 100 / h).toFixed(4));
		}
	}
	return { hexString: partialStr + "`", indexMap };
}

// ============================================================
// MAIN PIPELINE ROUTER
// ============================================================
/*export*/ async function runConversionPipeline({ data, w, h, mode, subPixelOption, rgbPalette, outImgData, onProgress }) {
	const totalPx4 = data.length;
	const colorCount = rgbPalette.length;
	const tmpTable = CHAR_TABLE; //colorCount > B32_TABLE.length ? B64_TABLE : (colorCount > HEX_TABLE.length ? B32_TABLE : HEX_TABLE);
	const progressInterval = 1 + (Math.sqrt(h + w) * (h / w)) | 0;

	applySubpixel(data, totalPx4, subPixelOption, colorCount);

	const outData = outImgData.data;

	switch (mode) {
		case "solid":
			return await modeSolid(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval);
		case "bayer4":
			return await modeBayer(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, BAYER4, 4);
		case "bayer8":
			return await modeBayer(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, BAYER8, 8);
		case "bayer16":
			return await modeBayer(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, BAYER16, 16);
		case "blue8":
			return await modeBlueNoise(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, BLUE8, 8);
		case "blue16":
			return await modeBlueNoise(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, BLUE16, 16);
		case "blue32":
			return await modeBlueNoise(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval, BLUE32, 32);
		case "error":
			return await modeFloydSteinberg(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval);
		default:
			return await modeSolid(data, w, h, rgbPalette, outData, onProgress, tmpTable, progressInterval);
	}
}
