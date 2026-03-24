# excalibrain v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform excalibrain from a single-skill one-shot diagram tool into a multi-skill plugin with canvas sessions, self-correction hooks, and freehand primitives.

**Architecture:** Plugin structure with 4 skills (draw/canvas/add/export), 2 agents (section-builder/canvas-validator), 2 hooks (fast-check/visual-check), shared references, and new tools (canvas-inspect, canvas-edit, primitives). Each task below produces a working, testable artifact.

**Tech Stack:** Node.js, @dagrejs/dagre, Puppeteer, sharp, Excalidraw file format.

**Spec:** `docs/superpowers/specs/2026-03-23-excalibrain-identity-design.md`

---

## File Structure

### New files to create
```
.claude-plugin/plugin.json                    # Plugin manifest
skills/draw/SKILL.md                          # Quick Draw skill (migrated from skill/SKILL.md)
skills/canvas/SKILL.md                        # Canvas session skill
skills/add/SKILL.md                           # Add-to-canvas skill
skills/export/SKILL.md                        # Export skill
commands/draw.md                              # /excalibrain:draw
commands/canvas.md                            # /excalibrain:canvas
commands/export.md                            # /excalibrain:export
commands/annotate.md                          # /excalibrain:annotate
agents/section-builder.md                     # Parallel section generation agent
agents/canvas-validator.md                    # Visual quality validation agent
hooks/hooks.json                              # Hook registrations
hooks/fast-check.js                           # JSON validation on .excalidraw write
hooks/visual-check.js                         # PNG export + visual quality check
tools/canvas-inspect.js                       # Read .excalidraw, report structure
tools/canvas-edit.js                          # Update/delete/move elements
tools/primitives.js                           # Wireframe + floor plan components
references/primitives/wireframe.md            # Wireframe component anatomy docs
references/primitives/floorplan.md            # Floor plan component anatomy docs
tests/test-canvas-inspect.js                  # Tests for canvas-inspect
tests/test-canvas-edit.js                     # Tests for canvas-edit
tests/test-primitives.js                      # Tests for primitives
tests/test-merge.js                           # Tests for --merge/--position/--prefix
tests/test-fast-check.js                      # Tests for fast-check hook
tests/fixtures/existing-canvas.excalidraw     # Fixture: canvas with existing elements
tests/fixtures/primitives-input.json          # Fixture: primitives placement input
tests/fixtures/gantt-fixture.json             # Fixture: gantt for merge tests
```

### Files to modify
```
tools/dagre-layout.js                         # Add --merge, --position, --prefix
tools/mermaid-convert.js                      # Add --merge, --position, --prefix
tools/gantt-layout.js                         # Add --merge, --position, --prefix
tools/export.js                               # Add --region flag
references/graph-json-format.md               # Add annotations array docs
tests/test-all.sh                             # Register new test files
package.json                                  # Update version to 2.0.0
CLAUDE.md                                     # Update to reflect plugin structure
```

### Files to move/restructure
```
skill/SKILL.md           → skills/draw/SKILL.md (content migrated + updated)
skill/references/*       → references/* (canonical location)
```

---

## Task 1: Convert to Plugin Structure

**Validate by:** Run `npm test` — all 11 existing tests pass. Open a new Claude Code session, say "draw me a flowchart" — Quick Draw still works.

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `skills/draw/SKILL.md` (migrated from `skill/SKILL.md`)
- Move: `skill/references/*` → `references/*`
- Create: symlink `skills/draw/references` → `../../references/`
- Modify: `CLAUDE.md` (update paths)
- Modify: `tests/test-all.sh` (update if paths changed)

- [ ] **Step 1: Create plugin manifest**

Create `.claude-plugin/plugin.json`:
```json
{
  "name": "excalibrain",
  "description": "Visual intelligence layer for Claude Code — turns ideas into visual arguments using Excalidraw",
  "author": { "name": "bhushan" },
  "version": "2.0.0",
  "keywords": ["excalidraw", "diagram", "visualization", "canvas", "wireframe"],
  "skills": "./skills/"
}
```

- [ ] **Step 2: Create skills/draw directory and migrate SKILL.md**

```bash
mkdir -p skills/draw
```

Copy `skill/SKILL.md` to `skills/draw/SKILL.md`. Update tool paths in the new SKILL.md: replace `~/Documents/excalibrain/tools/` with `${CLAUDE_PLUGIN_ROOT}/tools/` throughout. Add the capabilities manifest block at the top (after the frontmatter, before the workflow section):

```markdown
## Capabilities

excalibrain capabilities:
- quick-draw: one-shot diagram from description
- session/explore: iterative canvas, conversational chunks
- session/architect: comprehensive multi-section meta-map
- session/storyboard: sequential narrative frames
- session/wireframe: screen layouts with flow
- add-to-canvas: add a diagram/section to existing canvas
- annotate: add reasoning/notes to a section
- compare: show N options side by side with trade-offs
- export: PNG/SVG of full canvas or specific region
- inspect: report what's on a canvas, where things are
- resume: continue an existing session
```

- [ ] **Step 3: Move references to canonical location**

```bash
mv skill/references references
```

- [ ] **Step 4: Create symlink from skill to references**

```bash
ln -sf ../../references skills/draw/references
```

- [ ] **Step 5: Verify symlink resolves**

```bash
ls -la skills/draw/references/color-palette.md
```
Expected: file readable, not a broken symlink.

- [ ] **Step 6: Update CLAUDE.md**

Update project layout section to reflect new plugin structure. Update tool paths. Note that `skill/` is now `skills/draw/` and references are at the root.

- [ ] **Step 7: Run all existing tests**

