import type { TemplateNote } from './index'

/** Notes for a third of the designs; see ./index.ts. */
export const NOTES_B: Record<string, TemplateNote> = {
  executive: {
    suits:
      'Sterling suits directors, vice presidents and senior managers in finance, consulting, law, operations and the public sector, where the reader is a board, a recruiter running a senior search or a hiring committee that expects a formal page. It also works for a senior individual contributor who wants weight without colour. For a design studio or an early-stage start-up it can read as stiff.',
    layout:
      'Sterling is a single column with a split header: a large Playfair Display name and the job title on the left, the contact lines stacked down the right with small icons, and a heavy navy rule closing it off. Section headings are letter-spaced navy capitals in Playfair, each resting on a thin full-width underline. Body text is Lato at a moderate density, and the navy accent stays in headings, rules and language dots.',
    ats:
      'Sterling reads top to bottom in one column, so a parser meets the summary, experience and education in the order written. The stacked contact block on the right is ordinary selectable text, though a few older parsers treat a split header as a second column; paste the PDF text into a plain editor to confirm name, email and phone come first. There is no photo, which suits the US, UK and Canada.',
  },
  timeline: {
    suits:
      'Vertex suits people whose career is best told as a sequence: engineers, product managers, marketers and analysts with three to five roles, a clear climb in titles or a move between companies worth showing. Its sky-blue accent and rounded Rubik type feel current, which fits tech companies and agencies better than a law firm or a bank.',
    layout:
      'Vertex is one column with the name in heavy Rubik, the title in sky blue and contact details in a wrapping row of icons. Each section heading carries a short blue bar, a small icon tile and blue capitals. The defining detail is a thin vertical rail down the left of experience, education and projects, with a hollow circle marking each entry. Skills sit in grouped pale-blue chips; languages use blue dots.',
    ats:
      'The timeline rail and its circles are drawn shapes, not characters, so a parser sees only the text beside them, in order, in a single column. Job title, employer, place and dates keep their own lines, which is what parsers look for. Skill chips are real words on a tinted background, so every keyword is searchable. The heading icons carry no text and are skipped.',
  },
  double: {
    suits:
      'Apex suits software engineers, data scientists, IT and cloud specialists who carry a long skills list and want it out of the way of their experience. The near-black sidebar gives a technical, product-company feel. It is less suited to a career changer whose story needs the full width, or to conservative sectors where a dark panel looks heavy on paper.',
    layout:
      'Apex splits the page into a near-black left sidebar about a third wide and a white main column. The sidebar holds skills in outlined chips grouped by area, languages with dot meters, certifications and awards, all in light text. The main column opens with a large Inter name, a sky-blue title and contact lines, then summary, experience, projects and education under sky-blue capital headings with a thin underline and an icon tile.',
    ats:
      'Apex is two columns, and parsers generally read the main column first and the sidebar after, so the job history is not interrupted by skill lists. Keep roles, dates and employer names in the main column, where they read in sequence. Sidebar text is light on dark but still real, selectable text, so skills count as keywords. A black-and-white printout spends a lot of toner on the dark panel.',
  },
  'double-colored': {
    suits:
      'Prism suits marketing, sales, communications, customer success and product roles where a confident first impression helps, and junior to mid-level candidates who want the page to feel energetic. The saturated blue panel is a strong choice for start-ups and agencies; for banking, law or government, a quieter design will travel further.',
    layout:
      'Prism runs a royal-blue sidebar about a third of the page wide down the left, holding grouped skill chips with fine outlines, language dots, certifications and awards in white Montserrat. The main column has a heavy Montserrat name, a blue title, icon contact lines and blue capital headings over a thin blue rule. A round photo is switched on by default and appears once a picture is added; the sample is shown without one.',
    ats:
      'Prism is read main column first, then sidebar, so the work history comes through cleanly before the skills. The photo is an image and carries no text. For applications in the US, UK or Canada, switch the photo off, since many employers there prefer none; across much of Europe, the Middle East and Asia a photo is common. White text on the blue panel remains real, selectable text.',
  },
  aside: {
    suits:
      'Linen suits candidates who want the reader to meet their experience before their toolkit: product designers, project managers, analysts, teachers moving into training, and generalists. The main story sits on the left where the eye lands first, and the pale sidebar keeps skills within reach without competing. It works from graduate to senior level.',
    layout:
      'Linen puts a wide white main column on the left and a soft grey-lavender sidebar on the right, about a third of the width, divided by a hairline. The header is a large Work Sans name with an indigo title and icon contact lines. Headings are small, widely spaced indigo capitals beside an icon tile, with no rule beneath. The sidebar carries grouped grey skill chips, language dots, certifications and awards.',
    ats:
      'Linen is read main column then sidebar, which here matches the visual order: summary, experience, projects and education first, skills after. Because the main column is the left one, reading order and visual order agree, which makes the parsed result easy to predict. Every word is selectable text, and the pale panel prints lightly on any printer.',
  },
  compact: {
    suits:
      'Quartz suits people with a long or crowded history to fit on one page: senior engineers, consultants with many engagements, operations leads, nurses and tradespeople with many certifications. Its smaller type and tight spacing buy room for an extra role or two. On a short early-career résumé the density leaves empty space at the foot; a roomier design fills the page better.',
    layout:
      'Quartz is one column set in Roboto at a small size with tight line and section spacing. The header is a single line, name in bold with the job title after a dash, then contact details with icons in a wrapping row. Section headings are small grey capitals beside an icon tile, followed by a thin grey rule running to the right margin. Colour is muted charcoal throughout; skills are inline lists grouped by category.',
    ats:
      'Quartz is about as plain as a parser could ask for: one column, standard section names, inline skills separated by dots and no colour panels. Dense type does not hurt parsing, but the default size is already small, so print a copy and check it reads comfortably before shrinking anything further. All text is selectable and reads in order.',
  },
  elegant: {
    suits:
      'Lumière suits roles where taste is part of the job: hospitality and luxury retail managers, editors, writers, architects, curators, interior designers and executive assistants. It also fits a lawyer or consultant who wants refinement without colour blocks. For a highly technical role with long skill lists, the airy spacing can push the page long.',
    layout:
      'Lumière centres the whole header: a light Cormorant Garamond name, the job title in widely spaced capitals, contact details in a plain row with no icons, then a short gold rule. Section headings are centred, letter-spaced gold capitals with no lines at all. Body text is EB Garamond at a generous size and spacing, and the warm gold returns only in bullets, language dots and tags.',
    ats:
      'Lumière is a single column, and centred headings are read the same as left-aligned ones, so the order holds. The contact row carries no icons, leaving nothing for a parser to misread. The Garamond faces are embedded and the text is selectable. A long career may run to two pages at this spacing; that is fine for senior roles, but trim older roles where one page is expected.',
  },
  contemporary: {
    suits:
      'Editorial suits marketers, content strategists, UX writers, product managers and designers who want a page that reads like a well-set article. The crimson accent is bold, so it fits media, creative industries and start-ups. Candidates in conservative fields can swap the accent for navy or charcoal, which keeps the structure and calms the tone.',
    layout:
      'Editorial is one column with a gutter: section headings sit right-aligned in a narrow left column in crimson capitals, and the content runs beside them. The header is left-aligned, with a crimson DM Sans name, crimson title and icon contact row. Bullets, project tags and grouped skill chips are tinted crimson, and language levels use crimson dots. No rules divide the sections; white space does.',
    ats:
      'Although the headings sit in a side gutter, Editorial is still one flow: each heading is followed by its own content, so parsers read section by section in order. It is not a two-column layout of the kind that trips parsers. Skill chips are words, not images, so every keyword is searchable. Keep headings to standard names such as Experience and Education so they are recognised.',
  },
  polished: {
    suits:
      'Amethyst suits early and mid-career candidates in tech, marketing, events, education technology and customer-facing roles who want a confident page without a sidebar. The violet banner signals personality, so it reads well at start-ups and creative firms; for finance, law or the public sector, a plainer header is the safer pick.',
    layout:
      'Amethyst opens with a full-width violet banner with rounded lower corners, holding the name in white Poppins, the job title and a row of contact details. Below it, one column runs the full width. Each heading has a short violet bar, an icon tile and violet capitals. Skills and project tags are rounded violet pills grouped by category, bullets are violet dots and languages use violet dot meters.',
    ats:
      'The banner text is real white text on a coloured shape, so name, email and phone are read as text at the top, where parsers expect them. Below that, the single column reads in order. Pills hold plain words, so skills count as keywords. Send the exported PDF rather than an image or screenshot of it, so the banner text stays selectable.',
  },
  technical: {
    suits:
      'Terminal suits software, DevOps, security, data and site reliability engineers, and computing students applying for internships. The monospace headings tell a technical reader at once what kind of page this is. Outside engineering the code-like styling can look like a costume, so product, sales or management roles are better served by another design.',
    layout:
      'Terminal is one column with the name set in IBM Plex Mono and the title in emerald green, above a row of icon contact details. Section headings are lowercase monospace words in green, introduced by a green slash mark and an icon tile. Body text is IBM Plex Sans. Skills and project tags are outlined green boxes in monospace, grouped by area, and languages use green dots.',
    ats:
      'Terminal reads in a single column, and lowercase headings are matched by parsers the same way as capitals; the section names underneath are plain words such as experience and skills. Monospace skill tags are ordinary text, so every tool and language counts as a keyword. List them by their usual names, such as Kubernetes rather than k8s, to match how job adverts spell them.',
  },
  creative: {
    suits:
      'Nova suits designers, marketers, social media managers, content creators and recent graduates in creative fields, where personality is part of the pitch and a photo is normal. The violet gradient and rounded tags are deliberate, so it is a poor match for audit, law or government applications, where a reader may judge the style before the content.',
    layout:
      'Nova splits the page into a violet gradient sidebar on the left, a little over a third wide, and a main column topped by a gradient banner with a rounded lower corner that holds the name, title and contact details in white Poppins. The sidebar carries skills as rounded outlined pills, language dots, certifications and awards. Main headings are violet capitals with an icon tile and no rule. A rounded photo is switched on by default.',
    ats:
      'Nova is two columns, read main column first and sidebar second, so experience and education come through before skills. The banner and sidebar text is real text on a coloured background. The photo is an image and is ignored by parsers; drop it for US, UK and Canadian applications and keep it where photos are expected. For a large corporate applicant portal, a single-column design is the safer choice.',
  },
  ivy: {
    suits:
      'Scholar suits graduate school applicants, law students, finance and consulting candidates, and anyone applying where a traditional Times-style résumé is the norm, such as investment banking or government. It is as much at home for an undergraduate with one internship as for a partner-level professional. It will not help a designer show visual skill.',
    layout:
      'Scholar centres the name in a large, widely spaced serif, the title beneath and contact details in a row divided by thin vertical bars, with no icons. Section headings are small capitals in a deep brown-black, left-aligned, followed by a thin rule to the margin. Everything is set in Tinos, a serif with Times-compatible letter widths, in near-black; colour barely appears beyond the heading tone and language dots.',
    ats:
      'Scholar is about as safe as it gets for parsers: one column, a serif every system handles, no icons, standard headings and inline skills. The vertical bars in the contact row are separators, so each item reads as its own value. If a firm asks for a Times New Roman résumé, Tinos matches its letter widths, so line breaks and page length come out the same.',
  },
  onyx: {
    suits:
      'Onyx suits architects, product and UX designers, engineers, analysts and consultants who want a modern page with no colour at all. Black and white reads as decisive and prints identically on any printer, which makes it a good default for applications that may be photocopied, faxed or reviewed on paper.',
    layout:
      'Onyx uses a split header: the name in heavy Archivo capitals with a grey title below on the left, contact details stacked with icons on the right, and a solid black rule beneath. Headings are spaced black capitals beside an icon tile, followed by a thin grey line to the margin. Body text is Inter in one column, skills are inline lists with bold labels, and the only fills are grey project tags.',
    ats:
      'Onyx is a single column after the header, so experience, education and skills read in order. Contact details stacked on the right are plain text lines with decorative icons a parser skips. Because nothing depends on colour, the page stays legible on a greyscale print or a poor scan, which matters when a recruiter forwards a paper copy.',
  },
  cobalt: {
    suits:
      'Cobalt suits sales, business development, account management, recruiting and marketing roles, and graduates entering consulting or tech, where energy and clarity both matter. The deep blue reads as dependable as well as bold, so it travels further into corporate settings than violet or crimson while still looking current.',
    layout:
      'Cobalt opens with a full-width deep cobalt banner with rounded lower corners, holding the name in white Mulish with the title and contact row beneath. One column follows. Each heading has a short cobalt bar, an icon tile and cobalt capitals. Job titles and employers are set in a lighter weight than in most designs, skills and project tags are pale-blue rounded pills, and languages use cobalt dots.',
    ats:
      'Cobalt places contact details inside the banner at the very top, where parsers look first, as real text. The rest is one column, read in order. Skill pills hold the words themselves, so keyword matching works. Choose it over a sidebar design when the posting runs through a large applicant tracking system and some colour is still wanted.',
  },
  academic: {
    suits:
      'Academia suits PhD candidates, postdocs, lecturers, researchers and scientists applying for faculty, fellowship or research posts, as well as graduate school applicants. It has room for publications, talks, grants and teaching, which a short résumé usually lacks. For an industry job the same design works as a two-page résumé, though a brisker layout may serve better.',
    layout:
      'Academia centres a bold Source Serif name, the title and a row of contact details divided by small dots, with no icons. Section headings are small capitals in slate grey with a thin grey rule running to the right margin. The whole page, headings included, is set in Source Serif 4 at a comfortable size and line spacing. Colour stays in slate and grey, and skills are inline lists with bold labels.',
    ats:
      'Academia reads as one column with conventional headings, which university portals and research job systems handle cleanly. List each publication as its own entry with authors, title, venue and year, so it reads as a separate item. A CV may run to several pages; put the sections that matter most for the post first, since many readers judge from the first page.',
  },
  verdant: {
    suits:
      'Verdant suits healthcare, education, nonprofit, sustainability, environmental and hospitality roles, and anyone whose work is people-facing. The soft mint sidebar feels approachable rather than corporate. It fits early to mid-career candidates with a moderate skills list; someone with fifteen years of roles may find the narrower main column runs to two pages.',
    layout:
      'Verdant puts a wide main column on the left and a pale mint sidebar on the right, about a third of the width, edged with a fine green line. The name is large Figtree with a green title and icon contact lines. Headings are small, letter-spaced green capitals beside an icon tile, with no rule. The sidebar holds grouped green-outlined skill chips, language dots, certifications and awards in dark green text.',
    ats:
      'Verdant is read main column first, then the right sidebar, which matches how the page looks: experience, projects and education come through in order, followed by skills. The mint panel is light enough to print cleanly on an office printer. All text is selectable, and the skill chips hold the plain words a keyword search looks for.',
  },
  sienna: {
    suits:
      'Sienna suits writers, editors, journalists, communications staff, publishers, gallery and museum staff, and humanities graduates. It also fits food, hospitality and wellness businesses that like a warm, crafted feel. The terracotta accent is gentle and personal, but it is not the natural choice for a hard-edged engineering post.',
    layout:
      'Sienna centres a Spectral serif name above the title in widely spaced grey capitals and a single row of contact details with no icons, then a short terracotta rule. Section headings are centred, letter-spaced terracotta capitals with no lines. Body text is Spectral throughout, generously spaced, and terracotta returns in bullets, the link marker, project tags and language dots.',
    ats:
      'Sienna is a single column with centred headings, which parsers read the same as left-aligned ones. With no icons and no panels, the text layer is clean and predictable. The serif is embedded and selectable. Because spacing is generous, a long career runs long; trimming bullets on older roles keeps the résumé to one or two pages.',
  },
  newton: {
    suits:
      'Newton suits researchers, quantitative analysts, mathematicians, physicists, engineers and computer science students, especially those used to typeset papers. It reads as rigorous and unadorned. It is a strong pick for research-to-industry moves, quant finance and research labs, and too restrained for a role that asks for visible design sense.',
    layout:
      'Newton centres a bold, slightly spaced Source Serif name with the title below and contact details in a dotted row, then a full-width dark rule. Section headings are slate small capitals on the left with a thin rule to the margin, and there are no icons anywhere. Body text is Source Serif 4, a little larger and more tightly leaded than the other serif designs, with slate-blue secondary text.',
    ats:
      'Newton has a typeset look but is not a scanned paper: every word is real text in one column, so parsers read it in order. Small-capital headings are standard section names under the styling. Contact items are separated by dot characters, which parsers treat as breaks between values. Paste the PDF text into a plain editor to see exactly what a parser will receive.',
  },
  deedy: {
    suits:
      'Duet suits software engineers, students and new graduates applying for internships and first engineering jobs, and technical people with many short entries to fit on one page. The narrow sidebar of skills beside a dense main column packs in a lot without feeling crowded. It is less suited to senior leaders whose story needs long, wide paragraphs.',
    layout:
      'Duet sets a narrow warm-ivory sidebar on the left, about thirty per cent of the width and edged with a thin rose line, beside a white main column. The name is large near-black Lato with a brick-red title and icon contact rows. Main headings are widely spaced brick-red capitals; sidebar headings use the same style in dark brown. The sidebar holds inline skill lists, languages, certifications and awards.',
    ats:
      'Duet is two columns, so parsers take the main column first and the sidebar second. Inline skill lists separated by dots are among the easiest forms for keyword matching. Keep dates and employers in the main column. Because the sidebar is narrow, long certification names wrap onto several lines, which reads fine but uses vertical room.',
  },
  slate: {
    suits:
      'Slate suits product managers, analysts, consultants, UX researchers and operations leads who want a structured, modern page that is calm rather than loud. The cool teal accent fits health tech, finance-adjacent software and public-sector digital teams, where a warmer red might feel too strong.',
    layout:
      'Slate is one column with a gutter: teal capital headings sit right-aligned in a narrow left column, and content runs beside them. The header is left-aligned with a dark DM Sans name, a teal title and an icon contact row. Section gaps are wider than in most designs. Skills are grouped in pale teal chips, bullets and language dots are teal, and neither rules nor icons divide the sections.',
    ats:
      'Slate keeps each heading beside its own content, so it parses as a single flow, section by section, despite the gutter. Standard heading names are recognised. The wide section gaps cost some space; if the page spills onto a second sheet, shorten older bullets before reducing the type size.',
  },
  mercury: {
    suits:
      'Mercury suits finance, banking, insurance, legal, accounting and corporate management candidates, from manager to C-level. Navy and a high-contrast serif signal steadiness to a conservative reader. It fits an executive search or board submission as well as a mid-career move inside a large company.',
    layout:
      'Mercury has a split header: a Playfair Display name with a muted title beneath on the left, contact details stacked with icons on the right, and a heavy navy rule below. Headings are navy capitals in Playfair, each with a small icon tile beside it and a thin navy underline across the page. Body text is Lato in one column; skills are inline lists with bold category labels, and project tags are pale navy.',
    ats:
      'Mercury reads in a single column below the header. The stacked contact details on the right are plain text; even if a parser places them after the name block, the email and phone still sit near the top. Section icons are images with no text. Standard headings, inline skills and real text throughout make it dependable with large corporate applicant tracking systems.',
  },
  halcyon: {
    suits:
      'Halcyon suits nurses, therapists, teachers, hospitality staff, customer service leads and junior professionals in countries where a photo is expected on a résumé. Its pale cyan sidebar is friendly and fresh. Candidates in the US, UK or Canada can use it with the photo turned off.',
    layout:
      'Halcyon has a white main column on the left and a pale cyan sidebar on the right, about a third wide, edged with a fine line. A round, medium-size photo is switched on by default and appears once a picture is added. The name is large Figtree with a teal title and icon contact lines. Headings are letter-spaced teal capitals beside an icon tile. The sidebar holds rounded teal skill pills, language dots, certifications and awards.',
    ats:
      'Halcyon is read main column first, then the right sidebar. The photo is an image a parser skips. In Germany, much of continental Europe, the Middle East and East Asia a photo is common; in the US, UK and Canada most recruiters prefer none, partly to avoid bias claims. All other text is real and selectable.',
  },
  graphite: {
    suits:
      'Graphite suits software, data, IT, hardware and manufacturing engineers who want a structured page with no colour to distract. Monochrome bars and boxes feel exact, and printed copies look the same as the screen version. It is a sound default for anyone in a technical field unsure which design to choose.',
    layout:
      'Graphite is one column in IBM Plex Sans. The name is heavy and near-black, the title muted grey, with contact details in an icon row. Each heading has a short black bar, an icon tile and black, widely spaced capitals, with no rule. Skills and project tags are small grey boxes with fine borders, grouped by area, and languages use black dots. No colour appears anywhere on the page.',
    ats:
      'Graphite reads straight down in one column, with headings parsers recognise and skills as plain words inside boxes. Since it relies on nothing but black ink, it scans and photocopies cleanly. For keyword matching, mirror the exact tool names used in the job advert inside the skill groups.',
  },
  portrait: {
    suits:
      'Portrait suits candidates who want their face to be part of the introduction: client-facing consultants, sales, hospitality, real estate and coaching, and job seekers in Europe, Latin America, the Middle East and Asia where a photo is expected. The dark sidebar adds weight; turn the photo off where one is discouraged.',
    layout:
      'Portrait has a deep navy sidebar on the left, about a third wide, and is set up to show a large rounded photo once a picture is added. The sidebar carries outlined skill chips in groups, language dots, certifications and awards in pale text. The main column opens with a large Inter name, a sky-blue title and icon contact lines, then sky-blue capital headings with icon tiles.',
    ats:
      'Portrait is two columns: parsers read the main column first, then the sidebar. The photo is an image and contributes nothing to parsing. Light text on the navy panel is real text and still counts for keywords. Pick Portrait mainly when a photo is wanted; without one, a dark-sidebar design built without a photo slot gives the same reading order.',
  },
  spotlight: {
    suits:
      'Spotlight suits event planners, brand ambassadors, hospitality and retail managers, trainers, presenters and creative freelancers who want a photo and a bold header without giving up a single, easy-to-read column. It works well in markets where a photo on a résumé is customary.',
    layout:
      'Spotlight opens with a violet-to-magenta gradient banner with rounded lower corners, carrying the name, title and contact row in white Poppins, with a round photo once a picture is added. One column runs below. Each heading has a short violet bar, an icon tile and violet capitals. Skill and project tags are small violet pills grouped by category, and languages use violet dots.',
    ats:
      'Spotlight is one column, which keeps parsing simple, and the banner text is real text at the top of the page. The round photo is an image and is skipped by parsers; turn it off for US, UK and Canadian applications. The gradient fill sits behind the text layer without changing it, so keywords in the pills still match.',
  },
}
