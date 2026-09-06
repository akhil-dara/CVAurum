import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A hook declared after an early return runs on some renders and not others.
 * EditableChips did exactly that - six hooks while editing, five while not -
 * so switching the canvas into exact-preview threw "Rendered fewer hooks than
 * expected" and took the editor route down with it, losing the open document.
 * The unit suite renders to static markup, which never re-renders a live
 * component, so nothing here could have caught it; this reads the source.
 */
const FILES = ['src/templates/_shared/sections.tsx', 'src/templates/_shared/Artboard.tsx']
const HOOK = /^\s*(?:const|let)\s+[\w{}\[\],\s]+=\s*(useRef|useState|useMemo|useCallback|useReducer|useContext)\s*[(<]/
const EARLY_RETURN = /^  if \([^)]*\)\s*\{?\s*$/
const TOP_LEVEL_RETURN = /^  return\b/

describe('no hook sits after an early return', () => {
  for (const file of FILES) {
    it(file, () => {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/)
      const offenders: string[] = []
      let sawReturn = false
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i]
        if (/^(export )?function [A-Z]/.test(l)) sawReturn = false // a new component
        else if (EARLY_RETURN.test(l) && /return/.test(lines[i + 1] ?? '')) sawReturn = true
        else if (TOP_LEVEL_RETURN.test(l)) sawReturn = true
        else if (sawReturn && HOOK.test(l)) offenders.push(`${file}:${i + 1}  ${l.trim().slice(0, 70)}`)
      }
      expect(offenders).toEqual([])
    })
  }
})
