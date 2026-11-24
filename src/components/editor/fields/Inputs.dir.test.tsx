import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TagInput, TextAreaField, TextField } from './Inputs'

/**
 * The panel's text fields carry dir="auto", so a Persian or Arabic value reads
 * right to left as it is typed. For Latin text the attribute resolves to ltr:
 * the markup differs from before by that one attribute and nothing else, so
 * the visible layout is the one it always was (measured in the browser too:
 * every field of an English resume computes direction ltr).
 */
describe('panel fields pick their own direction', () => {
  const cases: Array<[string, () => string]> = [
    ['text field', () => renderToStaticMarkup(<TextField label="Name" value="Priya Menon" onChange={() => {}} />)],
    ['text area', () => renderToStaticMarkup(<TextAreaField label="About" value="Ships things." onChange={() => {}} />)],
    ['tag input', () => renderToStaticMarkup(<TagInput value={['React']} onChange={() => {}} />)],
  ]
  for (const [what, render] of cases) {
    it(`${what}: dir="auto" is the only addition`, () => {
      const html = render()
      expect(html).toContain('dir="auto"')
      const without = html.replace(/ dir="auto"/g, '')
      expect(without).not.toMatch(/\sdir=/)
      // one attribute per field, nothing wrapped around it
      expect(html.match(/dir="auto"/g)).toHaveLength(1)
    })
  }
})
