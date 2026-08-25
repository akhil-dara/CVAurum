import { describe, it, expect } from 'vitest'
import { prettyUrl } from './atoms'

describe('prettyUrl — display is the author’s choice, the target never changes', () => {
  const url = 'https://github.com/someone/'

  it('drops the scheme and trailing slash by default, as it always did', () => {
    expect(prettyUrl(url)).toBe('github.com/someone')
  })

  it('shows the whole address when asked', () => {
    expect(prettyUrl(url, 'full')).toBe('https://github.com/someone/')
  })

  it('keeps only the last meaningful segment when asked for short', () => {
    expect(prettyUrl('https://linkedin.com/in/someone', 'short')).toBe('someone')
    expect(prettyUrl('https://github.com/someone', 'short')).toBe('someone')
  })

  it('falls back to the bare host when short has nothing to shorten', () => {
    expect(prettyUrl('https://www.example.com', 'short')).toBe('example.com')
  })

  it('has nothing to show for nothing', () => {
    expect(prettyUrl('')).toBe('')
    expect(prettyUrl(undefined)).toBe('')
  })
})
