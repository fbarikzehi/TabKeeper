# TabKeeper Firefox Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship TabKeeper as a Firefox MV3 extension with working Saved tab sets, a production `dist/` package, and `web-ext` lint/build/sign scripts for AMO.

**Architecture:** Vue 3 popup talks to Firefox APIs via `webextension-polyfill`. Saved sets live in `browser.storage.local` under `savedSets`. Vite builds the popup; a post-build script copies manifest, background, icons, and polyfill into `dist/`. `web-ext` packages and signs from `dist/`.

**Tech Stack:** Vue 3, Vite 5, Tailwind, webextension-polyfill, web-ext, Vitest

## Global Constraints

- Extension ID: `tabkeeper@fbarikzehi`
- Permissions exactly: `storage`, `tabs`, `activeTab` (no host_permissions)
- Version: `1.0.0` in both `package.json` and `manifest.json`
- Gecko `strict_min_version`: `109.0`
- Credentials only via env: `WEB_EXT_API_KEY`, `WEB_EXT_API_SECRET` (never commit)
- Spec: `docs/superpowers/specs/2026-10-14-firefox-production-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/savedSets.js` | Pure helpers: default name, create set object, filter valid URLs |
| `src/composables/saved.js` | `useSaved` — load/save/rename/delete/restore via storage |
| `src/composables/tab.js` | Tab query/focus; fix duplicate count; support selection mapping |
| `src/views/stored.vue` | Saved UI |
| `src/views/on-desk.vue` | Selection + save actions |
| `src/views/groups.vue` | Save window tabs |
| `public/manifest.json` | Firefox MV3 production manifest |
| `public/background.js` | Minimal Firefox background script |
| `scripts/copy-extension-assets.mjs` | Post-Vite copy into `dist/` |
| `package.json` | Scripts + web-ext + vitest |
| `vitest.config.js` | Unit test config |
| `src/lib/savedSets.test.js` | Tests for pure helpers |
| `src/composables/saved.test.js` | Tests for `useSaved` with mocked storage |
| `README.md` | Install, sign, AMO instructions |

---

### Task 1: Pure Saved helpers + Vitest

**Files:**
- Create: `src/lib/savedSets.js`
- Create: `src/lib/savedSets.test.js`
- Create: `vitest.config.js`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `defaultSavedName(date?: Date): string` → `"Saved YYYY-MM-DD HH:mm"`
  - `createSavedSet({ name?, tabs, now?, id? }): { id, name, createdAt, tabs }`
  - `filterValidTabUrls(tabs): tabs` — keeps entries with non-empty `http:`/`https:` URLs
  - `STORAGE_KEY = 'savedSets'`

- [ ] **Step 1: Add Vitest dependency and scripts**

```bash
npm install -D vitest
```

Update `package.json` scripts (merge with existing):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && node scripts/copy-extension-assets.mjs",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "version": "1.0.0"
}
```

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

Note: `build` references the copy script that Task 6 adds. Until then, either create a no-op stub or keep `build` as `"vite build"` and update it in Task 6. Prefer updating `build` in Task 6 only; for Task 1 leave:

```json
"build": "vite build"
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/savedSets.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  defaultSavedName,
  createSavedSet,
  filterValidTabUrls,
  STORAGE_KEY,
} from './savedSets.js'

