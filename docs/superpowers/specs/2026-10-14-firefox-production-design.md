# TabKeeper Firefox Production Release — Design

**Date:** 2026-10-14  
**Status:** Approved for planning  
**Goal:** Ship TabKeeper as a production Firefox MV3 extension with working Saved sets, a signed install package, and an AMO-ready layout.

## Decisions (locked)

| Topic | Choice |
|--------|--------|
| Distribution | Both: local/signed XPI **and** AMO-ready structure |
| Signing | Mozilla Add-ons account + `web-ext sign` via JWT API keys |
| Extension ID | `tabkeeper@fbarikzehi` |
| Scope | Full feature pass: implement Saved/storage before packaging |
| Approach | Minimal Saved on `browser.storage.local` + Firefox packaging (Approach 1) |

## Architecture

TabKeeper remains a **Firefox Manifest V3 popup extension** built with Vue 3 + Vite.

| Piece | Role |
|--------|------|
| `manifest.json` | MV3; gecko id; only permissions that Saved + tab/window management need |
| `background.js` | Firefox background `scripts` entry; minimal install/message handling |
| Popup (`index.html` → Vue) | On Desk / Groups / Saved UI |
| `webextension-polyfill` | Available in popup and background as `browser.*` |
| `browser.storage.local` | Persist Saved tab sets |
| Vite → `dist/` | Production assets with relative paths |
| `web-ext` | lint, package, sign for AMO / self-distribution |

**Data flow**

1. Popup queries open tabs/windows via `browser.tabs` / `browser.windows`.
2. User saves a selection (or all / a window) → write a Saved set to `storage.local`.
3. Saved UI lists sets; restore opens URLs; rename/delete update storage.

**Permissions (trimmed)**

- Keep exactly: `storage`, `tabs`, `activeTab`
- Window listing/focus uses `browser.windows.*`, which Firefox exposes without a separate manifest permission when `tabs` is granted
- Drop unused: `downloads`, `identity`, `alarms`, `unlimitedStorage`
- Drop broad `host_permissions` (`*://*/*`) — restore uses `browser.tabs.create({ url })` and does not need host access

## Components & behavior

### Composables

- **`useTab` / `useWindow`** — keep; fix duplicate-count logic and ensure Firefox-safe API usage via polyfill.
- **`useSaved` (new)** — CRUD for Saved sets in `browser.storage.local` under key `savedSets`.

### Saved set model

```js
{
  id: string,        // crypto.randomUUID()
  name: string,      // editable; default "Saved YYYY-MM-DD HH:mm"
  createdAt: number, // Date.now()
  tabs: [{ title, url, favIconUrl }]
}
```

### On Desk

- Checkboxes select tabs.
- **Save selected** — if none selected, **Save all** visible/query results.
- Creates a Saved set; user can switch to Saved or stay on On Desk.
- Existing click-to-focus tab behavior remains.

### Groups

- List open windows (existing).
- **Save this window’s tabs** — creates a Saved set (name derived from window title or “Window N”).

### Saved

- List sets: name, tab count, created date.
- Per set: **Restore** (open all URLs in a **new window**), **Rename**, **Delete**.
- Empty state when `savedSets` is empty.
- Replace placeholder “Landing Page Design” UI entirely.

### Background

- Minimal: install/logging and optional message ack.
- No business logic required for v1 Saved (storage accessed from popup).

## Build, packaging & signing

### Pipeline

1. Vite builds the popup into `dist/` (relative `base`, predictable asset names). Entry remains `index.html` → compiled next to it as the popup root.
2. Post-build step ensures `dist/` contains: `index.html` + JS/CSS assets, `manifest.json`, `background.js`, `icons/`, and `browser-polyfill.js` (copied from `webextension-polyfill`).
3. Manifest paths (all relative to `dist/`): `action.default_popup` = `index.html`; background `scripts` = `["browser-polyfill.js", "background.js"]`.

### npm scripts

| Script | Purpose |
|--------|---------|
| `build` | Production Vite build + copy extension assets into `dist` |
| `firefox:lint` | `web-ext lint` against `dist` |
| `firefox:run` | Temporary load for local testing |
| `firefox:build` | Package zip/xpi from `dist` |
| `firefox:sign` | `web-ext sign` using env credentials |

### Credentials (never committed)

- `WEB_EXT_API_KEY`
- `WEB_EXT_API_SECRET`

Document in README how to create JWT credentials on AMO and run `firefox:sign`.

### AMO / gecko metadata

- `browser_specific_settings.gecko.id`: `tabkeeper@fbarikzehi`
- `strict_min_version`: **109.0** (Firefox MV3 baseline)
- Version synced between `package.json` and `manifest.json` at **1.0.0** for the first production release

### Install paths

1. **Dev:** `npm run firefox:run` or load `dist` via `about:debugging`.
2. **Signed self-distribute:** run `firefox:sign`, install resulting `.xpi`.
3. **AMO:** upload the built package (or use signed channel) for public listing.

## Error handling

- Storage failures → inline error message in Saved (and on save actions).
- Restore skips invalid/empty URLs; opens remaining tabs.
- Missing favicons → generic placeholder image/icon.

## Testing (manual + lint)

- `web-ext lint` clean before signing.
- Manual checklist via `firefox:run`:
  - On Desk: list, search, focus tab, save selected / save all
  - Groups: list windows, save window tabs
  - Saved: list, rename, restore (new window), delete, empty state
  - Reload extension; Saved sets persist

## Out of scope (this release)

- `browser.storage.sync` / Firefox Account sync
- Chrome/Edge packaging
- Full redesign of existing On Desk / Groups visuals
- Cloud backup, export/import files (may use `downloads` later)

## Success criteria

1. `npm run build` produces a loadable Firefox MV3 extension in `dist/`.
2. Saved create / restore / rename / delete works and persists across reloads.
3. Unused permissions removed; `web-ext lint` passes.
4. `firefox:sign` documented and runnable with AMO JWT keys.
5. README covers local install, signed XPI install, and AMO upload.
