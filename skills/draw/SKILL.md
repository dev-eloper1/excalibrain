---
name: excalibrain
description: Create Excalidraw diagrams that argue visually — turn ideas and code
  into visual arguments. Trigger on draw, diagram, visualize, chart, map out,
  flowchart, architecture, sequence diagram, mind map, ER diagram, class diagram,
  state diagram, gantt, sketch, or any request to visually represent information.
---

# excalibrain

Generate diagrams that **argue visually**, not just display information. A diagram is a visual argument that shows relationships, causality, and flow that words alone cannot express. **The shape should BE the meaning.**

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

## Reference files

Read these as needed — they are the ground truth for specifics:

| File | When to read |
|------|-------------|
| `references/color-palette.md` | **Before every diagram** — all hex values live here |
| `references/diagram-type-rubric.md` | **Type selection** — which diagram type to use when |
| `references/patterns.md` | Visual pattern library with examples |
| `references/layout-rules.md` | Layout rules + coordinate templates |
| `references/graph-json-format.md` | Dagre graph JSON input format (architecture, state, mindmap) |
| `references/diagram-recipes/<type>.md` | **Before generating** — complete examples per type |

Available recipes: `flowchart.md`, `sequence.md`, `mindmap.md`, `class-diagram.md`, `state-diagram.md`, `er-diagram.md`, `gantt.md`, `architecture.md`

---

## Workflow

### 1. Type & theme selection

Present the user with options before generating:

*"I'll generate a **[type]** diagram for this. Here are the available themes:"*

| Theme | Look |
|-------|------|
| `default` | Hand-drawn Excalidraw style (Virgil font, slight roughness) |
| `clean` | Professional, precise lines (monospace font, no roughness) |
| `dark` | Dark background with vibrant colors |
| `blueprint` | Technical blueprint style (dark blue/white) |

*"Want me to use the default theme, or would you prefer a different one?"*

If the user doesn't specify or says to proceed, use `default`. If the user specifies a theme, pass `--theme <name>` to both dagre-layout.js and mermaid-convert.js.

**Type selection:** Read `references/diagram-type-rubric.md`. If the user's request clearly matches one type, state it and proceed. If ambiguous, ask which type they prefer.

### 2. Content sourcing

**Codebase task** (documenting a repo, explaining a system):
- **Parallelize file reads** — identify all relevant source files first, then read them all in a single turn using multiple parallel Read tool calls.
- Present a brief bullet summary: *"Here's what I found: [nodes + relationships]"*
- Wait for user confirmation before generating (max 3 rounds; proceed after 3 or if user says "go ahead")

**Multiple diagrams in one request:**
- Generate all diagrams in parallel using sub-agents — each diagram is fully independent

**Conceptual task** (blog post, report, explanation):
- Derive structure from the user's message and any open documents
- No confirmation needed — proceed directly

### 3. Read the recipe + color palette
**Parallelize with Step 2** — read `references/diagram-recipes/<type>.md` AND `references/color-palette.md` in the same turn.

### 4. Generate

Choose the path based on diagram type:

**Mermaid path** (flowchart, sequence, class, ER):
1. Write the Mermaid syntax to a `.mmd` file
2. **Flowcharts**: Always include `classDef` color classes from the recipe — without them the output is monochrome
3. **ER diagrams**: Use `style ENTITY fill:#hex,stroke:#hex` for colored entities
4. Run: `node ${CLAUDE_PLUGIN_ROOT}/tools/mermaid-convert.js input.mmd [--theme <name>] --output diagram.excalidraw`
5. Output is a native `.excalidraw` file with vector elements

**Gantt path** (gantt charts, project timelines, sprint schedules):
1. Write Gantt JSON to a `.json` file (see `references/diagram-recipes/gantt.md` for full format)
2. The JSON uses a Gantt-specific format with `tasks` (id, label, start, duration, fill, stroke) and optional `dependencies`
3. Run: `node ${CLAUDE_PLUGIN_ROOT}/tools/gantt-layout.js gantt.json [--theme <name>] --output diagram.excalidraw`
4. Output is a proper Gantt chart with horizontal time axis, parallel task bars, grid lines, and dependency arrows

**Dagre path** (architecture, state, mindmap):
1. Write graph JSON to a `.json` file (see `references/graph-json-format.md` for full format)
2. **Do NOT override `style.roughness` or `style.fontFamily`** in graph JSON unless the user explicitly asks for a clean/technical look — let the theme control these
3. Run: `node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js graph.json [--theme <name>] --output diagram.excalidraw`
4. Output is a fully-positioned `.excalidraw` file with bound arrows and auto-sized nodes

**Direct path** (freehand, creative, mixed):
1. Write `.excalidraw` JSON directly following Excalidraw's element format
2. Use sparingly — prefer dagre or mermaid for anything with structure

