# Visual Pattern Library

CLI examples for each visual pattern. Every pattern also shows the corresponding `conn()` calls.
Colors come from `color-palette.md`.

---

## Fan-Out (One-to-Many)

One central node fans out to multiple targets. Use for: API gateways dispatching to services, a parent spawning children, a hub routing to types.

```
     ○ Service A
    ↗
□ → ○ Service B
    ↘
     ○ Service C
```

```bash
GW=$(add rectangle --x 200 --y 340 -w 200 -h 80 --label "API Gateway" \
  --bg "#bbf7d0" --stroke "#15803d")
SVC_A=$(add rectangle --x 500 --y 200 -w 180 -h 72 --label "Auth Service" \
  --bg "#86efac" --stroke "#15803d")
SVC_B=$(add rectangle --x 500 --y 320 -w 180 -h 72 --label "Core API" \
  --bg "#86efac" --stroke "#15803d")
SVC_C=$(add rectangle --x 500 --y 440 -w 180 -h 72 --label "Billing" \
  --bg "#86efac" --stroke "#15803d")

conn "$GW" "$SVC_A" "" "#15803d"
conn "$GW" "$SVC_B" "" "#15803d"
conn "$GW" "$SVC_C" "" "#15803d"
```

**Hub centering rule**: Center the hub over its targets.
```
hub_x = (leftmost_target_center + rightmost_target_center) / 2 - hub_width / 2
```

---

## Convergence (Many-to-One)

Multiple sources merge into a single destination. Use for: aggregation, funnels, log collectors.

```
  ○ ↘
  ○ → □
  ○ ↗
```

```bash
LOG1=$(add rectangle --x 200 --y 200 -w 160 -h 70 --label "Auth Service" \
  --bg "#86efac" --stroke "#15803d")
LOG2=$(add rectangle --x 200 --y 310 -w 160 -h 70 --label "Core API" \
  --bg "#86efac" --stroke "#15803d")
LOG3=$(add rectangle --x 200 --y 420 -w 160 -h 70 --label "Billing" \
  --bg "#86efac" --stroke "#15803d")
AGG=$(add rectangle  --x 480 --y 310 -w 180 -h 70 --label "Log Aggregator" \
  --bg "#fecdd3" --stroke "#be123c")

conn "$LOG1" "$AGG" "logs" "#be123c" "dashed"
conn "$LOG2" "$AGG" "logs" "#be123c" "dashed"
conn "$LOG3" "$AGG" "logs" "#be123c" "dashed"
```

---

## Swim Lanes (Horizontal Layered Architecture)

Horizontal bands for each layer. Best for 4+ layer architectures. Each band has a semi-transparent zone background added before the nodes.

```
y=200:  [Client A]  [Client B]  [Client C]        ← CLIENT zone (blue)
y=350:  [──────── API Gateway ────────]            ← SERVICE zone (green)
y=500:  [DB]  [Cache]  [Search]                   ← DATA zone (purple)
```

```bash
# Step 1: Zone backgrounds first
add rectangle --x 185 --y 155 -w 820 -h 140 \
  --bg "#dbeafe" --stroke "#93c5fd" --fill-style solid --opacity 15 --sw 1 > /dev/null
add rectangle --x 185 --y 315 -w 820 -h 140 \
  --bg "#dcfce7" --stroke "#86efac" --fill-style solid --opacity 20 --sw 1 > /dev/null
add rectangle --x 185 --y 475 -w 820 -h 140 \
  --bg "#ede9fe" --stroke "#c4b5fd" --fill-style solid --opacity 20 --sw 1 > /dev/null

# Step 2: Zone labels
add text --x 195 --y 163 --fs 14 --ff 2 --color "#1e40af" -t "CLIENTS"  > /dev/null
add text --x 195 --y 323 --fs 14 --ff 2 --color "#15803d" -t "SERVICES" > /dev/null
add text --x 195 --y 483 --fs 14 --ff 2 --color "#6d28d9" -t "DATA"     > /dev/null

# Step 3: Nodes
WEB=$(    add rectangle --x 205 --y 195 -w 160 -h 72 --label "Web App"    --bg "#bfdbfe" --stroke "#1e40af")
MOBILE=$( add rectangle --x 415 --y 195 -w 160 -h 72 --label "Mobile App" --bg "#bfdbfe" --stroke "#1e40af")
GW=$(     add rectangle --x 205 --y 355 -w 575 -h 72 --label "API Gateway" --bg "#86efac" --stroke "#15803d")
DB=$(     add rectangle --x 205 --y 515 -w 160 -h 72 --label "PostgreSQL"  --bg "#ddd6fe" --stroke "#6d28d9")
CACHE=$(  add rectangle --x 415 --y 515 -w 160 -h 72 --label "Redis"       --bg "#ddd6fe" --stroke "#6d28d9")
```

