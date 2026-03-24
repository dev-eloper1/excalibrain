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

## Mode Detection

Map user intent to mode:

| Trigger phrases | Mode |
|----------------|------|
| "let's explore...", "explore this visually", "work through...", "start a canvas" | **Explore** |
| "show me the full architecture...", "architect this" | **Architect** |
| "storyboard...", "phases...", "timeline of..." | Storyboard (coming soon) |
| "wireframe...", "screen flow...", "mock up..." | Wireframe (coming soon) |

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

## Storyboard / Wireframe

These modes are coming soon. For now, use **Explore mode** for iterative building or **Architect mode** for comprehensive system diagrams.

---

## Available Tools

All tools live at `${CLAUDE_PLUGIN_ROOT}/tools/`. CLI signatures:

| Tool | Command |
|------|---------|
| Canvas inspect | `canvas-inspect.js <file>` |
| Dagre layout | `dagre-layout.js <input.json> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Mermaid convert | `mermaid-convert.js <input.mmd> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Gantt layout | `gantt-layout.js <input.json> [--merge file] [--position x,y] [--prefix str] [--theme name] [--output file]` |
| Export | `export.js <file.excalidraw> --format png\|svg --output <file>` |

---

## Cross-cutting Behaviors

- **Announce before drawing** — always state what you will draw before running any tool
- **User controls the session** — they can continue, redirect, zoom in, redo a section, export, or end at any time
- **Mode switching** — "zoom into this" shifts to more granular exploration of a specific section; "zoom out" returns to the broader view
- **Theme consistency** — set theme at session start (`default`, `clean`, `dark`, `blueprint`), use it for all sections throughout the session
- **Canvas size limit** — around 500 elements. If approaching this limit, suggest splitting into multiple canvases and mention which sections could be extracted
- **Prefix discipline** — every element added by a tool gets the section prefix. This enables per-section tracking, redo, and deletion
- **Clean temp files** — delete any temporary `.json` or `.mmd` input files created for tools after the tool finishes
