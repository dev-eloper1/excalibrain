#!/usr/bin/env node
/**
 * Tests for canvas-edit.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOOL = path.join(__dirname, '..', 'tools', 'canvas-edit.js');

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

function makeTempFile(prefix, data) {
  const tmpPath = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.excalidraw`);
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  return tmpPath;
}

// ── Test 1: update changes element property ──────────────────────────────────
test('update: changes element property', () => {
  const data = {
    type: 'excalidraw',
    version: 2,
    elements: [
      {
        id: 'rect1',
        type: 'rectangle',
        x: 0, y: 0,
        width: 100, height: 50,
        backgroundColor: '#ffffff',
        strokeColor: '#000000',
      }
    ],
    appState: {}
  };
  const tmpPath = makeTempFile('edit-update', data);
  try {
    const stdout = execFileSync('node', [TOOL, tmpPath, 'update', 'rect1', 'backgroundColor', '#ff0000'], { encoding: 'utf8' });
    assert(stdout.includes('Updated'), `Expected confirmation, got: ${stdout}`);
    const result = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    assert(result.elements[0].backgroundColor === '#ff0000', `Expected #ff0000, got ${result.elements[0].backgroundColor}`);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
});

// ── Test 2: delete removes element and cleans up bindings ────────────────────
test('delete: removes element and cleans up bindings', () => {
  const data = {
    type: 'excalidraw',
    version: 2,
    elements: [
      {
        id: 'rect1',
        type: 'rectangle',
        x: 0, y: 0,
        width: 100, height: 50,
        boundElements: [{ id: 'arrow1', type: 'arrow' }],
      },
      {
        id: 'arrow1',
        type: 'arrow',
        x: 100, y: 25,
        width: 200, height: 0,
        startBinding: { elementId: 'rect1', focus: 0, gap: 5 },
        endBinding: { elementId: 'rect2', focus: 0, gap: 5 },
      },
      {
        id: 'rect2',
        type: 'rectangle',
        x: 300, y: 0,
        width: 100, height: 50,
        boundElements: [{ id: 'arrow1', type: 'arrow' }],
      }
    ],
    appState: {}
  };
  const tmpPath = makeTempFile('edit-delete', data);
  try {
    const stdout = execFileSync('node', [TOOL, tmpPath, 'delete', 'rect1'], { encoding: 'utf8' });
    assert(stdout.includes('Deleted'), `Expected confirmation, got: ${stdout}`);
    const result = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    // rect1 should be gone
    assert(result.elements.length === 2, `Expected 2 elements, got ${result.elements.length}`);
    assert(!result.elements.find(e => e.id === 'rect1'), 'rect1 should be deleted');
    // arrow's startBinding should be nulled
    const arrow = result.elements.find(e => e.id === 'arrow1');
    assert(arrow, 'arrow1 should still exist');
    assert(arrow.startBinding === null, `Expected startBinding null, got ${JSON.stringify(arrow.startBinding)}`);
    // arrow's endBinding should be intact
    assert(arrow.endBinding !== null, 'endBinding should remain');
    assert(arrow.endBinding.elementId === 'rect2', 'endBinding should still point to rect2');
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
});

// ── Test 3: move shifts element coordinates ──────────────────────────────────
test('move: shifts element coordinates', () => {
  const data = {
    type: 'excalidraw',
    version: 2,
    elements: [
      {
        id: 'box1',
        type: 'rectangle',
        x: 100, y: 200,
        width: 50, height: 50,
      }
    ],
    appState: {}
  };
  const tmpPath = makeTempFile('edit-move', data);
  try {
    const stdout = execFileSync('node', [TOOL, tmpPath, 'move', 'box1', '50', '100'], { encoding: 'utf8' });
    assert(stdout.includes('Moved'), `Expected confirmation, got: ${stdout}`);
    const result = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
    assert(result.elements[0].x === 150, `Expected x=150, got ${result.elements[0].x}`);
    assert(result.elements[0].y === 300, `Expected y=300, got ${result.elements[0].y}`);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
});

// ── Test 4: error on non-existent element ────────────────────────────────────
test('error on non-existent element', () => {
  const data = {
    type: 'excalidraw',
    version: 2,
    elements: [{ id: 'exists', type: 'rectangle', x: 0, y: 0, width: 10, height: 10 }],
    appState: {}
  };
  const tmpPath = makeTempFile('edit-error', data);
  try {
    let threw = false;
    try {
      execFileSync('node', [TOOL, tmpPath, 'delete', 'nonexistent'], { encoding: 'utf8', stdio: 'pipe' });
    } catch (err) {
      threw = true;
      assert(err.status === 1, `Expected exit code 1, got ${err.status}`);
      assert(err.stderr.toString().includes('nonexistent'), 'Error should mention the element ID');
    }
    assert(threw, 'Should have thrown for non-existent element');
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
