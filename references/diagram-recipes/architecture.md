# Architecture Diagram Recipe

**Tool:** `dagre-layout.js` (graph JSON)
**Direction:** `TB` (top-to-bottom layers)

## When to use
Layered system architectures — clients, gateways, services, data stores. The key signal is a clear separation of concerns across horizontal layers.

## Graph JSON template

```json
{
  "direction": "TB",
  "title": "System Architecture",
  "rankSep": 80,
  "nodeSep": 40,
  "zones": [
    {"id": "clients", "label": "CLIENTS", "labelColor": "#1e40af", "fill": "#dbeafe", "stroke": "#93c5fd", "nodeIds": ["web", "mobile"]},
    {"id": "gateway", "label": "GATEWAY", "labelColor": "#c2410c", "fill": "#ffedd5", "stroke": "#fdba74", "nodeIds": ["gw"]},
    {"id": "services", "label": "SERVICES", "labelColor": "#15803d", "fill": "#dcfce7", "stroke": "#86efac", "nodeIds": ["auth", "orders", "inventory"]},
    {"id": "data", "label": "DATA", "labelColor": "#6d28d9", "fill": "#ede9fe", "stroke": "#c4b5fd", "nodeIds": ["pg", "redis"]}
  ],
  "nodes": [
    {"id": "web", "label": "Web App", "fill": "#bfdbfe", "stroke": "#1e40af"},
    {"id": "mobile", "label": "Mobile App", "fill": "#bfdbfe", "stroke": "#1e40af"},
    {"id": "gw", "label": "API Gateway", "fill": "#bbf7d0", "stroke": "#15803d"},
    {"id": "auth", "label": "Auth Service", "fill": "#fed7aa", "stroke": "#c2410c"},
    {"id": "orders", "label": "Order Service", "fill": "#86efac", "stroke": "#15803d"},
    {"id": "inventory", "label": "Inventory", "fill": "#86efac", "stroke": "#15803d"},
    {"id": "pg", "label": "PostgreSQL", "fill": "#ddd6fe", "stroke": "#6d28d9"},
    {"id": "redis", "label": "Redis", "fill": "#fef08a", "stroke": "#92400e"}
  ],
  "edges": [
    {"from": "web", "to": "gw"},
    {"from": "mobile", "to": "gw"},
    {"from": "gw", "to": "auth", "stroke": "#c2410c"},
    {"from": "gw", "to": "orders"},
    {"from": "gw", "to": "inventory"},
    {"from": "orders", "to": "pg", "stroke": "#6d28d9"},
    {"from": "inventory", "to": "pg", "stroke": "#6d28d9"},
    {"from": "orders", "to": "redis", "stroke": "#a16207", "style": "dashed"}
  ]
}
```

## Color defaults

| Node type | fill | stroke |
|-----------|------|--------|
| Client | `#bfdbfe` | `#1e40af` |
| Gateway | `#bbf7d0` | `#15803d` |
| Auth/Security | `#fed7aa` | `#c2410c` |
| App Service | `#86efac` | `#15803d` |
| Database | `#ddd6fe` | `#6d28d9` |
| Cache/Queue | `#fef08a` | `#92400e` |

## Common pitfalls

1. **Async/cache with amber stroke** — Use `#92400e` (dark brown), not `#a16207` for yellow-fill nodes.
2. **Too many nodes per zone** — 5-6 max per zone row. Split into sub-zones if needed.
3. **Arrows crossing 3+ zones** — Route through intermediate gateway nodes instead.