---

## Sequence Diagram (Protocol / Auth Flow)

Participants across the top, horizontal arrows for each step. **Use `add arrow` with explicit coordinates — never `element connect -l` for sequence steps.**

Layout formula:
- Participant row: y=200, h=70
- Lifelines: from y=278 downward (dashed vertical lines)
- Step rows: y = 340 + (step_index * 100)  [100px per step]
- Labels: free text at step_y - 20, x = midpoint of the two participants

```bash
#!/usr/bin/env bash
CLI=$(which excalidraw-agent-cli)
P=/tmp/sequence.excalidraw

add() { $CLI --project "$P" --json element add "$@" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])"; }

rm -f "$P"
$CLI --json project new --name "sequence" --output "$P" > /dev/null

# Participants
P1=$(add rectangle --x 200 --y 200 -w 160 -h 70 --label "Client"  --bg "#bfdbfe" --stroke "#1e40af" --fill-style solid --roughness 0)
P2=$(add rectangle --x 480 --y 200 -w 180 -h 70 --label "Server"  --bg "#86efac" --stroke "#15803d" --fill-style solid --roughness 0)
P3=$(add rectangle --x 780 --y 200 -w 160 -h 70 --label "Database" --bg "#ddd6fe" --stroke "#6d28d9" --fill-style solid --roughness 0)

# Lifelines (dashed vertical lines below each participant)
add line --x 280  --y 278 --points "0,0 0,500" --stroke "#cbd5e1" --sw 1 --stroke-style dashed > /dev/null
add line --x 570  --y 278 --points "0,0 0,500" --stroke "#cbd5e1" --sw 1 --stroke-style dashed > /dev/null
add line --x 860  --y 278 --points "0,0 0,500" --stroke "#cbd5e1" --sw 1 --stroke-style dashed > /dev/null

# Step 1: Client → Server (request, solid)
add arrow --x 280 --y 340 --ex 570 --ey 340 \
  --stroke "#c2410c" --sw 2 --stroke-style solid \
  --end-arrowhead arrow --start-arrowhead none > /dev/null
add text --x 360 --y 320 --fs 13 --ff 2 --color "#1e293b" -t "1. POST /login" > /dev/null

# Step 2: Server → DB (query, solid)
add arrow --x 570 --y 440 --ex 860 --ey 440 \
  --stroke "#6d28d9" --sw 2 --stroke-style solid \
  --end-arrowhead arrow --start-arrowhead none > /dev/null
add text --x 660 --y 420 --fs 13 --ff 2 --color "#6d28d9" -t "2. SELECT user" > /dev/null

# Step 3: DB → Server (response, dashed)
add arrow --x 860 --y 540 --ex 570 --ey 540 \
  --stroke "#6d28d9" --sw 2 --stroke-style dashed \
  --end-arrowhead arrow --start-arrowhead none > /dev/null
add text --x 660 --y 520 --fs 13 --ff 2 --color "#6b7280" -t "3. user row" > /dev/null

# Step 4: Server → Client (response, dashed)
add arrow --x 570 --y 640 --ex 280 --ey 640 \
  --stroke "#15803d" --sw 2 --stroke-style dashed \
  --end-arrowhead arrow --start-arrowhead none > /dev/null
add text --x 360 --y 620 --fs 13 --ff 2 --color "#6b7280" -t "4. 200 OK + JWT" > /dev/null
```

