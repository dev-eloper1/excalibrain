#!/usr/bin/env node
/**
 * Tests for export.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DAGRE_TOOL = path.join(__dirname, '..', 'tools', 'dagre-layout.js');
const EXPORT_TOOL = path.join(__dirname, '..', 'tools', 'export.js');
const FIXTURES = path.join(__dirname, 'fixtures');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// Generate a test .excalidraw file first
const testExcalidraw = '/tmp/test-export-input.excalidraw';
execFileSync('node', [DAGRE_TOOL, path.join(FIXTURES, 'simple-flow.json'), '--output', testExcalidraw]);

// ── Test 1: export PNG ──────────────────────────────────────────────────────
test('export-png: produces PNG file > 1KB', () => {
  const outPng = '/tmp/test-export.png';
  try { fs.unlinkSync(outPng); } catch {}
  execFileSync('node', [EXPORT_TOOL, testExcalidraw, '--format', 'png', '--output', outPng], {
    timeout: 30000,
  });
  assert(fs.existsSync(outPng), 'PNG file not created');
  const stats = fs.statSync(outPng);
  assert(stats.size > 1024, `PNG too small: ${stats.size} bytes`);
});

// ── Test 2: export SVG ──────────────────────────────────────────────────────
test('export-svg: produces SVG file containing <svg> tag', () => {
  const outSvg = '/tmp/test-export.svg';
  try { fs.unlinkSync(outSvg); } catch {}
  execFileSync('node', [EXPORT_TOOL, testExcalidraw, '--format', 'svg', '--output', outSvg], {
    timeout: 30000,
  });
  assert(fs.existsSync(outSvg), 'SVG file not created');
  const content = fs.readFileSync(outSvg, 'utf8');
  assert(content.includes('<svg'), 'SVG file does not contain <svg> tag');
});

// ── Test 3: SVG has font declarations ───────────────────────────────────────
test('export-svg-has-font-declarations: SVG contains @font-face for Excalidraw fonts', () => {
  const outSvg = '/tmp/test-export.svg';
  const content = fs.readFileSync(outSvg, 'utf8');
  assert(content.includes('@font-face'), 'SVG missing @font-face');
  assert(content.includes('Virgil'), 'SVG missing Virgil font reference');
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
