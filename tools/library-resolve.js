#!/usr/bin/env node
/**
 * library-resolve.js
 *
 * Core module for the excalibrain component library.
 * Takes a component type + params and returns an array of Excalidraw elements
 * with correct grouping, binding, and styling.
 *
 * Usage as module:
 *   const { resolve, COMPONENTS } = require('./library-resolve');
 *   const elements = resolve('postit', { text: 'Hello', x: 100, y: 200 });
 *
 * Usage as CLI:
 *   node library-resolve.js postit --text "Hello" --x 100 --y 200
 *   node library-resolve.js components.json --output out.excalidraw
 *
 * Input JSON format (batch):
 *   {
 *     "components": [
 *       { "type": "postit", "text": "Note here", "x": 100, "y": 200 },
 *       { "type": "canvas-title", "title": "My Canvas", "subtitle": "desc", "x": 0, "y": -100 },
 *       { "type": "spine-arrow", "fromX": 500, "fromY": 400, "toX": 500, "toY": 700, "label": "next" },
 *       { "type": "section-frame", "name": "① Overview", "x": 0, "y": 0, "width": 800, "height": 600 }
 *     ]
 *   }
 */

const fs = require('fs');
const crypto = require('crypto');

// ── Helpers ─────────────────────────────────────────────────────────────────

let seedCounter = 50000;
function nextSeed() { return seedCounter++; }
function groupId() { return crypto.randomBytes(10).toString('hex'); }

function baseElement(id, type, x, y, w, h, overrides = {}) {
  return {
    type, id, x, y, width: w, height: h,
    angle: 0,
    strokeWidth: overrides.strokeWidth ?? 1,
    strokeStyle: overrides.strokeStyle ?? 'solid',
    roughness: overrides.roughness ?? 0,
    opacity: overrides.opacity ?? 100,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    groupIds: overrides.groupIds ?? [],
    boundElements: overrides.boundElements ?? null,
    frameId: overrides.frameId ?? null,
    link: null,
    locked: false,
    strokeColor: overrides.strokeColor ?? '#000000',
    backgroundColor: overrides.backgroundColor ?? 'transparent',
    fillStyle: overrides.fillStyle ?? 'solid',
    ...(overrides.extra || {}),
  };
}

function textElement(id, x, y, text, opts = {}) {
  const fontSize = opts.fontSize ?? 14;
  const fontFamily = opts.fontFamily ?? 1;
  const lines = text.split('\n');
  // Scale char width with font size — factor varies by font family
  const factor = fontFamily === 3 ? 0.62 : (fontFamily === 2 ? 0.58 : 0.6);
  const charWidth = fontSize * factor;
  const maxLen = Math.max(...lines.map(l => l.length));
  const w = opts.width ?? Math.ceil(maxLen * charWidth + 10);
  const h = lines.length * fontSize * 1.35;

  return baseElement(id, 'text', x, y, w, h, {
    strokeColor: opts.color ?? '#1e293b',
    roughness: 0,
    groupIds: opts.groupIds ?? [],
    frameId: opts.frameId ?? null,
    extra: {
      text,
      originalText: text,
      fontSize,
      fontFamily,
      textAlign: opts.textAlign ?? 'left',
      verticalAlign: opts.verticalAlign ?? 'top',
      containerId: null,
      autoResize: false,
      lineHeight: 1.25,
    },
  });
}

// ── Component: Post-it Note ─────────────────────────────────────────────────

function postit({ text, x, y, width, id }) {
  const PAD = 12;
  const prefix = id ?? `postit_${nextSeed()}`;
  const gid = groupId();

  const textEl = textElement(`${prefix}_text`, x, y, text, {
    fontSize: 13,
    fontFamily: 3,  // Cascadia monospace
    color: '#1e293b',
    width,
    groupIds: [gid],
  });

  const bgW = textEl.width + PAD * 2;
  const bgH = textEl.height + PAD * 2;

  const bgEl = baseElement(`${prefix}_bg`, 'rectangle',
    x - PAD, y - PAD, bgW, bgH, {
      strokeWidth: 1,
      roughness: 1,
      opacity: 90,
      strokeColor: '#e5be47',
      backgroundColor: '#fef9c3',
      groupIds: [gid],
      extra: { roundness: { type: 3 } },
    });

  return { elements: [bgEl, textEl], groupId: gid, bbox: { x: x - PAD, y: y - PAD, w: bgW, h: bgH } };
}

