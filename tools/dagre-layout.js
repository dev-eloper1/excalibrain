#!/usr/bin/env node
/**
 * dagre-layout.js
 *
 * Takes a graph description JSON (stdin or file) and outputs a fully-positioned
 * Excalidraw JSON file with no overlapping nodes or crossing edges.
 *
 * Input format (graph.json):
 * {
 *   "direction": "LR",          // TB (top→bottom) | LR (left→right) | BT | RL
 *   "rankSep": 80,              // vertical gap between ranks (optional, default 80)
 *   "nodeSep": 40,              // horizontal gap between nodes in same rank (optional, default 40)
 *   "title": "My Diagram",      // optional title text
 *   "zones": [                  // optional background zone rectangles
 *     {
 *       "id": "zone_cp",
 *       "label": "CONTROL PLANE",
 *       "labelColor": "#c2410c",
 *       "fill": "#fff7ed",
 *       "stroke": "#fdba74",
 *       "nodeIds": ["api", "etcd", "cm", "sched"]  // nodes that belong in this zone
 *     }
 *   ],
 *   "nodes": [
 *     {
 *       "id": "api",
 *       "label": "kube-apiserver",
 *       "width": 180,           // optional, auto-calculated from label
 *       "height": 60,           // optional, auto-calculated from label
 *       "fill": "#fed7aa",
 *       "stroke": "#c2410c",
 *       "shape": "rectangle",   // rectangle | diamond | ellipse (default: rectangle)
 *       "rounded": false        // rounded corners (default: false)
 *     }
 *   ],
 *   "edges": [
 *     {
 *       "from": "api",
 *       "to": "etcd",
 *       "label": "",            // optional
 *       "stroke": "#6d28d9",    // optional, default "#374151"
 *       "style": "solid",       // solid | dashed | dotted (default: solid)
 *       "width": 2              // optional, default 1.5
 *     }
 *   ]
 * }
 *
 * Usage:
 *   node dagre-layout.js graph.json > out.excalidraw
 *   cat graph.json | node dagre-layout.js > out.excalidraw
 */

const dagre = require('@dagrejs/dagre');
const fs = require('fs');
const path = require('path');

// ── CLI arg parsing ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flags = {};
let inputPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--clean') { flags.clean = true; }
  else if (args[i] === '--theme')       { flags.theme      = args[++i]; }
  else if (args[i] === '--roughness')   { flags.roughness  = Number(args[++i]); }
  else if (args[i] === '--font')        { flags.font       = args[++i]; }
  else if (args[i] === '--fill')        { flags.fill       = args[++i]; }
  else if (args[i] === '--arrow-width') { flags.arrowWidth = Number(args[++i]); }
  else if (args[i] === '--node-width')  { flags.nodeWidth  = Number(args[++i]); }
  else if (args[i] === '--output')      { flags.output     = args[++i]; }
  else if (!args[i].startsWith('--'))   { inputPath = args[i]; }
}

const FONT_MAP = { virgil: 1, normal: 2, mono: 3, '1': 1, '2': 2, '3': 3 };

if (flags.clean) {
  flags.roughness  = flags.roughness  ?? 0;
  flags.font       = flags.font       ?? '3';
  flags.fill       = flags.fill       ?? 'solid';
}

// ── Read input ────────────────────────────────────────────────────────────────
let raw;
if (inputPath) {
  raw = fs.readFileSync(inputPath, 'utf8');
} else {
  raw = fs.readFileSync('/dev/stdin', 'utf8');
}
const graph = JSON.parse(raw);

// ── Theme loading ─────────────────────────────────────────────────────────────
// Priority: theme defaults → CLI flags → graph.style (highest)
const THEMES_DIR = path.join(__dirname, 'themes');
const themeName = flags.theme ?? graph.theme ?? 'default';
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

