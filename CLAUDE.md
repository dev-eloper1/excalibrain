# excalibrain

A Claude Code plugin that turns ideas and code into visual arguments using Excalidraw.

## What is this?

This is a **Claude Code plugin** -- a set of skills, commands, agents, and hooks that teach Claude how to create high-quality Excalidraw diagrams.

The plugin manifest lives in `.claude-plugin/plugin.json`. Skills define modes of operation (draw, canvas, export, add). Tools handle layout and rendering. Agents run multi-step workflows. Hooks enforce quality checks.

## Development

### Quick start
```bash
npm install
npm run build-bundle   # one-time: builds excalidraw-bundle.js
npm test               # runs all tests
```

### Project layout
```
.claude-plugin/        Plugin manifest (plugin.json)
skills/
  draw/                Draw skill (SKILL.md) -- create diagrams from scratch
  canvas/              Canvas session skill -- explore, architect, storyboard modes
  export/              Export skill -- PNG/SVG export with region support
  add/                 Add skill -- merge elements into existing canvases
commands/
  draw.md              /draw slash command
  canvas.md            /canvas slash command
  export.md            /export slash command
  annotate.md          /annotate slash command
agents/
  section-builder.md   Builds diagram sections for architect mode
  canvas-validator.md  Validates canvas structure and visual quality
hooks/
  hooks.json           Hook configuration
  fast-check.js        Pre-save structural validation
  visual-check.js      Post-save visual quality check
tools/
  dagre-layout.js      Graph JSON -> positioned Excalidraw (dagre engine)
  mermaid-convert.js   Mermaid -> Excalidraw conversion
  gantt-layout.js      Gantt chart layout
  export.js            Excalidraw -> PNG/SVG export (puppeteer + sharp)
  canvas-inspect.js    Read and query existing .excalidraw files
  canvas-edit.js       Programmatic edits to existing canvases
  primitives.js        Wireframe and floor plan primitive generation
  excalidraw-bundle.js Built Excalidraw renderer (generated)
  render_template.html HTML template for SVG export
  mermaid_template.html HTML template for Mermaid rendering
  themes/              Theme JSON files
references/
  graph-json-format.md Complete graph JSON input format spec
  color-palette.md     Color palette reference
  layout-rules.md      Layout and spacing rules
  recipes.md           Common diagram recipes
tests/
  test-dagre.js        Dagre layout tests
  test-mermaid.js      Mermaid conversion tests
  test-export.js       Export tests
  test-canvas-inspect.js  Canvas inspect tests
  test-merge.js        Merge/position/prefix tests
  test-fast-check.js   Fast-check hook tests
  test-primitives.js   Primitives tests
  test-canvas-edit.js  Canvas edit tests
  test-all.sh          Run all tests
  fixtures/            Test input files
examples/              Example diagrams (architecture, flowchart, ER, etc.)
scripts/
  build-bundle.js      Builds excalidraw-bundle.js
docs/
  PLAN.md              Development plan
```

### Tools
- `node tools/dagre-layout.js graph.json --output diagram.excalidraw` -- graph layout
- `node tools/mermaid-convert.js input.mmd --output diagram.excalidraw` -- Mermaid conversion
- `node tools/gantt-layout.js gantt.json --output gantt.excalidraw` -- Gantt charts
- `node tools/export.js diagram.excalidraw --format png --output diagram.png` -- PNG/SVG export
- `node tools/canvas-inspect.js diagram.excalidraw --summary` -- inspect canvas
- `node tools/canvas-edit.js diagram.excalidraw update <id> <field> <value>` -- update element property
- `node tools/canvas-edit.js diagram.excalidraw delete <id>` -- delete element
- `node tools/canvas-edit.js diagram.excalidraw move <id> <dx> <dy>` -- move element
- `node tools/canvas-edit.js diagram.excalidraw strip-prefix <prefix>` -- remove all elements with prefix (for section replacement)
- `node tools/primitives.js input.json --output out.excalidraw` -- wireframe/floorplan primitives

### Test scripts
```bash
npm test                # all tests
npm run test:dagre      # dagre layout
npm run test:mermaid    # mermaid conversion
npm run test:export     # export
npm run test:inspect    # canvas inspect
npm run test:merge      # merge/position/prefix
npm run test:fast-check # fast-check hook
npm run test:primitives # primitives
npm run test:canvas-edit # canvas edit
```

### Dependencies
All Node.js. Runtime: @dagrejs/dagre, puppeteer, sharp. Dev: @excalidraw/excalidraw, react, esbuild.