// ── Component: Spine Arrow ──────────────────────────────────────────────────

function spineArrow({ fromX, fromY, toX, toY, label, fromId, toId, id }) {
  const prefix = id ?? `spine_${nextSeed()}`;
  const gid = groupId();

  const dx = toX - fromX;
  const dy = toY - fromY;

  // Always straight 2-point lines. No curves, no L-shapes.
  // Multi-point arrows (curves, right-angles) pin to canvas coordinates
  // and don't move with frames — only 2-point straight lines work dynamically.
  const points = [[0, 0], [dx, dy]];

  // BINDING FIX: Excalidraw recalculates bound endpoints using a ray from
  // the adjacent point through the focus point (element center when focus=0).
  // We must set width/height correctly so hit testing and bounding box work.
  // The binding system will snap endpoints to frame borders when the editor loads.
  const arrowEl = baseElement(prefix, 'arrow', fromX, fromY,
    Math.abs(dx), Math.abs(dy), {
    strokeWidth: 3,
    strokeColor: '#6366f1',
    groupIds: [gid],
    extra: {
      points,
      startArrowhead: null,
      endArrowhead: 'triangle',
      startBinding: fromId ? { elementId: fromId, focus: 0, gap: 4 } : null,
      endBinding: toId ? { elementId: toId, focus: 0, gap: 4 } : null,
    },
  });

  const result = { elements: [arrowEl], groupId: gid };

  if (label) {
    // Place label at midpoint of arrow
    const midX = fromX + dx * 0.5;
    const midY = fromY + dy * 0.5;
    // Offset perpendicular to the arrow direction
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const offX = (-dy / dist) * 20;
    const offY = (dx / dist) * 20;

    const labelEl = textElement(`${prefix}_label`, midX + offX, midY + offY - 14, label, {
      fontSize: 20,
      fontFamily: 1,  // Virgil
      color: '#4f46e5',
      groupIds: [gid],
    });
    result.elements.push(labelEl);
  }

  return result;
}

// ── Component: Section Frame ────────────────────────────────────────────────

function sectionFrame({ name, x, y, width, height, id }) {
  const frameId = id ?? `frame_${nextSeed()}`;

  const frameEl = baseElement(frameId, 'frame', x, y, width, height, {
    strokeWidth: 2,
    strokeColor: '#bbb',
    roughness: 0,
    extra: { name: name ?? null, roundness: null },
  });

  return { elements: [frameEl], frameId };
}

// ── Component: Canvas Title ─────────────────────────────────────────────────

function canvasTitle({ title, subtitle, x, y, id }) {
  const prefix = id ?? `ctitle_${nextSeed()}`;
  const gid = groupId();

  // Calculate width — detect uppercase-heavy text and use wider factor
  const upperCount = (title.match(/[A-Z]/g) || []).length;
  const upperRatio = upperCount / title.length;
  const titleFactor = upperRatio > 0.5 ? 0.75 : 0.58;
  const titleWidth = Math.ceil(title.length * 32 * titleFactor + 20);

  const titleEl = textElement(`${prefix}_title`, x, y, title, {
    fontSize: 32,
    fontFamily: 2,  // Helvetica
    color: '#0f172a',
    width: titleWidth,
    groupIds: [gid],
  });

  const elements = [titleEl];

  if (subtitle) {
    const subEl = textElement(`${prefix}_sub`, x + 2, y + 44, subtitle, {
      fontSize: 15,
      fontFamily: 1,  // Virgil
      color: '#94a3b8',
      groupIds: [gid],
    });
    elements.push(subEl);
  }

  return { elements, groupId: gid };
}

