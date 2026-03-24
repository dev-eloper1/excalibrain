#!/usr/bin/env node
/**
 * canvas-inspect.js — Read an .excalidraw file and report its structure as JSON.
 *
 * Usage: node tools/canvas-inspect.js <file.excalidraw>
 *
 * Output: JSON with elementCount, byType, byPrefix, bounds, freeSpace
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node canvas-inspect.js <file.excalidraw>');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
const elements = (raw.elements || []).filter(e => !e.isDeleted);

// ── elementCount ─────────────────────────────────────────────────────────────
const elementCount = elements.length;

// ── byType ───────────────────────────────────────────────────────────────────
const byType = {};
for (const el of elements) {
  byType[el.type] = (byType[el.type] || 0) + 1;
}

// ── bounds ───────────────────────────────────────────────────────────────────
function computeBounds(els) {
  if (els.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of els) {
    const x = el.x;
    const y = el.y;
    const w = el.width || 0;
    const h = el.height || 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }
  return { x: Math.round(minX), y: Math.round(minY), w: Math.round(maxX - minX), h: Math.round(maxY - minY) };
}

const bounds = computeBounds(elements);

// ── byPrefix ─────────────────────────────────────────────────────────────────
// Prefix = everything before first '_', max 8 chars. Only group IDs that have a prefix.
const prefixGroups = {};
for (const el of elements) {
  const id = el.id || '';
  const underscoreIdx = id.indexOf('_');
  if (underscoreIdx <= 0) continue; // no prefix or starts with _
  let prefix = id.substring(0, underscoreIdx);
  if (prefix.length > 8) prefix = prefix.substring(0, 8);
  prefix = prefix + '_';
  if (!prefixGroups[prefix]) prefixGroups[prefix] = [];
  prefixGroups[prefix].push(el);
}

const byPrefix = {};
for (const [prefix, els] of Object.entries(prefixGroups)) {
  byPrefix[prefix] = {
    count: els.length,
    ids: els.map(e => e.id),
    bbox: computeBounds(els)
  };
}

// ── freeSpace ────────────────────────────────────────────────────────────────
// Divide the bounding box into a 200x200 grid and find empty cells.
function computeFreeSpace(elements, bounds) {
  if (elements.length === 0) return [];

  const GRID = 200;
  // Expand bounds to include some margin
  const startX = Math.floor(bounds.x / GRID) * GRID;
  const startY = Math.floor(bounds.y / GRID) * GRID;
  const endX = Math.ceil((bounds.x + bounds.w) / GRID) * GRID + GRID;
  const endY = Math.ceil((bounds.y + bounds.h) / GRID) * GRID + GRID;

  const cells = [];
  for (let gx = startX; gx < endX; gx += GRID) {
    for (let gy = startY; gy < endY; gy += GRID) {
      cells.push({ x: gx, y: gy, w: GRID, h: GRID });
    }
  }

  // Check which cells are empty (no element overlaps)
  const empty = cells.filter(cell => {
    for (const el of elements) {
      const ew = el.width || 0;
      const eh = el.height || 0;
      // Check overlap
      if (el.x < cell.x + cell.w && el.x + ew > cell.x &&
          el.y < cell.y + cell.h && el.y + eh > cell.y) {
        return false;
      }
    }
    return true;
  });

  // Sort by distance from origin
  empty.sort((a, b) => {
    const distA = Math.sqrt(a.x * a.x + a.y * a.y);
    const distB = Math.sqrt(b.x * b.x + b.y * b.y);
    return distA - distB;
  });

  return empty.slice(0, 10);
}

const freeSpace = computeFreeSpace(elements, bounds);

// ── Output ───────────────────────────────────────────────────────────────────
const result = { elementCount, byType, byPrefix, bounds, freeSpace };
console.log(JSON.stringify(result, null, 2));
