/**
 * A sentence with its numbers dropped in.
 *
 * "Fits {pages} · text {pt}" holds the order the words go in — which differs
 * by language — so the sentence lives in the dictionary whole and the values
 * are filled into it here.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole
  )
}
