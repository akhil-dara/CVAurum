import { describe, expect, it } from 'vitest'
import { rankCommands, shortcutLabel, TOP_ACTIONS } from './paletteRank'

/**
 * The command palette ranked every command by one loose letter-by-letter
 * score, so "fit" listed one Magic fit command and then fonts and templates
 * whose names merely contain f…i…t in order (Figtree, Quartz). It opened on
 * the first rows of an arbitrary list, and wrote ⌘ on Windows.
 */
const cmds = [
  { id: 'font-Figtree', label: 'Font: Figtree', hint: 'sans' },
  { id: 'tpl-quartz', label: 'Template: Quartz', hint: 'Fit to the page' },
  { id: 'magic-fit-suggest', label: 'Magic fit: suggest', hint: 'measure a few moves' },
  { id: 'export-pdf', label: 'Download PDF', hint: 'crisp, selectable, ATS-exact' },
  { id: 'undo', label: 'Undo', hint: 'Ctrl+Z' },
  { id: 'redo', label: 'Redo', hint: 'Ctrl+Shift+Z' },
  { id: 'export-menu', label: 'Open export menu…' },
  { id: 'theme', label: 'Toggle light / dark mode' },
]

describe('ranking a query', () => {
  it('puts a match at the start of a word first, and drops letter-by-letter noise when real matches exist', () => {
    const ids = rankCommands(cmds, 'fit', []).map((c) => c.id)
    expect(ids[0]).toBe('magic-fit-suggest')
    expect(ids).not.toContain('font-Figtree')
  })
  it('offers nothing rather than a command whose letters merely scatter through it', () => {
    // "delete" listed Download PDF first: d…e…l…e…t…e spread across its
    // name and hint (critique, round 2)
    expect(rankCommands(cmds, 'delete', []).map((c) => c.id)).not.toContain('export-pdf')
  })
  it('still finds a loose match when nothing matches outright', () => {
    expect(rankCommands(cmds, 'dwnld', []).map((c) => c.id)).toContain('export-pdf')
  })
})

describe('the palette before anything is typed', () => {
  it('opens on what was used last, then the top actions', () => {
    const ids = rankCommands(cmds, '', ['theme']).map((c) => c.id)
    expect(ids[0]).toBe('theme')
    expect(ids.slice(1, 3)).toEqual(TOP_ACTIONS.filter((id) => cmds.some((c) => c.id === id)).slice(0, 2))
  })
})

describe('a shortcut, as this keyboard writes it', () => {
  it('uses ⌘ on a Mac and Ctrl elsewhere', () => {
    expect(shortcutLabel('Ctrl+K', true)).toBe('⌘K')
    expect(shortcutLabel('Ctrl+Shift+Z', true)).toBe('⇧⌘Z')
    expect(shortcutLabel('Ctrl+K', false)).toBe('Ctrl+K')
  })
})
