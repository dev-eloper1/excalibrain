# Class Diagram — Blog Platform

A class diagram showing the static structure of a blog platform with User, Post, Comment, and Tag entities.

![Class diagram showing blog platform entities and relationships](diagram.png)

## Entities

- **User** — id, username, email, passwordHash; methods createPost(), addComment()
- **Post** — id, title, body, publishedAt, authorId; methods publish(), archive()
- **Comment** — id, body, createdAt, postId, authorId
- **Tag** — id, name, slug

## Relationships

| From | To | Type | Label |
|------|-----|------|-------|
| User | Post | one-to-many | writes |
| User | Comment | one-to-many | writes |
| Post | Comment | one-to-many | has |
| Post | Tag | many-to-many | tagged_with |

## How it was generated

1. Wrote Mermaid class diagram syntax to `class.mmd`
2. Converted with `mermaid-convert.js` (~2.5s)
3. Exported PNG with `export.js` (~2.4s)

**Path:** Mermaid → Excalidraw → PNG
