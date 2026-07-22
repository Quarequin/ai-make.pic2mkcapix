const BODY_HOME = document.getElementById("body-home");

BODY_HOME.insertAdjacentHTML('beforeend',`
<!-- Loading Screen -->
<div id="page-loader">
	<h1>Convert Picture to MakecodeArcade or PixelArt</h1>
	<br>
	<div class="loader-content">
		<div class="loader-spinner"></div>
		<div class="loader-text">Loading Page...</div>
		<div class="loader-sub">Preparing Picture Converter Engine.</div>
	</div>
</div>
<h1>Convert Picture to MakecodeArcade or PixelArt</h1>
<div id="info">
	<p>
		Upload your image to convert it into pixel art — with optional ASCII
		output and a fully customizable dynamic color palette.
	</p>
	<p>
		note: 15 palette colors for makecode arcade compatibility.
	</p>
</div>

<div id="status">System Status: Awaiting Image Upload Asset...</div>

<label>Select Target Source Image:</label>
<input
	type="file"
	id="file"
	accept="image/png,image/jpeg,image/jpg,image/jxl,image/bmp,image/gif,image/webp,image/apng,video/webm"
>

<form action="#" method="POST" id="parameters">
	<div class="settings-group">
		<div class="half">
			<div class="size-settings-grid">
				<label class="full-row"
					><input
						type="radio"
						name="resize"
						id="full-width"
						checked
						disabled
					>
					Fix Sprite Width (160px)</label
				>
				<label class="full-row"
					><input
						type="radio"
						name="resize"
						id="full-height"
						disabled
					>
					Fix Sprite Height (120px)</label
				>
				<label class="full-row"
					><input type="radio" name="resize" id="scale" disabled >
					Custom Scale Factor</label
				>
				<label style="padding-left: 20px">Scale Factor:</label>
				<input
					type="number"
					id="factor"
					value="0.25"
					step="0.1e-9"
					min="0.1e-9"
					max="8"
					disabled
				>

				<label
					class="full-row"
					style="
						border-top: 1px solid #222;
						margin-top: 8px;
						padding-top: 12px;
					"
				>
					<input type="checkbox" id="ratio" checked disabled > Keep
					Original Aspect Ratio
				</label>

				<label>Output Width (px):</label>
				<input
					type="number"
					id="width"
					value="160"
					disabled
					class="custom"
				>
				<label>Output Height (px):</label>
				<input
					type="number"
					id="height"
					value="120"
					disabled
					class="custom"
				>
			</div>

			<div class="dropdown-selection-group">
				<label for="mode-select" class="dropdown-label"
					>Render Options (Dithering Method):</label
				>
				<select id="mode-select" class="custom-dropdown">
					<optgroup label="Ordered Dithering (Bayer)">
						<option value="solid" selected>
							Solid Palette Color (No Dithering)
						</option>
						<option value="bayer4">Bayer Matrix 4×4</option>
						<option value="bayer8">Bayer Matrix 8×8</option>
						<option value="bayer16">Bayer Matrix 16×16</option>
					</optgroup>
					<optgroup label="Blue Noise Dithering">
						<option value="blue8">Blue Noise 8×8</option>
						<option value="blue16">Blue Noise 16×16</option>
						<option value="blue32">Blue Noise 32×32</option>
						<!--<option value="blue64">Blue Noise 64×64</option>-->
					</optgroup>
					<optgroup label="Error Diffusion" id="optgroup-error">
						<option value="error">
							Floyd-Steinberg Error Diffusion
						</option>
					</optgroup>
				</select>
			</div>

			<div class="dropdown-selection-group">
				<label for="subpixel-select" class="dropdown-label"
					>Sub-pixel &amp; Edge Enhancement Options:</label
				>
				<select id="subpixel-select" class="custom-dropdown">
					<option value="none" selected>
						None (Standard Pixel Mapping)
					</option>
					<option value="solidIndexing">
						Solid Indexing — Linear Encludien (Crisp, No Blur)
					</option>
					<option value="hinted">
						Grid-Aligned Pixel Hinting (Font-Style)
					</option>
					<option value="antialias">
						Anti-Aliasing Smoothing Blend
					</option>
					<option value="nearestNeighbor">
						Nearest Neighbor Sharp Alignment
					</option>
					<option value="smallAntiAliasing">
						Small-scale Anti-Aliasing (Micro Blur)
					</option>
				</select>
			</div>

			<div class="dropdown-selection-group" id="ascii-options-group">
				<label class="dropdown-label">ASCII Art Output Options:</label>
				<label class="full-row">
					<input type="checkbox" id="ascii-enable" > Enable ASCII
					Output (in Output Tab)
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
					>
					<select id="ascii-charset-select" class="custom-dropdown">
						<option value="standard">
							Standard (█▓▒░ + Symbols)
						</option>
						<option value="block">Block Only (█ ▓ ▒ ░ ·)</option>
						<option value="alphanumeric">
							Alphanumeric (A-Z, 0-9)
						</option>
						<option value="minimal">Minimal ( .:-=+*#%@)</option>
						<option value="dense">
							Dense (Full Printable ASCII)
						</option>
					</select>
					<label for="ascii-width-input" style="margin-top: 8px"
						>ASCII Columns:</label
					>
					<input
						type="number"
						id="ascii-width-input"
						value="80"
						min="10"
						max="400"
						class="custom"
					>
				</div>
			</div>

			<div class="dropdown-selection-group" state="disabled">
				<label class="dropdown-label" state="disabled">Processing Engine:</label>
				<select id="engine-select" class="custom-dropdown" state="disabled" disabled>
					<option value="cpu" selected>CPU (JavaScript)</option>
					<option value="gpu">GPU (WebGL)</option>
				</select>
			</div>
		</div>

		<div class="colorboard">
			<div class="palette-loader-container">
				<label for="predefined-palette-select"
					>Select Predefined Arcade Palette:</label
				>
				<select
					id="predefined-palette-select"
					class="custom-dropdown"
					style="margin-bottom: 10px"
				>
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
				</select>

				<label>Import Custom Palette File (.txt, .hex):</label>
				<input
					type="file"
					id="palette-file-reader"
					accept=".txt,.hex"
				>
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
						+ Add Slot
					</button>
					<button
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
					><input type="color" value="#ffffff" ><input
						type="text"
						class="colortext"
						value="#ffffff"
					>
				</div>
				<div class="color-pair">
					<label>Color 2</label
					><input type="color" value="#ff2121" ><input
						type="text"
						class="colortext"
						value="#ff2121"
					>
				</div>
				<div class="color-pair">
					<label>Color 3</label
					><input type="color" value="#ff93c4" ><input
						type="text"
						class="colortext"
						value="#ff93c4"
					>
				</div>
				<div class="color-pair">
					<label>Color 4</label
					><input type="color" value="#ff8135" ><input
						type="text"
						class="colortext"
						value="#ff8135"
					>
				</div>
				<div class="color-pair">
					<label>Color 5</label
					><input type="color" value="#fff609" ><input
						type="text"
						class="colortext"
						value="#fff609"
					>
				</div>
				<div class="color-pair">
					<label>Color 6</label
					><input type="color" value="#249ca3" ><input
						type="text"
						class="colortext"
						value="#249ca3"
					>
				</div>
				<div class="color-pair">
					<label>Color 7</label
					><input type="color" value="#78dc52" ><input
						type="text"
						class="colortext"
						value="#78dc52"
					>
				</div>
				<div class="color-pair">
					<label>Color 8</label
					><input type="color" value="#003fad" ><input
						type="text"
						class="colortext"
						value="#003fad"
					>
				</div>
				<div class="color-pair">
					<label>Color 9</label
					><input type="color" value="#87f2ff" ><input
						type="text"
						class="colortext"
						value="#87f2ff"
					>
				</div>
				<div class="color-pair">
					<label>Color 10</label
					><input type="color" value="#8e2ec4" ><input
						type="text"
						class="colortext"
						value="#8e2ec4"
					>
				</div>
				<div class="color-pair">
					<label>Color 11</label
					><input type="color" value="#a4839f" ><input
						type="text"
						class="colortext"
						value="#a4839f"
					>
				</div>
				<div class="color-pair">
					<label>Color 12</label
					><input type="color" value="#5c406c" ><input
						type="text"
						class="colortext"
						value="#5c406c"
					>
				</div>
				<div class="color-pair">
					<label>Color 13</label
					><input type="color" value="#e5cdc4" ><input
						type="text"
						class="colortext"
						value="#e5cdc4"
					>
				</div>
				<div class="color-pair">
					<label>Color 14</label
					><input type="color" value="#91463d" ><input
						type="text"
						class="colortext"
						value="#91463d"
					>
				</div>
				<div class="color-pair">
					<label>Color 15</label
					><input type="color" value="#000000" ><input
						type="text"
						class="colortext"
						value="#000000"
					>
				</div>
			</div>
		</div>
	</div>

	<div class="action-buttons">
		<button id="run" type="submit" disabled>Convert Image</button>
		<button id="copy" type="button" disabled>Copy to Clipboard</button>
		<button id="download" type="button" disabled>Download Image</button>
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
		<div class="output"><canvas></canvas></div>
	</div>
</div>

<div class="output-tabs" id="output-tabs">
	<button class="tab-btn active" data-tab="pixelart">
		PixelArt / MakeCode String
	</button>
	<button class="tab-btn" data-tab="ascii" id="ascii-tab-btn" disabled>
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

<div id="notification-popup-overlay">
	<div class="popup-error-card">
		<div class="popup-header">
			<span>⚠️ PROCESS EXCEPTION DETECTED</span>
			<button class="popup-close-btn" id="popup-close-btn">
				DISMISS
			</button>
		</div>
		<div class="popup-body">
			<p style="margin: 0 0 6px 0">
				<strong>Error Type:</strong>
				<span id="popup-err-type">N/A</span>
			</p>
			<p style="margin: 0 0 10px 0">
				<strong>Message:</strong>
				<span id="popup-err-message">N/A</span>
			</p>
			<div class="popup-controls">
				<button class="popup-toggle-btn" id="btn-toggle-log">
					Show Full Log ▼
				</button>
			</div>
			<textarea id="popup-err-stack" readonly>No trace details available.</textarea>
		</div>
	</div>
</div>
`);