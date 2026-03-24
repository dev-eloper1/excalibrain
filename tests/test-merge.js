#!/usr/bin/env node
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DAGRE = path.join(__dirname, '..', 'tools', 'dagre-layout.js');
const MERMAID = path.join(__dirname, '..', 'tools', 'mermaid-convert.js');
const GANTT = path.join(__dirname, '..', 'tools', 'gantt-layout.js');
const FIXTURES = path.join(__dirname, 'fixtures');
const TMP = os.tmpdir();

let passed = 0, failed = 0;
function test(name, fn) { try { fn(); console.log(`  \u2713 ${name}`); passed++; } catch(e) { console.log(`  \u2717 ${name}\n    ${e.message}`); failed++; } }
function assert(c, m) { if (!c) throw new Error(m); }

// Test 1: --prefix adds prefix to all element IDs
test('--prefix adds prefix to all element IDs', () => {
  const out = execFileSync('node', [DAGRE, path.join(FIXTURES, 'simple-flow.json'), '--prefix', 'sec1_']);
  const data = JSON.parse(out);
  assert(data.elements.length > 0, 'should have elements');
  for (const el of data.elements) {
    assert(el.id.startsWith('sec1_'), `element id "${el.id}" should start with "sec1_"`);
  }
});

// Test 2: --position offsets all element coordinates
test('--position offsets all element coordinates', () => {
  const out = execFileSync('node', [DAGRE, path.join(FIXTURES, 'simple-flow.json'), '--position', '800,600']);
  const data = JSON.parse(out);
  const shapes = data.elements.filter(el => el.type !== 'arrow' && el.type !== 'text');
  assert(shapes.length > 0, 'should have shape elements');
  for (const el of shapes) {
    assert(el.x >= 790, `element "${el.id}" x=${el.x} should be >= 790`);
    assert(el.y >= 590, `element "${el.id}" y=${el.y} should be >= 590`);
  }
});

// Test 3: --merge appends elements to existing canvas
test('--merge appends elements to existing canvas', () => {
  const tmpFile = path.join(TMP, `merge-test-${Date.now()}.excalidraw`);
  fs.copyFileSync(path.join(FIXTURES, 'existing-canvas.excalidraw'), tmpFile);
  const original = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  const origCount = original.elements.length;
  const origIds = original.elements.map(el => el.id);

  execFileSync('node', [DAGRE, path.join(FIXTURES, 'architecture.json'),
    '--merge', tmpFile, '--position', '800,0', '--prefix', 'arch_', '--output', tmpFile]);

  const merged = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  assert(merged.elements.length > origCount, `merged count ${merged.elements.length} should be > original ${origCount}`);
  for (const id of origIds) {
    assert(merged.elements.some(el => el.id === id), `original element "${id}" should still be present`);
  }
  fs.unlinkSync(tmpFile);
});

// Test 4: --prefix updates arrow binding elementIds
test('--prefix updates arrow binding elementIds', () => {
  const out = execFileSync('node', [DAGRE, path.join(FIXTURES, 'simple-flow.json'), '--prefix', 'test_']);
  const data = JSON.parse(out);
  const arrows = data.elements.filter(el => el.type === 'arrow');
  assert(arrows.length > 0, 'should have arrows');
  for (const arrow of arrows) {
    if (arrow.startBinding && arrow.startBinding.elementId) {
      assert(arrow.startBinding.elementId.startsWith('test_'),
        `arrow "${arrow.id}" startBinding.elementId "${arrow.startBinding.elementId}" should start with "test_"`);
    }
    if (arrow.endBinding && arrow.endBinding.elementId) {
      assert(arrow.endBinding.elementId.startsWith('test_'),
        `arrow "${arrow.id}" endBinding.elementId "${arrow.endBinding.elementId}" should start with "test_"`);
    }
  }
});

// Test 5: --prefix updates boundElements references on containers
test('--prefix updates boundElements references on containers', () => {
  const out = execFileSync('node', [DAGRE, path.join(FIXTURES, 'simple-flow.json'), '--prefix', 'p_']);
  const data = JSON.parse(out);
  const containers = data.elements.filter(el => el.boundElements && el.boundElements.length > 0);
  assert(containers.length > 0, 'should have containers with boundElements');
  for (const c of containers) {
    for (const ref of c.boundElements) {
      assert(ref.id.startsWith('p_'),
        `container "${c.id}" boundElements ref "${ref.id}" should start with "p_"`);
    }
  }
});

// Test 6: --prefix on mermaid: prefixes all element IDs
test('--prefix on mermaid: prefixes all element IDs', () => {
  const tmpFile = path.join(TMP, `mermaid-prefix-${Date.now()}.excalidraw`);
  try {
    execFileSync('node', [MERMAID, path.join(FIXTURES, 'flowchart.mmd'), '--prefix', 'mm_', '--output', tmpFile], { timeout: 60000 });
    const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    assert(data.elements.length > 0, 'should have elements');
    for (const el of data.elements) {
      assert(el.id.startsWith('mm_'), `element id "${el.id}" should start with "mm_"`);
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
});

// Test 7: --merge on mermaid: appends to existing canvas
test('--merge on mermaid: appends to existing canvas', () => {
  const tmpFile = path.join(TMP, `mermaid-merge-${Date.now()}.excalidraw`);
  try {
    fs.copyFileSync(path.join(FIXTURES, 'existing-canvas.excalidraw'), tmpFile);
    const original = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    const origCount = original.elements.length;

    execFileSync('node', [MERMAID, path.join(FIXTURES, 'flowchart.mmd'),
      '--merge', tmpFile, '--position', '800,0', '--prefix', 'mm_', '--output', tmpFile], { timeout: 60000 });

    const merged = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    assert(merged.elements.length > origCount, `merged count ${merged.elements.length} should be > original ${origCount}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
});

// Test 8: --prefix on gantt: prefixes all element IDs
test('--prefix on gantt: prefixes all element IDs', () => {
  const tmpFile = path.join(TMP, `gantt-prefix-${Date.now()}.excalidraw`);
  try {
    execFileSync('node', [GANTT, path.join(FIXTURES, 'gantt-fixture.json'), '--prefix', 'gt_', '--output', tmpFile]);
    const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    assert(data.elements.length > 0, 'should have elements');
    for (const el of data.elements) {
      assert(el.id.startsWith('gt_'), `element id "${el.id}" should start with "gt_"`);
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
});

// Test 9: --merge on gantt: appends to existing canvas
test('--merge on gantt: appends to existing canvas', () => {
  const tmpFile = path.join(TMP, `gantt-merge-${Date.now()}.excalidraw`);
  try {
    fs.copyFileSync(path.join(FIXTURES, 'existing-canvas.excalidraw'), tmpFile);
    const original = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    const origCount = original.elements.length;

    execFileSync('node', [GANTT, path.join(FIXTURES, 'gantt-fixture.json'),
      '--merge', tmpFile, '--position', '0,600', '--prefix', 'gt_', '--output', tmpFile]);

    const merged = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    assert(merged.elements.length > origCount, `merged count ${merged.elements.length} should be > original ${origCount}`);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
