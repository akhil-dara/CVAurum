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
- [Semantic markup: the `.rm-*` classes](#semantic-markup-the-rm--classes)
- [Styling hooks: the `--rm-*` CSS variables](#styling-hooks-the---rm--css-variables)
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
  tags: string[];        // free-form labels, e.g. ['two-column', 'modern']
  atsSafe: boolean;      // true => shows the ATS-safe shield in the gallery
  class: string;         // scoped CSS root class, e.g. 'tpl-aurora'

  header: 'standard' | 'centered' | 'banner' | 'split' | 'compact';
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
    };
    typography: {
      fontFamily: string;        // body font, e.g. 'Inter'
      headingFamily: string;     // section/heading font
      nameFamily: string;        // the name at the top of the resume
      fontSize: number;          // base body size in px
      lineHeight: number;        // unitless multiplier, e.g. 1.4
      letterSpacing: number;     // em, e.g. 0 or 0.01
      headingScale: number;      // multiplier applied to heading sizes
      uppercaseHeadings: boolean;// UPPERCASE section titles
    };
    layout: {
      columns: 1 | 2;            // single or two-column
      sidebar: 'left' | 'right'; // which side the aside sits on (two-column)
      sidebarWidth: number;      // sidebar width as a fraction, e.g. 0.34
      sectionGap: number;        // vertical gap between sections (px)
      itemGap: number;           // vertical gap between items (px)
      icons: boolean;            // show contact/section icons
      showPhoto: boolean;        // render a photo if one is present
      photoShape: 'circle' | 'rounded' | 'square';
    };
  };
}
```

### Top-level fields

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Stable, unique identifier. Used in saved resumes — **never reuse or rename** an existing `id`. |
| `name` | `string` | Human-readable name shown in the gallery. |
| `description` | `string` | One-line pitch shown under the name. |
| `tags` | `string[]` | Searchable/filterable labels (e.g. `'compact'`, `'creative'`, `'sidebar'`). |
| `atsSafe` | `boolean` | When `true`, the gallery shows the ATS-safe shield. Only set this if your design keeps a single readable text flow (see [Rules](#rules-and-gotchas)). |
| `class` | `string` | The CSS root class applied to `.rm-root`. By convention, prefix with `tpl-` (e.g. `tpl-aurora`). Every rule in `templates.css` for your template is scoped under this class. |
| `header` | enum | Header layout. One of `standard`, `centered`, `banner`, `split`, `compact`. |
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

### `defaults.typography`

| Key | Drives |
| --- | --- |
| `fontFamily` | Body font → `--rm-font-body` |
| `headingFamily` | Section/heading font → `--rm-font-heading` |
| `nameFamily` | The name at the top → `--rm-font-name` |
| `fontSize` | Base body size (px) → `--rm-fs` |
| `lineHeight` | Line-height multiplier → `--rm-lh` |
| `letterSpacing` | Letter spacing (em) |
| `headingScale` | Multiplier applied to heading sizes |
| `uppercaseHeadings` | UPPERCASE section titles |

> Fonts must be one of the 40+ self-served Google Fonts in the
> [fonts registry](../src/data). If you reference a font that isn't registered, it simply
> won't load — pick from the registry rather than inventing a family name.

### `defaults.layout`

| Key | Drives |
| --- | --- |
| `columns` | `1` = single column, `2` = main + sidebar |
| `sidebar` | `'left'` or `'right'` — which side the aside sits on (two-column only) |
| `sidebarWidth` | Sidebar width as a fraction of the page (e.g. `0.34`) |
| `sectionGap` | Gap between sections (px) → `--rm-section-gap` |
| `itemGap` | Gap between items within a section (px) → `--rm-item-gap` |
| `icons` | Show contact/section icons |
| `showPhoto` | Render the photo if one is present in the resume data |
| `photoShape` | `'circle'`, `'rounded'`, or `'square'` |

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
| `.rm-section-body` | The section's content container. |
| `.rm-item` | A single entry within a section (a job, a degree, …). |
| `.rm-item-title` | The entry's title (company / role / school). |
| `.rm-item-date` | The entry's date range. |
| `.rm-item-sub` | The entry's secondary line (location, sub-title). |
| `.rm-bullets` | The bullet list inside an item. |
| `.rm-chip` | A skill/tag chip (used by the `chips` / `grouped-chips` skill modes). |
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