```bash
npm test
```
Expected: All 11 tests pass. No test references `skill/` paths directly (they reference `tools/` and `tests/fixtures/` which haven't moved).

- [ ] **Step 8: Manual validation — Quick Draw still works**

In a new Claude Code session, with the plugin installed, say "draw me a simple flowchart of login with email/password". Verify it generates an `.excalidraw` file and a PNG.

- [ ] **Step 9: Clean up old skill/ directory**

```bash
rm -rf skill/
```

The old `skill/SKILL.md` has been migrated to `skills/draw/SKILL.md` and `skill/references/` moved to `references/`. The old directory is now empty and should be removed.

- [ ] **Step 10: Commit**

```bash
git add .claude-plugin/ skills/ references/ CLAUDE.md
git rm -r skill/
git commit -m "feat: convert excalibrain to plugin structure

Migrate from single skill (skill/SKILL.md) to plugin with
.claude-plugin/plugin.json manifest and skills/draw/ as the
first skill. References moved to canonical root location with
symlinks from each skill. Old skill/ directory removed."
```

---

## Task 2: canvas-inspect.js — Read Canvas Structure

**Validate by:** Run `node tools/canvas-inspect.js examples/architecture/ecommerce.excalidraw` and see a structured JSON report of what's on the canvas.

**Files:**
- Create: `tools/canvas-inspect.js`
- Create: `tests/test-canvas-inspect.js`
- Modify: `tests/test-all.sh` (add new test)

- [ ] **Step 1: Write the test file**

Create `tests/test-canvas-inspect.js`:

```javascript
#!/usr/bin/env node
/**
 * Tests for canvas-inspect.js
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const TOOL = path.join(__dirname, '..', 'tools', 'canvas-inspect.js');
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

const EXAMPLES = path.join(__dirname, '..', 'examples');

function inspect(file) {
  const out = execFileSync('node', [TOOL, file], { encoding: 'utf8' });
  return JSON.parse(out);
}

const ECOMMERCE = path.join(EXAMPLES, 'architecture', 'ecommerce.excalidraw');

// Test 1: outputs valid JSON with required fields
test('outputs JSON with elementCount, byType, bounds, freeSpace', () => {
  const result = inspect(ECOMMERCE);
  assert(typeof result.elementCount === 'number', 'missing elementCount');
  assert(typeof result.byType === 'object', 'missing byType');
  assert(typeof result.bounds === 'object', 'missing bounds');
  assert(Array.isArray(result.freeSpace), 'missing freeSpace array');
});

// Test 2: element count matches actual elements
test('elementCount matches elements in file', () => {
  const result = inspect(ECOMMERCE);
  const raw = JSON.parse(fs.readFileSync(ECOMMERCE, 'utf8'));
  const nonDeleted = raw.elements.filter(e => !e.isDeleted).length;
  assert(result.elementCount === nonDeleted,
    `expected ${nonDeleted}, got ${result.elementCount}`);
});

// Test 3: byType breaks down correctly
test('byType includes rectangle and arrow counts', () => {
  const result = inspect(ECOMMERCE);
  assert(result.byType.rectangle > 0, 'should have rectangles');
  assert(result.byType.arrow > 0, 'should have arrows');
});

// Test 4: bounds has x, y, w, h
test('bounds has x, y, w, h fields', () => {
  const result = inspect(ECOMMERCE);
  assert(typeof result.bounds.x === 'number', 'missing bounds.x');
  assert(typeof result.bounds.y === 'number', 'missing bounds.y');
  assert(typeof result.bounds.w === 'number', 'missing bounds.w');
  assert(typeof result.bounds.h === 'number', 'missing bounds.h');
});

// Test 5: prefix grouping
test('byPrefix groups elements by ID prefix', () => {
  const result = inspect(ECOMMERCE);
  assert(typeof result.byPrefix === 'object', 'missing byPrefix');
  // ecommerce example may not have prefixes, but the field should exist
});

// Test 6: empty/minimal canvas
test('handles canvas with no elements', () => {
  const tmpFile = path.join(__dirname, 'fixtures', '_empty_canvas.excalidraw');
  fs.writeFileSync(tmpFile, JSON.stringify({type:'excalidraw',version:2,elements:[]}));
  try {
    const result = inspect(tmpFile);
    assert(result.elementCount === 0, 'should have 0 elements');
    assert(result.bounds.w === 0, 'bounds should be zero');
  } finally {
    fs.unlinkSync(tmpFile);
  }
});

console.log(`\ncanvas-inspect: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node tests/test-canvas-inspect.js
```
Expected: FAIL — `canvas-inspect.js` doesn't exist yet.

- [ ] **Step 3: Implement canvas-inspect.js**

Create `tools/canvas-inspect.js`:

```javascript
#!/usr/bin/env node
/**
 * canvas-inspect.js — Read an .excalidraw file and report its structure.
 *
 * Usage: node canvas-inspect.js <file.excalidraw>
 *
 * Outputs JSON:
 * {
 *   elementCount: number,
 *   byType: { rectangle: N, arrow: N, text: N, ... },
 *   byPrefix: { "cl_": { count: N, bbox: {x,y,w,h}, ids: [...] }, ... },
 *   bounds: { x, y, w, h },
 *   freeSpace: [{ x, y, w, h }, ...]  // largest empty rectangles
 * }
 */
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: canvas-inspect.js <file.excalidraw>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const elements = (data.elements || []).filter(e => !e.isDeleted);

// Count by type
const byType = {};
for (const el of elements) {
  byType[el.type] = (byType[el.type] || 0) + 1;
}

// Bounding box of all elements
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const el of elements) {
  const x = el.x || 0;
  const y = el.y || 0;
  const w = el.width || 0;
  const h = el.height || 0;
  if (x < minX) minX = x;
  if (y < minY) minY = y;
  if (x + w > maxX) maxX = x + w;
  if (y + h > maxY) maxY = y + h;
}

const bounds = elements.length > 0
  ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  : { x: 0, y: 0, w: 0, h: 0 };

