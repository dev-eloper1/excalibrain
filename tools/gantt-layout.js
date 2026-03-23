#!/usr/bin/env node
/**
 * gantt-layout.js
 *
 * Takes a Gantt chart description JSON and outputs a fully-positioned
 * Excalidraw JSON file with a proper time axis, parallel task bars,
 * and optional dependency arrows.
 *
 * Input format (gantt.json):
 * {
 *   "title": "Project Timeline",
 *   "timeUnit": "Week",
 *   "columns": 8,
 *   "tasks": [
 *     {"id": "design", "label": "Design", "start": 1, "duration": 2, "fill": "#bfdbfe", "stroke": "#1e40af"},
 *     {"id": "backend", "label": "Backend Dev", "start": 2, "duration": 3, "fill": "#86efac", "stroke": "#15803d"}
 *   ],
 *   "dependencies": [
 *     {"from": "design", "to": "backend"}
 *   ]
 * }
 *
 * Usage:
 *   node gantt-layout.js gantt.json [--theme name] [--output path]
 *   cat gantt.json | node gantt-layout.js [--theme name] [--output path]
 */

const fs = require('fs');
const path = require('path');

// ── CLI arg parsing ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {};
let inputPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--theme')  { flags.theme  = args[++i]; }
  else if (args[i] === '--output') { flags.output = args[++i]; }
  else if (!args[i].startsWith('--')) { inputPath = args[i]; }
}

// ── Read input ────────────────────────────────────────────────────────────────
let raw;
if (inputPath) {
  raw = fs.readFileSync(inputPath, 'utf8');
} else {
  raw = fs.readFileSync('/dev/stdin', 'utf8');
}
const gantt = JSON.parse(raw);

// ── Theme loading ─────────────────────────────────────────────────────────────
const THEMES_DIR = path.join(__dirname, 'themes');
const themeName = flags.theme ?? gantt.theme ?? 'default';
let theme = {};
try {
  const themePath = path.join(THEMES_DIR, `${themeName}.json`);
  theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
} catch {
  if (themeName !== 'default') {
    console.error(`Warning: theme "${themeName}" not found, using defaults`);
  }
}
const themeStyle = theme.style ?? {};

// ── Style defaults ────────────────────────────────────────────────────────────
const STYLE = {
  roughness:     themeStyle.roughness     ?? 1,
  fontFamily:    themeStyle.fontFamily    ?? 1,
  fontSize:      themeStyle.fontSize      ?? 16,
  titleSize:     themeStyle.titleSize     ?? 22,
  titleColor:    themeStyle.titleColor    ?? '#1e293b',
  arrowWidth:    themeStyle.arrowWidth    ?? 1.5,
  defaultArrowColor: themeStyle.defaultArrowColor ?? '#374151',
  defaultNodeStroke: themeStyle.defaultNodeStroke ?? '#1e40af',
  nodeWidth:     themeStyle.nodeWidth     ?? 2,
  nodeFill:      themeStyle.nodeFill      ?? 'none',
};

const canvasBackground = gantt.style?.background ?? theme.canvas?.background ?? '#ffffff';
const isDark = canvasBackground !== '#ffffff';

// ── Layout constants ──────────────────────────────────────────────────────────
const LABEL_COL_W = gantt.labelWidth ?? 180;
const COL_W       = gantt.colWidth   ?? 120;
const ROW_H       = gantt.rowHeight  ?? 50;
const ROW_GAP     = gantt.rowGap     ?? 8;
const HEADER_Y    = 60;
const TASK_START_Y = 90;
const MARGIN_LEFT  = 20;
const MARGIN_TOP   = 10;

const columns = gantt.columns ?? 8;
const timeUnit = gantt.timeUnit ?? 'Week';
const tasks = gantt.tasks ?? [];
const dependencies = gantt.dependencies ?? [];

// ── Seed counter for deterministic IDs ────────────────────────────────────────
let seedCounter = 10000;
function nextSeed() { return seedCounter++; }

// ── Helper: base element fields ───────────────────────────────────────────────
function base(id, type, x, y, w, h, extra = {}) {
  return {
    type,
    id,
    x, y, width: w, height: h,
    angle: 0,
    strokeWidth: extra.sw ?? STYLE.nodeWidth,
    strokeStyle: extra.style ?? 'solid',
    roughness: extra.roughness ?? STYLE.roughness,
    opacity: 100,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    groupIds: [],
    boundElements: extra.boundElements ?? [],
    link: null,
    locked: false,
    ...extra.props,
  };
}