// Merge: theme defaults → CLI flags → graph.style (highest priority)
graph.style = {
  roughness:   themeStyle.roughness   ?? 1,
  fontFamily:  themeStyle.fontFamily  ?? 1,
  fontSize:    themeStyle.fontSize    ?? 16,
  nodeFill:    themeStyle.nodeFill    ?? 'none',
  zoneFill:    themeStyle.zoneFill    ?? 'solid',
  zoneOpacity: themeStyle.zoneOpacity ?? 30,
  arrowWidth:  themeStyle.arrowWidth  ?? 1.5,
  nodeWidth:   themeStyle.nodeWidth   ?? 2,
  zoneLabelFont: themeStyle.zoneLabelFont ?? 2,
  zoneLabelSize: themeStyle.zoneLabelSize ?? 13,
  edgeLabelSize: themeStyle.edgeLabelSize ?? 13,
  titleSize:     themeStyle.titleSize     ?? 22,
  titleColor:    themeStyle.titleColor    ?? '#1e293b',
  defaultArrowColor: themeStyle.defaultArrowColor ?? '#374151',
  defaultNodeStroke: themeStyle.defaultNodeStroke ?? '#1e40af',
  defaultNodeFill:   themeStyle.defaultNodeFill   ?? 'none',
  // CLI flags override theme
  ...(flags.roughness  !== undefined ? { roughness: flags.roughness } : {}),
  ...(flags.font       !== undefined ? { fontFamily: FONT_MAP[flags.font] ?? 1 } : {}),
  ...(flags.fill       !== undefined ? { nodeFill: flags.fill } : {}),
  ...(flags.arrowWidth !== undefined ? { arrowWidth: flags.arrowWidth } : {}),
  ...(flags.nodeWidth  !== undefined ? { nodeWidth: flags.nodeWidth } : {}),
  // graph.style from JSON has highest priority
  ...graph.style,
};

// Canvas background from theme
const canvasBackground = graph.style?.background ?? theme.canvas?.background ?? '#ffffff';

// Make theme palette/zones/arrows available for lookups
const themePalette = theme.palette ?? {};
const themeZones   = theme.zones   ?? {};
const themeArrows  = theme.arrows  ?? {};

// ── Seed counter for deterministic IDs ───────────────────────────────────────
let seedCounter = 10000;
function nextSeed() { return seedCounter++; }

// ── Build dagre graph ────────────────────────────────────────────────────────
const g = new dagre.graphlib.Graph({ multigraph: true });
g.setDefaultEdgeLabel(() => ({}));
g.setGraph({
  rankdir: graph.direction || 'LR',
  ranksep: graph.rankSep ?? 80,
  nodesep: graph.nodeSep ?? 40,
  marginx: 40,
  marginy: 40,
  edgesep: 20,
  acyclicer: 'greedy',
  ranker: 'network-simplex',
});

const DEFAULT_W = 160;
const DEFAULT_H = 50;

// ── FIX 2: Multiline label auto-sizing ───────────────────────────────────────
for (const n of graph.nodes) {
  const label = n.label || n.id;
  const lines = label.split('\n');
  const maxLineLen = Math.max(...lines.map(l => l.length), 1);
  const fontSize = n.fontSize ?? 16;  // FIX 3: was 14
  const calcW = Math.max(DEFAULT_W, Math.ceil((maxLineLen * fontSize * 0.65 + 32) / 10) * 10);
  const calcH = Math.max(DEFAULT_H, Math.ceil((lines.length * fontSize * 1.25 + 20) / 10) * 10);

  g.setNode(n.id, {
    width: n.width ?? calcW,
    height: n.height ?? calcH,
    label: n.id,
  });
}

for (const e of graph.edges) {
  const name = `${e.from}->${e.to}:${e.label || ''}`;
  g.setEdge(e.from, e.to, {}, name);
}

dagre.layout(g);

// Build a quick lookup: nodeId → shape spec
const nodeShapeMap = {};
for (const n of graph.nodes) nodeShapeMap[n.id] = n;

// ── Collect positioned nodes ─────────────────────────────────────────────────
const nodeMap = {};
for (const n of graph.nodes) {
  const pos = g.node(n.id);
  nodeMap[n.id] = {
    x: pos.x - pos.width / 2,
    y: pos.y - pos.height / 2,
    width: pos.width,
    height: pos.height,
    cx: pos.x,
    cy: pos.y,
  };
}

// ── Build Excalidraw elements ─────────────────────────────────────────────────
const elements = [];

