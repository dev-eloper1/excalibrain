# Floor Plan Primitives

Architectural floor plan components. The hand-drawn Excalidraw style makes
these feel like architect sketches — appropriate for early-stage space planning.

All dimensions are in pixels. Suggested scale: 1 pixel ≈ 1cm (so a 3m wall = 300px).

## room
Rectangle with centered label. Thick stroke (2px) for walls.
- Params: x, y, w, h, label
- Elements: rectangle (strokeWidth: 2) + centered text

## door
Gap in a wall with a swing arc showing opening direction.
- Params: x, y, wall (n/s/e/w), swing (left/right), width (default: 80)
- Elements: line (white, covers wall gap) + arc (quarter circle showing swing)
- The arc uses a freedraw or line-with-curve to approximate a 90° arc

## window
Dashed segment on a wall.
- Params: x, y, wall (n/s/e/w), width (default: 100)
- Elements: line with strokeStyle: "dashed", strokeWidth: 2

## wall
Standalone thick line for partitions.
- Params: x1, y1, x2, y2, thickness (default: 2)
- Elements: line with strokeWidth: thickness

## furniture:bed
Rectangle with pillow rectangle at head.
- single: 90×190, double: 140×190, queen: 160×200, king: 180×200
- Elements: outer rect + pillow rect (20% of length)

## furniture:desk
Rectangle with chair circle.
- Params: x, y, width (default: 120)
- Elements: rect (width × 60) + ellipse (30×30 for chair)

## furniture:table
Circle or rectangle.
- round: ellipse, size = diameter
- rect: rectangle, size = w × h (default 120×80)

## furniture:couch
L-shape or straight rectangle with back rest.
- 2-seat: 160×80, 3-seat: 220×80, L: 220×220 (two rects)
- Elements: seat rect + back rect (narrower)

## furniture:chair
Small square (40×40) with backrest arc.
- Elements: rectangle + line for backrest

## furniture:toilet
Oval bowl + rectangular tank.
- Elements: ellipse (40×50) + rect (40×15)

## furniture:sink
Rectangle with circle basin.
- Elements: rect (50×40) + ellipse (30×30)

## furniture:shower
Square with cross-hatch lines.
- Params: x, y, size (default: 90)
- Elements: rectangle + 2 diagonal lines

## furniture:stove
Rectangle with 4 circles (burners).
- Elements: rect (60×60) + 4 small ellipses (12×12)

## furniture:fridge
Rectangle with vertical handle line.
- Elements: rect (70×70) + vertical line

## dimension
Measurement line with end marks and text.
- Params: x1, y1, x2, y2, label
- Elements: horizontal/vertical line + two end marks (short perpendicular lines) + centered text

## label
Free-floating text for room annotations.
- Params: x, y, text, fontSize (default: 14)
- Elements: text element
