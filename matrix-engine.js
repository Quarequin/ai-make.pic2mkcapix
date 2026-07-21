// matrix-engine.js — CPU PixelArt Conversion Engine (Optimized)
// Modular pipeline: each dithering mode is a standalone function.
// Pre-computed Bayer & Blue Noise matrices embedded for zero runtime overhead.

const HEX_TABLE = "0123456789ABCDEF";
const B32_TABLE = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const B64_TABLE = "0123456789ABCDEFGHJKMNPQRSTVWXYZabcdefghjkmnpqrstvwxyz#&@%$?^:+/";

const clamp = (val) => val < 0 ? 0 : (val > 255 ? 255 : val);

// ============================================================
// PRE-COMPUTED BAYER MATRICES (Classical)
// ============================================================
const BAYER4 = new Uint8Array([
	0, 8, 2, 10,
	12, 4, 14, 6,
	3, 11, 1, 9,
	15, 7, 13, 5
]);

const BAYER8 = new Uint8Array([
	0, 32, 8, 40, 2, 34, 10, 42,
	48, 16, 56, 24, 50, 18, 58, 26,
	12, 44, 4, 36, 14, 46, 6, 38,
	60, 28, 52, 20, 62, 30, 54, 22,
	3, 35, 11, 43, 1, 33, 9, 41,
	51, 19, 59, 27, 49, 17, 57, 25,
	15, 47, 7, 39, 13, 45, 5, 37,
	63, 31, 55, 23, 61, 29, 53, 21
]);

const BAYER16 = new Uint8Array([
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
]);

// ============================================================
// PRE-COMPUTED BLUE NOISE MATRICES
// ============================================================
const BLUE8 = new Uint8Array([
	141, 186, 149, 52, 101, 182, 137, 105,
	170, 113, 206, 20, 242, 153, 202, 246,
	64, 222, 80, 32, 117, 12, 89, 40,
	16, 48, 161, 210, 178, 60, 24, 0,
	230, 93, 250, 145, 72, 234, 190, 109,
	56, 4, 121, 198, 157, 125, 36, 214,
	68, 8, 44, 174, 133, 255, 85, 28,
	226, 97, 238, 76, 218, 129, 194, 165
]);

const BLUE16 = new Uint8Array([
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

const BLUE32 = new Uint8Array([
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
// COLOR MATCHING ENGINE
// ============================================================
export function findNearestColor(r, g, b, rgbPalette) {
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

export function exportAscii(indexMap, w, h, rgbPalette, charsetKey, asciiCols) {
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
				const r = clamp(data[srcIdx]     + carryR + factor * spread);
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
				const r = clamp(data[srcIdx]     + carryR + factor * spread);
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
export async function runConversionPipeline({ data, w, h, mode, subPixelOption, rgbPalette, outImgData, onProgress }) {
	const totalPx4 = data.length;
	const colorCount = rgbPalette.length;
	const tmpTable = colorCount > B32_TABLE.length ? B64_TABLE : (colorCount > HEX_TABLE.length ? B32_TABLE : HEX_TABLE);
	const progressInterval = Math.max(Math.E*0.1618, h / 24);

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
