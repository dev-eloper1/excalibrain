# Visual Thinking Philosophy

**"The agent should think BY drawing, not stop thinking TO draw."**

When the agent stops its reasoning flow to figure out how to call a diagram tool, the context becomes about the tool — not the idea. Visual creation must be native to the agent's thinking, not an external tool call.

## The Analogy

Skills solved this for text — they load capability into the agent's thinking, not as an external call. Libraries and components solve this for visuals — the agent says "place a postit here" and gets a grouped, styled element without thinking about rectangles, fonts, groupIds, or frameIds.

## Why This Matters

- When the agent constructs JSON, calculates coordinates, or debugs element properties, the human loses the thread of the conversation
- The diagram should emerge from the conversation, not interrupt it
- "A picture is worth a thousand words" only works if creating the picture doesn't cost a thousand words of setup

## Progressive Levels

### Level 1: Component Abstraction (current)
- `library-resolve.js` wraps element complexity behind simple component calls
- `postit({ text, x, y })` instead of manually constructing rect + text + groupIds
- Reduces cognitive overhead but still requires explicit tool calls

### Level 2: Inline Visual Thinking (next)
- The canvas skill generates diagrams as PART of its reasoning, not as a separate step
- When exploring an idea, the agent simultaneously writes to the canvas and explains in text
- Composition is incremental — each conversation turn adds to the canvas naturally
- No "Phase 1: measure, Phase 2: position, Phase 3: assemble" — just: think → draw → continue thinking

### Level 3: Visual Dialogue (future — requires Hermes)
- Agent and human share the same canvas as a conversation medium
- The human can draw/annotate, the agent can respond visually
- The canvas IS the conversation, not a product of it
- Requires: custom frontend, bidirectional canvas interaction, real-time rendering

### Level 4: Visual Fluency (vision)
- The agent thinks in visual patterns the way it thinks in words
- Library components become a visual vocabulary — as natural as using English words
- Complex ideas are expressed as diagram compositions, not described then translated
- "Show me the architecture" produces the same quality as "explain the architecture" — instantly

## Implementation Paths

### Path 1: Precomputed Recipes (fastest win)
The agent already knows "authentication system = architecture diagram with these nodes." Pre-baked recipes that resolve in one call eliminate deliberation:
```
resolve('recipe:3-tier-architecture', { services: ['Auth', 'API', 'DB'] })
```
One call, zero deliberation. The recipes ARE the visual vocabulary.

**What to build:**
- Expand `references/diagram-recipes/` with parameterized templates
- Add a `recipe` component type to `library-resolve.js` that takes a recipe name + parameters
- Common patterns: 3-tier architecture, CRUD flow, auth sequence, data pipeline, state machine
- Each recipe produces a complete section with correct diagram type, colors, zones, hierarchy

**Maps to:** Current work in this repo. No external dependencies.

### Path 2: Streaming Canvas (requires Hermes)
Instead of build-then-show, stream elements to a live canvas. Each node appears as the agent thinks of it. The human watches the diagram grow in real-time.

**What to build:**
- WebSocket connection between Claude Code and Hermes frontend
- Excalidraw React component in Hermes that accepts streaming element additions
- Modified dagre-layout.js that emits elements as they're positioned (not all at once)
- Live canvas URL that auto-refreshes as elements arrive

**Maps to:** Hermes project at `/Users/bhushan/Documents/Hermes`. Needs the custom frontend from R-003 (Chat View research).

### Path 3: Canvas as Context Window (the big one)
The canvas becomes part of the agent's context — like conversation history. The agent can "see" the current canvas state and add to it naturally, like adding a sentence to a paragraph.

**What to build:**
- Canvas state serialized into the agent's context (compact format, not full JSON)
- Agent outputs visual instructions inline with text responses
- Custom frontend renders both text and canvas updates in one unified view
- The continuous Knuth process (research → propose → decide → build) happens ON the canvas

**Maps to:** Hermes + future Claude capabilities (multimodal context, tool-use streaming).

## The Continuous Knuth Process Connection

Each level maps to the Hermes research-propose-decide-build loop operating on visual artifacts instead of text documents. The canvas becomes the shared working surface where:
- Research findings are visualized (not just documented)
- Proposals are diagrammed (not just described)
- Decisions are annotated on the diagram (not in a separate log)
- The build plan IS the diagram itself

## Guiding Principle

Every tool, skill, and component decision should be evaluated against:

> "Does this make visual creation more like thinking or more like tool-calling?"

Speed > polish for explore mode. A rough diagram in 2 seconds beats a perfect one in 30 seconds. Components exist to make the agent forget about elements and think about ideas. The composition layer should be invisible.
