# E-Commerce Microservices Architecture Diagram

## User Prompt

> "Diagram a microservices e-commerce platform with: Browser and Mobile clients, an API Gateway, Auth Service, Product Catalog, Order Service, Payment Service, a message queue (RabbitMQ), PostgreSQL database, and Redis cache. Show the data flow between them."

## Type Selection: Architecture

**Why:** The request explicitly mentions "microservices", "API Gateway", multiple services, databases, and caches. The diagram-type-rubric.md maps "architecture", "services", "microservices", "components" directly to the **Architecture** type. No ambiguity or tie-breaking needed.

## Path: Dagre (not Mermaid)

**Why:** The SKILL.md workflow specifies that architecture diagrams use the **Dagre path** (`dagre-layout.js` with graph JSON input). Mermaid is reserved for flowchart, sequence, class, and ER diagrams. The dagre path provides zone backgrounds, color-coded nodes, and automatic layout positioning that architecture diagrams require.

## Input File Content

See `ecommerce-graph.json` in this directory. Key design decisions:

- **5 zones**: CLIENTS (blue), GATEWAY (green), SERVICES (orange), ASYNC (amber), DATA (purple)
- **10 nodes**: Browser, Mobile App, API Gateway, Auth Service, Product Catalog, Order Service, Payment Service, RabbitMQ, PostgreSQL, Redis Cache
- **13 edges** with color-coded arrows:
  - Black (`#1e1e1e`): primary request flow (HTTPS, REST)
  - Orange (`#c2410c`): auth/security flow (verify token)
  - Amber dashed (`#a16207`): async/queue/cache flow (order.created, process payment, sessions, cache)
  - Purple (`#6d28d9`): data read/write flow (PostgreSQL connections)
- Colors follow `color-palette.md` semantic categories exactly

## Commands Run with Timing

| Step | Command | Duration |
|------|---------|----------|
| Generate | `node tools/dagre-layout.js examples/architecture/ecommerce-graph.json --output examples/architecture/ecommerce.excalidraw` | 0.059s |
| Export PNG | `node tools/export.js examples/architecture/ecommerce.excalidraw --format png --output examples/architecture/ecommerce.png` | 2.465s |

Total generation time: ~2.5 seconds.

## Visual Verification Notes (from reading PNG)

**Checklist results:**

- [x] All 10 nodes labeled and readable
- [x] No label text overlapping node borders
- [x] All 13 expected connections present
- [x] Arrow directions correct (top-to-bottom flow: clients -> gateway -> services -> data)
- [x] Color coding consistent with color-palette.md
- [x] Arrow styles differentiate relationship types (solid=sync, dashed=async)
- [x] Isomorphism test: layered structure with distinct zone colors communicates architecture without labels

**Minor observations:**
- The ASYNC and DATA zone labels are positioned close together due to dagre's automatic zone sizing
- Auth Service was placed slightly outside the SERVICES zone bounding box by the layout engine
- These are cosmetic issues from automatic layout; the diagram is structurally correct and fully readable

## Final Output Files

| File | Description |
|------|-------------|
| `ecommerce-graph.json` | Dagre graph JSON input (source of truth) |
| `ecommerce.excalidraw` | Native Excalidraw file (editable) |
| `ecommerce.png` | Exported PNG (869x905px, 58KB) |

![Architecture diagram showing e-commerce microservices platform](./ecommerce.png)
