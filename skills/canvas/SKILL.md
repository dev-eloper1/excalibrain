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

#### 6.5. Composition pass (when 3+ sections exist)

After the third section is placed (and on every subsequent section), add canvas-level composition. Strip any existing `comp_` prefixed elements first, then regenerate.

**Philosophy:** Only add elements that are either truly bound to frames (arrows) or explicitly independent (floating notes). Never add static grouping elements (bands, cards, dividers) that imply dynamic relationships they can't deliver — they break when frames move.

**a) Frames:**

Wrap each section in a named Excalidraw frame element:

```json
{
  "type": "frame",
  "name": "① Section Name",
  "x": bbox.x - 40,
  "y": bbox.y - 40,
  "width": bbox.w + 80,
  "height": bbox.h + 80
}
```

- 40px padding around section content
- Numbered names (①②③...) matching reading order
- All section elements get `frameId` pointing to their containing frame
- Frames enable navigation in Excalidraw's UI

**b) Spine arrows (bound to frames):**

Connect frames in reading order using `library-resolve.js`'s `spineArrow` component:

```bash
node /Users/bhushan/Documents/excalibrain/tools/library-resolve.js spine-arrow \
  --fromX <frame_right> --fromY <frame_cy> \
  --toX <next_frame_left> --toY <next_frame_cy> \
  --label "transition text" \
  --fromId <frame_id> --toId <next_frame_id>
```

Rules:
- Arrows use `startBinding`/`endBinding` to bind to frames — they move when frames move
- Arrow + label are grouped via `groupIds` — they move as one unit
- Only curve when there's a directional change (diagonal paths). Straight for vertical/horizontal.
- Curves use perpendicular bulge: control points pushed sideways off the straight-line path
- Transition labels are 20px Virgil in deep indigo (#4f46e5) — they guide the reading flow and should be the most prominent text after section titles
- Start/end arrows at frame edges, not centers

**c) Margin notes (post-it style):**

Add contextual annotations in the gaps between frames using `library-resolve.js`'s `postit` component:

```bash
node /Users/bhushan/Documents/excalibrain/tools/library-resolve.js postit \
  --text "reasoning or insight" --x <gap_x> --y <gap_y>
```

Rules:
- Cascadia monospace font (fontFamily 3), 13px — distinct from Virgil diagram content
- Yellow background (#fef9c3) with amber stroke (#e5be47), roughness 1
- Background + text grouped via `groupIds` — they move as one
- Placed OUTSIDE frames (frameId: null) — they're marginalia, not content
- Check for collisions with arrows and other notes before placing
- Content: reasoning phrases, key decisions, insights — not descriptions of what's shown

**d) Canvas title:**

Add a title above all frames using `library-resolve.js`'s `canvasTitle` component:

```bash
node /Users/bhushan/Documents/excalibrain/tools/library-resolve.js canvas-title \
  --title "CANVAS NAME" --subtitle "description" --x 30 --y -80
```

- 32px Helvetica title, 15px Virgil subtitle, grouped
- Placed above and outside all frames

**e) Layout algorithm (flexbox-inspired):**

When positioning sections, use CSS flexbox mental model:

```
Canvas width = max section width (set by widest section)

For paired rows (2 sections side by side):
  - justify-content: space-evenly
  - total_space = canvas_width - section1_width - section2_width
  - gap = total_space / 3  (equal space left, middle, right)
  - Vertically center shorter section within row height

For single-section rows (bookends):
  - Full width or centered

Row gaps: 300px minimum (infinite canvas — let arrows breathe)
```

**f) What NOT to add:**

