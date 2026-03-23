#!/usr/bin/env node
/**
 * mermaid-convert.js
 *
 * Converts Mermaid syntax to native .excalidraw elements using
 * @excalidraw/mermaid-to-excalidraw via Puppeteer + esm.sh CDN.
 *
 * Usage:
 *   node mermaid-convert.js input.mmd --output diagram.excalidraw
 *   cat input.mmd | node mermaid-convert.js --output diagram.excalidraw
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// ── CLI arg parsing ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {};
let inputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output') { flags.output = args[++i]; }
  else if (!args[i].startsWith('--')) { inputPath = args[i]; }
}

// Read input
let mermaidSyntax;
if (inputPath) {
  mermaidSyntax = fs.readFileSync(inputPath, 'utf8');
} else {
  mermaidSyntax = fs.readFileSync('/dev/stdin', 'utf8');
}

if (!mermaidSyntax.trim()) {
  console.error('Error: empty Mermaid input');
  process.exit(1);
}

// Resolve output path
if (!flags.output) {
  if (inputPath) {
    flags.output = inputPath.replace(/\.mmd$/, '') + '.excalidraw';
  } else {
    flags.output = 'output.excalidraw';
  }
}

const TEMPLATE = path.join(__dirname, 'mermaid_template.html');

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Load the template (needs network for esm.sh CDN)
    const templateUrl = `file://${TEMPLATE}`;
    await page.goto(templateUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for module to be ready
    await page.waitForFunction('window.__moduleReady === true', { timeout: 30000 });

    // Parse the Mermaid syntax
    const result = await page.evaluate(async (syntax) => {
      return await window.__parseMermaid(syntax);
    }, mermaidSyntax);

    if (!result.success) {
      console.error('Mermaid conversion failed:', result.error);
      process.exit(1);
    }

    // Check for rasterized fallback (image elements = not native)
    const imageElements = result.elements.filter(el => el.type === 'image');
    if (imageElements.length > 0) {
      console.error(`WARNING: Output contains ${imageElements.length} image element(s) — ` +
        'Mermaid diagram type fell back to rasterized rendering. ' +
        'Consider using dagre-layout.js for this diagram type.');
    }

    // Wrap in .excalidraw format
    const output = {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements: result.elements,
      appState: {
        viewBackgroundColor: '#ffffff',
        gridSize: 20,
      },
      files: result.files || {},
    };

    fs.writeFileSync(flags.output, JSON.stringify(output, null, 2));

    const stats = fs.statSync(flags.output);
    const info = {
      success: true,
      output: flags.output,
      elementCount: result.elements.length,
      nativeElements: result.elements.filter(e => e.type !== 'image').length,
      imageElements: imageElements.length,
      fileSize: stats.size,
    };
    console.log(JSON.stringify(info));

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
