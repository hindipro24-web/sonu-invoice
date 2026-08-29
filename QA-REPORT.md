# Smart Parts Billing Classic — QA Report

## Automated checks
- JavaScript syntax: PASS (`app.js`, `data.js`)
- Manifest JSON parse: PASS
- Parts master count: PASS — 65 records
- Part records required fields/rates: PASS
- PDF table implementation: PASS — RATE and AMOUNT use fixed right-edge coordinates
- PDF generation: client-side, no external CDN/API dependency
- Android share path: Web Share API sends an actual PDF `File` where supported
- Fallback share path: downloads PDF for manual WhatsApp attachment
- Invoice history/search: localStorage
- Business settings: localStorage
- Offline/PWA files: manifest + service worker included
- Responsive CSS breakpoints: desktop/tablet/mobile included

## Deployment
Static files only. GitHub Pages can serve the root directory directly.

## Important data behavior
Invoices are saved in the browser/device, not a cloud database. Use **Bills → Export backup** to keep a JSON backup.
