#!/usr/bin/env node
/**
 * Tests for hooks/fast-check.js — validateExcalidraw function
 */

const path = require('path');
const fs = require('fs');

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

const { validateExcalidraw } = require('../hooks/fast-check.js');

// ── Test 1: Valid file — no errors ──────────────────────────────────────────
test('valid excalidraw file produces no errors', () => {
  const exFile = path.join(__dirname, '..', 'examples', 'flowchart', 'cicd-pipeline.excalidraw');
  const data = JSON.parse(fs.readFileSync(exFile, 'utf8'));
  const active = data.elements.filter(e => !e.isDeleted);
  const errors = validateExcalidraw(active);
  assert(errors.length === 0, `Expected 0 errors, got ${errors.length}: ${errors.join('; ')}`);
});

// ── Test 2: Arrow with binding to non-existent element ──────────────────────
test('arrow referencing non-existent element reports error', () => {
  const elements = [
    { id: 'rect1', type: 'rectangle', x: 0, y: 0, width: 100, height: 50 },
    {
      id: 'arrow1', type: 'arrow', x: 50, y: 25,
      startBinding: { elementId: 'rect1', focus: 0, gap: 1 },
      endBinding: { elementId: 'missing_node', focus: 0, gap: 1 },
    },
  ];
  const errors = validateExcalidraw(elements);
  assert(errors.length === 1, `Expected 1 error, got ${errors.length}: ${errors.join('; ')}`);
  assert(errors[0].includes('missing_node'), `Error should mention 'missing_node': ${errors[0]}`);
  assert(errors[0].includes('arrow1'), `Error should mention 'arrow1': ${errors[0]}`);
  assert(errors[0].includes('endBinding'), `Error should mention 'endBinding': ${errors[0]}`);
});

// ── Test 3: Duplicate element IDs ───────────────────────────────────────────
test('duplicate element IDs reports error', () => {
  const elements = [
    { id: 'node1', type: 'rectangle', x: 0, y: 0, width: 100, height: 50 },
    { id: 'node1', type: 'ellipse', x: 200, y: 200, width: 80, height: 80 },
  ];
  const errors = validateExcalidraw(elements);
  assert(errors.length === 1, `Expected 1 error, got ${errors.length}: ${errors.join('; ')}`);
  assert(errors[0].includes('node1'), `Error should mention 'node1': ${errors[0]}`);
  assert(errors[0].toLowerCase().includes('duplicate'), `Error should mention 'Duplicate': ${errors[0]}`);
});

// ── Test 4: Two rectangles at identical coordinates ─────────────────────────
test('two non-text non-arrow elements at same coordinates reports overlap', () => {
  const elements = [
    { id: 'r1', type: 'rectangle', x: 100, y: 200, width: 120, height: 60 },
    { id: 'r2', type: 'rectangle', x: 100.5, y: 200.3, width: 120, height: 60 },
  ];
  const errors = validateExcalidraw(elements);
  assert(errors.length === 1, `Expected 1 error, got ${errors.length}: ${errors.join('; ')}`);
  assert(errors[0].includes('r1'), `Error should mention 'r1': ${errors[0]}`);
  assert(errors[0].includes('r2'), `Error should mention 'r2': ${errors[0]}`);
  assert(errors[0].toLowerCase().includes('overlap'), `Error should mention 'overlap': ${errors[0]}`);
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