// Group by ID prefix (anything before first underscore)
const byPrefix = {};
for (const el of elements) {
  const id = el.id || '';
  const underscoreIdx = id.indexOf('_');
  if (underscoreIdx > 0 && underscoreIdx <= 8) {
    const prefix = id.substring(0, underscoreIdx + 1);
    if (!byPrefix[prefix]) {
      byPrefix[prefix] = { count: 0, ids: [], bbox: { x: Infinity, y: Infinity, w: 0, h: 0 } };
    }
    const group = byPrefix[prefix];
    group.count++;
    group.ids.push(id);
    // Update group bounding box
    const ex = el.x || 0;
    const ey = el.y || 0;
    const ew = el.width || 0;
    const eh = el.height || 0;
    if (ex < group.bbox.x) group.bbox.x = ex;
    if (ey < group.bbox.y) group.bbox.y = ey;
    const right = ex + ew;
    const bottom = ey + eh;
    if (right > group.bbox.x + group.bbox.w) group.bbox.w = right - group.bbox.x;
    if (bottom > group.bbox.y + group.bbox.h) group.bbox.h = bottom - group.bbox.y;
  }
}

// Find free space — simple approach: divide canvas into grid, find empty cells
const GRID_SIZE = 200;
const freeSpace = [];
if (elements.length > 0) {
  // Expand search area beyond current bounds
  const searchMinX = bounds.x - 400;
  const searchMinY = bounds.y - 400;
  const searchMaxX = bounds.x + bounds.w + 400;
  const searchMaxY = bounds.y + bounds.h + 400;

  for (let gx = searchMinX; gx < searchMaxX; gx += GRID_SIZE) {
    for (let gy = searchMinY; gy < searchMaxY; gy += GRID_SIZE) {
      const cellRect = { x: gx, y: gy, w: GRID_SIZE, h: GRID_SIZE };
      const occupied = elements.some(el => {
        const ex = el.x || 0;
        const ey = el.y || 0;
        const ew = el.width || 0;
        const eh = el.height || 0;
        return ex < cellRect.x + cellRect.w && ex + ew > cellRect.x &&
               ey < cellRect.y + cellRect.h && ey + eh > cellRect.y;
      });
      if (!occupied) {
        freeSpace.push(cellRect);
      }
    }
  }
  // Sort by distance from origin (prefer nearby free space)
  freeSpace.sort((a, b) => {
    const da = Math.abs(a.x) + Math.abs(a.y);
    const db = Math.abs(b.x) + Math.abs(b.y);
    return da - db;
  });
  // Keep top 10
  freeSpace.length = Math.min(freeSpace.length, 10);
}

const result = {
  elementCount: elements.length,
  byType,
  byPrefix,
  bounds,
  freeSpace
};

console.log(JSON.stringify(result, null, 2));
```

- [ ] **Step 4: Run tests**

```bash
node tests/test-canvas-inspect.js
```
Expected: All 5 tests pass.

- [ ] **Step 5: Validate visually — run against a real example**

```bash
node tools/canvas-inspect.js examples/architecture/ecommerce.excalidraw
```
Expected: JSON output showing element counts, types, bounds. Inspect the output to confirm it makes sense.

- [ ] **Step 6: Add to test-all.sh**

Add `node tests/test-canvas-inspect.js` to `tests/test-all.sh`.

- [ ] **Step 7: Run full test suite**

```bash
npm test
```
Expected: All tests pass (11 existing + 6 new = 17).

- [ ] **Step 8: Commit**

```bash
git add tools/canvas-inspect.js tests/test-canvas-inspect.js tests/test-all.sh
git commit -m "feat: add canvas-inspect.js — read and report canvas structure

