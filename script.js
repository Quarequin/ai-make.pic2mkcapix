//script/init/htm.js
document.querySelector("body").insertAdjacentHTML("beforeend", `
<div id="page-loader">
	<h1>Convert Picture to Makecode-arcade or Pixel-art</h1>
	<br />
	<div class="loader-content">
		<div class="loader-spinner"></div>
		<div class="loader-text">Loading Page...</div>
		<div class="loader-sub">Preparing Picture Converter Engine.</div>
	</div>
</div>
<div id="info">
	<p>
		Upload your image to convert it into pixel art — with optional ASCII
		output and a fully customizable dynamic color palette.
	</p>
	<hr />
	<dl>
		<dt>note for makecode arcade user:</dt>
		<dd>15 palette colors for <i>makecode arcade</i> compatibility.</dd>
		<dt>note for anti-ai user:</dt>
		<dd>
			this page use <i>ai</i> to make project but you can fork this to
			make as human code sorry.
		</dd>
	</dl>
	<div id="notification-popup-overlay">
		<div class="popup-error-card">
			<div class="popup-header">
				<span>⚠️ PROCESS EXCEPTION DETECTED</span
				><button class="popup-close-btn" id="popup-close-btn">
					DISMISS
				</button>
			</div>
			<div class="popup-body">
				<p style="margin: 0 0 6px 0">
					<strong>Error Type:</strong
					><span id="popup-err-type">N/A</span>
				</p>
				<p style="margin: 0 0 10px 0">
					<strong>Message:</strong
					><span id="popup-err-message">N/A</span>
				</p>
				<div class="popup-controls">
					<button class="popup-toggle-btn" id="btn-toggle-log">
						Show Full Log ▼
					</button>
				</div>
				<textarea id="popup-err-stack" readonly>
No trace details available.</textarea>
			</div>
		</div>
	</div>
</div>
<div id="status">System Status: Awaiting Image Upload Asset...</div>
<label>Select Target Source Image:</label><input type="file" id="file" />
<form action="#" method="POST" id="parameters">
	<div class="settings-group">
		<div class="half">
			<div class="size-settings-grid">
				<label class="full-row"
					><input
						type="radio"
						name="resize"
						id="original-size"
						checked
						disabled
					/>
					Original Size</label
				><label class="full-row"
					><input
						type="radio"
						name="resize"
						id="full-width"
						disabled
					/>
					Fix Sprite Width (160px)</label
				><label class="full-row"
					><input
						type="radio"
						name="resize"
						id="full-height"
						disabled
					/>
					Fix Sprite Height (120px)</label
				><label class="full-row"
					><input type="radio" name="resize" id="scale" disabled />
					Custom Size</label
				><label style="padding-left: 20px">Scale Factor:</label
				><input
					type="number"
					id="factor"
					value=""
					step="0.1e-9"
					min="0.1e-9"
					max="8"
					disabled
				/><label
					class="full-row"
					style="
						border-top: 1px solid #222;
						margin-top: 8px;
						padding-top: 12px;
					"
					><input type="checkbox" id="ratio" checked disabled /> Keep
					Original Aspect Ratio </label
				><label>Output Width (px):</label
				><input
					type="number"
					id="width"
					value=""
					disabled
					class="custom"
				/><label>Output Height (px):</label
				><input
					type="number"
					id="height"
					value=""
					disabled
					class="custom"
				/>
			</div>
			<div class="dropdown-selection-group">
				<label for="mode-select" class="dropdown-label"
					>Render Options (Dithering Method):</label
				><select id="mode-select" class="custom-dropdown">
					<option value="solid" selected>Solid (No Dithering)</option>
					<optgroup label="Ordered Dithering (Bayer)">
						<option value="bayer4">Bayer Matrix 4×4</option>
						<option value="bayer8">Bayer Matrix 8×8</option>
						<option value="bayer16">Bayer Matrix 16×16</option>
					</optgroup>
					<optgroup label="Blue Noise Dithering">
						<option value="blue8">Blue Noise 8×8</option>
						<option value="blue16">Blue Noise 16×16</option>
						<option value="blue32">Blue Noise 32×32</option>
					</optgroup>
					<optgroup label="Error Diffusion" id="optgroup-error">
						<option value="error">
							Floyd-Steinberg Error Diffusion
						</option>
					</optgroup>
				</select>
				<hr />
				<label for="subpixel-select" class="dropdown-label"
					>Sub-pixel &amp; Edge Enhancement Options:</label
				><select id="subpixel-select" class="custom-dropdown">
					<optgroup label="Aliasing">
						<option value="none" selected>
							None (Standard Pixel Mapping)
						</option>
						<option value="solidIndexing">
							Solid Indexing — Linear Encludien (Crisp, No Blur)
						</option>
						<option value="nearestNeighbor">
							Nearest Neighbor Sharp Alignment
						</option>
					</optgroup>
					<optgroup label="Anti Aliasing">
						<option value="hinted">
							Grid-Aligned Pixel Hinting (Font-Style)
						</option>
						<option value="antialias">
							Anti-Aliasing Smoothing Blend
						</option>
						<option value="smallAntiAliasing">
							Small-scale Anti-Aliasing (Micro Blur)
						</option>
					</optgroup>
				</select>
				<hr />
				<div id="ascii-options-group">
					<label class="dropdown-label"
						>ASCII Art Output Options:</label
					><label class="full-row"
						><input type="checkbox" id="ascii-enable" /> Enable
						ASCII Output (in Output Tab)
					</label>
					<div
						id="ascii-sub-options"
						style="display: none; margin-top: 8px"
					>
						<label
							for="ascii-charset-select"
							class="dropdown-label"
							style="margin-top: 8px"
							>ASCII Character Set:</label
						><select
							id="ascii-charset-select"
							class="custom-dropdown"
						>
							<option value="standard">
								Standard (█▓▒░ + Symbols)
							</option>
							<option value="block">
								Block Only (█ ▓ ▒ ░ ·)
							</option>
							<option value="alphanumeric">
								Alphanumeric (A-Z, 0-9)
							</option>
							<option value="minimal">
								Minimal ( .:-=+*#%@)
							</option>
							<option value="dense">
								Dense (Full Printable ASCII)
							</option></select
						><label for="ascii-width-input" style="margin-top: 8px"
							>ASCII Columns:</label
						><input
							type="number"
							id="ascii-width-input"
							value="80"
							min="10"
							max="400"
							class="custom"
						/>
					</div>
				</div>
				<hr />
				<label class="dropdown-label">Processing Engine:</label
				><select id="engine-select" class="custom-dropdown">
					<option value="cpu" selected>CPU (JavaScript)</option>
					<option value="gpu">GPU (WebGL)</option>
				</select>
			</div>
		</div>
		<div class="colorboard">
			<div class="palette-loader-container">
				<label for="predefined-palette-select"
					>Select Predefined Palette:</label
				><select
					id="predefined-palette-select"
					class="custom-dropdown"
					style="margin-bottom: 10px"
				>
					<option value="custom" class="hidden">Custom</option>
					<optgroup label="Makecode Arcade">
						<option value="arcade" selected>Arcade</option>
						<option value="matte">Matte</option>
						<option value="pastel">Pastel</option>
						<option value="sweet">Sweet</option>
						<option value="poke">Poke</option>
						<option value="adventure">Adventure</option>
						<option value="diy">DIY</option>
						<option value="adafruit">Adafruit</option>
						<option value="still_life">Still Life</option>
						<option value="steam_punk">Steam Punk</option>
						<option value="grayscale">Grayscale</option>
					</optgroup></select
				><label>Import Custom Palette File (.txt, .hex):</label
				><input
					type="file"
					id="palette-file-reader"
					accept=".txt,.hex"
				/>
			</div>
			<div class="palette-header-row">
				<span
					style="font-weight: bold; color: rgb(255, 240, 157)"
					id="palette-count-label"
					>Active Color Registers (1–15):</span
				>
				<div class="palette-action-btns">
					<button
						type="button"
						id="palette-add-btn"
						class="palette-slot-btn"
						title="Add Color Slot"
					>
						+ Add Slot</button
					><button
						type="button"
						id="palette-remove-btn"
						class="palette-slot-btn"
						title="Remove Last Slot"
					>
						- Remove
					</button>
				</div>
			</div>
			<div class="colorpad" id="colorpad">
				<div class="color-pair">
					<label>Color 1</label
					><input type="color" value="#ffffff" /><input
						type="text"
						class="colortext"
						value="#ffffff"
					/>
				</div>
				<div class="color-pair">
					<label>Color 2</label
					><input type="color" value="#ff2121" /><input
						type="text"
						class="colortext"
						value="#ff2121"
					/>
				</div>
				<div class="color-pair">
					<label>Color 3</label
					><input type="color" value="#ff93c4" /><input
						type="text"
						class="colortext"
						value="#ff93c4"
					/>
				</div>
				<div class="color-pair">
					<label>Color 4</label
					><input type="color" value="#ff8135" /><input
						type="text"
						class="colortext"
						value="#ff8135"
					/>
				</div>
				<div class="color-pair">
					<label>Color 5</label
					><input type="color" value="#fff609" /><input
						type="text"
						class="colortext"
						value="#fff609"
					/>
				</div>
				<div class="color-pair">
					<label>Color 6</label
					><input type="color" value="#249ca3" /><input
						type="text"
						class="colortext"
						value="#249ca3"
					/>
				</div>
				<div class="color-pair">
					<label>Color 7</label
					><input type="color" value="#78dc52" /><input
						type="text"
						class="colortext"
						value="#78dc52"
					/>
				</div>
				<div class="color-pair">
					<label>Color 8</label
					><input type="color" value="#003fad" /><input
						type="text"
						class="colortext"
						value="#003fad"
					/>
				</div>
				<div class="color-pair">
					<label>Color 9</label
					><input type="color" value="#87f2ff" /><input
						type="text"
						class="colortext"
						value="#87f2ff"
					/>
				</div>
				<div class="color-pair">
					<label>Color 10</label
					><input type="color" value="#8e2ec4" /><input
						type="text"
						class="colortext"
						value="#8e2ec4"
					/>
				</div>
				<div class="color-pair">
					<label>Color 11</label
					><input type="color" value="#a4839f" /><input
						type="text"
						class="colortext"
						value="#a4839f"
					/>
				</div>
				<div class="color-pair">
					<label>Color 12</label
					><input type="color" value="#5c406c" /><input
						type="text"
						class="colortext"
						value="#5c406c"
					/>
				</div>
				<div class="color-pair">
					<label>Color 13</label
					><input type="color" value="#e5cdc4" /><input
						type="text"
						class="colortext"
						value="#e5cdc4"
					/>
				</div>
				<div class="color-pair">
					<label>Color 14</label
					><input type="color" value="#91463d" /><input
						type="text"
						class="colortext"
						value="#91463d"
					/>
				</div>
				<div class="color-pair">
					<label>Color 15</label
					><input type="color" value="#000000" /><input
						type="text"
						class="colortext"
						value="#000000"
					/>
				</div>
			</div>
		</div>
	</div>
	<div class="action-buttons">
		<button id="run" type="submit" disabled>Convert Image</button
		><button id="copy" type="button" disabled>Download Text</button
		><button id="download" type="button" disabled>Download Image</button>
	</div>
</form>
<div class="image-preview-container">
	<div class="preview-box">
		<h3>Original Input</h3>
		<div id="original-res" class="resolution-info">Size: 0 x 0</div>
		<div id="original-preview-zone"></div>
	</div>
	<div class="preview-box">
		<h3>Canvas Output</h3>
		<div id="canvas-res" class="resolution-info">Size: 0 x 0</div>
		<div class="output">
			<img
				id="output-image"
				alt="Processed image output"
				aria-hidden="true"
				style="
					width: 100%;
					height: auto;
					object-fit: contain;
					image-rendering: pixelated;
					background-image:
						linear-gradient(45deg, #222 25%, transparent 25%),
						linear-gradient(-45deg, #222 25%, transparent 25%),
						linear-gradient(45deg, transparent 75%, #222 75%),
						linear-gradient(-45deg, transparent 75%, #222 75%);
					background-size: 10px 10px;
					background-position:
						0 0,
						0 5px,
						5px -5px,
						-5px 0px;
					background-color: #151515;
					border-radius: 4px;
					padding: 5px;
					margin: 0 auto;
					display: block;
					visibility: hidden;
				"
			/>
		</div>
	</div>
</div>
<canvas
	id="process-canvas"
	aria-hidden="true"
	style="
		display: block;
		position: absolute;
		margin-left: -100000px;
		margin-top: -100000px;
		width: 1px;
		height: 1px;
		max-width: 1px;
		max-height: 1px;
		box-sizing: border-box;
		padding: 0;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	"
></canvas>
<div class="output-tabs" id="output-tabs">
	<button class="tab-btn active" data-tab="pixelart">
		PixelArt / MakeCode String</button
	><button class="tab-btn" data-tab="ascii" id="ascii-tab-btn" disabled>
		ASCII Output
	</button>
</div>
<div id="tab-pixelart" class="tab-panel active">
	<textarea
		id="output"
		placeholder="The pixel art hex matrix string will be generated here..."
		readonly
	></textarea>
</div>
<div id="tab-ascii" class="tab-panel">
	<textarea
		id="ascii-output"
		placeholder="ASCII art output will appear here after conversion with ASCII mode enabled..."
		readonly
	></textarea>
</div>
`);
//end
//script/init/error.js
!function() {
	const e = e => document.getElementById(e), o = e("notification-popup-overlay");
	function n(n, t, r) {
		e("popup-err-type").textContent = n || "Runtime Error", e("popup-err-message").textContent = t || "Unknown error.", 
		e("popup-err-stack").value = r || "No call stack trace records.", e("popup-err-stack").style.display = "none", 
		e("btn-toggle-log").textContent = "Show Full Log ▼", o && (o.style.display = "block");
	}
	function t() {
		const o = e("popup-err-stack"), n = "none" === o.style.display || !o.style.display;
		o.style.display = n ? "block" : "none", e("btn-toggle-log").textContent = n ? "Hide Full Log ▲" : "Show Full Log ▼";
	}
	function r() {
		o && (o.style.display = "none");
	}
	window.displayErrorPopup = n, window.toggleErrorLog = t, window.closeErrorPopup = r, 
	e("popup-close-btn")?.addEventListener("click", r), e("btn-toggle-log")?.addEventListener("click", t), 
	window.addEventListener("error", e => n("Uncaught Runtime Exception", e.message, e.error?.stack)), 
	window.addEventListener("unhandledrejection", e => {
		const o = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
		n("Unhandled Promise Rejection", o.message, o.stack);
	});
}();
//end
//script/init/section.js
const CHAR_TABLE = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/#", BAYER4_SRC = [ 0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5 ], BAYER8_SRC = [ 0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21 ], BAYER16_SRC = [ 0, 128, 32, 160, 8, 136, 40, 168, 2, 130, 34, 162, 10, 138, 42, 170, 192, 64, 224, 96, 200, 72, 232, 104, 194, 66, 226, 98, 202, 74, 234, 106, 48, 176, 16, 144, 56, 184, 24, 152, 50, 178, 18, 146, 58, 186, 26, 154, 240, 112, 208, 80, 248, 120, 216, 88, 242, 114, 210, 82, 250, 122, 218, 90, 12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166, 204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102, 60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150, 252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86, 3, 131, 35, 163, 11, 139, 43, 171, 1, 129, 33, 161, 9, 137, 41, 169, 195, 67, 227, 99, 203, 75, 235, 107, 193, 65, 225, 97, 201, 73, 233, 105, 51, 179, 19, 147, 59, 187, 27, 155, 49, 177, 17, 145, 57, 185, 25, 153, 243, 115, 211, 83, 251, 123, 219, 91, 241, 113, 209, 81, 249, 121, 217, 89, 15, 143, 47, 175, 7, 135, 39, 167, 13, 141, 45, 173, 5, 133, 37, 165, 207, 79, 239, 111, 199, 71, 231, 103, 205, 77, 237, 109, 197, 69, 229, 101, 63, 191, 31, 159, 55, 183, 23, 151, 61, 189, 29, 157, 53, 181, 21, 149, 255, 127, 223, 95, 247, 119, 215, 87, 253, 125, 221, 93, 245, 117, 213, 85 ], BLUE8_SRC = [ 141, 186, 149, 52, 101, 182, 137, 105, 170, 113, 206, 20, 242, 153, 202, 246, 64, 222, 80, 32, 117, 12, 89, 40, 16, 48, 161, 210, 178, 60, 24, 0, 230, 93, 250, 145, 72, 234, 190, 109, 56, 4, 121, 198, 157, 125, 36, 214, 68, 8, 44, 174, 133, 255, 85, 28, 226, 97, 238, 76, 218, 129, 194, 165 ], BLUE16_SRC = [ 227, 141, 129, 236, 160, 134, 71, 30, 162, 235, 99, 209, 108, 192, 94, 155, 78, 190, 153, 53, 86, 224, 178, 148, 93, 42, 183, 144, 26, 73, 10, 41, 139, 3, 248, 115, 200, 13, 63, 249, 170, 126, 213, 56, 166, 232, 118, 204, 59, 220, 172, 112, 33, 154, 245, 88, 195, 14, 48, 104, 185, 6, 150, 80, 131, 241, 96, 21, 180, 70, 137, 22, 237, 84, 38, 202, 1, 67, 222, 122, 252, 46, 164, 128, 255, 107, 52, 191, 143, 218, 11, 158, 91, 176, 40, 207, 17, 110, 74, 233, 45, 198, 25, 120, 60, 247, 101, 29, 134, 50, 240, 168, 82, 197, 5, 187, 159, 77, 212, 35, 173, 8, 114, 69, 226, 147, 19, 94, 234, 136, 58, 181, 14, 92, 250, 44, 211, 132, 54, 193, 12, 86, 223, 105, 49, 171, 109, 28, 243, 125, 68, 156, 4, 182, 97, 36, 254, 151, 64, 216, 189, 31, 238, 83, 167, 47, 206, 116, 244, 17, 146, 79, 199, 42, 117, 230, 2, 161, 100, 19, 140, 221, 57, 185, 102, 72, 215, 10, 127, 253, 89, 178, 75, 208, 43, 251, 111, 6, 163, 34, 188, 129, 61, 239, 24, 165, 55, 196, 145, 27, 124, 95, 230, 152, 81, 246, 15, 113, 48, 175, 204, 37, 142, 9, 219, 66, 194, 18, 76, 135, 23, 106, 231, 51, 183, 7, 121, 247, 103, 214, 62, 169, 0, 149, 210, 87, 201, 39, 168, 98, 33, 158, 20, 228, 141, 184 ], BLUE32_SRC = [ 154, 181, 42, 20, 79, 34, 109, 18, 95, 135, 190, 84, 202, 128, 190, 68, 34, 1, 23, 84, 237, 70, 225, 144, 237, 165, 49, 102, 237, 109, 186, 70, 9, 116, 220, 248, 163, 253, 147, 212, 55, 245, 14, 167, 38, 57, 11, 233, 152, 197, 139, 174, 54, 122, 14, 92, 63, 13, 197, 180, 26, 142, 59, 217, 131, 204, 88, 52, 137, 101, 28, 194, 230, 119, 176, 244, 96, 214, 156, 46, 111, 81, 219, 32, 241, 160, 206, 132, 227, 120, 251, 89, 194, 5, 103, 168, 36, 173, 15, 229, 64, 185, 239, 73, 4, 50, 21, 126, 35, 78, 191, 138, 28, 149, 64, 113, 17, 72, 38, 177, 48, 155, 33, 67, 218, 161, 78, 21, 243, 105, 199, 58, 222, 12, 158, 91, 169, 201, 143, 59, 249, 17, 106, 223, 182, 95, 236, 6, 151, 100, 211, 10, 83, 201, 123, 242, 12, 133, 230, 47, 80, 41, 250, 124, 39, 171, 48, 134, 255, 110, 82, 188, 40, 129, 71, 195, 53, 164, 20, 127, 189, 44, 136, 254, 29, 172, 52, 107, 187, 94, 25, 209, 216, 145, 27, 183, 96, 235, 77, 19, 61, 226, 151, 8, 166, 93, 247, 31, 115, 75, 198, 58, 232, 81, 19, 117, 223, 41, 158, 76, 255, 57, 150, 114, 62, 232, 112, 7, 213, 53, 141, 203, 125, 37, 104, 197, 49, 179, 13, 85, 240, 46, 130, 243, 15, 169, 62, 146, 96, 181, 8, 199, 35, 126, 205, 88, 175, 2, 193, 66, 156, 30, 102, 247, 86, 173, 21, 68, 157, 221, 108, 194, 60, 153, 11, 87, 184, 128, 236, 51, 134, 220, 69, 148, 242, 16, 44, 179, 118, 229, 47, 139, 11, 224, 67, 181, 42, 250, 145, 33, 84, 6, 238, 74, 165, 101, 217, 43, 99, 24, 163, 79, 11, 252, 106, 31, 171, 83, 197, 121, 54, 161, 100, 255, 74, 189, 116, 5, 159, 97, 54, 210, 127, 45, 161, 29, 212, 56, 140, 191, 70, 208, 45, 190, 147, 60, 183, 224, 55, 140, 10, 236, 207, 23, 132, 81, 214, 46, 152, 231, 19, 136, 77, 186, 253, 118, 203, 52, 34, 123, 226, 5, 155, 37, 114, 234, 28, 95, 215, 40, 129, 249, 72, 165, 38, 187, 14, 172, 60, 129, 245, 108, 63, 204, 28, 92, 144, 67, 12, 176, 247, 91, 48, 170, 102, 250, 84, 6, 173, 131, 51, 199, 22, 104, 188, 53, 143, 68, 228, 93, 201, 38, 17, 78, 168, 113, 242, 56, 185, 230, 89, 41, 158, 22, 135, 59, 218, 141, 193, 122, 57, 246, 110, 80, 154, 37, 231, 98, 251, 122, 49, 195, 8, 166, 220, 44, 137, 2, 75, 149, 23, 105, 254, 147, 78, 204, 33, 116, 63, 180, 29, 159, 100, 21, 164, 235, 48, 213, 117, 7, 16, 177, 106, 34, 157, 85, 54, 192, 117, 234, 43, 162, 198, 61, 128, 19, 187, 49, 225, 94, 213, 46, 126, 205, 73, 145, 30, 112, 191, 62, 136, 219, 182, 65, 240, 13, 111, 203, 26, 91, 14, 179, 101, 38, 81, 172, 56, 221, 14, 168, 77, 151, 35, 108, 244, 17, 156, 88, 207, 42, 125, 254, 20, 96, 44, 209, 124, 50, 173, 7, 148, 63, 246, 120, 53, 209, 28, 143, 95, 34, 192, 115, 58, 230, 12, 185, 71, 138, 50, 241, 169, 28, 181, 74, 159, 46, 233, 28, 158, 86, 197, 36, 225, 131, 72, 19, 160, 247, 110, 64, 187, 252, 106, 44, 199, 82, 167, 54, 219, 97, 10, 196, 121, 64, 233, 8, 143, 111, 102, 55, 236, 19, 141, 250, 94, 43, 188, 83, 230, 15, 76, 155, 42, 128, 73, 161, 27, 113, 237, 129, 32, 176, 85, 218, 47, 153, 102, 194, 57, 248, 167, 78, 217, 60, 32, 115, 177, 57, 204, 134, 48, 171, 222, 9, 198, 61, 214, 136, 93, 181, 20, 63, 150, 242, 38, 127, 255, 70, 137, 29, 226, 84, 13, 194, 110, 147, 229, 68, 21, 165, 100, 38, 116, 195, 52, 140, 24, 83, 47, 172, 38, 248, 105, 200, 89, 25, 174, 58, 211, 95, 19, 166, 51, 123, 145, 42, 255, 92, 5, 183, 109, 237, 79, 155, 253, 69, 163, 237, 117, 45, 156, 29, 119, 68, 214, 48, 133, 61, 222, 145, 35, 189, 245, 108, 200, 75, 35, 172, 79, 21, 161, 54, 128, 46, 214, 12, 88, 146, 31, 102, 189, 254, 97, 184, 52, 227, 11, 163, 78, 236, 103, 30, 152, 81, 17, 132, 62, 238, 204, 118, 53, 198, 113, 244, 33, 191, 152, 67, 180, 41, 207, 74, 136, 21, 60, 141, 249, 16, 94, 128, 44, 191, 56, 220, 128, 194, 90, 247, 43, 156, 11, 230, 141, 37, 86, 18, 156, 96, 25, 123, 201, 58, 149, 232, 57, 166, 205, 79, 34, 117, 173, 55, 210, 123, 167, 12, 71, 185, 54, 116, 203, 31, 99, 64, 189, 246, 169, 76, 210, 139, 222, 49, 85, 173, 40, 115, 253, 88, 46, 151, 223, 62, 139, 2, 80, 158, 229, 97, 146, 38, 219, 177, 9, 68, 152, 25, 107, 14, 58, 193, 45, 235, 162, 106, 37, 154, 245, 18, 131, 72, 186, 101, 54, 193, 28, 115, 237, 49, 126, 213, 65, 251, 133, 40, 95, 182, 219, 82, 175, 128, 231, 3, 120, 71, 14, 199, 126, 61, 96, 179, 43, 210, 129, 17, 164, 88, 206, 70, 152, 34, 181, 57, 112, 29, 158, 224, 77, 144, 48, 201, 40, 91, 165, 134, 51, 187, 250, 92, 144, 28, 68, 151, 234, 57, 242, 125, 73, 195, 42, 129, 223, 91, 20, 138, 246, 84, 191, 53, 121, 0, 116, 56, 213, 30, 149, 80, 205, 110, 53, 168, 35, 113, 202, 84, 19, 160, 103, 48, 212, 36, 154, 247, 66, 175, 108, 32, 170, 63, 235, 147, 26, 198, 67, 180, 12, 241, 104, 226, 63, 19, 143, 218, 76, 183, 47, 132, 251, 95, 38, 171, 59, 140, 218, 101, 45, 133, 241, 155, 87, 199, 44, 110, 179, 250 ], BAYER4 = new Uint8Array(BAYER4_SRC), BAYER8 = new Uint8Array(BAYER8_SRC), BAYER16 = new Uint8Array(BAYER16_SRC), BLUE8 = new Uint8Array(BLUE8_SRC), BLUE16 = new Uint8Array(BLUE16_SRC), BLUE32 = new Uint8Array(BLUE32_SRC), QUAD_VERTICES = new Float32Array([ -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1 ]), BAYER4_F32 = new Float32Array(BAYER4_SRC.map(e => e / 16)), BAYER8_F32 = new Float32Array(BAYER8_SRC.map(e => e / 64)), BAYER16_F32 = new Float32Array(BAYER16_SRC.map(e => e / 256));