// ── Style defaults (fully resolved from theme + overrides) ──────────────────
const STYLE = {
  roughness:     graph.style?.roughness     ?? 1,
  fontFamily:    graph.style?.fontFamily    ?? 1,
  fontSize:      graph.style?.fontSize      ?? 16,
  nodeFill:      graph.style?.nodeFill      ?? 'none',
  zoneFill:      graph.style?.zoneFill      ?? 'solid',
  zoneOpacity:   graph.style?.zoneOpacity   ?? 30,
  arrowWidth:    graph.style?.arrowWidth    ?? 1.5,
  nodeWidth:     graph.style?.nodeWidth     ?? 2,
  zoneLabelFont: graph.style?.zoneLabelFont ?? 2,
  zoneLabelSize: graph.style?.zoneLabelSize ?? 13,
  edgeLabelSize: graph.style?.edgeLabelSize ?? 13,
  titleSize:     graph.style?.titleSize     ?? 22,
  titleColor:    graph.style?.titleColor    ?? '#1e293b',
  defaultArrowColor: graph.style?.defaultArrowColor ?? '#374151',
  defaultNodeStroke: graph.style?.defaultNodeStroke ?? '#1e40af',
  defaultNodeFill:   graph.style?.defaultNodeFill   ?? 'none',
};

// Helper: base element fields
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

// Helper: text element inside a shape
function shapeText(containerId, x, y, w, h, text, color, fontSize = STYLE.fontSize) {
  const id        = `${containerId}_text`;
  const LINE_H    = 1.25;
  const lines     = text.split('\n').length;
  const textH     = lines * fontSize * LINE_H;
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

// Helper: free-floating text
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

// ── 1. Title ─────────────────────────────────────────────────────────────────
const TITLE_OFFSET = graph.title ? 55 : 10;
for (const id of Object.keys(nodeMap)) {
  nodeMap[id].y  += TITLE_OFFSET;
  nodeMap[id].cy += TITLE_OFFSET;
}

if (graph.title) {
  elements.push(freeText('title', 20, 12, 800, 36, graph.title, STYLE.titleColor, STYLE.titleSize));
}

// ── 2. Zone backgrounds (drawn first, behind nodes) ──────────────────────────
const ZONE_PAD = 32;
if (graph.zones) {
  for (const zone of graph.zones) {
    if (!zone.nodeIds || zone.nodeIds.length === 0) continue;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const nid of zone.nodeIds) {
      const p = nodeMap[nid];
      if (!p) continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    }

    const zx = minX - ZONE_PAD;
    const zy = minY - ZONE_PAD - 20;
    const zw = maxX - minX + ZONE_PAD * 2;
    const zh = maxY - minY + ZONE_PAD * 2 + 20;

    const zid = `zone_${zone.id}`;
    elements.push({
      ...base(zid, 'rectangle', zx, zy, zw, zh, { sw: 1, roughness: 0, props: {
        strokeColor: zone.stroke ?? '#94a3b8',
        backgroundColor: zone.fill ?? '#f8fafc',
        fillStyle: STYLE.zoneFill,
        opacity: zone.opacity ?? STYLE.zoneOpacity,
        roundness: { type: 3 },   // FIX 3: was null
      }}),
      boundElements: null,
    });

    if (zone.label) {
      const zlEl = freeText(
        `zone_${zone.id}_label`,
        zx + 8, zy + 6, 300, 18,
        zone.label,
        zone.labelColor ?? STYLE.titleColor,
        STYLE.zoneLabelSize,
      );
      zlEl.fontFamily = STYLE.zoneLabelFont;
      zlEl.opacity = 100;
      elements.push(zlEl);
    }
  }
}

// ── 3. Nodes ──────────────────────────────────────────────────────────────────
const nodeBoundElements = {};
for (const n of graph.nodes) {
  nodeBoundElements[n.id] = [];
}

for (const n of graph.nodes) {
  nodeBoundElements[n.id].push({ id: `${n.id}_text`, type: 'text' });
}

const arrowData = [];

for (const [i, e] of graph.edges.entries()) {
  const name = `${e.from}->${e.to}:${e.label || ''}`;
  const edgeObj = g.edge(e.from, e.to, name) ?? g.edge(e.from, e.to);
  const arrowId = `arrow_${i}`;

  arrowData.push({ e, arrowId, edgeObj, name });

  nodeBoundElements[e.from]?.push({ id: arrowId, type: 'arrow' });
  nodeBoundElements[e.to]?.push({ id: arrowId, type: 'arrow' });
}

