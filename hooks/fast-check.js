#!/usr/bin/env node
/**
 * PostToolUse hook: validates .excalidraw files after every Write.
 *
 * Checks for:
 *   - Arrow bindings referencing non-existent elements
 *   - Duplicate element IDs
 *   - Coordinate overlaps (non-text, non-arrow elements within 1px)
 *
 * Prints feedback to stdout for Claude to self-correct.
 * Always exits 0 (hooks must not block).
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate an array of (non-deleted) Excalidraw elements.
 * @param {Array} elements — active elements from the .excalidraw file
 * @returns {string[]} — array of error messages (empty if valid)
 */
function validateExcalidraw(elements) {
  const errors = [];
  const idSet = new Set();

  // Build ID lookup
  const idMap = new Set(elements.map(e => e.id));

  // ── Duplicate IDs ─────────────────────────────────────────────────────────
  for (const el of elements) {
    if (idSet.has(el.id)) {
      errors.push(`Duplicate element ID: '${el.id}'`);
    } else {
      idSet.add(el.id);
    }
  }

  // ── Arrow bindings ────────────────────────────────────────────────────────
  for (const el of elements) {
    if (el.type !== 'arrow') continue;

    if (el.startBinding && el.startBinding.elementId) {
      if (!idMap.has(el.startBinding.elementId)) {
        errors.push(`Arrow '${el.id}' startBinding references non-existent element '${el.startBinding.elementId}'`);
      }
    }
    if (el.endBinding && el.endBinding.elementId) {
      if (!idMap.has(el.endBinding.elementId)) {
        errors.push(`Arrow '${el.id}' endBinding references non-existent element '${el.endBinding.elementId}'`);
      }
    }
  }

  // ── Coordinate overlaps (non-text, non-arrow, within 1px) ────────────────
  const candidates = elements.filter(e => e.type !== 'text' && e.type !== 'arrow');
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) {
        errors.push(`Elements '${a.id}' and '${b.id}' overlap at (${a.x}, ${a.y})`);
      }
    }
  }

  return errors;
}

function main() {
  let input;
  try {
    input = fs.readFileSync(0, 'utf8');
  } catch {
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const filePath = payload && payload.tool_input && payload.tool_input.file_path;
  if (!filePath || !filePath.endsWith('.excalidraw')) {
    process.exit(0);
  }

  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch {
    // File might not exist yet or be unreadable — exit silently
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(fileContent);
  } catch {
    console.log(`⚠ excalibrain fast-check: ${path.basename(filePath)} is not valid JSON.`);
    process.exit(0);
  }

  const elements = (data.elements || []).filter(e => !e.isDeleted);
  const errors = validateExcalidraw(elements);

  if (errors.length > 0) {
    const filename = path.basename(filePath);
    console.log(`⚠ excalibrain fast-check found issues in ${filename}:`);
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
    console.log('Fix these issues before continuing.');
  }

  process.exit(0);
}

// Export for testing
if (require.main !== module) {
  module.exports = { validateExcalidraw };
} else {
  main();
}
