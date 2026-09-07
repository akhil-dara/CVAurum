# Authoring Templates

This guide explains how CVAurum templates work and walks you through building a new
one from scratch. By the end you will have added a brand-new resume design to the
template gallery — **without writing a single line of React**.

> **TL;DR** — A template in CVAurum is **pure data**. You add one `TemplateConfig`
> object to [`src/templates/registry.ts`](../src/templates/registry.ts) and (optionally)
> a small scoped CSS block to [`src/templates/templates.css`](../src/templates/templates.css).
> The shared rendering engine does everything else.

## Table of contents

- [The big idea: templates are data, not code](#the-big-idea-templates-are-data-not-code)
- [How rendering works](#how-rendering-works)
- [The `TemplateConfig` contract](#the-templateconfig-contract)
  - [Top-level fields](#top-level-fields)
  - [`defaults.theme`](#defaultstheme)
  - [`defaults.typography`](#defaultstypography)
  - [`defaults.layout`](#defaultslayout)
  - [`dates`](#dates-the-documents-not-a-template-default)
  - [`page`](#page-the-documents-not-a-template-default)
- [Semantic markup: the `.rm-*` classes](#semantic-markup-the-rm--classes)
- [Styling hooks: the `--rm-*` CSS variables](#styling-hooks-the---rm--css-variables)
- [The Signature collection](#the-signature-collection)
- [Worked example: building the "Aurora" template](#worked-example-building-the-aurora-template)
  - [Step 1 — Register the config](#step-1--register-the-config)
  - [Step 2 — Add a scoped CSS block](#step-2--add-a-scoped-css-block)
  - [Step 3 — Test it in the gallery](#step-3--test-it-in-the-gallery)
- [Rules and gotchas](#rules-and-gotchas)

---

## The big idea: templates are data, not code

Most resume builders implement each template as a bespoke React component. That makes
templates expensive to write, hard to keep consistent, and easy to break. CVAurum takes
the opposite approach.

Every CVAurum template is described by **one plain object** — a `TemplateConfig`. That
object is a set of high-level flags ("center the header", "render skills as chips", "use a
left sidebar") plus a bundle of design defaults (colors, fonts, spacing). A single shared
engine, [`src/templates/_shared/Artboard.tsx`](../src/templates/_shared/Artboard.tsx),
reads those flags and renders the resume as semantic HTML with stable `.rm-*` class names.

This means:

- **No new components.** Adding a template is data entry plus, at most, a handful of CSS rules.
- **Consistency for free.** Every template shares the same markup, the same section logic,
  and the same print pipeline. If the engine improves, every template improves.
- **ATS safety by construction.** Because all templates render the same single, readable
  text flow, there is no way to accidentally ship a template that hides text inside an image.

The two files you touch:

| File | What it holds |
| --- | --- |
| [`src/templates/registry.ts`](../src/templates/registry.ts) | The list of `TemplateConfig` objects. **Required.** |
| [`src/templates/templates.css`](../src/templates/templates.css) | Per-template scoped CSS, keyed off the template's `class`. **Optional.** |

---

## How rendering works

```
TemplateConfig (data)
        │
        ▼
Artboard.tsx (shared engine)
   reads header/section/skills flags
   sets --rm-* CSS variables from defaults
   emits semantic .rm-* markup
        │
        ▼
artboard.css  +  templates.css (.tpl-yourtheme scope)
        │
        ▼
Live preview  ──►  PrintPage  ──►  native "Save as PDF"
```

The engine maps your high-level flags onto markup and base styling:

- `header` picks the header layout (`standard`, `centered`, `banner`, `split`, `compact`).
- `section` picks how section titles are decorated (`underline`, `rule-after`, `bar`,
  `plain`, `boxed`, `side`).
- `skills` picks how the skills section renders (`inline`, `chips`, `bars`, `dots`,
  `grouped-chips`).
- `languageMeter` toggles a proficiency meter on the languages section.
- `defaults.layout.columns` / `sidebar` decide single vs. two-column and which side the
  sidebar sits on.

Your `class` value (e.g. `tpl-aurora`) is applied to the root element, so every CSS rule
you write is automatically scoped to your template and only your template.

---

## The `TemplateConfig` contract

The TypeScript type lives alongside the registry. Here is the full shape, annotated.

```ts
interface TemplateConfig {
  id: string;            // stable unique key, e.g. 'aurora'
  name: string;          // display name in the gallery, e.g. 'Aurora'
  description: string;   // one-line description shown in the picker
  tags: string[];        // labels the gallery filters on, e.g. ['two-column', 'modern']; 'signature' marks the collection
  atsSafe: boolean;      // true => shows the ATS-safe shield in the gallery
  class: string;         // scoped CSS root class, e.g. 'tpl-aurora'

  header: 'standard' | 'centered' | 'banner' | 'split' | 'compact' | 'display' | 'block' | 'band';
  section: 'underline' | 'rule-after' | 'bar' | 'plain' | 'boxed' | 'side';
  skills: 'inline' | 'chips' | 'bars' | 'dots' | 'grouped-chips';
  languageMeter: boolean;

  defaults: {
    theme: {
      primary: string;       // accent color (headings, rules, chips)
      text: string;          // body text color
      muted: string;         // secondary text (dates, sub-lines)
      background: string;    // page background
      sidebar: string;       // sidebar background (two-column templates)
      sidebarText: string;   // text color inside the sidebar
      name?: string;         // unset: derived (the body text, or the template's own)
      headline?: string;     // unset: derived (the accent, or the template's own)
      headings?: string;     // unset: derived (the accent, or the template's own)
      contacts?: string;     // unset: derived (the muted colour, or the template's own)
      links?: string;        // unset: links take the colour of the text around them
      gradientTo?: string;   // the band header's second stop; unset: derived from the accent
      footer?: string;       // the footer strip's ground; unset: the text colour
    };
    typography: {
      fontFamily: string;        // body font, e.g. 'Inter'
      headingFamily: string;     // section/heading font
      nameFamily: string;        // the name at the top of the resume
      fontSize: number;          // base body size in pt (the canvas converts to px)
      lineHeight: number;        // unitless multiplier, e.g. 1.4
      letterSpacing: number;     // em, e.g. 0 or 0.01
      headingScale: number;      // multiplier applied to heading sizes
      uppercaseHeadings: boolean;// UPPERCASE section titles
      sectionTitleScale: number; // section titles as a multiple of the body size (default 1.06)
      headlineScale: number;     // the headline as a multiple of the body size (default 1.15)
      contactScale: number;      // the contact line as a multiple of the body size (default 0.95)
      headingCase?: 'upper' | 'smallcaps' | 'none'; // unset: uppercaseHeadings decides
      nameWeight?: 'bold' | 'regular' | 'light';    // unset: the template's own weight
      headingWeight?: 'bold' | 'regular';           // unset: the template's own weight
      bulletIndent: number;      // em, how far highlight lists sit in (default 1.05)
      bulletGap: number;         // em, space between two bullets (default 0.2)
      headingGap: number;        // multiplier on the air under a section title (default 1)
      headingRuleWidth?: 1 | 2;  // px, the rule under a section title; unset: the template's own
    };
    layout: {
      columns: 1 | 2;            // single or two-column
      sidebar: 'left' | 'right'; // which side the aside sits on (two-column)
      sidebarWidth: number;      // sidebar width as a fraction, e.g. 0.34
      sectionGap: number;        // vertical gap between sections (pt)
      itemGap: number;           // vertical gap between items (pt)
      icons: boolean;            // show contact/section icons
      sectionIconStyle: 'folio' | 'chip' | 'plain' | 'filled' | 'circle' | 'outline' | 'none'; // section badge (folio = folded-corner paper chip)
      sectionIconSize: 's' | 'm' | 'l'; // section badge size
      showPhoto: boolean;        // render a photo if one is present
      photoShape: 'circle' | 'rounded' | 'square' | 'diamond';
      footer: string[];          // section keys that render in the strip at the foot of the page
      stats: boolean;            // a row of numbers derived from the content under the header
      sectionNumbers: boolean;   // a running number opens every section heading in the body
    };
  };
}
```

### Top-level fields

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Stable, unique identifier. Used in saved resumes — **never reuse or rename** an existing `id`. |
| `name` | `string` | Human-readable name shown in the gallery. Must be unique too — a card shows nothing but this, so two templates sharing a name are two cards a reader cannot tell apart. Unlike `id`, it is free to change: rename the card, keep the `id`. |
| `description` | `string` | One-line pitch shown under the name. |
| `tags` | `string[]` | Searchable/filterable labels (e.g. `'compact'`, `'creative'`, `'sidebar'`). The gallery derives its chips from them, so a new tag gets a chip for free; `'signature'` marks the [Signature collection](#the-signature-collection). |
| `atsSafe` | `boolean` | When `true`, the gallery shows the ATS-safe shield. Only set this if your design keeps a single readable text flow (see [Rules](#rules-and-gotchas)). |
| `class` | `string` | The CSS root class applied to `.rm-root`. By convention, prefix with `tpl-` (e.g. `tpl-aurora`). Every rule in `templates.css` for your template is scoped under this class. |
| `header` | enum | Header layout. One of `standard`, `centered`, `banner`, `split`, `compact`, `display` (the name set huge across the width, contacts as a byline between rules), `block` (the name fills a colour block in tall capitals) `band` (a two-stop gradient band carries the name, with a slot for the stats row) or `stepped` (the name, the role and the contacts on three full-width bands in graded shades of the accent). The author can recompose any header from the canvas (`layout.headerStyle`), so the root carries `hdr-<style>` for whichever is drawn. |
| `section` | enum | Section-title treatment. One of `underline`, `rule-after`, `bar`, `plain`, `boxed`, `side`. |
| `skills` | enum | Skills rendering. One of `inline`, `chips`, `bars`, `dots`, `grouped-chips`. |
| `languageMeter` | `boolean` | Show a proficiency meter on the languages section. |
| `defaults` | object | The starting theme, typography, and layout. Users can override any of these in the editor; your `defaults` are simply where they begin. |

### `defaults.theme`

These map directly onto the `--rm-*` color variables (see the
[variables table](#styling-hooks-the---rm--css-variables)).

| Key | Drives |
| --- | --- |
| `primary` | Accent: headings, rules, chip borders, meters → `--rm-primary` |
| `text` | Body text → `--rm-text` |
| `muted` | Dates and sub-lines → `--rm-muted` |
| `background` | Page background → `--rm-bg` |
| `sidebar` | Sidebar background (two-column) → `--rm-sidebar-bg` |
| `sidebarText` | Sidebar text color → `--rm-sidebar-text` |
| `name` | The name's own colour → `--rm-name-color`, set only when chosen |
| `headline` | The headline's own colour → `--rm-headline-color`, set only when chosen |
| `headings` | Section titles' own colour → `--rm-heading-color`, set only when chosen |
| `contacts` | The contact line's own colour → `--rm-contact-color`, set only when chosen |
| `links` | Link colour (named, inline and URL-line links) → `--rm-link-color`, set only when chosen |
| `gradientTo` | The second stop of the `band` header's gradient → `--rm-gradient-to`; unset, a lighter tint of the accent. A template may read it elsewhere too (Atlas colours its dates and ring arcs with it) |
| `footer` | The footer strip's ground → `--rm-footer-bg`; unset, the text colour. The strip's text is whichever of white and the text colour reads on it (`--rm-on-footer`) |
| `artBand` | `'none'` (default), `'navy-gold'`, `'terracotta'`, `'cobalt'` or `'emerald'`: an image band behind the header (`public/art/bands/`), under a wash of the page colour - the accent's, on a header that has a ground of its own - so the words still read. Any composition can carry one; the header's Style popover and the Design panel both offer the four and the way back to none |

Any rule of yours that colours one of these elements must read its variable first, with your
own colour as the fallback (`color: var(--rm-headline-color, var(--rm-muted))`), or the
editor's per-element colour never reaches your template; a test audits both stylesheets for
this.

### `defaults.typography`

| Key | Drives |
| --- | --- |
| `fontFamily` | Body font → `--rm-font-body` |
| `headingFamily` | Section/heading font → `--rm-font-heading` |
| `nameFamily` | The name at the top → `--rm-font-name` |
| `fontSize` | Base body size **in points** — the unit the schema, the PDF and the Word file all measure it in → `--rm-fs`, which the canvas emits in px (pt × 96/72, times the one-page fit). Every other size on the page is a ratio of it, and the Word export scales every run from this one number — the name, the headline, section titles, entry titles, sub-lines, dates, bullets — with the same ratios the canvas uses, so one slider moves the whole document in all three outputs |
| `lineHeight` | Line-height multiplier → `--rm-lh`; the Word export's line spacing follows it |
| `letterSpacing` | Letter spacing (em) |
| `headingScale` | Multiplier applied to heading sizes |
| `uppercaseHeadings` | UPPERCASE section titles |
| `sectionTitleScale` | Section titles as a multiple of the body size (default 1.06) → `--rm-section-title-size`, and `--rm-section-title-mul` for a template's own ratio; the Word export's heading size follows it |
| `headlineScale` | The headline as a multiple of the body size (default 1.15) → `--rm-headline-mul`; the Word export follows it |
| `contactScale` | The contact line as a multiple of the body size (default 0.95) → `--rm-contact-mul`; the Word export follows it |
| `headingCase` | `'upper'`, `'smallcaps'` or `'none'` (as typed) for section titles; unset, `uppercaseHeadings` decides (on is upper, off leaves the template's own case). Small caps are decoration: the PDF text layer and the Word run keep the words as typed |
| `nameWeight` | `'bold'`, `'regular'` or `'light'` → `--rm-name-weight`; unset keeps the template's own. Word prints bold or not. The panel offers only bold and regular: `'light'` needs a face lighter than 400, and none is bundled, so it draws as regular everywhere |
| `headingWeight` | `'bold'` or `'regular'` for section titles → `--rm-heading-weight`; unset keeps the template's own. Word prints bold or not |
| `bulletIndent` | How far highlight lists sit in (em) → `--rm-bullet-indent`; the Word export's bullet indent follows it |
| `bulletGap` | Space between two bullets (em) → `--rm-bullet-gap`; the Word export's spacing after a bullet follows it |
| `headingGap` | Air under a section title as a multiple of the template's own (default 1, range 0.5-2) → `--rm-heading-gap`; the Word export's spacing after a heading follows it |
| `headingRuleWidth` | `1` or `2` (px) for the rule under a section title → `--rm-heading-rule`; unset keeps the template's own. The Word export's heading border follows it |

> Fonts must be one of the 40+ self-served Google Fonts in the
> [fonts registry](../src/data). If you reference a font that isn't registered, it simply
> won't load — pick from the registry rather than inventing a family name.

### `defaults.layout`

| Key | Drives |
| --- | --- |
| `columns` | `1` = single column, `2` = main + sidebar |
| `sidebar` | `'left'` or `'right'` — which side the aside sits on (two-column only) |
| `sidebarWidth` | Sidebar width as a fraction of the page (e.g. `0.34`) |
| `sectionGap` | Gap between sections (pt, converted to px like the base size) → `--rm-section-gap` |
| `itemGap` | Gap between items within a section (pt, converted the same way) → `--rm-item-gap`; one-line minis (a language, an interest) take a derived fraction of it through `--rm-item-gap-mini` |
| `icons` | Show contact/section icons |
| `contactSeparator` | What sits between inline contacts: `'none'` (spacing only), `'dot'`, `'pipe'`, `'slash'`, `'dash'` → `--rm-contact-sep`; the Word export prints the same glyph |
| `sectionIconStyle` | Section badge: `'folio'` (default, a folded-corner paper chip), `'chip'`, `'plain'`, `'filled'`, `'circle'`, `'outline'`, `'none'`. The author's choice; kept across template switches |
| `sectionIconSize` | Section badge size, `'s'` / `'m'` / `'l'` (also kept across switches) |
| `showPhoto` | Render the photo if one is present in the resume data |
| `photoShape` | `'circle'`, `'rounded'`, `'square'`, or `'diamond'` (a turned monogram badge; a photo keeps square corners) |
| `headerStyle` | The author's own header composition, any of the `header` values above; unset draws the template's. Kept across template switches |
| `footer` | Section keys that leave the body and render in a full-width strip at the foot of the last page, in a compact row form (one line per skill group, one for the languages). The order resolver reads the strip last, so the ATS text and the Word file list those sections last too. A template that ships a strip seats its sections there where the author has moved none; an author's own strip stays across a switch |
| `stats` | `true` draws a row of up to four numbers derived from the content (years of experience, companies, skills, a headline number from a project) under the header - in the `band` header's own slot, or directly under any other header. Decorative text: outlines in the PDF, absent from Word and the ATS text. Stays once chosen; a template that ships it turns it on |
| `sectionNumbers` | `true` opens every section heading in the body with a running two-digit number (`01`, `02`, ...) counted in page order; the strip and the sidebar are never numbered. Decorative text, like the stats. Stays once chosen; a template that ships it turns it on |
| `metaColumn`, `headingPlacement`, `sectionFrame` | The remaining structural axes (`none` / `gutter` / `margin`; `above` / `side`; `none` / `tile`). Accepted by the schema and kept across switches now; drawn by a later batch |
| `sectionSettings[key].skillsStyle` | Per section: how a skills section draws its items. `'chips'`, `'tags'`, `'inline'`, `'grid'`, `'stacked'`, or `'rings'` - a ring per skill with a level (two single-fill svgs, the level as decorative text in the centre, the label as real text beneath; skills without a level follow as chips). `'mosaic'` is accepted and drawn by a later batch. A template may ship one (Atlas ships rings) and it applies where the author set none for that section |
| `sectionSettings[key].showDuration` | Per section, opt-in: end each date range with its length in parentheses (`"2 yrs 3 mos"`, counted in whole months, so both dates need a month). Plain text, so the Word export and the ATS text print the same words |
| `sectionSettings[key].headingAlign` | Per section: `'left'` or `'center'` for the heading → `sec-align-*` on the section; unset keeps the template's own. A centred rule-after heading sits between two rules; the Word export centres the paragraph |
| `sectionSettings[key].entryOrder` | Per section (work, education, volunteer, custom): `'title-first'` (default) or `'org-first'` — which field takes an entry's head line beside the date (the position or degree, or the company, institution or subtitle); the other takes the sub-line, and both stay editable. The Word export and the ATS text list the two in the same order |
| `sectionSettings[key].entryEmphasis` | Per section: `'title'` (default) or `'org'` — which of the two is bold. When it is not the leading field, `sec-emph-sub` on the section swaps the weights of the head and sub-lines (nothing else changes); the Word export bolds the same run |
| `sectionSettings[key].locationPlacement` | Per section (work, education, custom): `'subline'` (default) or `'with-date'` — where an entry's location prints. With-date moves it out of `.rm-item-sub` and into the head row's date slot, which then carries `rm-item-meta`, reading `Austin, TX \| Jan 2019 – Mar 2021`; the separator is real text, so the PDF text layer and the Word export print it too, and the ATS text names the pair in the same order (location first) |
| `sectionSettings[key].keepTogether` | Per section: whether a page break may fall inside one of its entries. Unset follows the document (`page.keepEntriesWhole`, default off), so a section can hold its entries whole on a page that breaks freely and break freely on one that holds. On, the section carries `rm-keep-entries` and the paginator bans every cut inside an entry, leaving the gap between two entries as the break — an entry taller than 60% of a page has no break that clears it and is left alone. The preview overlay reads the same class off the same DOM, so its page boundaries are the export's; the Word file holds each entry's head lines to the body under them |
| `sectionSettings[key].dateAlign` | Per section: `'right'` (default) or `'left'` for the head row's date → `sec-date-*` on the section. Left reorders the flex row (`order`, never a transform) so the date leads its own column and the title follows; the DOM order is unchanged, so the text layer and the ATS view still read the title first. The Word export puts the date ahead of the title on a left tab stop, in a column measured from the widest date the section prints, with a hanging indent so a wrapped title stays beside it |

### `dates` (the document's, not a template default)

How every date on the page reads. Like `links`, the block belongs to the author and survives a template
switch; one shared formatter reads it, so the canvas, the Word export and the ATS text print each date
the same way.

| Key | Drives |
| --- | --- |
| `month` | How the month is spelled: `'short'` (`Jan 2021`, the default), `'long'` (`January 2021`), `'numeric'` (`01/2021`) or `'none'` (`2021`) |
| `separator` | What sits between the two ends of a range: `'emdash'` (default), `'endash'`, `'hyphen'` or `'to'` |
| `present` | The word an open-ended range ends with (default `Present`) |
| `language` | BCP-47 tag for month names and time-span words (default `en`); the PDF declares it as its document language |

### `page` (the document's, not a template default)

Where the paper decides. The block belongs to the author, survives a template switch, and one of its
keys reaches your CSS as a class you can style around.

| Key | Drives |
| --- | --- |
| `keepEntriesWhole` | Whether a page break may fall inside one entry. Default off — the page breaks as it always did. On, every section carries `rm-keep-entries` and no cut lands inside an entry: the whole entry moves to the next page and the gap between two entries becomes the break. A request cannot be granted past the paper, so an entry taller than 60% of the usable page has no cut that clears it and breaks normally. A section can decide for itself with `sectionSettings[key].keepTogether`, which overrides this either way and leaves it as the document's answer where the section has none. The preview overlay reads the same class off the same DOM as the export, so its page boundaries are the PDF's; the Word file holds each entry's head lines to the body under them |

---

## Semantic markup: the `.rm-*` classes

The engine always emits the same semantic structure. You style it; you never generate it.
These are the class names you can target in CSS. They are **stable contracts** — the engine
guarantees them, so style against them freely.

| Class | What it wraps |
| --- | --- |
| `.rm-root` | The artboard root. Your `class` (e.g. `.tpl-aurora`) is applied here too. |
| `.rm-header` | The whole header block (name + headline + contacts). |
| `.rm-name` | The candidate's name. |
| `.rm-headline` | The role/title line under the name. |
| `.rm-contacts` | The contact row/list (email, phone, links, location). |
| `.rm-section` | One section wrapper (Experience, Education, …). |
| `.rm-section-title` | The section heading text. |
| `.rm-section-number` | The running number ahead of the heading's words, with `layout.sectionNumbers`. Carries `.rm-deco`. |
| `.rm-deco` | Decorative text, marked `aria-hidden` and `data-deco="1"`: a section number, a stat, a ring's level. The painter draws it as outlines with no text layer, and Word and the ATS text never carry it. Style it; never put a word a reader needs in it. |
| `.rm-stats` / `.rm-stat` / `.rm-stat-value` / `.rm-stat-label` | The stats row and its tiles, with `layout.stats`. |
| `.rm-rings` / `.rm-ring` / `.rm-ring-track` / `.rm-ring-arc` | The rings skills style: the row, one ring, its track circle and its arc, each svg with one fill. |
| `.rm-footer` / `.rm-footer-row` / `.rm-footer-label` | The footer strip after the columns, a row per group, and the row's label. The root carries `rm-has-footer` when a strip is drawn. |
| `.rm-header-display` / `.rm-header-block` / `.rm-header-band` | The header element under three of the Signature compositions (the root also carries `hdr-display`, `hdr-block`, `hdr-band`). |
| `.rm-header-stepped` / `.rm-step` / `.rm-step-name` / `.rm-step-role` / `.rm-step-contacts` | The stepped header and its three bands (`hdr-stepped` on the root). The second and third shades are `--rm-step-2` and `--rm-step-3`, the accent lightened 14% and 28% unless a template names its own. |
| `.rm-header-art` / `.rm-art-band` / `.rm-art-veil` | A header carrying art (`theme.artBand`): the class on the header, the image itself and the wash over it. Both are the header's first children, because the painter has no z-index - it paints in document order. |
| `.rm-section-icon` | The heading's badge. The root carries `sicon-<style>` and, for S/L, `sicon-size-s` / `sicon-size-l`; the folio style adds `.rm-folio-ink` / `.rm-folio-tint` / `.rm-folio-paper` glyph svgs and two `.rm-folio-fold` svgs inside. |
| `.rm-section-body` | The section's content container. |
| `.rm-item` | A single entry within a section (a job, a degree, …). |
| `.rm-item-title` | The entry's title (company / role / school). |
| `.rm-item-date` | The entry's date range. |
| `.rm-item-sub` | The entry's secondary line (location, sub-title). |
| `.rm-bullets` | The bullet list inside an item. |
| `.rm-chip` | A skill/tag chip (used by the `chips` / `grouped-chips` skill modes). |
| `.rm-named-link` / `.rm-tag-link` | A named link printed as a word: a project's further links and its URL line, a credential's Verify (which also carries `.rm-verify-link`). With `links-tag` on the root (the default) it draws as a small paper tag. |
| `.rm-col-main` | The main column (two-column layouts). |
| `.rm-col-aside` | The sidebar column (two-column layouts). |

A simplified picture of the rendered tree:

```html
<div class="rm-root tpl-aurora">
  <header class="rm-header">
    <h1 class="rm-name">Ada Lovelace</h1>
    <p class="rm-headline">Software Engineer</p>
    <ul class="rm-contacts">…</ul>
  </header>

  <div class="rm-col-main">            <!-- two-column only -->
    <section class="rm-section">
      <h2 class="rm-section-title">Experience</h2>
      <div class="rm-section-body">
        <div class="rm-item">
          <div class="rm-item-title">Senior Engineer · Analytical Engines Ltd</div>
          <div class="rm-item-date">2021 — Present</div>
          <div class="rm-item-sub">London, UK</div>
          <ul class="rm-bullets">
            <li>Cut build times 40% by …</li>
          </ul>
        </div>
      </div>
    </section>
  </div>

  <aside class="rm-col-aside">         <!-- two-column only -->
    <section class="rm-section">
      <h2 class="rm-section-title">Skills</h2>
      <div class="rm-section-body">
        <span class="rm-chip">TypeScript</span>
        <span class="rm-chip">React</span>
      </div>
    </section>
  </aside>
</div>
```

---

## Styling hooks: the `--rm-*` CSS variables

The engine computes these CSS custom properties from your `defaults` (and from any user
overrides) and sets them on `.rm-root`. **Read them in your CSS** instead of hardcoding
values — that way the editor's live theme/typography/spacing controls keep working with
your template.

| Variable | Source | Use for |
| --- | --- | --- |
| `--rm-fs` | `typography.fontSize` | Base font size |
| `--rm-lh` | `typography.lineHeight` | Line height |
| `--rm-primary` | `theme.primary` | Accent color (rules, chips, meters) |
| `--rm-text` | `theme.text` | Body text color |
| `--rm-muted` | `theme.muted` | Secondary text (dates, sub-lines) |
| `--rm-bg` | `theme.background` | Page background |
| `--rm-sidebar-bg` | `theme.sidebar` | Sidebar background |
| `--rm-sidebar-text` | `theme.sidebarText` | Sidebar text color |
| `--rm-font-body` | `typography.fontFamily` | Body font family |
| `--rm-font-heading` | `typography.headingFamily` | Heading font family |
| `--rm-font-name` | `typography.nameFamily` | Name font family |
| `--rm-section-gap` | `layout.sectionGap` | Vertical gap between sections |
| `--rm-item-gap` | `layout.itemGap` | Vertical gap between items |
| `--rm-bullet-indent` | `typography.bulletIndent` | Indent of highlight lists (the room the marker hangs in) |
| `--rm-bullet-gap` | `typography.bulletGap` | Vertical gap between bullets |
| `--rm-section-title-size` | `typography.sectionTitleScale` | Section title size (body size times the scale) |
| `--rm-section-title-mul` | `typography.sectionTitleScale` | The scale over its stock 1.06, multiplied into a template's own title ratio |
| `--rm-headline-mul` | `typography.headlineScale` | The scale over its stock 1.15, multiplied into the headline size |
| `--rm-contact-mul` | `typography.contactScale` | The scale over its stock 0.95, multiplied into the contact line size |
| `--rm-name-weight` | `typography.nameWeight` | Name weight, set only when chosen |
| `--rm-heading-weight` | `typography.headingWeight` | Section title weight, set only when chosen |
| `--rm-heading-gap` | `typography.headingGap` | Multiplier on the air under a section title; read it as `calc(<yours> * var(--rm-heading-gap, 1))` |
| `--rm-heading-rule` | `typography.headingRuleWidth` | Width of the rule under a section title, set only when chosen; read it as `var(--rm-heading-rule, <yours>)` |
| `--rm-name-color` | `theme.name` | The name's colour, set only when chosen; read it as `var(--rm-name-color, <yours>)` |
| `--rm-headline-color` | `theme.headline` | The headline's colour, set only when chosen |
| `--rm-heading-color` | `theme.headings` | Section titles' colour, set only when chosen (sidebar titles keep the sidebar text) |
| `--rm-contact-color` | `theme.contacts` | The contact line's colour, set only when chosen; linked contacts follow it |
| `--rm-link-color` | `theme.links` | Link colour, set only when chosen; titles and headings keep their own even when linked |
| `--rm-gradient-to` | `theme.gradientTo` | The band header's second stop; a lighter tint of the accent when unset |
| `--rm-on-primary` | derived | The text colour that reads on the accent (the block and band headers set their text in it) |
| `--rm-footer-bg` / `--rm-on-footer` | `theme.footer` | The footer strip's ground (set only when chosen; the stylesheet falls back to the text colour) and the text colour that reads on it |
| `--rm-pad` | layout padding | Page/inner padding |

Example of reading them:

```css
.tpl-aurora .rm-section-title {
  color: var(--rm-primary);
  font-family: var(--rm-font-heading);
  border-bottom: 2px solid var(--rm-primary);
}
```

---

## The Signature collection

The Signature templates (tag `signature`) are each built on one structural primitive of
the shared engine, and every one keeps to one column: a parser sorts text by height, and
anything at the same height in two columns is read as one interleaved line, so the
invention lives in the masthead, the strip and the numerals, none of which ever shares a
line with content. Every word a reader needs is real text in DOM order; everything else
(a running number, a stat, a ring's level) is decorative text that never reaches the PDF
text layer, the Word file or the ATS text.

| Template | Built on |
| --- | --- |
| `broadsheet` | The `display` header and `sectionNumbers` |
| `marquee` | The `block` header and a `footer` strip for skills and languages |
| `atlas` | The `band` header with `gradientTo`, `stats`, and `skillsStyle: 'rings'` on the skills section |

Each primitive is a layout or theme field, so any template can carry it: an author can
number the sections of Clarity, or move Broadsheet's languages into a strip, from the
canvas or the Design panel. A Signature template's own structure lights up when it is
picked and the author has decided nothing on that axis; the author's own choice stays
across a switch.

---

## Worked example: building the "Aurora" template

Let's add a clean, modern, two-column template called **Aurora** — a left sidebar with a
soft accent, chip-style skills, and underlined section titles.

### Step 1 — Register the config

Open [`src/templates/registry.ts`](../src/templates/registry.ts) and add a new entry to
the array of templates:

```ts
{
  id: 'aurora',
  name: 'Aurora',
  description: 'Modern two-column layout with a soft sidebar and tidy chips.',
  tags: ['two-column', 'modern', 'sidebar'],
  atsSafe: true,
  class: 'tpl-aurora',

  header: 'split',
  section: 'underline',
  skills: 'chips',
  languageMeter: true,

  defaults: {
    theme: {
      primary: '#4f46e5',      // indigo accent
      text: '#1f2937',
      muted: '#6b7280',
      background: '#ffffff',
      sidebar: '#f4f4ff',      // very light indigo
      sidebarText: '#1f2937',
    },
    typography: {
      fontFamily: 'Inter',
      headingFamily: 'Inter',
      nameFamily: 'Sora',
      fontSize: 10.5,
      lineHeight: 1.4,
      letterSpacing: 0,
      headingScale: 1.15,
      uppercaseHeadings: true,
    },
    layout: {
      columns: 2,
      sidebar: 'left',
      sidebarWidth: 0.34,
      sectionGap: 16,
      itemGap: 10,
      icons: true,
      showPhoto: true,
      photoShape: 'circle',
    },
  },
},
```

That's it for the data. The engine already knows how to render a `split` header, a
two-column `left` sidebar, `underline` section titles, and `chips` skills. Aurora will now
appear in the gallery.

### Step 2 — Add a scoped CSS block

The defaults above already produce a complete, presentable template. CSS is only for the
finishing touches that make Aurora feel distinct. Add a small block to
[`src/templates/templates.css`](../src/templates/templates.css), scoped under `.tpl-aurora`:

```css
/* === Aurora ============================================================== */

.tpl-aurora .rm-name {
  font-family: var(--rm-font-name);
  letter-spacing: 0.02em;
}

/* Underlined section titles in the accent color */
.tpl-aurora .rm-section-title {
  color: var(--rm-primary);
  font-family: var(--rm-font-heading);
  border-bottom: 2px solid var(--rm-primary);
  padding-bottom: 2px;
}

/* Soft pill chips that echo the accent */
.tpl-aurora .rm-chip {
  border: 1px solid var(--rm-primary);
  color: var(--rm-primary);
  border-radius: 999px;
  padding: 1px 8px;
  background: transparent;
}

/* Give the sidebar a little breathing room */
.tpl-aurora .rm-col-aside {
  background: var(--rm-sidebar-bg);
  color: var(--rm-sidebar-text);
  padding: var(--rm-pad);
}

/* Dates sit quietly in the muted tone */
.tpl-aurora .rm-item-date {
  color: var(--rm-muted);
  font-variant-numeric: tabular-nums;
}
```

Notice that **every** rule:

- is scoped under `.tpl-aurora`,
- targets only existing `.rm-*` classes, and
- reads `--rm-*` variables instead of hardcoding colors/sizes.

This is what keeps Aurora compatible with the live editor controls and with the print
pipeline.

### Step 3 — Test it in the gallery

```bash
npm run dev      # http://localhost:5173
```

Then:

1. Open a resume in the editor and switch to the **Aurora** template in the template gallery.
2. Confirm the live preview looks right on both A4 and US-Letter, and across the page-break
   guides (test with enough content to spill onto a second page).
3. Toggle the editor's theme/typography/spacing controls — Aurora should respond because it
   reads the `--rm-*` variables.
4. Use **Save as PDF** from the print route and confirm the text is **selectable** (try
   selecting and copying a bullet) and that the PDF is pixel-identical to the preview.
5. Run a quick typecheck/build:
   ```bash
   npm run typecheck
   npm run build
   ```

A screenshot of Aurora in the gallery (placeholder — image not included in the repo):

![Aurora template in the gallery](screenshots/template-aurora.png)
*Placeholder path — `docs/screenshots/template-aurora.png` is not a real file yet.*

---

## Rules and gotchas

Follow these and your template will be a good citizen — ATS-friendly, print-correct, and
maintainable.

1. **Keep it ATS-safe and print-safe.** Maintain a single, readable text flow. Real,
   selectable text only — **never** put text inside an image, a background, or a
   pseudo-element. If your design can't guarantee a clean text flow, set `atsSafe: false`
   so the gallery doesn't show the shield.
2. **Only use existing `.rm-*` classes.** Do not invent new class names or expect new
   markup — the engine emits a fixed structure. If you find yourself needing markup that
   doesn't exist, that's an engine change, not a template change.
3. **Only read `--rm-*` variables for theme/typography/spacing.** Avoid hardcoding colors,
   fonts, and gaps. Hardcoded values break the editor's live controls and can look wrong in
   dark mode. Reach for the variables in the
   [variables table](#styling-hooks-the---rm--css-variables).
4. **Scope every rule under your `class`.** Prefix all selectors with `.tpl-yourtheme` so
   you never leak styles into other templates.
5. **Never rename or reuse an `id`.** The `id` is persisted inside users' saved resumes.
   Changing it orphans their template choice.
6. **Pick fonts from the registry.** Only the self-served Google Fonts in the
   [fonts registry](../src/data) are guaranteed to load.
7. **Test in the live gallery before you ship.** Check A4 **and** US-Letter, multi-page
   flow with the page-break guides, the editor's theme/typography toggles, and a real
   **Save as PDF** with selectable text. Then run `npm run typecheck` and `npm run build`.

That's the whole workflow: add data, add a little scoped CSS, test. Welcome to the studio.