// Emit nodes
for (const n of graph.nodes) {
  const p = nodeMap[n.id];
  const nid = n.id;
  const fill = n.fill ?? STYLE.defaultNodeFill;
  const stroke = n.stroke ?? STYLE.defaultNodeStroke;
  const textColor = n.textColor ?? darken(stroke);
  const fontSize = n.fontSize ?? 16;   // FIX 3: was 14

  let shapeType = 'rectangle';
  let roundness = null;
  if (n.shape === 'diamond') shapeType = 'diamond';
  else if (n.shape === 'ellipse') shapeType = 'ellipse';
  if (n.rounded) roundness = { type: 3 };

  const el = {
    ...base(nid, shapeType, p.x, p.y, p.width, p.height, {
      sw: n.strokeWidth ?? STYLE.nodeWidth,
      style: n.strokeStyle ?? 'solid',
      boundElements: nodeBoundElements[nid],
      props: (() => {
        const hasWhiteText = textColor === '#ffffff' || textColor === '#fff';
        const isTransparent = fill === 'none' || fill === 'transparent';
        const backgroundColor = isTransparent ? 'transparent' : fill;
        let resolvedFill;
        if (isTransparent) {
          resolvedFill = 'solid';
        } else if (n.fillStyle === 'none') {
          resolvedFill = 'solid';
        } else if (n.fillStyle) {
          resolvedFill = n.fillStyle;
        } else if (hasWhiteText) {
          resolvedFill = 'solid';
        } else {
          resolvedFill = STYLE.nodeFill === 'none' ? 'solid' : STYLE.nodeFill;
        }
        const p = { strokeColor: stroke, backgroundColor, fillStyle: resolvedFill, roundness };
        if (n.roughness !== undefined) p.roughness = n.roughness;
        else if (hasWhiteText) p.roughness = 0;
        return p;
      })(),
    }),
  };
  elements.push(el);

  const txt = shapeText(nid, p.x, p.y, p.width, p.height, n.label, textColor, fontSize);
  elements.push(txt);
}

// ── 4. Arrows ─────────────────────────────────────────────────────────────────
const rankDir = (graph.direction || 'LR').toUpperCase();
const isLR    = rankDir === 'LR' || rankDir === 'RL';

// ── Bidirectional pair detection ───────────────────────────────────────────
const edgeIdxByKey = new Map();
for (let i = 0; i < arrowData.length; i++) {
  const e = arrowData[i].e;
  edgeIdxByKey.set(`${e.from}→${e.to}`, i);
}
const bidirSet = new Set();
const skipSet  = new Set();

for (let i = 0; i < arrowData.length; i++) {
  if (skipSet.has(i)) continue;
  const { edgeObj } = arrowData[i];
  if (!edgeObj?.points?.length) {
    const e = arrowData[i].e;
    const twinIdx = edgeIdxByKey.get(`${e.to}→${e.from}`);
    if (twinIdx !== undefined) {
      bidirSet.add(twinIdx);
      skipSet.add(i);
    }
  }
}

// Graph-level default arrowhead
const graphArrowhead = graph.arrowhead !== undefined ? graph.arrowhead : 'triangle';

