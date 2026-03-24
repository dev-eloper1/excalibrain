# State Diagram Recipe

**Tool:** `dagre-layout.js` (graph JSON)
**Direction:** `LR` (left-to-right lifecycle)

## When to use
Entity lifecycles where the same state can be re-entered, multiple paths lead to terminal states, and events drive transitions.

## Graph JSON template

```json
{
  "direction": "LR",
  "title": "Order Lifecycle",
  "style": {"roughness": 0},
  "nodes": [
    {"id": "start", "label": "●", "fill": "#1e40af", "stroke": "#1e40af", "shape": "ellipse", "width": 40, "height": 40},
    {"id": "placed", "label": "placed", "fill": "#86efac", "stroke": "#15803d", "rounded": true},
    {"id": "pending", "label": "payment\npending", "fill": "#86efac", "stroke": "#15803d", "rounded": true},
    {"id": "paid", "label": "paid", "fill": "#86efac", "stroke": "#15803d", "rounded": true},
    {"id": "shipped", "label": "shipped", "fill": "#86efac", "stroke": "#15803d", "rounded": true},
    {"id": "delivered", "label": "delivered", "fill": "#a7f3d0", "stroke": "#047857", "rounded": true},
    {"id": "cancelled", "label": "cancelled", "fill": "#fecaca", "stroke": "#b91c1c", "rounded": true},
    {"id": "end", "label": "◉", "fill": "#047857", "stroke": "#047857", "shape": "ellipse", "width": 40, "height": 40}
  ],
  "edges": [
    {"from": "start", "to": "placed", "label": "new order"},
    {"from": "placed", "to": "pending", "label": "checkout"},
    {"from": "pending", "to": "paid", "label": "payment ok"},
    {"from": "paid", "to": "shipped", "label": "dispatched"},
    {"from": "shipped", "to": "delivered", "label": "delivered"},
    {"from": "delivered", "to": "end"},
    {"from": "placed", "to": "cancelled", "label": "cancel", "stroke": "#dc2626", "style": "dashed"},
    {"from": "paid", "to": "cancelled", "label": "cancel", "stroke": "#dc2626", "style": "dashed"}
  ]
}
```

## Color defaults

| Element | fill | stroke |
|---------|------|--------|
| Start bullet | `#1e40af` | `#1e40af` |
| Happy-path states | `#86efac` | `#15803d` |
| End/success | `#a7f3d0` | `#047857` |
| Error/cancel | `#fecaca` | `#b91c1c` |
| Refund/compensating | `#fed7aa` | `#c2410c` |

| Arrow type | stroke | style |
|-----------|--------|-------|
| Normal transition | `#1e1e1e` | solid |
| Cancel/error | `#dc2626` | dashed |
| Compensating | `#c2410c` | dashed |

## Common pitfalls

1. **Start/end at regular size** — Keep start/end ellipses small (40x40) to visually distinguish from state nodes.
2. **Missing `rounded: true`** — State nodes should always have rounded corners.
3. **Cancel states far from source** — Position cancel states to branch naturally from their source.
