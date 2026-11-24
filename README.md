# 週線研究室｜台股 CNN 候選標的

Static GitHub Pages version of the weekly Taiwan CNN candidates dashboard.

- `public/data/runs/*.json` — one published snapshot per run (same content the former `/api/runs?id=` served).
- `public/data/weeks.json` — run index, newest first (former `/api/weeks`).
- Weekly data is committed by `Reimage_price_trends/publish_weekly_site.py` on the model machine.
- Every push runs `npm run validate` (zod snapshot schema), `npm test` and `npm run build`;
  only a passing build is deployed, so a bad snapshot never replaces the live site.

Local: `npm ci && npm run dev`.