---

## Mind Map (Left-to-Right Tree)

A hierarchical tree with the root at left, branches in the middle, sub-labels at right. Use plain lines (no arrowheads) for tree edges. Never use radial/hub-and-spoke for mind maps — it produces poor hierarchy and text overlap.

```
Root ──── Branch 1 ──── sub-item a
     │               └── sub-item b
     ├─── Branch 2 ──── sub-item c
     ├─── Branch 3
     └─── Branch 4
```

**Vertical spacing formula**: total_height = n_branches * 130. Root y = center.

```bash
# Root uses dark bg — MUST use light stroke for readable label text (Rule 22)
ROOT=$(add ellipse --x 200 --y 380 -w 200 -h 80 \
  --label "Root Concept" --bg "#1e293b" --stroke "#e2e8f0" \
  --fill-style solid --roughness 0 --sw 2)

B1=$(add rectangle --x 500 --y 160 -w 200 -h 65 --label "Topic A" --bg "#bfdbfe" --stroke "#1e40af" --fill-style solid --roughness 0)
B2=$(add rectangle --x 500 --y 290 -w 200 -h 65 --label "Topic B" --bg "#bbf7d0" --stroke "#15803d" --fill-style solid --roughness 0)
B3=$(add rectangle --x 500 --y 420 -w 200 -h 65 --label "Topic C" --bg "#fef08a" --stroke "#92400e" --fill-style solid --roughness 0)
B4=$(add rectangle --x 500 --y 550 -w 200 -h 65 --label "Topic D" --bg "#fed7aa" --stroke "#c2410c" --fill-style solid --roughness 0)
B5=$(add rectangle --x 500 --y 680 -w 200 -h 65 --label "Topic E" --bg "#ddd6fe" --stroke "#6d28d9" --fill-style solid --roughness 0)

# Tree edges: plain lines, no arrowhead
for B in "$B1" "$B2" "$B3" "$B4" "$B5"; do
  $CLI --project "$P" --json element connect \
    --from "$ROOT" --to "$B" \
    --stroke "#94a3b8" --sw 1 --stroke-style solid \
    --end-arrowhead none > /dev/null
done

# Sub-labels: free text at x=715, beside each branch
add text --x 715 --y 148 --fs 12 --ff 1 --color "#1e40af" -t "sub-item 1" > /dev/null
add text --x 715 --y 168 --fs 12 --ff 1 --color "#1e40af" -t "sub-item 2" > /dev/null
add text --x 715 --y 278 --fs 12 --ff 1 --color "#15803d" -t "sub-item 3" > /dev/null
```

---

## Cycle (Feedback Loop)

Elements in sequence with a return arrow back to the start. Use for: CI/CD pipelines, iterative refinement, retry loops.

**Layout**: 2×N grid (top row = forward stages, bottom row = return stages). The fail/return arrow routes as a **∩ shape above the top row** — a horizontal dashed line at title level with short vertical stubs connecting to the first and last stage tops. This is always cleaner than routing around the outside edges.

```
                [fail]
     ┌──────────────────────────┐
     ↓                          │
  Code → Build → Test ──────────┘
     ↑
  Plan ← Monitor ← Deploy
```

