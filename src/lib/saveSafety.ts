/**
 * How safe a saved résumé is, in the two moments it matters: while editing
 * (the top bar's saved state) and right after the first export (the moment
 * someone first cares about their work). Everything is stored only in this
 * browser; a browser that has not granted durable storage may clear it.
 */
import type { DurabilityStatus } from '@/lib/storage'

/** A backup this recent counts as a copy kept. */
export const BACKUP_FRESH_DAYS = 14

/** True when the browser may clear its storage and there is no recent
 *  backup. Silent while the browser has not answered: a guess is worse
 *  than a moment's wait. */
export function saveAtRisk(durability: DurabilityStatus, lastBackup: number, now: number): boolean {
  if (durability !== 'denied') return false
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
