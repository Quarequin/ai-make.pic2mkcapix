
const BODY_HOME = document.getElementById("body-home");

BODY_HOME.insertAdjacentHTML('beforeend',`
    <div id="notification-popup-overlay">
      <div class="popup-error-card">
        <div class="popup-header">
          <span>⚠️ PROCESS EXCEPTION DETECTED</span>
          <button class="popup-close-btn" id="popup-close-btn">DISMISS</button>
        </div>
        <div class="popup-body">
          <p style="margin: 0 0 6px 0;"><strong>Error Type:</strong> <span id="popup-err-type">N/A</span></p>
          <p style="margin: 0 0 10px 0;"><strong>Message:</strong> <span id="popup-err-message">N/A</span></p>
          <div class="popup-controls">
            <button class="popup-toggle-btn" id="btn-toggle-log">ดู log ตัวเต็ม (Show Full Log) ▼</button>
          </div>
          <pre id="popup-err-stack">No trace details available.</pre>
        </div>
      </div>
    </div>

    <h2>Image to MakeCode Arcade Image-String Vector Converter</h2>
    <div id="info">
      <p>Upload your image to render into standard matrix asset code for MakeCode Arcade retro framework.</p>
    </div>
    
    <div id="status">System Status: Awaiting Image Upload Asset...</div>

    <label>Select Target Source Image:</label>
    <input type="file" id="file" accept="image/png,image/jpeg,image/jpg,image/jxl,image/bmp,image/gif" />

    <form action="#" method="POST" id="parameters">
      <div class="settings-group">
        <div class="half">
          <div class="size-settings-grid">
            <label class="full-row"><input type="radio" name="resize" id="full-width" checked disabled /> Fix Sprite Width (160px)</label>
            <label class="full-row"><input type="radio" name="resize" id="full-height" disabled /> Fix Sprite Height (120px)</label>
            <label class="full-row"><input type="radio" name="resize" id="scale" disabled /> Custom Scale Factor</label>
            <label style="padding-left: 20px;">Scale Factor:</label>
            <input type="number" id="factor" value="0.25" step="0.1e-9" min="0.1e-9" max="8" disabled />
            
            <label class="full-row" style="border-top: 1px solid #222; margin-top: 8px; padding-top: 12px;">
              <input type="checkbox" id="ratio" checked disabled /> Keep Original Aspect Ratio
            </label>
            
            <label>Output Width (px):</label>
            <input type="number" id="width" value="160" disabled class="custom" />
            <label>Output Height (px):</label>
            <input type="number" id="height" value="120" disabled class="custom" />
          </div>

          <div class="dropdown-selection-group">
            <label for="mode-select" class="dropdown-label">Render Options (Dithering Method):</label>
            <select id="mode-select" class="custom-dropdown">
              <option value="solid" selected>Solid Color Matching (Clustering)</option>
              <option value="error">Floyd-Steinberg Error Diffusion Matrix</option>
              <option value="bayer">Ordered Bayer Matrix 4x4 Diffusion</option>
            </select>
          </div>

          <div class="dropdown-selection-group">
            <label for="subpixel-select" class="dropdown-label">Sub-pixel & Edge Enhancement Options:</label>
            <select id="subpixel-select" class="custom-dropdown">
              <option value="none" selected>None (Standard Pixel Mapping)</option>
              <option value="1bit">1-Bit Grayscale Subpixel</option>
              <option value="hinted">Grid-Aligned Pixel Hinting (Font-Style)</option>
              <option value="antialias">Anti-Aliasing Smoothing Blend</option>
              <option value="nearestNeighbor">Nearest Neighbor Sharp Alignment</option>
              <option value="smallAntiAliasing">Small-scale Anti-Aliasing (Micro Blur)</option>
            </select>
          </div>
        </div>

        <div class="colorboard">
          <div class="palette-loader-container">
            <label for="predefined-palette-select">Select Predefined Arcade Palette:</label>
            <select id="predefined-palette-select" class="custom-dropdown" style="margin-bottom: 10px;">
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
            <input type="file" id="palette-file-reader" accept="*.txt,*.hex" />
          </div>

          <span style="font-weight: bold; color: rgb(255, 240, 157);">Active Color Registers (1-15):</span>
          <div class="colorpad">
            <div class="color-pair"><label>Color 1</label><input type="color" value="#ffffff" /><input type="text" class="colortext" value="#ffffff" /></div>
            <div class="color-pair"><label>Color 2</label><input type="color" value="#ff2121" /><input type="text" class="colortext" value="#ff2121" /></div>
            <div class="color-pair"><label>Color 3</label><input type="color" value="#ff93c4" /><input type="text" class="colortext" value="#ff93c4" /></div>
            <div class="color-pair"><label>Color 4</label><input type="color" value="#ff8135" /><input type="text" class="colortext" value="#ff8135" /></div>
            <div class="color-pair"><label>Color 5</label><input type="color" value="#fff609" /><input type="text" class="colortext" value="#fff609" /></div>
            <div class="color-pair"><label>Color 6</label><input type="color" value="#249ca3" /><input type="text" class="colortext" value="#249ca3" /></div>
            <div class="color-pair"><label>Color 7</label><input type="color" value="#78dc52" /><input type="text" class="colortext" value="#78dc52" /></div>
            <div class="color-pair"><label>Color 8</label><input type="color" value="#003fad" /><input type="text" class="colortext" value="#003fad" /></div>
            <div class="color-pair"><label>Color 9</label><input type="color" value="#87f2ff" /><input type="text" class="colortext" value="#87f2ff" /></div>
            <div class="color-pair"><label>Color 10</label><input type="color" value="#8e2ec4" /><input type="text" class="colortext" value="#8e2ec4" /></div>
            <div class="color-pair"><label>Color 11</label><input type="color" value="#a4839f" /><input type="text" class="colortext" value="#a4839f" /></div>
            <div class="color-pair"><label>Color 12</label><input type="color" value="#5c406c" /><input type="text" class="colortext" value="#5c406c" /></div>
            <div class="color-pair"><label>Color 13</label><input type="color" value="#e5cdc4" /><input type="text" class="colortext" value="#e5cdc4" /></div>
            <div class="color-pair"><label>Color 14</label><input type="color" value="#91463d" /><input type="text" class="colortext" value="#91463d" /></div>
            <div class="color-pair"><label>Color 15</label><input type="color" value="#000000" /><input type="text" class="colortext" value="#000000" /></div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button id="run" type="submit" disabled>Convert Image</button>
        <button id="copy" type="button" disabled>Copy code</button>
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

    <textarea id="output" placeholder="The matrix assembly hex string will be generated into this layout sector..." readonly></textarea>
`);