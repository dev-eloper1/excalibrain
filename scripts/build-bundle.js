#!/usr/bin/env node
/**
 * build-bundle.js
 *
 * Builds a self-contained excalidraw-bundle.js for browser-based rendering.
 * Bundles @excalidraw/excalidraw's exportToSvg into an IIFE that sets
 * window.__exportToSvg, usable from Puppeteer without CDN.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'tools', 'excalidraw-bundle.js');

async function build() {
  const esbuild = require('esbuild');

  // Create temp directory for build files
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'excalidraw-bundle-'));
  const entryFile = path.join(tmpDir, 'entry.js');
  const shimFile = path.join(tmpDir, 'process-shim.js');

  try {
    // Entry file: import exportToSvg and expose on window
    fs.writeFileSync(entryFile, `
import { exportToSvg } from "@excalidraw/excalidraw";
window.__exportToSvg = exportToSvg;
`);

    // Process shim for browser environment
    fs.writeFileSync(shimFile, `
export const process = { env: { NODE_ENV: 'production' } };
`);

    console.log('Building excalidraw bundle...');

    await esbuild.build({
      entryPoints: [entryFile],
      bundle: true,
      format: 'iife',
      platform: 'browser',
      inject: [shimFile],
      define: { 'process.env.NODE_ENV': '"production"' },
      nodePaths: [path.join(ROOT, 'node_modules')],
      outfile: OUT,
      minify: true,
    });

    const stats = fs.statSync(OUT);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    console.log(`Bundle built: ${OUT} (${sizeMB}MB)`);

    // Verify bundle contains expected exports
    const content = fs.readFileSync(OUT, 'utf8');
    if (!content.includes('__exportToSvg')) {
      console.error('WARNING: Bundle does not contain __exportToSvg');
      process.exit(1);
    }
    console.log('Verified: __exportToSvg found in bundle');

  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
