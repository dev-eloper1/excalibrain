# excalibrain — Product Identity & Architecture Design

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Defines what excalibrain is, how users interact with it, and its plugin architecture.

---

## 1. Identity

excalibrain is the **visual intelligence layer for Claude Code**.

It doesn't own the thinking process. Claude arrives with context — from brainstorming, planning, reading code, or conversation. excalibrain's job is to turn that understanding into visual arguments on an Excalidraw canvas.

The value excalibrain brings — regardless of how smart Claude gets — is **visual intelligence**: layout discipline, semantic color, diagram type selection, the principle that diagrams should argue not display, and component primitives for freehand visuals. Without excalibrain, Claude's diagrams are generic boxes and arrows. With it, they communicate.

**Core philosophy (unchanged from v1):**
- Diagrams should ARGUE, not DISPLAY
- Isomorphism test: remove all text — does the structure alone communicate the concept?
- Container discipline: < 30% of text inside containers
- Depth assessment: conceptual (abstract shapes) vs. comprehensive (real code, real data)

---

## 2. Two Layers

### Layer 1 — Quick Draw (the base, unchanged)

One-shot diagrams from a prompt. "Draw me a flowchart of user auth" → file appears → done.

This is the zero-friction entry point. All existing diagram types, recipes, and tools continue to work exactly as they do today. No session, no canvas management, no persistence.

### Layer 2 — Canvas Sessions

A living workspace where Claude builds visual arguments incrementally. The `.excalidraw` file is updated across multiple turns. The user watches it evolve in VS Code (or any Excalidraw viewer).

A canvas session has:
- **A mode** (canvas strategy — see Section 3)
- **Three content types** on the canvas:
  1. The diagram itself (structure, flow, relationships)
  2. Local annotations (sticky-note reasoning near specific elements)
  3. Research/decisions zone (what was investigated, what was found, why this shape)
- **A sidecar** (`.excalibrain.json` — see Section 6)

The `.excalidraw` file is both a working surface and a potential deliverable. Export to PNG/SVG anytime.

---

## 3. Canvas Session Modes

Modes set the **canvas strategy** — how Claude approaches the canvas, what granularity it works at, and what the interaction pattern looks like. Modes are a starting strategy, not a prison. The user can shift mid-session.

### Explore

For working through an idea together.

- Iterative, conversational, chunk-by-chunk
- Claude sketches a piece, asks questions, adds more
- Granularity adapts to complexity (simple → bigger chunks, complex → smaller)
- Research happens inline — findings annotated on canvas as discovered
- Best for: design decisions, debugging mental models, brainstorming output

### Architect

For comprehensive system visualization.

- Research phase first — Claude reads codebase/context, writes findings to a research zone on the canvas (whiteboard-style: short phrases, not paragraphs)
- Builds section by section using frames, connects into a meta-map
- Each section is its own zone with internal structure
- Annotations capture *why* each subsystem exists and how it relates to others
- Best for: full system architecture, product overviews, onboarding to a codebase

### Storyboard

For sequential narratives.

- Frames laid out left-to-right, each representing a phase/step/state
- Arrows between frames show progression and what carries forward
- Best for: build plans, migration strategies, user journeys, pitching to a team

### Wireframe

For UI layout and screen flows.

- Screen frames with UI primitives inside (see Section 7)
- Navigation arrows between screens
- Hand-drawn style signals "draft" — invites feedback, discourages pixel nitpicking
- Best for: early-stage UI exploration, onboarding flows, page layouts

### Compare (available in any mode)

Not a session mode — a visual operation available within any session or as a Quick Draw.

- Takes N options (2-4) and lays them out side by side in labeled frames
- Each option gets a column with its own structure, annotations, and trade-offs
- A summary row below highlights key differences
- Useful when brainstorming produces multiple approaches, or during architecture decisions
- Can be invoked mid-session ("compare these 3 caching strategies") — adds comparison frames to the existing canvas

### Cross-cutting behaviors (all modes)

- Claude announces what it will draw before drawing it
- User can: continue, redirect, zoom in, redo a section, export, end
- Mode switching is natural ("zoom into this service" shifts Architect → Explore)
- Canvas doesn't reset on mode switch — Claude changes interaction granularity
- Research/decisions zone is always present and maintained
- Export works anytime (full canvas or specific region)