// ── Component: Margin Note ──────────────────────────────────────────────────
// Lightweight floating annotation — no background, muted text.
// Use for right-margin observations, meta-commentary, quiet context.
// Different from postit: no yellow bg, lighter color, smaller font.

function marginNote({ text, x, y, color, id }) {
  const prefix = id ?? `mnote_${nextSeed()}`;

  const noteEl = textElement(prefix, x, y, text, {
    fontSize: 12,
    fontFamily: 3,  // Cascadia mono — same as postits for consistency
    color: color ?? '#94a3b8',
  });
  noteEl.opacity = 85;

  return { elements: [noteEl] };
}

// ── Utility: Flexbox Layout ─────────────────────────────────────────────────
// Position sections in a CSS flexbox-inspired grid.
// Input: array of { w, h } section sizes + config.
// Output: array of { x, y } positions.

function flexboxLayout({ sections, canvasWidth, rowGap = 300, rowAssignments }) {
  // rowAssignments: array of arrays, e.g. [[0], [1,2], [3,4], [5]]
  // means section 0 alone in row 1, sections 1&2 paired in row 2, etc.
  if (!rowAssignments) {
    // Default: each section gets its own row
    rowAssignments = sections.map((_, i) => [i]);
  }

  const positions = new Array(sections.length);
  let currentY = 0;

  for (const row of rowAssignments) {
    if (row.length === 1) {
      // Single section — center it
      const idx = row[0];
      const s = sections[idx];
      positions[idx] = { x: Math.round((canvasWidth - s.w) / 2), y: currentY };
      currentY += s.h + rowGap;
    } else if (row.length === 2) {
      // Paired — space-evenly
      const [i, j] = row;
      const si = sections[i], sj = sections[j];
      const totalContent = si.w + sj.w;
      const gap = Math.round((canvasWidth - totalContent) / 3);
      const rowH = Math.max(si.h, sj.h);

      positions[i] = { x: gap, y: currentY + Math.round((rowH - si.h) / 2) };
      positions[j] = { x: gap + si.w + gap, y: currentY + Math.round((rowH - sj.h) / 2) };
      currentY += rowH + rowGap;
    } else {
      // 3+ sections — space-evenly
      const totalContent = row.reduce((sum, idx) => sum + sections[idx].w, 0);
      const gapCount = row.length + 1;
      const gap = Math.round((canvasWidth - totalContent) / gapCount);
      const rowH = Math.max(...row.map(idx => sections[idx].h));
      let rx = gap;
      for (const idx of row) {
        const s = sections[idx];
        positions[idx] = { x: rx, y: currentY + Math.round((rowH - s.h) / 2) };
        rx += s.w + gap;
      }
      currentY += rowH + rowGap;
    }
  }

  return { positions, totalHeight: currentY - rowGap };
}

// ── Component: Sub-Frame (Virtual Nested Frame) ─────────────────────────────
// Excalidraw doesn't support nested frames (frameId on a frame is always null).
// A "sub-frame" simulates nested frame behavior using:
//   1. A rounded rectangle as the visual container
//   2. A label text in the top-left corner (like a frame name)
//   3. A shared groupId so all child elements move together
//   4. The container rect gets the parent's frameId, placing it inside the parent frame
//
// Returns a `childGroupIds` array — any elements placed inside this sub-frame
// should set their groupIds to [...childGroupIds] so they join the sub-frame group.
// For nested sub-frames, inner elements get [innerGroupId, outerGroupId] which
// gives Excalidraw's click-to-narrow group selection behavior.