function _floatMatrixToU8(e) {
	const t = new Uint8Array(e.length);
	for (let a = 0; a < e.length; a++) t[a] = Math.round(255 * e[a]);
	return t;
}

const BAYER4_U8 = _floatMatrixToU8(BAYER4_F32), BAYER8_U8 = _floatMatrixToU8(BAYER8_F32), BAYER16_U8 = _floatMatrixToU8(BAYER16_F32), BLUE8_U8 = new Uint8Array(BLUE8_SRC), BLUE16_U8 = new Uint8Array(BLUE16_SRC), BLUE32_U8 = new Uint8Array(BLUE32_SRC), htmlLog = [];

let lastIndexMap = null, lastW = 0, lastH = 0, animSource = null, processedAnimation = null;

const mediaFileInput = document.getElementById("file"), palettemediaFileInput = document.getElementById("palette-file-reader"), predefinedPaletteSelect = document.getElementById("predefined-palette-select"), modeSelect = document.getElementById("mode-select"), subpixelSelect = document.getElementById("subpixel-select"), engineSelect = document.getElementById("engine-select"), asciiEnableCheck = document.getElementById("ascii-enable"), asciiSubOptions = document.getElementById("ascii-sub-options"), asciiCharsetSelect = document.getElementById("ascii-charset-select"), asciiWidthInput = document.getElementById("ascii-width-input"), asciiTabBtn = document.getElementById("ascii-tab-btn"), asciiOutputTA = document.getElementById("ascii-output"), runButton = document.getElementById("run"), downloadTextButton = document.getElementById("copy"), downloadMediaButton = document.getElementById("download"), statusDiv = document.getElementById("status"), textarea = document.getElementById("output"), previewContainer = document.querySelector(".image-preview-container"), outputImage = document.getElementById("output-image"), canvas = document.getElementById("process-canvas"), ctx = canvas.getContext("2d", {
	willReadFrequently: !0
}), inputWidth = document.getElementById("width"), inputHeight = document.getElementById("height"), inputFactor = document.getElementById("factor"), inputRatio = document.getElementById("ratio"), parametersForm = document.getElementById("parameters"), colorpad = document.getElementById("colorpad"), paletteAddBtn = document.getElementById("palette-add-btn"), paletteRemoveBtn = document.getElementById("palette-remove-btn"), paletteCountLbl = document.getElementById("palette-count-label");