describe('savedSets helpers', () => {
  it('exports STORAGE_KEY', () => {
    expect(STORAGE_KEY).toBe('savedSets')
  })

  it('formats default name', () => {
    const d = new Date('2026-10-14T15:05:00')
    expect(defaultSavedName(d)).toBe('Saved 2026-10-14 15:05')
  })

  it('creates a saved set with tabs', () => {
    const set = createSavedSet({
      id: 'fixed-id',
      now: 1000,
      name: 'Work',
      tabs: [{ title: 'A', url: 'https://a.test', favIconUrl: '' }],
    })
    expect(set).toEqual({
      id: 'fixed-id',
      name: 'Work',
      createdAt: 1000,
      tabs: [{ title: 'A', url: 'https://a.test', favIconUrl: '' }],
    })
  })

  it('filters invalid urls', () => {
    const tabs = [
      { title: 'ok', url: 'https://ok.test', favIconUrl: '' },
      { title: 'bad', url: 'about:blank', favIconUrl: '' },
      { title: 'empty', url: '', favIconUrl: '' },
      { title: 'ftp', url: 'ftp://x', favIconUrl: '' },
    ]
    expect(filterValidTabUrls(tabs)).toEqual([
      { title: 'ok', url: 'https://ok.test', favIconUrl: '' },
    ])
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test
```

Expected: FAIL (module `./savedSets.js` not found or exports missing)

- [ ] **Step 4: Implement helpers**

Create `src/lib/savedSets.js`:

```js
export const STORAGE_KEY = 'savedSets'

export function defaultSavedName(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `Saved ${y}-${m}-${d} ${hh}:${mm}`
}

export function createSavedSet({ name, tabs, now = Date.now(), id = crypto.randomUUID() }) {
  return {
    id,
    name: name || defaultSavedName(new Date(now)),
    createdAt: now,
    tabs: tabs.map((t) => ({
      title: t.title || '',
      url: t.url || '',
      favIconUrl: t.favIconUrl || '',
    })),
  }
}

export function filterValidTabUrls(tabs) {
  return tabs.filter((t) => {
    try {
      const u = new URL(t.url)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  })
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/lib/savedSets.js src/lib/savedSets.test.js
git commit -m "Add saved set helpers and Vitest."
```

---

### Task 2: `useSaved` composable

**Files:**
- Create: `src/composables/saved.js`
- Create: `src/composables/saved.test.js`

**Interfaces:**
- Consumes: `STORAGE_KEY`, `createSavedSet`, `filterValidTabUrls` from `src/lib/savedSets.js`
- Produces: `useSaved()` → `{
    savedSets: Ref<SavedSet[]>,
    error: Ref<string|null>,
    loadSavedSets(): Promise<void>,
    saveTabs(tabs, name?: string): Promise<SavedSet|null>,
    renameSet(id, name): Promise<void>,
    deleteSet(id): Promise<void>,
    restoreSet(id): Promise<void>
  }`
- `restoreSet` opens a new window with filtered http(s) URLs via `browser.windows.create({ url: string[] })`

- [ ] **Step 1: Write failing tests with mocked browser**

Create `src/composables/saved.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('webextension-polyfill', () => {
  const local = {
    get: vi.fn(),
    set: vi.fn(),
  }
  return {
    default: {
      storage: { local },
      windows: {
        create: vi.fn(),
      },
    },
  }
})

import browser from 'webextension-polyfill'
import { useSaved } from './saved.js'

describe('useSaved', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loadSavedSets reads storage', async () => {
    browser.storage.local.get.mockResolvedValue({
      savedSets: [{ id: '1', name: 'A', createdAt: 1, tabs: [] }],
    })
    const { savedSets, loadSavedSets } = useSaved()
    await loadSavedSets()
    expect(savedSets.value).toHaveLength(1)
    expect(savedSets.value[0].name).toBe('A')
  })

  it('saveTabs appends a set', async () => {
    browser.storage.local.get.mockResolvedValue({ savedSets: [] })
    browser.storage.local.set.mockResolvedValue(undefined)
    const { savedSets, saveTabs, loadSavedSets } = useSaved()
    await loadSavedSets()
    const set = await saveTabs(
      [{ title: 'T', url: 'https://example.com', favIconUrl: '' }],
      'Demo',
    )
    expect(set.name).toBe('Demo')
    expect(savedSets.value).toHaveLength(1)
    expect(browser.storage.local.set).toHaveBeenCalled()
  })

  it('deleteSet removes by id', async () => {
    browser.storage.local.get.mockResolvedValue({
      savedSets: [{ id: 'x', name: 'A', createdAt: 1, tabs: [] }],
    })
    browser.storage.local.set.mockResolvedValue(undefined)
    const { savedSets, loadSavedSets, deleteSet } = useSaved()
    await loadSavedSets()
    await deleteSet('x')
    expect(savedSets.value).toHaveLength(0)
  })

  it('restoreSet opens window with valid urls only', async () => {
    browser.storage.local.get.mockResolvedValue({
      savedSets: [{
        id: 'r',
        name: 'R',
        createdAt: 1,
        tabs: [
          { title: 'a', url: 'https://a.test', favIconUrl: '' },
          { title: 'b', url: 'about:blank', favIconUrl: '' },
        ],
      }],
    })
    browser.windows.create.mockResolvedValue({})
    const { loadSavedSets, restoreSet } = useSaved()
    await loadSavedSets()
    await restoreSet('r')
    expect(browser.windows.create).toHaveBeenCalledWith({
      url: ['https://a.test'],
    })
  })

  it('sets error on storage failure', async () => {
    browser.storage.local.get.mockRejectedValue(new Error('boom'))
    const { error, loadSavedSets } = useSaved()
    await loadSavedSets()
    expect(error.value).toMatch(/boom/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/composables/saved.test.js
```

Expected: FAIL (cannot find `./saved.js`)

- [ ] **Step 3: Implement `useSaved`**

Create `src/composables/saved.js`:

```js
import { ref } from 'vue'
import browser from 'webextension-polyfill'
import {
  STORAGE_KEY,
  createSavedSet,
  filterValidTabUrls,
} from '../lib/savedSets.js'

export function useSaved() {
  const savedSets = ref([])
  const error = ref(null)

  async function persist(next) {
    await browser.storage.local.set({ [STORAGE_KEY]: next })
    savedSets.value = next
  }

  async function loadSavedSets() {
    error.value = null
    try {
      const data = await browser.storage.local.get(STORAGE_KEY)
      savedSets.value = Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : []
    } catch (e) {
      error.value = e?.message || String(e)
      savedSets.value = []
    }
  }

  async function saveTabs(tabs, name) {
    error.value = null
    try {
      await loadSavedSets()
      const set = createSavedSet({ name, tabs })
      await persist([set, ...savedSets.value])
      return set
    } catch (e) {
      error.value = e?.message || String(e)
      return null
    }
  }

  async function renameSet(id, name) {
    error.value = null
    try {
      const next = savedSets.value.map((s) =>
        s.id === id ? { ...s, name: name.trim() || s.name } : s,
      )
      await persist(next)
    } catch (e) {
      error.value = e?.message || String(e)
    }
  }

  async function deleteSet(id) {
    error.value = null
    try {
      await persist(savedSets.value.filter((s) => s.id !== id))
    } catch (e) {
      error.value = e?.message || String(e)
    }
  }

  async function restoreSet(id) {
    error.value = null
    try {
      const set = savedSets.value.find((s) => s.id === id)
      if (!set) {
        error.value = 'Saved set not found'
        return
      }
      const urls = filterValidTabUrls(set.tabs).map((t) => t.url)
      if (urls.length === 0) {
        error.value = 'No valid URLs to restore'
        return
      }
      await browser.windows.create({ url: urls })
    } catch (e) {
      error.value = e?.message || String(e)
    }
  }

  return {
    savedSets,
    error,
    loadSavedSets,
    saveTabs,
    renameSet,
    deleteSet,
    restoreSet,
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/saved.js src/composables/saved.test.js
git commit -m "Add useSaved composable for local Saved sets."
```

---

### Task 3: Saved UI (`stored.vue`)

**Files:**
- Modify: `src/views/stored.vue` (replace entire file)

**Interfaces:**
- Consumes: `useSaved()` from Task 2
- Placeholder favicon: use a data-URI or empty `alt` + gray box when `favIconUrl` missing

- [ ] **Step 1: Replace `stored.vue` with working Saved UI**

```vue
<script setup>
import { onBeforeMount, ref } from 'vue'
import { useSaved } from '../composables/saved.js'

const {
  savedSets,
  error,
  loadSavedSets,
  renameSet,
  deleteSet,
  restoreSet,
} = useSaved()

const editingId = ref(null)
const draftName = ref('')

onBeforeMount(async () => {
  await loadSavedSets()
})

function startRename(set) {
  editingId.value = set.id
  draftName.value = set.name
}

async function commitRename(id) {
  await renameSet(id, draftName.value)
  editingId.value = null
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="relative flex flex-col w-full p-4 bg-white dark:bg-slate-800">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-xl font-bold text-navy-700 dark:text-white">
        Saved {{ savedSets.length ? `(${savedSets.length})` : '' }}
      </h4>
    </div>

    <p v-if="error" class="text-sm text-rose-600 mb-2">{{ error }}</p>

    <p
      v-if="!savedSets.length && !error"
      class="text-sm text-slate-500 dark:text-slate-300"
    >
      No saved sets yet. Save tabs from On Desk or Groups.
    </p>

    <div
      v-for="set in savedSets"
      :key="set.id"
      class="flex flex-col gap-1 p-2 mt-1 w-full hover:bg-slate-200 dark:hover:bg-slate-600 rounded-sm"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <input
            v-if="editingId === set.id"
            v-model="draftName"
            class="w-full rounded px-1 text-sm"
            @keyup.enter="commitRename(set.id)"
            @blur="commitRename(set.id)"
          />
          <p v-else class="text-sm font-medium text-navy-700 dark:text-white truncate">
            {{ set.name }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-300">
            {{ set.tabs.length }} tabs · {{ formatDate(set.createdAt) }}
          </p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            class="rounded-lg p-2 text-sm dark:text-white hover:bg-white/20"
            title="Restore"
            @click="restoreSet(set.id)"
          >
            Restore
          </button>
          <button
            class="rounded-lg p-2 text-sm dark:text-white hover:bg-white/20"
            title="Rename"
            @click="startRename(set)"
          >
            Rename
          </button>
          <button
            class="rounded-lg p-2 text-sm text-rose-600 hover:bg-white/20"
            title="Delete"
            @click="deleteSet(set.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Sanity-check unit tests still pass**

```bash
npm test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/views/stored.vue
git commit -m "Replace Saved placeholder with restore/rename/delete UI."
```

---

### Task 4: On Desk selection + save + tab fixes

**Files:**
- Modify: `src/composables/tab.js`
- Modify: `src/views/on-desk.vue`

**Interfaces:**
- Consumes: `useSaved().saveTabs`
- Fixes `queryTabDuplicates`: count unique URLs that appear more than once (number), not a filtered array assigned to a count ref
- Adds selection: `selectedIds` Set/ref of tab ids; `saveSelectedOrAll` calls `saveTabs`

- [ ] **Step 1: Fix `tab.js` duplicate count and export helpers**

Replace `queryTabDuplicates` and ensure search re-queries correctly. Full updated `src/composables/tab.js`:

```js
import { ref, onMounted } from 'vue'
import browser from 'webextension-polyfill'

export function useTab() {
  const tabs = ref([])
  const duplicateTabCount = ref(0)
  const selectedIds = ref(new Set())

  const query = async (queryInfo = {}) => {
    tabs.value = await browser.tabs.query(queryInfo)
    selectedIds.value = new Set()
    queryTabDuplicates()
  }

  const bringTabToFront = async (tab) => {
    await browser.windows.update(tab.windowId, { focused: true })
    await browser.tabs.update(tab.id, { active: true })
  }

  const bringTabsToBack = async () => {
    for (const t of tabs.value) {
      await browser.tabs.update(t.id, { active: false }).catch(() => {})
    }
  }

  const handleTabSearch = async (val) => {
    if (val && val.length > 0) {
      const all = await browser.tabs.query({})
      tabs.value = all.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(val.toLowerCase()) ||
          (t.url || '').toLowerCase().includes(val.toLowerCase()),
      )
    } else {
      await query({})
    }
    queryTabDuplicates()
  }

  const queryTabDuplicates = () => {
    const counts = new Map()
    for (const tab of tabs.value) {
      const key = tab.url || ''
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    let dupes = 0
    for (const tab of tabs.value) {
      if ((counts.get(tab.url || '') || 0) > 1) dupes += 1
    }
    duplicateTabCount.value = dupes
  }

  const toggleSelect = (tabId) => {
    const next = new Set(selectedIds.value)
    if (next.has(tabId)) next.delete(tabId)
    else next.add(tabId)
    selectedIds.value = next
  }

  const isSelected = (tabId) => selectedIds.value.has(tabId)

  const getTabsForSave = () => {
    if (selectedIds.value.size === 0) return tabs.value
    return tabs.value.filter((t) => selectedIds.value.has(t.id))
  }

  onMounted(() => {
    queryTabDuplicates()
  })

  return {
    tabs,
    duplicateTabCount,
    selectedIds,
    query,
    bringTabToFront,
    bringTabsToBack,
    handleTabSearch,
    toggleSelect,
    isSelected,
    getTabsForSave,
  }
}
```

- [ ] **Step 2: Wire save into `on-desk.vue`**

In `<script setup>`, add:

```js
import { useSaved } from '../composables/saved.js'

const {
  tabs,
  duplicateTabCount,
  query,
  bringTabToFront,
  bringTabsToBack,
  handleTabSearch,
  toggleSelect,
  isSelected,
  getTabsForSave,
} = useTab()

const { saveTabs, error: saveError } = useSaved()
const saveMessage = ref('')

async function saveCurrentSelection() {
  saveMessage.value = ''
  const toSave = getTabsForSave()
  if (!toSave.length) {
    saveMessage.value = 'No tabs to save'
    return
  }
  const set = await saveTabs(toSave)
  if (set) saveMessage.value = `Saved “${set.name}”`
}
```

In template header area (near the title / actions), add a Save button and message:

```html
<button
  type="button"
  class="rounded-lg px-3 py-1 text-sm bg-indigo-600 text-white hover:bg-indigo-500"
  @click="saveCurrentSelection"
>
  Save selected
</button>
<p v-if="saveMessage || saveError" class="text-xs text-slate-600 dark:text-slate-200 px-2">
  {{ saveMessage || saveError }}
</p>
```

Bind checkboxes:

```html
<input
  type="checkbox"
  :checked="isSelected(tab.id)"
  @change="toggleSelect(tab.id)"
  class="..."
/>
```

Keep existing focus buttons. Leave “group by window” as-is if unfinished (do not expand scope).

- [ ] **Step 3: Commit**

```bash
git add src/composables/tab.js src/views/on-desk.vue
git commit -m "Add On Desk tab selection and save-to-Saved."
```

---

### Task 5: Groups — save window tabs

**Files:**
- Modify: `src/views/groups.vue`

**Interfaces:**
- Consumes: `browser.tabs.query({ windowId })`, `useSaved().saveTabs`

- [ ] **Step 1: Add save-window action**

Update script (remove `lang="ts"` to match project JS):

```js
import { onBeforeMount, ref } from 'vue'
import browser from 'webextension-polyfill'
import { useWindow } from '../composables/window.js'
import { useSaved } from '../composables/saved.js'

const { windows, getAllOpen, bringToFront, bringAllToBack } = useWindow()
const { saveTabs, error: saveError } = useSaved()
const saveMessage = ref('')

onBeforeMount(async () => {
  await getAllOpen()
})

function windowLabel(win, index) {
  const raw = (win.title || '').replace('— Mozilla Firefox', '').trim()
  return raw || `Window ${index + 1}`
}

async function saveWindow(win, index) {
  saveMessage.value = ''
  const tabs = await browser.tabs.query({ windowId: win.id })
  const set = await saveTabs(tabs, windowLabel(win, index))
  if (set) saveMessage.value = `Saved “${set.name}”`
}
```

Wire the existing archive-style button (first action button in the row) to `@click="saveWindow(win, i)"` and show `saveMessage || saveError` above the list.

- [ ] **Step 2: Commit**

```bash
git add src/views/groups.vue
git commit -m "Add save-window action on Groups tab."
```

---

### Task 6: Firefox manifest, background, and dist asset pipeline

**Files:**
- Modify: `public/manifest.json`
- Modify: `public/background.js`
- Create: `scripts/copy-extension-assets.mjs`
- Modify: `package.json` (`build` script)
- Modify: `vite.config.js` if needed so `index.html` lands at `dist/index.html`
- Modify: `.gitignore` — add `web-ext-artifacts/`

**Interfaces:**
- Produces loadable `dist/` with paths matching manifest

- [ ] **Step 1: Rewrite `public/manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "TabKeeper",
  "version": "1.0.0",
  "description": "TabKeeper is a browser tab manager.",
  "author": "fbarikzehi",
  "browser_specific_settings": {
    "gecko": {
      "id": "tabkeeper@fbarikzehi",
      "strict_min_version": "109.0"
    }
  },
  "permissions": ["storage", "tabs", "activeTab"],
  "background": {
    "scripts": ["browser-polyfill.js", "background.js"]
  },
  "action": {
    "default_popup": "index.html",
    "default_icon": "icons/64.png",
    "default_title": "TabKeeper"
  },
  "icons": {
    "16": "icons/16.png",
    "32": "icons/32.png",
    "48": "icons/48.png",
    "64": "icons/64.png",
    "96": "icons/96.png",
    "128": "icons/128.png"
  }
}
```

- [ ] **Step 2: Simplify `public/background.js` for Firefox**

```js
importScripts('browser-polyfill.js')

browser.runtime.onInstalled.addListener(() => {
  console.log('TabKeeper installed')
})

browser.runtime.onMessage.addListener((message) => {
  console.log('TabKeeper message', message)
  return Promise.resolve({ ok: true })
})
```

Note: Firefox MV3 with `background.scripts` may not support `importScripts` the same way as service workers. Prefer listing polyfill first in manifest and **not** calling `importScripts` in `background.js`. Use this instead:

```js
browser.runtime.onInstalled.addListener(() => {
  console.log('TabKeeper installed')
})

browser.runtime.onMessage.addListener((message) => {
  console.log('TabKeeper message', message)
  return Promise.resolve({ ok: true })
})
```

Manifest already loads `browser-polyfill.js` before `background.js`.

- [ ] **Step 3: Create `scripts/copy-extension-assets.mjs`**

```js
import { cpSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')
const require = createRequire(import.meta.url)

if (!existsSync(dist)) {
  console.error('dist/ missing — run vite build first')
  process.exit(1)
}

copyFileSync(join(root, 'public/manifest.json'), join(dist, 'manifest.json'))
copyFileSync(join(root, 'public/background.js'), join(dist, 'background.js'))

const iconsSrc = join(root, 'public/icons')
const iconsDest = join(dist, 'icons')
mkdirSync(iconsDest, { recursive: true })
cpSync(iconsSrc, iconsDest, { recursive: true })

const polyfill = require.resolve('webextension-polyfill/dist/browser-polyfill.js')
copyFileSync(polyfill, join(dist, 'browser-polyfill.js'))

console.log('Extension assets copied to dist/')
```

- [ ] **Step 4: Fix Vite HTML entry so popup is `dist/index.html`**

Update `vite.config.js`:

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  base: './',
})
```

Also fix `index.html`: remove broken `./src/assets/tailwind.css` link (styles come from `main.js` → `style.css`):

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TabKeeper</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

Update `package.json`:

```json
"build": "vite build && node scripts/copy-extension-assets.mjs",
"version": "1.0.0"
```

Add to `.gitignore`:

```
web-ext-artifacts/
*.xpi
```

- [ ] **Step 5: Build and verify dist layout**

```bash
npm run build
ls -la dist
ls -la dist/icons
test -f dist/manifest.json && test -f dist/background.js && test -f dist/browser-polyfill.js && test -f dist/index.html && echo OK
```

Expected: `OK`; `dist/manifest.json` contains `tabkeeper@fbarikzehi`

- [ ] **Step 6: Commit**

```bash
git add public/manifest.json public/background.js scripts/copy-extension-assets.mjs vite.config.js index.html package.json .gitignore
git commit -m "Add Firefox MV3 manifest and dist packaging pipeline."
```

---

### Task 7: web-ext scripts, lint, README

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `.web-ext-config.mjs` (optional but preferred)

- [ ] **Step 1: Install web-ext**

```bash
npm install -D web-ext
```

Add scripts:

```json
{
  "firefox:lint": "web-ext lint --source-dir=dist",
  "firefox:run": "npm run build && web-ext run --source-dir=dist --target=firefox-desktop",
  "firefox:build": "npm run build && web-ext build --source-dir=dist --artifacts-dir=web-ext-artifacts --overwrite-dest",
  "firefox:sign": "npm run build && web-ext sign --source-dir=dist --artifacts-dir=web-ext-artifacts --channel=unlisted"
}
```

Create `.web-ext-config.mjs`:

```js
export default {
  sourceDir: 'dist',
  artifactsDir: 'web-ext-artifacts',
  ignoreFiles: ['**/*.map'],
}
```

`firefox:sign` reads `WEB_EXT_API_KEY` and `WEB_EXT_API_SECRET` from the environment (web-ext default).

- [ ] **Step 2: Lint**

```bash
npm run build
npm run firefox:lint
```

Expected: lint succeeds (warnings acceptable only if documented; fix errors)

- [ ] **Step 3: Rewrite README**

```markdown
# TabKeeper

Firefox tab manager: view open tabs, group by window, and save/restore tab sets.

## Requirements

- Node.js 18+
- Firefox 109+
- For signing: [AMO API credentials](https://addons.mozilla.org/developers/addon/api/key/)

## Develop

```bash
npm install
npm run firefox:run
```

Or: `npm run build`, then Firefox → `about:debugging` → This Firefox → Load Temporary Add-on → select `dist/manifest.json`.

## Test

```bash
npm test
```

## Production package

```bash
npm run firefox:build
```

Output: `web-ext-artifacts/tabkeeper-1.0.0.zip` (installable after signing; temporary load of `dist/` works unsigned).

## Sign for self-distribution / AMO

1. Create JWT credentials on AMO.
2. Export them:

```bash
export WEB_EXT_API_KEY="user:..."
export WEB_EXT_API_SECRET="..."
```

3. Sign (unlisted channel for private distribute):

```bash
npm run firefox:sign
```

Install the resulting `.xpi` in Firefox (Extensions → gear → Install Add-on From File), or upload the built zip on [AMO Developer Hub](https://addons.mozilla.org/developers/) for a listed release.

Extension ID: `tabkeeper@fbarikzehi`
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .web-ext-config.mjs README.md
git commit -m "Add web-ext lint/build/sign scripts and install docs."
```

---

### Task 8: End-to-end verification checklist

**Files:** none (verification only; fix bugs in-place with small follow-up commits if needed)

- [ ] **Step 1: Unit tests**

```bash
npm test
```

Expected: PASS

- [ ] **Step 2: Production build + lint**

```bash
npm run build && npm run firefox:lint
```

Expected: build OK; lint OK

- [ ] **Step 3: Manual Firefox checklist** (via `npm run firefox:run` or temporary load)

1. On Desk lists tabs; search filters; focus works  
2. Select tabs → Save selected → set appears under Saved  
3. Save with none selected → saves all listed tabs  
4. Groups → save window → appears in Saved with window-derived name  
5. Saved → Rename / Restore (new window) / Delete  
6. Reload extension → Saved sets still present  
7. Confirm `about:addons` shows TabKeeper with id `tabkeeper@fbarikzehi` when signed (signing optional if keys unavailable — document that package is ready)

- [ ] **Step 4: Final commit only if verification fixes were needed**

```bash
git status
# if dirty:
git add -A
git commit -m "Fix issues found during Firefox verification."
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| `useSaved` + `storage.local` / `savedSets` | 1–2 |
| On Desk save selected / all | 4 |
| Groups save window | 5 |
| Saved restore/rename/delete/empty | 3 |
| Trim permissions + gecko id + 1.0.0 | 6 |
| Polyfill in dist + background | 6 |
| web-ext lint/build/sign + env keys | 7 |
| README install / AMO | 7 |
| Error handling / invalid URLs | 1–2 |
| Manual + lint verification | 8 |
| Out of scope (sync, Chrome, redesign) | Not planned |

**Placeholder scan:** none intentional.  
**Type consistency:** `saveTabs(tabs, name?)`, `restoreSet(id)`, `STORAGE_KEY = 'savedSets'` used consistently across tasks.
