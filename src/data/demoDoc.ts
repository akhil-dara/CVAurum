/**
 * The resume a page SHOWS to demonstrate a design: the homepage hero's three
 * pages, and anywhere else a sample is drawn rather than opened.
 *
 * It follows the interface's language, because a Persian interface showing
 * "Alex Morgan" in an English, left-to-right resume is two things at once: the
 * visitor cannot see what a Persian resume looks like, and every sample reads
 * as the app not really being Persian (2026-11-16 report). In Persian the same
 * designs are drawn with Persian content, right-to-left, Jalali dates and the
 * bundled Persian face - the same document a Persian author would start from.
 *
 * This is DISPLAY ONLY. It never touches the author's own resume: their
 * document keeps its language and direction whatever the interface speaks.
 */
import { createDocument } from '@/data/defaults'
import { applyTemplateToMetadata } from '@/lib/templateApply'
import { getTemplate } from '@/templates/registry'
import type { Locale } from '@/i18n'
import type { ResumeContent, ResumeDocument } from '@/types/document'

/** The words a Persian sample says, laid OVER the sample's own entries: every
 *  entry keeps the shape (and every required field) the schema gave it, so this
 *  stays a real document rather than a hand-built one that drifts from it. */
const FA_WORK: Partial<ResumeContent['work'][number]>[] = [
  {
    name: 'فناوران داده آریا',
    position: 'مهندس نرم‌افزار ارشد، سرپرست تیم',
    location: 'تهران',
    startDate: '2021-04',
    endDate: '',
    summary: 'سرپرست سامانهٔ پرداخت سازمانی برای بیش از ۴۰۰ مشتری، با معماری سرویس‌محور روی Kubernetes.',
    highlights: [
      'بازطراحی خط لولهٔ استقرار خودکار با پوشش آزمون ۹۵ درصد؛ بازگشت‌های اضطراری از ماهی سه بار به صفر رسید.',
      'سرپرستی تیم شش‌نفره و راه‌اندازی برنامهٔ منتورینگ که زمان آشناسازی نیروی تازه را از سه ماه به شش هفته رساند.',
    ],
  },
  {
    name: 'پارس‌کد',
    position: 'توسعه‌دهندهٔ بک‌اند',
    location: 'تهران',
    startDate: '2019-07',
    endDate: '2021-03',
    summary: 'پلتفرم ابری برای استارتاپ‌ها؛ مسئول سرویس‌های هویت و صورت‌حساب.',
    highlights: [
      'پیاده‌سازی سرویس احراز هویت با OAuth 2.0 و ورود دوعاملی برای ۱٫۲ میلیون کاربر.',
      'کاهش ۴۰ درصدی هزینهٔ زیرساخت با بازنویسی صف پردازش پیام و مهاجرت به صف‌های سبک‌تر.',
    ],
  },
  {
    name: 'استودیو وب مهر',
    position: 'توسعه‌دهندهٔ وب',
    location: 'اصفهان',
    startDate: '2017-06',
    endDate: '2019-05',
    summary: 'ساخت وب‌اپلیکیشن برای فروشگاه‌های آنلاین.',
    highlights: ['توسعهٔ فروشگاه‌ساز با درگاه پرداخت و پنل مدیریت؛ ۶۰ فروشگاه فعال در سال نخست.'],
  },
]

const FA_EDUCATION: Partial<ResumeContent['education'][number]>[] = [
  {
    institution: 'دانشگاه تهران',
    area: 'کارشناسی ارشد، مهندسی کامپیوتر',
    location: 'تهران',
    courses: ['سامانه‌های توزیع‌شده', 'یادگیری ماشین', 'پایگاه داده', 'الگوریتم‌ها'],
    startDate: '2013-09',
    endDate: '2016-07',
    summary: 'معدل ۱۷٫۸ از ۲۰',
  },
  {
    institution: 'دانشگاه صنعتی اصفهان',
    area: 'کارشناسی، مهندسی نرم‌افزار',
    location: 'اصفهان',
    courses: ['مهندسی نرم‌افزار', 'ساختمان داده', 'شبکه‌های کامپیوتری'],
    startDate: '2009-09',
    endDate: '2013-07',
    summary: 'پایان‌نامه: زمان‌بندی وظایف در سامانه‌های توزیع‌شده',
  },
]

const FA_SKILLS: Partial<ResumeContent['skills'][number]>[] = [
  { name: 'زبان‌ها و چارچوب‌ها', keywords: ['TypeScript', 'Node.js', 'Go', 'Python', 'React'] },
  { name: 'داده و زیرساخت', keywords: ['PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes'] },
  { name: 'روش‌ها', keywords: ['معماری سرویس‌محور', 'آزمون خودکار', 'CI/CD', 'مشاهده‌پذیری'] },
]

const FA_PROJECTS: Partial<ResumeContent['projects'][number]>[] = [
  {
    name: 'پالس — مشاهده‌پذیری متن‌باز',
    description: 'ابزار سبک سنجه و ردگیری برای تیم‌های کوچک.',
    url: 'github.com/alirezaei/pulse',
    startDate: '2022',
    highlights: ['۳٫۲ هزار ستاره در GitHub و ۴۰ مشارکت‌کننده.', 'ابزارگذاری بدون تنظیم برای Node و Go.'],
    keywords: ['React', 'OpenTelemetry', 'Go'],
  },
  {
    name: 'دفتر کل',
    description: 'سرویس حسابداری دوطرفه برای فروشگاه‌های کوچک؛ ثبت تراکنش و تطبیق خودکار.',
    url: 'github.com/alirezaei/ledger',
    startDate: '2020',
    highlights: ['پردازش ماهانه بیش از یک میلیون ردیف با تأخیر زیر یک ثانیه.'],
    keywords: ['PostgreSQL', 'Go'],
  },
]