let originalImageSize = {
	width: 0,
	height: 0
}, originalMimeType = "image/png", sourceExtension = "png", canvasName = "pic2pa.png", outputBlob = null, outputObjectUrl = null, rgbPalette = [], uploadedFileBuffer = null, isTextProcessing = !1, stopTextProcessingFlag = !1, curResizeMode = "=", nextResizeMode = "-";

const predefinedPalettes = {
	arcade: [ "#ffffff", "#ff2121", "#ff93c4", "#ff8135", "#fff609", "#249ca3", "#78dc52", "#003fad", "#87f2ff", "#8e2ec4", "#a4839f", "#5c406c", "#e5cdc4", "#91463d", "#000000" ],
	matte: [ "#ffffff", "#ff455a", "#ffaebc", "#ffab3c", "#fffa40", "#278c3f", "#37e650", "#5e70d4", "#99d5e5", "#a845ff", "#cfa4ff", "#7a4a8b", "#ffcca4", "#bd7f47", "#41344e" ],
	pastel: [ "#ffffff", "#ffb0a1", "#ffd6ec", "#ffdca1", "#fffda1", "#a1ffe1", "#baffc1", "#a1d6ff", "#e1ffff", "#d6a1ff", "#eaccff", "#bdb0d6", "#fff0e1", "#d6a1a1", "#696a6a" ],
	sweet: [ "#ffffff", "#803d41", "#9ad46a", "#eb8b4a", "#f6d86e", "#18544a", "#31a477", "#365f91", "#6bd0ff", "#653780", "#9f7bb1", "#d6b8c0", "#e7d7c1", "#ac896e", "#4f455a" ],
	poke: [ "#ffffff", "#e4595d", "#f7a171", "#fced8c", "#69d8af", "#71aa6a", "#2c6eb7", "#5196d8", "#8aa7cc", "#b070cc", "#dea3ea", "#ace6a2", "#e7ccae", "#9a6d5f", "#454545" ],
	adventure: [ "#ffffff", "#e9d4a9", "#c57e7d", "#a74e5a", "#f8ae49", "#9d9d5a", "#557d4a", "#0f4a6d", "#3b83a1", "#4d5061", "#6e81a1", "#a1acbd", "#e7e7e7", "#714a47", "#1c1f21" ],
	diy: [ "#ffffff", "#ff0000", "#ff99aa", "#ffcc00", "#ffff00", "#00ff00", "#00cc00", "#000000", "#00ffff", "#aa00ff", "#cc99ff", "#aaaaaa", "#eebbaa", "#884400", "#000000" ],
	adafruit: [ "#ffffff", "#ff0000", "#ff5500", "#ffaa00", "#ffff00", "#00ff00", "#00aa55", "#000000", "#00aaff", "#aa00ff", "#ff00ff", "#aaaaaa", "#555555", "#ff55aa", "#000000" ],
	still_life: [ "#ffffff", "#9be2de", "#ff6f5a", "#e0946a", "#e8c466", "#adcdd5", "#69b477", "#54818e", "#61a4c4", "#9d94d1", "#6b5a83", "#8d796e", "#c7ae9e", "#706059", "#3d3a4f" ],
	steam_punk: [ "#ffffff", "#b4dad6", "#3b3740", "#664d49", "#9f6751", "#737156", "#9f0866", "#647d87", "#8aa1ab", "#7d7187", "#a392a5", "#bdbdc5", "#e4e7ea", "#a59487", "#59555a" ],
	grayscale: [ "#ffffff", "#f7f7f7", "#e1e1e1", "#cccccc", "#b8b8b8", "#a3a3a3", "#8e8e8e", "#7a7a7a", "#666666", "#515151", "#3d3d3d", "#292929", "#141414", "#000000", "#000000" ]
};
//end
//script/engine/matrix/cpu.js
const clamp = t => t < 0 ? 0 : t > 255 ? 255 : t, COLOR_CACHE_LIMIT = 4096;

