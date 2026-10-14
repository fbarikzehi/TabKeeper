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
