# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with HMR (main + renderer processes)
npm run build        # Typecheck then build for production
npm start            # Preview the production build
npm run typecheck    # Type-check all targets (node + web)
npm run lint         # ESLint with cache
npm run format       # Prettier format
npm run test         # Vitest test suite

# Platform-specific production builds
npm run build:win
npm run build:mac
npm run build:linux
```

## Architecture

This is an Electron desktop app with three isolated process layers:

**Main Process** (`src/main/`) — Full Node.js environment. Owns window creation, IPC handler registration (`ipcMain.handle`/`ipcMain.on`), file system access, and OS APIs. Entry point is `src/main/index.ts`.

**Preload Script** (`src/preload/`) — Security bridge between main and renderer. Uses `contextBridge.exposeInMainWorld` to selectively expose APIs to the renderer. Any new IPC channel must be wired here. Type declarations live in `src/preload/index.d.ts` (extends `ElectronAPI` interface on `window.api`).

**Renderer Process** (`src/renderer/`) — Sandboxed React 19 SPA. Cannot access Node.js APIs directly; must use `window.api.*` (from preload) or `window.electron.ipcRenderer` for IPC. Entry is `src/renderer/src/main.tsx`, root component is `App.tsx`.

**Adding a new IPC channel** requires three coordinated changes:
1. `src/main/index.ts` — register handler with `ipcMain.handle('channel-name', ...)`
2. `src/preload/index.ts` — expose wrapper via `contextBridge`
3. `src/preload/index.d.ts` — add type to `window.api`

## Key Config

- **electron.vite.config.ts** — Three separate Vite configs (main, preload, renderer). Renderer has `@renderer` path alias.
- **electron-builder.yml** — Packaging targets: Windows NSIS, macOS DMG (with notarization), Linux AppImage/snap/deb.
- **.env** (gitignored) — Environment vars for main process must be prefixed `MAIN_VITE_*`. See `.env.example`.
- **Prettier**: single quotes, no semicolons, 100-char line width, no trailing commas.
- **Context isolation** is currently disabled (`sandbox: false`, `contextIsolation: false`) — the `contextBridge` fallback path in preload handles this.

## LangChain / AI

`@langchain/anthropic`, `@langchain/core`, and `langchain` are installed but not yet used in code — AI/LLM integration via Claude is planned. When implementing, use `MAIN_VITE_*` env vars for API keys (main process only).
