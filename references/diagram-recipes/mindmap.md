# Mind Map Recipe

**Tool:** `dagre-layout.js` (graph JSON)
**Direction:** `LR` (left-to-right tree)

## When to use
A central concept branching into related topics — brainstorming, knowledge mapping, concept overviews.

## Graph JSON template

```json
{
  "direction": "LR",
  "title": "React Concepts",
  "arrowhead": null,
  "style": {"roughness": 0},
  "nodes": [
    {"id": "root", "label": "React", "fill": "#1e293b", "stroke": "#e2e8f0", "textColor": "#e2e8f0", "shape": "ellipse", "width": 160, "height": 80},
    {"id": "components", "label": "Components", "fill": "#86efac", "stroke": "#15803d"},
    {"id": "state", "label": "State", "fill": "#ddd6fe", "stroke": "#6d28d9"},
    {"id": "props", "label": "Props", "fill": "#bfdbfe", "stroke": "#1e40af"},
    {"id": "hooks", "label": "Hooks", "fill": "#fef08a", "stroke": "#92400e"},
    {"id": "context", "label": "Context", "fill": "#fed7aa", "stroke": "#c2410c"},
    {"id": "rendering", "label": "Rendering", "fill": "#bbf7d0", "stroke": "#15803d"},
    {"id": "func", "label": "Functional", "fill": "#bbf7d0", "stroke": "#15803d"},
    {"id": "class_comp", "label": "Class", "fill": "#bbf7d0", "stroke": "#15803d"},
    {"id": "useEffect", "label": "useEffect", "fill": "#fef9c3", "stroke": "#92400e"},
    {"id": "useState", "label": "useState", "fill": "#fef9c3", "stroke": "#92400e"}
  ],
  "edges": [
    {"from": "root", "to": "components", "stroke": "#94a3b8"},
    {"from": "root", "to": "state", "stroke": "#94a3b8"},
    {"from": "root", "to": "props", "stroke": "#94a3b8"},
    {"from": "root", "to": "hooks", "stroke": "#94a3b8"},
    {"from": "root", "to": "context", "stroke": "#94a3b8"},
    {"from": "root", "to": "rendering", "stroke": "#94a3b8"},
    {"from": "components", "to": "func", "stroke": "#94a3b8"},
    {"from": "components", "to": "class_comp", "stroke": "#94a3b8"},
    {"from": "hooks", "to": "useEffect", "stroke": "#94a3b8"},
    {"from": "hooks", "to": "useState", "stroke": "#94a3b8"}
  ]
}
```

**Key settings:**
- `"arrowhead": null` — plain lines (no arrowheads) for tree aesthetic
- Dark root with light stroke for contrast (Rule 22)
- Semantic colors per topic area from color-palette.md
- Leaf nodes use lighter fill from same hue family

## Color defaults

| Level | Role | fill | stroke |
|-------|------|------|--------|
| Root | Dark navy center | `#1e293b` | `#e2e8f0` |
| Branch (L1) | Semantic per topic | varies | varies |
| Leaf (L2) | Lighter hue of parent | lighter variant | same as parent |

| Edge | stroke |
|------|--------|
| All spokes | `#94a3b8` (slate gray) |

## Common pitfalls

1. **Dark root with dark stroke** — MUST use `stroke: "#e2e8f0"` on dark backgrounds for readable label text.
2. **All branches same color** — Use semantic colors from color-palette.md to distinguish topics.
3. **Too deep** — 2 levels max (root → branch → leaf). Deeper trees become unreadable.
