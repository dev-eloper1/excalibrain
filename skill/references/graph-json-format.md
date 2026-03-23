# Graph JSON Format

Complete input format for `dagre-layout.js`. Used for architecture, state, mindmap, and gantt diagram types.

## Graph-level properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `direction` | `"TB"\|"LR"\|"BT"\|"RL"` | `"LR"` | Layout direction |
| `rankSep` | number | `80` | Gap between ranks (px) |
| `nodeSep` | number | `40` | Gap between same-rank nodes (px) |
| `title` | string | — | Optional title text at top |
| `arrowhead` | `"triangle"\|"arrow"\|"none"\|null` | `"triangle"` | Default arrowhead for all edges |
| `style` | object | — | Global style overrides (see below) |
| `zones` | array | — | Background zone rectangles |
| `nodes` | array | **required** | Node definitions |
| `edges` | array | **required** | Edge definitions |

## style object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `roughness` | `0\|1\|2` | `1` | 0=clean, 1=hand-drawn, 2=very rough |
| `fontFamily` | `1\|2\|3` | `1` | 1=Virgil, 2=Helvetica, 3=Cascadia |
| `fontSize` | number | `16` | Default node label font size |
| `nodeFill` | `"none"\|"solid"\|"hachure"\|"cross-hatch"` | `"none"` | Default fill style |
| `zoneFill` | string | `"solid"` | Zone fill style |
| `zoneOpacity` | number | `30` | Zone background opacity |
| `arrowWidth` | number | `1.5` | Arrow stroke width |
| `nodeWidth` | number | `2` | Node border stroke width |

## Node properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | **required** | Unique identifier |
| `label` | string | `id` | Display text (supports `\n` for multiline) |
| `width` | number | auto-calculated | Override auto-calculated width |
| `height` | number | auto-calculated | Override auto-calculated height |
| `fill` | string | `"none"` | Background color hex |
| `stroke` | string | `"#1e40af"` | Border color hex |
| `textColor` | string | auto-darkened | Override text color |
| `fontSize` | number | `16` | Font size for this node |
| `shape` | `"rectangle"\|"diamond"\|"ellipse"` | `"rectangle"` | Node shape |
| `rounded` | boolean | `false` | Rounded corners |
| `fillStyle` | string | — | Per-node fill style override |
| `strokeStyle` | `"solid"\|"dashed"\|"dotted"` | `"solid"` | Border style |
| `strokeWidth` | number | `2` | Border width |
| `roughness` | number | — | Per-node roughness override |

### Auto-sizing

Node dimensions are calculated from label text when `width`/`height` are not specified:
- Width: `max(160, ceil((maxLineLength * fontSize * 0.65 + 32) / 10) * 10)`
- Height: `max(50, ceil((lineCount * fontSize * 1.25 + 20) / 10) * 10)`

## Edge properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `from` | string | **required** | Source node id |
| `to` | string | **required** | Target node id |
| `label` | string | — | Edge label text |
| `stroke` | string | `"#374151"` | Arrow color hex |
| `style` | `"solid"\|"dashed"\|"dotted"` | `"solid"` | Arrow style |
| `width` | number | `1.5` | Arrow stroke width |
| `arrowhead` | `"triangle"\|"arrow"\|"none"\|null` | graph default | Per-edge arrowhead |

## Zone properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | **required** | Unique zone identifier |
| `label` | string | — | Zone label text |
| `labelColor` | string | `"#1e293b"` | Label text color |
| `fill` | string | `"#f8fafc"` | Zone background color |
| `stroke` | string | `"#94a3b8"` | Zone border color |
| `opacity` | number | `30` | Zone opacity |
| `nodeIds` | string[] | **required** | Node ids belonging to this zone |

## CLI flags

| Flag | Description |
|------|-------------|
| `--roughness <0\|1\|2>` | Hand-drawn intensity |
| `--font <1\|2\|3\|virgil\|normal\|mono>` | Font family |
| `--fill <none\|solid\|hachure\|cross-hatch>` | Node fill style |
| `--arrow-width <n>` | Arrow stroke width |
| `--node-width <n>` | Node border width |
| `--clean` | Shortcut: roughness=0, font=mono, fill=solid |
| `--output <path>` | Write to file instead of stdout |

## Minimal example

```json
{
  "direction": "TB",
  "nodes": [
    {"id": "a", "label": "Start", "fill": "#a7f3d0", "stroke": "#047857", "shape": "ellipse"},
    {"id": "b", "label": "Process", "fill": "#bfdbfe", "stroke": "#1e40af"},
    {"id": "c", "label": "End", "fill": "#a7f3d0", "stroke": "#047857", "shape": "ellipse"}
  ],
  "edges": [
    {"from": "a", "to": "b"},
    {"from": "b", "to": "c"}
  ]
}
```

## Architecture example (with zones)

```json
{
  "direction": "TB",
  "title": "Microservices Architecture",
  "zones": [
    {"id": "clients", "label": "CLIENTS", "labelColor": "#1e40af", "fill": "#dbeafe", "stroke": "#93c5fd", "nodeIds": ["web", "mobile"]},
    {"id": "services", "label": "SERVICES", "labelColor": "#15803d", "fill": "#dcfce7", "stroke": "#86efac", "nodeIds": ["gw", "auth", "orders"]},
    {"id": "data", "label": "DATA", "labelColor": "#6d28d9", "fill": "#ede9fe", "stroke": "#c4b5fd", "nodeIds": ["pg", "redis"]}
  ],
  "nodes": [
    {"id": "web", "label": "Web App", "fill": "#bfdbfe", "stroke": "#1e40af"},
    {"id": "mobile", "label": "Mobile App", "fill": "#bfdbfe", "stroke": "#1e40af"},
    {"id": "gw", "label": "API Gateway", "fill": "#bbf7d0", "stroke": "#15803d"},
    {"id": "auth", "label": "Auth Service", "fill": "#fed7aa", "stroke": "#c2410c"},
    {"id": "orders", "label": "Order Service", "fill": "#86efac", "stroke": "#15803d"},
    {"id": "pg", "label": "PostgreSQL", "fill": "#ddd6fe", "stroke": "#6d28d9"},
    {"id": "redis", "label": "Redis", "fill": "#fef08a", "stroke": "#92400e"}
  ],
  "edges": [
    {"from": "web", "to": "gw"},
    {"from": "mobile", "to": "gw"},
    {"from": "gw", "to": "auth", "stroke": "#c2410c"},
    {"from": "gw", "to": "orders"},
    {"from": "orders", "to": "pg", "stroke": "#6d28d9"},
    {"from": "orders", "to": "redis", "stroke": "#a16207", "style": "dashed"}
  ]
}
```
