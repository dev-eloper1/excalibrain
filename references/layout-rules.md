# Layout Rules

Rules for building readable, well-proportioned diagrams. Dagre handles most positioning automatically, but these rules guide content sourcing, color planning, and validation.

---

## Rules 2–5: Spacing Foundations

### Rule 2 — Node Spacing (Minimum Gap)
Horizontal gap between adjacent nodes: **≥ 40px**. Vertical gap between rows: **≥ 30px**.
Dagre's `nodeSep` (default 40) and `rankSep` (default 80) satisfy this automatically.

### Rule 3 — Label Width Formula
For manually-sized nodes: `min_width = max(120, len(label) * 9.6 + 32)`. Dagre's auto-sizing handles this when width/height are omitted from the graph JSON.

### Rule 4 — Row Height Standards

| Node type | Height |
|-----------|--------|
| Standard service / component | `70` |
| Decision diamond | `90–100` |
| Start / End ellipse | `70` |
| Zone background | auto-calculated from contained nodes |

### Rule 5 — Inter-Zone Horizontal Gap
Leave **≥ 80px** between zones. Dagre's `nodeSep` ensures this when nodes are in different zones.

---

## Rules 6–9: Zone Backgrounds

### Rule 6 — Draw Zone Backgrounds Before Nodes
Dagre-layout.js handles this automatically — zones are always emitted before nodes in the elements array.

### Rule 7 — Zone Padding
Dagre uses 32px padding around zone contents with an extra 20px top for the label.

### Rule 8 — Zone Labels
Zone labels are placed at the top-left of the zone rectangle, using font family 2 (Helvetica).

Zone label colors by type:

| Zone | Color |
|------|-------|
| Client / Users | `#1e40af` |
| Services / API | `#15803d` |
| Data / Storage | `#6d28d9` |
| Async / Queue | `#a16207` |
| Security / Edge | `#c2410c` |
| Observability | `#be123c` |

### Rule 9 — Zone Width Covers All Children
Dagre auto-calculates zone dimensions from contained nodes.

---

## Rules 10–15: Readability and Visual Hierarchy

### Rule 10 — Auto-Width Applied
Dagre auto-sizes nodes from label text. Manual `width`/`height` in graph JSON override auto-sizing.

### Rule 11 — Zone Boundary Clearance
Node right edge must be ≥ 30px from adjacent zone border.

### Rule 12 — No Long Cross-Lane Diagonals
Route through intermediate nodes rather than drawing diagonal arrows spanning 3+ zones.

### Rule 13 — Terminal Nodes Are Rightmost/Bottommost
The "result" or "end" node should be at the terminal position of the layout direction.

### Rule 14 — Typography Scale

| Element | Font size | Font family |
|---------|-----------|-------------|
| Title | 20–22 | 1 (Virgil) or 2 (Helvetica) |
| Zone label | 13–14 | 2 (Helvetica) |
| Node label | 16 | Per graph style |
| Edge label | 12–13 | Per graph style |
| Evidence artifact | 12–13 | 3 (Cascadia mono) |
| **Minimum** | **12** | — |

### Rule 15 — Arrow Styles Must Differentiate

| Relationship | Style | Stroke width | Color |
|-------------|-------|-------------|-------|
| Primary flow | solid | 2 | `#1e1e1e` or semantic |
| Hub → spoke | dotted | 1 | `#94a3b8` (slate gray) |
| Emphasis / critical | solid | 3 | semantic color |
| Async / event | dashed | 1.5 | `#a16207` (amber) |

---

## Rules 16–22: Type-Specific

### Rule 16 — Sequence Diagrams: Mermaid Path
Sequence diagrams use the Mermaid path (`mermaid-convert.js`). The library handles participant layout, lifelines, and message arrows automatically.

### Rule 17 — Decision Branch Spacing
For flowcharts via Mermaid, branch spacing is automatic. For dagre, use diamond shape nodes and ensure adequate `nodeSep`.

### Rule 18 — Mind Map Layout
Use dagre with `arrowhead: null` and LR direction for tree mind maps.

### Rule 19 — Multi-Layer Architecture: Use Zones
Group services into labeled zones in the graph JSON. Dagre positions zones around their contained nodes.

### Rule 20 — Bidirectional Edges
Dagre detects A→B and B→A pairs and renders them as a single bidirectional arrow.

### Rule 21 — Title Spacing
Dagre adds 55px offset when a title is present, ensuring clearance between title and first element.

### Rule 22 — Label Contrast
In Excalidraw, stroke color controls both border AND label text. Dark backgrounds need light stroke:
- Dark bg (`#1e293b`): use stroke `#e2e8f0`
- Yellow bg (`#fef08a`): use stroke `#92400e`
- Pink bg (`#fecdd3`): use stroke `#9f1239`
