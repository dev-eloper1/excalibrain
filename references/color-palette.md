# Color Palette

**This is the single source of truth for all colors.** Every `--bg` and `--stroke` value must come from this file. Do not invent hex values.

---

## Shape Colors (Semantic)

Each semantic purpose has a fill + stroke pair. Always pass both `--bg` and `--stroke`.

| Semantic Purpose | `--bg` (fill) | `--stroke` | `--fill-style` |
|-----------------|--------------|------------|----------------|
| **Clients / Users** | `#bfdbfe` | `#1e40af` | `solid` |
| **Security / Edge** | `#fed7aa` | `#c2410c` | `solid` |
| **Gateway / Routing** | `#bbf7d0` | `#15803d` | `solid` |
| **Application Services** | `#86efac` | `#15803d` | `solid` |
| **Async / Queue** | `#fef08a` | `#a16207` | `solid` |
| **Data / Storage** | `#ddd6fe` | `#6d28d9` | `solid` |
| **Observability / Logs** | `#fecdd3` | `#be123c` | `solid` |
| **AI / LLM** | `#ddd6fe` | `#6d28d9` | `solid` |
| **External / Third-party** | `#fed7aa` | `#c2410c` | `solid` |
| **Decision Diamond** | `#fef3c7` | `#b45309` | `solid` |
| **Start / Trigger** | `#dbeafe` | `#1e40af` | `solid` |
| **End / Success** | `#a7f3d0` | `#047857` | `solid` |
| **Error / Reject** | `#fecaca` | `#b91c1c` | `solid` |
| **Legacy / Uncertain** | `#f1f5f9` | `#475569` | `hachure` |
| **Neutral / Base** | `#e2e8f0` | `#334155` | `solid` |

### Usage
```bash
add rectangle --x 200 --y 200 -w 180 -h 80 \
  --label "Auth Service" --bg "#86efac" --stroke "#15803d" --fill-style solid
```

---

## Fill Styles

| Value | Visual | Best for |
|-------|--------|---------|
| `solid` | Flat color | Active, confirmed, live components |
| `hachure` | Diagonal lines | Legacy, uncertain, planned |
| `cross-hatch` | Grid lines | Reference, background zones |
| `zigzag` | Zigzag | Draft, sketchy look |
| `dots` | Dot pattern | Optional, low-priority |

---

## Zone Background Colors

Semi-transparent rectangles drawn **before** the nodes that sit on top of them.

| Zone type | `--bg` | `--stroke` | `--opacity` |
|-----------|--------|------------|-------------|
| Client layer | `#dbeafe` | `#93c5fd` | `30` |
| Service layer | `#dcfce7` | `#86efac` | `35` |
| Data layer | `#ede9fe` | `#c4b5fd` | `35` |
| Async layer | `#fef9c3` | `#fbbf24` | `40` |
| Security layer | `#ffedd5` | `#fdba74` | `35` |
| Observability | `#ffe4e6` | `#fda4af` | `35` |
| Node.js / External | `#fef3c7` | `#fbbf24` | `30` |

```bash
# Add zone background first (before nodes)
add rectangle --x 185 --y 155 -w 820 -h 145 \
  --bg "#dbeafe" --stroke "#93c5fd" --fill-style solid --opacity 30 --sw 1 > /dev/null
```

---

## Arrow / Connection Colors

Use arrow color to encode the type of relationship. Read at a glance.

| Relationship type | `--stroke` |
|------------------|-----------|
| Primary call / request | `#1e1e1e` (default black) |
| Async / event / queue | `#a16207` (amber) |
| Error / failure path | `#dc2626` (red) |
| Auth / security | `#c2410c` (orange) |
| Data read / write | `#6d28d9` (purple) |
| External API call | `#0891b2` (cyan) |
| Observability / logs | `#be123c` (rose) |
| Hub-to-spoke (type fan-out) | `#94a3b8` (slate gray) |

---

## Text Colors (Hierarchy)

Free-floating text uses color for visual hierarchy without needing containers.

