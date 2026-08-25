import { describe, expect, it } from 'vitest'
import { keywordChunks } from './keywordChunks'

const rejoin = (parts: string[]) => parts.join(' ')

describe('keywordChunks', () => {
  it('keeps a lone connector with the word it joins', () => {
    // Reported: this arrived as "Data Extraction" / "&" / "Transformation".
    expect(keywordChunks('Data Extraction & Transformation', ' ·')).toEqual(['Data', 'Extraction', '& Transformation ·'])
  })

  it('keeps the separator with the last word', () => {
    expect(keywordChunks('Query Optimisation', ' ·')).toEqual(['Query', 'Optimisation ·'])
  })

  it('makes a single-word term one piece', () => {
    expect(keywordChunks('SQL', ' ·')).toEqual(['SQL ·'])
  })

  it('handles several connectors in one term', () => {
    expect(keywordChunks('As-Is / To-Be Process Mapping', ' ·')).toEqual(['As-Is', '/ To-Be', 'Process', 'Mapping ·'])
  })

  it('never emits a piece that is only a connector', () => {
    for (const term of ['A & B', '& leading', 'trailing &', 'x / y / z', 'Incident, Change & Problem']) {
      for (const piece of keywordChunks(term, ' ·')) {
        expect(piece).toMatch(/[A-Za-z0-9]/)
      }
    }
  })

  it('reproduces the original text exactly', () => {
    for (const term of ['SQL', 'Data Extraction & Transformation', 'As-Is / To-Be Process Mapping', 'Azure (foundational)']) {
      for (const sep of [' ·', ',', '']) {
        expect(rejoin(keywordChunks(term, sep))).toBe(term + sep)
      }
    }
  })
})

describe('a bracketed aside is one piece', () => {
  // Measured on a real resume in the chip style: "Salesforce CRM Analytics
  // (Einstein / TCRM)" wrapped as
  //     Salesforce  CRM  Analytics  (Einstein
  //     / TCRM)
  // The words are in the right order, but the parenthetical is torn in half -
  // "(Einstein" left dangling at the end of one line and "/ TCRM)" alone on the
  // next. A bracket is a promise that what follows belongs together.
  it('keeps a parenthetical whole', () => {
    expect(keywordChunks('Salesforce CRM Analytics (Einstein / TCRM)', ' ·')).toEqual([
      'Salesforce',
      'CRM',
      'Analytics',
      '(Einstein / TCRM) ·',
    ])
  })

  it('keeps square and curly groups whole too', () => {
    expect(keywordChunks('Airflow [batch and stream]', '')).toEqual(['Airflow', '[batch and stream]'])
  })

  it('leaves an unclosed bracket to wrap normally rather than gluing the rest of the term', () => {
    expect(keywordChunks('Some (thing else entirely', '')).toEqual(['Some', '(thing', 'else', 'entirely'])
  })

  it('still reproduces the term exactly', () => {
    const term = 'Salesforce CRM Analytics (Einstein / TCRM)'
    expect(keywordChunks(term, ' ·').join(' ')).toBe(term + ' ·')
  })
})
