/**
 * "résumé" as people type it into a search box: "resume". The site writes
 * "resume" everywhere since 2026-11-09 (the home page spelled it two ways
 * under one heading); this stays as a guard on the parts a search engine
 * reads first (title, meta description) so a stray accent in new copy is
 * caught. Case is kept: Résumé -> Resume.
 */
export function plainResume(text: string): string {
  return text.replace(/r[éÉ]sum[éÉ]|R[éÉ]SUM[éÉ]|R[éÉ]sum[éÉ]/g, (m) =>
    m.replace(/é/g, 'e').replace(/É/g, 'E')
  )
}