function findNearestColor(t, n, e, i) {
	let o = 1 / 0, a = 1;
	for (let r = 1; r < i.length; r += 1) {
		const l = i[r], c = t - l.r, s = n - l.g, u = e - l.b, d = c * c + s * s + u * u;
		if (d < o && (o = d, a = r, 0 === d)) break;
	}
	return a;
}

function cachedFindNearest(t, n, e, i, o) {
	const a = (255 & t) << 16 | (255 & n) << 8 | 255 & e;
	let r = o.get(a);
	return void 0 !== r || (r = findNearestColor(t, n, e, i), o.size >= 4096 && o.clear(), 
	o.set(a, r)), r;
}

const ASCII_CHARSETS = {
	standard: [ " ", "·", "░", "▒", "▓", "█", "■", "▪", "●", "#", "@" ],
	block: [ " ", "·", "░", "▒", "▓", "█" ],
	alphanumeric: [ " ", ".", ":", "i", "l", "c", "o", "v", "x", "X", "M", "W", "#", "&", "@" ],
	minimal: [ " ", ".", ":", "-", "=", "+", "*", "#", "%", "@" ],
	dense: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$".split("")
};

function makeAsciiLumaTable(t) {
	const n = new Float32Array(t.length);
	for (let e = 1; e < t.length; e += 1) {
		const i = t[e];
		n[e] = .2126 * i.r + .7152 * i.g + .0722 * i.b;
	}
	return n;
}

function buildAsciiLine(t, n, e, i, o, a, r, l) {
	const c = ASCII_CHARSETS[a] || ASCII_CHARSETS.standard, s = c.length - 1, u = Math.max(1, Math.min(r, n)), d = n / u, h = 2 * d, f = l || makeAsciiLumaTable(o);
	let m = "";
	for (let o = 0; o < u; o += 1) {
		const a = o * d | 0, r = t * h | 0, l = Math.min(n, Math.ceil((o + 1) * d)), u = Math.min(e, Math.ceil((t + 1) * h));
		let M = 0, b = 0, g = !1;
		for (let t = r; t < u; t += 1) {
			const e = t * n;
			for (let t = a; t < l; t += 1) {
				const n = i[e + t];
				n && (M += f[n], g = !0), b += 1;
			}
		}
		m += g ? c[Math.round(M / b / 255 * s)] : " ";
	}
	return m;
}

function exportAscii(t, n, e, i, o, a) {
	const r = Math.max(1, Math.min(a, n)), l = Math.max(1, Math.round(e / (n / r * 2))), c = makeAsciiLumaTable(i);
	let s = "";
	for (let a = 0; a < l; a += 1) s += buildAsciiLine(a, n, e, t, i, o, r, c) + "\n";
	return s;
}

function applySubpixel(t, n, e, i) {
	if ("solidIndexing" === e) {
		const e = 255 / (i - 1 || 15), o = 1 / e;
		for (let i = 0; i < n; i += 4) t[i + 3] < 128 || (t[i] = Math.min(255, Math.round(Math.round(t[i] * o) * e)), 
		t[i + 1] = Math.min(255, Math.round(Math.round(t[i + 1] * o) * e)), t[i + 2] = Math.min(255, Math.round(Math.round(t[i + 2] * o) * e)));
	} else if ("hinted" === e) for (let e = 0; e < n; e += 4) t[e + 3] < 128 || (t[e] = Math.min(255, 64 * Math.round(.015625 * t[e])), 
	t[e + 1] = Math.min(255, 64 * Math.round(.015625 * t[e + 1])), t[e + 2] = Math.min(255, 64 * Math.round(.015625 * t[e + 2]))); else if ("antialias" === e || "smallAntiAliasing" === e) {
		const i = "smallAntiAliasing" === e;
		for (let e = 0; e < n - 4; e += 4) t[e + 3] < 128 || t[e + 7] < 128 || (i ? (t[e] = .75 * t[e] + .25 * t[e + 4] | 0, 
		t[e + 1] = .75 * t[e + 1] + .25 * t[e + 5] | 0, t[e + 2] = .75 * t[e + 2] + .25 * t[e + 6] | 0) : (t[e] = t[e] + t[e + 4] >> 1, 
		t[e + 1] = t[e + 1] + t[e + 5] >> 1, t[e + 2] = t[e + 2] + t[e + 6] >> 1));
	} else if ("nearestNeighbor" === e) for (let e = 0; e < n; e += 4) t[e + 3] < 128 || (t[e] = t[e] < 64 ? 0 : t[e] > 192 ? 255 : t[e], 
	t[e + 1] = t[e + 1] < 64 ? 0 : t[e + 1] > 192 ? 255 : t[e + 1], t[e + 2] = t[e + 2] < 64 ? 0 : t[e + 2] > 192 ? 255 : t[e + 2]);
}

function buildRowString(t, n, e, i, o, a, r) {
	const l = t * n;
	let c = "";
	for (let t = 0; t < n; t += 1) {
		const n = l + t, s = e[n];
		c += a[s];
		const u = n << 2;
		if (!s) {
			i[u] = i[u + 1] = i[u + 2] = i[u + 3] = 0;
			continue;
		}
		const d = o[s];
		i[u] = d.r, i[u + 1] = d.g, i[u + 2] = d.b, i[u + 3] = r && void 0 !== d.a ? d.a : 255;
	}
	return c;
}

async function modeDither(t, n, e, i, o, a, r, l, c, s, u, d, h, f) {
	const m = new Uint8Array(n * e), M = new Map, b = null !== c, g = s - 1, A = 1 / u;
	let p = h ? "" : "img`\n";
	for (let u = 0; u < e; u += 1) {
		const S = u * n, w = (u & g) * s;
		let x = 0, E = 0, y = 0;
		for (let e = 0; e < n; e += 1) {
			const n = S + e, o = n << 2;
			if (t[o + 3] < 128) {
				b && (x = E = y = 0);
				continue;
			}
			let a = t[o], r = t[o + 1], l = t[o + 2];
			if (b) {
				const t = (c[w + (e & g)] * A - .5) * d;
				a = clamp(a + x + t), r = clamp(r + E + t), l = clamp(l + y + t);
			}
			const s = cachedFindNearest(a, r, l, i, M);
			if (m[n] = s, b) {
				const t = i[s];
				x = .6 * (a - t.r), E = .6 * (r - t.g), y = .6 * (l - t.b);
			}
		}
		const C = buildRowString(u, n, m, o, i, r, f);
		h ? await h(u, C, m) : p += C + "\n", u % l !== 0 && u !== e - 1 || await a((100 * (u + 1) / e).toFixed(4));
	}
	return {
		hexString: h ? "" : p + "`",
		indexMap: m
	};
}

