#!/usr/bin/env node
/**
 * PreToolUse hook: prevents creating new .excalidraw files during a canvas session.
 *
 * When a canvas session is active (indicated by a .excalibrain.json sidecar),
 * blocks any Bash command or Write that would create a NEW .excalidraw file
 * instead of merging into the active canvas.
 *
 * Reads tool input from CLAUDE_TOOL_INPUT env var.
 * Exits 2 to block, 0 to allow.
 */

const fs = require('fs');
const path = require('path');

const toolInput = process.env.CLAUDE_TOOL_INPUT;
if (!toolInput) process.exit(0);

let input;
try {
  input = JSON.parse(toolInput);
} catch {
  process.exit(0);
}

// Extract the command or file path being written
const command = input.command || '';
const filePath = input.file_path || '';

// Check if this operation creates a new .excalidraw file
let targetPath = null;

if (filePath && filePath.endsWith('.excalidraw')) {
  // Write tool directly creating an .excalidraw file
  targetPath = filePath;
} else if (command) {
  // Bash command — look for --output <something>.excalidraw WITHOUT --merge
  const outputMatch = command.match(/--output\s+(\S+\.excalidraw)/);
  const hasMerge = command.includes('--merge');
  if (outputMatch && !hasMerge) {
    targetPath = outputMatch[1];
  }
}

if (!targetPath) process.exit(0); // Not creating an .excalidraw file

// Check if the target file already exists (if it does, this is an overwrite, which is fine
// for the first section of a rebuild — it's creating new files that's the problem)
// Actually, the issue is creating a DIFFERENT file than the active canvas.
// So we need to find the active canvas and compare.

// Find .excalibrain.json sidecar files in the same directory
const targetDir = path.dirname(path.resolve(targetPath));
let activeSidecars = [];

try {
  const files = fs.readdirSync(targetDir);
  activeSidecars = files
    .filter(f => f.endsWith('.excalibrain.json'))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(targetDir, f), 'utf8'));
        return { sidecar: f, canvas: data.canvas, fullPath: path.join(targetDir, data.canvas) };
      } catch { return null; }
    })
    .filter(Boolean);
} catch {
  // Directory doesn't exist or can't be read — allow
  process.exit(0);
}

if (activeSidecars.length === 0) process.exit(0); // No active sessions

// Check if target path matches any active canvas
const resolvedTarget = path.resolve(targetPath);
const matchesActive = activeSidecars.some(s => path.resolve(s.fullPath) === resolvedTarget);

if (matchesActive) {
  // Writing to the active canvas — this is fine (first section of a rebuild)
  process.exit(0);
}

// Creating a NEW .excalidraw file while an active session exists — BLOCK
const activeNames = activeSidecars.map(s => s.canvas).join(', ');
console.log(`BLOCKED: Creating new file "${path.basename(targetPath)}" while canvas session "${activeNames}" is active in this directory.`);
console.log(`Use --merge to add to the active canvas instead, or delete the .excalibrain.json sidecar to start a new session.`);
process.exit(2);
