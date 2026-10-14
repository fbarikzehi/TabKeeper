import { ref, onMounted } from 'vue'
import browser from 'webextension-polyfill'

export function useTab() {
  const tabs = ref([])
  const duplicateTabCount = ref(0)
  const selectedIds = ref(new Set())

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

  const query = async (queryInfo = {}) => {
    tabs.value = await browser.tabs.query(queryInfo)
    selectedIds.value = new Set()
    queryTabDuplicates()
  }

  const bringTabToFront = async (tab) => {
    await browser.windows.update(tab.windowId, {
      focused: true,
    })
    await browser.tabs.update(tab.id, {
      active: true,
    })
  }

  const bringTabsToBack = async () => {
    for (const tab of tabs.value) {
      await browser.tabs.update(tab.id, {
        active: false,
      }).catch(() => {})
    }
  }

  const handleTabSearch = async (val) => {
    const search = (val || '').trim().toLowerCase()

    if (search) {
      const allTabs = await browser.tabs.query({})
      tabs.value = allTabs.filter(
        (tab) =>
          (tab.title || '').toLowerCase().includes(search) ||
          (tab.url || '').toLowerCase().includes(search),
      )
      queryTabDuplicates()
      return
    }

    await query({})
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
    return tabs.value.filter((tab) => selectedIds.value.has(tab.id))
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