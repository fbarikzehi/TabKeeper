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
