#!/usr/bin/env node
/**
 * Tests for mermaid-convert.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOOL = path.join(__dirname, '..', 'tools', 'mermaid-convert.js');
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

function convert(fixture) {
  const input = path.join(FIXTURES, fixture);
  const output = `/tmp/test-mermaid-${fixture.replace('.mmd', '')}.excalidraw`;
  try { fs.unlinkSync(output); } catch {}
  execFileSync('node', [TOOL, input, '--output', output], {
    timeout: 60000,
    encoding: 'utf8',
  });
  const content = fs.readFileSync(output, 'utf8');
  return JSON.parse(content);
}

function assertNativeElements(result, type) {
  const elements = result.elements || [];
  assert(elements.length > 0, `${type}: no elements produced`);
  // Check that we have native elements (rectangles, arrows, text, etc.)
  // and NOT rasterized images
  const nativeTypes = ['rectangle', 'arrow', 'text', 'line', 'ellipse', 'diamond'];
  const native = elements.filter(e => nativeTypes.includes(e.type));
  const images = elements.filter(e => e.type === 'image');
  assert(native.length > 0, `${type}: no native elements (only ${elements.map(e => e.type).join(', ')})`);
  assert(images.length === 0, `${type}: has ${images.length} rasterized image elements — not native`);
}

// ── Test 1: flowchart ───────────────────────────────────────────────────────
test('flowchart: produces native elements, not rasterized', () => {
  const result = convert('flowchart.mmd');
  assertNativeElements(result, 'flowchart');
});

// ── Test 2: sequence ────────────────────────────────────────────────────────
test('sequence: produces native elements, not rasterized', () => {
  const result = convert('sequence.mmd');
  assertNativeElements(result, 'sequence');
});

// ── Test 3: class ───────────────────────────────────────────────────────────
test('class: produces native elements, not rasterized', () => {
  const result = convert('class.mmd');
  assertNativeElements(result, 'class');
});

// ── Test 4: ER ──────────────────────────────────────────────────────────────
test('er: produces native elements, not rasterized', () => {
  const result = convert('er.mmd');
  assertNativeElements(result, 'er');
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
