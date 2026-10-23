/**
 * How safe a saved résumé is, in the two moments it matters: while editing
 * (the top bar's saved state) and right after the first export (the moment
 * someone first cares about their work). Everything is stored only in this
 * browser; a browser that has not granted durable storage may clear it.
 */
import type { DurabilityStatus } from '@/lib/storage'
import type { ResumeContent } from '@/types/document'
import { sectionHasContent } from '@/lib/sections'

/** A backup this recent counts as a copy kept. */
export const BACKUP_FRESH_DAYS = 14

/** True when the browser may clear its storage and there is no recent
 *  backup. Silent while the browser has not answered: a guess is worse
 *  than a moment's wait. */
export function saveAtRisk(durability: DurabilityStatus, lastBackup: number, now: number, hasWork = true): boolean {
  if (durability !== 'denied' || !hasWork) return false
  return !lastBackup || now - lastBackup > BACKUP_FRESH_DAYS * 24 * 60 * 60 * 1000
}

/** Offer to back up every résumé after an export, once, to someone who has
 *  never made a backup. */
export function offerBackupAfterExport({ lastBackup, offered }: { lastBackup: number; offered: boolean }): boolean {
  return !lastBackup && !offered
}

/** Read the last backup time; 0 when unknown. */
export function readLastBackup(): number {
  try {
    return Number(localStorage.getItem('cvaurum:last-backup') || 0)
  } catch {
    return 0
  }
}

const SECTIONS = ['summary', 'work', 'education', 'projects', 'skills', 'languages', 'certificates', 'awards', 'publications', 'volunteer', 'interests', 'references']

/** Whether a cleared browser would cost anybody anything: a word typed into
 *  this résumé, or other résumés kept here. A brand-new blank one alone is
 *  not worth a warning. */
export function hasWorkToLose(content: ResumeContent, libraryCount: number): boolean {
  if (libraryCount > 1) return true
  const b = content.basics
  if ([b.name, b.label, b.email, b.phone, b.url].some((v) => (v ?? '').trim())) return true
  if (SECTIONS.some((k) => sectionHasContent(k, content))) return true
  return content.custom.some((c) => sectionHasContent(`custom-${c.id}`, content))
}
