#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "excalibrain test suite"
echo ""
echo "dagre-layout.js:"
node tests/test-dagre.js
echo ""
echo "export.js:"
node tests/test-export.js
echo ""
echo "mermaid-convert.js:"
node tests/test-mermaid.js
echo ""
echo "canvas-inspect.js:"
node tests/test-canvas-inspect.js
echo ""
echo "merge/position/prefix:"
node tests/test-merge.js
echo ""
echo "fast-check.js:"
node tests/test-fast-check.js
echo ""
echo "All tests complete."