// ── Helper: free-floating text ────────────────────────────────────────────────
function freeText(id, x, y, w, h, text, color, fontSize = 13, align = 'left') {
  return {
    ...base(id, 'text', x, y, w, h, { sw: 1, roughness: 0 }),
    text,
    originalText: text,
    fontSize,
    fontFamily: STYLE.fontFamily,
    textAlign: align,
    verticalAlign: 'top',
    strokeColor: color,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    containerId: null,
    lineHeight: 1.25,
    boundElements: null,
  };
}

// ── Helper: text inside a shape ───────────────────────────────────────────────
function shapeText(containerId, x, y, w, h, text, color, fontSize = STYLE.fontSize) {
  const id = `${containerId}_text`;
  const LINE_H = 1.25;
  const lines = text.split('\n').length;
  const textH = lines * fontSize * LINE_H;
  const centeredY = y + (h - textH) / 2;
  return {
    ...base(id, 'text', x, centeredY, w, textH, { sw: 1, roughness: 0 }),
    text,
    originalText: text,
    fontSize,
    fontFamily: STYLE.fontFamily,
    textAlign: 'center',
    verticalAlign: 'middle',
    strokeColor: color,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    containerId,
    lineHeight: LINE_H,
    boundElements: null,
  };
}

// ── Helper: darken a stroke color for text ────────────────────────────────────
function darken(hex) {
  const darkMap = {
    '#fed7aa': '#7c2d12', '#c2410c': '#7c2d12',
    '#ddd6fe': '#4c1d95', '#6d28d9': '#4c1d95',
    '#86efac': '#14532d', '#15803d': '#14532d',
    '#bfdbfe': '#1e3a8a', '#1e40af': '#1e3a8a',
    '#fef08a': '#451a03', '#92400e': '#451a03',
    '#fecdd3': '#881337', '#9f1239': '#881337',
    '#fecaca': '#7f1d1d', '#b91c1c': '#7f1d1d',
    '#a7f3d0': '#064e3b', '#047857': '#064e3b',
    '#fef3c7': '#451a03', '#b45309': '#451a03',
  };
  return darkMap[hex] ?? '#1e293b';
}

// ── Build elements ────────────────────────────────────────────────────────────
const elements = [];

// Grid origin
const gridLeft = MARGIN_LEFT + LABEL_COL_W;
const gridTop  = MARGIN_TOP + HEADER_Y;
const gridRight = gridLeft + columns * COL_W;
const gridBottom = gridTop + tasks.length * (ROW_H + ROW_GAP);

// Grid line colors
const gridColor = isDark ? '#334155' : '#d1d5db';
const gridOpacity = isDark ? 40 : 30;

// ── 1. Title ──────────────────────────────────────────────────────────────────
if (gantt.title) {
  elements.push(freeText('title', MARGIN_LEFT, MARGIN_TOP, 800, 36, gantt.title, STYLE.titleColor, STYLE.titleSize));
}

// ── 2. Time axis labels ───────────────────────────────────────────────────────
for (let col = 0; col < columns; col++) {
  const x = gridLeft + col * COL_W;
  const label = `${timeUnit} ${col + 1}`;
  const labelW = COL_W;
  const el = freeText(
    `time_${col}`,
    x, gridTop - 28,
    labelW, 20,
    label,
    STYLE.titleColor,
    14,
    'center',
  );
  elements.push(el);
}

// ── 3. Axis divider line (below header) ───────────────────────────────────────
{
  const lineY = gridTop;
  const lineEl = {
    ...base('axis_line', 'line', MARGIN_LEFT, lineY, gridRight - MARGIN_LEFT, 0, {
      sw: 1.5,
      roughness: 0,
      props: {
        strokeColor: isDark ? '#475569' : '#6b7280',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
      },
    }),
    points: [[0, 0], [gridRight - MARGIN_LEFT, 0]],
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    boundElements: null,
  };
  elements.push(lineEl);
}

// ── 4. Vertical grid lines ────────────────────────────────────────────────────
for (let col = 0; col <= columns; col++) {
  const x = gridLeft + col * COL_W;
  const lineEl = {
    ...base(`vgrid_${col}`, 'line', x, gridTop, 0, gridBottom - gridTop, {
      sw: 1,
      roughness: 0,
      props: {
        strokeColor: gridColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        opacity: gridOpacity,
      },
    }),
    points: [[0, 0], [0, gridBottom - gridTop]],
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    boundElements: null,
    opacity: gridOpacity,
  };
  elements.push(lineEl);
}

