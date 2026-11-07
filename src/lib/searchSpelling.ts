/**
 * "résumé" as people type it into a search box: "resume". Used for the parts
 * of a public page a search engine reads first (title, meta description,
 * h1); body copy keeps the accent. Case is kept: Résumé -> Resume.
 */
export function plainResume(text: string): string {
  return text.replace(/r[éÉ]sum[éÉ]|R[éÉ]SUM[éÉ]|R[éÉ]sum[éÉ]/g, (m) =>
    m.replace(/é/g, 'e').replace(/É/g, 'E')
  )
}
