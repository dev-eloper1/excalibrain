# Flowchart Recipe

**Tool:** `mermaid-convert.js` (Mermaid syntax)

## When to use
Step-by-step logic with conditional branching — user journeys, request lifecycles, decision trees, validation pipelines.

## Mermaid template

**IMPORTANT:** Always include `classDef` color classes. Without them, the flowchart renders as monochrome black and white.

```mermaid
flowchart TB
    A([Start]):::start --> B[Validate Input]:::process
    B --> C{Valid?}:::decision
    C -->|Yes| D[Process Request]:::success
    C -->|No| E[Return Error]:::error
    D --> F[Save to DB]:::data
    F --> G([End]):::start
    E --> G

    classDef start fill:#dbeafe,stroke:#1e40af,color:#1e40af
    classDef process fill:#86efac,stroke:#15803d,color:#15803d
    classDef decision fill:#fef3c7,stroke:#b45309,color:#b45309
    classDef error fill:#fecaca,stroke:#b91c1c,color:#b91c1c
    classDef success fill:#a7f3d0,stroke:#047857,color:#047857
    classDef data fill:#ddd6fe,stroke:#6d28d9,color:#6d28d9
```

### Standard classDef colors (from color-palette.md)

| Class | Purpose | fill | stroke | color |
|-------|---------|------|--------|-------|
| `start` | Start/End terminals | `#dbeafe` | `#1e40af` | `#1e40af` |
| `process` | Process steps | `#86efac` | `#15803d` | `#15803d` |
| `decision` | Decision diamonds | `#fef3c7` | `#b45309` | `#b45309` |
| `error` | Error/reject paths | `#fecaca` | `#b91c1c` | `#b91c1c` |
| `success` | Success/completion | `#a7f3d0` | `#047857` | `#047857` |
| `data` | Database/storage | `#ddd6fe` | `#6d28d9` | `#6d28d9` |
| `security` | Auth/security | `#fed7aa` | `#c2410c` | `#c2410c` |
| `async` | Async/queue | `#fef08a` | `#92400e` | `#92400e` |

### Shape syntax
- `[text]` — rectangle
- `{text}` — diamond (decision)
- `([text])` — rounded rectangle (start/end)
- `[(text)]` — cylinder (database)
- `((text))` — circle

### Edge syntax
- `-->` — solid arrow
- `-.->` — dashed arrow
- `-->|label|` — labeled arrow

### Applying classes
Append `:::className` to any node: `A([Start]):::start`

## Common pitfalls

1. **No colors without classDef** — Mermaid defaults to monochrome. Always define and apply classDef classes.
2. **Decision diamond labels too long** — Keep to ≤ 15 characters. Use abbreviations.
3. **Too many branches from one decision** — Split into cascading decisions.
4. **Forgetting the end node** — All paths should terminate at a named endpoint.
