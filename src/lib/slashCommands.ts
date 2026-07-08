/** Slash-command snippets — a Notion-style quick menu, 100% on-device.
 *  Shared by the panel's rich-text editor AND the on-canvas editables, so "/"
 *  behaves identically wherever the user types. */
export interface Slash {
  title: string
  hint: string
  /** text to insert; `¦` marks where the caret lands afterwards. */
  insert: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const nowMonthYear = (): string => {
  const d = new Date()
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const SLASH_COMMANDS: Slash[] = [
  { title: 'Quantified bullet', hint: 'impact template', insert: '¦ by X%, saving $Y — via ' },
  { title: 'Action verb: Led', hint: 'strong opener', insert: 'Led ¦' },
  { title: 'Action verb: Built', hint: 'strong opener', insert: 'Built ¦' },
  { title: 'Action verb: Drove', hint: 'strong opener', insert: 'Drove ¦' },
  { title: 'Action verb: Launched', hint: 'strong opener', insert: 'Launched ¦' },
  { title: 'Action verb: Streamlined', hint: 'strong opener', insert: 'Streamlined ¦' },
  { title: 'Percentage metric', hint: 'placeholder', insert: 'X%¦' },
  { title: 'Dollar metric', hint: 'placeholder', insert: '$X¦' },
  { title: 'Insert this month', hint: nowMonthYear(), insert: `${nowMonthYear()}¦` },
]

export const filterSlash = (query: string): Slash[] =>
  SLASH_COMMANDS.filter((c) => (c.title + ' ' + c.hint).toLowerCase().includes(query.toLowerCase()))