// ── 5. Horizontal grid lines ──────────────────────────────────────────────────
for (let row = 0; row <= tasks.length; row++) {
  const y = gridTop + row * (ROW_H + ROW_GAP);
  const lineEl = {
    ...base(`hgrid_${row}`, 'line', MARGIN_LEFT, y, gridRight - MARGIN_LEFT, 0, {
      sw: 1,
      roughness: 0,
      props: {
        strokeColor: gridColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        opacity: gridOpacity,
      },
    }),
    points: [[0, 0], [gridRight - MARGIN_LEFT, 0]],
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    boundElements: null,
    opacity: gridOpacity,
  };
  elements.push(lineEl);
}

// ── 6. Task labels + bars ─────────────────────────────────────────────────────
const taskPositions = {}; // id → { x, y, w, h, cx, cy }

for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i];
  const rowY = gridTop + i * (ROW_H + ROW_GAP) + ROW_GAP / 2;

  // Task label (left column)
  const labelColor = isDark ? '#e2e8f0' : '#1e293b';
  elements.push(freeText(
    `label_${task.id}`,
    MARGIN_LEFT + 8,
    rowY + (ROW_H - 20) / 2,
    LABEL_COL_W - 16,
    20,
    task.label,
    labelColor,
    14,
    'left',
  ));

  // Task bar
  const barX = gridLeft + (task.start - 1) * COL_W;
  const barW = task.duration * COL_W;
  const barY = rowY + 4;
  const barH = ROW_H - 8;

  const fill = task.fill ?? '#bfdbfe';
  const stroke = task.stroke ?? STYLE.defaultNodeStroke;
  const textColor = task.textColor ?? darken(stroke);

  const barId = `bar_${task.id}`;
  const barTextId = `${barId}_text`;

  const barEl = {
    ...base(barId, 'rectangle', barX, barY, barW, barH, {
      sw: task.strokeWidth ?? STYLE.nodeWidth,
      roughness: STYLE.roughness,
      boundElements: [{ id: barTextId, type: 'text' }],
      props: {
        strokeColor: stroke,
        backgroundColor: fill === 'none' || fill === 'transparent' ? 'transparent' : fill,
        fillStyle: STYLE.nodeFill === 'none' ? 'solid' : STYLE.nodeFill,
        roundness: { type: 3 },
      },
    }),
  };
  elements.push(barEl);

  // Text inside bar (show label if bar is wide enough)
  if (barW >= 80) {
    elements.push(shapeText(barId, barX, barY, barW, barH, task.label, textColor, 13));
  }

  // Store position for dependency arrows
  taskPositions[task.id] = {
    x: barX,
    y: barY,
    w: barW,
    h: barH,
    cx: barX + barW / 2,
    cy: barY + barH / 2,
    right: barX + barW,
    left: barX,
  };
}

// ── 7. Dependency arrows ──────────────────────────────────────────────────────
for (let i = 0; i < dependencies.length; i++) {
  const dep = dependencies[i];
  const from = taskPositions[dep.from];
  const to = taskPositions[dep.to];
  if (!from || !to) continue;

  const arrowId = `dep_${i}`;
  const startX = from.right;
  const startY = from.cy;
  const endX = to.left;
  const endY = to.cy;

  const dx = endX - startX;
  const dy = endY - startY;

  const arrowColor = dep.stroke ?? STYLE.defaultArrowColor;

  const arrowEl = {
    ...base(arrowId, 'arrow', startX, startY, 0, 0, {
      sw: dep.width ?? STYLE.arrowWidth,
      style: dep.style ?? 'solid',
      roughness: 0,
      props: {
        strokeColor: arrowColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
      },
    }),
    width: Math.abs(dx),
    height: Math.abs(dy),
    points: [[0, 0], [+dx.toFixed(1), +dy.toFixed(1)]],
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: 'triangle',
    boundElements: null,
  };
  elements.push(arrowEl);
}

// ── Output Excalidraw JSON ────────────────────────────────────────────────────
const output = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements,
  appState: {
    viewBackgroundColor: canvasBackground,
    gridSize: 20,
  },
  files: {},
};

const outJson = JSON.stringify(output, null, 2);
if (flags.output) {
  fs.writeFileSync(flags.output, outJson);
} else {
  process.stdout.write(outJson);
}
