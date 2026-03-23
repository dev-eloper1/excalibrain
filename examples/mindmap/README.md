# Mindmap: Cloud Computing Concepts

## Prompt

"Create a mind map of cloud computing concepts: the main branches should be IaaS, PaaS, SaaS, and Serverless. Each should have 2-3 specific examples as leaves (e.g., IaaS -> EC2, Azure VMs, GCP Compute; PaaS -> Heroku, App Engine; etc.)"

## Type Selection

Based on the diagram-type-rubric.md, the keywords "mind map", "concepts", and the radial concept exploration pattern map directly to **Mindmap**. No ambiguity.

## Path Choice

**Dagre path** -- mindmaps use `dagre-layout.js` with graph JSON input per the recipe (`skill/references/diagram-recipes/mindmap.md`).

## Full Input Content

The graph JSON (`graph.json`) defines:

- **17 nodes**: 1 root, 4 branches (L1), 12 leaves (L2 -- 3 per branch)
- **16 edges**: all using `#94a3b8` (slate gray) hub-to-spoke style, no arrowheads (`"arrowhead": null`)
- **Color coding** (semantic per branch):
  - Root: `#1e293b` bg / `#e2e8f0` stroke (dark navy center with light text)
  - IaaS branch: `#bfdbfe` bg / `#1e40af` stroke (blue -- Clients/Users palette)
  - IaaS leaves: `#dbeafe` bg / `#1e40af` stroke (lighter blue variant)
  - PaaS branch: `#86efac` bg / `#15803d` stroke (green -- Application Services)
  - PaaS leaves: `#bbf7d0` bg / `#15803d` stroke (lighter green variant)
  - SaaS branch: `#ddd6fe` bg / `#6d28d9` stroke (purple -- Data/Storage palette)
  - SaaS leaves: `#ede9fe` bg / `#6d28d9` stroke (lighter purple variant)
  - Serverless branch: `#fef08a` bg / `#92400e` stroke (yellow -- Async/Queue palette)
  - Serverless leaves: `#fef9c3` bg / `#92400e` stroke (lighter yellow variant)

### Node inventory

| Branch | Leaves |
|--------|--------|
| IaaS | Amazon EC2, Azure VMs, GCP Compute Engine |
| PaaS | Heroku, Google App Engine, AWS Elastic Beanstalk |
| SaaS | Google Workspace, Salesforce, Dropbox |
| Serverless | AWS Lambda, GCP Cloud Functions, Azure Functions |

## Commands and Timing

```bash
# Step 4: Generate (dagre path)
node tools/dagre-layout.js examples/mindmap/graph.json \
  --output examples/mindmap/diagram.excalidraw
# Completed in <1s

# Step 5: Validate (export to PNG)
node tools/export.js examples/mindmap/diagram.excalidraw \
  --format png --output examples/mindmap/diagram.png
# Output: 840x1113px, 51KB
```

## Visual Verification Notes

- [x] All 17 nodes labeled and readable
- [x] Dark root node ("Cloud Computing") has light stroke `#e2e8f0` for readable label text
- [x] No arrowheads on connections (tree aesthetic per recipe)
- [x] 4 distinct branch colors -- IaaS (blue), PaaS (green), SaaS (purple), Serverless (yellow)
- [x] Leaf nodes use lighter fills from the same hue family as their parent branch
- [x] All 12 leaf examples are real-world services (not generic placeholders)
- [x] 2-level depth (root -> branch -> leaf) per recipe guidance (no deeper)
- [x] All connections present: 4 root-to-branch + 12 branch-to-leaf = 16 edges
- [x] Layout is left-to-right tree with clear visual hierarchy
- [x] Isomorphism test: removing text, the hub-and-spoke structure with two tiers communicates a taxonomy/classification

![Mindmap showing cloud computing concepts](diagram.png)
