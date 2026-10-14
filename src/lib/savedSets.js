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