async function modeFloydSteinberg(t, n, e, i, o, a, r, l, c, s) {
	const u = new Uint8Array(n * e), d = new Float32Array(t), h = new Map;
	let f = c ? "" : "img`\n";
	for (let t = 0; t < e; t += 1) {
		const m = t * n;
		for (let o = 0; o < n; o += 1) {
			const a = m + o, r = a << 2;
			if (d[r + 3] < 128) continue;
			const l = clamp(d[r]), c = clamp(d[r + 1]), s = clamp(d[r + 2]), f = cachedFindNearest(l, c, s, i, h);
			u[a] = f;
			const M = i[f], b = l - M.r, g = c - M.g, A = s - M.b;
			if (o + 1 < n && (d[r + 4] += .4375 * b, d[r + 5] += .4375 * g, d[r + 6] += .4375 * A), 
			t + 1 < e) {
				if (o) {
					const e = (t + 1) * n + o - 1 << 2;
					d[e] += .1875 * b, d[e + 1] += .1875 * g, d[e + 2] += .1875 * A;
				}
				const e = (t + 1) * n + o << 2;
				if (d[e] += .3125 * b, d[e + 1] += .3125 * g, d[e + 2] += .3125 * A, o + 1 < n) {
					const t = e + 4;
					d[t] += .0625 * b, d[t + 1] += .0625 * g, d[t + 2] += .0625 * A;
				}
			}
		}
		const M = buildRowString(t, n, u, o, i, r, s);
		c ? await c(t, M, u) : f += M + "\n", t % l !== 0 && t !== e - 1 || await a((100 * (t + 1) / e).toFixed(4));
	}
	return {
		hexString: c ? "" : f + "`",
		indexMap: u
	};
}

const DITHER_MODES = {
	bayer4: [ BAYER4, 4, 16, 72 ],
	bayer8: [ BAYER8, 8, 64, 72 ],
	bayer16: [ BAYER16, 16, 256, 72 ],
	blue8: [ BLUE8, 8, 255, 80 ],
	blue16: [ BLUE16, 16, 255, 80 ],
	blue32: [ BLUE32, 32, 255, 80 ]
};

async function runConversionPipeline({data: t, w: n, h: e, mode: i, subPixelOption: o, rgbPalette: a, outImgData: r, onProgress: l, onRow: c, hasAlpha: s}) {
	applySubpixel(t, t.length, o, a.length);
	const u = r.data, d = CHAR_TABLE, h = 1 + Math.sqrt(e + n) * (e / n) | 0, f = DITHER_MODES[i];
	return f ? modeDither(t, n, e, a, u, l, d, h, f[0], f[1], f[2], f[3], c, s) : "error" === i ? modeFloydSteinberg(t, n, e, a, u, l, d, h, c, s) : modeDither(t, n, e, a, u, l, d, h, null, 1, 1, 0, c, s);
}
//end
//script/engine/matrix/gpu.js
const VERTEX_SHADER = "\nattribute vec2 a_position;\nattribute vec2 a_texCoord;\nvarying vec2 v_texCoord;\nvoid main() {\n\tgl_Position = vec4(a_position, 0.0, 1.0);\n\tv_texCoord = a_texCoord;\n}", FRAG_BASE = "\nprecision highp float;\nvarying vec2 v_texCoord;\nuniform sampler2D u_image;\nuniform vec2 u_resolution;\n\nvec3 samplePixel() {\n\treturn texture2D(u_image, v_texCoord).rgb;\n}\n\nfloat getAlpha() {\n\treturn texture2D(u_image, v_texCoord).a;\n}\n", FRAG_SOLID = FRAG_BASE + "\nvoid main() {\n\tfloat alpha = getAlpha();\n\tif (alpha < 0.5) {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n\t\treturn;\n\t}\n\tgl_FragColor = vec4(samplePixel(), 1.0);\n}", FRAG_BAYER = FRAG_BASE + "\nuniform sampler2D u_bayerTex;\nuniform float u_bayerSize;\nuniform float u_spread;\n\nvoid main() {\n\tfloat alpha = getAlpha();\n\tif (alpha < 0.5) {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n\t\treturn;\n\t}\n\tvec2 px = v_texCoord * u_resolution;\n\tvec2 bayerUV = mod(px, u_bayerSize) / u_bayerSize;\n\tfloat factor = texture2D(u_bayerTex, bayerUV).r - 0.5;\n\tvec3 col = samplePixel() + factor * u_spread / 255.0;\n\tcol = clamp(col, 0.0, 1.0);\n\tgl_FragColor = vec4(col, 1.0);\n}", FRAG_BLUE = FRAG_BASE + "\nuniform sampler2D u_noise;\nuniform float u_spread;\nuniform vec2 u_noiseSize;\n\nvoid main() {\n\tfloat alpha = getAlpha();\n\tif (alpha < 0.5) {\n\t\tgl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);\n\t\treturn;\n\t}\n\tvec2 noiseUV = fract(v_texCoord * u_resolution / u_noiseSize);\n\tfloat factor = texture2D(u_noise, noiseUV).r - 0.5;\n\tvec3 col = samplePixel() + factor * u_spread / 255.0;\n\tcol = clamp(col, 0.0, 1.0);\n\tgl_FragColor = vec4(col, 1.0);\n}";

function compileShader(e, t, r) {
	const a = e.createShader(t);
	if (e.shaderSource(a, r), e.compileShader(a), !e.getShaderParameter(a, e.COMPILE_STATUS)) {
		const t = e.getShaderInfoLog(a);
		throw e.deleteShader(a), new Error("Shader compile error: " + t);
	}
	return a;
}

function createProgram(e, t, r) {
	const a = compileShader(e, e.VERTEX_SHADER, t), n = compileShader(e, e.FRAGMENT_SHADER, r), o = e.createProgram();
	if (e.attachShader(o, a), e.attachShader(o, n), e.linkProgram(o), !e.getProgramParameter(o, e.LINK_STATUS)) throw new Error("Program link error: " + e.getProgramInfoLog(o));
	return o;
}

class GLEngine {
	static checkWebGL(e) {
		try {
			const t = e || document.createElement("canvas"), r = {
				premultipliedAlpha: !1,
				alpha: !0,
				antialias: !1
			};
			return t.getContext("webgl2", r) || t.getContext("webgl", r) || t.getContext("experimental-webgl", r) || null;
		} catch (e) {
			return null;
		}
	}
	constructor(e) {
		this._sourceCanvas = e, this.canvas = document.createElement("canvas");
		const t = GLEngine.checkWebGL(this.canvas);
		if (!t) throw new Error("WebGL not supported");
		this.gl = t, this._initQuad(), this.programs = {}, this.textures = {};
	}
	_initQuad() {
		const e = this.gl, t = e.createBuffer();
		e.bindBuffer(e.ARRAY_BUFFER, t), e.bufferData(e.ARRAY_BUFFER, QUAD_VERTICES, e.STATIC_DRAW), 
		this.vbo = t;
	}
	_useProgram(e) {
		const t = this.gl;
		t.useProgram(e), t.bindBuffer(t.ARRAY_BUFFER, this.vbo);
		const r = t.getAttribLocation(e, "a_position"), a = t.getAttribLocation(e, "a_texCoord");
		t.enableVertexAttribArray(r), t.enableVertexAttribArray(a), t.vertexAttribPointer(r, 2, t.FLOAT, !1, 16, 0), 
		t.vertexAttribPointer(a, 2, t.FLOAT, !1, 16, 8);
	}
	_getProgram(e) {
		if (this.programs[e]) return this.programs[e];
		const t = this.gl;
		let r;
		switch (e) {
		case "solid":
		default:
			r = createProgram(t, VERTEX_SHADER, FRAG_SOLID);
			break;

		case "bayer4":
		case "bayer8":
		case "bayer16":
			r = createProgram(t, VERTEX_SHADER, FRAG_BAYER);
			break;

		case "blue8":
		case "blue16":
		case "blue32":
			r = createProgram(t, VERTEX_SHADER, FRAG_BLUE);
		}
		return this.programs[e] = r, r;
	}
	_uploadImageTexture(e, t, r) {
		const a = this.gl;
		let n = this.textures.image;
		return n || (n = a.createTexture(), this.textures.image = n), a.activeTexture(a.TEXTURE0), 
		a.bindTexture(a.TEXTURE_2D, n), a.texImage2D(a.TEXTURE_2D, 0, a.RGBA, t, r, 0, a.RGBA, a.UNSIGNED_BYTE, e), 
		a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.NEAREST), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.NEAREST), 
		a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE), 
		n;
	}
	_uploadLuminanceTexture(e, t, r, a) {
		const n = this.gl;
		let o = this.textures[e];
		return o || (o = n.createTexture(), this.textures[e] = o), n.activeTexture(a), n.bindTexture(n.TEXTURE_2D, o), 
		n.texImage2D(n.TEXTURE_2D, 0, n.LUMINANCE, r, r, 0, n.LUMINANCE, n.UNSIGNED_BYTE, t), 
		n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.NEAREST), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.NEAREST), 
		n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.REPEAT), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.REPEAT), 
		o;
	}
	_getBayerArray(e) {
		switch (e) {
		case "bayer4":
		default:
			return {
				data: BAYER4_U8,
				size: 4
			};

		case "bayer8":
			return {
				data: BAYER8_U8,
				size: 8
			};

		case "bayer16":
			return {
				data: BAYER16_U8,
				size: 16
			};
		}
	}
	_getBlueNoiseArray(e) {
		switch (e) {
		case "blue8":
		default:
			return {
				data: BLUE8_U8,
				size: 8
			};

		case "blue16":
			return {
				data: BLUE16_U8,
				size: 16
			};

		case "blue32":
			return {
				data: BLUE32_U8,
				size: 32
			};
		}
	}
	async render({data: e, w: t, h: r, mode: a, rgbPalette: n, outImgData: o, onRow: i, hasAlpha: s}) {
		const c = this.gl;
		this.canvas.width === t && this.canvas.height === r || (this.canvas.width = t, this.canvas.height = r);
		const u = this._getProgram(a);
		if (this._useProgram(u), this._uploadImageTexture(e, t, r), c.uniform1i(c.getUniformLocation(u, "u_image"), 0), 
		c.uniform2f(c.getUniformLocation(u, "u_resolution"), t, r), a.startsWith("bayer")) {
			const e = this._getBayerArray(a);
			this._uploadLuminanceTexture("bayer", e.data, e.size, c.TEXTURE1), c.uniform1i(c.getUniformLocation(u, "u_bayerTex"), 1), 
			c.uniform1f(c.getUniformLocation(u, "u_bayerSize"), e.size), c.uniform1f(c.getUniformLocation(u, "u_spread"), 72);
		} else if (a.startsWith("blue")) {
			const e = this._getBlueNoiseArray(a);
			this._uploadLuminanceTexture("noise", e.data, e.size, c.TEXTURE1), c.uniform1i(c.getUniformLocation(u, "u_noise"), 1), 
			c.uniform1f(c.getUniformLocation(u, "u_spread"), 80), c.uniform2f(c.getUniformLocation(u, "u_noiseSize"), e.size, e.size);
		}
		c.viewport(0, 0, t, r), c.clearColor(0, 0, 0, 0), c.clear(c.COLOR_BUFFER_BIT), c.drawArrays(c.TRIANGLE_STRIP, 0, 4);
		const l = o.data;
		c.readPixels(0, 0, t, r, c.RGBA, c.UNSIGNED_BYTE, l);
		const _ = new Uint8Array(t * r), E = n.length, g = CHAR_TABLE, m = a.startsWith("bayer") || a.startsWith("blue"), T = e => e < 0 ? 0 : e > 255 ? 255 : e;
		let h = i ? "" : "img`\n";
		for (let e = 0; e < r; e++) {
			let r = "";
			const a = e * t;
			let o = 0, c = 0, u = 0;
			for (let e = 0; e < t; e++) {
				const t = a + e, i = t << 2;
				if (l[i + 3] < 128) _[t] = 0, r += g[0], l[i] = 0, l[i + 1] = 0, l[i + 2] = 0, l[i + 3] = 0, 
				o = c = u = 0; else {
					const e = m ? T(l[i] + o) : l[i], a = m ? T(l[i + 1] + c) : l[i + 1], h = m ? T(l[i + 2] + u) : l[i + 2];
					let R = 1 / 0, A = 1;
					for (let t = 1; t < E; t++) {
						const r = n[t], o = e - r.r, i = a - r.g, s = h - r.b, c = o * o + i * i + s * s;
						c < R && (R = c, A = t);
					}
					_[t] = A, r += g[A];
					const d = n[A];
					m && (o = .6 * (e - d.r), c = .6 * (a - d.g), u = .6 * (h - d.b)), l[i] = d.r, l[i + 1] = d.g, 
					l[i + 2] = d.b, l[i + 3] = s && void 0 !== d.a ? d.a : 255;
				}
			}
			i ? await i(e, r, _) : h += r + "\n";
		}
		return {
			hexString: i ? "" : h + "`",
			indexMap: _
		};
	}
}

