/** Explicit section-icon map (imports only the icons we use, so we don't bundle
 *  the entire lucide library). Shared by the resume renderer and the editor. */
import {
  AlignLeft,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Wrench,
  Languages,
  BadgeCheck,
  Award,
  BookOpen,
  HeartHandshake,
  Sparkles,
  Quote,
  Folder,
  type LucideIcon,
} from 'lucide-react'

const MAP: Record<string, LucideIcon> = {
  summary: AlignLeft,
  work: Briefcase,
  education: GraduationCap,
  projects: FolderGit2,
  skills: Wrench,
  languages: Languages,
  certificates: BadgeCheck,
  awards: Award,
  publications: BookOpen,
  volunteer: HeartHandshake,
  interests: Sparkles,
  references: Quote,
}

export function sectionIconFor(key: string): LucideIcon {
  if (key.startsWith('custom-')) return Sparkles
  return MAP[key] ?? Folder
}
