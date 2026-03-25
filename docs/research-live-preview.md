# Research: Excalidraw Live-Preview Renderer

**Date:** 2026-03-25
**Status:** Research complete — ready for prototyping

## Problem Statement

When an AI agent generates or iterates on an `.excalidraw` diagram, there is no way to see changes in real time. The user must manually open the file after each update. A live-preview renderer that watches the file and re-renders on every save would dramatically tighten the feedback loop.

## Executive Summary

Building a live-preview renderer is **fully feasible** with ~200–300 lines of code. The recommended approach is a local web server (Express + WebSocket + chokidar) that watches the `.excalidraw` file and pushes updates to a browser-hosted Excalidraw component. No standalone file-watcher viewer for Excalidraw exists today — this would be a novel tool.

---

## 1. Excalidraw Component APIs

**Package:** `@excalidraw/excalidraw` (latest: v0.18.0, March 2025; codebase pins v0.17.6)

### Key APIs for programmatic scene injection

| API | Purpose | Notes |
|-----|---------|-------|
| `initialData` prop | Load elements on first render | Can be async as of v0.18.0 |
| `excalidrawAPI` prop | Get imperative API handle | Callback-based (replaces old ref approach removed in v0.17.0) |
| `updateScene(sceneData)` | Push new data into mounted component | Core method for live updates |
| `onChange` callback | Fires on every scene mutation | Not needed for read-only viewer |

### updateScene Details

```js
excalidrawAPI.updateScene({
  elements: parsedElements,
  appState: parsedAppState,
  captureUpdate: CaptureUpdateAction.NEVER  // don't pollute undo history
});
```

