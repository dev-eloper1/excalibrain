# Floor Plan Recipe

**Tool:** `primitives.js`
**Scale:** 1 px ≈ 2 cm (so a 400 px room ≈ 8 m)

## When to use
Spatial layouts — apartments, offices, rooms, building floors. The key signal is physical space with walls, doors, furniture placement, and real-world dimensions.

## Primitive type names

Floor plan primitives use a **namespace prefix**. Getting these wrong silently skips the element.

| Category | Type name | Key params |
|----------|-----------|------------|
| Structure | `room` | `x, y, w, h, label, fill, stroke, labelColor` |
| Structure | `wall` | `x1, y1, x2, y2, thickness` |
| Structure | `door` | `x, y, wall (n/s/e/w), swing (left/right), width` |
| Structure | `window` | `x, y, wall (n/s/e/w), width` |
| Furniture | `furniture:bed` | `x, y, size (single/double/queen/king)` |
| Furniture | `furniture:desk` | `x, y, width` |
| Furniture | `furniture:table` | `x, y, shape (rect/round), w, h` or `size` |
| Furniture | `furniture:couch` | `x, y, style (2-seat/3-seat/L)` |
| Furniture | `furniture:chair` | `x, y` |
| Furniture | `furniture:toilet` | `x, y` |
| Furniture | `furniture:sink` | `x, y` |
| Furniture | `furniture:shower` | `x, y, size` |
| Furniture | `furniture:stove` | `x, y` |
| Furniture | `furniture:fridge` | `x, y` |
| Annotation | `dimension` | `x1, y1, x2, y2, label` |
| Annotation | `label` | `x, y, text, fontSize` |

**Common mistake:** Using `bed` instead of `furniture:bed`. All furniture types require the `furniture:` prefix.

## Scale reference

At 1 px ≈ 2 cm:

| Real-world object | Approximate px |
|-------------------|---------------|
| Standard door width (80 cm) | **40** |
| Interior wall opening | 35–45 |
| Single bed | 90 × 190 |
| Queen bed | 160 × 200 |
| Shower stall | 90 × 90 |
| Toilet footprint | 40 × 65 |
| Sink | 50 × 40 |
| Stove | 60 × 60 |
| Fridge | 70 × 70 |
| 2-seat couch | 160 × 80 |
| Small room (bathroom) | 150–250 |
| Medium room (bedroom) | 300–500 |
| Large room (living room) | 350–500 |

## Door sizing rule

**Door width must be proportional to the room.** A door's `width` parameter controls both the wall gap AND the swing arc radius.

| Room size (px) | Max door width |
|----------------|---------------|
| < 200 | 30–35 |
| 200–400 | 35–45 |
| > 400 | 40–50 |

**Never exceed 50 px** for interior doors at this scale. Entry/front doors can go up to 55 px.

## Door collision avoidance

The swing arc is a quarter circle with radius = `width`. Before placing a door:

1. **Identify the clear zone** — the arc sweeps into whichever side the `swing` parameter opens toward
2. **Check furniture bounding boxes** — no furniture center should be within `width` px of the door's `(x, y)` in the swing direction
3. **Prefer swinging into the emptier room** — hallways, open wall sides
4. **Place doors near room corners** — more clearance, furniture naturally groups toward center/far walls

## Room colors

Use zone background colors from `color-palette.md` for semantic room coding:

| Room type | fill | stroke | labelColor |
|-----------|------|--------|------------|
| Living / common areas | `#dbeafe` | `#93c5fd` | `#1e40af` |
| Kitchen | `#dcfce7` | `#86efac` | `#15803d` |
| Bathroom / wet rooms | `#ede9fe` | `#c4b5fd` | `#6d28d9` |
| Bedroom / private | `#fef9c3` | `#fbbf24` | `#92400e` |
| Hallway / utility | `#f1f5f9` | `#94a3b8` | `#475569` |
| Outdoor / balcony | `#ffedd5` | `#fdba74` | `#c2410c` |

## Dimension lines

Place dimension lines **outside** the floor plan perimeter:
- Top edge: per-section widths at `y = -25`
- Right edge: per-section heights at `x = totalWidth + 30`
- Bottom: overall width at `y = totalHeight + 30`
- Left: overall height at `x = -30`

Add a title label above the top dimension: `"[Type] · ~[area] m²"`

To calculate area in m²: `(totalWidth × totalHeight) × 0.0004` (since 1 px ≈ 0.02 m).

## JSON template

```json
{
  "primitives": [
    { "type": "room", "x": 0, "y": 0, "w": 900, "h": 650, "label": "" },

    { "type": "room", "x": 0, "y": 0, "w": 400, "h": 380, "label": "Living Room",
      "fill": "#dbeafe", "stroke": "#93c5fd", "labelColor": "#1e40af" },
    { "type": "room", "x": 400, "y": 0, "w": 260, "h": 260, "label": "Kitchen",
      "fill": "#dcfce7", "stroke": "#86efac", "labelColor": "#15803d" },

    { "type": "furniture:couch", "style": "L", "x": 30, "y": 50 },
    { "type": "furniture:stove", "x": 420, "y": 30 },

    { "type": "door", "x": 200, "y": 380, "wall": "s", "swing": "right", "width": 40 },
    { "type": "window", "x": 0, "y": 150, "wall": "e", "width": 130 },

    { "type": "dimension", "x1": 0, "y1": -25, "x2": 400, "y2": -25, "label": "8.0 m" },
    { "type": "label", "x": 300, "y": -55, "text": "1-Bedroom Apartment · ~55 m²", "fontSize": 18 }
  ]
}
```

## Generation command

```bash
node tools/primitives.js floor-plan.json --output floor-plan.excalidraw
```

## Common pitfalls

1. **Missing `furniture:` prefix** — primitives silently skip unknown types. Always prefix furniture.
2. **Oversized doors** — keep width ≤ 50 px. An 80 px door at this scale is a garage opening.
3. **Door swings into furniture** — check the arc clearance zone before placing.
4. **Rooms without color** — pass `fill`, `stroke`, and `labelColor` to rooms. Without these, all rooms look identical.
5. **Dimensions overlapping title** — keep the title at `y = -55` and top dimensions at `y = -25`.
6. **Forgetting outer shell** — the first room (full footprint, no label) draws the exterior walls.
