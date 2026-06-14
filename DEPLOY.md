# Deploying CVAurum (free, no backend)

CVAurum is a fully static, client-side app — there is **no server to run**. That
means you can host it for **$0** on any static host. `npm run build` produces a
`dist/` folder; serve that folder anywhere.

## Recommended: Cloudflare Pages (free, fast, custom domain)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. You get a free `https://<project>.pages.dev` URL.
5. (Optional) Add a custom domain in the Pages project settings (~$8–12/yr for the
   domain itself; the hosting stays free).

SPA routing (deep links like `/resume/:id` and `/print/:id`) works because
[`public/_redirects`](public/_redirects) rewrites all paths to `index.html`.

## Alternatives

- **Netlify** — same as above (`_redirects` is already included). Drag-and-drop
  the `dist/` folder or connect Git. Free tier.
- **Vercel** — import the repo; framework preset **Vite**. Free tier.
- **GitHub Pages** — free, but served from a subpath (`/<repo>/`). Set
  `base: '/<repo>/'` in `vite.config.ts`, build, and publish `dist/` (e.g. via the
  `gh-pages` package or a GitHub Action). Add a `404.html` copy of `index.html`
  for SPA routing.

## Notes

- Fonts are bundled (self-hosted under `public/fonts/`) — the app fetches **nothing** from any external server. (Regenerate with `node scripts/fetch-fonts.cjs` if the font registry changes.)
- No environment variables or secrets are required to deploy.
- Users' resume data lives in **their** browser (IndexedDB) — you never store it.
