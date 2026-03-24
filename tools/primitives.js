#!/usr/bin/env node
/**
 * primitives.js
 *
 * Generates wireframe UI components as .excalidraw elements.
 *
 * Input format:
 * {
 *   "primitives": [
 *     { "type": "screen", "x": 0, "y": 0, "size": "mobile", "title": "Sign Up" },
 *     { "type": "button", "x": 55, "y": 600, "label": "Sign Up", "variant": "primary" },
 *     { "type": "input", "x": 55, "y": 200, "placeholder": "Email", "label": "Email" }
 *   ]
 * }
 *
 * Usage:
 *   node primitives.js <input.json> [--merge <file>] [--position x,y] [--output <file>]
 */

const fs = require('fs');
const path = require('path');

// ── CLI arg parsing ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {};
let inputPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--merge')    { flags.merge    = args[++i]; }
  else if (args[i] === '--position') { flags.position = args[++i]; }
  else if (args[i] === '--output')   { flags.output   = args[++i]; }
  else if (!args[i].startsWith('--')) { inputPath = args[i]; }
}

// ── Read input ───────────────────────────────────────────────────────────────
let raw;
if (inputPath) {
  raw = fs.readFileSync(inputPath, 'utf8');
} else {
  raw = fs.readFileSync(0, 'utf8'); // stdin
}
const input = JSON.parse(raw);

// ── ID generation ────────────────────────────────────────────────────────────
let idCounter = 10001;
function nextId() {
  return `wf_${idCounter++}`;
}

// ── Element helpers ──────────────────────────────────────────────────────────
function rect(id, x, y, w, h, opts = {}) {
  return {
    id,
    type: 'rectangle',
    x, y, width: w, height: h,
    strokeColor: opts.stroke || '#1e1e1e',
    backgroundColor: opts.fill || 'transparent',
    fillStyle: opts.fill && opts.fill !== 'transparent' ? 'solid' : 'hachure',
    strokeWidth: opts.strokeWidth !== undefined ? opts.strokeWidth : 1,
    roughness: opts.roughness !== undefined ? opts.roughness : 1,
    opacity: 100,
    roundness: opts.rounded ? { type: 3 } : null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000000),
    isDeleted: false,
    boundElements: opts.boundElements || null,
    groupIds: opts.groupIds || [],
    frameId: opts.frameId || null,
    link: null,
    locked: false,
    customData: opts.customData || undefined,
  };
}

function text(id, x, y, w, h, content, opts = {}) {
  return {
    id,
    type: 'text',
    x, y, width: w, height: h,
    text: content,
    fontSize: opts.fontSize || 16,
    fontFamily: opts.fontFamily || 1, // Virgil
    textAlign: opts.textAlign || 'center',
    verticalAlign: opts.verticalAlign || 'middle',
    strokeColor: opts.color || '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    roughness: 1,
    opacity: 100,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000000),
    isDeleted: false,
    containerId: opts.containerId || null,
    boundElements: null,
    groupIds: opts.groupIds || [],
    frameId: opts.frameId || null,
    originalText: content,
    autoResize: true,
    lineHeight: 1.25,
    link: null,
    locked: false,
  };
}

function ellipse(id, x, y, w, h, opts = {}) {
  return {
    id,
    type: 'ellipse',
    x, y, width: w, height: h,
    strokeColor: opts.stroke || '#1e1e1e',
    backgroundColor: opts.fill || 'transparent',
    fillStyle: opts.fill && opts.fill !== 'transparent' ? 'solid' : 'hachure',
    strokeWidth: opts.strokeWidth !== undefined ? opts.strokeWidth : 1,
    roughness: opts.roughness !== undefined ? opts.roughness : 1,
    opacity: 100,
    roundness: { type: 2 },
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000000),
    isDeleted: false,
    boundElements: opts.boundElements || null,
    groupIds: opts.groupIds || [],
    frameId: opts.frameId || null,
    link: null,
    locked: false,
  };
}