let sharedGLEngine = null;

async function runGLPipeline({canvas: e, data: t, w: r, h: a, mode: n, rgbPalette: o, outImgData: i, onProgress: s, onRow: c, hasAlpha: u}) {
	const l = sharedGLEngine || (sharedGLEngine = new GLEngine(e));
	s("25.0000"), await new Promise(e => requestAnimationFrame(e)), s("50.0000"), await new Promise(e => requestAnimationFrame(e));
	const _ = await l.render({
		data: t,
		w: r,
		h: a,
		mode: n,
		rgbPalette: o,
		outImgData: i,
		onRow: c,
		hasAlpha: u
	});
	return s("100.0000"), _;
}
//end
//script/engine/media/decoder.js
const ANIM_MIME_TYPES = Object.freeze({
	"image/gif": "gif",
	"image/apng": "apng",
	"video/webm": "webm",
	"image/jxl": "jxl"
}), clampDelay = e => Math.max(10, Number.isFinite(e) ? e : 100), readU32 = (e, t) => (e[t] << 24 | e[t + 1] << 16 | e[t + 2] << 8 | e[t + 3]) >>> 0, readU16 = (e, t) => e[t] | e[t + 1] << 8, ascii = (e, t, r) => String.fromCharCode(...e.slice(t, t + r));

function isAnimatedFormat(e) {
	return Object.prototype.hasOwnProperty.call(ANIM_MIME_TYPES, String(e).toLowerCase());
}

function readGifRepeat(e) {
	if (e.length < 13) return null;
	let t = 13;
	const r = e[10];
	for (128 & r && (t += 3 * (1 << 1 + (7 & r))); t < e.length; ) {
		const r = e[t++];
		if (59 === r || 44 === r) break;
		if (33 !== r || t >= e.length) return null;
		const i = [];
		if (255 === e[t++]) {
			if (t >= e.length) return null;
			const r = e[t++];
			if (t + r > e.length) return null;
			const n = ascii(e, t, r);
			for (t += r; t < e.length; ) {
				const r = e[t++];
				if (!r) break;
				if (t + r > e.length) return null;
				i.push(...e.slice(t, t + r)), t += r;
			}
			if ((n.startsWith("NETSCAPE") || n.startsWith("ANIMEXTS")) && 1 === i[0] && i.length >= 3) return i[1] | i[2] << 8;
		} else for (;t < e.length; ) {
			const r = e[t++];
			if (!r) break;
			t += r;
		}
	}
	return null;
}

function countGifImageDescriptors(e) {
	if (e.length < 13) return 0;
	let t = 13;
	const r = e[10];
	128 & r && (t += 3 * (1 << 1 + (7 & r)));
	let i = 0;
	const n = () => {
		for (;t < e.length; ) {
			const r = e[t++];
			if (!r) return;
			t += r;
		}
	};
	for (;t < e.length; ) {
		const r = e[t++];
		if (59 === r) break;
		if (44 === r) {
			if (t + 9 > e.length) break;
			const r = e[t + 8];
			if (t += 9, 128 & r && (t += 3 * (1 << 1 + (7 & r))), t >= e.length) break;
			t += 1, n(), i += 1;
			continue;
		}
		if (33 !== r) break;
		if (t >= e.length) break;
		t += 1, n();
	}
	return i;
}

function isAnimatedBuffer(e, t) {
	const r = new Uint8Array(e), i = String(t || "").toLowerCase();
	if ("image/gif" === i) return countGifImageDescriptors(r) > 1;
	if ("image/apng" === i || "image/png" === i) {
		for (let e = 8; e + 12 <= r.length; ) {
			const t = readU32(r, e);
			if ("acTL" === ascii(r, e + 4, 4)) return !0;
			e += t + 12;
		}
		return !1;
	}
	if ("image/webp" === i && "RIFF" === ascii(r, 0, 4) && "WEBP" === ascii(r, 8, 4)) {
		const e = ascii(r, 12, 4);
		return "ANIM" === e || "ANMF" === e || "VP8X" === e && Boolean(2 & r[20]);
	}
	return "video/webm" === i || "image/jxl" === i;
}

function cloneCanvas(e) {
	const t = document.createElement("canvas");
	return t.width = e.width, t.height = e.height, t.getContext("2d").drawImage(e, 0, 0), 
	t;
}

function imageDataToCanvas(e, t, r) {
	const i = document.createElement("canvas");
	return i.width = t, i.height = r, i.getContext("2d").putImageData(e, 0, 0), i;
}

async function openImageDecoderStream(e, t) {
	if (!("ImageDecoder" in window)) return null;
	const r = "image/apng" === t ? "image/png" : t;
	let i;
	try {
		i = new ImageDecoder({
			data: e,
			type: r
		}), await i.tracks.ready;
		const t = i.tracks.selectedTrack, n = Math.max(0, t?.frameCount || 0), a = Number.isFinite(t?.repetitionCount) ? t.repetitionCount : null, s = async function*() {
			try {
				for (let e = 0; e < n; e += 1) {
					const t = (await i.decode({
						frameIndex: e
					})).image, r = t.displayWidth || t.codedWidth, n = t.displayHeight || t.codedHeight, a = document.createElement("canvas");
					a.width = r, a.height = n, a.getContext("2d").drawImage(t, 0, 0, r, n), yield {
						image: a,
						delay: clampDelay((t.duration || 1e5) / 1e3),
						width: r,
						height: n,
						rect: {
							x: 0,
							y: 0,
							width: r,
							height: n
						},
						changedOnly: !1,
						composited: !0,
						compositionMode: "replace"
					}, t.close?.();
				}
			} finally {
				i.close?.();
			}
		}();
		return s.repeat = a, s.frameCount = n, s;
	} catch (e) {
		return i?.close?.(), null;
	}
}

