# Sequence Diagram: OAuth 2.0 Authorization Code Flow

## Prompt

> "Show me a sequence diagram of OAuth 2.0 authorization code flow: User opens app, app redirects to auth server, user logs in, auth server returns authorization code, app exchanges code for tokens with auth server, auth server returns access + refresh tokens, app calls resource server with access token, resource server validates and returns data."

## Type Selection Reasoning

The rubric in `diagram-type-rubric.md` maps requests containing "sequence", "auth flow", "request/response", and "interactions between named participants over time" to **Sequence** diagrams. The user explicitly said "sequence diagram" and described time-ordered message exchanges between four named participants (User, App, Auth Server, Resource Server). No conflict between keyword and content -- proceed directly.

## Path Choice

**Mermaid path** -- per SKILL.md, sequence diagrams use `mermaid-convert.js`. Write `.mmd` file, convert to `.excalidraw`.

## Input Content

Four participants, eight messages covering the full OAuth 2.0 authorization code grant:

| # | From | To | Message |
|---|------|----|---------|
| 1 | User | App | Opens application |
| 2 | App | Auth Server | Redirect to /authorize (client_id, redirect_uri, scope, state) |
| 3 | User | Auth Server | Submits credentials (username, password) |
| 4 | Auth Server | App | Redirect to redirect_uri with authorization_code + state |
| 5 | App | Auth Server | POST /token (authorization_code, client_id, client_secret) |
| 6 | Auth Server | App | 200 OK { access_token, refresh_token, expires_in } |
| 7 | App | Resource Server | GET /resource (Authorization: Bearer access_token) |
| 8 | Resource Server | App | 200 OK { protected data } |

Additionally, a `Note over User,AuthServer` spanning note highlights the authentication step.

## Commands

```bash
# Step 4a: Write Mermaid syntax
# (wrote oauth2-auth-code-flow.mmd)

# Step 4b: Convert to Excalidraw
node tools/mermaid-convert.js examples/sequence/oauth2-auth-code-flow.mmd \
  --output examples/sequence/oauth2-auth-code-flow.excalidraw

# Step 5: Export PNG for validation
node tools/export.js examples/sequence/oauth2-auth-code-flow.excalidraw \
  --format png --output examples/sequence/oauth2-auth-code-flow.png
```

## Timing

- Mermaid conversion: produced 38 native Excalidraw elements, 37,746 bytes
- PNG export: 1034 x 623 px, 66,635 bytes
- Iterations: 1 (passed validation on first attempt)

## Verification

| Check | Result |
|-------|--------|
| All nodes labeled and readable | Pass -- 4 participants clearly labeled top and bottom |
| No label/border overlap | Pass |
| All expected connections present | Pass -- all 8 messages rendered |
| Arrow directions correct | Pass -- solid arrows for requests, dashed for responses |
| Color coding consistent | Pass -- yellow note highlight, gray participant boxes |
| Isomorphism test | Pass -- temporal flow and participant roles clear from structure alone |

## Output Files

- `oauth2-auth-code-flow.mmd` -- Mermaid source
- `oauth2-auth-code-flow.excalidraw` -- Editable Excalidraw diagram
- `oauth2-auth-code-flow.png` -- Rendered PNG

![Sequence diagram showing OAuth 2.0 authorization code flow](oauth2-auth-code-flow.png)