function line(id, x, y, points, opts = {}) {
  return {
    id,
    type: 'line',
    x, y,
    width: Math.abs(points[points.length - 1][0] - points[0][0]),
    height: Math.abs(points[points.length - 1][1] - points[0][1]),
    points,
    strokeColor: opts.stroke || '#e5e7eb',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: opts.strokeWidth !== undefined ? opts.strokeWidth : 1,
    roughness: opts.roughness !== undefined ? opts.roughness : 1,
    opacity: 100,
    roundness: null,
    seed: Math.floor(Math.random() * 100000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000000),
    isDeleted: false,
    boundElements: null,
    groupIds: opts.groupIds || [],
    frameId: opts.frameId || null,
    link: null,
    locked: false,
    startArrowhead: null,
    endArrowhead: null,
  };
}

// ── Primitive generators ─────────────────────────────────────────────────────

const SCREEN_SIZES = {
  mobile:  { w: 390, h: 780, statusBar: 20, titleBar: 44 },
  desktop: { w: 1280, h: 800, statusBar: 0, titleBar: 32 },
  tablet:  { w: 768, h: 1024, statusBar: 20, titleBar: 44 },
};

function generateScreen(p) {
  const size = SCREEN_SIZES[p.size || 'mobile'];
  const x = p.x || 0, y = p.y || 0;
  const groupId = nextId();
  const els = [];

  // Outer frame
  els.push(rect(nextId(), x, y, size.w, size.h, {
    stroke: '#1e1e1e',
    rounded: true,
    groupIds: [groupId],
  }));

  // Status bar (if present)
  if (size.statusBar > 0) {
    els.push(rect(nextId(), x, y, size.w, size.statusBar, {
      fill: '#f3f4f6',
      stroke: '#e5e7eb',
      groupIds: [groupId],
    }));
  }

  // Title bar
  const titleY = y + size.statusBar;
  els.push(rect(nextId(), x, titleY, size.w, size.titleBar, {
    fill: '#f9fafb',
    stroke: '#e5e7eb',
    groupIds: [groupId],
  }));

  // Title text
  const title = p.title || 'Screen';
  els.push(text(nextId(), x, titleY, size.w, size.titleBar, title, {
    fontSize: 16,
    color: '#1e1e1e',
    textAlign: 'center',
    verticalAlign: 'middle',
    groupIds: [groupId],
  }));

  return els;
}

function generateButton(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 120, h = p.height || 40;
  const label = p.label || 'Button';
  const variant = p.variant || 'primary';
  const groupId = nextId();

  const variants = {
    primary:   { fill: '#3b82f6', stroke: '#2563eb', textColor: '#ffffff' },
    secondary: { fill: '#e5e7eb', stroke: '#d1d5db', textColor: '#374151' },
    outline:   { fill: 'transparent', stroke: '#3b82f6', textColor: '#3b82f6' },
  };
  const v = variants[variant] || variants.primary;

  const rectId = nextId();
  const textId = nextId();

  const els = [];
  els.push(rect(rectId, x, y, w, h, {
    fill: v.fill,
    stroke: v.stroke,
    rounded: true,
    groupIds: [groupId],
    boundElements: [{ id: textId, type: 'text' }],
  }));
  els.push(text(textId, x, y, w, h, label, {
    color: v.textColor,
    fontSize: 14,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: rectId,
    groupIds: [groupId],
  }));

  return els;
}

