# Gantt Chart Recipe

**Tool:** `gantt-layout.js` (Gantt JSON)

## When to use
Time-phased plans -- project timelines, sprint schedules, release roadmaps. Any diagram that needs a horizontal time axis with parallel task bars.

## Gantt JSON format

```json
{
  "title": "6-Week Feature Launch",
  "timeUnit": "Week",
  "columns": 8,
  "tasks": [
    {"id": "design", "label": "Design", "start": 1, "duration": 2, "fill": "#bfdbfe", "stroke": "#1e40af"},
    {"id": "backend", "label": "Backend Dev", "start": 2, "duration": 3, "fill": "#86efac", "stroke": "#15803d"},
    {"id": "frontend", "label": "Frontend Dev", "start": 3, "duration": 3, "fill": "#86efac", "stroke": "#15803d"},
    {"id": "testing", "label": "QA Testing", "start": 5, "duration": 2, "fill": "#fef08a", "stroke": "#92400e"},
    {"id": "launch", "label": "Launch", "start": 7, "duration": 1, "fill": "#a7f3d0", "stroke": "#047857"}
  ],
  "dependencies": [
    {"from": "design", "to": "backend"},
    {"from": "design", "to": "frontend"},
    {"from": "backend", "to": "testing"},
    {"from": "frontend", "to": "testing"},
    {"from": "testing", "to": "launch"}
  ]
}
```

## Field reference

### Top-level fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | (none) | Chart title displayed top-left |
| `timeUnit` | string | `"Week"` | Label prefix for columns (e.g. "Week", "Sprint", "Month") |
| `columns` | number | `8` | Number of time columns |
| `tasks` | array | required | Array of task objects |
| `dependencies` | array | `[]` | Optional dependency arrows |
| `theme` | string | `"default"` | Theme name (overridden by `--theme` flag) |
| `labelWidth` | number | `180` | Width of the left label column (px) |
| `colWidth` | number | `120` | Width per time column (px) |
| `rowHeight` | number | `50` | Height per task row (px) |
| `rowGap` | number | `8` | Vertical gap between rows (px) |

### Task fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | required | Unique task identifier |
| `label` | string | required | Display name (shown in left column and on bar if wide enough) |
| `start` | number | required | Start column (1-based) |
| `duration` | number | required | Number of columns the bar spans |
| `fill` | string | `"#bfdbfe"` | Bar background color |
| `stroke` | string | theme default | Bar border color |
| `textColor` | string | auto-darkened | Text color inside bar |
| `strokeWidth` | number | theme default | Bar border width |

### Dependency fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `from` | string | required | Source task id |
| `to` | string | required | Target task id |
| `stroke` | string | theme default | Arrow color |
| `style` | string | `"solid"` | `solid`, `dashed`, or `dotted` |
| `width` | number | theme default | Arrow stroke width |

## CLI usage

```bash
node ~/Documents/excalibrain/tools/gantt-layout.js gantt.json [--theme name] [--output path]
cat gantt.json | node ~/Documents/excalibrain/tools/gantt-layout.js --output out.excalidraw
```

## What the renderer produces

- **Title text** top-left
- **Time axis labels** ("Week 1", "Week 2", ...) centered in each column
- **Axis divider line** below the header row
- **Vertical grid lines** between columns (low opacity)
- **Horizontal grid lines** between task rows (low opacity)
- **Task name labels** in the left column, vertically centered with their bar
- **Task bars** -- colored rectangles spanning start to end columns, with rounded corners
- **Bar labels** -- task name repeated inside the bar (if bar width >= 80px)
- **Dependency arrows** -- from right edge of source bar to left edge of target bar

## Color defaults

| Phase | fill | stroke |
|-------|------|--------|
| Design/Planning | `#bfdbfe` | `#1e40af` |
| Development | `#86efac` | `#15803d` |
| Testing/QA | `#fef08a` | `#92400e` |
| Launch/Deploy | `#a7f3d0` | `#047857` |
| Infrastructure | `#fed7aa` | `#c2410c` |

## Theme support

All four themes work: `default`, `clean`, `dark`, `blueprint`. Pass via `--theme`:

```bash
node gantt-layout.js gantt.json --theme dark --output gantt.excalidraw
```

The theme controls: canvas background, title color, font family, roughness, arrow colors, grid line colors (auto-adjusted for dark backgrounds).

## Common pitfalls

1. **`start` is 1-based** -- `start: 1` means the first column, not zero.
2. **`columns` must cover all tasks** -- ensure `columns >= max(start + duration - 1)` across all tasks.
3. **Short bars hide labels** -- bars narrower than 80px won't show the label inside; the left-column label is always visible.
4. **Dependencies are optional** -- omit the `dependencies` array entirely for a simple timeline without arrows.
