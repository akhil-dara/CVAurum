# Deploying CVAurum (free, no backend)

CVAurum is a fully static, client-side app — there is **no server to run**. That
means you can host it for **$0** on any static host. `npm run build` produces a
`dist/` folder; serve that folder anywhere.

## Recommended: Cloudflare (free, fast, custom domain)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Connect to Git** → pick this repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. You get a free `https://<project>.workers.dev` (or `.pages.dev`) URL.
5. (Optional) Add a custom domain in the project settings (~$8–12/yr for the
   domain itself; the hosting stays free).

[`wrangler.jsonc`](wrangler.jsonc) declares `dist/` as static assets and sets
`not_found_handling: "single-page-application"`, so SPA deep links (`/resume/:id`,
`/print/:id`) serve `index.html`. Security headers (CSP, etc.) come from
[`public/_headers`](public/_headers).

## Other static hosts

These don't read `wrangler.jsonc`, so add a `public/_redirects` containing
`/* /index.html 200` for SPA routing first:

- **Cloudflare Pages** — create a **Pages** project (instead of the Worker above);
  it honors `public/_headers` and `public/_redirects` natively.
- **Netlify** — drag-and-drop `dist/` or connect Git. Free tier.
- **Vercel** — import the repo; framework preset **Vite**. Free tier.
- **GitHub Pages** — served from a subpath (`/<repo>/`). Set `base: '/<repo>/'`
  in `vite.config.ts`, build, publish `dist/`, and add a `404.html` copy of
  `index.html` for SPA routing.

## Notes

- Fonts are bundled (self-hosted under `public/fonts/`) — the app fetches **nothing** from any external server. (Regenerate with `node scripts/fetch-fonts.cjs` if the font registry changes.)
- No environment variables or secrets are required to deploy.
- Users' resume data lives in **their** browser (IndexedDB) — you never store it.
