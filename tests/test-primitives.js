#!/usr/bin/env node
/**
 * Tests for tools/primitives.js
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TOOL = path.join(__dirname, '..', 'tools', 'primitives.js');
const FIXTURES = path.join(__dirname, 'fixtures');
const TMP = os.tmpdir();

let passed = 0, failed = 0;
function test(name, fn) {
  const tmpFiles = [];
  try {
    fn(tmpFiles);
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (e) {
    console.log(`  \u2717 ${name}\n    ${e.message}`);
    failed++;
  } finally {
    for (const f of tmpFiles) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  }
}
function assert(c, m) { if (!c) throw new Error(m); }

function runWithInput(input, extraArgs = [], tmpFiles) {
  const tmpIn = path.join(TMP, `prim-in-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  tmpFiles.push(tmpIn);
  fs.writeFileSync(tmpIn, JSON.stringify(input));
  const out = execFileSync('node', [TOOL, tmpIn, ...extraArgs], { encoding: 'utf8' });
  return JSON.parse(out);
}

// ── Test 1: button generates rect + text ──────────────────────────────────────
test('button generates rect + text', (tmpFiles) => {
  const result = runWithInput({
    primitives: [{ type: 'button', x: 0, y: 0, label: 'Click Me', variant: 'primary' }]
  }, [], tmpFiles);

  const rects = result.elements.filter(e => e.type === 'rectangle');
  const texts = result.elements.filter(e => e.type === 'text');
  assert(rects.length >= 1, `Expected at least 1 rectangle, got ${rects.length}`);
  assert(texts.length >= 1, `Expected at least 1 text, got ${texts.length}`);
  assert(texts.some(t => t.text === 'Click Me'), 'Text should contain "Click Me"');
  // Primary button should have blue fill
  assert(rects[0].backgroundColor === '#3b82f6', `Expected blue fill, got ${rects[0].backgroundColor}`);
});

// ── Test 2: input generates rect + placeholder + label ────────────────────────
test('input generates rect + placeholder + label', (tmpFiles) => {
  const result = runWithInput({
    primitives: [{ type: 'input', x: 0, y: 0, placeholder: 'Email', label: 'Email Address' }]
  }, [], tmpFiles);

  const rects = result.elements.filter(e => e.type === 'rectangle');
  const texts = result.elements.filter(e => e.type === 'text');
  assert(rects.length >= 1, `Expected at least 1 rectangle, got ${rects.length}`);
  assert(texts.length >= 2, `Expected at least 2 texts (label + placeholder), got ${texts.length}`);
  assert(texts.some(t => t.text === 'Email Address'), 'Should have label text');
  assert(texts.some(t => t.text === 'Email'), 'Should have placeholder text');
});

// ── Test 3: screen generates correct dimensions ──────────────────────────────
test('screen generates mobile with correct dimensions', (tmpFiles) => {
  const result = runWithInput({
    primitives: [{ type: 'screen', x: 0, y: 0, size: 'mobile', title: 'Home' }]
  }, [], tmpFiles);

  const rects = result.elements.filter(e => e.type === 'rectangle');
  // The outer frame rect should be 390x780
  const frame = rects.find(r => r.width === 390 && r.height === 780);
  assert(frame, `Expected a 390x780 rectangle for mobile screen, got sizes: ${rects.map(r => `${r.width}x${r.height}`).join(', ')}`);
});

// ── Test 4: multiple primitives don't overlap ────────────────────────────────
test('multiple primitives at different positions don\'t share coordinates', (tmpFiles) => {
  const result = runWithInput({
    primitives: [
      { type: 'button', x: 0, y: 0, label: 'A' },
      { type: 'button', x: 200, y: 0, label: 'B' }
    ]
  }, [], tmpFiles);

  const rects = result.elements.filter(e => e.type === 'rectangle');
  assert(rects.length >= 2, `Expected at least 2 rectangles, got ${rects.length}`);
  // First button at x=0, second at x=200
  const xs = rects.map(r => r.x);
  assert(xs.some(x => x === 0), 'First button should be at x=0');
  assert(xs.some(x => x === 200), 'Second button should be at x=200');
});

// ── Test 5: --merge appends to existing canvas ───────────────────────────────
test('--merge appends to existing canvas', (tmpFiles) => {
  const tmpCanvas = path.join(TMP, `prim-merge-${Date.now()}.excalidraw`);
  tmpFiles.push(tmpCanvas);

  // Create a canvas with one existing element
  const existing = {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements: [{
      id: 'existing_1',
      type: 'rectangle',
      x: 0, y: 0, width: 100, height: 100,
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 1,
      roughness: 1,
      opacity: 100,
      roundness: null,
      seed: 1,
      version: 1,
      versionNonce: 1,
      isDeleted: false,
      boundElements: null,
      groupIds: [],
      frameId: null,
      link: null,
      locked: false,
    }],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  };
  fs.writeFileSync(tmpCanvas, JSON.stringify(existing));

  const tmpIn = path.join(TMP, `prim-merge-in-${Date.now()}.json`);
  tmpFiles.push(tmpIn);
  fs.writeFileSync(tmpIn, JSON.stringify({
    primitives: [{ type: 'button', x: 200, y: 200, label: 'New', variant: 'primary' }]
  }));

  execFileSync('node', [TOOL, tmpIn, '--merge', tmpCanvas, '--output', tmpCanvas]);

  const merged = JSON.parse(fs.readFileSync(tmpCanvas, 'utf8'));
  assert(merged.elements.length > 1, `Merged should have > 1 element, got ${merged.elements.length}`);
  assert(merged.elements.some(e => e.id === 'existing_1'), 'Original element should still be present');
  assert(merged.elements.some(e => e.type === 'text' && e.text === 'New'), 'New button text should be present');
});

// ── Test 6: fixture file produces valid excalidraw output ────────────────────
test('fixture primitives-input.json produces valid excalidraw output', (tmpFiles) => {
  const input = path.join(FIXTURES, 'primitives-input.json');
  const out = execFileSync('node', [TOOL, input], { encoding: 'utf8' });
  const result = JSON.parse(out);
  assert(result.type === 'excalidraw', 'Output should be excalidraw type');
  assert(result.version === 2, 'Version should be 2');
  assert(result.elements.length > 0, 'Should have elements');
  // Should have screen, inputs, and button elements
  const rects = result.elements.filter(e => e.type === 'rectangle');
  const texts = result.elements.filter(e => e.type === 'text');
  assert(rects.length >= 4, `Expected >= 4 rectangles (screen + 2 inputs + button), got ${rects.length}`);
  assert(texts.length >= 4, `Expected >= 4 texts, got ${texts.length}`);
});

// ── Test 7: --position offsets all elements ──────────────────────────────────
test('--position offsets all elements', (tmpFiles) => {
  const result = runWithInput({
    primitives: [{ type: 'button', x: 0, y: 0, label: 'Test' }]
  }, ['--position', '500,300'], tmpFiles);

  const rects = result.elements.filter(e => e.type === 'rectangle');
  assert(rects.length >= 1, 'Should have rectangles');
  assert(rects[0].x >= 500, `Expected x >= 500, got ${rects[0].x}`);
  assert(rects[0].y >= 300, `Expected y >= 300, got ${rects[0].y}`);
});

// ── Test 8: card generates rect + title + body ──────────────────────────────
test('card generates rect + title + body text', (tmpFiles) => {
  const result = runWithInput({
    primitives: [{ type: 'card', x: 0, y: 0, title: 'Card Title', body: 'Some body text' }]
  }, [], tmpFiles);

  const rects = result.elements.filter(e => e.type === 'rectangle');
  const texts = result.elements.filter(e => e.type === 'text');
  assert(rects.length >= 1, 'Should have card rectangle');
  assert(texts.some(t => t.text === 'Card Title'), 'Should have title text');
  assert(texts.some(t => t.text === 'Some body text'), 'Should have body text');
});

// ── Test 9: avatar generates ellipse + text ──────────────────────────────────
test('avatar generates ellipse + initials', (tmpFiles) => {
  const result = runWithInput({
    primitives: [{ type: 'avatar', x: 0, y: 0, initials: 'AB' }]
  }, [], tmpFiles);

  const ellipses = result.elements.filter(e => e.type === 'ellipse');
  const texts = result.elements.filter(e => e.type === 'text');
  assert(ellipses.length >= 1, 'Should have ellipse for avatar');
  assert(texts.some(t => t.text === 'AB'), 'Should have initials text');
});

// ── Test 10: divider generates line ──────────────────────────────────────────
test('divider generates a line element', (tmpFiles) => {
  const result = runWithInput({
    primitives: [{ type: 'divider', x: 0, y: 0 }]
  }, [], tmpFiles);

  const lines = result.elements.filter(e => e.type === 'line');
  assert(lines.length >= 1, `Expected at least 1 line, got ${lines.length}`);
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
