# State Diagram: Support Ticket Lifecycle

## Prompt

"Model the lifecycle of a support ticket: new -> triaged -> in progress -> waiting on customer -> resolved -> closed. A ticket can be reopened from resolved back to in progress. Tickets can be cancelled from any state except closed."

## Type Selection

Based on the diagram-type-rubric.md, the keywords "lifecycle", "states", and "transitions" map directly to **State diagram**. No ambiguity.

## Path Choice

**Dagre path** -- state diagrams use `dagre-layout.js` with graph JSON input per the recipe (`skill/references/diagram-recipes/state-diagram.md`).

## Style Fix: Hand-drawn Look

The previous state diagram set `"roughness": 0`, `"fontFamily": 2`, and `"fontSize": 16` in the graph.json style, which overrode the hand-drawn defaults.

**Fix:** The `style` object is now `{}` (empty), which lets dagre-layout.js apply its defaults:
- `roughness: 1` -- slightly hand-drawn edges
- `fontFamily: 1` -- Virgil (handwritten font)
- `fontSize: 16` -- default size

This matches the hand-drawn aesthetic of the architecture diagram and other Excalidraw diagrams.

## Full Input Content

The graph JSON (`graph.json`) defines:

- **9 nodes**: start marker, 7 states (New, Triaged, In Progress, Waiting on Customer, Resolved, Closed, Cancelled), end marker
- **15 edges**: happy-path transitions (solid black), cancel transitions (dashed red `#dc2626`), reopen transition (dashed orange `#c2410c`)
- **Color coding**:
  - Start marker: `#1e40af` (blue)
  - New (entry state): `#dbeafe` bg / `#1e40af` stroke (Clients/Users palette)
  - Happy-path states (Triaged, In Progress): `#86efac` bg / `#15803d` stroke (Application Services)
  - Waiting on Customer: `#fef08a` bg / `#92400e` stroke (Async/Queue -- waiting state)
  - Resolved, Closed: `#a7f3d0` bg / `#047857` stroke (End/Success)
  - Cancelled: `#fecaca` bg / `#b91c1c` stroke (Error/Reject)
  - End marker: `#047857` (green terminal)

## Commands and Timing

```bash
# Step 4: Generate (dagre path)
node tools/dagre-layout.js examples/state-diagram/graph.json \
  --output examples/state-diagram/diagram.excalidraw
# Completed in <0.1s

# Step 5: Validate (export to PNG)
node tools/export.js examples/state-diagram/diagram.excalidraw \
  --format png --output examples/state-diagram/diagram.png
# Output: 1180x400px, 42KB
```

## Visual Verification Notes

- [x] All 7 state nodes labeled and readable
- [x] Start (filled blue circle) and end (filled green circle) markers present at correct sizes (40x40)
- [x] All happy-path transitions present: created -> New -> triage -> Triaged -> assign -> In Progress -> fix applied -> Resolved -> confirmed -> Closed -> end
- [x] Bidirectional loop: In Progress <-> Waiting on Customer (need info / reply received)
- [x] Reopen path: Resolved -> In Progress (dashed orange)
- [x] Cancel paths: dashed red arrows from New, Triaged, In Progress, Waiting on Customer, and Resolved to Cancelled
- [x] No cancel arrow from Closed (correct per requirements)
- [x] Hand-drawn style: Virgil font and roughness=1 applied (wobbly edges, handwritten text)
- [x] Color coding consistent with color-palette.md semantic purposes
- [x] Isomorphism test: removing text, the structure still shows a linear progression with a loop, a branch-back (reopen), and a sink node (cancelled) collecting dashed edges

![State diagram showing support ticket lifecycle](diagram.png)
