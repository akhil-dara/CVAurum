/**
 * The name a canvas field is announced by.
 *
 * Every field was named by its placeholder alone, so a screen reader moving
 * through the page heard "Company — e.g. Acme Corp" three times over with
 * nothing to say which job each one belonged to, and a bullet by an example
 * sentence. The field now says what it is, where it falls among its kind, and
 * which entry and section hold it: "Bullet 2 of 3, Senior Software Engineer,
 * Experience". The entry is named by its first field, so that field itself
 * says only its section.
 */
const MAX_ENTRY = 40

const squeeze = (s: string | undefined | null) => (s ?? '').replace(/\s+/g, ' ').trim()

function shorten(s: string): string {
  if (s.length <= MAX_ENTRY) return s
  const cut = s.slice(0, MAX_ENTRY)
  const space = cut.lastIndexOf(' ')
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.-]+$/, '')}…`
}

/** The field's own name out of a placeholder that also carries a hint. */
function ownName(placeholder: string): string {
  if (/^e\.g\./i.test(placeholder)) return ''
  return squeeze(placeholder.split(' — ')[0].replace(/\(optional\)/i, ''))
}

export interface FieldContext {
  placeholder?: string | null
  /** What to call a field whose placeholder is only an example. */
  fallback?: string
  section?: string | null
  entry?: string | null
  /** Its place among the fields of its kind in the same entry or section. */
  position?: { n: number; of: number }
}

export function fieldName({ placeholder, fallback, section, entry, position }: FieldContext): string {
  let name = ownName(squeeze(placeholder)) || fallback || 'Text'
  if (position && position.of > 1) name = `${name} ${position.n} of ${position.of}`
  const sec = squeeze(section)
  const ent = shorten(squeeze(entry))
  const parts = [name]
  if (ent) parts.push(ent)
  if (sec && sec.toLowerCase() !== name.toLowerCase()) parts.push(sec)
  return parts.join(', ')
}
