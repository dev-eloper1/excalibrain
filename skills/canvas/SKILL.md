---
name: excalibrain:canvas
description: >
  Start or resume a canvas session — a living Excalidraw workspace that builds
  incrementally. Modes: explore (iterative), architect (comprehensive),
  storyboard (sequential), wireframe (screens). Trigger on: start a canvas,
  architect this, storyboard, wireframe, explore this visually, let's explore,
  continue the diagram, resume the canvas, canvas session.
---

# Canvas Session

A canvas session is a **living Excalidraw workspace** that builds incrementally across multiple conversation turns. Each turn adds a section, annotation, or connection — the diagram grows as understanding deepens.

**CRITICAL: Always merge into the active canvas.** When the user asks for alternative views, additional diagrams, or new sections, use `--merge` to add them to the existing canvas file. NEVER create separate files during a canvas session. The whole point is one living canvas. The only exception is if the user explicitly asks for a separate file.

## Mode Detection

Map user intent to mode:

| Trigger phrases | Mode |
|----------------|------|
| "let's explore...", "explore this visually", "work through...", "start a canvas" | **Explore** |
| "show me the full architecture...", "architect this" | **Architect** |
| "storyboard...", "phases...", "timeline of..." | **Storyboard** |
| "wireframe...", "screen flow...", "mock up..." | **Wireframe** |

If ambiguous, default to **Explore**.

---

## Canvas Location

On session start:

1. **Propose a smart default:**
   - If `docs/` exists in the project: `docs/diagrams/<topic-slug>.excalidraw`
   - Otherwise: `./<topic-slug>.excalidraw` in the current directory
2. **Ask the user to confirm or redirect:** *"I'll create the canvas at `<path>`. Sound good, or want it somewhere else?"*
3. **Create the sidecar** alongside the canvas: `<same-directory>/<same-name>.excalibrain.json`

---

## Reference Files

Read these as needed — they are the ground truth:

| File | When to read |
|------|-------------|
| `references/color-palette.md` | **Before every diagram section** — all hex values live here |
| `references/diagram-type-rubric.md` | **Type selection** — which diagram type for each section |
| `references/patterns.md` | Visual pattern library with examples |
| `references/layout-rules.md` | Layout rules + coordinate templates |
| `references/graph-json-format.md` | Dagre graph JSON input format |
| `references/diagram-recipes/<type>.md` | **Before generating** — complete examples per type |

---

## Explore Mode Workflow

### Session Loop

Repeat for each turn:

#### 1. State what's next

Tell the user what you will draw and why before touching any tool.

*"Next I'll add the authentication flow — it's the entry point users hit first, so it anchors the diagram."*

#### 2. Find free space

Run canvas-inspect to see what is already on the canvas and where free space is:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/canvas-inspect.js <canvas.excalidraw>
```

Parse the output for:
- Existing element bounding boxes
- Available free-space regions with coordinates
- Element count and prefix groups

If this is the first section on a new canvas, start at `0,0`.

#### 3. Generate the diagram section

Choose the appropriate tool based on diagram type (read `references/diagram-type-rubric.md` if unsure), then run it with merge flags:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <input.json> \
  --merge <canvas.excalidraw> \
  --position <x>,<y> \
  --prefix <section_prefix> \
  --output <canvas.excalidraw>
```

Flags:
- `--merge <canvas>` — add to the existing canvas instead of overwriting
- `--position <x>,<y>` — place the section in free space (from step 2)
- `--prefix <str>` — ID namespace for this section. Derive from the section name, max 8 chars. Examples: "auth" -> `auth_`, "data-layer" -> `dl_`, "api-gateway" -> `apigw_`
- `--output <canvas>` — write back to the same canvas file

#### 4. Add annotations

After the tool writes, add local annotations near the diagram section:

1. Read the canvas JSON
2. Add text elements at coordinates near the section (offset 10-20px from the section bounding box edge)
3. Write the canvas back

**Annotation style:**
- Font size: 14px
- Font family: hand-drawn (Virgil) to match Excalidraw default
- Color: `#6b7280` (gray-500)
- Position: just below or beside the relevant section
- Content: short reasoning phrases — "Chose X because Y", "This connects to Z via..."

#### 5. Update sidecar

Write or update the `.excalibrain.json` file with the new section info (see Sidecar Management below).

#### 6. Explain

Brief chat message about what was drawn and why. Keep it to 2-3 sentences. Reference specific nodes or connections if helpful.

#### 7. Check in

Ask the user what to do next:

