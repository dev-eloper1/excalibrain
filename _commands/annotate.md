---
name: annotate
description: Add a reasoning note to a canvas section
argument-hint: "<section> <note>"
---

Quick-add an annotation to a canvas section.

## Usage
`/excalibrain:annotate <section-name> <note text>`

## Examples
- `/excalibrain:annotate auth-layer "Chose JWT over sessions for stateless scaling"`
- `/excalibrain:annotate data-flow "Redis cache here because writes are bursty"`

Adds a free-text annotation near the named section on the active canvas. Updates the sidecar.

When invoked, use the excalibrain:add skill to place the annotation.
