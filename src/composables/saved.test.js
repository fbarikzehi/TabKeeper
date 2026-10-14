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

  it('renameSet updates name and persists', async () => {
    browser.storage.local.get.mockResolvedValue({
      savedSets: [{ id: 'n', name: 'Old', createdAt: 1, tabs: [] }],
    })
    browser.storage.local.set.mockResolvedValue(undefined)
    const { savedSets, loadSavedSets, renameSet } = useSaved()
    await loadSavedSets()
    await renameSet('n', 'New Name')
    expect(savedSets.value[0].name).toBe('New Name')
    expect(browser.storage.local.set).toHaveBeenCalledWith({
      savedSets: [{ id: 'n', name: 'New Name', createdAt: 1, tabs: [] }],
    })
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
