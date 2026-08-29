# Smart Parts Billing — Future UI QA

## Automated checks
- JavaScript syntax: PASS
- Duplicate HTML IDs: PASS
- Invoice create/save flow: PASS
- Parts search: PASS
- Quantity + interaction: PASS
- Saved invoice history: PASS
- 320px viewport: PASS — no page-level horizontal overflow
- 360px viewport: PASS — no page-level horizontal overflow
- 390px viewport: PASS — no page-level horizontal overflow
- 768px viewport: PASS — no page-level horizontal overflow
- 1024px viewport: PASS — no page-level horizontal overflow
- 1440px viewport: PASS — no page-level horizontal overflow
- Dashboard / Invoice / Invoices / Customers / Parts / Settings layouts tested at all widths above
- Mobile invoice/history tables convert to card layout to avoid screen overlap
- Service worker cache version bumped for redesign deployment

## Billing/PDF safeguards retained
- RATE and AMOUNT use separate fixed numeric positions in generated A4 PDF
- Numeric PDF columns are right-aligned
- Business logo can be uploaded from Settings and appears in app/PDF

## Architecture
- Static HTML/CSS/JS
- Local browser storage only
- No automation/webhooks
- No backend credentials
