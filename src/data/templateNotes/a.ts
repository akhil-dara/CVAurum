import type { TemplateNote } from './index'

/** Notes for a third of the designs; see ./index.ts. */
export const NOTES_A: Record<string, TemplateNote> = {
  clarity: {
    suits:
      'Clarity fits mid-career and senior people in tech, product, consulting and operations whose résumé carries a lot of structure: several roles, projects with links, certifications and a degree worth a GPA. It rewards a reader who scans for employers and numbers, such as an engineering manager or an in-house recruiter at a scale-up.',
    layout:
      'Two columns on plain white: a wide main column on the left and a narrow right rail split off by a thin vertical line. The bold Poppins name sits over a blue title and an icon contact row. Headings are uppercase with a heavy grey rule beneath; entries are parted by dotted lines; employers and schools print in accent blue; skills in the rail are underlined words grouped by category; Lato carries the body. An optional rounded photo is supported.',
    ats:
      'Every word is real, selectable text. A parser usually reads the main column first and the right rail after it, so skills and certifications arrive late; repeat the key tools inside experience bullets too. The GPA block and dotted dividers are styling only and do not split entries. Add a photo only where the hiring region expects one.',
  },
  obsidian: {
    suits:
      'Obsidian is for people applying where a dark, considered document reads as taste rather than risk: fintech, crypto, design-led product teams, agencies and founders sending a résumé directly to a hiring lead. For a bank, a law firm or a public-sector portal, a light design is the safer pick.',
    layout:
      'A single column on a near-black page. The Archivo name is set in white over a gold title and a plain contact line, closed by a hairline rule. Section labels are small gold capitals with wide tracking. Summary, each job, each degree and each project sit inside their own rounded dark card with a faint border, and skills follow as grouped grey chips. Gold also marks bullets, employers and the language dots.',
    ats:
      'The dark background is a fill behind real text, so a parser reads the words in order exactly as on a white page: one column, top to bottom, cards included. The risk is human, not machine; a recruiter who prints the file on an office printer spends a lot of toner, so keep a light design ready for anyone who asks for a printable copy.',
  },
  'onyx-noir': {
    suits:
      'Onyx Noir suits developers, data people, security engineers and product designers who want a high-contrast, screen-first résumé, for startups and technical teams that read on a monitor. It works best for two to ten years of experience, where one dense column holds everything without crowding.',
    layout:
      'One column on a charcoal page with crisp off-white Inter type and an electric-teal accent. The name is large and left-aligned, the title is teal, and the contacts carry small icons. Each heading is spaced uppercase followed by a teal rule running to the margin. Skill categories are labelled in teal over grey chips, languages use teal dots, and dates sit flush right on every entry.',
    ats:
      'Single column, so a parser meets summary, experience, education, projects and skills in the order shown. Contact icons are drawn shapes, not characters, so email and phone stay clean strings. The charcoal is only a background colour behind selectable text. For printed or internal-portal applications, switching to a light design costs nothing since the content carries over.',
  },
  cascade: {
    suits:
      'Cascade is for people who want colour and a photo without losing order: marketing, customer success, hospitality, healthcare and early-career applicants across Europe, the Middle East and Asia, where a photo on a résumé is common. It is less fitting for US or UK roles where photos are discouraged.',
    layout:
      'Two columns with a deep-teal sidebar on the left, about a third of the page wide, holding an optional circular photo, skills as outlined chips grouped by category, languages with dot meters, certifications and awards in near-white type. The white main column opens with the name, a teal title and an icon contact block, then experience, projects and education under teal uppercase headings with a thin rule and a small icon badge.',
    ats:
      'Text everywhere is selectable, including in the coloured sidebar. Many parsers read the main column, then the sidebar, so the skills list may be filed after education; mention key tools in the experience bullets as well. The photo is an image and carries no text. Leave it off for applications in regions where hiring rules discourage photos.',
  },
  sapphire: {
    suits:
      'Sapphire fits corporate applicants: finance, consulting, sales, project management and operations, especially for a recruiter or hiring manager reading many similar files. The deep navy reads conservative, and the structured sidebar suits someone with a long skills list and several certifications to show.',
    layout:
      'A navy sidebar on the left carries an optional squared photo, grouped skill chips with thin outlines, dot-meter languages, certifications and awards. The white main column holds the large name, a navy title, an icon contact grid and the experience, project and education sections. Each heading is uppercase navy with a short vertical accent bar and an icon badge to its left. Inter throughout, with roomy line spacing.',
    ats:
      'All text is live, including the light type on navy. Most parsers take the main column before the sidebar, so the experience reads first and the skill chips land after it as plain words. The bar and badge beside each heading are drawings that do not enter the text. A squared photo suits regions that expect one; leave it off for US, UK and Canadian applications.',
  },
  garnet: {
    suits:
      'Garnet suits people in brand, editorial, hospitality, fashion retail, wine and events, or anyone wanting warmth without a loud colour. It works for a hiring manager who reads the page in full rather than skimming, and for applicants with a solid skills list to put beside their history.',
    layout:
      'The main column sits on the left in white with a large Lato name, a burgundy title and contacts with small icons. A burgundy sidebar runs down the right third holding grouped skill chips, languages with dot meters, certifications and awards in pale pink type. Headings are burgundy uppercase with a thin rule and a small icon badge. A rounded photo is optional; project tags show as soft pink chips.',
    ats:
      'Garnet is a two-column page of real text. The main column on the left usually reads first, then the right sidebar, which keeps experience ahead of skills in most parsers. Repeat the most important skills in the bullets so a keyword match does not depend on the sidebar. Use the photo where local convention expects it and drop it elsewhere.',
  },
  initials: {
    suits:
      'Initials is for people who want a personal mark at the top of the page without a photo: consultants, freelancers, engineers and product people applying in markets where photos are discouraged. The monogram gives a sidebar something to anchor on, which suits a candidate with a long skills list and little else for the left column.',
    layout:
      'Two columns with a dark slate sidebar on the left. A large light-grey diamond at its top carries the initials, and below it sit grouped skill chips, languages with dots, certifications and awards. The white main column opens with the Inter name, a sky-blue title and icon contacts; sky-blue uppercase headings carry a short vertical bar and an icon badge, and project tags are pale blue chips.',
    ats:
      'The diamond is a shape with the initials drawn in it; the full name still appears as text in the main column, so a parser picks up the name correctly. The main column usually reads before the sidebar. Because no photo is used, Initials is safe for US, UK and Canadian applications where hiring teams avoid photos.',
  },
  emblem: {
    suits:
      'Emblem fits formal settings where a centred, traditional page is expected: law, accounting, public administration, academic administration, healthcare management and senior roles at established firms. The circular monogram gives it a personal mark without a photo, so it travels well across regions.',
    layout:
      'A single centred column. A slate circle carrying the initials sits above a Source Serif name, a quiet title and one line of contacts without icons. Headings are uppercase serif in slate with a full-width rule beneath. Body text is Source Sans 3, skills print inline as category: item · item, languages use slate dots, and dates align right. No sidebar, no badges, dense but evenly spaced.',
    ats:
      'One column read top to bottom, with plain inline skills and no icons in the contact line, so the text a parser extracts matches what a reader sees. The monogram circle is a drawn shape and is ignored. Emblem is one of the safest choices for strict applicant tracking portals, and the lack of a photo keeps it suitable for every region.',
  },
  verde: {
    suits:
      'Verde suits roles where approachability counts: sustainability, environmental science, education, nonprofit work, agriculture, wellness and early-career applicants. The forest green reads calm rather than corporate. A photo is offered, so it also suits markets in Europe and Asia where one is customary.',
    layout:
      'A forest-green sidebar on the left, about a third wide, holds an optional circular photo, grouped skill pills, dot-meter languages, certifications and awards in pale mint type. The white main column has the large Inter name, a green title and icon contacts, then experience, projects and education under green uppercase headings with a thin rule and an icon badge. Project tags are pale green pills.',
    ats:
      'Verde stays parseable because both columns are live text. Expect a parser to read the white main column first and the green sidebar second, so the skills section may appear after education in the extracted text; key skills are worth naming in the bullets too. Where photos are discouraged, switch the photo off and the sidebar closes up.',
  },
  'onyx-gold': {
    suits:
      'Onyx Gold is for people who want a dark page with a warmer, more luxurious tone: hospitality leadership, luxury retail, private banking client roles, creative direction and executive assistants to senior leaders. It reads best on screen and in portfolios sent directly to a person.',
    layout:
      'One column on a deep brown-black page with warm ivory Inter type and an amber-gold accent. The name sits left-aligned, the title in gold, the contacts with small icons. Spaced uppercase headings are followed by a gold rule to the right margin. Skill categories are labelled in gold over muted chips, languages show gold dots, and dates align right on every entry.',
    ats:
      'The page is a single column of selectable text on a coloured background, so extraction order matches the visual order. Contact icons are drawn and do not pollute the email or phone strings. The warm dark ground costs nothing to a parser but a lot of toner on paper; keep a light design for anyone who prints applications.',
  },
  pinnacle: {
    suits:
      'Pinnacle suits senior managers and directors in operations, engineering, finance and healthcare who want an executive feel and no photo. The circular monogram and charcoal sidebar give weight to the top of the page, and the wide main column leaves room for long leadership bullets.',
    layout:
      'A charcoal sidebar on the left opens with a large light-grey circle carrying the initials, then grouped outlined skill chips, dot-meter languages, certifications and awards. The white main column holds the Inter name, a deep teal title and icon contacts. Main headings are teal uppercase with a short vertical bar and icon badge, and project tags are pale teal chips.',
    ats:
      'The monogram circle is decoration; the name is real text in the main column. Most parsers read the main column, then the sidebar, so experience comes first in the extracted text and skills follow. Without a photo, Pinnacle suits US, UK and Canadian applications where hiring teams avoid images of the candidate.',
  },
  crest: {
    suits:
      'Crest fits conservative fields where a serif page and a formal header are expected: law, banking, insurance, public service, architecture and heritage or museum work. The square monogram adds a personal seal without a photo, which suits partner-track and senior applications.',
    layout:
      'A single centred column set entirely in PT Serif. A solid rust-brown square with the initials sits above the centred name, a rust title and a plain contact line. Headings are rust uppercase with a thin full-width rust rule. Skills print inline in category rows, languages use rust dots, link and tag chips are pale rust, and dates align right.',
    ats:
      'One column of serif text read in order, with no icons in the contact line and inline skills, so extracted text stays faithful. The square is a drawn block; the initials in it are not mistaken for the name because the full name prints beneath. Crest is a strong choice for strict portals and for any region, since it carries no photo.',
  },
  ribbon: {
    suits:
      'Ribbon suits marketing, product, UX, communications and startup applicants who want one strong colour moment and an otherwise plain page. The banner gives a recruiter an instant name and contact line, which helps in a stack of printed or on-screen résumés.',
    layout:
      'A full-width indigo band across the top carries the name, title and icon contact line in white. Below it, one white column runs with indigo uppercase headings followed by a pale indigo rule. Skills sit as pale indigo chips under bold category labels, languages show indigo dots, and dates align right. Inter throughout at a medium density.',
    ats:
      'The banner text is real white text over a filled rectangle, so the name and contacts extract normally and come first. The rest is a single column read top to bottom. Contact icons are drawings, not characters. On paper the band prints as a solid block, so a colour printer or a PDF sent by email shows it best.',
  },
  orchid: {
    suits:
      'Orchid fits creative, wellness, beauty, events, education and people-facing roles where a warm and distinctive colour is welcome. The plum sidebar on the right keeps the history on the left where a reader starts, and the optional photo suits markets that expect one.',
    layout:
      'A white main column on the left with a large Inter name, a purple title and an icon contact grid, then experience, projects and education under purple uppercase headings with a thin rule and an icon badge. A plum sidebar on the right third holds grouped outlined skill chips, dot-meter languages, certifications and awards in pale lilac type. A rounded photo is optional.',
    ats:
      'Text in both columns is selectable. Because the main column is on the left, most parsers read the history first and the plum sidebar second, which suits keyword matching in experience. Long certification titles wrap in the narrow sidebar but stay one entry. Leave the photo off for US, UK and Canadian applications.',
  },
  aurum: {
    suits:
      'Aurum is the flagship design: a calm, editorial single column for professionals in any field who want the page to look considered without colour blocks or a photo. It suits consultants, product managers, analysts and senior individual contributors whose readers include both a parser and a careful human.',
    layout:
      'One column on white. A Source Serif name heads the page over a small tracked uppercase title and one line of plain contacts, closed by a gold rule. Headings are tracked uppercase labels with a short gold underline and an icon badge. Source Sans 3 carries the body, skills sit as pale gold chips under category names, and dates align right.',
    ats:
      'Aurum is a single column of selectable text with no sidebar, so a parser reads every section in the order printed. The gold rules and badges are drawn and never enter the text. Contacts are plain strings with no icons. Suitable for any portal and any region, as it carries no photo.',
  },
  'aurum-editorial': {
    suits:
      'Aurum Editorial suits writers, editors, publishers, curators, architects, and senior people in luxury, arts and culture who want an elegant, literary page. The centred small-caps name reads like a masthead, which works for a cover-letter-and-résumé pair sent to a person.',
    layout:
      'A single centred-header column. The name is set in gold Cormorant Garamond small caps, with a tracked uppercase title and one contact line beneath. Section headings are Cormorant small caps in mixed case, each with an icon badge and a single hairline gold rule. Body text is Source Sans 3, skills print inline by category, and dates sit flush right.',
    ats:
      'One column, read in order. The small caps are a typographic style on ordinary letters, so a parser reads the name and headings as normal words. The gold hairline and badges are drawings. Inline skills extract as clean comma-like lists. With no photo, it fits any region and strict portals alike.',
  },
  'swiss-aurum': {
    suits:
      'Swiss Aurum is for designers, architects, engineers and product people who prefer a modernist page: one sans typeface, generous space and no flourish. It suits a reader who values order, such as a design director or a technical hiring panel.',
    layout:
      'One column on white, set entirely in Inter at a relaxed line height. A bold black name sits over a grey title and a plain contact line. Each heading is a small tracked uppercase label beside a gold square tick and an icon badge, with no rule. Skills appear as pale gold chips under bold category labels, and dates align right. White space between sections is wider than most designs.',
    ats:
      'A single column of real text, read in order. The gold ticks and badges are drawn, and contacts carry no icons, so extracted text is tidy. The generous spacing means content runs longer, so a long history may reach a second page; tighten density if one page is required.',
  },
  atelier: {
    suits:
      'Atelier suits jewellery, fashion, interiors, luxury retail, galleries, hospitality and brand roles where taste is part of the job. It also works for senior creatives who want a distinctive, quiet page rather than colour blocks.',
    layout:
      'A single text column with a left gutter of labels. A Playfair Display name heads the page over a widely tracked gold monospace title and a contact line, closed by a hairline rule with a short gold tick. Section labels are gold IBM Plex Mono capitals set right-aligned in the left gutter, beside their content. Body text is IBM Plex Sans with gold bullets and inline skills.',
    ats:
      'The gutter labels sit on the same line as their sections, so most parsers read each label then its content in order. The page is a single flow of real text, not two columns. Monospace headings read as ordinary words. Contacts carry no icons. No photo is used, so Atelier fits any region.',
  },
  harvard: {
    suits:
      'Harvard is for students, new graduates, and applicants to investment banking, consulting, law, policy and academia, where a plain black serif résumé is the expected format. Recruiters in these fields read it fast because every section sits where they look for it.',
    layout:
      'One column in pure black Source Serif 4. The name is bold and centred, the title sits beneath it, and contacts run in a centred line separated by dots. Headings are bold tracked uppercase with a full-width black rule. Skills are inline lists by category, languages use black dots, and dates are flush right. No colour, no badges, tight spacing.',
    ats:
      'Harvard gives a parser nothing to misread: a single column, plain text contacts, inline skills, no icons and no graphics beyond rules. Section names are standard words, so they map cleanly to profile fields. It suits any portal and any region and is the safest default for campus recruiting systems.',
  },
  garamond: {
    suits:
      'Garamond suits lawyers, academics, editors, finance professionals and senior managers who want a traditional, bookish page with a little more presence than a plain format. Its large old-style name and generous size read well on paper for interview panels.',
    layout:
      'One column in EB Garamond at a slightly larger text size. A bold left-aligned name sits over a plain title and a dotted contact line. Headings are bold tracked uppercase with a small icon badge and a full-width black rule. Skills print inline by category, and dates align right. The palette is black and grey, with no accent colour.',
    ats:
      'A single column of selectable serif text read top to bottom. The icon badges beside headings are drawings and do not enter the extracted text. Contacts are plain strings. The larger type means a long history may need two pages, which most parsers handle without trouble.',
  },
  modern: {
    suits:
      'Aria is the all-round default: a safe, sharp page for software, data, product, marketing, operations and graduate applicants who want one accent colour and nothing that could confuse a portal. It works for almost any reader, from a hiring manager to an agency recruiter.',
    layout:
      'One column on white in Inter. A bold left-aligned name over a blue title and an icon contact line. Headings are blue uppercase with an icon badge and a solid blue rule beneath. Skills appear as pale blue chips under category names, languages use blue dots, project tags are blue chips, and dates sit flush right. Medium density, roughly one full page for a decade of work.',
    ats:
      'Aria reads in order: one column, real text, standard section names. The contact icons and heading badges are drawn shapes, so email, phone and links extract cleanly. Skill chips come out as plain words. A strong first choice when the application goes through an unknown tracking system.',
  },
  classic: {
    suits:
      'Oxford is for conservative fields and senior readers: law, accounting, government, education, medicine and traditional corporate roles. Its centred serif header and ruled sections look familiar to any reader, which suits applicants who want the content, not the design, to be noticed.',
    layout:
      'A single column in PT Serif. The name is centred and bold, with the title and a dot-separated contact line beneath. Each section heading is in small caps and boxed between two full-width rules, one above and one below. Skills print inline by category, languages use dark dots, and dates sit right. Slate accents only, no colour fills.',
    ats:
      'One column of selectable serif text, standard headings, no contact icons, inline skills. A parser reads it exactly in order. The double rules are drawn lines with no effect on extraction. Oxford is safe for any region and any portal, including older tracking systems.',
  },
  cambridge: {
    suits:
      'Cambridge suits researchers, engineers, doctoral candidates, lab staff and academic applicants whose CV lists degrees, publications and projects. The navy accent and right-aligned details give it a clean scholarly feel for faculty search committees and research managers.',
    layout:
      'One column in Source Sans 3. A centred bold name, a title and a dot-separated contact line. Headings are navy in mixed case with an icon badge and a navy rule running from the heading to the right margin. Dates sit flush right, and locations drop to a second right-aligned line beneath them. Skills print inline, project tags are pale blue chips.',
    ats:
      'A single column of plain text, read in order. Dates and locations on the right share lines with titles and employers, which most parsers pair correctly. Mixed-case headings are standard words. No photo and no contact icons, so it works across regions and strict portals.',
  },
  vector: {
    suits:
      'Vector suits software engineers, data scientists, quantitative analysts and researchers who want a dense, technical page with nothing ornamental. It fits engineering hiring managers who read fast and care about tools, scope and results.',
    layout:
      'One column in black Source Serif 4. A bold centred name, a plain title and a contact line split by vertical bars. Headings are bold small caps in mixed case with an icon badge and a full-width black rule. Each entry puts the employer below the role and the location flush right under the dates. Skills print inline by category. Tight spacing fits a lot on one page.',
    ats:
      'A single column with standard section names and plain inline skills, so a parser has nothing to misread. Small caps are a style on ordinary letters. The vertical bars between contacts are plain characters, which keeps each item a separate token. Good for any tracking system and any region.',
  },
  minimal: {
    suits:
      'Frost is for anyone who wants the words to do all the work: writers, researchers, product managers, designers and senior people with strong content. It suits a reader who dislikes decoration and reads every line.',
    layout:
      'One column in Inter on white with no rules, no badges and no colour fills. A large left-aligned name, a grey title and a plain contact line. Headings are small grey uppercase labels with wide letter spacing. Skills print inline by category, and dates align right. Wide line spacing and generous gaps between sections give the page its open feel.',
    ats:
      'With no graphics at all, Frost extracts exactly as it reads: a single column, plain contacts and standard section names. The relaxed spacing means it uses more vertical room than denser designs, so trim or tighten if a one-page limit applies. Safe for any portal and region.',
  },
}