---

## 4. Interaction Contract

### Starting

| User says | Claude infers |
|-----------|---------------|
| "draw me a flowchart of X" | Quick Draw (no session) |
| "let's explore how the caching should work" | Explore session |
| "show me the full architecture of this project" | Architect session |
| "storyboard how we'd build this in 3 phases" | Storyboard session |
| "wireframe the onboarding flow" | Wireframe session |
| "architect mode" / "explore mode" | Explicit mode entry |

On session start, Claude confirms the mode and proposes a canvas location:
> "Starting an Architect session. I'll put this at `docs/diagrams/platform-architecture.excalidraw` — ok?"

### Canvas location

- First use: Claude proposes a smart default based on project structure (e.g., `docs/diagrams/` if it exists, current directory otherwise), user confirms or redirects
- Preference is remembered per-project for future sessions

### During a session

Claude follows a loop:
1. **State what's next** — what it will draw and why
2. **Draw it** — update the `.excalidraw` file + sidecar
3. **Explain and annotate** — brief reasoning in chat, mirrored as annotations on canvas
4. **Check in** — "Does this look right?" or "Should I continue?"

User can respond:
- **Continue** — "yes" / "keep going" / "next"
- **Redirect** — "actually it uses DynamoDB not Postgres"
- **Zoom** — "go deeper on the auth service"
- **Redo** — "redo that section"
- **Export** — "export this" / "export the ML pipeline section"
- **End** — "that's good" / "done"

### Resuming a session

User says "continue the architecture diagram" or "open platform-architecture.excalidraw."

Claude:
1. Reads the `.excalidraw` file
2. Reads the `.excalibrain.json` sidecar
3. Diffs them — if discrepancies, asks user what changed
4. Summarizes where we left off
5. Asks what to do next

### Mode switching

Natural language triggers it:
> "Switching from Architect to Explore — zooming into the ML pipeline section."

Canvas doesn't reset. Claude changes interaction granularity for the next chunk.

---

## 5. Plugin Architecture

excalibrain is a **Claude Code plugin** following the standard plugin structure: `.claude-plugin/plugin.json` manifest, with `skills/`, `commands/`, `agents/`, and `hooks/` directories.

### Plugin manifest (`.claude-plugin/plugin.json`)

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

### Directory structure

```
excalibrain/
├── .claude-plugin/
│   └── plugin.json              # manifest (see above)
├── skills/
│   ├── draw/
│   │   ├── SKILL.md             # Quick Draw — one-shot diagrams
│   │   └── references -> ../../references/  # symlink to canonical refs
│   ├── canvas/
│   │   ├── SKILL.md             # Canvas sessions — explore/architect/storyboard/wireframe
│   │   └── references -> ../../references/
│   ├── add/
│   │   ├── SKILL.md             # Add diagram/section/annotation to existing canvas
│   │   └── references -> ../../references/
│   └── export/
│       └── SKILL.md             # Export canvas or region to PNG/SVG
├── commands/
│   ├── draw.md                  # /excalibrain:draw <description>
│   ├── canvas.md                # /excalibrain:canvas [new <mode> | resume | status]
│   ├── export.md                # /excalibrain:export [region]
│   └── annotate.md              # /excalibrain:annotate <section> <note>
├── agents/
│   ├── section-builder.md       # Generates one section (parallelizable)
│   └── canvas-validator.md      # Exports + validates visual quality
├── hooks/
│   ├── hooks.json               # Hook event registrations
│   ├── fast-check.js            # JSON validation on .excalidraw Write
│   └── visual-check.js          # PNG export + visual quality check (sessions only)
├── tools/                       # Node.js tools (dagre, mermaid, export, etc.)
├── references/                  # CANONICAL location for all shared refs
│   │                            # Each skill symlinks: references -> ../../references/
│   ├── color-palette.md
│   ├── layout-rules.md
│   ├── diagram-type-rubric.md
│   ├── patterns.md
│   ├── graph-json-format.md
│   ├── diagram-recipes/         # 8 existing + wireframe + floorplan
│   └── primitives/              # wireframe.md, floorplan.md
└── docs/
```

