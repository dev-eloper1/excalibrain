# Flowchart Recipe

**Tool:** `dagre-layout.js` (graph JSON)

Dagre is the primary tool for flowcharts. It provides full control over layout, handles fan-in/fan-out cleanly, supports canvas sessions (merge/position/prefix), and auto-sizes nodes to fit text.

## When to use
Step-by-step logic with conditional branching — user journeys, request lifecycles, decision trees, validation pipelines, process flows.

## Graph JSON template

```json
{
  "direction": "TB",
  "rankSep": 60,
  "nodeSep": 50,
  "nodes": [
    { "id": "start", "label": "Start", "shape": "ellipse", "fill": "#dbeafe", "stroke": "#3b82f6" },
    { "id": "validate", "label": "Validate Input", "fill": "#86efac", "stroke": "#15803d", "rounded": true },
    { "id": "valid", "label": "Valid?", "shape": "diamond", "fill": "#fef3c7", "stroke": "#f59e0b" },
    { "id": "process", "label": "Process Request", "fill": "#a7f3d0", "stroke": "#047857", "rounded": true },
    { "id": "error", "label": "Return Error", "fill": "#fecaca", "stroke": "#b91c1c", "rounded": true },
    { "id": "save", "label": "Save to DB", "fill": "#ddd6fe", "stroke": "#6d28d9" },
    { "id": "end", "label": "End", "shape": "ellipse", "fill": "#dbeafe", "stroke": "#3b82f6" }
  ],
  "edges": [
    { "from": "start", "to": "validate" },
    { "from": "validate", "to": "valid" },
    { "from": "valid", "to": "process", "label": "Yes" },
    { "from": "valid", "to": "error", "label": "No" },
    { "from": "process", "to": "save" },
    { "from": "save", "to": "end" },
    { "from": "error", "to": "end" }
  ]
}
```

## Shape conventions

| Shape | Node property | Use for |
|-------|--------------|---------|
| Rounded rectangle | `"rounded": true` | Process steps, actions |
| Diamond | `"shape": "diamond"` | Decisions, conditionals |
| Ellipse | `"shape": "ellipse"` | Start/end terminals |
| Rectangle | (default) | Data operations, storage |

## Standard colors (from color-palette.md)

| Purpose | fill | stroke |
|---------|------|--------|
| Start/End terminals | `#dbeafe` | `#3b82f6` |
| Process steps | `#86efac` | `#15803d` |
| Decision diamonds | `#fef3c7` | `#f59e0b` |
| Error/reject paths | `#fecaca` | `#b91c1c` |
| Success/completion | `#a7f3d0` | `#047857` |
| Data/storage | `#ddd6fe` | `#6d28d9` |
| Security/auth | `#fed7aa` | `#c2410c` |
| Async/queue | `#fef08a` | `#eab308` |

## Edge styling

- Default arrows are solid with triangle arrowheads
- `"strokeStyle": "dashed"` for retry loops or optional paths
- `"label": "Yes"` / `"No"` on decision branches
- Keep edge labels short (≤ 15 chars per line, use `\n` for multiline)

## Zones (optional)

Group related nodes into colored zones for complex flowcharts:

```json
"zones": [
  {
    "id": "input_zone",
    "label": "INPUT",
    "fill": "#f0f9ff",
    "stroke": "#bae6fd",
    "labelColor": "#0369a1",
    "nodeIds": ["start", "validate", "valid"]
  }
]
```

## Best practices

1. **Keep labels concise** — 2-3 words per line, max 3 lines. Dagre auto-sizes nodes but large labels make the diagram unwieldy.
2. **Use zones for >10 nodes** — Group nodes by phase/concern to add visual structure.
3. **Decision diamonds should have exactly 2-3 outgoing edges** — Yes/No for binary, or named branches for multi-way.
4. **All paths should terminate** — Every branch should reach an end node or loop back.
5. **Retry/loop arrows** — Use `"strokeStyle": "dashed"` to distinguish retry paths from the main flow.
6. **Direction** — Use `TB` (top-to-bottom) for most flowcharts. Use `LR` for wide, shallow flows.

## Common pitfalls

1. **Too many nodes without zones** — >15 nodes without zones looks like a wall of boxes. Add zones.
2. **Long decision labels** — Diamonds have limited space. Keep to ≤ 15 characters. Move detail to annotations.
3. **Fan-in with labels** — When 4+ edges converge on one node with labels, the labels cluster. Use shorter labels or omit labels on obvious connections.
4. **Missing colors** — Every node should have `fill` and `stroke`. Monochrome flowcharts lose the visual argument.

## Mermaid fallback

For simple flowcharts (<10 nodes, no fan-in/fan-out), mermaid syntax is also acceptable. See the mermaid template below. **Do not use mermaid for complex flowcharts** — layout breaks on fan-in/fan-out patterns.

<details>
<summary>Mermaid template (simple flowcharts only)</summary>

```mermaid
flowchart TB
    A([Start]):::start --> B[Validate Input]:::process
    B --> C{Valid?}:::decision
    C -->|Yes| D[Process Request]:::success
    C -->|No| E[Return Error]:::error
    D --> F[Save to DB]:::data
    F --> G([End]):::start
    E --> G

    classDef start fill:#dbeafe,stroke:#1e40af,color:#1e40af
    classDef process fill:#86efac,stroke:#15803d,color:#15803d
    classDef decision fill:#fef3c7,stroke:#b45309,color:#b45309
    classDef error fill:#fecaca,stroke:#b91c1c,color:#b91c1c
    classDef success fill:#a7f3d0,stroke:#047857,color:#047857
    classDef data fill:#ddd6fe,stroke:#6d28d9,color:#6d28d9
```

</details>
