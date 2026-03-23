# excalibrain — Development Plan

> A Claude Code skill that turns ideas and code into visual arguments using Excalidraw.
> The intelligence layer that no MCP or library provides.

This document is the single source of truth for building excalibrain. A Claude Code session should be able to read this file and autonomously implement the entire skill, phase by phase.

---

## Table of Contents

1. [Problem & Motivation](#1-problem--motivation)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Phase 1: Project Scaffold](#phase-1-project-scaffold)
5. [Phase 2: dagre-layout.js](#phase-2-dagre-layoutjs)
6. [Phase 3: Excalidraw Bundle](#phase-3-excalidraw-bundle)
7. [Phase 4: export.js](#phase-4-exportjs)
8. [Phase 5: mermaid-convert.js](#phase-5-mermaid-convertjs)
9. [Phase 6: SKILL.md & References](#phase-6-skillmd--references)
10. [Phase 7: Install & Verify](#phase-7-install--verify)
11. [Phase 8: Deprecate Old Skill](#phase-8-deprecate-old-skill)
12. [Testing Strategy](#testing-strategy)
13. [Parallelization Guide](#parallelization-guide)
14. [Key Decisions & Rationale](#key-decisions--rationale)
15. [Source Files to Carry Over](#source-files-to-carry-over)

---

## 1. Problem & Motivation

### What exists today

The `excalidraw-agent-cli` skill generates diagrams using:
- A **Python CLI** (`excalidraw-agent-cli`) that wraps a Node.js backend
- **dagre-layout.js** for automatic graph layout (good, keep)
- A **custom roughjs renderer** (`export.js`) that produces SVG/PNG (bad, replace)

### Problems identified

1. **Rendering quality**: The roughjs renderer uses system font fallbacks (Comic Sans instead of Excalifont), produces imprecise arrow routing, and mispositions text. The same `.excalidraw` file looks significantly better when opened in excalidraw.com.

2. **Arrow bindings**: `dagre-layout.js` outputs arrows with `startBinding: null, endBinding: null` using absolute coordinates. The custom roughjs renderer compensated with manual edge-intersection math (`shapeEdgePoint`), but Excalidraw's native renderer cannot handle unbound arrows — they cut through nodes.

3. **Multiline labels**: Fixed node dimensions (`160x50`) ignore label content. Long or multiline labels overflow.

4. **Mixed languages**: Python CLI + Node.js dagre + Node.js export — unnecessary complexity.

5. **Unnecessary CLI**: The CLI is middleware between Claude and a JSON file. Claude can write JSON directly.

6. **Missing Mermaid path**: Excalidraw's `@excalidraw/mermaid-to-excalidraw` library converts Mermaid syntax to native Excalidraw elements for flowcharts, sequence, class, and ER diagrams. The old skill reimplements this from scratch via dagre.

### What excalibrain does that the Excalidraw MCP cannot

| Capability | MCP | excalibrain |
|---|---|---|
| Read a codebase and decide what to diagram | No | Yes |
| Choose the right diagram type | No | Yes |
| Make editorial decisions (emphasis, omit, contrast) | No | Yes |
| Multi-diagram storyboards | No | Yes |
| Embed real code/data as evidence | No | Yes |
| Enforce semantic color system | No | Yes |
| Auto-layout graphs (dagre) | No | Yes |
| Convert Mermaid to native Excalidraw elements | No | Yes |
| Export .excalidraw / PNG / SVG files | No | Yes |
| Work in Claude Code (file output) | No (widget broken in Code) | Yes |

**One line:** excalibrain is the brain that decides what to draw and how to argue visually. The MCP and excalidraw.com are the hands that render it.

---

## 2. Architecture

```
User: "diagram the auth flow"
         |
    +----v-----+
    |  SKILL.md |  Intelligence layer (what to draw, how to argue)
    +----+-----+
         |  Claude decides diagram type + content
         |
    +----v-------------------------------------+
    |  Claude generates one of:                |
    |                                          |
    |  Mermaid syntax  (~50%)                  |  flowchart, sequence, class, ER
    |  Dagre graph JSON (~40%)                 |  architecture, state, mindmap, gantt
    |  Direct .excalidraw JSON (~10%)          |  freehand, creative
    +----+----------+----------------+---------+
         |          |                |
    +----v---+ +---v-----+         |
    |mermaid | | dagre   |         |
    |convert | | layout  |         |
    |  .js   | |  .js    |         |
    +----+---+ +---+-----+         |
         |         |               |
         +----+----+---------------+
              |
         .excalidraw file  <-- primary output
              |
         +----v----+
         |export.js|  PNG/SVG for docs
         +---------+
```

### Diagram type to tool routing

| Diagram Type | Tool | Claude Generates |
|---|---|---|
| Flowchart | `mermaid-convert.js` | Mermaid `flowchart` syntax |
| Sequence | `mermaid-convert.js` | Mermaid `sequenceDiagram` syntax |
| Class | `mermaid-convert.js` | Mermaid `classDiagram` syntax |
| ER | `mermaid-convert.js` | Mermaid `erDiagram` syntax |
| Architecture | `dagre-layout.js` | Graph JSON |
| State | `dagre-layout.js` | Graph JSON |
| Mindmap | `dagre-layout.js` | Graph JSON |
| Gantt | `dagre-layout.js` | Graph JSON |
| Freehand/Creative | Direct | .excalidraw JSON |

**Why two tools:** `mermaid-to-excalidraw` produces native elements (rectangles, arrows) for flowchart, sequence, class, ER — but falls back to a rasterized image for state, gantt, mindmap. Dagre handles those natively.

---

## 3. Project Structure

```
~/Documents/excalibrain/
+-- package.json
+-- node_modules/                         # npm install
|
+-- tools/
|   +-- dagre-layout.js                   # Graph JSON -> .excalidraw
|   +-- mermaid-convert.js                # Mermaid syntax -> .excalidraw
|   +-- export.js                         # .excalidraw -> PNG/SVG
|   +-- render_template.html              # HTML: local excalidraw bundle for export
|   +-- mermaid_template.html             # HTML: mermaid-to-excalidraw via esm.sh
|   +-- excalidraw-bundle.js              # Pre-built local excalidraw (~2.5MB)
|
+-- skill/
|   +-- SKILL.md                          # Main skill (symlinked to ~/.claude/skills/)
|   +-- references/
|       +-- color-palette.md
|       +-- diagram-type-rubric.md
|       +-- layout-rules.md
|       +-- patterns.md
|       +-- graph-json-format.md          # NEW: dagre input format docs
|       +-- diagram-recipes/
|           +-- architecture.md
|           +-- flowchart.md
|           +-- sequence.md
|           +-- mindmap.md
|           +-- class-diagram.md
|           +-- state-diagram.md
|           +-- er-diagram.md
|           +-- gantt.md
|
+-- scripts/
|   +-- build-bundle.js                   # Builds excalidraw-bundle.js
|
+-- tests/
|   +-- fixtures/                         # Test input files
|   |   +-- simple-flow.json              # Simple dagre graph
|   |   +-- architecture.json             # Multi-zone architecture
|   |   +-- multiline-labels.json         # Tests multiline label sizing
|   |   +-- flowchart.mmd                 # Mermaid flowchart
|   |   +-- sequence.mmd                  # Mermaid sequence diagram
|   |   +-- class.mmd                     # Mermaid class diagram
|   |   +-- er.mmd                        # Mermaid ER diagram
|   +-- test-dagre.js                     # Tests for dagre-layout.js
|   +-- test-mermaid.js                   # Tests for mermaid-convert.js
|   +-- test-export.js                    # Tests for export.js
|   +-- test-all.sh                       # Runs everything
|
+-- docs/
    +-- PLAN.md                           # This file
```

---

## Phase 1: Project Scaffold

**Goal:** Set up the project, install dependencies, verify Node.js tools work.

### Steps

1. Create `package.json` with:
   - Runtime deps: `@dagrejs/dagre` (^2.0.4), `puppeteer` (^23.0.0), `sharp` (^0.33.0)
   - Dev deps: `@excalidraw/excalidraw` (0.17.6), `react` (^18), `react-dom` (^18), `esbuild` (^0.24.0)
   - Scripts: `build-bundle`, `test`, `test:dagre`, `test:mermaid`, `test:export`

2. Run `npm install`

3. Create `.gitignore` (exclude node_modules, *.png, *.svg, /tmp/ but NOT excalidraw-bundle.js)

4. Initialize git repo

### Verification
- `node -e "require('@dagrejs/dagre')"` succeeds
- `node -e "require('puppeteer')"` succeeds
- `node -e "require('sharp')"` succeeds

---

## Phase 2: dagre-layout.js

**Goal:** Port dagre-layout.js from the old project with 3 critical fixes.

### Source file
Copy from: `/Users/bhushan/Documents/excalidraw-agent-cli/dagre-layout.js` (592 lines)

### Fix 1: Arrow bindings (CRITICAL — highest impact)

**Location:** Lines 439-469

**Problem:** Arrows use `startBinding: null, endBinding: null` with absolute coordinates. Works in the custom roughjs renderer but breaks in Excalidraw's native renderer — arrows cut through nodes instead of routing around them.

**Fix:** Replace the conditional with always-bind:

```js
// Always bind arrows to source/target shapes.
// Excalidraw's renderer handles edge intersection when bindings are set.
startBinding = { elementId: e.from, focus: 0, gap: 4 };
endBinding   = { elementId: e.to,   focus: 0, gap: 4 };

// Use center-to-center for the points array.
// Excalidraw re-routes from shape edge automatically.
startPt = { x: from.cx, y: from.cy };
endPt   = { x: to.cx, y: to.cy };
points  = [[0, 0], [+(endPt.x - startPt.x).toFixed(1), +(endPt.y - startPt.y).toFixed(1)]];
```

### Fix 2: Multiline label auto-sizing

**Location:** Lines 129-137

**Problem:** Fixed DEFAULT_W=160, DEFAULT_H=50 ignores label content.

**Fix:** Calculate node dimensions from label text before passing to dagre:

```js
const label = n.label || n.id;
const lines = label.split('\n');
const maxLineLen = Math.max(...lines.map(l => l.length), 1);
const fontSize = n.fontSize ?? STYLE.fontSize;
const calcW = Math.max(DEFAULT_W, Math.ceil((maxLineLen * fontSize * 0.65 + 32) / 10) * 10);
const calcH = Math.max(DEFAULT_H, Math.ceil((lines.length * fontSize * 1.25 + 20) / 10) * 10);
```

### Fix 3: Default tuning

| Setting | Old | New | Location |
|---------|-----|-----|----------|
| `arrowWidth` | `1` | `1.5` | line 106 |
| `fontSize` | `14` | `16` | line 174 |
| Edge label fontSize | `11` | `13` | line 526 |
| Zone label fontSize | `12` | `13` | line 304 |
| Zone roundness | `null` | `{ type: 3 }` | line 291 |

### Test fixtures

Create `tests/fixtures/simple-flow.json` — 3 nodes (Start/Process/End), 2 edges, TB direction.

Create `tests/fixtures/multiline-labels.json` — 3 nodes with 1/2/3 line labels, LR direction.

Create `tests/fixtures/architecture.json` — 7 nodes across 3 zones (clients/services/data), 6 edges with colors.

### Test file: `tests/test-dagre.js`

4 tests:
1. **simple-flow**: Generates valid output, ALL arrows have startBinding and endBinding with elementId
2. **multiline-labels**: 3-line label node has height > 50
3. **architecture**: Zone backgrounds exist and appear before nodes in element array
4. **valid-excalidraw-format**: version=2, appState exists, all elements have type/id/x/y

### Verification
- `node tools/dagre-layout.js tests/fixtures/simple-flow.json > /tmp/test.excalidraw` succeeds
- Opening `/tmp/test.excalidraw` in excalidraw.com shows arrows connecting to shape edges
- `npm run test:dagre` — all 4 tests pass

---

## Phase 3: Excalidraw Bundle

**Goal:** Build a self-contained `excalidraw-bundle.js` for browser-based rendering without CDN.

### Script: `scripts/build-bundle.js`

1. Create temp entry file: `import { exportToSvg } from "@excalidraw/excalidraw"; window.__exportToSvg = exportToSvg;`
2. Create process shim: `export const process = { env: { NODE_ENV: 'production' } };`
3. Run esbuild: `npx esbuild entry.js --bundle --format=iife --platform=browser --inject:shim.js --define:process.env.NODE_ENV='"production"' --outfile=tools/excalidraw-bundle.js --minify`
4. Clean up temp files
5. Report bundle size (~2.5MB)

### Verification
- `tools/excalidraw-bundle.js` exists and is ~2.5MB
- Bundle contains strings `exportToSvg` and `__exportToSvg`

---

## Phase 4: export.js

**Goal:** Render `.excalidraw` to PNG/SVG using local excalidraw bundle + Puppeteer.

### Template: `tools/render_template.html`

HTML page that:
1. Sets `window.process = { env: { NODE_ENV: 'production' } }` and `window.global = window` (BEFORE bundle loads)
2. Loads `excalidraw-bundle.js` via script tag (local file, no CDN)
3. Exposes `window.renderDiagram(jsonData)` that calls `window.__exportToSvg`
4. Returns `{ success, width, height, svgString }`
5. Sets `window.__moduleReady = true` when loaded

### Tool: `tools/export.js`

CLI that:
1. Parses args: input file, --format (png|svg), --output, --scale, --dark, --padding
2. Reads .excalidraw JSON
3. Launches Puppeteer, loads render_template.html
4. Calls `renderDiagram()` with the JSON
5. For SVG: writes svgString to file
6. For PNG: screenshots the rendered SVG element at specified scale
7. Outputs JSON result: `{ success, output, format, fileSize }`

### Test file: `tests/test-export.js`

3 tests:
1. **export-png**: Produces PNG file > 1KB
2. **export-svg**: Produces SVG file containing `<svg>` tag
3. **export-svg-has-embedded-font**: SVG contains `@font-face` with base64 font data

### Verification
- PNG output has real Excalifont (not Comic Sans)
- SVG embeds fonts as base64
- `npm run test:export` — all 3 tests pass

---

## Phase 5: mermaid-convert.js

**Goal:** Convert Mermaid syntax to native `.excalidraw` elements.

### Template: `tools/mermaid_template.html`

HTML page that:
1. Imports `parseMermaidToExcalidraw` from `https://esm.sh/@excalidraw/mermaid-to-excalidraw?bundle` (ESM module)
2. Exposes `window.__parseMermaid(syntax)` returning `{ success, elements, files }`
3. Sets `window.__moduleReady = true`

**Note:** Uses esm.sh CDN because mermaid.js + DOMPurify make local bundling complex. Puppeteer caches the CDN response. A local bundle can be added later if needed.

### Tool: `tools/mermaid-convert.js`

CLI that:
1. Reads Mermaid syntax from file or stdin
2. Launches Puppeteer, loads mermaid_template.html (with `waitUntil: 'networkidle0'` for CDN load)
3. Calls `__parseMermaid()` with the syntax
4. Wraps result in .excalidraw JSON structure
5. Warns if output contains image elements (rasterized fallback)
6. Writes to output file

### Test fixtures

- `tests/fixtures/flowchart.mmd` — flowchart with decision diamond
- `tests/fixtures/sequence.mmd` — sequence with request/response
- `tests/fixtures/class.mmd` — class with inheritance
- `tests/fixtures/er.mmd` — ER with relationships

### Test file: `tests/test-mermaid.js`

4 tests — each verifies that the diagram type produces native elements (rectangles, arrows, text) NOT rasterized images.

### Verification
- All 4 Mermaid types produce native elements
- Output `.excalidraw` files open correctly in excalidraw.com
- `npm run test:mermaid` — all 4 tests pass

---

## Phase 6: SKILL.md & References

**Goal:** Write the intelligence layer and reference files.

### Source files to carry over (read these, adapt content):

| Source | Target | Action |
|---|---|---|
| `/Users/bhushan/.claude/skills/excalidraw-agent-cli/SKILL.md` | `skill/SKILL.md` | Rewrite workflow, keep philosophy |
| `.../references/color-palette.md` | `skill/references/color-palette.md` | Copy as-is |
| `.../references/diagram-type-rubric.md` | `skill/references/diagram-type-rubric.md` | Copy as-is |
| `.../references/patterns.md` | `skill/references/patterns.md` | Copy as-is |
| `.../references/layout-rules.md` | `skill/references/layout-rules.md` | Update Rules 14-15, remove Rule 1 |
| `.../references/diagram-recipes/*.md` | `skill/references/diagram-recipes/*.md` | Rewrite: graph JSON or Mermaid examples |

### SKILL.md structure

```
---
name: excalibrain
description: Create Excalidraw diagrams that argue visually — turn ideas and code
  into visual arguments. Trigger on: draw, diagram, visualize, chart, map out,
  flowchart, architecture, sequence diagram, mind map, ER diagram, etc.
---

# excalibrain

## Reference files (table)
## Workflow (6 steps: type select, source, recipe, generate, validate, output)
## Core Philosophy (argue not display, isomorphism test, container discipline)
## Visual Patterns (reference to patterns.md)
## Evidence Artifacts (dark panels, real code/data)
## Multi-Zoom Architecture (summary strip, zones, detail)
## Quality Checklist
```

### Workflow in SKILL.md (key section)

```
1. Type selection — read diagram-type-rubric.md
2. Content sourcing — codebase analysis or conceptual
3. Read recipe + color palette
4. Generate:
   - Mermaid path (flowchart, sequence, class, ER):
     Write .mmd file, run: node ~/Documents/excalibrain/tools/mermaid-convert.js input.mmd --output diagram.excalidraw
   - Dagre path (architecture, state, mindmap, gantt):
     Write graph JSON, run: node ~/Documents/excalibrain/tools/dagre-layout.js graph.json --output diagram.excalidraw
   - Direct path (freehand): Write .excalidraw JSON
5. Validate:
     node ~/Documents/excalibrain/tools/export.js diagram.excalidraw --format png --output diagram.png
     Read the PNG. Quality checklist. Fix and re-render (max 3 iterations).
6. Output: .excalidraw + optional PNG/SVG
```

### Diagram recipes rewrite

Mermaid-routed (flowchart, sequence, class, ER): Show complete Mermaid syntax examples with color notes.
Dagre-routed (architecture, state, mindmap, gantt): Show complete graph JSON examples.
All recipes keep: layout guidance, color defaults from color-palette.md, common pitfalls.

### New file: `skill/references/graph-json-format.md`

Document full dagre-layout.js input format:
- Graph level: direction, rankSep, nodeSep, title, style, arrowhead
- Node: id, label, width, height, fill, stroke, shape, rounded, textColor, fontSize, fillStyle, strokeStyle, strokeWidth, roughness
- Edge: from, to, label, stroke, style, width, arrowhead
- Zone: id, label, nodeIds, fill, stroke, labelColor, opacity
- CLI flags: --roughness, --font, --fill, --clean, --output, --arrow-width, --node-width

### Layout rules updates

- **Rule 14**: Replace with typography scale (title 20-22, zone 13-14, node 16, edge 12-13, evidence 12-13, minimum 12)
- **Rule 15**: Add stroke width column (primary 2, spoke 1, emphasis 3, async 1.5)
- **Remove Rule 1**: x>=200, y>=150 constraint was CLI-specific; dagre handles positioning

### Verification
- `skill/SKILL.md` contains complete workflow with tool commands
- All 8 recipe files exist with Mermaid or graph JSON examples
- `graph-json-format.md` documents all dagre input fields
- `color-palette.md`, `diagram-type-rubric.md`, `patterns.md` copied unchanged

---

## Phase 7: Install & Verify

### Steps

1. Symlink skill:
```bash
ln -sf ~/Documents/excalibrain/skill ~/.claude/skills/excalibrain
```

2. Run full test suite:
```bash
cd ~/Documents/excalibrain && npm test
```

3. End-to-end test:
```bash
node tools/dagre-layout.js tests/fixtures/architecture.json --output /tmp/arch.excalidraw
node tools/export.js /tmp/arch.excalidraw --format png --output /tmp/arch.png
```

4. Open `/tmp/arch.excalidraw` in excalidraw.com — verify arrows, zones, text.

5. View `/tmp/arch.png` — verify Excalifont, not Comic Sans.

### test-all.sh

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "excalibrain test suite"
echo ""
echo "dagre-layout.js:"
node tests/test-dagre.js
echo "export.js:"
node tests/test-export.js
echo "mermaid-convert.js:"
node tests/test-mermaid.js
echo ""
echo "All tests complete."
```

---

## Phase 8: Deprecate Old Skill

1. Yank PyPI releases via https://pypi.org/manage/project/excalidraw-agent-cli/releases/ (yank 1.1.0, 1.2.0, 1.3.0)
2. `pipx uninstall excalidraw-agent-cli`
3. `rm ~/.claude/skills/excalidraw-agent-cli`
4. Consider removing `~/.claude/skills/excalidraw` if it points to excalidraw-diagram-skill
5. Archive old repos with `git tag archived`

---

## Testing Strategy

### Unit tests (per tool)

| Test file | Tests | Verifies |
|---|---|---|
| `test-dagre.js` | 4 | Arrow bindings, multiline sizing, zones, valid format |
| `test-export.js` | 3 | PNG output, SVG output, embedded fonts |
| `test-mermaid.js` | 4 | Flowchart, sequence, class, ER produce native elements |

### Integration test (manual)

Generate architecture diagram -> open in excalidraw.com -> verify arrows respect boundaries -> export PNG -> verify font rendering.

### Regression test

Regenerate CKP storyboard diagrams and compare with MCP output from the original comparison.

---

## Parallelization Guide

```
Phase 1 (scaffold) ---- sequential, must be first
     |
     +-- Phase 2 (dagre-layout.js) ---+
     |                                 +-- can run in parallel
     +-- Phase 3 (excalidraw bundle) -+
     |
     +-- Phase 5 (mermaid-convert.js) ---- independent
     |
     +-- Phase 6 (SKILL.md + references) - independent
     |
     Phase 4 (export.js) ---- depends on Phase 3 (needs bundle)
     |
     Phase 7 (verify) ---- depends on all above
     |
     Phase 8 (deprecate) ---- depends on Phase 7
```

**Maximum parallelism after Phase 1:** Launch 4 sub-agents:
- Agent 1: Phase 2 (dagre fixes)
- Agent 2: Phase 3 (excalidraw bundle build)
- Agent 3: Phase 5 (mermaid-convert.js)
- Agent 4: Phase 6 (SKILL.md + references)

Then Phase 4 after Phase 3 completes. Then Phase 7 after all complete.

---

## Key Decisions & Rationale

### Why not keep the CLI?
The CLI is middleware between Claude and a JSON file. Claude writes JSON directly. dagre-layout.js handles positioning. The CLI added: Python dependency, process spawning overhead, file I/O per command, installation complexity. None needed.

### Why always set arrow bindings?
Excalidraw routes arrows around shapes when bindings are set. Without bindings, arrows cut through shapes. The old roughjs renderer compensated with custom edge-intersection math — but that renderer is deleted.

### Why keep dagre if mermaid-to-excalidraw exists?
mermaid-to-excalidraw produces native elements only for flowchart, sequence, class, ER. Falls back to rasterized images for state, gantt, mindmap. Dagre handles all types natively. Architecture diagrams (zones) have no Mermaid equivalent.

### Why esm.sh for mermaid but local bundle for excalidraw?
Excalidraw export runs frequently (every diagram). Mermaid conversion runs only for 4 diagram types. Mermaid + DOMPurify make local bundling complex. esm.sh is cached by Puppeteer's browser cache. A local mermaid bundle can be added later.

### Why Puppeteer for everything?
exportToSvg and mermaid-to-excalidraw both need browser DOM APIs (Canvas for text measurement, DOMPurify for sanitization, SVG DOM creation). Node.js lacks these. Puppeteer bundles its own Chromium — one npm install, everything works.

### Why commit excalidraw-bundle.js?
It is a build artifact (~2.5MB) but committing it means users never need devDependencies. Just npm install runtime deps and everything works. build-bundle.js exists for rebuilding when excalidraw updates.

---

## Source Files to Carry Over

### From `/Users/bhushan/Documents/excalidraw-agent-cli/`
| File | Phase | Action |
|---|---|---|
| `dagre-layout.js` | 2 | Copy + apply 3 fixes |
| `package.json` | 1 | Reference for dagre version |

### From `/Users/bhushan/.claude/skills/excalidraw-agent-cli/`
| File | Phase | Action |
|---|---|---|
| `SKILL.md` | 6 | Rewrite workflow, keep philosophy |
| `references/color-palette.md` | 6 | Copy as-is |
| `references/diagram-type-rubric.md` | 6 | Copy as-is |
| `references/patterns.md` | 6 | Copy as-is |
| `references/layout-rules.md` | 6 | Update Rules 14-15, remove Rule 1 |
| `references/diagram-recipes/*.md` | 6 | Rewrite with Mermaid/graph JSON examples |

### From `/Users/bhushan/Documents/excalidraw-diagram-skill/`
| File | Phase | Action |
|---|---|---|
| `references/render_template.html` | 4 | Pattern reference (adapted for local bundle) |

### From `/tmp/excalidraw-bundle-test/` (proven during design session)
| File | Phase | Action |
|---|---|---|
| `excalidraw-bundle.js` | 3 | Already built and tested, can copy as starting point |
| `render_template_local.html` | 4 | Proven template with process polyfill |