function generateInput(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 280, h = p.height || 40;
  const groupId = nextId();
  const els = [];

  // Optional label above
  if (p.label) {
    els.push(text(nextId(), x, y - 20, w, 16, p.label, {
      fontSize: 12,
      color: '#374151',
      textAlign: 'left',
      verticalAlign: 'top',
      groupIds: [groupId],
    }));
  }

  // Input rectangle
  els.push(rect(nextId(), x, y, w, h, {
    fill: '#ffffff',
    stroke: '#d1d5db',
    rounded: true,
    groupIds: [groupId],
  }));

  // Placeholder text
  const placeholder = p.placeholder || '';
  if (placeholder) {
    els.push(text(nextId(), x + 8, y, w - 16, h, placeholder, {
      fontSize: 14,
      color: '#9ca3af',
      textAlign: 'left',
      verticalAlign: 'middle',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateTextarea(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 280, h = p.height || 120;
  const groupId = nextId();
  const els = [];

  // Optional label
  if (p.label) {
    els.push(text(nextId(), x, y - 20, w, 16, p.label, {
      fontSize: 12,
      color: '#374151',
      textAlign: 'left',
      verticalAlign: 'top',
      groupIds: [groupId],
    }));
  }

  els.push(rect(nextId(), x, y, w, h, {
    fill: '#ffffff',
    stroke: '#d1d5db',
    rounded: true,
    groupIds: [groupId],
  }));

  const placeholder = p.placeholder || '';
  if (placeholder) {
    els.push(text(nextId(), x + 8, y + 8, w - 16, 20, placeholder, {
      fontSize: 14,
      color: '#9ca3af',
      textAlign: 'left',
      verticalAlign: 'top',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateCard(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 280;
  const title = p.title || 'Card';
  const body = p.body || '';
  const h = p.height || (body ? 120 : 80);
  const groupId = nextId();
  const els = [];

  els.push(rect(nextId(), x, y, w, h, {
    stroke: '#e5e7eb',
    fill: '#ffffff',
    rounded: true,
    groupIds: [groupId],
  }));

  els.push(text(nextId(), x + 16, y + 12, w - 32, 20, title, {
    fontSize: 16,
    color: '#1e1e1e',
    textAlign: 'left',
    verticalAlign: 'top',
    groupIds: [groupId],
  }));

  if (body) {
    els.push(text(nextId(), x + 16, y + 40, w - 32, 20, body, {
      fontSize: 14,
      color: '#6b7280',
      textAlign: 'left',
      verticalAlign: 'top',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateNavBar(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 390, h = p.height || 56;
  const items = p.items || ['Home', 'Search', 'Profile'];
  const groupId = nextId();
  const els = [];

  els.push(rect(nextId(), x, y, w, h, {
    fill: '#f9fafb',
    stroke: '#e5e7eb',
    groupIds: [groupId],
  }));

  const itemWidth = w / items.length;
  for (let i = 0; i < items.length; i++) {
    els.push(text(nextId(), x + i * itemWidth, y, itemWidth, h, items[i], {
      fontSize: 14,
      color: '#374151',
      textAlign: 'center',
      verticalAlign: 'middle',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateModal(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 320, h = p.height || 240;
  const title = p.title || 'Modal';
  const groupId = nextId();
  const els = [];

  // Modal background
  els.push(rect(nextId(), x, y, w, h, {
    fill: '#ffffff',
    stroke: '#d1d5db',
    rounded: true,
    groupIds: [groupId],
  }));

  // Title
  els.push(text(nextId(), x + 16, y + 12, w - 64, 24, title, {
    fontSize: 18,
    color: '#1e1e1e',
    textAlign: 'left',
    verticalAlign: 'middle',
    groupIds: [groupId],
  }));

  // Close X
  els.push(text(nextId(), x + w - 40, y + 12, 24, 24, 'X', {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    verticalAlign: 'middle',
    groupIds: [groupId],
  }));

  return els;
}

function generateDivider(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 280;

  return [
    line(nextId(), x, y, [[0, 0], [w, 0]], {
      stroke: '#e5e7eb',
    }),
  ];
}

function generateImagePlaceholder(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 200, h = p.height || 150;
  const groupId = nextId();
  const els = [];

  // Border rect
  els.push(rect(nextId(), x, y, w, h, {
    stroke: '#d1d5db',
    groupIds: [groupId],
  }));

  // Cross lines
  els.push(line(nextId(), x, y, [[0, 0], [w, h]], {
    stroke: '#d1d5db',
    groupIds: [groupId],
  }));
  els.push(line(nextId(), x + w, y, [[0, 0], [-w, h]], {
    stroke: '#d1d5db',
    groupIds: [groupId],
  }));

  // "image" label
  els.push(text(nextId(), x, y + h / 2 - 10, w, 20, p.label || 'image', {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    verticalAlign: 'middle',
    groupIds: [groupId],
  }));

  return els;
}

function generateAvatar(p) {
  const x = p.x || 0, y = p.y || 0;
  const size = p.size || 40;
  const initials = p.initials || '?';
  const groupId = nextId();
  const els = [];

  els.push(ellipse(nextId(), x, y, size, size, {
    fill: '#e5e7eb',
    stroke: '#d1d5db',
    groupIds: [groupId],
  }));

  els.push(text(nextId(), x, y, size, size, initials, {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    verticalAlign: 'middle',
    groupIds: [groupId],
  }));

  return els;
}

function generateListItem(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 280, h = p.height || 64;
  const title = p.title || 'Item';
  const subtitle = p.subtitle || '';
  const hasAvatar = p.avatar !== false && p.avatar !== undefined;
  const groupId = nextId();
  const els = [];

  // Row background
  els.push(rect(nextId(), x, y, w, h, {
    stroke: '#e5e7eb',
    fill: '#ffffff',
    groupIds: [groupId],
  }));

  let textX = x + 12;

  // Optional avatar
  if (hasAvatar) {
    const avatarSize = 32;
    const avatarY = y + (h - avatarSize) / 2;
    els.push(ellipse(nextId(), textX, avatarY, avatarSize, avatarSize, {
      fill: '#e5e7eb',
      stroke: '#d1d5db',
      groupIds: [groupId],
    }));
    const initials = typeof p.avatar === 'string' ? p.avatar : '?';
    els.push(text(nextId(), textX, avatarY, avatarSize, avatarSize, initials, {
      fontSize: 12,
      color: '#374151',
      textAlign: 'center',
      verticalAlign: 'middle',
      groupIds: [groupId],
    }));
    textX += 40;
  }

  // Title
  const titleY = subtitle ? y + 12 : y + (h - 20) / 2;
  els.push(text(nextId(), textX, titleY, w - (textX - x) - 12, 20, title, {
    fontSize: 16,
    color: '#1e1e1e',
    textAlign: 'left',
    verticalAlign: 'top',
    groupIds: [groupId],
  }));

  // Subtitle
  if (subtitle) {
    els.push(text(nextId(), textX, y + 34, w - (textX - x) - 12, 18, subtitle, {
      fontSize: 14,
      color: '#6b7280',
      textAlign: 'left',
      verticalAlign: 'top',
      groupIds: [groupId],
    }));
  }

  return els;
}

// ── Floor plan primitive generators ──────────────────────────────────────────

function generateRoom(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.w || 300, h = p.h || 200;
  const label = p.label || '';
  const groupId = nextId();
  const els = [];

  els.push(rect(nextId(), x, y, w, h, {
    stroke: p.stroke || '#1e1e1e',
    fill: p.fill || 'transparent',
    strokeWidth: 2,
    groupIds: [groupId],
  }));

  if (label) {
    els.push(text(nextId(), x, y, w, h, label, {
      fontSize: 16,
      color: p.labelColor || '#1e1e1e',
      textAlign: 'center',
      verticalAlign: 'middle',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateDoor(p) {
  const x = p.x || 0, y = p.y || 0;
  const wall = p.wall || 'n';
  const swing = p.swing || 'right';
  const w = p.width || 80;
  const groupId = nextId();
  const els = [];

  // Generate arc points (quarter circle, 6 points)
  const arcPoints = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const angle = (Math.PI / 2) * (i / steps);
    arcPoints.push([Math.cos(angle) * w, -Math.sin(angle) * w]);
  }

  if (wall === 'n' || wall === 's') {
    const flipY = wall === 's' ? -1 : 1;
    const flipX = swing === 'left' ? -1 : 1;

    // Gap cover line (white line to "erase" wall)
    els.push(line(nextId(), x, y, [[0, 0], [w * flipX, 0]], {
      stroke: '#ffffff',
      strokeWidth: 4,
      groupIds: [groupId],
    }));

    // Swing arc
    const swingPoints = arcPoints.map(([px, py]) => [px * flipX, py * flipY]);
    els.push(line(nextId(), x, y, swingPoints, {
      stroke: '#1e1e1e',
      strokeWidth: 1,
      groupIds: [groupId],
    }));
  } else {
    // e/w walls
    const flipX = wall === 'w' ? 1 : -1;
    const flipY = swing === 'left' ? -1 : 1;

    // Gap cover line
    els.push(line(nextId(), x, y, [[0, 0], [0, w * flipY]], {
      stroke: '#ffffff',
      strokeWidth: 4,
      groupIds: [groupId],
    }));

    // Swing arc (rotated 90 degrees)
    const swingPoints = arcPoints.map(([px, py]) => [-py * flipX, px * flipY]);
    els.push(line(nextId(), x, y, swingPoints, {
      stroke: '#1e1e1e',
      strokeWidth: 1,
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateWindow(p) {
  const x = p.x || 0, y = p.y || 0;
  const wall = p.wall || 'n';
  const w = p.width || 100;

  const pts = (wall === 'n' || wall === 's')
    ? [[0, 0], [w, 0]]
    : [[0, 0], [0, w]];

  const el = line(nextId(), x, y, pts, {
    stroke: '#1e1e1e',
    strokeWidth: 2,
  });
  el.strokeStyle = 'dashed';
  return [el];
}

function generateWall(p) {
  const x1 = p.x1 || 0, y1 = p.y1 || 0;
  const x2 = p.x2 || 0, y2 = p.y2 || 0;
  const thickness = p.thickness || 2;

  return [
    line(nextId(), x1, y1, [[0, 0], [x2 - x1, y2 - y1]], {
      stroke: '#1e1e1e',
      strokeWidth: thickness,
    }),
  ];
}

const BED_SIZES = {
  single: { w: 90, h: 190 },
  double: { w: 140, h: 190 },
  queen:  { w: 160, h: 200 },
  king:   { w: 180, h: 200 },
};

function generateBed(p) {
  const x = p.x || 0, y = p.y || 0;
  const sz = BED_SIZES[p.size || 'double'] || BED_SIZES.double;
  const groupId = nextId();
  const els = [];

  // Outer bed frame
  els.push(rect(nextId(), x, y, sz.w, sz.h, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // Pillow (20% of length at head)
  const pillowH = Math.round(sz.h * 0.2);
  els.push(rect(nextId(), x + 5, y + 5, sz.w - 10, pillowH, {
    stroke: '#1e1e1e',
    fill: '#f3f4f6',
    groupIds: [groupId],
  }));

  return els;
}

function generateDesk(p) {
  const x = p.x || 0, y = p.y || 0;
  const w = p.width || 120, h = 60;
  const groupId = nextId();
  const els = [];

  // Desk surface
  els.push(rect(nextId(), x, y, w, h, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // Chair (ellipse centered below desk)
  els.push(ellipse(nextId(), x + w / 2 - 15, y + h + 10, 30, 30, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  return els;
}

function generateTable(p) {
  const x = p.x || 0, y = p.y || 0;
  const shape = p.shape || 'rect';
  const groupId = nextId();

  if (shape === 'round') {
    const d = p.size || 100;
    return [ellipse(nextId(), x, y, d, d, {
      stroke: '#1e1e1e',
      groupIds: [groupId],
    })];
  }

  const w = p.w || 120, h = p.h || 80;
  return [rect(nextId(), x, y, w, h, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  })];
}

const COUCH_SIZES = {
  '2-seat': { w: 160, h: 80 },
  '3-seat': { w: 220, h: 80 },
  'L':      { w: 220, h: 220 },
};

function generateCouch(p) {
  const x = p.x || 0, y = p.y || 0;
  const style = p.style || '2-seat';
  const sz = COUCH_SIZES[style] || COUCH_SIZES['2-seat'];
  const groupId = nextId();
  const els = [];

  if (style === 'L') {
    // Horizontal seat
    els.push(rect(nextId(), x, y, sz.w, 80, {
      stroke: '#1e1e1e',
      groupIds: [groupId],
    }));
    // Back rest (horizontal)
    els.push(rect(nextId(), x, y, sz.w, 20, {
      stroke: '#1e1e1e',
      fill: '#e5e7eb',
      groupIds: [groupId],
    }));
    // Vertical seat (L piece)
    els.push(rect(nextId(), x, y + 80, 80, sz.h - 80, {
      stroke: '#1e1e1e',
      groupIds: [groupId],
    }));
  } else {
    // Seat
    els.push(rect(nextId(), x, y, sz.w, sz.h, {
      stroke: '#1e1e1e',
      groupIds: [groupId],
    }));
    // Back rest (top strip)
    els.push(rect(nextId(), x, y, sz.w, 20, {
      stroke: '#1e1e1e',
      fill: '#e5e7eb',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateChair(p) {
  const x = p.x || 0, y = p.y || 0;
  const groupId = nextId();
  const els = [];

  els.push(rect(nextId(), x, y, 40, 40, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // Backrest line at top
  els.push(line(nextId(), x, y, [[0, 0], [40, 0]], {
    stroke: '#1e1e1e',
    strokeWidth: 3,
    groupIds: [groupId],
  }));

  return els;
}

function generateToilet(p) {
  const x = p.x || 0, y = p.y || 0;
  const groupId = nextId();
  const els = [];

  // Tank (rectangular)
  els.push(rect(nextId(), x, y, 40, 15, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // Bowl (oval)
  els.push(ellipse(nextId(), x, y + 15, 40, 50, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  return els;
}

function generateSink(p) {
  const x = p.x || 0, y = p.y || 0;
  const groupId = nextId();
  const els = [];

  // Counter
  els.push(rect(nextId(), x, y, 50, 40, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // Basin
  els.push(ellipse(nextId(), x + 10, y + 5, 30, 30, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  return els;
}

function generateShower(p) {
  const x = p.x || 0, y = p.y || 0;
  const sz = p.size || 90;
  const groupId = nextId();
  const els = [];

  els.push(rect(nextId(), x, y, sz, sz, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // Diagonal lines
  els.push(line(nextId(), x, y, [[0, 0], [sz, sz]], {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));
  els.push(line(nextId(), x + sz, y, [[0, 0], [-sz, sz]], {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  return els;
}

function generateStove(p) {
  const x = p.x || 0, y = p.y || 0;
  const groupId = nextId();
  const els = [];

  els.push(rect(nextId(), x, y, 60, 60, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // 4 burners in 2x2 grid
  const positions = [[12, 12], [36, 12], [12, 36], [36, 36]];
  for (const [bx, by] of positions) {
    els.push(ellipse(nextId(), x + bx - 6, y + by - 6, 12, 12, {
      stroke: '#1e1e1e',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateFridge(p) {
  const x = p.x || 0, y = p.y || 0;
  const groupId = nextId();
  const els = [];

  els.push(rect(nextId(), x, y, 70, 70, {
    stroke: '#1e1e1e',
    groupIds: [groupId],
  }));

  // Handle line
  els.push(line(nextId(), x + 55, y + 15, [[0, 0], [0, 40]], {
    stroke: '#1e1e1e',
    strokeWidth: 2,
    groupIds: [groupId],
  }));

  return els;
}

function generateDimension(p) {
  const x1 = p.x1 || 0, y1 = p.y1 || 0;
  const x2 = p.x2 || 0, y2 = p.y2 || 0;
  const label = p.label || '';
  const groupId = nextId();
  const els = [];
  const endMarkLen = 6;

  // Main line
  els.push(line(nextId(), x1, y1, [[0, 0], [x2 - x1, y2 - y1]], {
    stroke: '#1e1e1e',
    strokeWidth: 1,
    groupIds: [groupId],
  }));

  // Determine if horizontal or vertical
  const isHorizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);

  if (isHorizontal) {
    // End marks (short vertical lines)
    els.push(line(nextId(), x1, y1 - endMarkLen, [[0, 0], [0, endMarkLen * 2]], {
      stroke: '#1e1e1e',
      strokeWidth: 1,
      groupIds: [groupId],
    }));
    els.push(line(nextId(), x2, y2 - endMarkLen, [[0, 0], [0, endMarkLen * 2]], {
      stroke: '#1e1e1e',
      strokeWidth: 1,
      groupIds: [groupId],
    }));
  } else {
    // End marks (short horizontal lines)
    els.push(line(nextId(), x1 - endMarkLen, y1, [[0, 0], [endMarkLen * 2, 0]], {
      stroke: '#1e1e1e',
      strokeWidth: 1,
      groupIds: [groupId],
    }));
    els.push(line(nextId(), x2 - endMarkLen, y2, [[0, 0], [endMarkLen * 2, 0]], {
      stroke: '#1e1e1e',
      strokeWidth: 1,
      groupIds: [groupId],
    }));
  }

  // Centered label
  if (label) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    els.push(text(nextId(), midX - 30, midY - 16, 60, 14, label, {
      fontSize: 12,
      color: '#1e1e1e',
      textAlign: 'center',
      verticalAlign: 'middle',
      groupIds: [groupId],
    }));
  }

  return els;
}

function generateLabel(p) {
  const x = p.x || 0, y = p.y || 0;
  const content = p.text || '';
  const fontSize = p.fontSize || 14;

  return [text(nextId(), x, y, content.length * fontSize * 0.6, fontSize * 1.25, content, {
    fontSize,
    color: '#1e1e1e',
    textAlign: 'left',
    verticalAlign: 'top',
  })];
}

// ── Primitive registry ───────────────────────────────────────────────────────
const PRIMITIVES = {
  screen: generateScreen,
  button: generateButton,
  input: generateInput,
  textarea: generateTextarea,
  card: generateCard,
  'nav-bar': generateNavBar,
  modal: generateModal,
  divider: generateDivider,
  'image-placeholder': generateImagePlaceholder,
  avatar: generateAvatar,
  'list-item': generateListItem,
  // Floor plan primitives
  room: generateRoom,
  door: generateDoor,
  window: generateWindow,
  wall: generateWall,
  'furniture:bed': generateBed,
  'furniture:desk': generateDesk,
  'furniture:table': generateTable,
  'furniture:couch': generateCouch,
  'furniture:chair': generateChair,
  'furniture:toilet': generateToilet,
  'furniture:sink': generateSink,
  'furniture:shower': generateShower,
  'furniture:stove': generateStove,
  'furniture:fridge': generateFridge,
  dimension: generateDimension,
  label: generateLabel,
};

// ── Generate all elements ────────────────────────────────────────────────────
const elements = [];

for (const prim of input.primitives) {
  const gen = PRIMITIVES[prim.type];
  if (!gen) {
    process.stderr.write(`Warning: unknown primitive type "${prim.type}", skipping\n`);
    continue;
  }
  const els = gen(prim);
  elements.push(...els);
}

// ── Apply --position offset ──────────────────────────────────────────────────
if (flags.position) {
  const [ox, oy] = flags.position.split(',').map(Number);
  for (const el of elements) {
    el.x += ox;
    el.y += oy;
  }
}

// ── Output Excalidraw JSON ───────────────────────────────────────────────────
let finalElements = elements;
let appState = {
  viewBackgroundColor: '#ffffff',
  gridSize: 20,
};
let files = {};

if (flags.merge) {
  const existing = JSON.parse(fs.readFileSync(flags.merge, 'utf8'));
  finalElements = existing.elements.concat(elements);
  appState = existing.appState || appState;
  files = existing.files || files;
}

const output = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements: finalElements,
  appState,
  files,
};

const outJson = JSON.stringify(output, null, 2);
if (flags.output) {
  fs.writeFileSync(flags.output, outJson);
} else {
  process.stdout.write(outJson);
}
