#!/usr/bin/env node
/**
 * mermaid-convert.js
 *
 * Converts Mermaid syntax to native .excalidraw elements using
 * @excalidraw/mermaid-to-excalidraw via Puppeteer + esm.sh CDN.
 *
 * Usage:
 *   node mermaid-convert.js input.mmd --output diagram.excalidraw
 *   node mermaid-convert.js input.mmd --theme dark --output diagram.excalidraw
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
  else if (args[i] === '--theme') { flags.theme = args[++i]; }
  else if (args[i] === '--prefix') { flags.prefix = args[++i]; }
  else if (args[i] === '--position') { flags.position = args[++i]; }
  else if (args[i] === '--merge') { flags.merge = args[++i]; }
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

// ── Theme loading ─────────────────────────────────────────────────────────────
const THEMES_DIR = path.join(__dirname, 'themes');
const themeName = flags.theme ?? 'default';
let theme = {};
try {
  const themePath = path.join(THEMES_DIR, `${themeName}.json`);
  theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
} catch {
  if (themeName !== 'default') {
    console.error(`Warning: theme "${themeName}" not found, using defaults`);
  }
}
const canvasBackground = theme.canvas?.background ?? '#ffffff';

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

    // ── Post-process: fix text sizing for Virgil font ──────────────────────
    // The mermaid-to-excalidraw library calculates text widths based on generic
    // font metrics, but Excalidraw's Virgil (hand-drawn) font is wider. We need
    // to recalculate and resize containers to fit.
    const allElements = result.elements;

    // Virgil font width estimation: ~0.65 * fontSize per character
    const CHAR_WIDTH_FACTOR = 0.65;
    const PADDING = 32; // horizontal padding inside containers
    const LINE_HEIGHT_FACTOR = 1.25;
    const VERTICAL_PADDING = 20;

    for (const el of allElements) {
      if (el.type !== 'text') continue;

      // Fix literal \n — replace backslash-n sequences with real newlines
      if (el.text && el.text.includes('\\n')) {
        el.text = el.text.replace(/\\n/g, '\n');
        if (el.originalText) {
          el.originalText = el.originalText.replace(/\\n/g, '\n');
        }
      }

      // Set autoResize so Excalidraw fixes text on load
      el.autoResize = true;

      // Recalculate text dimensions based on Virgil metrics
      const lines = el.text.split('\n');
      const fontSize = el.fontSize || 20;
      const maxLineLen = Math.max(...lines.map(l => l.length), 1);
      const estWidth = maxLineLen * fontSize * CHAR_WIDTH_FACTOR;
      const estHeight = lines.length * fontSize * LINE_HEIGHT_FACTOR;

      el.width = Math.ceil(estWidth);
      el.height = Math.ceil(estHeight);

      // If this text is inside a container, resize the container to fit
      if (el.containerId) {
        const container = allElements.find(c => c.id === el.containerId);
        if (container) {
          const neededW = estWidth + PADDING;
          const neededH = estHeight + VERTICAL_PADDING;

          // For diamonds, need more space (text area is ~50% of shape)
          const scale = container.type === 'diamond' ? 2.0 : 1.0;

          if (neededW * scale > container.width) {
            container.width = Math.ceil(neededW * scale / 10) * 10;
          }
          if (neededH * scale > container.height) {
            container.height = Math.ceil(neededH * scale / 10) * 10;
          }
        }
      }
    }

    // ── Apply --prefix ──────────────────────────────────────────────────────
    if (flags.prefix) {
      const p = flags.prefix;
      for (const el of allElements) {
        el.id = p + el.id;
        if (el.containerId) el.containerId = p + el.containerId;
        if (el.frameId) el.frameId = p + el.frameId;
        if (el.boundElements) {
          el.boundElements = el.boundElements.map(ref => ({ ...ref, id: p + ref.id }));
        }
        if (el.startBinding && el.startBinding.elementId) {
          el.startBinding = { ...el.startBinding, elementId: p + el.startBinding.elementId };
        }
        if (el.endBinding && el.endBinding.elementId) {
          el.endBinding = { ...el.endBinding, elementId: p + el.endBinding.elementId };
        }
      }
    }

    // ── Apply --position ────────────────────────────────────────────────────
    if (flags.position) {
      const [ox, oy] = flags.position.split(',').map(Number);
      for (const el of allElements) {
        el.x += ox;
        el.y += oy;
      }
    }

    // ── Merge or wrap in .excalidraw format ─────────────────────────────────
    let finalElements = allElements;
    let appState = {
      viewBackgroundColor: canvasBackground,
      gridSize: 20,
    };
    let files = result.files || {};

    if (flags.merge) {
      const existing = JSON.parse(fs.readFileSync(flags.merge, 'utf8'));
      finalElements = existing.elements.concat(allElements);
      appState = existing.appState || appState;
      files = { ...(existing.files || {}), ...files };
    }

    const output = {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements: finalElements,
      appState,
      files,
    };

    fs.writeFileSync(flags.output, JSON.stringify(output, null, 2));

    const stats = fs.statSync(flags.output);
    const info = {
      success: true,
      output: flags.output,
      theme: themeName,
      elementCount: allElements.length,
      nativeElements: allElements.filter(e => e.type !== 'image').length,
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
