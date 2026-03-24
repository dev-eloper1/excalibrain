#!/usr/bin/env node
/**
 * PostToolUse hook: validates visual quality of .excalidraw files after Write.
 *
 * Complementary to fast-check.js (which validates correctness: bindings, IDs).
 * This hook validates quality: floating arrows, blank labels, tiny elements,
 * and canvas size warnings.
 *
 * Only runs for session canvases (those with a .excalibrain.json sidecar).
 * Always exits 0 (hooks must not block).
 */

const fs = require('fs');
const path = require('path');

/**
 * Run visual quality checks on parsed Excalidraw elements.
 * @param {Array} elements — active (non-deleted) elements
 * @returns {string[]} — array of warning messages (empty if clean)
 */
function visualCheck(elements) {
  const warnings = [];

  for (const el of elements) {
    // Floating arrows: both start AND end binding are null/missing
    if (el.type === 'arrow') {
      const startBound = el.startBinding && el.startBinding.elementId;
      const endBound = el.endBinding && el.endBinding.elementId;
      if (!startBound && !endBound) {
        warnings.push(`Arrow '${el.id}' is floating (no start or end binding)`);
      }
    }

    // Blank labels: text elements with empty or whitespace-only content
    if (el.type === 'text') {
      if (!el.text || el.text.trim() === '') {
        warnings.push(`Text element '${el.id}' has a blank label`);
      }
    }

    // Suspiciously small elements
    if (el.width != null && el.height != null) {
      if (el.width < 10 && el.height < 10 && el.type !== 'text') {
        warnings.push(`Element '${el.id}' (${el.type}) is suspiciously small (${el.width}x${el.height})`);
      }
    }
  }

  // Canvas size warning
  if (elements.length > 500) {
    warnings.push(`Canvas has ${elements.length} elements — consider splitting into multiple diagrams`);
  }

  return warnings;
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

  // Check for sidecar — only validate session canvases, not Quick Draws
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.excalidraw');
  const sidecarPath = path.join(dir, base + '.excalibrain.json');

  if (!fs.existsSync(sidecarPath)) {
    process.exit(0);
  }

  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(fileContent);
  } catch {
    process.exit(0);
  }

  const elements = (data.elements || []).filter(e => !e.isDeleted);
  const warnings = visualCheck(elements);

  if (warnings.length > 0) {
    const filename = path.basename(filePath);
    console.log(`⚠ excalibrain visual-check found quality issues in ${filename}:`);
    for (const w of warnings) {
      console.log(`  - ${w}`);
    }
    console.log('Consider fixing these before continuing.');
  }

  process.exit(0);
}

// Export for testing
if (require.main !== module) {
  module.exports = { visualCheck };
} else {
  main();
}