### 5. Validate (mandatory)
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/export.js diagram.excalidraw --format png --output diagram.png
```
Read the PNG with the Read tool. Check:
- [ ] All nodes labeled and readable
- [ ] No label text overlapping node borders or other nodes
- [ ] All expected connections present
- [ ] Arrow directions correct
- [ ] Color coding consistent with color-palette.md
- [ ] Structure passes isomorphism test (remove text — does shape alone communicate?)

If any item fails: fix the input, regenerate, re-export. **Max 3 iterations.**

### 6. Output
Save `.excalidraw` + optional PNG/SVG to:
- Same directory as the doc being written → or `docs/diagrams/` if it exists → or current directory

Return markdown embed: `![<Type> diagram showing <brief description>](<relative-path>)`

Output format by context:

| Context | Format |
|---|---|
| Markdown doc, README, blog post | PNG |
| Web project (HTML/CSS/JS) | SVG |
| User says "I want to edit it" | `.excalidraw` |
| User specifies a format | User's choice |

---

## Core Philosophy

### Diagrams Should ARGUE, Not DISPLAY

**The Isomorphism Test**: Remove all text. Does the structure alone communicate the concept? If not, redesign.

**The Education Test**: Could someone learn something concrete from this diagram — actual formats, real event names, how things actually connect — or does it just label boxes?

### Container Discipline

Not every piece of text needs a shape around it. Default to free-floating text. Add containers only when:
- Arrows need to connect to the element
- The shape itself carries meaning (decision diamond, start ellipse, etc.)
- Visual grouping with a background zone is needed

**Target**: fewer than 30% of text elements inside containers.

### Bad vs Good

| Bad (Displaying) | Good (Arguing) |
|-----------------|----------------|
| 5 equal boxes with generic labels | Each concept shaped to mirror its behavior |
| Uniform card grid | Structure matches conceptual structure |
| "API" → "Database" → "Client" | Real service names + actual request/response formats |
| Same container style everywhere | Distinct visual vocabulary per concept type |
| Arrows all look the same | Color-coded arrows encoding relationship type |

---

## Depth Assessment (Do This First)

**Simple / Conceptual** — abstract shapes, clean labels. For mental models, overviews.

**Comprehensive / Technical** — concrete examples, real data, code snippets. For real systems, architectures, tutorials.

**If comprehensive**: research the actual specs before drawing. Look up real event names, API formats, method signatures. Generic placeholders make diagrams useless.

---

## Visual Patterns

Each major concept should use a different visual pattern. Full examples in `references/patterns.md`.

| If the concept... | Use this pattern |
|------------------|-----------------|
| Spawns multiple outputs | Fan-out (radial arrows from center) |
| Combines inputs into one | Convergence (arrows merging to a point) |
| Has levels / hierarchy | Tree (lines + free-floating text) |
| Is a sequence of steps | Timeline (line + dot markers + labels) |
| Loops or improves | Cycle (arrows returning to start) |
| Groups related components | Swim lanes (zone backgrounds) |
| Transforms input to output | Assembly line (before → process → after) |
| Has many typed subtypes | Hub-and-spoke (center + spokes) |
| Compares two options | Side-by-side (parallel columns) |

---

## Evidence Artifacts (Technical Diagrams)

| Artifact type | When to use |
|--------------|-------------|
| Code snippet | APIs, integrations, how-to |
| Data / JSON payload | Message formats, schemas |
| Event sequence | Protocols, lifecycles |
| Real API / method names | SDK usage, endpoints |

For dagre path: use dark-background nodes (`fill: "#1e293b"`, `textColor: "#e2e8f0"`) with monospace font.

---

## Multi-Zoom Architecture (Comprehensive Diagrams)

**Level 1 — Summary strip**: Simplified overview at top/bottom showing the full flow.
**Level 2 — Section boundaries**: Labelled, colored zone backgrounds.
**Level 3 — Detail inside sections**: Evidence artifacts, code snippets, real data.

---

## Quality Checklist

### Philosophy
- [ ] Isomorphism test passes — structure alone communicates the concept
- [ ] No uniform card grids — each major concept uses a different visual pattern
- [ ] < 30% of text elements inside containers

### Depth & Evidence
- [ ] Real terminology used — no generic placeholders
- [ ] Evidence artifacts present for technical diagrams
- [ ] Multi-zoom structure for complex diagrams

### Layout
- [ ] All labels fit their containers
- [ ] Zone backgrounds drawn before nodes (dagre handles this)
- [ ] No cross-lane long diagonals
- [ ] Font sizes ≥ 12
- [ ] Arrow styles differentiate relationship types

### Connections
- [ ] Every relationship has an arrow
- [ ] Arrow colors from color-palette.md
- [ ] Bidirectional arrows used where appropriate

### After Render
- [ ] No text overflow or truncation
- [ ] Arrows land on correct elements
- [ ] All text legible at export size
- [ ] Composition balanced