- No phase bands / background rectangles (they don't move with frames)
- No cards / header bars around sections (visual noise)
- No styled pills for transition labels (over-designed)
- No static divider lines (imply structure they can't deliver)
- No badge-banners (plain frame names are sufficient)

**g) Visual hierarchy (font stack):**

| Role | Font | Size | Color |
|------|------|------|-------|
| Spine arrow labels | Virgil (1) | 20px | #4f46e5 (deep indigo) |
| Diagram content | Virgil (1) | 14-16px | varies |
| Post-it notes | Cascadia (3) | 13px | #1e293b on #fef9c3 |
| Canvas title | Helvetica (2) | 32px | #0f172a |
| Canvas subtitle | Virgil (1) | 15px | #94a3b8 |

**When NOT to run this pass:**
- Fewer than 3 sections on the canvas
- The user explicitly asks to skip composition
- The canvas is in architect, storyboard, wireframe, or compare mode (those have their own composition strategies)

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

**CRITICAL: Use the two-phase build to avoid overlapping sections.** Section sizes vary wildly (a simple dagre graph might be 400×300, a mermaid sequence diagram might be 4000×1900). Never guess positions — measure first.

**Phase 1 — Measure (parallel):**

Build each section into a **temporary standalone file** to discover its actual size:

```bash
# All sections build in parallel — no --merge, standalone output
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <input.json> \
  --prefix <section_prefix> \
  --output /tmp/<prefix>-sizing.excalidraw
```

Then inspect each temp file to get its actual bounding box:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/canvas-inspect.js /tmp/<prefix>-sizing.excalidraw --summary
```

Parse the bounding box `w` and `h` from the inspect output for each section.

**Phase 2 — Compute positions:**

With actual sizes known, compute a non-overlapping grid:

```
gap = 150  # generous gap between sections
columns = 2 or 3  # based on section count and total width budget

For each row:
  row_x = 0
  row_h = 0
  For each section assigned to this row:
    section.position = (row_x, current_y)
    row_x += section.actual_width + gap
    row_h = max(row_h, section.actual_height)
  current_y += row_h + gap
```

Group sections thematically when possible (e.g., structure views in row 1, behavior views in row 2, resilience views in row 3).

**Phase 3 — Assemble (parallel):**

Rebuild each section into the final canvas with correct positions:

```bash
# Section 1 creates the canvas (no --merge)
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <input_1.json> \
  --position <computed_x>,<computed_y> \
  --prefix <prefix> \
  --output <canvas.excalidraw>

# Sections 2-N merge into the canvas (parallel — safe with --merge)
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <input_N.json> \
  --merge <canvas.excalidraw> \
  --position <computed_x>,<computed_y> \
  --prefix <prefix> \
  --output <canvas.excalidraw>
```

**Layout parameters:**

| Parameter | Value |
|-----------|-------|
| Gap between sections | 150px (generous — prevents visual crowding) |
| Research zone | Above main area, `y < 0` |
| Max columns | 3 (keeps canvas readable without excessive horizontal scrolling) |
| Row assignment | Thematic grouping preferred; otherwise largest sections get their own row |

### 4. Validate — no overlaps

After all sections are merged, **check for overlapping bounding boxes** before proceeding:

1. Run `canvas-inspect.js --summary` on the canvas
2. Extract each prefix group's `bbox` from the output
3. For every pair of sections, check if their bounding boxes overlap:
   ```
   overlap = not (A.x + A.w + 50 < B.x  or  B.x + B.w + 50 < A.x  or
                  A.y + A.h + 50 < B.y  or  B.y + B.h + 50 < A.y)
   ```
   (50px minimum clearance between any two sections)
4. **If overlaps are found:** report which sections overlap, delete the canvas, recompute positions with larger gaps, and rebuild. Do NOT present an overlapping canvas to the user.
5. **If no overlaps:** proceed to connecting sections.

This validation is mandatory. Overlapping sections produce unreadable diagrams — it is always better to spend 30 seconds rebuilding than to show the user a mess.

### 5. Connect sections

After all section-builders complete and overlap validation passes:

1. Run `canvas-inspect.js` to see all elements on the canvas
2. Identify **cross-section relationships**: data flows, API calls, dependencies, event channels
3. Add connection arrows between sections using one of:
   - A separate dagre pass with a connections-only graph (nodes reference existing element IDs via prefix)
   - Direct `.excalidraw` JSON edits to add arrow elements between known node positions
4. Style connections:
   - Dashed lines for async/event flows
   - Solid lines for synchronous calls
   - Label each connection with the relationship ("REST API", "publishes events", "reads from")

### 6. Add research zone and annotations

- **Research zone** at top of canvas (`y < 0`) with key findings from step 1
- **Local annotations** near each section explaining the "why" — not what is shown, but why it matters
- **Decision annotations** for key architectural choices (e.g., "Event-driven over polling because writes are bursty")

### 7. Update sidecar

Write the `.excalibrain.json` sidecar with:
- All section metadata returned by section-builders
- Connection list with source/target section IDs and labels
- Research findings array
- Mode set to `"architect"`

### 8. Present to user

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
| Canvas edit | `canvas-edit.js <file> strip-prefix <prefix>` (also: update, delete, move) |
| Dagre layout | `dagre-layout.js <input.json> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Mermaid convert | `mermaid-convert.js <input.mmd> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Gantt layout | `gantt-layout.js <input.json> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Wireframe primitives | `primitives.js <input.json> [--merge file] [--position x,y] [--output file]` |
| Library resolve | `library-resolve.js <input.json> [--merge file] [--output file]` |
| Export | `export.js <file.excalidraw> --format png\|svg --output <file>` |

---

## Cross-cutting Behaviors

### Visual hierarchy within every section

**Every section must have visual hierarchy.** Without it, all elements compete for attention equally and the diagram becomes a flat, undifferentiated wall of shapes. The reader's eye has no entry point and no path to follow.

**Three levers for hierarchy:**

| Lever | Primary elements | Secondary elements |
|-------|-----------------|-------------------|
| **Stroke width** | 2.5–3px for hubs, gateways, critical path | 1–1.5px for async workers, background services |
| **Node size** | Larger (220×120) for central/important nodes | Smaller (160×70) for peripheral/failure nodes |
| **Fill style** | `solid` with vivid colors for active components | `dots` or `hachure` for async, storage, or background |

**Arrow weight differentiates flow importance:**

| Flow type | Width | Style |
|-----------|-------|-------|
| Critical path / happy path | 2.5px | solid |
| Standard data flow | 2px | solid |
| Async / event / background | 1px | dashed |
| Error / failure path | 1px | dashed, red stroke |
| Internal / check | 1px | dotted |

**Zone grouping creates visual structure:**
- Group related elements in zones to create "reading regions"
- For state machines: separate happy path from failure/recovery states into distinct zones
- For architectures: zones by trust level, layer, or phase (already common but enforce it)

**Font size hierarchy:**

| Element role | Font size |
|-------------|-----------|
| Hub/central node label | 16px |
| Primary service label | 14px |
| Secondary/async label | 12–13px |
| Edge labels | 12–13px (from layout rules) |

**Rule of thumb:** If you squint at the exported PNG and can't immediately tell which 2-3 elements are the most important, the section lacks hierarchy. The gateway, the hub, the start/end states — these should jump out visually.

### Default to TB (top-to-bottom) direction

**Use `"direction": "TB"` for all dagre diagrams unless there is a specific reason not to.** Top-to-bottom is the natural reading direction — the eye scans down, cause leads to effect, general leads to specific.

| Direction | When to use |
|-----------|------------|
| **TB** (default) | Architecture, flowcharts, state machines, security layers — almost everything |
| **LR** | Mind maps (radial tree), timelines, left-to-right process chains where horizontal flow is the point |

**Cyclic graphs (state machines with recovery edges):**

Dagre cannot lay out cyclic graphs well. Back-edges (e.g., `suspended→unverified`) cause rank inversions that scramble node order and produce overlapping orthogonal arrows.

Fix:
1. **Remove cycle-causing back-edges from the dagre input.** Only include forward edges (the acyclic happy path + failure exits).
2. **Add back-edge information as annotations** below the failure states using the `annotations` field.
3. **Use zones** to visually separate the happy path from failure/recovery states.

### Section replacement (update without full rebuild)

When redoing 1-2 sections on an existing canvas, **do NOT rebuild the entire canvas**. Use the strip-and-merge pattern:

```bash
# 1. Strip the old section by prefix
node ${CLAUDE_PLUGIN_ROOT}/tools/canvas-edit.js <canvas.excalidraw> strip-prefix <prefix>

# 2. Build new version to temp file, measure actual size
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <new_input.json> \
  --prefix <prefix> --output /tmp/<prefix>-sizing.excalidraw
node ${CLAUDE_PLUGIN_ROOT}/tools/canvas-inspect.js /tmp/<prefix>-sizing.excalidraw --summary

# 3. Check if new size fits in the old position
#    If yes: merge at the same position
#    If larger: inspect canvas for free space, pick new position

# 4. Merge new section into the stripped canvas
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <new_input.json> \
  --merge <canvas.excalidraw> \
  --position <x>,<y> \
  --prefix <prefix> \
  --output <canvas.excalidraw>
```

This preserves all other sections untouched and only rebuilds the changed section.

**Prefix collision warning:** Mermaid generates random element IDs prefixed with the section prefix. If two sections have similar prefixes (e.g., `er` and `err`), `strip-prefix err` may accidentally remove elements from the `er` section. Use distinctive prefixes that don't share a common start (e.g., `erdiag` and `errfl`).

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

**The table above covers common cases, not all cases.** The predefined types handle 80% of situations with proven layout strategies. For the other 20%, don't default to manual coordinate placement — **compose a layout strategy from the tools you have:**

**Think in building blocks, not coordinates:**
- **Topology/relationships?** → Model it as a graph, let dagre auto-layout. Works for trip routes, network diagrams, org charts, dependency trees — anything with nodes and connections.
- **Spatial/grid layout?** → Use primitives.js with calculated grid positions (`x = col * width + gap`, `y = row * height + gap`). Works for floor plans, seating charts, comparison tables, kanban boards.
- **Timeline/sequence?** → Use gantt-layout.js for time-based content, or mermaid for participant-based sequences.
- **Hybrid?** → Combine tools. A campus map could use dagre for building relationships + primitives for building interiors. A project plan could use gantt for the timeline + dagre for the dependency graph.

**When no recipe exists:** Don't try to manually calculate 50 x,y coordinates. Instead:
1. Identify the spatial structure (graph? grid? timeline? radial?)
2. Pick the tool that handles that structure (dagre? primitives? gantt?)
3. If none fits, break the problem into pieces that DO fit and merge them onto one canvas
4. Only fall back to raw `.excalidraw` JSON for truly custom layouts where no tool helps

The visual intelligence is in choosing the right strategy, not in having a pre-built recipe for every possible diagram.

Read `references/diagram-type-rubric.md` for the full decision table.

### Connect sections to each other

Sections on the same canvas are NOT islands. After building multiple sections, add **inter-section connection arrows** showing:
- Data flow between components in different sections
- "Zoom in" relationships (overview section → detail section)
- Sequence/dependency ordering
- Shared resources or dependencies

Use distinct arrow styles for inter-section arrows (dashed, different color like `#6366f1` indigo) to distinguish them from intra-section arrows.

### When to use multiple diagram types (proactive, not user-triggered)

**You decide this — the user shouldn't have to ask.** When planning what to draw, assess whether the subject has multiple facets that need different visual arguments:

| Subject facet | Best diagram type |
|---|---|
| What components exist and how they connect | Architecture |
| How a request flows between components over time | Sequence |
| What states something can be in and how it transitions | State diagram |
| What data is stored and how entities relate | ER diagram |
| What steps a process follows with decisions | Flowchart |
| What the concept hierarchy looks like | Mindmap |

**If the subject has 2+ facets → plan multiple sections with different types.** Announce this:

*"This system has three aspects worth visualizing: the service architecture (how components connect), the auth flow (how a request moves through them over time), and the session lifecycle (what states a session can be in). I'll build all three on one canvas with zoom arrows connecting them."*

**If the subject has only one facet → single diagram is fine.** Don't force multi-type when one diagram tells the whole story.

This applies in ALL modes — Explore, Architect, Storyboard. The mode determines the interaction pattern (iterative vs. comprehensive vs. sequential), but multi-type selection happens within any mode.

### Parallel section generation

When a canvas needs multiple sections (3+), use the **two-phase build** pattern to avoid overlapping sections.

**NEVER guess section sizes.** Diagram tools produce wildly different output sizes depending on node count, label length, edge complexity, and diagram type. A simple 4-node dagre graph might be 400×300px. A mermaid sequence diagram with 11 participants and 30 messages might be 4000×1900px. Hardcoded grids (e.g., "x-step 700, y-step 500") will produce overlapping sections.

**Orchestration pattern:**

1. **Plan the canvas** — determine all sections, their diagram types, and prefixes
2. **Phase 1 — Measure (parallel):** dispatch section-builder agents to build each section into a **temporary standalone file** (no `--merge`, just `--output /tmp/<prefix>-sizing.excalidraw`). Each agent returns the section's actual bounding box dimensions.
3. **Compute positions** — with real sizes known, calculate a non-overlapping grid layout. Use 150px gaps. Group sections thematically into rows (structure, behavior, resilience, etc.).
4. **Phase 2 — Assemble (parallel):** rebuild each section into the final canvas with computed positions (`--merge --position <x>,<y>`). Section 1 creates the file (no `--merge`), sections 2-N merge in parallel.
5. **Validate** — run `canvas-inspect.js --summary`, check all prefix group bounding boxes for overlaps. If any overlap, recompute positions and rebuild.
6. **Add inter-section connections** — the master process reads the completed canvas, adds arrows between sections showing relationships, data flow, and zoom connections. Use dashed indigo (`#6366f1`) arrows with labels.
7. **Add overview annotations** — title, legend, narrative context

**Multi-zoom pattern (overview + detail):**

For complex systems, build at multiple zoom levels on the same canvas:

1. **Overview section** (top of canvas) — high-level system diagram showing major components as single nodes. Use architecture type.
2. **Detail sections** (below, side by side) — each major component expanded into its own diagram at the appropriate type:
   - API Gateway → **sequence diagram** showing request routing
   - Auth Service → **state diagram** showing session lifecycle
   - Data Pipeline → **flowchart** showing processing steps
   - Database → **ER diagram** showing schema
3. **Zoom arrows** — dashed arrows from overview nodes to their corresponding detail sections, labeled "detail below" or "zoom in"

This creates a visual document you can read at two levels: the overview for the big picture, the details for depth. Each detail section uses the diagram type that best argues its content.

**When to parallelize:**
- 3+ independent sections → always parallelize with section-builder agents
- 2 sections → sequential is fine, less overhead
- Sections that depend on each other (e.g., detail depends on overview layout) → build overview first, then parallelize details

### Other behaviors

- **Announce before drawing** — always state what you will draw and which diagram type before running any tool
- **User controls the session** — they can continue, redirect, zoom in, redo a section, export, or end at any time
- **Mode switching** — "zoom into this" shifts to more granular exploration of a specific section; "zoom out" returns to the broader view
- **Theme consistency** — set theme at session start (`default`, `clean`, `dark`, `blueprint`), use it for all sections throughout the session
- **Canvas size limit** — around 500 elements. If approaching this limit, suggest splitting into multiple canvases and mention which sections could be extracted
- **Prefix discipline** — every element added by a tool gets the section prefix. This enables per-section tracking, redo, and deletion
- **Clean temp files** — delete any temporary `.json` or `.mmd` input files created for tools after the tool finishes
