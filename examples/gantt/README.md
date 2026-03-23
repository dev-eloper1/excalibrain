# Gantt Chart Example

This example demonstrates the `gantt-layout.js` tool, which produces a proper Gantt chart with a horizontal time axis, parallel task bars, grid lines, and dependency arrows.

## Files

| File | Description |
|------|-------------|
| `graph.json` | Gantt chart input data (tasks, dependencies, time columns) |
| `gantt.excalidraw` | Generated Excalidraw file (default theme) |
| `gantt.png` | Exported PNG (default theme) |
| `gantt-dark.excalidraw` | Generated Excalidraw file (dark theme) |
| `gantt-dark.png` | Exported PNG (dark theme) |

## Regenerate

```bash
# Default theme
node tools/gantt-layout.js examples/gantt/graph.json --output examples/gantt/gantt.excalidraw
node tools/export.js examples/gantt/gantt.excalidraw --format png --output examples/gantt/gantt.png

# Dark theme
node tools/gantt-layout.js examples/gantt/graph.json --theme dark --output examples/gantt/gantt-dark.excalidraw
node tools/export.js examples/gantt/gantt-dark.excalidraw --format png --output examples/gantt/gantt-dark.png
```

## Input format

The Gantt JSON format is different from the dagre graph JSON. Key fields:

- `title` -- chart title
- `timeUnit` -- label prefix for columns ("Week", "Sprint", "Month")
- `columns` -- number of time columns
- `tasks[]` -- each task has `id`, `label`, `start` (1-based column), `duration` (column count), `fill`, `stroke`
- `dependencies[]` -- optional arrows between tasks, each with `from` and `to` task ids

See `skill/references/diagram-recipes/gantt.md` for the full field reference.