```bash
# Title (Rule 21: leave ≥60px below baseline before first element)
add text --x 290 --y 15 --fs 22 --ff 1 --color "#111827" -t "CI/CD Pipeline" > /dev/null

# Grid: Row1 y=90 h=70, Row2 y=270 h=70
# Cols: Code/Plan x=160, Build/Monitor x=390, Test/Deploy x=620; w=170
CODE=$(add rectangle    --x 160 --y 90  -w 170 -h 70 --label "Code"    --bg "#bfdbfe" --stroke "#1e40af" --fill-style solid --roughness 0 --sw 2 --roundness)
BUILD=$(add rectangle   --x 390 --y 90  -w 170 -h 70 --label "Build"   --bg "#bbf7d0" --stroke "#15803d" --fill-style solid --roughness 0 --sw 2 --roundness)
TEST=$(add rectangle    --x 620 --y 90  -w 170 -h 70 --label "Test"    --bg "#fef08a" --stroke "#92400e" --fill-style solid --roughness 0 --sw 2 --roundness)
PLAN=$(add rectangle    --x 160 --y 270 -w 170 -h 70 --label "Plan"    --bg "#e0e7ff" --stroke "#4338ca" --fill-style solid --roughness 0 --sw 2 --roundness)
MONITOR=$(add rectangle --x 390 --y 270 -w 170 -h 70 --label "Monitor" --bg "#fce7f3" --stroke "#be185d" --fill-style solid --roughness 0 --sw 2 --roundness)
DEPLOY=$(add rectangle  --x 620 --y 270 -w 170 -h 70 --label "Deploy"  --bg "#d1fae5" --stroke "#047857" --fill-style solid --roughness 0 --sw 2 --roundness)

# Forward cycle (element connect handles clean routing)
$CLI --project "$P" --json element connect --from "$CODE"    --to "$BUILD"   --start-arrowhead none --end-arrowhead arrow --sw 2 --roughness 0 > /dev/null
$CLI --project "$P" --json element connect --from "$BUILD"   --to "$TEST"    --start-arrowhead none --end-arrowhead arrow --sw 2 --roughness 0 > /dev/null
$CLI --project "$P" --json element connect --from "$TEST"    --to "$DEPLOY"  --start-arrowhead none --end-arrowhead arrow --sw 2 --roughness 0 > /dev/null
$CLI --project "$P" --json element connect --from "$DEPLOY"  --to "$MONITOR" --start-arrowhead none --end-arrowhead arrow --sw 2 --roughness 0 > /dev/null
$CLI --project "$P" --json element connect --from "$MONITOR" --to "$PLAN"    --start-arrowhead none --end-arrowhead arrow --sw 2 --roughness 0 > /dev/null
$CLI --project "$P" --json element connect --from "$PLAN"    --to "$CODE"    --start-arrowhead none --end-arrowhead arrow --sw 2 --roughness 0 > /dev/null

# ∩ fail path above the top row (Test → Code via ∩ at y=62)
# Col centers: Code=245, Test=705; horizontal fail path at y=62 (28px above row1 y=90)
# "fail" label right of center, above the ∩ line
add text --x 645 --y 46 --fs 13 --ff 2 --color "#dc2626" -t "fail" > /dev/null
# Horizontal dashed segment (Code column to Test column)
add line --x 245 --y 62 --points "0,0 460,0" \
  --stroke "#dc2626" --sw 2 --stroke-style dashed --roughness 0 > /dev/null
# Right stub: Test top (705, 90) up to horizontal (705, 62)
add line --x 705 --y 62 --points "0,0 0,28" \
  --stroke "#dc2626" --sw 2 --stroke-style dashed --roughness 0 > /dev/null
# Left cap: downward arrow from horizontal (245, 62) into Code top (245, 88) — arrowhead at Code
add arrow --x 245 --y 62 --ex 245 --ey 88 \
  --stroke "#dc2626" --sw 2 --roughness 0 \
  --start-arrowhead none --end-arrowhead arrow > /dev/null
```