function subFrame({ name, x, y, width, height, frameId, id,
                    borderColor, backgroundColor, labelColor, labelFontSize }) {
  const prefix = id ?? `subframe_${nextSeed()}`;

  // Sub-frames are purely visual — a rounded rectangle + label text.
  // They share the parent's frameId so they move with the parent frame.
  // No groupId tricks — elements inside frames already move with the frame.
  // The sub-frame border is just a visual boundary, not a structural container.

  const containerEl = baseElement(`${prefix}_border`, 'rectangle',
    x, y, width, height, {
      strokeWidth: 1.5,
      strokeColor: borderColor ?? '#d1d5db',
      backgroundColor: backgroundColor ?? '#f9fafb',
      fillStyle: 'solid',
      roughness: 0,
      opacity: 40,
      frameId: frameId ?? null,
      extra: { roundness: { type: 3, value: 12 } },
    });

  const elements = [containerEl];

  if (name) {
    const labelEl = textElement(`${prefix}_label`, x + 8, y + 4, name, {
      fontSize: labelFontSize ?? 12,
      fontFamily: 2,
      color: labelColor ?? '#9ca3af',
      frameId: frameId ?? null,
    });
    elements.push(labelEl);
  }

  return {
    elements,
    contentArea: {
      x: x + 10,
      y: y + 28,
      width: width - 20,
      height: height - 38,
    },
    bbox: { x, y, w: width, h: height },
  };
}

// ── Resolver ────────────────────────────────────────────────────────────────

const COMPONENTS = {
  'postit': postit,
  'spine-arrow': spineArrow,
  'section-frame': sectionFrame,
  'canvas-title': canvasTitle,
  'margin-note': marginNote,
  'sub-frame': subFrame,
};

function resolve(type, params) {
  const fn = COMPONENTS[type];
  if (!fn) throw new Error(`Unknown component type: ${type}. Available: ${Object.keys(COMPONENTS).join(', ')}`);
  return fn(params);
}

