# Contributing to CVAurum

First off — thank you! :tada: CVAurum is **the open-source resume studio**, and it gets better every time someone fixes a typo, polishes a template, files a thoughtful bug report, or ships a brand-new feature. Whether this is your first open-source contribution or your thousandth, you're welcome here.

This guide will get you set up and productive fast. If anything is unclear or out of date, that itself is a great first contribution — open an issue or a PR.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Ways to contribute](#ways-to-contribute)
- [:trophy: The easiest way to contribute: add a template](#trophy-the-easiest-way-to-contribute-add-a-template)
- [Development setup](#development-setup)
- [Project structure orientation](#project-structure-orientation)
- [Coding conventions](#coding-conventions)
- [Before you open a PR](#before-you-open-a-pr)
- [Commit & PR guidelines](#commit--pr-guidelines)
- [Reporting bugs & requesting features](#reporting-bugs--requesting-features)
- [A note on privacy](#a-note-on-privacy)
- [License](#license)

---

## Code of conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you're expected to uphold it — be kind, be patient, assume good faith. Please read [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) before contributing, and report unacceptable behavior through the channel described there.

The short version: **treat others the way you'd want to be treated in a code review on a bad day.**

---

## Ways to contribute

You don't have to write code to make a difference. All of these are genuinely valuable:

- :art: **Add or refine a template** — the single highest-impact, lowest-friction contribution (see below).
- :bug: **Report bugs** with clear reproduction steps.
- :bulb: **Suggest features** that fit CVAurum's local-first, zero-backend philosophy.
- :memo: **Improve docs** — this file, the README, [`docs/TEMPLATES.md`](./docs/TEMPLATES.md), or inline comments.
- :test_tube: **Triage issues** — reproduce, clarify, and label.
- :globe_with_meridians: **Help with accessibility and ATS-safety** — these are core to the project's mission.

---

## :trophy: The easiest way to contribute: add a template

**Adding a template is the best on-ramp to the codebase.** CVAurum ships with **38 premium, data-driven templates**, and there is always room for more.

Why it's the perfect first contribution:

- Templates are **pure, data-driven rendering** — they read from the resume model and lay it out. No backend, no state plumbing, no migrations.
- You touch a small, well-isolated surface area: the rendering engine in `src/templates/` plus a config entry in `src/templates/registry.ts` and styling in `src/templates/templates.css`.
- You get an instant feedback loop — the live WYSIWYG preview updates as you build.
- It's high-impact: every new template helps every CVAurum user.

:point_right: **Start here:** [`docs/TEMPLATES.md`](./docs/TEMPLATES.md) walks you through the template anatomy, the shared `Artboard` and section renderers under `src/templates/_shared/`, how to register your template in `registry.ts`, how to style it in `templates.css`, and how to flag it as ATS-safe (the shield) when it uses a simple, single-column, parseable layout.

A few things to keep in mind while you build:

- Templates render to a **selectable, ATS-parseable PDF** via the browser's native print, not a rasterized image. Keep text as real text — avoid baking content into images or pseudo-elements.
- Respect the user's **typography and color controls** (body/heading/name fonts, sizes, line-height, letter-spacing, accent colors, spacing, margins). Read from the design tokens rather than hard-coding values where possible.
- Support **A4 and US-Letter** page sizes and **multi-page** flow with sane page breaks.
- If the layout is clean and single-column-friendly, mark it **ATS-safe** so it earns the shield.

---

## Development setup

CVAurum's whole pitch is that there is **no backend** — no Docker, no Postgres, no Redis, no Chromium. `npm install && npm run dev` is the entire setup. :sparkles:

### Prerequisites

- **Node.js >= 18.18** (check with `node -v`)
- **npm** (ships with Node)

### Get the code running

1. **Fork** the repository on GitHub and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/cvaurum.git
   cd cvaurum
   ```

2. **Add the upstream remote** so you can keep your fork in sync:

   ```bash
   git remote add upstream https://github.com/akhil-dara/cvaurum.git
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Vite will serve the app at **http://localhost:5173**. Open it, and you're in the editor.

That's it — everything runs in your browser, and your resume data lives in **IndexedDB**. The app works **fully offline** and makes **zero external requests** — all fonts are bundled (self-hosted in `public/fonts/`), so nothing is ever fetched from a third-party server.

### Available scripts

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite dev server on http://localhost:5173 |
| `npm run build` | Typecheck **and** produce a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | `tsc --noEmit` — type-check without emitting |
| `npm run format` | Run Prettier across the codebase |

---

## Project structure orientation

Everything lives under `src/`. Here's the lay of the land so you know where to look:

```
src/
├── types/        JSON Resume schema + CVAurum metadata, modeled with Zod
├── data/         fonts registry, sample resume, app defaults
├── store/        Zustand stores — resume (with undo/redo), app/settings, editor UI
├── lib/          core logic, no React:
│                 ├── ats.ts       deterministic ATS analysis engine
│                 ├── io.ts        JSON Resume import / export
│                 ├── backup.ts    full backup / restore (all data, one file)
│                 ├── docx.ts      Word (.docx) export
│                 ├── pdf.ts / pdfRaster.ts  PDF export (print + one-click)
│                 ├── image.ts     photo crop / downscale helpers
│                 ├── storage.ts   IndexedDB persistence (idb-keyval)
│                 ├── sections.ts  section model helpers
│                 └── utils.ts     misc helpers
├── templates/    the rendering engine:
│                 ├── _shared/        Artboard + section renderers
│                 ├── registry.ts     template configs (register new templates here)
│                 ├── templates.css   per-template styling
│                 └── TemplateRenderer
├── components/   UI:
│                 ├── editor/   panels, field editors, drag-and-drop
│                 ├── preview/  the live WYSIWYG preview
│                 └── ui/        shared primitives (buttons, inputs, cards)
├── routes/       Dashboard, EditorRoute, PrintPage
└── styles/       artboard.css (resume base styles), print.css
```

**The data contract:** CVAurum speaks the [JSON Resume schema](https://jsonresume.org/schema), with CVAurum-specific visual metadata namespaced under `meta.cvaurum`. This keeps exports round-tripping cleanly with the wider JSON Resume ecosystem. When you change the resume model, change it in `src/types/` (Zod) so imports stay safely validated.

**Where things tend to live:**

- New **template**? → `src/templates/` + `registry.ts` + `templates.css` (see [`docs/TEMPLATES.md`](./docs/TEMPLATES.md)).
- New **editor field or panel**? → `src/components/editor/`.
- New **ATS check**? → `src/lib/ats.ts` (keep it deterministic — no LLM, no network).
- New **state**? → the relevant store in `src/store/`.

---

## Coding conventions

We keep the bar high but the rules simple.

### TypeScript

- **TypeScript strict mode is on.** Don't reach for `any` to silence the compiler — model the types properly. If you're stuck, ask in the PR; a good type is worth the conversation.
- Validate anything that crosses a trust boundary (imported files, AI responses) with **Zod**, consistent with `src/types/`.

### Formatting

- **Prettier is the source of truth** for formatting. Run `npm run format` before committing — don't hand-format or argue with the tool.
- Don't mix unrelated formatting churn into a feature PR; it makes review harder.

### Styling & UI

- **Prefer the existing utility classes.** Reach for `.btn`, `.input`, and `.card` (and the other shared primitives in `src/components/ui/`) before writing new CSS. This keeps the design system consistent and dark-mode-aware out of the box.
- Use the **Tailwind design tokens** for colors, spacing, and typography rather than hard-coded values. Respect light/dark/system theming.
- Resume-surface styling belongs in `src/styles/artboard.css`, `src/styles/print.css`, or `src/templates/templates.css` — not scattered inline.

### Components

- **Keep components small and focused.** A component should do one thing. If a file is growing arms and legs, split it.
- Keep **logic out of components** where you can — push it into `src/lib/` (pure, testable, React-free) or the appropriate Zustand store.
- Reuse the editor's drag-and-drop, animation, and rich-text building blocks (dnd-kit, Framer Motion, TipTap) rather than introducing parallel solutions.

### Philosophy guardrails

Before adding a dependency or feature, sanity-check it against CVAurum's identity:

- :no_entry_sign: **No backend.** Nothing that requires a server, database, or build-time secret.
- :lock: **Privacy first.** No analytics, no tracking, no cookies, no phoning home. Data stays in the user's browser.
- :feather: **Stay light.** New runtime dependencies need a good reason. The whole point is `npm install && npm run dev`.

---

## Before you open a PR

Please run these locally and make sure they're green:

```bash
npm run format     # apply Prettier
npm run typecheck  # tsc --noEmit must pass
npm run build      # typecheck + production build to dist/
```

If `npm run build` succeeds, you've cleared the most important gate — it both type-checks and verifies the production bundle compiles. For UI and template changes, also **eyeball the result**: check the live preview, the print route / PDF export, and both light and dark themes.

---

## Commit & PR guidelines

### Branching

- Work on a **feature branch** off your fork's default branch — never commit directly to `main`.
- Use a descriptive branch name, e.g. `template/aurora`, `fix/ats-heading-detection`, `docs/contributing`.

### Commits

- Write **clear, present-tense commit messages** that explain *why*, not just *what*.
- We encourage (but don't strictly require) [Conventional Commits](https://www.conventionalcommits.org/) style:

  ```
  feat(templates): add Aurora template
  fix(ats): correct quantified-bullet detection for ranges
  docs: clarify offline behavior in README
  ```

- Keep commits focused. Small, logical commits are easier to review and revert.

### Pull requests

1. **Sync with upstream** before opening your PR:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Open the PR against the upstream default branch** and fill out the template. A great PR description includes:
   - **What** changed and **why**.
   - **Screenshots or a short clip** for any visual change (templates, editor, preview). Reference them as needed — placeholder assets live under paths like `docs/screenshots/editor.png` *(placeholder path — replace with your actual screenshot)*.
   - **How you tested it** (typecheck/build, manual steps, PDF export checked, themes verified).
   - **Linked issues** (`Closes #123`) where applicable.

3. **Keep PRs scoped.** One focused change per PR. If you found three unrelated things to fix, that's three PRs — your reviewers will thank you.

4. **Be responsive to review.** We aim to be kind and constructive; we ask the same in return. It's normal for a PR to go a round or two before merging.

> :bulb: For anything large or architectural, **open an issue to discuss first**. It saves everyone time and helps make sure your effort lands.

---

## Reporting bugs & requesting features

- **Search existing issues first** to avoid duplicates.
- For **bugs**, include: what you did, what you expected, what happened, your browser and OS, and a minimal reproduction. Since data lives in IndexedDB, note whether clearing site data changes the behavior.
- For **features**, describe the problem you're trying to solve and how it fits CVAurum's local-first, zero-backend, privacy-first philosophy.

Use the issue templates where available — they prompt for exactly what we need.

---

## A note on privacy

CVAurum is **100% local, private, and free** — no account, no server, no tracking. When you contribute, please uphold that promise:

- Don't add analytics, telemetry, or third-party trackers.
- Don't introduce server round-trips or external requests. The app currently makes **zero outbound calls** — fonts are bundled and all data stays in the browser. Keep it that way; if you add a feature that needs the network, it must be off by default and clearly disclosed.

If a change would weaken these guarantees, it's almost certainly not the right change for CVAurum.

---

## License

By contributing to CVAurum, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

---

Thanks again for being here. Now go build something great — and if you're not sure where to start, [add a template](#trophy-the-easiest-way-to-contribute-add-a-template). :rocket:
