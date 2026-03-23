#!/usr/bin/env node
/**
 * export.js
 *
 * Renders .excalidraw files to PNG or SVG using a local Excalidraw bundle + Puppeteer.
 *
 * Usage:
 *   node export.js input.excalidraw --format png --output diagram.png
 *   node export.js input.excalidraw --format svg --output diagram.svg
 *
 * Options:
 *   --format png|svg   Output format (default: png)
 *   --output <path>    Output file path (default: input with new extension)
 *   --scale <n>        PNG scale factor (default: 2)
 *   --dark             Use dark mode
 *   --padding <n>      Export padding in px (default: 20)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ── CLI arg parsing ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = { format: 'png', scale: 2, padding: 20, dark: false };
let inputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--format')  { flags.format  = args[++i]; }
  else if (args[i] === '--output')  { flags.output  = args[++i]; }
  else if (args[i] === '--scale')   { flags.scale   = Number(args[++i]); }
  else if (args[i] === '--dark')    { flags.dark    = true; }
  else if (args[i] === '--padding') { flags.padding = Number(args[++i]); }
  else if (!args[i].startsWith('--')) { inputPath = args[i]; }
}

if (!inputPath) {
  console.error('Usage: node export.js input.excalidraw [--format png|svg] [--output path]');
  process.exit(1);
}

// Resolve output path
if (!flags.output) {
  const ext = flags.format === 'svg' ? '.svg' : '.png';
  flags.output = inputPath.replace(/\.excalidraw$/, '') + ext;
}

const TEMPLATE = path.join(__dirname, 'render_template.html');

async function main() {
  // Read input
  const inputJson = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(inputJson);

  // Apply dark mode if requested
  if (flags.dark) {
    data.appState = data.appState || {};
    data.appState.exportWithDarkMode = true;
  }

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Load the template
    const templateUrl = `file://${TEMPLATE}`;
    await page.goto(templateUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for module to be ready
    await page.waitForFunction('window.__moduleReady === true', { timeout: 10000 });

    // Render the diagram
    const result = await page.evaluate(async (jsonStr) => {
      const data = JSON.parse(jsonStr);
      return await window.renderDiagram(data);
    }, JSON.stringify(data));

    if (!result.success) {
      console.error('Render failed:', result.error);
      process.exit(1);
    }

    if (flags.format === 'svg') {
      // Write SVG directly
      fs.writeFileSync(flags.output, result.svgString);
    } else {
      // PNG: inject SVG into page and screenshot it
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head><style>body { margin: 0; padding: 0; background: transparent; }</style></head>
        <body>${result.svgString}</body>
        </html>
      `);

      const svgEl = await page.$('svg');
      if (!svgEl) {
        console.error('Failed to find SVG element for screenshot');
        process.exit(1);
      }

      // Set viewport to match SVG size with scale
      await page.setViewport({
        width: Math.ceil(result.width * flags.scale),
        height: Math.ceil(result.height * flags.scale),
        deviceScaleFactor: flags.scale,
      });

      const pngBuffer = await svgEl.screenshot({
        type: 'png',
        omitBackground: false,
      });

      // Optionally optimize with sharp
      try {
        const sharp = require('sharp');
        const optimized = await sharp(pngBuffer).png({ quality: 90 }).toBuffer();
        fs.writeFileSync(flags.output, optimized);
      } catch {
        // Fall back to raw screenshot if sharp fails
        fs.writeFileSync(flags.output, pngBuffer);
      }
    }

    const stats = fs.statSync(flags.output);
    const result_info = {
      success: true,
      output: flags.output,
      format: flags.format,
      fileSize: stats.size,
      width: result.width,
      height: result.height,
    };
    console.log(JSON.stringify(result_info));

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
