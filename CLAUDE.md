# excalibrain

A Claude Code plugin that turns ideas and code into visual arguments using Excalidraw.

## What is this?

This is a **Claude Code plugin** — a set of skills + tools that teach Claude how to create high-quality Excalidraw diagrams.

The plugin manifest lives in `.claude-plugin/plugin.json`. The intelligence layer (what to draw, how to argue visually) lives in `skills/draw/SKILL.md`. The tools that handle layout and rendering live in `tools/`.

## Development

Read `docs/PLAN.md` for the complete development plan. It is designed to be followed autonomously phase by phase.

### Quick start
```bash
npm install
npm run build-bundle   # one-time: builds excalidraw-bundle.js
npm test               # runs all tests
```

### Project layout
- `.claude-plugin/` — Plugin manifest (plugin.json)
- `skills/draw/` — Draw skill (SKILL.md + symlink to references)
- `references/` — Canonical location for color palette, recipes, layout rules, etc.
- `tools/` — Node.js scripts: dagre-layout.js, mermaid-convert.js, export.js
- `tests/` — Test files + fixtures
- `scripts/` — Build scripts (bundle builder)
- `docs/` — Plan and architecture docs

### Tools
- `node tools/dagre-layout.js graph.json --output diagram.excalidraw` — graph layout
- `node tools/mermaid-convert.js input.mmd --output diagram.excalidraw` — Mermaid conversion
- `node tools/export.js diagram.excalidraw --format png --output diagram.png` — PNG/SVG export

### Dependencies
All Node.js. Runtime: @dagrejs/dagre, puppeteer, sharp. Dev: @excalidraw/excalidraw, react, esbuild.

## Key files from old projects to reference

When implementing, read these source files for content to carry over:

- `/Users/bhushan/Documents/excalidraw-agent-cli/dagre-layout.js` — dagre layout engine (copy + fix)
- `/Users/bhushan/.claude/skills/excalidraw-agent-cli/SKILL.md` — old skill (rewrite workflow, keep philosophy)
- `/Users/bhushan/.claude/skills/excalidraw-agent-cli/references/` — color palette, patterns, recipes (carry over)
- `/Users/bhushan/Documents/excalidraw-diagram-skill/references/render_template.html` — exportToSvg pattern
