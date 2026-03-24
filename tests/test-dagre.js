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

// ── Test 5: annotations — absolute and anchored ─────────────────────────────
test('annotations: absolute annotation has correct position', () => {
  const result = run('annotated-flow.json');
  const anno1 = result.elements.find(e => e.id === 'anno_1');
  assert(anno1, 'Annotation anno_1 not found');
  assert(anno1.type === 'text', `Expected type "text", got ${anno1.type}`);
  assert(anno1.x === 300, `Expected x=300, got ${anno1.x}`);
  assert(anno1.y === 100, `Expected y=100, got ${anno1.y}`);
  assert(anno1.text === 'This is a test annotation', `Wrong text: ${anno1.text}`);
});

test('annotations: anchored annotation is positioned near start node', () => {
  const result = run('annotated-flow.json');
  const startNode = result.elements.find(e => e.id === 'start');
  const anno2 = result.elements.find(e => e.id === 'anno_2');
  assert(startNode, 'Node "start" not found');
  assert(anno2, 'Annotation anno_2 not found');
  assert(anno2.type === 'text', `Expected type "text", got ${anno2.type}`);
  // Anchored annotation should be below the start node (y = startNode.y + startNode.height + dy)
  const expectedY = startNode.y + startNode.height + 20;
  assert(anno2.y === expectedY,
    `Expected anno_2 y=${expectedY}, got ${anno2.y}`);
});

test('annotations: --prefix applies to annotation IDs', () => {
  const input = path.join(FIXTURES, 'annotated-flow.json');
  const out = execFileSync('node', [TOOL, input, '--prefix', 'pfx_'], { encoding: 'utf8' });
  const result = JSON.parse(out);
  const anno1 = result.elements.find(e => e.id === 'pfx_anno_1');
  const anno2 = result.elements.find(e => e.id === 'pfx_anno_2');
  assert(anno1, 'Prefixed annotation pfx_anno_1 not found');
  assert(anno2, 'Prefixed annotation pfx_anno_2 not found');
});

// ── Test 8: arrows use clean Z-shape routing (max 4 points) ─────────────────
test('dense-graph: arrows have at most 4 points (clean Z-shape)', () => {
  const result = run('dense-graph.json');
  const arrows = result.elements.filter(e => e.type === 'arrow');
  assert(arrows.length >= 6, `Expected ≥6 arrows, got ${arrows.length}`);
  for (const arrow of arrows) {
    assert(arrow.points.length <= 4,
      `Arrow ${arrow.id} has ${arrow.points.length} points (expected ≤4)`);
  }
});

// ── Test 9: arrows have no duplicate consecutive points ─────────────────────
test('dense-graph: no duplicate consecutive arrow points', () => {
  const result = run('dense-graph.json');
  const arrows = result.elements.filter(e => e.type === 'arrow');
  for (const arrow of arrows) {
    for (let i = 1; i < arrow.points.length; i++) {
      const prev = arrow.points[i - 1];
      const curr = arrow.points[i];
      const same = Math.abs(curr[0] - prev[0]) < 3 && Math.abs(curr[1] - prev[1]) < 3;
      assert(!same,
        `Arrow ${arrow.id} has duplicate points at index ${i-1}/${i}: ${JSON.stringify(prev)} ≈ ${JSON.stringify(curr)}`);
    }
  }
});

// ── Test 10: annotations don't overlap each other ───────────────────────────
test('dense-graph: annotations do not overlap each other', () => {
  const result = run('dense-graph.json');
  const annos = result.elements.filter(e =>
    e.type === 'text' && (e.id === 'note_a' || e.id === 'note_b' || e.id === 'note_c')
  );
  assert(annos.length === 3, `Expected 3 annotations, got ${annos.length}`);

  for (let i = 0; i < annos.length; i++) {
    for (let j = i + 1; j < annos.length; j++) {
      const a = annos[i], b = annos[j];
      const overlap =
        a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y;
      assert(!overlap,
        `Annotations ${a.id} and ${b.id} overlap: ` +
        `(${a.x},${a.y},${a.width},${a.height}) vs (${b.x},${b.y},${b.width},${b.height})`);
    }
  }
});

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
