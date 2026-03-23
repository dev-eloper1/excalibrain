#!/usr/bin/env node
/**
 * Tests for dagre-layout.js
 */

const { execFileSync } = require('child_process');
const path = require('path');

const TOOL = path.join(__dirname, '..', 'tools', 'dagre-layout.js');
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

function run(fixture) {
  const input = path.join(FIXTURES, fixture);
  const out = execFileSync('node', [TOOL, input], { encoding: 'utf8' });
  return JSON.parse(out);
}

// ── Test 1: simple-flow — arrows have bindings ──────────────────────────────
test('simple-flow: all arrows have startBinding and endBinding with elementId', () => {
  const result = run('simple-flow.json');
  const arrows = result.elements.filter(e => e.type === 'arrow');
  assert(arrows.length >= 2, `Expected ≥2 arrows, got ${arrows.length}`);
  for (const arrow of arrows) {
    assert(arrow.startBinding && arrow.startBinding.elementId,
      `Arrow ${arrow.id} missing startBinding.elementId`);
    assert(arrow.endBinding && arrow.endBinding.elementId,
      `Arrow ${arrow.id} missing endBinding.elementId`);
  }
});

// ── Test 2: multiline-labels — 3-line label node has height > 50 ────────────
test('multiline-labels: 3-line label node has height > 50', () => {
  const result = run('multiline-labels.json');
  // Find the node with 3-line label (node "c" has "PostgreSQL\nRead Replica\nCluster")
  const node = result.elements.find(e => e.id === 'c');
  assert(node, 'Node "c" not found');
  assert(node.height > 50, `Expected height > 50, got ${node.height}`);
});

// ── Test 3: architecture — zones exist and appear before nodes ──────────────
test('architecture: zone backgrounds exist and appear before nodes in elements', () => {
  const result = run('architecture.json');
  const zones = result.elements.filter(e => e.id && e.id.startsWith('zone_'));
  const nodes = result.elements.filter(e =>
    e.type === 'rectangle' && e.id && !e.id.startsWith('zone_') && !e.id.endsWith('_text')
  );
  assert(zones.length >= 3, `Expected ≥3 zone elements, got ${zones.length}`);

  // Zones should appear before nodes in the array
  const firstZoneIdx = result.elements.findIndex(e => e.id && e.id.startsWith('zone_'));
  const firstNodeIdx = result.elements.findIndex(e =>
    e.type === 'rectangle' && e.id && !e.id.startsWith('zone_') && !e.id.endsWith('_text') && !e.id.startsWith('zone_')
  );
  assert(firstZoneIdx < firstNodeIdx,
    `First zone at index ${firstZoneIdx} should be before first node at index ${firstNodeIdx}`);
});

// ── Test 4: valid excalidraw format ─────────────────────────────────────────
test('valid-excalidraw-format: version=2, appState exists, all elements have required fields', () => {
  const result = run('simple-flow.json');
  assert(result.version === 2, `Expected version 2, got ${result.version}`);
  assert(result.type === 'excalidraw', `Expected type "excalidraw", got ${result.type}`);
  assert(result.appState, 'Missing appState');
  assert(result.elements && result.elements.length > 0, 'No elements');
  for (const el of result.elements) {
    assert(el.type, `Element ${el.id} missing type`);
    assert(el.id, `Element missing id`);
    assert(el.x !== undefined, `Element ${el.id} missing x`);
    assert(el.y !== undefined, `Element ${el.id} missing y`);
  }
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