| Level | `--color` | Use for |
|-------|----------|---------|
| Zone / section title | `#1e293b` | Layer headings, section headers |
| Primary label | `#374151` | Main node annotations |
| Secondary / caption | `#6b7280` | Descriptions, metadata |
| Emphasis blue | `#1e40af` | Client layer titles |
| Emphasis green | `#15803d` | Service layer titles |
| Emphasis purple | `#6d28d9` | Data layer titles |
| Emphasis amber | `#a16207` | Async layer titles |

---

## Evidence Artifact Colors

Dark-background panels for code snippets and data examples inside technical diagrams.

| Artifact | `--bg` | Text `--color` |
|---------|--------|----------------|
| Code snippet | `#1e293b` | `#e2e8f0` (light slate) |
| JSON / data | `#1e293b` | `#22c55e` (green) |
| Command / shell | `#0f172a` | `#94a3b8` (muted slate) |

```bash
# Evidence artifact: dark code panel
CODE_BG=$(add rectangle --x 900 --y 300 -w 280 -h 130 \
  --bg "#1e293b" --stroke "#334155" --fill-style solid --roughness 0 --sw 1)
add text --x 910 --y 310 --fs 13 --ff 3 --color "#22c55e" \
  -t '{ "event": "RUN_STARTED",' > /dev/null
add text --x 910 --y 328 --fs 13 --ff 3 --color "#22c55e" \
  -t '  "runId": "run_abc123" }' > /dev/null
```

---

## Font Families

| `--ff` | Name | Best for |
|--------|------|---------|
| `1` | Virgil (handwritten) | Casual annotations, mind maps |
| `2` | Helvetica (sans-serif) | Section headers, zone labels |
| `3` | Cascadia (monospace) | Code snippets, JSON, technical data |

## Roughness

| `--roughness` | Look | Use for |
|--------------|------|---------|
| `0` | Clean vector | Technical / professional diagrams |
| `1` | Slightly hand-drawn | Default — general use |
| `2` | Sketchy | Brainstorming, drafts, informal |

---

## Text Contrast Rules

Excalidraw uses the `--stroke` color as the label text color inside shapes. Choose stroke colors that contrast well against the background fill.

### Problem pairs (avoid)

| `--bg` | Bad `--stroke` | Why |
|--------|---------------|-----|
| `#fef08a` (yellow) | `#a16207` (amber) | Similar hue, muddy at small sizes |
| `#fecdd3` (pink) | `#be123c` (rose) | Low contrast on pale pink |
| `#bbf7d0` (light green) | `#15803d` (green) | OK at large size, tight at small |

### Fix: use darker strokes on pale backgrounds

| Node type | Use this `--stroke` instead |
|-----------|----------------------------|
| Async / Queue (`#fef08a` bg) | `#92400e` (dark amber-brown) |
| Observability (`#fecdd3` bg) | `#9f1239` (dark rose) |
| Gateway (`#bbf7d0` bg) | `#14532d` (dark green) |

### Dark background nodes

**IMPORTANT:** In Excalidraw, `--stroke` controls **both** the border color AND the label text color. They cannot be set independently. This means:

- A dark `--stroke` (e.g. `#334155`) on a dark `--bg` (e.g. `#1e293b`) = **unreadable** — dark text on dark background
- To get readable label text on a dark background, you **must** use a light `--stroke`

Use `--stroke "#e2e8f0"` (near-white) for any node with a dark fill. The border will be light-gray, and the label text will be clearly readable.

```bash
# ✅ Dark hub node — light stroke gives readable white-ish label text
add ellipse --x 200 --y 380 -w 200 -h 80 \
  --label "Root Concept" \
  --bg "#1e293b" --stroke "#e2e8f0" --fill-style solid --roughness 0 --sw 2

# ❌ WRONG — dark stroke on dark bg = unreadable label
add ellipse --x 200 --y 380 -w 200 -h 80 \
  --label "Root Concept" \
  --bg "#1e293b" --stroke "#334155" --fill-style solid --roughness 0 --sw 2
```

**Rule**: Before using any dark background, check that the `--stroke` color has **at least 4.5:1 contrast ratio** against the `--bg`. When in doubt, use `--stroke "#e2e8f0"` or `--stroke "#f8fafc"`.
