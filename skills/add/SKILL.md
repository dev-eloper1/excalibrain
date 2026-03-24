---
name: excalibrain:add
description: >
  Add a diagram, section, or annotation to an existing Excalidraw canvas.
  Trigger on: add to the canvas, add a section for, add to the diagram,
  put this on the canvas, annotate.
---

# Add to Canvas

Add a new diagram section, annotation, or element to an existing Excalidraw canvas.

## Workflow

### 1. Find the active canvas

- If the user specifies a file, use that.
- Otherwise, find the most recent `.excalibrain.json` sidecar in the project and read its `canvas` field.
- If no sidecar exists, look for the most recently modified `.excalidraw` file in the current directory or `docs/diagrams/`.
- If nothing is found, ask the user which canvas to modify.

### 2. Inspect the canvas

Run canvas-inspect to understand what is already on the canvas and find free space:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/canvas-inspect.js <canvas.excalidraw>
```

Parse the output for:
- Existing element bounding boxes and prefix groups
- Available free-space regions with coordinates
- Element count

### 3. Determine what to add

| User intent | Action |
|------------|--------|
| "add a section for X" | Generate a new diagram section via dagre/mermaid |
| "annotate X with Y" | Add a text annotation near section X |
| "add a note about X" | Add a text annotation near section X |
| "connect X to Y" | Add an arrow between existing sections |
| "add a label/title" | Add a text element |

### 4a. Adding a diagram section

1. Read `references/diagram-type-rubric.md` to choose the right diagram type for the new section.
2. Read `references/color-palette.md` and the appropriate recipe from `references/diagram-recipes/`.
3. Generate the graph JSON or Mermaid input for the new section.
4. Choose a prefix derived from the section name (max 8 chars, e.g., "auth" -> `auth_`, "data-layer" -> `dl_`).
5. Pick a position from the free-space regions identified in step 2.
6. Run with merge flags:

**Dagre path:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/dagre-layout.js <input.json> \
  --merge <canvas.excalidraw> \
  --position <x>,<y> \
  --prefix <section_prefix> \
  --output <canvas.excalidraw>
```

**Mermaid path:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/mermaid-convert.js <input.mmd> \
  --merge <canvas.excalidraw> \
  --position <x>,<y> \
  --prefix <section_prefix> \
  --output <canvas.excalidraw>
```

**Gantt path:**
```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/gantt-layout.js <input.json> \
  --merge <canvas.excalidraw> \
  --position <x>,<y> \
  --prefix <section_prefix> \
  --output <canvas.excalidraw>
```

### 4b. Adding an annotation

1. Read the canvas `.excalidraw` JSON.
2. Find the target section by matching the section name against element labels or prefix groups from canvas-inspect output.
3. Calculate annotation position: offset 10-20px from the section bounding box edge (prefer below or to the right).
4. Create a text element:
   - `type`: `"text"`
   - `fontSize`: 14
   - `fontFamily`: 1 (Virgil / hand-drawn)
   - `strokeColor`: `"#6b7280"` (gray-500)
   - `text` / `originalText`: the annotation content
   - `x`, `y`: calculated position
   - Generate a unique `id` (8-char alphanumeric)
   - Set `width` and `height` based on text length (approximate: width = chars * 8, height = 20 per line)
5. Add the element to the `elements` array in the canvas JSON.
6. Write the canvas back.

### 4c. Adding a connection

1. Read the canvas JSON.
2. Find the source and target elements by label or prefix.
3. Create a bound arrow element connecting them (follow the pattern in `references/graph-json-format.md`).
4. Update the `boundElements` arrays on both source and target.
5. Write the canvas back.

### 5. Update the sidecar

Read the `.excalibrain.json` sidecar and update it:

- For new sections: add an entry to `sections` with prefix, type, bounding box, and description.
- For annotations: add to the section's `annotations` array (or create one).
- Increment the turn counter.
- Update the `updated` timestamp.

### 6. Confirm

Tell the user what was added:
- For sections: *"Added [type] section '[name]' at position (x, y). It shows [brief description]."*
- For annotations: *"Added annotation to '[section]': [note text]"*
- For connections: *"Connected '[source]' to '[target]' with [arrow type]."*

## Reference Files

Read these as needed:

| File | When to read |
|------|-------------|
| `references/color-palette.md` | **Before adding any diagram section** |
| `references/diagram-type-rubric.md` | **When choosing diagram type for a new section** |
| `references/patterns.md` | Visual pattern library |
| `references/layout-rules.md` | Layout rules + coordinate templates |
| `references/graph-json-format.md` | Dagre graph JSON input format |
| `references/diagram-recipes/<type>.md` | **Before generating** — complete examples per type |
