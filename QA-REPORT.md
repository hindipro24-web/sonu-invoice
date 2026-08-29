# Smart Parts Billing — Professional Client Suite V3 QA

## Code checks completed
- JavaScript syntax: PASS (`node --check app.js`)
- HTML parser check: PASS
- Duplicate HTML IDs: none
- Required local asset references: PASS (`manifest.json`, `styles.css`, `data.js`, `app.js`)
- CSS brace balance: PASS
- Settings Save buttons remain wired to the real `saveSettings()` persistence flow
- Logo upload/remove remains wired to local persistence
- Existing invoice save/update/delete, draft, parts, customers, PDF, backup/import logic retained

## V3 UI improvements
- Base typography raised to 16px with larger headings and readable labels
- Form inputs/selects increased to 48–50px touch height
- Primary/secondary buttons normalized to 46px+ height
- Reworked executive navy/white B2B SaaS visual system
- Dashboard hero simplified into an operational control-center layout
- Stronger visual hierarchy for totals, cards, tables and invoice summary
- Settings includes top Save + sticky bottom Save bar with saved/unsaved state
- Mobile bottom navigation retained and enlarged
- Responsive overrides included for 1200 / 980 / 760 / 430 / 360px breakpoints
- Service worker updated to V3 and changed to network-first for HTML/CSS/JS to reduce stale deployments

## Deployment note
Upload the ZIP contents directly into the GitHub Pages repository root. This ZIP is intentionally flat at the root to avoid nested-folder deployment mistakes.