*"What next? You can:*
- *Continue — I'll add the next logical section*
- *Redirect — tell me what to focus on instead*
- *Zoom in — expand a section in more detail*
- *Redo — I'll redo this section differently*
- *Export — generate a PNG or SVG*
- *Done — wrap up the session"*

---

## Sidecar Management

The `.excalibrain.json` file tracks session state. It lives alongside the `.excalidraw` file.

### Structure

```json
{
  "canvas": "<filename>.excalidraw",
  "mode": "explore",
  "theme": "default",
  "created": "<ISO timestamp>",
  "lastUpdated": "<ISO timestamp>",
  "diagramLocation": "<directory path>",
  "sections": [
    {
      "id": "<section-name>",
      "label": "<Human readable label>",
      "mode": "explore",
      "boundingBox": { "x": 0, "y": 0, "w": 600, "h": 400 },
      "elementPrefix": "<prefix>_",
      "elementCount": 12,
      "annotations": [
        { "id": "anno_1", "text": "Chose Redis because writes are bursty" }
      ],
      "decisions": [
        "Event-driven invalidation over TTL for cache consistency"
      ]
    }
  ],
  "researchZone": {
    "boundingBox": { "x": 0, "y": -200, "w": 1200, "h": 180 },
    "findings": []
  },
  "connections": []
}
```

### Lifecycle

- **Create** on session start with empty `sections` array
- **Update `sections`** after each diagram addition — append the new section with its bounding box, prefix, element count, annotations, and decisions
- **Update `lastUpdated`** on every write
- **Update `connections`** when adding cross-section arrows or links

---

## Session Resume

When the user says "continue the diagram", "resume the canvas", or references an existing `.excalidraw` file:

1. **Read** the `.excalidraw` file
2. **Read** the `.excalibrain.json` sidecar
3. **Run** `canvas-inspect.js` on the canvas
4. **Compare** inspect output against sidecar:
   - Element count per prefix group vs sidecar's `elementCount` per section
   - Any new unprefixed elements = user added something manually
   - Any missing prefixed elements = user deleted something
5. **If discrepancies found:** ask the user what changed — *"I see 3 new elements that weren't in our last session, and 2 elements from the auth section were removed. What happened?"*
6. **Summarize** where we left off — list sections from sidecar with their labels
7. **Ask** what to do next (same check-in options as the session loop)

If no sidecar exists but the `.excalidraw` file does, run inspect and reconstruct a sidecar from what's on the canvas. Ask the user to confirm before proceeding.

---

## Research/Decisions Zone

A dedicated area on the canvas for high-level findings:

- **Location:** above the main diagram area (typically `y < 0`)
- **Default bounding box:** `{ x: 0, y: -200, w: 1200, h: 180 }`
- **Content:** findings from codebase research, conversation context, key decisions
- **Style:** 16px font, color `#374151` (gray-700)
- **Updated** as new information is gathered during the session

---

## Annotations Style

| Property | Value |
|----------|-------|
| Font size | 14px |
| Color | `#6b7280` (gray-500) |
| Position | 10-20px offset from section bounding box edge (below or beside) |
| Format | Short phrases, not paragraphs |
| Purpose | Reasoning notes — "Chose X because Y", "This connects to Z via..." |

---

## Architect Mode Workflow

Architect mode builds a **comprehensive multi-section canvas** in one pass. Use it when the user wants a full system overview rather than iterative exploration.

### 1. Research phase

Read the codebase or context to understand the system:

- Parallelize file reads to gather information quickly
- Write short findings to the research zone on the canvas (whiteboard-style phrases, not paragraphs)
- Identify **3-6 major subsystems or sections** to visualize
- Note key data flows, dependencies, and boundaries between subsystems

### 2. Plan sections

Announce the plan to the user before building:

- List each section with a one-line description
- Show the planned layout grid, e.g.:
  *"4 zones: Client (top-left), API Gateway (top-right), ML Pipeline (bottom-left), Infrastructure (bottom, spanning full width)"*
- Wait for user confirmation or adjustments before proceeding

### 3. Build sections

For each planned section, dispatch the **section-builder** agent:

```
section-builder(
  topic: "<section topic>",
  context: "<relevant code snippets, file summaries>",
  canvas: "<canvas.excalidraw path>",
  position: "<x>,<y>",
  prefix: "<section_prefix>",
  theme: "<session theme>"
)
```

Multiple section-builders can run **in parallel** — they use `--merge` so concurrent writes to the same canvas are safe. Each agent returns section metadata for the sidecar.

**Layout strategy:**

