# salt-spray-web

Clean rebuild of the Salt & Spray website (Painting & Faux Finishes, Dana Point CA).
Same visual design as saltandspray.com, rebuilt from fresh semantic HTML5, organized
vanilla CSS/JS — no frameworks, no build step.

## Structure

- `index.html` — Home / Services / Estimate panels, About + Portfolio overlays
- `privacy-policy.html` — Privacy policy
- `css/styles.css` — All styles (design tokens in `:root`)
- `js/app.js` — Navigation, overlays + focus trap, estimate form, before/after rails
- `assets/images/` — Logo, compressed hero backgrounds, before/after photo sets
- `robots.txt`, `sitemap.xml`

## Notes

- Portfolio is before/after only: Wood Restoration (6), Painting (27), Faux Finishes (1).
- The 10 portfolio MP4s were intentionally left out — they were disabled on the
  original site for mobile performance. Re-add under `assets/videos/` if needed.
- The estimate form composes an SMS to (949) 593-9085. Project photos are picked
  on-site; the client attaches them in Messages before sending (SMS can't carry
  attachments). For automatic email-with-photos delivery, wire a form backend
  (e.g. Web3Forms) — needs the business owner's API key.
- Canonical URLs point at https://saltandspray.com/ so the domain can be
  connected later without content changes.

## Local preview

Open `index.html` directly in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Hosting
Production deploys from `main` via Cloudflare Workers Static Assets (connected repo). Pushing to `main` triggers a deploy; `saltandspray.com` points at the Cloudflare worker.
