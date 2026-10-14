import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('webextension-polyfill', () => ({
  default: {
    tabs: {
      query: vi.fn(),
      update: vi.fn(),
    },
    windows: {
      update: vi.fn(),
    },
  },
}))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    onMounted: vi.fn(),
  }
})

import browser from 'webextension-polyfill'
import { useTab } from './tab.js'

describe('useTab duplicateTabCount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('counts tabs whose URL appears more than once, not distinct URLs', async () => {
    browser.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com/a' },
      { id: 2, url: 'https://example.com/a' },
      { id: 3, url: 'https://example.com/a' },
      { id: 4, url: 'https://example.com/b' },
      { id: 5, url: 'https://example.com/c' },
      { id: 6, url: 'https://example.com/c' },
    ])
    const { duplicateTabCount, query } = useTab()
    await query()
    expect(duplicateTabCount.value).toBe(5)
  })
})
