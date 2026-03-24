# excalibrain

A Claude Code plugin that turns ideas and code into visual arguments using [Excalidraw](https://excalidraw.com).

Say `/draw`, `/canvas`, or just describe what you want to see. Claude picks the right diagram type, generates the layout, and produces an `.excalidraw` file you can open and edit.

<p align="center">
  <img src="docs/diagrams/onboarding-wireframe.png" width="100%" alt="Wireframe screens and backend architecture generated from a single prompt" />
</p>

<p align="center">
  <em>Wireframe screens + backend architecture — generated from "wireframe the onboarding flow"</em>
</p>

---

## What it does

| You say | You get |
|---------|---------|
| "draw the auth flow" | Architecture diagram with zones, services, and data stores |
| "sequence diagram for signup" | Mermaid sequence diagram with participants and messages |
| "storyboard the migration" | Multi-panel visual diff showing what changes per phase |
| "wireframe the login screen" | Hand-drawn UI mockup with inputs, buttons, and cards |
| "start a canvas for this system" | Living workspace that builds incrementally across turns |
| "floor plan for the office" | Spatial layout with rooms, furniture, and dimensions |

Every diagram is a standard `.excalidraw` file — open it in [excalidraw.com](https://excalidraw.com), the VS Code extension, or Obsidian.

## Gallery

<table>
<tr>
<td width="50%">
<img src="docs/diagrams/architecture.png" alt="Plugin architecture diagram" />
<p align="center"><em>Plugin architecture — dagre auto-layout with semantic zones</em></p>
</td>
<td width="50%">
<img src="docs/diagrams/alt-statediagram.png" alt="Canvas session state diagram" />
<p align="center"><em>State diagram — lifecycle with color-coded transitions</em></p>
</td>
</tr>
<tr>
<td width="50%">
<img src="docs/diagrams/apartment-floorplan.png" alt="Apartment floor plan" />
<p align="center"><em>Floor plan — rooms, furniture, doors, and dimensions</em></p>
</td>
<td width="50%">
<img src="docs/diagrams/onboarding-system.png" alt="Multi-angle system canvas" />
<p align="center"><em>Canvas session — 10 sections, 6 diagram types, one living file</em></p>
</td>
</tr>
</table>

## Install

```bash
# Clone the plugin into your Claude Code plugins directory
git clone https://github.com/anthropics/excalibrain.git ~/.claude/plugins/excalibrain

# Install dependencies
cd ~/.claude/plugins/excalibrain
npm install
npm run build-bundle   # one-time: builds the Excalidraw renderer
```

Or add it as a project plugin:

```bash
git clone https://github.com/anthropics/excalibrain.git .claude-plugin/excalibrain
```

## Usage

### Quick draw

Just ask Claude to draw something:

```
> draw the authentication flow for our API
> sequence diagram showing how orders are processed
> wireframe a settings page with dark mode toggle
> floor plan for a 2-bedroom apartment
```

Claude picks the diagram type, generates the layout, and writes an `.excalidraw` file.

### Canvas sessions

For complex systems, start a canvas session that builds incrementally:

```
> start a canvas for the payment system        # explore mode — iterative
> architect the microservices                   # architect mode — comprehensive
> storyboard the database migration             # storyboard mode — phased evolution
> wireframe the checkout flow                   # wireframe mode — screen mockups
```

Each turn adds a section. The canvas grows as understanding deepens. All sections merge into one living `.excalidraw` file.

### Slash commands

| Command | What it does |
|---------|-------------|
| `/draw` | Create a diagram from scratch |
| `/canvas` | Start or resume a canvas session |
| `/export` | Export to PNG or SVG |
| `/annotate` | Add notes to an existing diagram |

## Diagram types

The plugin picks the right type automatically based on what you're describing:

| Type | Best for | Layout engine |
|------|----------|--------------|
| **Architecture** | Service topology, infrastructure, components | dagre |
| **Flowchart** | Processes with decisions and branching | dagre |
| **Sequence** | Request/response flows between participants | mermaid |
| **State diagram** | Lifecycle states and transitions | dagre |
| **ER diagram** | Database schema and entity relationships | mermaid |
| **Mindmap** | Concept hierarchies and brainstorming | dagre |
| **Gantt chart** | Project timelines and schedules | gantt |
| **Storyboard** | System evolution across phases | dagre |
| **Wireframe** | UI mockups and screen flows | primitives |
| **Floor plan** | Spatial layouts with rooms and furniture | primitives |

A single canvas can mix diagram types freely — architecture overview + sequence detail + ER schema, all on one file.

## How it works

```
  Your prompt
       |
       v
  ┌─────────────┐     ┌──────────────────┐
  │  Skills      │────>│  Layout engines   │
  │  draw/canvas │     │  dagre / mermaid  │
  │  export/add  │     │  gantt / prims    │
  └─────────────┘     └──────────────────┘
       |                       |
       v                       v
  ┌─────────────┐     ┌──────────────────┐
  │  Agents      │     │  .excalidraw     │
  │  section-    │────>│  output file     │
  │  builder     │     │                  │
  └─────────────┘     └──────────────────┘
       |                       |
       v                       v
  ┌─────────────┐     ┌──────────────────┐
  │  Hooks       │     │  PNG / SVG       │
  │  fast-check  │     │  export          │
  │  canvas-guard│     │                  │
  └─────────────┘     └──────────────────┘
```

**Skills** define modes of operation (draw, canvas, export, add). **Tools** handle layout — dagre for graph-based diagrams, mermaid for sequences and ER, primitives for wireframes and floor plans. **Agents** parallelize multi-section builds. **Hooks** enforce quality (structural validation, visual checks, canvas session integrity).

## Project structure

```
.claude-plugin/        Plugin manifest
skills/
  draw/                Single diagram creation
  canvas/              Multi-section canvas sessions
  export/              PNG/SVG export with region support
  add/                 Merge elements into existing canvases
agents/
  section-builder.md   Parallel section generation
  canvas-validator.md  Visual quality validation
hooks/
  canvas-guard.js      Prevents accidental new files during sessions
  fast-check.js        Structural validation on save
  visual-check.js      Visual quality check on save
tools/
  dagre-layout.js      Graph JSON -> Excalidraw (auto-layout)
  mermaid-convert.js   Mermaid -> Excalidraw
  gantt-layout.js      Gantt chart layout
  primitives.js        Wireframe & floor plan primitives
  canvas-edit.js       Edit/delete/move/strip elements
  canvas-inspect.js    Read and query canvas contents
  export.js            Excalidraw -> PNG/SVG (puppeteer + sharp)
references/
  color-palette.md     Semantic color system
  graph-json-format.md Input format specification
  layout-rules.md      Spacing, typography, arrow styles
  diagram-recipes/     Per-type examples and patterns
```

## Development

```bash
npm install
npm run build-bundle   # builds excalidraw-bundle.js (one-time)
npm test               # all tests
```

### Test suites

```bash
npm run test:dagre       # dagre layout engine
npm run test:mermaid     # mermaid conversion
npm run test:export      # PNG/SVG export
npm run test:inspect     # canvas inspection
npm run test:merge       # merge/position/prefix
npm run test:fast-check  # structural validation hook
npm run test:primitives  # wireframe/floorplan primitives
npm run test:canvas-edit # canvas edit operations
```

## Key design decisions

**Diagrams should argue, not display.** Every diagram makes a visual argument — "Auth is the bottleneck", "Redis plays three roles", "failure always has a recovery path". The layout, color emphasis, and visual hierarchy serve the argument.

**One canvas, many types.** A single `.excalidraw` file can mix architecture, sequence, state, ER, and flowchart diagrams. Each section uses whichever type best argues its content.

**Two-phase build for multi-section canvases.** Section sizes vary wildly (a simple graph is 400px wide; a sequence diagram can be 4000px). The plugin measures each section first, computes non-overlapping positions from real sizes, then assembles — never guesses.

**Visual hierarchy is mandatory.** Hub nodes are larger with thicker strokes. Background services are muted with dashed borders. The eye finds the important parts first.

**Hooks enforce what skills suggest.** The canvas-guard hook blocks creating new files during active sessions. The fast-check hook validates structural integrity on every save. Rules that matter are enforced, not just documented.

## License

MIT
