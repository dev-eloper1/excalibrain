# Diagram Type Rubric

Use this file to select the correct diagram type before generating. Read the context signals, pick the best match, mention it to the user, and proceed. Only ask the user when there is a structural incompatibility between an explicit type keyword and the content.

---

## Decision Table

| Context signals in the request | Diagram type |
|---|---|
| "architecture", "system diagram", "infrastructure", "services", "microservices", "components", "how the system is structured", documenting a codebase's top-level structure | **Architecture** |
| "sequence", "API call", "request/response", "how A calls B", "time-ordered", "auth flow", "message flow", interactions between named participants over time | **Sequence** |
| "flow", "flowchart", "process", "steps", "decision", "if/else", "how does X work", "what happens when", branching logic or conditional paths | **Flowchart** |
| "classes", "objects", "inheritance", "interface", "data model", "OOP structure", "schema as classes", relationships between types in code | **Class diagram** |
| "states", "state machine", "lifecycle", "transitions", "what state can X be in", order status, user account states, workflow states | **State diagram** |
| "tables", "database schema", "entity relationship", "foreign key", "ER diagram", "data model" (when referring to DB tables not code classes) | **ER diagram** |
| "timeline", "schedule", "milestones", "gantt", "sprint plan", "project plan", "weeks", "phases", when content is time-bound tasks with durations | **Gantt chart** |
| "mind map", "concepts", "brainstorming", "topic map", "explore ideas", "key concepts of", radial concept exploration without linear flow | **Mindmap** |

---

## Tie-breaking Rule

When two types could work, pick the one that is **structurally simpler** — fewer distinct node types, fewer arrow styles, fewer zones. Examples:
- "document the order service" could be Architecture or Flowchart → prefer Flowchart (simpler: rectangles + arrows, no zones)
- "show how user and post relate" could be Class diagram or ER diagram → prefer ER if the user said "database" or "tables"; prefer Class if they said "code" or "objects"
- "map out the concepts" could be Mindmap or Flowchart → prefer Mindmap (no directional logic implied)

---

## Fallback

If no type matches clearly, default to **Flowchart** and note the assumption:
> "I'll use a flowchart for this — let me know if you'd prefer a different diagram type."

---

## Conflict Rule (only case where you ask before proceeding)

Ask the user when their **explicit type keyword** is structurally incompatible with the content:
- "draw a sequence diagram of our database schema" — sequence requires time-ordered participant interactions; a schema has none → ask: "A sequence diagram shows interactions over time — for a schema, an ER diagram would fit better. Would you like that instead?"
- "create a gantt chart of our microservices" — Gantt requires time-bounded tasks; services aren't tasks → ask: "A Gantt chart shows tasks on a timeline — for microservices, an architecture diagram would fit better. Want that?"

In all other cases of ambiguity (two types could work, content is vague), use the tie-breaking rule and proceed silently.

---

## Default behavior

1. Pick the best type using this table
2. Say: *"I'll generate a [type] diagram for this."*
3. Proceed — user can redirect if they want something different
4. Only pause and ask when the explicit keyword conflicts with the content structure
