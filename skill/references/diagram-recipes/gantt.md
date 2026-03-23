# Gantt Chart Recipe

**Tool:** `dagre-layout.js` (graph JSON)
**Direction:** `LR` (left-to-right timeline)

## When to use
Time-phased plans — project timelines, sprint schedules, release roadmaps.

## Graph JSON template

For Gantt charts, dagre provides a structured layout, but the real work is in the graph design. Model each task as a node with width proportional to duration.

```json
{
  "direction": "LR",
  "title": "6-Week Feature Launch",
  "style": {"roughness": 0},
  "rankSep": 40,
  "nodeSep": 20,
  "nodes": [
    {"id": "design", "label": "Design &\nPlanning", "fill": "#bfdbfe", "stroke": "#1e40af", "width": 200},
    {"id": "backend", "label": "Backend\nDev", "fill": "#86efac", "stroke": "#15803d", "width": 200},
    {"id": "frontend", "label": "Frontend\nDev", "fill": "#86efac", "stroke": "#15803d", "width": 280},
    {"id": "testing", "label": "Testing\n& QA", "fill": "#fef08a", "stroke": "#92400e", "width": 200},
    {"id": "launch", "label": "Launch", "fill": "#a7f3d0", "stroke": "#047857", "width": 120}
  ],
  "edges": [
    {"from": "design", "to": "backend", "label": "Week 2"},
    {"from": "backend", "to": "frontend"},
    {"from": "frontend", "to": "testing"},
    {"from": "testing", "to": "launch", "label": "Week 6"}
  ]
}
```

**Note:** For complex Gantt charts with overlapping parallel tasks, consider using the direct path (writing `.excalidraw` JSON) for precise bar positioning. The dagre path works well for sequential/dependency-based timelines.

## Color defaults

| Phase | fill | stroke |
|-------|------|--------|
| Design/Planning | `#bfdbfe` | `#1e40af` |
| Development | `#86efac` | `#15803d` |
| Testing/QA | `#fef08a` | `#92400e` |
| Launch/Deploy | `#a7f3d0` | `#047857` |
| Infrastructure | `#fed7aa` | `#c2410c` |

## Common pitfalls

1. **Yellow bars with amber stroke** — Use `#92400e` (dark brown), not `#a16207`.
2. **Node width doesn't reflect duration** — Scale width proportionally to time.
3. **Missing dependencies** — Every task should connect to its prerequisite.