class GIFDecoder {
	constructor(e) {
		this.bytes = new Uint8Array(e), this.pos = 0, this.screen = null, this.width = 0, 
		this.height = 0, this.globalTable = [], this.backgroundIndex = 0, this.delay = 100, 
		this.transparentIndex = -1, this.disposal = 0, this.repeat = null;
	}
	readByte() {
		if (this.pos >= this.bytes.length) throw new Error("Unexpected end of GIF data.");
		return this.bytes[this.pos++];
	}
	readWord() {
		return this.readByte() | this.readByte() << 8;
	}
	readBytes(e) {
		const t = this.pos + e;
		if (t > this.bytes.length) throw new Error("Invalid GIF block length.");
		const r = this.bytes.subarray(this.pos, t);
		return this.pos = t, r;
	}
	readColorTable(e) {
		const t = new Uint8Array(3 * e);
		for (let e = 0; e < t.length; e += 1) t[e] = this.readByte();
		return t;
	}
	clearRect(e, t, r, i, n) {
		const a = Math.max(0, t), s = Math.max(0, r), o = Math.min(this.width, t + i), h = Math.min(this.height, r + n);
		for (let t = s; t < h; t += 1) {
			const r = 4 * (t * this.width + a);
			e.data.fill(0, r, r + 4 * (o - a));
		}
	}
	readExtension() {
		const e = this.readByte();
		if (249 === e) {
			if (4 !== this.readByte()) throw new Error("Invalid GIF graphic control extension.");
			const e = this.readByte();
			this.disposal = e >> 2 & 7, this.delay = Math.max(10, 10 * this.readWord());
			const t = this.readByte();
			return this.transparentIndex = 1 & e ? t : -1, void this.readByte();
		}
		if (255 === e) {
			const e = this.readByte(), t = ascii(this.readBytes(e), 0, e), r = [];
			let i;
			for (;0 !== (i = this.readByte()); ) r.push(...this.readBytes(i));
			return void ((t.startsWith("NETSCAPE") || t.startsWith("ANIMEXTS")) && 1 === r[0] && r.length >= 3 && (this.repeat = r[1] | r[2] << 8));
		}
		let t;
		for (;0 !== (t = this.readByte()); ) this.readBytes(t);
	}
	readFrame() {
		const e = this.readWord(), t = this.readWord(), r = this.readWord(), i = this.readWord(), n = this.readByte(), a = Boolean(128 & n), s = Boolean(64 & n), o = 2 ** (1 + (7 & n)), h = a ? this.readColorTable(o) : this.globalTable, c = this.readLZWData(this.readByte(), r * i), d = 3 === this.disposal ? new Uint8ClampedArray(this.screen.data) : null;
		let l = 0;
		const f = s ? 4 : 1;
		for (let n = 0; n < f; n += 1) {
			const a = s ? n < 2 ? 8 : 2 === n ? 4 : 2 : 1;
			for (let o = s ? 1 === n ? 4 : 2 === n ? 2 : 3 === n ? 1 : 0 : 0; o < i; o += a) for (let i = 0; i < r; i += 1) {
				const r = c[l++];
				if (r === this.transparentIndex) continue;
				const n = 3 * r;
				if (n + 2 >= h.length) continue;
				const a = e + i, s = t + o;
				if (a < 0 || s < 0 || a >= this.width || s >= this.height) continue;
				const d = 4 * (s * this.width + a);
				this.screen.data[d] = h[n], this.screen.data[d + 1] = h[n + 1], this.screen.data[d + 2] = h[n + 2], 
				this.screen.data[d + 3] = 255;
			}
		}
		const u = imageDataToCanvas(this.screen, this.width, this.height), g = 0 !== e || 0 !== t || r !== this.width || i !== this.height, p = {
			image: u,
			delay: clampDelay(this.delay),
			width: this.width,
			height: this.height,
			rect: {
				x: e,
				y: t,
				width: r,
				height: i
			},
			changedOnly: g,
			composited: !0,
			compositionMode: g ? "latest" : "replace",
			disposal: this.disposal
		};
		return 2 === this.disposal && this.clearRect(this.screen, e, t, r, i), 3 === this.disposal && d && this.screen.data.set(d), 
		this.delay = 100, this.transparentIndex = -1, this.disposal = 0, p;
	}
	async* stream() {
		this.pos = 0;
		const e = ascii(this.readBytes(6), 0, 6);
		if ("GIF87a" !== e && "GIF89a" !== e) throw new Error("Invalid GIF signature.");
		this.width = this.readWord(), this.height = this.readWord();
		const t = this.readByte(), r = Boolean(128 & t), i = 2 ** (1 + (7 & t));
		for (this.backgroundIndex = this.readByte(), this.readByte(), this.globalTable = r ? this.readColorTable(i) : [], 
		this.screen = new ImageData(this.width, this.height); this.pos < this.bytes.length; ) {
			const e = this.readByte();
			if (59 === e) break;
			if (33 !== e) {
				if (44 !== e) throw new Error("Unknown GIF block marker.");
				yield this.readFrame();
			} else this.readExtension();
		}
		if (!this.width || !this.height) throw new Error("GIF contains no image frames.");
	}
	readLZWData(e, t) {
		const r = [];
		let i, n = 0;
		for (;0 !== (i = this.readByte()); ) {
			const e = this.readBytes(i);
			r.push(e), n += e.length;
		}
		const a = new Uint8Array(n);
		let s = 0;
		for (const e of r) a.set(e, s), s += e.length;
		const o = 1 << e, h = o + 1;
		let c, d, l = e + 1, f = 0, u = 0, g = 0;
		const p = new Uint8Array(t);
		let m = 0;
		const y = () => {
			c = new Array(o);
			for (let e = 0; e < o; e += 1) c[e] = [ e ];
			c.push(null, null), d = h + 1, l = e + 1;
		}, w = () => {
			for (;u < l && g < a.length; ) f |= a[g++] << u, u += 8;
			if (u < l) return -1;
			const e = f & (1 << l) - 1;
			return f >>= l, u -= l, e;
		};
		y();
		let b = null;
		for (;m < t; ) {
			const e = w();
			if (e < 0 || e === h) break;
			if (e === o) {
				y(), b = null;
				continue;
			}
			let r;
			if (e < c.length && c[e]) r = c[e]; else {
				if (e !== d || !b) throw new Error("Invalid GIF LZW code.");
				r = [ ...b, b[0] ];
			}
			for (const e of r) {
				if (m >= t) break;
				p[m++] = e;
			}
			b && d < 4096 && (c[d++] = [ ...b, r[0] ], d === 1 << l && l < 12 && (l += 1)), 
			b = r;
		}
		return m === t ? p : p.subarray(0, m);
	}
}

class PNGDecoder {
	constructor(e) {
		this.bytes = new Uint8Array(e), this.width = 0, this.height = 0, this.bitDepth = 0, 
		this.colorType = 0, this.palette = [], this.transparency = [], this.playCount = 0, 
		this.frames = [];
	}
	async inflate(e) {
		if (!("DecompressionStream" in window)) throw new Error("APNG decoding needs browser DecompressionStream support.");
		const t = e.reduce((e, t) => e + t.length, 0), r = new Uint8Array(t);
		let i = 0;
		for (const t of e) r.set(t, i), i += t.length;
		const n = new Blob([ r ]).stream().pipeThrough(new DecompressionStream("deflate"));
		return new Uint8Array(await new Response(n).arrayBuffer());
	}
	parseChunks() {
		if (![ 137, 80, 78, 71, 13, 10, 26, 10 ].every((e, t) => this.bytes[t] === e)) throw new Error("Invalid PNG signature.");
		const e = [], t = [];
		let r = null;
		for (let i = 8; i + 12 <= this.bytes.length; ) {
			const n = readU32(this.bytes, i), a = ascii(this.bytes, i + 4, 4), s = this.bytes.subarray(i + 8, i + 8 + n);
			if (i += n + 12, "IHDR" === a) this.width = readU32(s, 0), this.height = readU32(s, 4), 
			this.bitDepth = s[8], this.colorType = s[9]; else if ("acTL" === a) this.playCount = readU32(s, 4); else if ("PLTE" === a) this.palette = s; else if ("tRNS" === a) this.transparency = s; else if ("fcTL" === a) r && t.push(r), 
			r = {
				control: {
					width: readU32(s, 4),
					height: readU32(s, 8),
					x: readU32(s, 12),
					y: readU32(s, 16),
					delayNum: s[20] << 8 | s[21],
					delayDen: s[22] << 8 | s[23] || 100,
					dispose: s[24],
					blend: s[25]
				},
				chunks: []
			}; else if ("IDAT" === a) (r ? r.chunks : e).push(s); else if ("fdAT" === a && r) r.chunks.push(s.subarray(4)); else if ("IEND" === a) break;
		}
		return r && t.push(r), e.length && t.length && !t[0].chunks.length && (t[0].chunks = e), 
		{
			frames: t,
			defaultChunks: e
		};
	}
	unfilter(e, t, r, i) {
		const n = t * i, a = new Uint8Array(n * r);
		let s = 0;
		for (let t = 0; t < r; t += 1) {
			const r = e[s++], o = t * n;
			for (let h = 0; h < n; h += 1) {
				const c = e[s++], d = h >= i ? a[o + h - i] : 0, l = t ? a[o - n + h] : 0, f = t && h >= i ? a[o - n + h - i] : 0;
				let u = c;
				if (1 === r) u = c + d; else if (2 === r) u = c + l; else if (3 === r) u = c + Math.floor((d + l) / 2); else if (4 === r) {
					const e = d + l - f, t = Math.abs(e - d), r = Math.abs(e - l), i = Math.abs(e - f);
					u = c + (t <= r && t <= i ? d : r <= i ? l : f);
				}
				a[o + h] = 255 & u;
			}
		}
		return a;
	}
	async decodePixels(e, t, r) {
		if (8 !== this.bitDepth) throw new Error("Only 8-bit PNG/APNG frames are supported.");
		const i = {
			0: 1,
			2: 3,
			3: 1,
			4: 2,
			6: 4
		}[this.colorType];
		if (!i) throw new Error(`Unsupported PNG color type: ${this.colorType}.`);
		const n = this.unfilter(await this.inflate(e), t, r, i), a = new Uint8ClampedArray(t * r * 4);
		for (let e = 0; e < r; e += 1) for (let r = 0; r < t; r += 1) {
			const s = (e * t + r) * i, o = 4 * (e * t + r);
			let h = 0, c = 0, d = 0, l = 255;
			if (6 === this.colorType) h = n[s], c = n[s + 1], d = n[s + 2], l = n[s + 3]; else if (2 === this.colorType) h = n[s], 
			c = n[s + 1], d = n[s + 2]; else if (4 === this.colorType) h = n[s], c = h, d = h, 
			l = n[s + 1]; else if (0 === this.colorType) h = c = d = n[s]; else if (3 === this.colorType) {
				const e = 3 * n[s];
				h = this.palette[e] ?? 0, c = this.palette[e + 1] ?? 0, d = this.palette[e + 2] ?? 0, 
				l = this.transparency[n[s]] ?? 255;
			}
			a[o] = h, a[o + 1] = c, a[o + 2] = d, a[o + 3] = l;
		}
		return new ImageData(a, t, r);
	}
	async* stream() {
		const e = this.parseChunks();
		if (!e.frames.length) throw new Error("PNG does not contain APNG frame controls.");
		const t = document.createElement("canvas");
		t.width = this.width, t.height = this.height;
		const r = t.getContext("2d");
		for (const i of e.frames) {
			const e = i.control, n = await this.decodePixels(i.chunks, e.width, e.height), a = 2 === e.dispose ? r.getImageData(0, 0, this.width, this.height) : null;
			0 === e.blend && r.clearRect(e.x, e.y, e.width, e.height);
			const s = imageDataToCanvas(n, e.width, e.height);
			r.drawImage(s, e.x, e.y);
			const o = cloneCanvas(t);
			s.width = 0, s.height = 0;
			const h = 0 !== e.x || 0 !== e.y || e.width !== this.width || e.height !== this.height;
			yield {
				image: o,
				delay: clampDelay(1e3 * e.delayNum / e.delayDen),
				width: this.width,
				height: this.height,
				rect: {
					x: e.x,
					y: e.y,
					width: e.width,
					height: e.height
				},
				changedOnly: h,
				composited: !0,
				compositionMode: 1 === e.blend ? "overlay" : "replace",
				disposal: e.dispose
			}, 1 === e.dispose ? r.clearRect(e.x, e.y, e.width, e.height) : 2 === e.dispose && a && r.putImageData(a, 0, 0);
		}
	}
	async decode() {
		const e = [];
		for await (const t of this.stream()) e.push(t);
		return e.repeat = this.playCount, e;
	}
}