function resolveMany(specs) {
  const allElements = [];
  const results = [];
  for (const spec of specs) {
    const { type, ...params } = spec;
    const result = resolve(type, params);
    allElements.push(...result.elements);
    results.push(result);
  }

  // ── Post-processing: frame containment ──
  // Elements inside a frame's bounds get frameId set
  const frames = allElements.filter(e => e.type === 'frame');
  const nonFrames = allElements.filter(e => e.type !== 'frame');

  for (const frame of frames) {
    for (const el of nonFrames) {
      if (el.frameId) continue; // already assigned
      // Skip arrows that bind to frames (spine arrows) — they connect frames, not live inside them
        if (el.type === 'arrow') {
          const bindsToFrame = [el.startBinding, el.endBinding].some(b =>
            b && b.elementId && frames.some(f => f.id === b.elementId));
          if (bindsToFrame) continue;
        }
      // Check if element center is inside frame bounds
      const elCx = el.x + (el.width || 0) / 2;
      const elCy = el.y + (el.height || 0) / 2;
      if (elCx >= frame.x && elCx <= frame.x + frame.width &&
          elCy >= frame.y && elCy <= frame.y + frame.height) {
        el.frameId = frame.id;
      }
    }
  }

  // ── Post-processing: arrow binding ──
  // When arrows reference fromId/toId, add boundElements to the targets
  for (const el of allElements) {
    if (el.type !== 'arrow') continue;
    const addBound = (binding) => {
      if (!binding || !binding.elementId) return;
      const target = allElements.find(t => t.id === binding.elementId);
      if (target) {
        if (!target.boundElements) target.boundElements = [];
        if (!target.boundElements.find(b => b.id === el.id)) {
          target.boundElements.push({ id: el.id, type: 'arrow' });
        }
      }
    };
    addBound(el.startBinding);
    addBound(el.endBinding);
  }

  return { elements: allElements, results };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`Usage:
  node library-resolve.js <input.json> [--output file] [--merge file]
  node library-resolve.js postit --text "Note" --x 100 --y 200

Components: ${Object.keys(COMPONENTS).join(', ')}`);
    process.exit(0);
  }

  // Parse --output and --merge flags
  let outputPath = null;
  let mergePath = null;
  const flagIdx = (flag) => args.indexOf(flag);

  if (flagIdx('--output') >= 0) {
    outputPath = args[flagIdx('--output') + 1];
    args.splice(flagIdx('--output'), 2);
  }
  if (flagIdx('--merge') >= 0) {
    mergePath = args[flagIdx('--merge') + 1];
    args.splice(flagIdx('--merge'), 2);
  }

  let elements = [];

  // Check if first arg is a JSON file or a component type
  if (args[0].endsWith('.json')) {
    const input = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    const specs = input.components || [input];
    const result = resolveMany(specs);
    elements = result.elements;
  } else {
    // Inline component: type --param value --param value
    const type = args[0];
    const params = {};
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      let val = args[i + 1];
      // Auto-parse numbers
      if (!isNaN(val)) val = Number(val);
      params[key] = val;
    }
    const result = resolve(type, params);
    elements = result.elements;
  }

  // Build or merge into canvas
  let canvas;
  if (mergePath) {
    canvas = JSON.parse(fs.readFileSync(mergePath, 'utf8'));
    canvas.elements.push(...elements);

    // Post-merge: run frame containment across ALL canvas elements
    // (not just the new ones — existing section elements need frameId too)
    const allFrames = canvas.elements.filter(e => e.type === 'frame');
    for (const frame of allFrames) {
      for (const el of canvas.elements) {
        if (el.frameId) continue;
        if (el.type === 'frame') continue;
        // Skip arrows that bind to frames (spine arrows) — they connect frames, not live inside them
        if (el.type === 'arrow') {
          const bindsToFrame = [el.startBinding, el.endBinding].some(b =>
            b && b.elementId && allFrames.some(f => f.id === b.elementId));
          if (bindsToFrame) continue;
        }
        const elCx = el.x + (el.width || 0) / 2;
        const elCy = el.y + (el.height || 0) / 2;
        if (elCx >= frame.x && elCx <= frame.x + frame.width &&
            elCy >= frame.y && elCy <= frame.y + frame.height) {
          el.frameId = frame.id;
        }
      }
    }

    // Post-merge: z-order fix — sub-frame borders must render BEHIND content
    // Move sub-frame elements (border + label) before their contained content
    const subFrameBorders = canvas.elements.filter(e =>
      e.id && e.id.endsWith('_border') && e.id.includes('subframe') &&
      e.type === 'rectangle');

    for (const sf of subFrameBorders) {
      const sfPrefix = sf.id.replace('_border', '');
      const sfLabel = canvas.elements.find(e => e.id === `${sfPrefix}_label`);
      const sfElements = [sf];
      if (sfLabel) sfElements.push(sfLabel);

      // Find earliest content element inside this sub-frame's bounds
      let earliestIdx = canvas.elements.length;
      for (let i = 0; i < canvas.elements.length; i++) {
        const el = canvas.elements[i];
        if (sfElements.includes(el)) continue;
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        if (cx >= sf.x && cx <= sf.x + sf.width &&
            cy >= sf.y && cy <= sf.y + sf.height) {
          earliestIdx = Math.min(earliestIdx, i);
          break;
        }
      }

      // Move sub-frame elements before content
      canvas.elements = canvas.elements.filter(e => !sfElements.includes(e));
      canvas.elements.splice(Math.min(earliestIdx, canvas.elements.length), 0, ...sfElements);
    }

    // Post-merge: register boundElements on targets for all arrows
    for (const el of canvas.elements) {
      if (el.type !== 'arrow') continue;
      const addBound = (binding) => {
        if (!binding || !binding.elementId) return;
        const target = canvas.elements.find(t => t.id === binding.elementId);
        if (target) {
          if (!target.boundElements) target.boundElements = [];
          if (!target.boundElements.find(b => b.id === el.id)) {
            target.boundElements.push({ id: el.id, type: 'arrow' });
          }
        }
      };
      addBound(el.startBinding);
      addBound(el.endBinding);
    }
  } else {
    canvas = {
      type: 'excalidraw',
      version: 2,
      source: 'https://excalidraw.com',
      elements,
      appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
      files: {},
    };
  }

  const output = JSON.stringify(canvas, null, 2);
  if (outputPath) {
    fs.writeFileSync(outputPath, output);
    console.log(JSON.stringify({ components: elements.length, output: outputPath }));
  } else {
    process.stdout.write(output);
  }
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = { resolve, resolveMany, COMPONENTS, postit, spineArrow, sectionFrame, canvasTitle, marginNote, subFrame, flexboxLayout };