| Parameter | Value |
|-----------|-------|
| Standard section size | ~600w x 400h |
| Gap between sections | 100px |
| Research zone | Above main area, `y < 0` |
| Grid example (4 sections) | TL: `0,0` / TR: `700,0` / BL: `0,500` / BR: `700,500` |
| Grid example (6 sections) | 3 columns x 2 rows, x-step 700, y-step 500 |

### 4. Connect sections

After all section-builders complete:

1. Run `canvas-inspect.js` to see all elements on the canvas
2. Identify **cross-section relationships**: data flows, API calls, dependencies, event channels
3. Add connection arrows between sections using one of:
   - A separate dagre pass with a connections-only graph (nodes reference existing element IDs via prefix)
   - Direct `.excalidraw` JSON edits to add arrow elements between known node positions
4. Style connections:
   - Dashed lines for async/event flows
   - Solid lines for synchronous calls
   - Label each connection with the relationship ("REST API", "publishes events", "reads from")

### 5. Add research zone and annotations

- **Research zone** at top of canvas (`y < 0`) with key findings from step 1
- **Local annotations** near each section explaining the "why" — not what is shown, but why it matters
- **Decision annotations** for key architectural choices (e.g., "Event-driven over polling because writes are bursty")

### 6. Update sidecar

Write the `.excalibrain.json` sidecar with:
- All section metadata returned by section-builders
- Connection list with source/target section IDs and labels
- Research findings array
- Mode set to `"architect"`

### 7. Present to user

- Export to PNG using `export.js`
- Show the full architecture diagram
- Summarize what was built: number of sections, key connections, main insight
- Ask for feedback: *"Want me to zoom into any section, add more connections, or adjust the layout?"*

---

## Storyboard Mode Workflow

For visual narratives that show **how a system evolves** — migrations, build plans, phased rollouts, before/after transformations.

**Core principle: A storyboard shows state snapshots, not process diagrams.** Each frame is "what the system looks like at this phase" — NOT a flowchart of what you do during that phase. The story emerges from seeing what changed between frames.

### 1. Identify the narrative

From user intent, determine:
- **What is the protagonist?** (the system, the product, the user experience)
- **What are the phases?** (typically 3-5: current state → transitions → target state)
- **What changes between phases?** (this is the story — not what stays the same)

### 2. Announce plan

Tell the user the frames and what changes in each:

*"I'll build a 3-panel storyboard showing the migration:*
- *Panel 1: Current State — monolith with all services coupled*
- *Panel 2: Phase 1 — auth service extracted, shared DB remains*
- *Panel 3: Target — full microservices, each with own DB*
*The story will show what changes in each phase. Sound good?"*

### 3. Define the component inventory

Before drawing any panel, list ALL components that appear across ALL phases. This is critical — the same components must appear in the same position across panels so the viewer can spot what changed.

Example inventory:
```
Components: API, Auth, DB, Cache, Gateway, Users Service
Phase 1: API ✓, Auth ✓ (coupled), DB ✓, Cache ✗, Gateway ✗, Users ✗
Phase 2: API ✓, Auth ✓ (extracted), DB ✓, Cache ✓ (new), Gateway ✗, Users ✗
Phase 3: API ✓, Auth ✓, DB ✓ (split), Cache ✓, Gateway ✓ (new), Users ✓ (new)
```

### 4. Build panels with visual diff

For each panel, generate a dagre graph JSON with the SAME nodes but different colors:

**Color coding for change:**

| Status | Fill | Stroke | strokeStyle |
|--------|------|--------|-------------|
| Unchanged (exists, no change) | `#f1f5f9` (gray-100) | `#94a3b8` (gray-400) | solid |
| New in this phase | `#dcfce7` (green-100) | `#16a34a` (green-600) | solid |
| Modified in this phase | `#fef3c7` (amber-100) | `#d97706` (amber-600) | solid |
| Being removed | `#fecaca` (red-100) | `#dc2626` (red-600) | dashed |
| Already removed (gone) | omit from this panel | | |

Place panels left-to-right:
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <panel_N.json> \
  --merge <canvas.excalidraw> \
  --position <x>,80 \
  --prefix ph<N>_ \
  --output <canvas.excalidraw>
```

Position: `x = panel_index * (panel_width + 120)`, `y = 80` (leave room for title bar)

### 5. Add the narrative spine

A horizontal timeline arrow across the top of all panels:
- Runs from left edge of panel 1 to right edge of last panel
- Y position: 30 (above the panels)
- Style: bold stroke (2px), solid
- Milestone dots at each panel's center x-position

Panel titles above each panel:
- Font: 20px, color `#111827`, bold
- Position: centered above panel, y = 50
- Format: "CURRENT STATE", "PHASE 1: Extract Auth", "TARGET STATE"

