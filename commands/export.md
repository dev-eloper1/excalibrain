---
name: export
description: Export an Excalidraw canvas to PNG or SVG
argument-hint: "[file] [--format png|svg] [--region <frame or x,y,w,h>]"
---

Export a canvas or region to PNG/SVG. Uses the excalibrain:export skill.

## Usage
- `/excalibrain:export` — export the current/most recent canvas as PNG
- `/excalibrain:export diagram.excalidraw` — export a specific file
- `/excalibrain:export --format svg` — export as SVG
- `/excalibrain:export --region "Client Layer"` — export a specific section

When invoked, use the excalibrain:export skill.