**Key rules for cycles:**
- Title must be above the ∩ path (Rule 21: ≥60px gap to first element)
- ∩ path: horizontal at `row1_top - 28px`, stubs go DOWN to node tops, arrowhead enters start node from above
- Use `element connect` for all main cycle arrows (it auto-routes cleanly when nodes don't share both x and y)
- Route fail/skip paths using the ∩ above, not around the outside edges

---

## Assembly Line (Transformation)

Input → process → output with clear before/after. Use for: data pipelines, ETL, build systems.

```bash
INPUT=$(  add ellipse   --x 200 --y 300 -w 160 -h 72 --label "Raw Data"    --bg "#bfdbfe" --stroke "#1e40af")
PROCESS=$(add rectangle --x 450 --y 300 -w 200 -h 72 --label "Transform"   --bg "#86efac" --stroke "#15803d")
OUTPUT=$( add ellipse   --x 750 --y 300 -w 160 -h 72 --label "Clean Data"  --bg "#a7f3d0" --stroke "#047857")

conn "$INPUT"   "$PROCESS" "raw"       "#1e40af"
conn "$PROCESS" "$OUTPUT"  "validated" "#047857"

# Optional: show before/after data as evidence artifacts
add rectangle --x 200 --y 400 -w 160 -h 90 \
  --bg "#1e293b" --stroke "#334155" --fill-style solid --roughness 0 > /dev/null
add text --x 210 --y 410 --fs 12 --ff 3 --color "#94a3b8" -t '{ "date": "03/14",' > /dev/null
add text --x 210 --y 428 --fs 12 --ff 3 --color "#94a3b8" -t '  "val": "12.3x" }' > /dev/null

add rectangle --x 750 --y 400 -w 160 -h 90 \
  --bg "#1e293b" --stroke "#334155" --fill-style solid --roughness 0 > /dev/null
add text --x 760 --y 410 --fs 12 --ff 3 --color "#22c55e" -t '{ "date": "2026-03-14",' > /dev/null
add text --x 760 --y 428 --fs 12 --ff 3 --color "#22c55e" -t '  "value": 12.3 }' > /dev/null
```

---

## Evidence Artifacts

Use to show what things actually look like — not just what they're called.

### Code snippet panel

```bash
# Dark background panel
CODE_BG=$(add rectangle --x 900 --y 300 -w 290 -h 150 \
  --bg "#1e293b" --stroke "#334155" --fill-style solid --roughness 0 --sw 1)

# Header label above the panel
add text --x 900 --y 283 --fs 13 --ff 2 --color "#64748b" -t "SDK usage" > /dev/null

# Code lines inside (monospace, colored)
add text --x 912 --y 312 --fs 12 --ff 3 --color "#e2e8f0" -t "import excalidraw_agent_cli" > /dev/null
add text --x 912 --y 330 --fs 12 --ff 3 --color "#e2e8f0" -t "from cli import main" > /dev/null
add text --x 912 --y 360 --fs 12 --ff 3 --color "#94a3b8" -t "# create project" > /dev/null
add text --x 912 --y 378 --fs 12 --ff 3 --color "#22c55e" -t 'main(["project", "new"])' > /dev/null
```

### JSON payload panel

```bash
JSON_BG=$(add rectangle --x 900 --y 480 -w 290 -h 110 \
  --bg "#1e293b" --stroke "#334155" --fill-style solid --roughness 0 --sw 1)
add text --x 912 --y 492 --fs 12 --ff 3 --color "#22c55e" -t '{ "type": "rectangle",' > /dev/null
add text --x 912 --y 510 --fs 12 --ff 3 --color "#22c55e" -t '  "id": "elem_abc",' > /dev/null
add text --x 912 --y 528 --fs 12 --ff 3 --color "#22c55e" -t '  "x": 200, "y": 200,' > /dev/null
add text --x 912 --y 546 --fs 12 --ff 3 --color "#22c55e" -t '  "label": "My Node" }' > /dev/null
```

---

## Bidirectional Arrow

```bash
$CLI --project "$P" --json element connect \
  --from "$A" --to "$B" \
  -l "read / write" \
  --stroke "#6d28d9" --sw 2 --stroke-style solid \
  --start-arrowhead arrow --end-arrowhead arrow > /dev/null
```

---

## Mixed Roughness (Live vs Planned)

```bash
# Live / stable component
add rectangle ... --roughness 0 --fill-style solid

# Planned / future component
add rectangle ... --roughness 2 --fill-style hachure --opacity 70
```
