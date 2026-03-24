---
name: excalibrain:export
description: >
  Export an Excalidraw canvas or region to PNG or SVG. Trigger on: export this,
  export as png, export as svg, export the diagram, save as image.
---

# Export

Export an Excalidraw canvas (or a region of one) to PNG or SVG.

## Workflow

### 1. Determine the canvas

- If the user specifies a file, use that.
- Otherwise, find the active canvas session: look for the most recent `.excalibrain.json` sidecar in the project and read its `canvas` field.
- If no sidecar exists, look for the most recently modified `.excalidraw` file in the current directory or `docs/diagrams/`.
- If nothing is found, ask the user which file to export.

### 2. Determine the format

| Context | Default format |
|---------|---------------|
| User says "png" or "image" | PNG |
| User says "svg" or "vector" | SVG |
| Embedding in markdown or docs | PNG |
| For web usage | SVG |
| No preference stated | PNG |

### 3. Run the export

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/export.js <canvas.excalidraw> --format <png|svg> --output <output-path>
```

**Output path rules:**
- Same directory as the canvas file
- Same base name, with `.png` or `.svg` extension
- Example: `docs/diagrams/auth-flow.excalidraw` -> `docs/diagrams/auth-flow.png`

### 4. Region export (future)

When the `--region` flag is supported:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/export.js <canvas.excalidraw> --format png --region "Section Name" --output <output-path>
```

Region can be:
- A frame name (matched against element labels on the canvas)
- Explicit coordinates: `x,y,w,h`

Until `--region` is implemented, export the full canvas.

### 5. Return result

Return a markdown image embed so the user can see the result inline:

```markdown
![<Brief description of the diagram>](<relative-path-to-output>)
```

Read the exported image with the Read tool to visually verify it rendered correctly before returning.

## Reference Files

| File | When to read |
|------|-------------|
| `references/color-palette.md` | Only if re-rendering with adjusted colors |
| `references/layout-rules.md` | Only if adjusting layout before export |