### 6. Add narrative captions

Below each panel, add a **narrative layer** — not just a label, but the story:

**What changed** (required):
- Position: centered below panel, 20px gap
- Font: 14px, color `#374151`
- Content: "Extract auth into standalone service. Shared DB remains for now."

**Why** (required):
- Position: below "what changed"
- Font: 13px, color `#6b7280`
- Content: "Reduces deployment coupling — auth can ship independently."

**Risks / Metrics** (optional):
- Position: below "why"
- Font: 12px, color `#9ca3af`
- Content: "Risk: dual-write during migration. Deploy time: 4h → 1h"

### 7. Add progression arrows between panels

Between panels:
- Large dashed arrow from right edge of panel N to left edge of panel N+1
- Y position: vertical center of panels
- Label: what carries forward ("Auth API ready", "Data migrated")
- Color: `#6366f1` (indigo — distinct from the diagram arrows within panels)

### 8. Update sidecar and present

- Each panel is a sidecar section with `mode: "storyboard"`
- Export to PNG
- Summarize the narrative arc: *"The storyboard shows a 3-phase migration. Key changes are highlighted green (new) and yellow (modified). The auth service is extracted first, then the database is split."*
- Ask: *"Want to add detail to any panel, adjust the phases, or zoom into a specific transition?"*

**Layout specifics:**