### Skills

Each skill is a folder in `skills/` with a `SKILL.md` file and optional `references/` subdirectory. The SKILL.md frontmatter defines `name`, `description`, and trigger phrases.

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `excalibrain:draw` | "draw", "diagram", "visualize", "chart", "flowchart", etc. | Quick Draw — one-shot diagrams (today's behavior) |
| `excalibrain:canvas` | "start a canvas", "architect this", "storyboard", "wireframe", "explore this visually" | Start/resume canvas sessions with a mode |
| `excalibrain:add` | "add to the canvas", "add a section for" | Add a diagram/section/annotation to an existing canvas |
| `excalibrain:export` | "export this", "export as png/svg" | Export full canvas or region |

All skills share:
- Tools (dagre-layout, mermaid-convert, gantt-layout, export, canvas-inspect, canvas-edit, primitives)
- References (color palette, layout rules, diagram-type rubric, patterns, recipes)
- Philosophy ("diagrams should argue, not display")
- Persistence model (`.excalibrain.json` sidecar)

### Capabilities manifest

Each skill's `SKILL.md` includes a capabilities section so Claude knows what excalibrain can do. The `draw` skill (the most commonly triggered) includes the full manifest:

```
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

### Slash commands

Each `.md` file in `commands/` becomes a slash command automatically. The file content defines usage, arguments, and behavior.

| Command | File | Purpose |
|---------|------|---------|
| `/excalibrain:draw <desc>` | `commands/draw.md` | Quick draw shortcut |
| `/excalibrain:canvas [new/resume/status]` | `commands/canvas.md` | Canvas session management |
| `/excalibrain:export [region]` | `commands/export.md` | Export shortcut |
| `/excalibrain:annotate <section> <note>` | `commands/annotate.md` | Quick-add a note to a section |

### Sub-agents

Each `.md` file in `agents/` defines a sub-agent with YAML frontmatter (`name`, `description`, `model`). Agents are invoked from within skills for parallelizable or specialized work.

| Agent | File | Purpose |
|-------|------|---------|
| `section-builder` | `agents/section-builder.md` | Generates one section of a multi-section canvas (parallelizable in Architect mode) |
| `canvas-validator` | `agents/canvas-validator.md` | Exports canvas to PNG, validates visual quality, reports issues |

### Hooks

Registered in `hooks/hooks.json`. Handler scripts live alongside the JSON config.

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

| Hook | Event | Script | Purpose |
|------|-------|--------|---------|
| Fast check | PostToolUse on Write | `hooks/fast-check.js` | Checks file extension first — bails early if not `.excalidraw`. Then validates: arrow bindings reference existing elements, no duplicate IDs, no elements at identical coordinates. |
| Visual check | PostToolUse on Write (`.excalidraw` files, sessions only) | `hooks/visual-check.js` | Export PNG → read → check: labels readable, no overlaps, arrows correct, colors match palette → self-correction feedback |

The fast check always runs (cheap — JSON parsing only). The visual check runs on canvas session updates (costs a Puppeteer render + image read, skip for quick-draw).

---

## 6. Persistence — The Sidecar

Each canvas session has a `.excalibrain.json` sidecar file alongside the `.excalidraw` file. This is Claude's **snapshot/blueprint** of the canvas — not a live mirror.

### Purpose

- Claude's memory of what's on the canvas and why
- Enables session resume across conversations
- Serves as a rollback blueprint (Claude can regenerate from it)
- Tracks semantic meaning that the `.excalidraw` format can't express

### Structure

```json
{
  "canvas": "platform-architecture.excalidraw",
  "mode": "architect",
  "created": "2026-03-23T10:00:00Z",
  "lastUpdated": "2026-03-23T11:30:00Z",
  "diagramLocation": "docs/diagrams/",
  "sections": [
    {
      "id": "client-layer",
      "label": "Client Layer",
      "mode": "architect",
      "frameId": "frame_cl",
      "boundingBox": { "x": 0, "y": 0, "w": 600, "h": 400 },
      "elementPrefix": "cl_",
      "elementCount": 12,
      "annotations": [
        { "id": "anno_shared_lib", "text": "Shared component library reduces duplication across web and mobile" }
      ],
      "decisions": [
        "React for web, React Native for mobile — shared component library bridges them"
      ]
    }
  ],
  "researchZone": {
    "boundingBox": { "x": 0, "y": -200, "w": 1200, "h": 180 },
    "findings": [
      "Codebase has 3 microservices behind a GraphQL gateway",
      "ML pipeline uses Airflow, separate from main API"
    ]
  },
  "connections": [
    { "from": "client-layer", "to": "api-layer", "label": "GraphQL queries" }
  ]
}
```

### Contract

- **Claude writes to canvas** → updates the sidecar
- **Claude resumes a session** → reads both canvas and sidecar, diffs them
- **Diff found** → asks user what changed, updates sidecar
- **No diff** → continues where left off
- **User wants rollback** → Claude can regenerate from sidecar blueprint

The sidecar is NOT a full time-series — just the last known state.

### Diff mechanism

On resume, `canvas-inspect.js` reads the `.excalidraw` file and produces a summary: element count per type, bounding boxes of groups, element IDs present. Claude compares this against the sidecar:

1. **Element count mismatch** — sidecar says section "client-layer" has 12 elements with prefix `cl_`, but canvas has 14 `cl_`-prefixed elements → "I see 2 new elements in the Client Layer. Did you add something?"
2. **Missing elements** — sidecar references element IDs that don't exist in the canvas → "Some elements from the API Layer seem to have been removed. Should I update my notes?"
3. **New untracked elements** — canvas has elements with no prefix matching any sidecar section → "I see some new elements I don't recognize. Want me to add them to the map?"
4. **Bounding box shift** — a section's elements have moved significantly from their sidecar-recorded positions → noted silently (user rearranged layout, not a problem)

Threshold: only flag changes that affect semantic content (additions, deletions). Ignore coordinate shifts and style tweaks.

### Element prefix convention

Each section on a canvas gets a unique prefix derived from its section ID: lowercase, hyphens replaced with underscores, truncated to 8 chars. Examples: `client-layer` → `cl_`, `api-layer` → `al_`, `ml-pipeline` → `ml_`. The prefix is stored in the sidecar (`elementPrefix` field) and passed to layout tools via `--prefix`. All element IDs generated for that section start with the prefix, enabling grouping and diff detection.

### Canvas size guidance

For Architect mode with many sections, the canvas can grow large. Practical limit: ~500 elements per canvas (beyond this, VS Code rendering slows and the file becomes unwieldy). If a session approaches this, the skill should suggest splitting into linked canvases — a top-level overview that references detailed sub-canvases.

### Failure modes

- **Tool failure mid-session** — the sidecar reflects the last successful write. Claude reports the failure and can retry or skip the section. The canvas is never left in a half-written state because each tool write is atomic (full file write).
- **Sidecar and canvas out of sync (crash)** — on next resume, the diff mechanism catches it. The sidecar may be one step behind; Claude asks the user and updates.
- **Sidecar missing** — Claude reads the canvas directly via `canvas-inspect.js`, reports what it sees, and offers to create a fresh sidecar from the current state. The canvas is still usable; only session metadata is lost.
- **External edits break element IDs** — if a user edits in Excalidraw and somehow duplicates or changes IDs referenced by the sidecar, the diff catches "missing elements." Claude asks rather than assuming.

---

## 7. Freehand — Component Primitive System

### MVP scope: Wireframes + Floor Plans

Wireframes are high-utility for developers. Floor plans are included deliberately — they demonstrate that excalibrain is a general visual intelligence tool, not limited to programming diagrams. This matters for the product identity: "if it can do floor plans, what else can it do?" The implementation cost is low (same primitive system, different shapes) and the signal value is high.

Both powered by a two-layer primitive system.

### Layer 1 — Reference templates (`skill/references/primitives/`)

Documents the anatomy of each primitive: what elements compose it, sizing conventions, styling rules. Claude reads these to understand the visual structure. Useful for edge cases and custom compositions.

### Layer 2 — Primitives tool (`primitives.js`)

Claude calls it with a list of primitive placements. Tool outputs correctly positioned `.excalidraw` elements. Supports `--merge` for adding to existing canvases.

### Wireframe primitives

| Primitive | Parameters | Default size |
|-----------|-----------|-------------|
| `screen` | x, y, size (mobile/desktop/tablet/tablet-landscape), title | 390x780 / 1280x800 / 768x1024 / 1024x768 |
| `button` | x, y, label, variant (primary/secondary/outline) | 120x40 |
| `input` | x, y, placeholder, label | 280x40 |
| `textarea` | x, y, placeholder, label | 280x120 |
| `dropdown` | x, y, label, placeholder | 280x40 |
| `checkbox` | x, y, label, checked | 20x20 + label |
| `toggle` | x, y, label, on | 44x24 + label |
| `nav-bar` | x, y, width, items[] | width x 56 |
| `tab-bar` | x, y, width, items[], active | width x 48 |
| `card` | x, y, width, title, body | width x auto |
| `modal` | x, y, width, height, title | 400x300 |
| `list-item` | x, y, width, title, subtitle, avatar | width x 64 |
| `avatar` | x, y, size | 40x40 |
| `divider` | x, y, width | width x 1 |
| `image-placeholder` | x, y, width, height | 200x150 |

### Floor plan primitives

| Primitive | Parameters | Notes |
|-----------|-----------|-------|
| `room` | x, y, w, h, label | Rectangle + centered label |
| `door` | x, y, wall (n/s/e/w), swing (in/out/left/right) | Gap in wall + arc |
| `window` | x, y, wall, width | Dashed segment on wall |
| `wall` | x1, y1, x2, y2, thickness | Thick line |
| `furniture:bed` | x, y, size (single/double/queen/king) | Predefined rectangle + pillow shape |
| `furniture:desk` | x, y, width | Rectangle + chair circle |
| `furniture:table` | x, y, shape (round/rect), size | Circle or rectangle |
| `furniture:couch` | x, y, seats (2/3/L) | Predefined L or straight shape |
| `furniture:chair` | x, y | Small square + backrest arc |
| `furniture:toilet` | x, y | Oval + tank rectangle |
| `furniture:sink` | x, y | Small rectangle + circle basin |
| `furniture:shower` | x, y, size | Square + grid pattern |
| `furniture:stove` | x, y | Rectangle + 4 circles (burners) |
| `furniture:fridge` | x, y | Rectangle + handle line |
| `dimension` | x1, y1, x2, y2, label | Line + end marks + measurement text |
| `label` | x, y, text, fontSize | Free-floating text |

### Extensibility

New primitive sets can be added later without changing the tool architecture. Each set is:
- A reference template file documenting anatomy and conventions
- Primitive functions registered in `primitives.js`

**Post-MVP candidates (pinned for future):**
- Dashboard components (metric cards, chart placeholders, data tables)
- Presentation slides (title slide, content slide, two-column)
- Freeform canvas compositions (mixed media whiteboard style)
- Infographics, Venn diagrams, annotated screenshots

---

## 8. Tool Inventory

### Existing tools (need extension for canvas sessions)

All four tools work today for Quick Draw. Canvas sessions require these extensions:

| Tool | Current state | Extension needed | Effort estimate |
|------|--------------|------------------|-----------------|
| `dagre-layout.js` | Generates complete `.excalidraw` from graph JSON | `--merge <file>`: read existing canvas, append new elements. `--position x,y`: offset all new elements. `--prefix <str>`: namespace element IDs to avoid collisions. | ~200-250 LOC |
| `mermaid-convert.js` | Generates complete `.excalidraw` from Mermaid syntax | Same `--merge`, `--position`, `--prefix` flags. Additionally: apply offset transform to all elements returned by the Mermaid parser. | ~200-250 LOC |
| `gantt-layout.js` | Generates complete `.excalidraw` from Gantt JSON | Same `--merge`, `--position`, `--prefix` flags. | ~200-250 LOC |
| `export.js` | Exports entire `.excalidraw` to PNG/SVG | `--region <frameId or x,y,w,h>`: export a specific frame by name/ID, or a bounding box region. Uses SVG viewBox clipping or element filtering. | ~60 LOC |
| Graph JSON format | Supports nodes, edges, zones, title | Add `annotations` array: `[{id, text, x, y, fontSize, color, width, anchorTo?}]` for sticky-note style text near elements. | ~30 LOC + docs |

### New tools

| Tool | Purpose | Effort |
|------|---------|--------|
| `canvas-inspect.js` | Read `.excalidraw`, output structured JSON: element count by type, element IDs grouped by prefix, bounding boxes per prefix group, overall canvas bounds, largest free space rectangles. Used standalone for inspection AND by the skill's diff logic (skill compares inspect output against sidecar — the tool reports, the skill reasons). | ~150 LOC |
| `canvas-edit.js` | Update/delete/move specific elements in existing file | ~200 LOC |
| `primitives.js` | Wireframe + floor plan component primitives → `.excalidraw` elements | ~400 LOC |

### Shared resources

| Resource | Location |
|----------|----------|
| Color palette | `skill/references/color-palette.md` |
| Layout rules | `skill/references/layout-rules.md` |
| Diagram type rubric | `skill/references/diagram-type-rubric.md` |
| Patterns | `skill/references/patterns.md` |
| Recipes (8 existing) | `skill/references/diagram-recipes/` |
| Wireframe primitives reference | `skill/references/primitives/wireframe.md` (new) |
| Floor plan primitives reference | `skill/references/primitives/floorplan.md` (new) |
| Themes | `tools/themes/` |

### Theme interaction with sessions

Themes (default, clean, dark, blueprint) apply at the canvas level. A canvas session inherits the theme set at creation and uses it consistently across all sections. Theme cannot change mid-session — this ensures visual coherence across a multi-section canvas.

Quick Draw uses themes as today: `--theme` flag or graph JSON `theme` field, defaulting to the hand-drawn "default" theme.

---

## 9. Hard Challenges — Decisions Made

| Challenge | Decision | Rationale |
|-----------|----------|-----------|
| Dagre relayout disrupts neighbors | Append-only islands — each dagre run is independent, placed at fixed offset, never re-laid-out | Works naturally for the session model where each chunk is a new island |
| VS Code extension doesn't auto-reload | Accept for now — one click to reload | Future: build custom renderer using react + @excalidraw/excalidraw with auto-reload and agent control |
| No semantic layer in .excalidraw format | Sidecar (`.excalibrain.json`) as Claude's snapshot/blueprint | On resume: diff canvas vs sidecar, ask user about discrepancies. Sidecar also serves as rollback blueprint |
| Mermaid is a position black box | Use Mermaid for initial generation, dagre path for incremental additions | Post-generation coordinate adjustment is acceptable for placement |

---

## 10. Implementation Phasing

This design spec defines *what* to build. The implementation plan (to be created via writing-plans skill) will define *how* and *in what order*. The recommended phasing direction:

1. **Convert to plugin structure** — restructure from single skill to plugin with `.claude-plugin/plugin.json`, move skill to `skills/draw/`, verify existing Quick Draw still works
2. **Canvas infrastructure** — `canvas-inspect.js`, `--merge`/`--position`/`--prefix` on dagre-layout.js, sidecar creation
3. **Canvas session skill** — `skills/canvas/SKILL.md`, Explore mode first (simplest interaction pattern)
4. **Hooks** — `fast-check.js` for self-correction on every `.excalidraw` write
5. **Architect and Storyboard modes** — build on canvas infrastructure, add `section-builder` agent
6. **Wireframe mode + primitives** — `primitives.js`, wireframe recipes and reference templates
7. **Floor plan primitives** — extend `primitives.js`, add floor plan recipes
8. **Remaining pieces** — `canvas-edit.js`, `visual-check.js` hook, `export --region`, `add` skill, slash commands

This is a suggested direction, not a contract. The implementation plan will break these into concrete tasks with dependencies.

---

## 11. What's NOT in Scope

- excalibrain does not own the thinking process — Claude arrives with context, excalibrain visualizes it
- excalibrain does not invoke other skills or get invoked by other skills — Claude is always the orchestrator
- No real-time collaboration or multi-user features
- No high-fidelity wireframes — hand-drawn aesthetic is intentional
- No full time-series versioning of the sidecar — just last known state
- Post-MVP freehand types: freeform compositions, infographics, annotated screenshots, Venn diagrams, spatial layouts