for (let idx = 0; idx < arrowData.length; idx++) {
  if (skipSet.has(idx)) continue;
  const { e, arrowId, edgeObj } = arrowData[idx];
  const from = nodeMap[e.from];
  const to   = nodeMap[e.to];
  if (!from || !to) continue;

  const rawPts = (edgeObj?.points ?? []).map(p => ({ x: p.x, y: p.y + TITLE_OFFSET }));

  let points, startPt, endPt, startBinding, endBinding;

  // ── FIX 1: Use dagre boundary waypoints + always bind ──────────────────
  // Dagre gives boundary-to-boundary waypoints. We use those for the visual
  // path so arrows render correctly at shape edges in static exports (PNG/SVG).
  // We ALSO set bindings so Excalidraw can re-route interactively.
  startBinding = { elementId: e.from, focus: 0, gap: 4 };
  endBinding   = { elementId: e.to,   focus: 0, gap: 4 };

  if (rawPts.length >= 2) {
    // Dagre has boundary-to-boundary waypoints — use them for visual path
    let p0 = rawPts[0];
    let pN = rawPts[rawPts.length - 1];

    // Diamond shapes: snap to nearest visible tip
    if (nodeShapeMap[e.from]?.shape === 'diamond') p0 = nearestDiamondTip(p0, from);
    if (nodeShapeMap[e.to]?.shape   === 'diamond') pN = nearestDiamondTip(pN, to);

    startPt = p0;
    endPt   = pN;
    const ox = p0.x, oy = p0.y;
    points  = [
      [0, 0],
      ...rawPts.slice(1, -1).map(p => [+(p.x - ox).toFixed(1), +(p.y - oy).toFixed(1)]),
      [+(pN.x - ox).toFixed(1), +(pN.y - oy).toFixed(1)],
    ];
  } else {
    // No dagre waypoints — use center-to-center, let bindings handle routing
    startPt = { x: from.cx, y: from.cy };
    endPt   = { x: to.cx, y: to.cy };
    points  = [[0, 0], [+(endPt.x - startPt.x).toFixed(1), +(endPt.y - startPt.y).toFixed(1)]];
  }

  // Per-edge arrowhead → graph default → 'triangle'
  const arrowhead   = e.arrowhead !== undefined ? e.arrowhead : graphArrowhead;
  const endHead     = arrowhead === 'none' ? null : (arrowhead ?? null);
  const startHead   = bidirSet.has(idx) ? endHead : null;

  const arrowEl = {
    ...base(arrowId, 'arrow', startPt.x, startPt.y, 0, 0, {
      sw: e.width ?? STYLE.arrowWidth,
      style: e.style ?? 'solid',
      roughness: STYLE.roughness,
      props: {
        strokeColor: e.stroke ?? STYLE.defaultArrowColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
      },
    }),
    width:  Math.abs(endPt.x - startPt.x),
    height: Math.abs(endPt.y - startPt.y),
    points,
    startBinding,
    endBinding,
    startArrowhead: startHead,
    endArrowhead:   endHead,
    boundElements: null,
  };

  elements.push(arrowEl);

  // ── Edge label ──────────────────────────────────────────────────────────
  if (e.label) {
    const pts = rawPts.length >= 2
      ? rawPts
      : [{ x: from.cx, y: from.cy }, { x: to.cx, y: to.cy }];
    const mid = midpoint(pts);
    const half = Math.max(0, Math.floor(pts.length / 2) - 1);
    const a = pts[half], b = pts[Math.min(half + 1, pts.length - 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const LABEL_OFFSET = 20;
    let ox = (-dy / len) * LABEL_OFFSET;
    let oy = ( dx / len) * LABEL_OFFSET;
    if (isLR  && oy > 0) { ox = -ox; oy = -oy; }
    if (!isLR && ox < 0) { ox = -ox; oy = -oy; }

    const labelId = `${arrowId}_label`;
    const labelW  = Math.max(e.label.length * 7 + 10, 44);
    elements.push(freeText(
      labelId,
      mid.x + ox - labelW / 2,
      mid.y + oy - 9,
      labelW, 18,
      e.label,
      e.stroke ?? STYLE.defaultArrowColor,
      STYLE.edgeLabelSize,
      'center',
    ));
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Dagre routes to rectangular bounding box corners for diamonds.
// Snap to the nearest actual visible tip instead.
function nearestDiamondTip(pt, node) {
  const tips = [
    { x: node.x,              y: node.cy },             // left tip
    { x: node.x + node.width, y: node.cy },             // right tip
    { x: node.cx,             y: node.y },              // top tip
    { x: node.cx,             y: node.y + node.height}, // bottom tip
  ];
  return tips.reduce((best, t) => {
    const d = Math.hypot(t.x - pt.x, t.y - pt.y);
    return d < best.dist ? { tip: t, dist: d } : best;
  }, { tip: tips[0], dist: Infinity }).tip;
}

function midpoint(pts) {
  const half = Math.floor(pts.length / 2);
  if (pts.length % 2 === 1) return pts[half];
  const a = pts[half - 1], b = pts[half];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

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
