# Mindmap: JavaScript Ecosystem

## Prompt

"Create an asymmetric mind map of JavaScript ecosystem: Core (3 leaves: ES Modules, Promises, Closures), Frontend (4 leaves: React, Vue, Svelte, Angular), Backend (2 leaves: Node.js, Deno), Testing (3 leaves: Jest, Vitest, Playwright), Build Tools (2 leaves: Vite, esbuild)"

## Type Selection

Based on the diagram-type-rubric.md, the keywords "mind map", "ecosystem", and the radial concept exploration pattern map directly to **Mindmap**. No ambiguity.

## Path Choice

**Dagre path** -- mindmaps use `dagre-layout.js` with graph JSON input per the recipe (`skill/references/diagram-recipes/mindmap.md`).

## Style Fix: Hand-drawn Look

The previous mindmap set `"roughness": 0` and `"fontFamily": 2` in the graph.json style, which overrode the hand-drawn defaults and made the diagram look too clean/corporate.

**Fix:** The `style` object is now `{}` (empty), which lets dagre-layout.js apply its defaults:
- `roughness: 1` -- slightly hand-drawn edges
- `fontFamily: 1` -- Virgil (handwritten font)

This matches the hand-drawn aesthetic of other Excalidraw diagrams.

## Full Input Content

The graph JSON (`graph.json`) defines:

- **21 nodes**: 1 root, 5 branches (L1), 14 leaves (L2 -- asymmetric: 3, 4, 2, 3, 2)
- **19 edges**: all using `#94a3b8` (slate gray) hub-to-spoke style, no arrowheads (`"arrowhead": null`)
- **Color coding** (semantic per branch):
  - Root: `#1e293b` bg / `#e2e8f0` stroke (dark navy center with light text)
  - Core branch: `#bfdbfe` / `#1e40af` (blue); leaves: `#dbeafe` / `#1e40af`
  - Frontend branch: `#86efac` / `#15803d` (green); leaves: `#bbf7d0` / `#15803d`
  - Backend branch: `#ddd6fe` / `#6d28d9` (purple); leaves: `#ede9fe` / `#6d28d9`
  - Testing branch: `#fef08a` / `#92400e` (yellow); leaves: `#fef9c3` / `#92400e`
  - Build Tools branch: `#fed7aa` / `#c2410c` (orange); leaves: `#ffedd5` / `#c2410c`

### Node inventory

| Branch | Leaves |
|--------|--------|
| Core | ES Modules, Promises, Closures |
| Frontend | React, Vue, Svelte, Angular |
| Backend | Node.js, Deno |
| Testing | Jest, Vitest, Playwright |
| Build Tools | Vite, esbuild |

## Commands and Timing

```bash
# Step 4: Generate (dagre path)
node tools/dagre-layout.js examples/mindmap/graph.json \
  --output examples/mindmap/diagram.excalidraw
# Completed in <0.1s

# Step 5: Validate (export to PNG)
node tools/export.js examples/mindmap/diagram.excalidraw \
  --format png --output examples/mindmap/diagram.png
# Output: 840x1213px, 58KB
```

## Visual Verification Notes

- [x] All 21 nodes labeled and readable
- [x] Dark root node ("JavaScript") has light stroke `#e2e8f0` for readable label text
- [x] No arrowheads on connections (tree aesthetic per recipe)
- [x] 5 distinct branch colors -- Core (blue), Frontend (green), Backend (purple), Testing (yellow), Build Tools (orange)
- [x] Leaf nodes use lighter fills from the same hue family as their parent branch
- [x] Asymmetric structure: branches have different numbers of leaves (3, 4, 2, 3, 2)
- [x] Hand-drawn style: Virgil font and roughness=1 applied (wobbly edges, handwritten text)
- [x] 2-level depth (root -> branch -> leaf) per recipe guidance
- [x] All connections present: 5 root-to-branch + 14 branch-to-leaf = 19 edges
- [x] Layout is left-to-right tree with clear visual hierarchy

![Mindmap showing JavaScript ecosystem](diagram.png)
