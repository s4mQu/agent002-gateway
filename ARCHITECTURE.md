# Electron-Vite Architecture Guide

This project uses [electron-vite](https://electron-vite.org/) with React and TypeScript. There are **three distinct layers**, each living in its own directory under `src/`.

---

## 1. `src/main/` — The Backend (Main Process)

This is the **Node.js backend**. It runs in Electron's main process and has full access to:

- The filesystem, OS APIs, native modules
- Electron APIs like `BrowserWindow`, `dialog`, `Menu`, `Tray`, etc.
- Node.js built-ins (`fs`, `path`, `child_process`, etc.)

The entry point is `src/main/index.ts`. This is where you'd put things like:

- Database connections (SQLite, etc.)
- File system operations
- System tray logic
- Spawning child processes
- Registering IPC handlers (the "server-side" of the communication layer)

As the app grows, create more files/folders under `src/main/` to organise backend logic.

---

## 2. `src/renderer/` — The Frontend (Renderer Process)

This is essentially a **standard React + Vite app**. It runs in a Chromium browser window and has no direct access to Node.js or the OS.

- `src/renderer/src/App.tsx` — root React component
- `src/renderer/src/components/` — UI components
- `src/renderer/src/assets/` — CSS, images, SVGs
- `src/renderer/src/main.tsx` — React entry point
- `src/renderer/index.html` — the HTML shell

Treat this exactly like any React SPA. Router, state management, UI libraries — all go here.

---

## 3. `src/preload/` — The Bridge

This is the **secure middleman** between main and renderer. It runs in a special sandboxed context that has access to some Electron/Node APIs, but its job is to selectively expose only what the renderer needs.

In `src/preload/index.ts`, `contextBridge.exposeInMainWorld` makes two objects available on `window`:

- `window.electron` — the built-in `electronAPI` (includes `ipcRenderer`)
- `window.api` — currently an empty object `{}`, this is where you expose your **custom API surface**

The type definitions in `src/preload/index.d.ts` make these available to TypeScript in the renderer.

---

## How They Talk to Each Other (IPC)

Communication always flows through IPC via the preload bridge. The renderer never talks directly to Node.js.

### Fire-and-Forget (`send` / `on`)

Use `ipcRenderer.send` + `ipcMain.on` when you don't need a response back.

**Renderer** (sends):

```ts
window.electron.ipcRenderer.send('ping')
```

**Main** (listens):

```ts
ipcMain.on('ping', () => console.log('pong'))
```

### Request/Response (`invoke` / `handle`)

Use `ipcRenderer.invoke` + `ipcMain.handle` for async request/response patterns (like fetching data).

**1. Main process** — register a handler:

```ts
ipcMain.handle('read-file', async (_event, filePath: string) => {
  return fs.promises.readFile(filePath, 'utf-8')
})
```

**2. Preload** — expose it safely:

```ts
const api = {
  readFile: (path: string) => ipcRenderer.invoke('read-file', path)
}
contextBridge.exposeInMainWorld('api', api)
```

**3. Renderer** — call it like a normal async function:

```ts
const content = await window.api.readFile('/some/path.txt')
```

---

## The Config

`electron.vite.config.ts` defines three build targets that map to the three directories:

```ts
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
```

Each one is essentially its own Vite config. The `@renderer` alias lets you do clean imports like `import Foo from '@renderer/components/Foo'` in renderer code.

---

## Quick Reference

| Layer    | Directory        | Role                                    | Has Node.js access?            |
| -------- | ---------------- | --------------------------------------- | ------------------------------ |
| Main     | `src/main/`      | Backend — OS, files, DB, native APIs    | Yes                            |
| Preload  | `src/preload/`   | Bridge — exposes safe APIs to frontend  | Limited                        |
| Renderer | `src/renderer/`  | Frontend — React UI                     | No (only what preload exposes) |