const FA_LANGUAGES: Partial<ResumeContent['languages'][number]>[] = [
  { language: 'فارسی', fluency: 'زبان مادری', rating: 5 },
  { language: 'انگلیسی', fluency: 'پیشرفته', rating: 4 },
  { language: 'عربی', fluency: 'متوسط', rating: 3 },
]

const FA_CERTIFICATES: Partial<ResumeContent['certificates'][number]>[] = [
  { name: 'معمار راهکارهای حرفه‌ای AWS', date: '2022', issuer: 'آمازون وب سرویس' },
]

const FA_AWARDS: Partial<ResumeContent['awards'][number]>[] = [
  {
    title: 'جایزهٔ تعالی مهندسی',
    date: '2023',
    awarder: 'ورتکس لبز',
    summary: 'در میان ۲٪ برتر سازمان برای اثرگذاری و رهبری.',
  },
]

/** Persian section headings, so a sample reads as a Persian resume rather than
 *  Persian text under English titles. */
const FA_HEADINGS = {
  summary: 'خلاصه',
  work: 'تجربهٔ کاری',
  education: 'تحصیلات',
  skills: 'مهارت‌ها',
  projects: 'پروژه‌ها',
  languages: 'زبان‌ها',
  certificates: 'گواهی‌نامه‌ها',
  awards: 'افتخارات',
  interests: 'علاقه‌مندی‌ها',
  volunteer: 'فعالیت داوطلبانه',
  publications: 'انتشارات',
}

/** Apply the Persian words to a sample's content, entry by entry. */
function persianContent(base: ResumeContent): ResumeContent {
  const c = structuredClone(base)
  c.basics.name = 'علی رضایی'
  c.basics.label = 'مهندس نرم‌افزار ارشد — سامانه‌های توزیع‌شده و پرداخت'
  c.basics.email = 'ali.rezaei@example.com'
  c.basics.phone = '+98 912 123 4567'
  c.basics.location = { ...(typeof c.basics.location === 'object' ? c.basics.location : {}), city: 'تهران', region: '', countryCode: 'IR' } as typeof c.basics.location
  c.basics.url = 'ali.rezaei.dev'
  // The contact links too: the sample's own are the English persona's handles,
  // and a Persian page was still printing "github.com/alexmorgan".
  c.basics.profiles = [
    { ...(c.basics.profiles?.[0] ?? {}), id: 'demo-profile-1', network: 'LinkedIn', username: 'alirezaei', url: 'linkedin.com/in/alirezaei' },
    { ...(c.basics.profiles?.[1] ?? {}), id: 'demo-profile-2', network: 'GitHub', username: 'alirezaei', url: 'github.com/alirezaei' },
  ] as ResumeContent['basics']['profiles']
  c.basics.summary =
    'مهندس نرم‌افزار با ۹ سال تجربه در طراحی و ساخت سامانه‌های توزیع‌شده و پرداخت؛ تمرکز بر کارایی، پایداری و خوانایی کد.'

  if (c.work.length) c.work = c.work.map((w, i) => ({ ...w, ...(FA_WORK[i % FA_WORK.length] ?? {}) }))
  if (c.education.length) c.education = c.education.map((e, i) => ({ ...e, ...(FA_EDUCATION[i % FA_EDUCATION.length] ?? {}) }))
  if (c.skills.length) c.skills = c.skills.map((s, i) => ({ ...s, ...(FA_SKILLS[i % FA_SKILLS.length] ?? {}) }))
  if (c.projects.length) c.projects = c.projects.map((p, i) => ({ ...p, ...(FA_PROJECTS[i % FA_PROJECTS.length] ?? {}) }))
  if (c.languages.length) c.languages = c.languages.map((l, i) => ({ ...l, ...(FA_LANGUAGES[i % FA_LANGUAGES.length] ?? {}) }))
  if (c.certificates.length)
    c.certificates = c.certificates.map((x, i) => ({ ...x, ...(FA_CERTIFICATES[i % FA_CERTIFICATES.length] ?? {}) }))
  if (c.awards.length) c.awards = c.awards.map((a, i) => ({ ...a, ...(FA_AWARDS[i % FA_AWARDS.length] ?? {}) }))
  return c
}

const cache = new Map<string, ResumeDocument>()

/**
 * The document to DRAW for `templateId` in the interface language `locale`.
 * Memoized: the hero renders three pages on every keystroke, so the sample is
 * built once per design and language.
 */
export function demoDocument(templateId: string, locale: Locale): ResumeDocument {
  const key = `${templateId}:${locale}`
  const hit = cache.get(key)
  if (hit) return hit

  const doc = createDocument({ sample: true })
  doc.metadata = applyTemplateToMetadata(doc.metadata, getTemplate(templateId).defaults)
  doc.title = locale === 'fa' ? 'رزومهٔ نمونه' : 'Sample resume'

  if (locale === 'fa') {
    doc.content = persianContent(doc.content)
    doc.metadata.layout.rtl = true
    doc.metadata.layout.headings = { ...doc.metadata.layout.headings, ...FA_HEADINGS }
    doc.metadata.dates.language = 'fa'
    doc.metadata.dates.present = 'تاکنون'
    // The Persian face the project ships, for the body, the headings and the
    // name: a Persian sample drawn in a Latin face is the very thing the
    // fallback chain exists to avoid.
    doc.metadata.typography.fontFamily = 'Vazirmatn'
    doc.metadata.typography.headingFamily = 'Vazirmatn'
    doc.metadata.typography.nameFamily = 'Vazirmatn'
  }

  cache.set(key, doc)
  return doc
}