- `CaptureUpdateAction` enum (`IMMEDIATELY`, `EVENTUALLY`, `NEVER`) is imported from `@excalidraw/element`
- Excalidraw internally diffs elements by `id` + `version` fields, so passing the full file content each time is efficient — unchanged elements are not re-rendered
- **Known gotcha:** Calling `updateScene()` immediately after obtaining the API can be overwritten by `initialData` ([issue #7585](https://github.com/excalidraw/excalidraw/issues/7585)). Workaround: use a small `setTimeout` or wait for the first `onChange` before pushing updates.

### Viewer-Specific Props

```jsx
<Excalidraw
  viewModeEnabled={true}
  UIOptions={{ canvasActions: { export: false, loadScene: false } }}
  excalidrawAPI={(api) => setExcalidrawAPI(api)}
/>
```

---

## 2. File Watching Approaches

### Option A: chokidar (Recommended)

Gold standard for cross-platform Node.js file watching.

```js
const chokidar = require('chokidar');

chokidar.watch('diagram.excalidraw', {
  awaitWriteFinish: { stabilityThreshold: 200 }
}).on('change', (path) => {
  // read and broadcast
});
```

- **`awaitWriteFinish`** polls file size until it stabilizes, preventing reads of partially-written files. Directly addresses the race condition when an AI agent is writing.
- v5 (Nov 2025) is ESM-only, requires Node.js v20+. v4 works with CommonJS.

### Option B: Node.js native `fs.watch`

- Unreliable across platforms (duplicate events, missing filenames on macOS, `rename` instead of `change`).
- Not recommended unless zero dependencies is a hard constraint.

### Option C: Polling (web-only, no Node backend)

- `setInterval` + `fetch` to check file mtime or content hash.
- Simple but wasteful. 500ms polling is a reasonable tradeoff.
- Only relevant if there is no Node.js process available.

---

## 3. Architecture Options

### Option A: Local Web Server (Recommended)

```
[AI Agent] --writes--> diagram.excalidraw
                            |
                     [Node server: chokidar watches file]
                            |
                     [WebSocket push to browser]
                            |
                     [React app: excalidrawAPI.updateScene()]
```

**Stack:** Express + `ws` + chokidar + React + Excalidraw

| Pros | Cons |
|------|------|
| Lightest weight, no Electron overhead | Requires a running Node process + browser tab |
| Vite HMR for development | No native OS window controls |
| Works in any browser | |
| Could work remotely (SSH tunnel) | |
| Simple packaging: `node tools/preview.js diagram.excalidraw` | |

**Estimated effort:** ~200–300 lines of code.

**Implementation sketch:**
1. Express serves a React SPA with `<Excalidraw>`.
2. `ws` WebSocket server on same port.
3. chokidar watches the target file, reads JSON, sends over WebSocket.
4. Client receives JSON, calls `excalidrawAPI.updateScene()`.

### Option B: Electron App

| Pros | Cons |
|------|------|
| Native window, tray icon, OS integration | Heavy (~200MB disk, ~150MB+ RAM baseline) |
| Direct fs access in main process | Excalidraw team deprecated their own Electron app |
| Standalone .app/.exe distribution | More complex build pipeline |

**Verdict:** Viable but overkill for a viewer.

### Option C: VS Code Extension Webview

| Pros | Cons |
|------|------|
| Users already have VS Code open | Tied to VS Code |
| excalidraw-vscode proves it works | Custom Editor API is for editing, not viewing |
| No extra window | Webview CSP makes loading assets complex |

**Verdict:** Good if the audience exclusively uses VS Code. Too limiting otherwise.

---

## 4. Potential Challenges

### Bundle Size

- `@excalidraw/excalidraw` unpacked is ~47MB (fonts, assets, etc.).
- Actual JS bundle shipped to browser: ~2–4MB gzipped for the full interactive component.
- Since this runs locally (not shipped over the network to end users), bundle size is acceptable.
- The existing `build-bundle.js` infrastructure can be extended to bundle the full component.

### Race Conditions (AI writing while viewer reads)

Three layers of protection:
1. **chokidar `awaitWriteFinish`** — waits until file size stabilizes.
2. **`JSON.parse` try/catch** — skip truncated writes, wait for next event.
3. **Atomic writes** — AI agent can write to `.tmp` then rename (chokidar handles rename events correctly).

### File Format Stability

- The `.excalidraw` JSON format has top-level fields: `type`, `version`, `source`, `elements`, `appState`, `files`.
- No formal JSON Schema published, but the structure is stable with backward compatibility maintained across versions.
- This codebase already generates valid `.excalidraw` files via `dagre-layout.js`.

### Incremental Updates vs Full Re-renders

- `updateScene()` accepts a full elements array. Excalidraw diffs internally by `id` + `version`, so this is efficient.
- The `applyIncrements` API exists for collaboration-style deltas but is unnecessary for file watching.

### Performance

- Diagrams with hundreds of elements: no issues.
- Thousands of elements: may cause lag during re-render.
- `viewModeEnabled={true}` reduces overhead by disabling the editing UI.
- Memory usage for a static diagram viewer: under 100MB typically.

---

## 5. Prior Art

| Project | What it does | Relevance |
|---------|-------------|-----------|
| [excalidraw-vscode](https://github.com/excalidraw/excalidraw-vscode) | VS Code Custom Editor hosting full Excalidraw component | Closest prior art for embedding Excalidraw |
| [excalidraw-desktop](https://github.com/excalidraw/excalidraw-desktop) (deprecated) | Electron wrapper around web app | Reference for Electron integration |
| [excalidraw-copilot](https://github.com/nadomani/excalidraw-copilot) | VS Code extension, generates diagrams from natural language | Closest to AI-writes-file-viewer-updates pattern |
| [obsidian-excalidraw-plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) | Excalidraw embedded in Obsidian | Demonstrates embedding in non-standard environments |

**No standalone file-watcher viewer exists.** This would be novel.

---

## 6. Recommendation

Build **Option A (local web server)** as a new tool: `node tools/preview.js diagram.excalidraw`.

### Proposed Stack

| Layer | Technology |
|-------|-----------|
| Server | Express (static files) + ws (WebSocket) |
| File watching | chokidar with `awaitWriteFinish` |
| Frontend | React + `@excalidraw/excalidraw` |
| Build | esbuild (extend existing `build-bundle.js`) |
| Mode | `viewModeEnabled={true}`, read-only |

### Prototype Milestones

1. **Build the viewer bundle** — extend `build-bundle.js` to produce a full Excalidraw component bundle (not just `exportToSvg`)
2. **WebSocket server** — Express + `ws` + chokidar, ~50 lines
3. **Viewer client** — React app that connects to WebSocket and calls `updateScene()`, ~100 lines
4. **HTML shell** — static HTML that loads the viewer bundle, ~30 lines
5. **CLI entry point** — `tools/preview.js` that parses args, starts server, opens browser, ~50 lines
6. **Polish** — error handling, dark mode support, auto-fit on resize

### New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `ws` | WebSocket server | ~50KB |
| `chokidar` | File watching | ~30KB (v4) |
| `open` | Open browser from CLI | ~7KB |

Express is optional — could use Node's built-in `http` module + `ws` to keep dependencies minimal.

---

## Sources

- [Excalidraw API — excalidrawAPI](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api)
- [Excalidraw API — Props](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props)
- [Excalidraw API — initialData](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/initialdata)
- [Excalidraw Integration Guide](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration)
- [Excalidraw JSON Schema](https://docs.excalidraw.com/docs/codebase/json-schema)
- [updateScene issue #7585](https://github.com/excalidraw/excalidraw/issues/7585)
- [Deprecating Excalidraw Electron](https://blog.excalidraw.com/deprecating-excalidraw-electron/)
- [excalidraw-vscode](https://github.com/excalidraw/excalidraw-vscode)
- [Chokidar](https://github.com/paulmillr/chokidar)
- [Excalidraw npm](https://www.npmjs.com/package/@excalidraw/excalidraw)
