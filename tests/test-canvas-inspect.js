#!/usr/bin/env node
/**
 * Tests for canvas-inspect.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOOL = path.join(__dirname, '..', 'tools', 'canvas-inspect.js');

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

function run(file) {
  const out = execFileSync('node', [TOOL, file], { encoding: 'utf8' });
  return JSON.parse(out);
}

const ECOMMERCE = path.join(__dirname, '..', 'examples', 'architecture', 'ecommerce.excalidraw');

// ── Test 1: outputs valid JSON with required fields ──────────────────────────
test('outputs valid JSON with required fields', () => {
  const result = run(ECOMMERCE);
  assert(typeof result.elementCount === 'number', 'Missing elementCount');
  assert(typeof result.byType === 'object' && result.byType !== null, 'Missing byType');
  assert(typeof result.bounds === 'object' && result.bounds !== null, 'Missing bounds');
  assert(Array.isArray(result.freeSpace), 'Missing freeSpace array');
  assert(typeof result.byPrefix === 'object' && result.byPrefix !== null, 'Missing byPrefix');
});

// ── Test 2: elementCount matches actual non-deleted elements ─────────────────
test('elementCount matches actual non-deleted elements', () => {
  const raw = JSON.parse(fs.readFileSync(ECOMMERCE, 'utf8'));
  const expected = raw.elements.filter(e => !e.isDeleted).length;
  const result = run(ECOMMERCE);
  assert(result.elementCount === expected,
    `Expected elementCount ${expected}, got ${result.elementCount}`);
});

// ── Test 3: byType includes rectangle and arrow counts ───────────────────────
test('byType includes rectangle and arrow counts', () => {
  const result = run(ECOMMERCE);
  assert(typeof result.byType.rectangle === 'number' && result.byType.rectangle > 0,
    `Expected rectangle count > 0, got ${result.byType.rectangle}`);
  assert(typeof result.byType.arrow === 'number' && result.byType.arrow > 0,
    `Expected arrow count > 0, got ${result.byType.arrow}`);
});

// ── Test 4: bounds has x, y, w, h fields ─────────────────────────────────────
test('bounds has x, y, w, h fields', () => {
  const result = run(ECOMMERCE);
  assert(typeof result.bounds.x === 'number', 'Missing bounds.x');
  assert(typeof result.bounds.y === 'number', 'Missing bounds.y');
  assert(typeof result.bounds.w === 'number', 'Missing bounds.w');
  assert(typeof result.bounds.h === 'number', 'Missing bounds.h');
  assert(result.bounds.w > 0, `Expected bounds.w > 0, got ${result.bounds.w}`);
  assert(result.bounds.h > 0, `Expected bounds.h > 0, got ${result.bounds.h}`);
});

// ── Test 5: byPrefix is an object (may be empty for unprefixed IDs) ─────────
test('byPrefix is an object with groups for prefixed IDs', () => {
  const result = run(ECOMMERCE);
  assert(typeof result.byPrefix === 'object' && result.byPrefix !== null,
    'byPrefix should be an object');
  // ecommerce has zone_ prefixed IDs
  const keys = Object.keys(result.byPrefix);
  assert(keys.length > 0, 'Expected at least one prefix group');
  // Each group should have count, ids, bbox
  for (const key of keys) {
    const group = result.byPrefix[key];
    assert(typeof group.count === 'number', `${key} missing count`);
    assert(Array.isArray(group.ids), `${key} missing ids array`);
    assert(typeof group.bbox === 'object', `${key} missing bbox`);
    assert(group.count === group.ids.length,
      `${key} count ${group.count} != ids.length ${group.ids.length}`);
  }
});

// ── Test 6: handles empty canvas ─────────────────────────────────────────────
test('handles empty canvas', () => {
  const tmpFile = path.join(os.tmpdir(), `empty-canvas-${Date.now()}.excalidraw`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify({
      type: 'excalidraw',
      version: 2,
      elements: []
    }));
    const result = run(tmpFile);
    assert(result.elementCount === 0, `Expected 0 elements, got ${result.elementCount}`);
    assert(Object.keys(result.byType).length === 0, 'Expected empty byType');
    assert(Object.keys(result.byPrefix).length === 0, 'Expected empty byPrefix');
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