class WebMDecoder {
	constructor(e, t) {
		this.buffer = e, this.mimeType = t || "video/webm";
	}
	async open() {
		const e = URL.createObjectURL(new Blob([ this.buffer ], {
			type: this.mimeType
		})), t = document.createElement("video");
		t.src = e, t.muted = !0, t.playsInline = !0, t.preload = "auto";
		try {
			await new Promise((e, r) => {
				t.onloadedmetadata = e, t.onerror = () => r(new Error("Unable to decode WebM video."));
			});
			const r = t.videoWidth, i = t.videoHeight, n = Number.isFinite(t.duration) ? t.duration : 0, a = 30, s = Math.max(1, Math.ceil(n * a)), o = async function*() {
				try {
					t.pause();
					for (let e = 0; e < s; e += 1) {
						const s = n ? Math.min(e / a, Math.max(0, n - .001)) : 0;
						await new Promise((e, r) => {
							const i = () => {
								t.removeEventListener("seeked", i), e();
							}, n = () => {
								t.removeEventListener("error", n), r(new Error("WebM frame seek failed."));
							};
							t.addEventListener("seeked", i, {
								once: !0
							}), t.addEventListener("error", n, {
								once: !0
							}), t.currentTime = s;
						});
						const o = document.createElement("canvas");
						o.width = r, o.height = i, o.getContext("2d").drawImage(t, 0, 0, r, i), yield {
							image: o,
							delay: 1e3 / a,
							width: r,
							height: i,
							rect: {
								x: 0,
								y: 0,
								width: r,
								height: i
							},
							changedOnly: !1,
							composited: !0,
							compositionMode: "replace"
						};
					}
				} finally {
					t.pause(), t.removeAttribute("src"), t.load(), URL.revokeObjectURL(e);
				}
			}();
			return o.frameCount = s, o.repeat = 0, o;
		} catch (r) {
			throw t.removeAttribute("src"), t.load(), URL.revokeObjectURL(e), r;
		}
	}
	async decode() {
		const e = await this.open(), t = [];
		for await (const r of e) t.push(r);
		return t.repeat = e.repeat, t;
	}
}

async function decodeJXL(e) {
	const t = URL.createObjectURL(new Blob([ e ], {
		type: "image/jxl"
	}));
	try {
		const e = new Image;
		e.src = t, await new Promise((t, r) => {
			e.onload = t, e.onerror = () => r(new Error("Unable to decode JXL image."));
		});
		const r = document.createElement("canvas");
		return r.width = e.naturalWidth, r.height = e.naturalHeight, r.getContext("2d").drawImage(e, 0, 0), 
		[ {
			image: r,
			delay: 100,
			width: r.width,
			height: r.height,
			rect: {
				x: 0,
				y: 0,
				width: r.width,
				height: r.height
			},
			changedOnly: !1,
			composited: !0,
			compositionMode: "latest"
		} ];
	} finally {
		URL.revokeObjectURL(t);
	}
}

function frameArraySource(e) {
	return {
		frameCount: e.length,
		repeat: e.repeat ?? null,
		open: async () => async function*() {
			for (const t of e) yield t;
		}()
	};
}

async function decodeAnimation(e, t) {
	const r = String(t || "").toLowerCase();
	if ("image/gif" === r) {
		const t = new Uint8Array(e), r = {
			frameCount: countGifImageDescriptors(t),
			repeat: readGifRepeat(t),
			open: async () => {
				const t = new GIFDecoder(e);
				return async function*() {
					for await (const e of t.stream()) yield e;
					r.repeat = t.repeat;
				}();
			}
		};
		return r;
	}
	if ("image/apng" === r || "image/png" === r && isAnimatedBuffer(e, r)) {
		const t = new PNGDecoder(e);
		return {
			frameCount: t.parseChunks().frames.length,
			repeat: t.playCount,
			open: async () => new PNGDecoder(e).stream()
		};
	}
	const i = await openImageDecoderStream(e, r);
	if (i) {
		const t = i.frameCount, n = i.repeat;
		return await (i.return?.()), {
			frameCount: t,
			repeat: n,
			open: async () => openImageDecoderStream(e, r)
		};
	}
	if ("video/webm" === r) return {
		frameCount: null,
		repeat: 0,
		open: async () => new WebMDecoder(e, r).open()
	};
	if ("image/jxl" === r) return frameArraySource(await decodeJXL(e));
	if ("image/webp" === r) throw new Error("Animated WebP requires browser ImageDecoder support.");
	throw new Error(`Unsupported animation format: ${t}.`);
}
//end
//script/engine/media/encoder.js

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

//end
//script/main.js
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
		copyText: "Download Text",
		text: "Convert Image"
	},
	imageLoaded: {
		run: !1,
		copy: !0,
		dl: !0,
		copyText: "Download Text",
		text: "Convert Image"
	},
	processing: {
		run: !0,
		copy: !0,
		dl: !0,
		copyText: "Download Text",
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
		copyText: "Download Text",
		text: "Convert Image"
	}
});

function setButtonState(e) {
	const t = BUTTON_STATES[e] || BUTTON_STATES.noImage;
	runButton.disabled = t.run, downloadTextButton.disabled = t.copy, downloadMediaButton.disabled = t.dl, 
	downloadTextButton.textContent = t.copyText, "processing" !== e && (runButton.textContent = t.text);
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
	return `pic2mkcapix-${(new Date).toISOString().replace(/[:.]/g, "-")}`;
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
}), palettemediaFileInput.addEventListener("change", function(e) {
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
}), mediaFileInput.addEventListener("change", async function() {
	resetLoadedState();
	const e = mediaFileInput.files[0];
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
		}) : await runCPUPipelineFallback(l, e, t, p, `Processing frame ${n}${i}`, `Converting frame ${n}${i}`, h, g), f = m.indexMap instanceof Uint8Array ? m.indexMap : new Uint8Array(m.indexMap), w = makeOutputDelta(f, u, e, t, a);
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
	downloadTextButton.textContent = "Download Text";
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

async function runCPUPipelineFallback(e, t, a, n, i, j, o = imageDataHasAlpha(e.data), r) {
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
			ctx.putImageData(n, 0, 0), runButton.textContent = !!j ? `${j}: ${e}%` : `Converting... ${e}%`, 
			statusDiv.textContent = !!i ? `${i}: ${e}%` : `Processing CPU pipeline... ${e}%`, 
			await new Promise(e => requestAnimationFrame(e));
		}
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

function createAnimatedOutputWriter(e, t) {
	if ("gif" === e) return createGifStreamWriter(t);
	if ("apng" === e || "png" === e) return createApngStreamWriter(t);
	if ("webm" === e) return createWebmStreamWriter(t);
	throw new Error(`Animated ${e.toUpperCase()} output cannot be encoded safely in this browser without changing the requested extension.`);
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
			}), ctx.putImageData(i, 0, 0)) : l = await runCPUPipelineFallback(n, t, a, i, null, null, c, s.onRow), 
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

async function downloadOutputString(value, flag) {
	let temporaryBlob = new Blob([value], { type: 'text/plain' });
	let temporaryLink = document.createElement('a');
	temporaryLink.href = URL.createObjectURL(temporaryBlob);
	temporaryLink.download = `${flag}_${canvasName.replace(".","_")}.txt`;
	temporaryLink.click();
	setTimeout(() => {
		URL.revokeObjectURL(temporaryLink), temporaryLink.remove();
	}, 0);
}

downloadTextButton.addEventListener("click", async function(e) {
	e.preventDefault();
	if (isTextProcessing) {
		stopTextProcessingFlag = !0;
		return;
	}
	try {
		await downloadOutputString(getOutputString(getActiveOutputName()), getActiveOutputName());
		downloadTextButton.textContent = "Text Downloaded!"
		setTimeout(() => {
			downloadTextButton.textContent = "Download Text";
		}, 2e3);
	} catch (e) {
		displayErrorPopup("Text Download Exception", "Unable to download result string", e.message);
	}
});

downloadMediaButton.addEventListener("click", async function(e) {
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
//end