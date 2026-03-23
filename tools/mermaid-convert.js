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

    // ── Post-process: convert label properties to bound text elements ────────
    // mermaid-to-excalidraw puts text as a `label` property on shapes.
    // exportToSvg ignores `label` — it needs separate text elements.
    const extraTextElements = [];
    let seedCounter = 90000;
    for (const el of result.elements) {
      if (el.label && el.type !== 'text' && el.type !== 'arrow') {
        const textId = `${el.id}_label_${seedCounter++}`;
        // Extract label text — mermaid returns label as object {text, fontSize, groupIds} or string
        const labelObj = el.label;
        const labelText = typeof labelObj === 'string' ? labelObj : (labelObj.text || String(labelObj));
        const labelFontSize = (typeof labelObj === 'object' && labelObj.fontSize) ? labelObj.fontSize : 16;
        const lines = labelText.split('\n').length;
        const textH = lines * labelFontSize * 1.25;
        // Add text element bound to the container
        extraTextElements.push({
          type: 'text',
          id: textId,
          x: el.x + (el.width || 100) * 0.1,
          y: el.y + ((el.height || 50) - textH) / 2,
          width: (el.width || 100) * 0.8,
          height: textH,
          angle: 0,
          strokeColor: el.strokeColor || '#1e1e1e',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: el.groupIds || [],
          roundness: null,
          seed: seedCounter++,
          version: 1,
          versionNonce: seedCounter++,
          isDeleted: false,
          boundElements: null,
          link: null,
          locked: false,
          text: labelText,
          originalText: labelText,
          fontSize: labelFontSize,
          fontFamily: 1,
          textAlign: 'center',
          verticalAlign: 'middle',
          containerId: el.id,
          lineHeight: 1.25,
        });
        // Add text binding to the container's boundElements
        if (!el.boundElements) el.boundElements = [];
        el.boundElements.push({ id: textId, type: 'text' });
      }
      // Handle arrow labels separately (position at midpoint)
      if (el.label && el.type === 'arrow') {
        const labelObj = el.label;
        const labelText = typeof labelObj === 'string' ? labelObj : (labelObj.text || String(labelObj));
        if (labelText) {
          const labelFontSize = (typeof labelObj === 'object' && labelObj.fontSize) ? labelObj.fontSize : 14;
          const textId = `${el.id}_label_${seedCounter++}`;
          // Calculate midpoint of arrow
          const pts = el.points || [[0,0], [el.width || 0, el.height || 0]];
          const midIdx = Math.floor(pts.length / 2);
          const midPt = pts[midIdx] || pts[0];
          extraTextElements.push({
            type: 'text',
            id: textId,
            x: el.x + midPt[0] - (labelText.length * 4),
            y: el.y + midPt[1] - 20,
            width: labelText.length * 8 + 10,
            height: 20,
            angle: 0,
            strokeColor: el.strokeColor || '#1e1e1e',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 1,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: el.groupIds || [],
            roundness: null,
            seed: seedCounter++,
            version: 1,
            versionNonce: seedCounter++,
            isDeleted: false,
            boundElements: null,
            link: null,
            locked: false,
            text: labelText,
            originalText: labelText,
            fontSize: labelFontSize,
            fontFamily: 1,
            textAlign: 'center',
            verticalAlign: 'top',
            containerId: null,
            lineHeight: 1.25,
          });
        }
      }
    }
    const allElements = [...result.elements, ...extraTextElements];

    // Wrap in .excalidraw format
    const output = {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements: allElements,
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
