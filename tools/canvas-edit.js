#!/usr/bin/env node
/**
 * canvas-edit.js
 *
 * Update, delete, or move elements in existing .excalidraw files.
 *
 * Usage:
 *   node canvas-edit.js <file.excalidraw> <operation> [args...]
 *
 * Operations:
 *   update <elementId> <field> <value>  — update a property on an element
 *   delete <elementId>                  — remove an element and clean up bindings
 *   move <elementId> <dx> <dy>          — shift element coordinates by dx, dy
 */

const fs = require('fs');

const args = process.argv.slice(2);
const filePath = args[0];
const operation = args[1];

if (!filePath || !operation) {
  console.error('Usage: node canvas-edit.js <file.excalidraw> <operation> [args...]');
  process.exit(1);
}

// Read and parse the file
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

function findElement(id) {
  const el = data.elements.find(e => e.id === id);
  if (!el) {
    console.error(`Element '${id}' not found`);
    process.exit(1);
  }
  return el;
}

function save() {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

switch (operation) {
  case 'update': {
    const [elementId, field, rawValue] = args.slice(2);
    if (!elementId || !field || rawValue === undefined) {
      console.error('Usage: canvas-edit.js <file> update <elementId> <field> <value>');
      process.exit(1);
    }
    const el = findElement(elementId);
    // Parse value: try number, else keep as string
    let value = rawValue;
    const asNum = Number(rawValue);
    if (!isNaN(asNum) && rawValue.trim() !== '') {
      value = asNum;
    }
    el[field] = value;
    save();
    console.log(`Updated element '${elementId}' field '${field}' to '${value}'`);
    break;
  }

  case 'delete': {
    const elementId = args[2];
    if (!elementId) {
      console.error('Usage: canvas-edit.js <file> delete <elementId>');
      process.exit(1);
    }
    findElement(elementId); // validate it exists
    // Remove the element
    data.elements = data.elements.filter(e => e.id !== elementId);
    // Clean up references in other elements
    for (const el of data.elements) {
      // Remove from boundElements arrays
      if (Array.isArray(el.boundElements)) {
        el.boundElements = el.boundElements.filter(b => b.id !== elementId);
      }
      // Null out arrow bindings that referenced this element
      if (el.startBinding && el.startBinding.elementId === elementId) {
        el.startBinding = null;
      }
      if (el.endBinding && el.endBinding.elementId === elementId) {
        el.endBinding = null;
      }
    }
    save();
    console.log(`Deleted element '${elementId}'`);
    break;
  }

  case 'move': {
    const [elementId, dxStr, dyStr] = args.slice(2);
    if (!elementId || dxStr === undefined || dyStr === undefined) {
      console.error('Usage: canvas-edit.js <file> move <elementId> <dx> <dy>');
      process.exit(1);
    }
    const dx = Number(dxStr);
    const dy = Number(dyStr);
    const el = findElement(elementId);
    el.x += dx;
    el.y += dy;
    save();
    console.log(`Moved element '${elementId}' by (${dx}, ${dy})`);
    break;
  }

  default:
    console.error(`Unknown operation: '${operation}'. Use update, delete, or move.`);
    process.exit(1);
}