| Parameter | Value |
|-----------|-------|
| Panel width | 500px (or content-dependent) |
| Panel min height | 400px |
| Gap between panels | 120px |
| Timeline y-position | 30px (above panels) |
| Title y-position | 50px |
| Panels y-position | 80px |
| Narrative caption gap | 20px below panel bottom |
| Progression arrows | y-center of panels, dashed, indigo (#6366f1) |

**What NOT to do:**
- Do NOT make each panel a flowchart/process diagram — each panel is a state snapshot
- Do NOT use different layouts across panels — same component positions for visual diff
- Do NOT omit the narrative captions — without "what changed" and "why", it's just diagrams in a row

---

## Compare Operation

Compare is a **visual operation**, not a mode. It can be used in any session or as a standalone Quick Draw.

**Triggered by:** "compare X vs Y", "show options side by side", "what are the trade-offs"

### 1. Identify options

Extract 2-4 approaches from conversation context. Each option becomes a column.

### 2. Layout columns

Each option gets a column:

- Column width: 400px, gap: 80px
- Position: `x = col_index * (400 + 80)`, `y = 0`

### 3. Build each column

Use dagre with `--merge --position --prefix`:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <option_input.json> \
  --merge <canvas.excalidraw> \
  --position <x>,0 \
  --prefix opt<N>_ \
  --output <canvas.excalidraw>
```

- Prefix: `opt1_`, `opt2_`, etc.
- Each column is a small architecture/flowchart diagram
- Title above each: the option name (18px, bold-colored)

### 4. Add trade-off annotations

Below each column, add pros and cons:

- Pros in green (`#16a34a`), cons in red (`#dc2626`)
- Short bullet points, free text elements
- Position: below the column, 20px gap

### 5. Optional summary row

At the bottom, spanning all columns:

- A horizontal zone highlighting the key differentiator
- Or a recommendation annotation: *"Recommended: Option B because..."*
- Position: below all columns + annotations, full width

### 6. Works standalone or mid-session

- **Within a canvas session:** merge onto existing canvas at the next available position (use `canvas-inspect.js` to find free space)
- **Standalone:** create a new `.excalidraw` file and sidecar

---

## Wireframe Mode Workflow

For screen flows — login forms, onboarding, settings pages. Uses `primitives.js` to generate hand-drawn UI components.

### 1. Determine screens

From user intent, identify the screens in the flow (typically 2-5). Each screen represents a distinct view.

### 2. Announce plan

Tell the user the screens you'll build:

*"I'll wireframe a 3-screen flow: Login, Dashboard, Settings. Sound good?"*

### 3. Build screens left-to-right

For each screen:

- Create a primitives JSON with `screen` frame + UI elements (buttons, inputs, cards, etc.)
- Position screens left-to-right: `x = screen_index * (screen_width + 120)`
- Run `primitives.js` with merge flags

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/primitives.js <screen_input.json> \
  --merge <canvas.excalidraw> \
  --position <x>,0 \
  --output <canvas.excalidraw>
```

**Primitives JSON format:**
```json
{
  "primitives": [
    { "type": "screen", "x": 0, "y": 0, "size": "mobile", "title": "Login" },
    { "type": "input", "x": 30, "y": 100, "placeholder": "Email", "label": "Email" },
    { "type": "button", "x": 30, "y": 200, "label": "Sign In", "variant": "primary" }
  ]
}
```

Available primitive types: `screen`, `button`, `input`, `textarea`, `card`, `nav-bar`, `modal`, `divider`, `image-placeholder`, `avatar`, `list-item`.

Read `references/primitives/wireframe.md` for sizing, variants, and styling details.

### 4. Add navigation arrows

Between screens, add horizontal arrows showing the user flow:

- Use dagre-layout with a simple 2-node graph, or add arrow elements directly
- Y position: vertical center of the screens
- Style: dashed, labeled with the action ("Tap Sign In", "Swipe", etc.)

### 5. Update sidecar

Each screen is a section in the sidecar. Set mode to `"wireframe"`.

### 6. Present

- Export to PNG using `export.js`
- Show the wireframe flow
- Summarize what was built
- Ask for feedback: *"Want to adjust any screen, add more components, or change the flow?"*

**Layout specifics:**

| Parameter | Value |
|-----------|-------|
| Mobile screen | 390×780 |
| Desktop screen | 1280×800 |
| Tablet screen | 768×1024 |
| Gap between screens | 120px |
| Navigation arrows | y-center, dashed, labeled with user action |

---

## Available Tools

All tools live at `${CLAUDE_PLUGIN_ROOT}/tools/`. CLI signatures:

| Tool | Command |
|------|---------|
| Canvas inspect | `canvas-inspect.js <file>` |
| Dagre layout | `dagre-layout.js <input.json> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Mermaid convert | `mermaid-convert.js <input.mmd> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Gantt layout | `gantt-layout.js <input.json> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Wireframe primitives | `primitives.js <input.json> [--merge file] [--position x,y] [--output file]` |
| Export | `export.js <file.excalidraw> --format png\|svg --output <file>` |

---

## Cross-cutting Behaviors

### Pick the right diagram type PER SECTION

**This is the most important cross-cutting rule.** Do NOT default everything to flowcharts. Before drawing any section, ask: what is the best visual argument for THIS content?

| Content is about... | Use this type | Tool |
|---------------------|--------------|------|
| Components and their relationships | **Architecture** (zones, layers, connections) | dagre |
| A process with decisions/branching | **Flowchart** (diamonds, conditionals) | dagre |
| How requests flow between services over time | **Sequence diagram** (participants, messages) | mermaid |
| Lifecycle states and transitions | **State diagram** (states, events, transitions) | dagre |
| Concept hierarchy or exploration | **Mindmap** (radial, parent-child) | dagre |
| Data model relationships | **ER diagram** (entities, foreign keys) | mermaid |
| Time-bound tasks | **Gantt chart** (timeline, bars) | gantt |
| System evolution over phases | **Storyboard** (state panels with visual diff) | dagre |

**A single canvas should mix diagram types freely.** An architecture document might have a system overview (architecture), a request flow (sequence), a session lifecycle (state diagram), and a build process (flowchart) — all on the same canvas, each chosen because it's the right visual argument for that piece.

**The table above covers common cases, not all cases.** If the content doesn't fit any predefined type, use freeform — write `.excalidraw` JSON directly with positioned rectangles, text, arrows, and shapes. The Excalidraw format supports any 2D visual: comparison tables, annotated screenshots, Venn diagrams, custom layouts, whatever best argues the point. The predefined types handle 80% of cases with good layout; freeform handles the rest.

Read `references/diagram-type-rubric.md` for the full decision table.

### Connect sections to each other

Sections on the same canvas are NOT islands. After building multiple sections, add **inter-section connection arrows** showing:
- Data flow between components in different sections
- "Zoom in" relationships (overview section → detail section)
- Sequence/dependency ordering
- Shared resources or dependencies

Use distinct arrow styles for inter-section arrows (dashed, different color like `#6366f1` indigo) to distinguish them from intra-section arrows.

### Other behaviors

- **Announce before drawing** — always state what you will draw and which diagram type before running any tool
- **User controls the session** — they can continue, redirect, zoom in, redo a section, export, or end at any time
- **Mode switching** — "zoom into this" shifts to more granular exploration of a specific section; "zoom out" returns to the broader view
- **Theme consistency** — set theme at session start (`default`, `clean`, `dark`, `blueprint`), use it for all sections throughout the session
- **Canvas size limit** — around 500 elements. If approaching this limit, suggest splitting into multiple canvases and mention which sections could be extracted
- **Prefix discipline** — every element added by a tool gets the section prefix. This enables per-section tracking, redo, and deletion
- **Clean temp files** — delete any temporary `.json` or `.mmd` input files created for tools after the tool finishes
