import type { TemplateNote } from './index'

/** Notes for a third of the designs; see ./index.ts. */
export const NOTES_C: Record<string, TemplateNote> = {
  mono: {
    suits:
      'Mono suits engineers, analysts, consultants and anyone whose record is strong enough to carry a page without colour. It reads as confident and senior, and it prints identically on any office printer. Skip it if the field rewards visible personality, such as brand design or events.',
    layout:
      'One column in black and grey only. The name is set large and bold in Inter, the role and contacts sit beneath in grey, and a heavy black rule closes the header. Section titles are small, widely tracked capitals with no line under them, so white space alone separates the sections. Dates align flush right on each entry line.',
    ats:
      'A single column in one sans face is about as simple as a page gets for a parser: headings, entries and dates come out in reading order. Language dots are decoration and carry no text, so state a level in words if a posting asks for one. Everything else is selectable text.',
  },
  opal: {
    suits:
      'Opal fits people-facing roles where warmth matters: teachers, nurses, HR and recruiting, customer success, marketing coordinators and early-career applicants. The photo slot makes it a natural choice for markets where a headshot is expected. For a conservative finance or legal application, a plainer page is the safer call.',
    layout:
      'Two columns. A pale lavender sidebar on the left, about a third of the width, holds skills as rounded chips grouped under bold labels, plus languages with dot meters, certifications and awards. The main column carries the name, a violet role line, contacts with small icons, then summary, experience, projects and education. Headings are violet tracked capitals with a small icon badge.',
    ats:
      'Both columns are real text, and each is read as its own block, so the sidebar comes out before or after the main column rather than woven into it. That works with most systems. The photo, icons and meters add nothing to the parsed text; for a strict portal with a reputation for scrambling columns, a one-column design is the safer pick.',
  },
  broadsheet: {
    suits:
      'Broadsheet is for writers, editors, communications leads, researchers and policy people who want a résumé with authority and a sense of print. It also serves senior generalists whose page is mostly prose. Its numbered sections reward a résumé with a clear order; it is less at home with a dozen short sections.',
    layout:
      'One column on warm off-white paper. The name runs huge and centred in a high-contrast display serif, the role sits beneath in spaced red capitals, and the contacts form a byline between a heavy rule and a thin one. Each section opens with a red two-digit number and a red sans title over a full black rule. Body text is a readable serif; employers are picked out in red.',
    ats:
      'The body reads top to bottom in one column, so a parser meets every heading and entry in order. The running section numbers are drawn as decoration and stay out of the extracted text, so a heading parses as plain "Experience" rather than "02 Experience". The display name is still real, selectable text.',
  },
  marquee: {
    suits:
      'Marquee is built for creative and commercial roles that want to be noticed in a pile: producers, brand and content marketers, event leads, creative technologists and founders pitching themselves. It is a poster, not a ledger, so it is a poor match for a conservative bank, firm or public-sector application.',
    layout:
      'An orange block fills the top of the page with the name in tall condensed capitals, the role in tracked black capitals and the contacts with small icons. Below, one column on cream paper carries numbered section heads in the condensed face with a pale rule running out from each. Skills and languages are lifted out of the body into a near-black strip along the foot of the page.',
    ats:
      'The body is one column and parses in order. Because skills and languages sit in the footer strip, they come out last in the extracted text, after awards; that is fine for most systems, which search the whole file. The section numerals are decoration and do not enter the parsed text.',
  },
  atlas: {
    suits:
      'Atlas suits data-minded and technical people whose impact is countable: data scientists, product managers, growth and operations leads, engineers and analysts. The numbers band rewards a résumé with real quantities behind it. A career told mainly through narrative or portfolio work gets less from it.',
    layout:
      'A navy-to-teal gradient band carries the name in Montserrat, the role in tracked capitals and the contacts in two short columns at the right. Below it sits a row of four figures, such as years and companies, read from the résumé itself. Then one column with teal-barred headings, teal dates flush right, and skills as grey chips; skills given a level are drawn as rings.',
    ats:
      'The page body is one column of real text and reads in order. The four figures in the numbers band and any ring values are decoration: a reader sees them, a parser does not, so nothing there is double-counted or misread. Make sure each figure also appears in a bullet if it matters.',
  },
  chronicle: {
    suits:
      'Chronicle suits a career with a clear progression over time: engineers moving into leadership, consultants, project managers and anyone whose story is told in years. It makes tenure easy to judge at a glance. With many overlapping roles or a short history, the year rail has less to say.',
    layout:
      'A compact header: the name in bold Figtree, the role in burnt orange capitals after a short dash, and contacts with icons above a heavy black rule. Below, a tinted rail runs down the left edge, and each entry hands its opening year to it in tall condensed numerals with a small note such as "to now". Headings are orange capitals followed by a short orange stroke.',
    ats:
      'The rail years are decoration and are not part of the extracted text; each entry keeps its full dates as real text at the right of its title, so a parser still reads complete start and end dates. The body itself is a single column and comes out in order.',
  },
  'folio-noir': {
    suits:
      'Folio Noir is for creative and cultural roles where a dark, gallery-like page fits the work: art directors, photographers, curators, architects, fashion and luxury brand people. It makes a strong portfolio cover. It is the wrong pick when a résumé will be printed in an office or read by a conservative panel.',
    layout:
      'Gold on near-black. A band of dark art with gold veining sits across the top above a light serif name, a gold role line in tracked capitals and a single line of contacts with no icons. Section titles are gold sans capitals with a gold hairline running out to the edge. Each entry\'s dates sit in a narrow margin column on the right, divided from the text by a thin vertical line.',
    ats:
      'The light text is real text on a dark ground, so it extracts normally even though the page is dark. The art band is an image with no text in it. The date margin is read as part of each entry. For a printout, consider a light background colour, which keeps the structure and saves a great deal of ink.',
  },
  terrace: {
    suits:
      'Terrace suits calm, senior profiles in sustainability, healthcare, education leadership, policy and consulting, where a composed page signals judgement. The side-heading layout favours a résumé with a handful of substantial sections over one with many short ones.',
    layout:
      'Three stepped bands of green cross the top: the darkest carries the name in bold Chivo, the middle one the role in tracked capitals, the lightest the contacts in one row. Below, on warm paper, each section title sits small and right-aligned in its own narrow column, with a thin green-grey line and a ring marker joining it to the text beside it. Employers are set in green.',
    ats:
      'Each side heading is read before the section it labels, so the text still comes out as heading, then entries, in order. The steps, rail and markers are drawn shapes with no text. Everything in the body is a single column of selectable text in Lato.',
  },
  flare: {
    suits:
      'Flare is for engineers, product designers, developer advocates and technical founders who want a page with a clear voice. Its mono details read as technical without being cold. For a traditional legal, finance or academic reader, a quieter design will land better.',
    layout:
      'An orange spine runs down the left edge of every page. A small letterhead line in spaced mono sits above the name, which is set huge in a constructed blocky display face over a heavy black rule. Section heads pair an orange outline numeral with the display face over a thin rule. Dates, employers and skill labels are in IBM Plex Mono, bullets are small orange squares, and the name repeats in a quiet line at the foot.',
    ats:
      'The letterhead line, section numerals, spine and page foot are decoration and do not enter the parsed text. The name and headings, though set in a display face, are real text that copies cleanly. The body is one column, so experience, dates and bullets extract in reading order.',
  },
  dossier: {
    suits:
      'Dossier suits security engineers, investigators, analysts, researchers and technical writers, or anyone whose work has an operations or intelligence flavour. It is deliberate and a little theatrical, so keep it for readers who will enjoy it rather than a formal corporate panel.',
    layout:
      'Everything is typewriter mono except the name and headings, which are in a stencil display face. A letterhead line and rule open the page, the role is stamped inside a black outlined box, and contacts are separated by > marks. Section heads carry red stencil numerals over a full rule, every bullet is a red >, and dates are red mono at the right. The name repeats at the foot.',
    ats:
      'The stencil name and headings are real text and extract as ordinary letters. The letterhead, numerals and foot line are decoration. Mono body type is wider than a proportional face, so the page holds fewer words per line; keep bullets tight and check the page count before sending.',
  },
  keystone: {
    suits:
      'Keystone is for senior and client-facing people who want a formal, considered page: partners, directors, lawyers, wealth managers, hospitality and luxury leadership. The frame and ivory paper give it occasion. Early-career applicants with a short page may find it more ceremony than they need.',
    layout:
      'Ivory paper inside a thin gold frame on every page. The name runs in tall condensed capitals over a plum rule and a gold one. Section heads are plum condensed capitals with a gold line running out to the margin. Body text is Archivo with generous line spacing; dates, employers and skill labels are in a small gold or plum mono, and every point is marked with a gold diamond.',
    ats:
      'The frame, rules and diamonds are drawn shapes and the name at the foot of the page is decoration, so none of it enters the extracted text. The body is one column and reads in order. The condensed display name is real text; the app sizes it to fit the width so a long name stays on one line.',
  },
  meridian: {
    suits:
      'Meridian suits product, design, platform and climate-tech people who want a modern page with restraint. It reads well for mid-level and senior candidates who let the content lead. The dark masthead is a strong opener; keep that in mind if the résumé will be printed on a home printer.',
    layout:
      'A near-black band the width of the page carries the name in a geometric display face, the role in a bright green mono line and contacts separated by slashes. Below, on white, each section opens with a short dark green bar before a tracked mono title, with wide space between sections. Dates are green mono at the right, bullets are small green squares, and the name repeats at the foot.',
    ats:
      'The masthead text is real text on a dark ground and extracts as normal. The eyebrow bars and the footer name are decoration. A single column with generous gaps means fewer words per page than the denser designs, so tighten bullets if a two-page résumé spills to a third.',
  },
  schematic: {
    suits:
      'Schematic is for mechanical, civil, electrical and hardware engineers, architects and industrial designers whose work is drawn before it is built. It is a playful nod to the drawing office, best sent to readers in those fields rather than a general corporate audience.',
    layout:
      'Blueprint blue on a faint drafting grid repeated on every page. A ruled strip with a letterhead line opens the page, the name is drawn in an outline display face, and the role sits in red on a dimension line with end ticks. Section heads are red outline numerals before bold, tracked blue capitals over a blue rule. Bullets are small red circles and dates are red mono at the right.',
    ats:
      'The grid, letterhead, outline numerals and foot line are all decoration with no text behind them. The outline name is still real text, so a parser reads it as the name. All body text, including the blue type, is a single column of selectable text in reading order.',
  },
  volta: {
    suits:
      'Volta suits growth, sales engineering, analytics and product people who lead with results. The numbers band works best when the résumé has hard figures behind it. It is energetic, so a quieter design may serve better for academic, medical or legal readers.',
    layout:
      'A cobalt band across the top carries a small letterhead line. The name follows in a bold geometric display face, then the role in spaced cobalt mono and contacts divided by pipes. A ruled band of four figures drawn from the résumé sits on a pale blue ground. Section heads pair cobalt numerals with the display face and a thin rule, and every date is set in the display face in cobalt.',
    ats:
      'The four figures, letterhead, numerals and page foot are decoration and stay out of the parsed text, so they never collide with real dates. Dates in the display face are real text and extract normally. The body runs in a single column, top to bottom.',
  },
  punch: {
    suits:
      'Punch is for people who want the page to be loud on purpose: creative directors, social and content leads, startup operators and sales leaders in fast-moving companies. It signals energy before a word is read. A cautious or traditional reader may find it too forceful.',
    layout:
      'The name is set huge and bold in Space Grotesk over a heavy black rule, with the role in hot pink-red capitals and contacts split by thin bars. Every section title is a full-width black bar with a pink-red stripe at its left edge and a pink-red numeral before the white title. Bullets are pink-red squares, dates are pink-red at the right, and the name repeats at the foot.',
    ats:
      'The bars are drawn behind real text, so each section title extracts as plain words; the numerals inside them are decoration and are left out. The body is one column in Inter and reads in order. White text on black prints heavily, so export a PDF rather than relying on a printout.',
  },
  plainsong: {
    suits:
      'Plainsong is for anyone who wants the most familiar résumé format done well: graduates, engineers, finance and operations staff, public-sector applicants. It is the safe default for online portals and for readers who expect a conventional page and judge only the content.',
    layout:
      'A centred serif name in Tinos, the role and contacts centred below, then one column in slate ink. Section headings are bold serif capitals on a full-width rule. There are no icons, chips, meters or colour; skills are plain comma lists after bold labels, and language levels are shown in words if given. Spacing is tight but even.',
    ats:
      'Nothing on the page is decorative, so the extracted text is the whole page in reading order. Headings use common names, dates sit at the right of each title line, and skills are plain words. This is one of the most parser-friendly designs in the collection.',
  },
  quire: {
    suits:
      'Quire is for people with a lot to fit: senior engineers, researchers with publications, consultants with many engagements, and career changers with two histories to tell. It keeps a long record on fewer pages without shrinking it to fine print.',
    layout:
      'Merriweather set small and tight throughout, with a centred name, centred role and centred contacts. Each section heading is in bold serif capitals with a full rule beneath it. Entries are close together and bullets are small dots. There is no colour beyond slate ink and no ornament, so all the density goes to words.',
    ats:
      'A single serif column with no decoration extracts cleanly and in order. The small size is a reading concern rather than a parsing one; if the résumé is short, a roomier design will read more easily, and the density setting can open the spacing here too.',
  },
  scribe: {
    suits:
      'Scribe suits law, academia, finance, government and other traditional fields where a typeset, formal page is expected. It also serves graduate school and fellowship applications. Its restraint lets strong content speak; it does little to dress up a thin record.',
    layout:
      'A centred serif name in Tinos over the role and centred contacts. Section headings are spaced serif capitals on full rules. Entry titles are bold, bullets are indented beneath each entry, and there is no colour beyond slate ink. Dates align at the right of each title line, and skills are comma-separated after bold labels.',
    ats:
      'Every mark on the page is text or a rule, so parsers read it exactly as a person does: heading, title, employer, dates, bullets. Standard section names and right-aligned dates make it a dependable choice for any applicant tracking system.',
  },
  beacon: {
    suits:
      'Beacon is for product, engineering, operations and project roles where a clean modern page with one touch of colour feels right. It suits mid-career professionals applying through online portals who want something less austere than a black-and-white page.',
    layout:
      'The name is large and bold at the left in Source Sans 3, with the role in blue beneath it and the contacts in one grey row. Section headings are bold blue words in sentence case, not capitals, on a thin blue rule. Bullets are small blue dots and links are blue. Everything else is slate type on white with no chips, icons or meters.',
    ats:
      'There is nothing decorative to filter out: the blue is only colour on real text and rules. Sentence-case headings such as "Experience" and "Education" are what parsers look for. One column, so entries and dates come out in order.',
  },
  bare: {
    suits:
      'Bare is for people who want the page to disappear behind the writing: senior individual contributors, writers, researchers and anyone whose sentences do the work. It is also a sound choice when an employer asks for a plain résumé.',
    layout:
      'No rules, no marks and no colour. The name is set large and bold at the left, the role and contacts follow in slate and grey, and section headings are small bold tracked capitals separated from the next section by space alone. Entries carry bold titles, right-aligned dates and small round bullets.',
    ats:
      'With no rules, icons or shapes at all, the extracted text matches the page line for line. Headings are standard words and every date is real text. Because space is the only divider, keep the section gap at its default so sections stay distinct on screen.',
  },
  signal: {
    suits:
      'Signal suits engineers, analysts and project staff who want a plain page with a little hierarchy built in. It is easy to skim because the eye moves between two levels, name and headings in the first, details in grey in the second.',
    layout:
      'The name is set in blue at the left in Source Sans 3, with the role in slate and contacts in a grey line beneath. Section headings are bold, tracked slate capitals on a full rule. Entry titles and employers are bold slate, while dates, places and course lists drop to grey. There are no icons, chips or meters.',
    ats:
      'The page is one column of real text with ordinary rules, so parsers read headings, titles and dates in order. The grey second level is only colour, and the blue is used for the name alone. Nothing needs to be filtered out.',
  },
  marker: {
    suits:
      'Marker is for operations, sales, support and project people who want a plain page that is quick to navigate. The filled headings help a reader jump straight to experience or skills, which suits busy hiring managers reviewing many applications.',
    layout:
      'The name in Lato at the left, the role in blue below it and contacts in grey. Each section heading is white capitals inside a filled blue block with slightly rounded corners, the only shape on the page. The rest is plain type in slate: bold titles, grey places, right-aligned dates and small blue bullets.',
    ats:
      'The blue blocks are drawn behind real heading text, so each heading still extracts as an ordinary word such as "Experience". There are no icons, chips or meters to filter. The body is one column and comes out in reading order.',
  },
  console: {
    suits:
      'Console suits software, infrastructure, data and security engineers who want their résumé to look like well-kept notes. It is quiet and efficient, a good fit for technical readers who skim fast and care only about what was built.',
    layout:
      'IBM Plex Sans throughout at a small, even size. A modest bold name, then the role and a grey contact line. Section headings are bold slate words in sentence case with light tracking and no rule. Labels and dates use one grade of grey, everything else is near-black, and there is no ornament anywhere on the page.',
    ats:
      'A single column with no rules, shapes or icons gives a parser a clean, ordered text layer. The small type size affects human reading only. Because nothing divides sections but space and weight, keep the default gaps so the page still reads in blocks.',
  },
  margin: {
    suits:
      'Margin is for technical and analytical roles where a reader wants to find a section quickly: engineers, data analysts, researchers and technical program managers. The left edge works as an index, which helps on a two-page résumé.',
    layout:
      'A plain name, role and contact line across the top. Below, each section name stands in a wide left margin in bold, tracked IBM Plex Sans, and the section\'s content runs in a single column to its right. Thin grey rules separate the sections across the full width. There is no colour beyond slate and grey.',
    ats:
      'Although it looks like two columns, each heading is read before the content beside it, so the extracted text comes out as heading then entries, section by section. The narrower text column means more line breaks, so long bullets may run a line longer than in a full-width design.',
  },
  measure: {
    suits:
      'Measure suits academics, researchers, quantitative analysts and engineers in fields where a tightly set, justified page is the norm. It reads as rigorous and familiar to anyone who has read a paper. For a design or marketing role it may feel too austere.',
    layout:
      'Justified text in Latin Modern Roman on a tight baseline within 0.6in side margins. The name is centred in capitals, with the role and contacts centred below. Section titles are plain capitals at the size of the body with a hairline rule beneath, so case and rule alone mark them. Entry titles, employers and dates are bold, and everything prints in one dark ink.',
    ats:
      'One column of real text with nothing decorative, so it extracts in order. Justified lines stretch the spaces between words, but no word is ever hyphenated, so every term an ATS looks for stays whole on one line, in the PDF exactly as on the page you edit.',
  },
}
