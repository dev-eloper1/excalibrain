# Storyboard Recipe

**Tool:** `dagre-layout.js` (one run per panel, merged onto same canvas)

## When to use
Visualizing how a system evolves over time — migrations, build plans, phased rollouts, before/after transformations. Each panel is a state snapshot showing what the system looks like at that phase.

## Panel graph JSON template

Each panel uses the same node structure with different colors to show change:

```json
{
  "direction": "TB",
  "rankSep": 50,
  "nodeSep": 40,
  "zones": [
    {
      "id": "panel_frame",
      "label": "",
      "fill": "#fafafa",
      "stroke": "#e5e7eb",
      "nodeIds": ["api", "auth", "db"]
    }
  ],
  "nodes": [
    { "id": "api", "label": "API Server", "fill": "#f1f5f9", "stroke": "#94a3b8" },
    { "id": "auth", "label": "Auth Service", "fill": "#dcfce7", "stroke": "#16a34a" },
    { "id": "db", "label": "Database", "fill": "#f1f5f9", "stroke": "#94a3b8" }
  ],
  "edges": [
    { "from": "api", "to": "auth" },
    { "from": "auth", "to": "db" }
  ]
}
```

## Visual diff color coding

The story is told through color. Every node gets a status color:

| Status | Fill | Stroke | strokeStyle | Meaning |
|--------|------|--------|-------------|---------|
| Unchanged | `#f1f5f9` | `#94a3b8` | solid | Exists, no change this phase |
| New | `#dcfce7` | `#16a34a` | solid | Added in this phase |
| Modified | `#fef3c7` | `#d97706` | solid | Changed in this phase |
| Removing | `#fecaca` | `#dc2626` | dashed | Being removed this phase |
| Gone | *(omit)* | | | Already removed in prior phase |

## Example: 3-panel migration storyboard

### Panel 1: Current State (all gray — nothing new yet)
```json
{
  "direction": "TB",
  "nodes": [
    { "id": "monolith", "label": "Monolith\nAPI + Auth + Users", "fill": "#f1f5f9", "stroke": "#94a3b8" },
    { "id": "db", "label": "Shared DB\nPostgres", "fill": "#f1f5f9", "stroke": "#94a3b8" },
    { "id": "client", "label": "Web Client", "fill": "#f1f5f9", "stroke": "#94a3b8" }
  ],
  "edges": [
    { "from": "client", "to": "monolith" },
    { "from": "monolith", "to": "db" }
  ]
}
```

### Panel 2: Phase 1 — Extract Auth (auth = green/new, monolith = yellow/modified)
```json
{
  "direction": "TB",
  "nodes": [
    { "id": "monolith", "label": "Monolith\nAPI + Users", "fill": "#fef3c7", "stroke": "#d97706" },
    { "id": "auth", "label": "Auth Service", "fill": "#dcfce7", "stroke": "#16a34a" },
    { "id": "db", "label": "Shared DB\nPostgres", "fill": "#f1f5f9", "stroke": "#94a3b8" },
    { "id": "client", "label": "Web Client", "fill": "#f1f5f9", "stroke": "#94a3b8" }
  ],
  "edges": [
    { "from": "client", "to": "monolith" },
    { "from": "client", "to": "auth" },
    { "from": "monolith", "to": "db" },
    { "from": "auth", "to": "db" }
  ]
}
```

### Panel 3: Target — Full Microservices (new services green, old monolith removed)
```json
{
  "direction": "TB",
  "nodes": [
    { "id": "gateway", "label": "API Gateway", "fill": "#dcfce7", "stroke": "#16a34a" },
    { "id": "auth", "label": "Auth Service", "fill": "#f1f5f9", "stroke": "#94a3b8" },
    { "id": "users", "label": "Users Service", "fill": "#dcfce7", "stroke": "#16a34a" },
    { "id": "auth_db", "label": "Auth DB", "fill": "#dcfce7", "stroke": "#16a34a" },
    { "id": "users_db", "label": "Users DB", "fill": "#dcfce7", "stroke": "#16a34a" },
    { "id": "client", "label": "Web Client", "fill": "#f1f5f9", "stroke": "#94a3b8" }
  ],
  "edges": [
    { "from": "client", "to": "gateway" },
    { "from": "gateway", "to": "auth" },
    { "from": "gateway", "to": "users" },
    { "from": "auth", "to": "auth_db" },
    { "from": "users", "to": "users_db" }
  ]
}
```

## Narrative captions (added as annotations after all panels)

Below each panel, add free text elements:

```
Panel 1 caption:
  "Everything in one deployable. Auth, users, API all coupled."
  "Pain: 4-hour deploys, auth changes risk breaking users."

Panel 2 caption:
  "Auth extracted as standalone service. Shared DB for now."
  "Risk: dual-write during migration period."

Panel 3 caption:
  "Each service owns its data. Gateway routes requests."
  "Deploy time: 4h → 15min per service."
```

Caption style:
- "What changed" line: 14px, `#374151` (dark gray)
- "Why / risk" line: 13px, `#6b7280` (medium gray)

## Progression arrows between panels

Add manually after all panels are generated:
- Large dashed arrows between panels at y-center
- Color: `#6366f1` (indigo)
- Labels: "Extract auth", "Split DB + add gateway"

## Best practices

1. **Same components, same positions** — The viewer's eye should track a component across panels. Keep the node `id` consistent and let dagre produce similar layouts.
2. **Gray is the default** — Only color the things that CHANGED in each phase. If everything is colored, nothing stands out.
3. **Narrative captions are mandatory** — Without "what changed" and "why", the panels are just diagrams in a row.
4. **3-5 panels max** — More than 5 panels loses the narrative thread. If you need more, split into two storyboards.
5. **Start with current state** — Panel 1 should always show where you are today, all gray. This grounds the viewer before changes start.