Reports element counts by type, groups by ID prefix, overall
bounding box, and available free space. Foundation for canvas
session diff/resume."
```

---

## Task 3: --merge, --position, --prefix on dagre-layout.js

**Output contract:** Without `--output`, dagre-layout.js prints JSON to stdout (existing behavior, unchanged). With `--output`, it writes to file. When `--merge` is used, `--output` is required (merge reads the file, appends, writes back). The test uses `--output` to a temp file and reads the result.

**Validate by:** Generate a diagram, then generate a second diagram merged into the same file at a different position. Open the `.excalidraw` and see both diagrams on one canvas.

**Files:**
- Modify: `tools/dagre-layout.js`
- Create: `tests/test-merge.js`
- Create: `tests/fixtures/existing-canvas.excalidraw`
- Modify: `tests/test-all.sh`

- [ ] **Step 1: Create the test fixture — an existing canvas**

Generate `tests/fixtures/existing-canvas.excalidraw` by running dagre on `tests/fixtures/simple-flow.json`:

```bash
node tools/dagre-layout.js tests/fixtures/simple-flow.json --output tests/fixtures/existing-canvas.excalidraw
```

- [ ] **Step 2: Write merge tests**

Create `tests/test-merge.js`:

```javascript
#!/usr/bin/env node
/**
 * Tests for --merge, --position, --prefix on dagre-layout.js
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DAGRE = path.join(__dirname, '..', 'tools', 'dagre-layout.js');
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

const os = require('os');
const TMP = os.tmpdir();

function runDagre(args) {
  // Without --output: returns parsed stdout. With --output: reads the file.
  const hasOutput = args.includes('--output');
  const out = execFileSync('node', [DAGRE, ...args], { encoding: 'utf8' });
  if (hasOutput) {
    const outputIdx = args.indexOf('--output');
    return JSON.parse(fs.readFileSync(args[outputIdx + 1], 'utf8'));
  }
  return JSON.parse(out);
}

// Test 1: --prefix namespaces element IDs (stdout mode, no --output needed)
test('--prefix adds prefix to all element IDs', () => {
  const result = runDagre([
    path.join(FIXTURES, 'simple-flow.json'), '--prefix', 'sec1_'
  ]);
  const ids = result.elements.map(e => e.id);
  const prefixed = ids.filter(id => id.startsWith('sec1_'));
  assert(prefixed.length === ids.length,
    `expected all ${ids.length} IDs prefixed, got ${prefixed.length}`);
});

// Test 2: --position offsets all elements
test('--position offsets all element coordinates', () => {
  const result = runDagre([
    path.join(FIXTURES, 'simple-flow.json'), '--position', '800,600'
  ]);
  const nonArrows = result.elements.filter(e => e.type !== 'arrow' && e.type !== 'text');
  for (const el of nonArrows) {
    assert(el.x >= 790, `element ${el.id} x=${el.x} should be >= 790`);
    assert(el.y >= 590, `element ${el.id} y=${el.y} should be >= 590`);
  }
});

// Test 3: --merge combines with existing file (requires --output)
test('--merge appends elements to existing canvas', () => {
  const existingPath = path.join(FIXTURES, 'existing-canvas.excalidraw');
  const existing = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
  const existingCount = existing.elements.length;
  const tmpOut = path.join(TMP, 'merge-test.excalidraw');

  // Copy existing to tmp so we don't modify fixture
  fs.copyFileSync(existingPath, tmpOut);

  runDagre([
    path.join(FIXTURES, 'architecture.json'),
    '--merge', tmpOut,
    '--position', '800,0',
    '--prefix', 'arch_',
    '--output', tmpOut
  ]);
  const result = JSON.parse(fs.readFileSync(tmpOut, 'utf8'));

  assert(result.elements.length > existingCount,
    `merged should have more elements (${result.elements.length}) than original (${existingCount})`);

  // Original elements should still be there
  const origIds = existing.elements.slice(0, 3).map(e => e.id);
  for (const id of origIds) {
    assert(result.elements.some(e => e.id === id),
      `original element ${id} missing from merged output`);
  }
  fs.unlinkSync(tmpOut);
});

// Test 4: --prefix updates arrow bindings
test('--prefix updates arrow binding elementIds', () => {
  const result = runDagre([
    path.join(FIXTURES, 'simple-flow.json'), '--prefix', 'test_'
  ]);
  const arrows = result.elements.filter(e => e.type === 'arrow');
  for (const arrow of arrows) {
    if (arrow.startBinding) {
      assert(arrow.startBinding.elementId.startsWith('test_'),
        `arrow startBinding ${arrow.startBinding.elementId} should be prefixed`);
    }
    if (arrow.endBinding) {
      assert(arrow.endBinding.elementId.startsWith('test_'),
        `arrow endBinding ${arrow.endBinding.elementId} should be prefixed`);
    }
  }
});

// Test 5: --prefix updates boundElements references
test('--prefix updates boundElements references on containers', () => {
  const result = runDagre([
    path.join(FIXTURES, 'simple-flow.json'), '--prefix', 'p_'
  ]);
  const containers = result.elements.filter(e =>
    e.boundElements && e.boundElements.length > 0
  );
  for (const container of containers) {
    for (const ref of container.boundElements) {
      assert(ref.id.startsWith('p_'),
        `boundElements ref ${ref.id} on ${container.id} should be prefixed`);
    }
  }
});

console.log(`\nmerge: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
node tests/test-merge.js
```
Expected: FAIL — `--prefix`, `--position`, `--merge` not implemented yet.

- [ ] **Step 4: Implement --prefix in dagre-layout.js**

Add prefix support. After all elements are generated but before writing output:
- Parse `--prefix <str>` from CLI args
- If prefix provided, iterate all elements:
  - Prepend prefix to `el.id`
  - Prepend prefix to `el.containerId` if present
  - Prepend prefix to each `el.boundElements[].id` if present
  - Prepend prefix to `el.startBinding.elementId` and `el.endBinding.elementId` on arrows
  - Prepend prefix to `el.frameId` if present

- [ ] **Step 5: Run prefix tests**

```bash
node tests/test-merge.js
```
Expected: Tests 1, 4, 5 pass. Tests 2, 3 still fail.

- [ ] **Step 6: Implement --position in dagre-layout.js**

Parse `--position x,y` from CLI args. After dagre computes positions but before writing output, add `offsetX` and `offsetY` to every element's `x` and `y` coordinates. For arrows, also offset all `points` entries.

- [ ] **Step 7: Run position test**

```bash
node tests/test-merge.js
```
Expected: Tests 1, 2, 4, 5 pass. Test 3 still fails.

- [ ] **Step 8: Implement --merge in dagre-layout.js**

Parse `--merge <file>` from CLI args. If provided:
1. Read and parse the existing `.excalidraw` file
2. Generate new elements as normal (with prefix/position applied)
3. Concatenate: `existing.elements.concat(newElements)`
4. Write combined output preserving existing `appState` and `files`

- [ ] **Step 9: Run all merge tests**

```bash
node tests/test-merge.js
```
Expected: All 5 tests pass.

- [ ] **Step 10: Validate visually — merge two diagrams**

```bash
node tools/dagre-layout.js tests/fixtures/simple-flow.json --output /tmp/canvas.excalidraw
node tools/dagre-layout.js tests/fixtures/architecture.json --merge /tmp/canvas.excalidraw --position 800,0 --prefix arch_ --output /tmp/canvas.excalidraw
```
Open `/tmp/canvas.excalidraw` in VS Code — should see two diagrams side by side.

- [ ] **Step 11: Add to test-all.sh and run full suite**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 12: Commit**

```bash
git add tools/dagre-layout.js tests/test-merge.js tests/fixtures/existing-canvas.excalidraw tests/test-all.sh
git commit -m "feat: add --merge, --position, --prefix to dagre-layout.js

Enables incremental canvas building: generate a diagram and
place it at specific coordinates on an existing canvas with
namespaced element IDs. Foundation for canvas sessions."
```

---

## Task 4: --merge, --position, --prefix on mermaid-convert.js and gantt-layout.js

**Validate by:** Merge a Mermaid flowchart and a Gantt chart onto the same canvas file.

**Files:**
- Modify: `tools/mermaid-convert.js`
- Modify: `tools/gantt-layout.js`
- Modify: `tests/test-merge.js` (add tests for mermaid and gantt)

- [ ] **Step 1: Add mermaid merge tests to test-merge.js**

Add tests that verify `--merge`, `--position`, `--prefix` work on `mermaid-convert.js` using the same pattern as dagre tests. Test with `tests/fixtures/flowchart.mmd`.

- [ ] **Step 2: Add gantt merge tests to test-merge.js**

Create `tests/fixtures/gantt-fixture.json` (a simple 3-task Gantt). Add tests for gantt-layout.js merge/position/prefix.

- [ ] **Step 3: Run new tests to verify they fail**

```bash
node tests/test-merge.js
```
Expected: New mermaid and gantt tests fail, existing dagre tests pass.

- [ ] **Step 4: Implement --prefix, --position, --merge on mermaid-convert.js**

For mermaid: after Puppeteer returns the parsed elements, apply prefix to all IDs (element IDs, containerId, boundElements, arrow bindings), then apply position offset to all x/y coordinates, then merge with existing file if `--merge` provided.

- [ ] **Step 5: Implement --prefix, --position, --merge on gantt-layout.js**

Same pattern as dagre. Prefix all IDs, offset all coordinates, merge with existing file.

- [ ] **Step 6: Run all merge tests**

```bash
node tests/test-merge.js
```
Expected: All tests pass.

- [ ] **Step 7: Validate visually — three diagrams on one canvas**

```bash
node tools/dagre-layout.js tests/fixtures/simple-flow.json --output /tmp/multi.excalidraw
node tools/mermaid-convert.js tests/fixtures/flowchart.mmd --merge /tmp/multi.excalidraw --position 800,0 --prefix fc_ --output /tmp/multi.excalidraw
node tools/gantt-layout.js tests/fixtures/gantt-fixture.json --merge /tmp/multi.excalidraw --position 0,600 --prefix gt_ --output /tmp/multi.excalidraw
```
Open `/tmp/multi.excalidraw` — should see three diagrams: dagre top-left, flowchart top-right, Gantt bottom-left.

- [ ] **Step 8: Run full test suite**

```bash
npm test
```

- [ ] **Step 9: Commit**

```bash
git add tools/mermaid-convert.js tools/gantt-layout.js tests/test-merge.js tests/fixtures/gantt-fixture.json
git commit -m "feat: add --merge, --position, --prefix to mermaid-convert and gantt-layout

All three layout tools now support incremental canvas building.
Diagrams can be merged onto existing canvases at specific
coordinates with namespaced element IDs."
```

---

## Task 5: fast-check.js Hook — Self-Correction on Write

**Validate by:** Write a deliberately broken `.excalidraw` file (bad arrow binding). See the hook catch it and report the error.

**Files:**
- Create: `hooks/hooks.json`
- Create: `hooks/fast-check.js`
- Create: `tests/test-fast-check.js`
- Modify: `tests/test-all.sh`

- [ ] **Step 1: Write test for fast-check**

Create `tests/test-fast-check.js` that tests the fast-check module directly (not as a hook, but calling its validation function). Test cases:
- Valid file → no errors
- Arrow with startBinding referencing non-existent element → error reported
- Duplicate element IDs → error reported
- Non-`.excalidraw` file → skipped (no errors)

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement fast-check.js**

The hook script receives the tool use context on stdin (per Claude Code hook contract). It:
1. Reads the tool use from stdin
2. Checks if the file path ends in `.excalidraw` — if not, exits 0
3. Reads and parses the `.excalidraw` file
4. Validates:
   - All arrow `startBinding.elementId` and `endBinding.elementId` reference existing element IDs
   - No duplicate element IDs
   - No two non-text elements at identical x,y coordinates (overlap detection)
5. If errors found: prints them as a structured message to stdout (Claude sees this as hook feedback)
6. Exits 0 (hooks should not block, just report)

- [ ] **Step 4: Create hooks.json**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/fast-check.js"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Run tests**

```bash
node tests/test-fast-check.js
```
Expected: All tests pass.

- [ ] **Step 6: Validate manually — write a broken file**

Create a test `.excalidraw` with a bad arrow binding, then verify `fast-check.js` catches it:
```bash
echo '{"type":"excalidraw","version":2,"elements":[{"id":"a1","type":"arrow","startBinding":{"elementId":"nonexistent","focus":0,"gap":4},"endBinding":null,"x":0,"y":0,"width":100,"height":0,"points":[[0,0],[100,0]]}]}' > /tmp/broken.excalidraw
echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/broken.excalidraw"}}' | node hooks/fast-check.js
```
Expected: Output reports "arrow a1 startBinding references nonexistent element 'nonexistent'".

- [ ] **Step 7: Run full test suite, commit**

```bash
npm test
git add hooks/ tests/test-fast-check.js tests/test-all.sh
git commit -m "feat: add fast-check.js hook for .excalidraw self-correction

PostToolUse hook validates arrow bindings, duplicate IDs, and
coordinate overlaps on every .excalidraw write. Reports errors
as hook feedback for Claude to self-correct."
```

---

## Task 6: Canvas Session Skill — Explore Mode

**Validate by:** Start a conversation: "let's explore the auth system visually." Claude creates a canvas, adds a diagram, adds annotations, asks to continue. Say "add the token flow." Claude merges a second diagram onto the same canvas. Verify both diagrams visible in the `.excalidraw` file with a `.excalibrain.json` sidecar alongside it.

**Files:**
- Create: `skills/canvas/SKILL.md`
- Create: symlink `skills/canvas/references` → `../../references/`

- [ ] **Step 1: Create skills/canvas directory**

```bash
mkdir -p skills/canvas
ln -sf ../../references skills/canvas/references
```

- [ ] **Step 2: Write the canvas session SKILL.md**

This is the intelligence layer — the instructions that teach Claude how to run a canvas session. The SKILL.md should define:

**Frontmatter:**
```yaml
---
name: excalibrain:canvas
description: >
  Start or resume a canvas session — a living Excalidraw workspace that builds
  incrementally. Modes: explore (iterative), architect (comprehensive),
  storyboard (sequential), wireframe (screens). Trigger on: start a canvas,
  architect this, storyboard, wireframe, explore this visually, continue the
  diagram, resume the canvas.
---
```

**Content structure:**
1. Mode detection — map user intent to explore/architect/storyboard/wireframe
2. Canvas location — propose smart default, confirm with user
3. Session loop (explore mode):
   - State what's next
   - Generate diagram section using dagre/mermaid with `--merge --position --prefix`
   - Use `canvas-inspect.js` to find free space before placing
   - Update sidecar (`.excalibrain.json`)
   - Explain what was drawn
   - Check in with user
4. Sidecar management — create on session start, update after each draw
5. Resume flow — read canvas + sidecar, diff, report
6. Annotations — add free text elements near diagram sections
7. Research zone — dedicated area on canvas for findings

Start with Explore mode only. Add placeholders for Architect, Storyboard, Wireframe that say "Coming soon — use Explore mode for now."

- [ ] **Step 3: Test manually — start an explore session**

In a new Claude Code session with the plugin installed:
"Let's explore how a REST API handles authentication visually."

Verify:
- Claude asks where to put the canvas
- Claude creates the `.excalidraw` file with an initial diagram
- Claude creates the `.excalibrain.json` sidecar
- Claude asks to continue

Then say: "Add the token refresh flow."

Verify:
- Claude uses `canvas-inspect.js` to find free space
- Claude merges new content with `--merge --position --prefix`
- The `.excalidraw` file now has two diagram sections
- The sidecar is updated with the new section
- The sidecar includes a `theme` field matching the theme used

- [ ] **Step 4: Test session resume**

In a NEW Claude Code session (simulating resume across conversations):
"Continue the auth diagram" or "resume the canvas at `<path>.excalidraw`"

Verify:
- Claude reads both the `.excalidraw` file and `.excalibrain.json` sidecar
- Claude reports what's on the canvas and where we left off
- Claude asks what to do next
- If you manually added an element in Excalidraw before resuming, Claude detects the discrepancy

- [ ] **Step 5: Commit**

```bash
git add skills/canvas/
git commit -m "feat: add canvas session skill with Explore mode

Living workspace that builds incrementally. Claude creates
a canvas, adds sections with --merge/--position/--prefix,
maintains .excalibrain.json sidecar, and checks in with user
between additions."
```

---

## Task 7: Architect Mode + section-builder Agent

**Validate by:** Say "show me the full architecture of excalibrain." Claude reads the codebase, builds a multi-section meta-map with research zone and annotations. Multiple sections visible on one canvas connected by arrows.

**Files:**
- Modify: `skills/canvas/SKILL.md` (add Architect mode)
- Create: `agents/section-builder.md`

- [ ] **Step 1: Write section-builder agent**

Create `agents/section-builder.md`:
```yaml
---
name: section-builder
description: >
  Generates one section of a multi-section canvas. Given a topic, context,
  and target position, produces a graph JSON and runs dagre-layout with
  --merge/--position/--prefix. Returns the updated sidecar section entry.
model: sonnet
---
```

Agent instructions: receive section topic + context + canvas path + position + prefix. Read relevant code/docs, generate graph JSON, run dagre-layout with merge flags, return the section metadata for the sidecar.

- [ ] **Step 2: Add Architect mode to canvas SKILL.md**

Add the Architect mode workflow:
1. Research phase — read codebase, write findings to research zone on canvas
2. Plan sections — identify 3-6 subsystems
3. Dispatch section-builder agents in parallel (one per section)
4. After all sections complete, add connection arrows between sections
5. Update sidecar with all sections

- [ ] **Step 3: Test manually — architect a real project**

"Show me the full architecture of the excalibrain project."

Verify: multi-section canvas with research zone, annotations, connected sections.

- [ ] **Step 4: Commit**

```bash
git add skills/canvas/SKILL.md agents/section-builder.md
git commit -m "feat: add Architect mode and section-builder agent

Multi-section canvas building with parallel section generation.
Research zone, annotations, and inter-section connections."
```

---

## Task 8: Storyboard Mode + Compare Operation

**Validate by:** (1) "Storyboard how to build a SaaS product in 3 phases." See 3 frames left-to-right with progression arrows. (2) "Compare event-driven vs polling for cache invalidation." See 2 side-by-side columns with trade-offs.

**Files:**
- Modify: `skills/canvas/SKILL.md` (add Storyboard mode + Compare)

- [ ] **Step 1: Add Storyboard mode to canvas SKILL.md**

Storyboard workflow:
1. Determine frame count from user intent
2. For each frame: generate a diagram section placed left-to-right (x offset = frame_index * frame_width + gap)
3. Add progression arrows between frames
4. Each frame gets a title label above it
5. Update sidecar

- [ ] **Step 2: Add Compare operation to canvas SKILL.md**

Compare is not a mode — it's a visual operation available in any session or as Quick Draw.

Compare workflow:
1. Determine N options (2-4) from user intent
2. Generate each option as a labeled frame, placed side by side (columns)
3. Add trade-off annotations below each column
4. Optionally add a summary row highlighting key differences
5. If within a session, merge onto existing canvas; otherwise create new file

- [ ] **Step 3: Test Storyboard manually**

"Storyboard a 3-phase migration from monolith to microservices."

Verify: 3 frames, left-to-right, with arrows showing progression.

- [ ] **Step 4: Test Compare manually**

"Compare event-driven vs polling for cache invalidation."

Verify: 2 side-by-side columns with structure and trade-offs annotated.

- [ ] **Step 5: Commit**

```bash
git add skills/canvas/SKILL.md
git commit -m "feat: add Storyboard mode and Compare operation

Storyboard: frames laid out left-to-right with progression arrows.
Compare: N options side by side with trade-off annotations.
Both work standalone or within canvas sessions."
```

---

## Task 9: Slash Commands + Export Skill + Add Skill

**Validate by:** Use `/excalibrain:canvas status` and `/excalibrain:export` in a conversation. Verify they work.

**Files:**
- Create: `commands/draw.md`
- Create: `commands/canvas.md`
- Create: `commands/export.md`
- Create: `commands/annotate.md`
- Create: `skills/export/SKILL.md`
- Create: `skills/add/SKILL.md`
- Create: symlinks for references in add/export skills

- [ ] **Step 1: Create slash command files**

Each is a markdown file defining usage, arguments, and behavior. Example for `commands/canvas.md`:

```markdown
---
name: canvas
description: Manage excalibrain canvas sessions
argument-hint: "[new <mode> | resume | status]"
---

# /excalibrain:canvas

Canvas session management.

## Usage
- `/excalibrain:canvas` or `/excalibrain:canvas status` — show current canvas status
- `/excalibrain:canvas new <mode>` — start new session (explore/architect/storyboard/wireframe)
- `/excalibrain:canvas resume` — resume last session

## Behavior
When invoked, use the excalibrain:canvas skill to handle the request.
```

- [ ] **Step 2: Create export skill**

```bash
mkdir -p skills/export
ln -sf ../../references skills/export/references
```

`skills/export/SKILL.md` — handles export requests. Wraps `tools/export.js` with smart defaults (format detection, region support).

- [ ] **Step 3: Create add skill**

```bash
mkdir -p skills/add
ln -sf ../../references skills/add/references
```

`skills/add/SKILL.md` — handles "add to canvas" requests. Finds active canvas, uses canvas-inspect to find free space, runs layout tool with merge flags.

- [ ] **Step 4: Test manually**

Use `/excalibrain:draw a flowchart of login` and `/excalibrain:export` in a conversation.

- [ ] **Step 5: Commit**

```bash
git add commands/ skills/export/ skills/add/
git commit -m "feat: add slash commands and export/add skills

/excalibrain:draw, /excalibrain:canvas, /excalibrain:export,
/excalibrain:annotate commands. Export and add-to-canvas skills."
```

---

## Task 10: --region Export + canvas-edit.js

**Validate by:** Export just one section of a multi-section canvas. Edit an element's label on an existing canvas.

**Files:**
- Modify: `tools/export.js` (add `--region`)
- Create: `tools/canvas-edit.js`
- Create: `tests/test-canvas-edit.js`
- Modify: `tests/test-all.sh`

- [ ] **Step 1: Write canvas-edit tests**

Test cases: update element label, delete element, move element. Verify the output file has the changes and other elements are untouched.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement canvas-edit.js**

CLI: `node canvas-edit.js <file> <operation> [args]`
Operations:
- `update <elementId> <field> <value>` — update a property
- `delete <elementId>` — remove element (also cleans up arrow bindings)
- `move <elementId> <dx> <dy>` — shift element coordinates

- [ ] **Step 4: Implement --region on export.js**

Parse `--region <value>`. If value contains commas: parse as `x,y,w,h` bounding box. Otherwise: treat as frame name/ID — find the frame element, use its bounds.

Filter elements to only those within the region before rendering.

- [ ] **Step 5: Run tests, validate visually**

- [ ] **Step 6: Commit**

```bash
git add tools/canvas-edit.js tools/export.js tests/test-canvas-edit.js tests/test-all.sh
git commit -m "feat: add canvas-edit.js and --region export

canvas-edit supports update/delete/move operations on existing
.excalidraw files. export.js --region enables exporting specific
sections of a canvas."
```

---

## Task 11: Wireframe Primitives

**Validate by:** Generate a 3-screen onboarding wireframe (sign up → profile → dashboard) with navigation arrows. Open `.excalidraw` and see recognizable UI elements.

**Files:**
- Create: `tools/primitives.js`
- Create: `references/primitives/wireframe.md`
- Create: `tests/test-primitives.js`
- Create: `tests/fixtures/primitives-input.json`
- Modify: `skills/canvas/SKILL.md` (add Wireframe mode)
- Modify: `tests/test-all.sh`

- [ ] **Step 1: Write wireframe reference doc**

`references/primitives/wireframe.md` — document the anatomy of each primitive: what elements compose it, sizing, styling. This is what Claude reads to understand the components.

- [ ] **Step 2: Write primitives tests**

Test cases:
- `button` primitive generates rectangle + bound text with correct sizing
- `input` primitive generates rectangle + placeholder text + label
- `screen` primitive generates frame element with correct mobile/desktop dimensions
- Multiple primitives at different positions don't overlap
- `--merge` works to add primitives to existing canvas

- [ ] **Step 3: Run tests to verify they fail**

- [ ] **Step 4: Implement primitives.js — core wireframe set**

CLI: `node primitives.js <input.json> [--merge <file>] [--output <file>]`

Input JSON format:
```json
{
  "primitives": [
    { "type": "screen", "x": 0, "y": 0, "size": "mobile", "title": "Sign Up" },
    { "type": "button", "x": 55, "y": 600, "label": "Sign Up", "variant": "primary" },
    { "type": "input", "x": 55, "y": 200, "placeholder": "Email", "label": "Email" }
  ]
}
```

Implement wireframe primitives: screen, button, input, textarea, dropdown, nav-bar, card, modal, list-item, avatar, divider, image-placeholder. (checkbox, toggle, tab-bar can come later.)

Each primitive is a function that returns an array of `.excalidraw` elements.

- [ ] **Step 5: Run tests**

Expected: All pass.

- [ ] **Step 6: Add Wireframe mode to canvas SKILL.md**

Wireframe workflow:
1. Determine screens from user intent
2. For each screen: generate primitives JSON, place screens left-to-right
3. Add navigation arrows between screens
4. Update sidecar

- [ ] **Step 7: Validate end-to-end**

"Wireframe a 3-screen onboarding: sign up, profile setup, dashboard."

Open the `.excalidraw` — verify screens have recognizable UI elements with navigation arrows.

- [ ] **Step 8: Commit**

```bash
git add tools/primitives.js references/primitives/wireframe.md tests/test-primitives.js tests/fixtures/primitives-input.json skills/canvas/SKILL.md tests/test-all.sh
git commit -m "feat: add wireframe primitives and Wireframe mode

primitives.js generates UI components (screen, button, input,
card, etc.) as .excalidraw elements. Wireframe canvas mode
creates multi-screen flows with navigation arrows."
```

---

## Task 12: Floor Plan Primitives

**Validate by:** Generate a studio apartment floor plan. Open `.excalidraw` and see rooms, doors, windows, and furniture.

**Files:**
- Modify: `tools/primitives.js` (add floor plan primitives)
- Create: `references/primitives/floorplan.md`
- Modify: `tests/test-primitives.js` (add floor plan tests)

- [ ] **Step 1: Write floor plan reference doc**

- [ ] **Step 2: Add floor plan tests**

Test cases: room generates rectangle + label, door generates arc + gap, furniture shapes are correct sizes.

- [ ] **Step 3: Run tests to verify they fail**

- [ ] **Step 4: Implement floor plan primitives**

Add to `primitives.js`: room, door, window, wall, dimension, label, and furniture (bed, desk, table, couch, chair, toilet, sink, shower, stove, fridge).

- [ ] **Step 5: Run tests, validate visually**

Generate a studio apartment:
```json
{
  "primitives": [
    { "type": "room", "x": 0, "y": 0, "w": 600, "h": 400, "label": "Living Room" },
    { "type": "room", "x": 600, "y": 0, "w": 300, "h": 400, "label": "Bedroom" },
    { "type": "door", "x": 600, "y": 150, "wall": "w", "swing": "in" },
    { "type": "furniture:couch", "x": 100, "y": 200, "seats": 3 },
    { "type": "furniture:bed", "x": 700, "y": 100, "size": "queen" }
  ]
}
```

Open the output — should look like a recognizable floor plan.

- [ ] **Step 6: Commit**

```bash
git add tools/primitives.js references/primitives/floorplan.md tests/test-primitives.js
git commit -m "feat: add floor plan primitives

Room, door, window, wall, furniture, and dimension primitives.
Demonstrates excalibrain works beyond programming diagrams."
```

---

## Task 13: canvas-validator Agent + visual-check Hook

**Validate by:** Generate a canvas with an intentional overlap. See the validator catch it.

**Files:**
- Create: `agents/canvas-validator.md`
- Create: `hooks/visual-check.js`
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Write canvas-validator agent**

Agent exports canvas to PNG, reads the image, checks quality:
- Labels readable
- No overlaps
- Arrows connected
- Colors match palette
- Isomorphism test guidance

Returns a structured report: PASS or list of issues.

- [ ] **Step 2: Write visual-check hook**

The hook fires on PostToolUse Write for `.excalidraw` files. It checks if a `.excalibrain.json` sidecar exists alongside (indicating a session). If so, it invokes the canvas-validator agent's logic (or a simplified version) and reports issues.

- [ ] **Step 3: Update hooks.json**

Add the visual-check hook entry.

- [ ] **Step 4: Test manually**

Generate a canvas session diagram with tight spacing that causes an overlap. Verify the hook/agent catches it.

- [ ] **Step 5: Commit**

```bash
git add agents/canvas-validator.md hooks/visual-check.js hooks/hooks.json
git commit -m "feat: add canvas-validator agent and visual-check hook

Automated visual quality checking on canvas session writes.
Catches label overlaps, broken arrows, and readability issues."
```

---

## Task 14: Graph JSON Annotations + Update Docs

**Validate by:** Generate a diagram with annotations — see sticky-note style text near elements.

**Files:**
- Modify: `tools/dagre-layout.js` (support `annotations` array)
- Modify: `references/graph-json-format.md` (document annotations)
- Modify: `package.json` (bump version to 2.0.0)
- Modify: `CLAUDE.md` (final update)

- [ ] **Step 1: Add annotations support to dagre-layout.js**

Parse `annotations` array from graph JSON. Each annotation: `{id, text, x, y, fontSize?, color?, width?, anchorTo?}`. Generate free text elements at specified coordinates. If `anchorTo` references a node, position relative to that node's computed position.

- [ ] **Step 2: Update graph-json-format.md**

Document the annotations array with examples.

- [ ] **Step 3: Test — generate diagram with annotations**

Add annotations to a test fixture and verify they appear as free text near the relevant nodes.

- [ ] **Step 4: Update package.json version to 2.0.0 and add npm scripts**

Bump version. Add individual test scripts for new test files:
```json
"test:inspect": "node tests/test-canvas-inspect.js",
"test:merge": "node tests/test-merge.js",
"test:fast-check": "node tests/test-fast-check.js",
"test:primitives": "node tests/test-primitives.js",
"test:canvas-edit": "node tests/test-canvas-edit.js"
```

- [ ] **Step 5: Final CLAUDE.md update**

Reflect the complete plugin structure, all tools, all skills.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```
Expected: ALL tests pass.

- [ ] **Step 7: Commit and push**

```bash
git add -A
git commit -m "feat: add graph JSON annotations and finalize v2.0.0

Annotations array in graph JSON for sticky-note style text.
Updated docs and bumped version to 2.0.0."
git push
```
