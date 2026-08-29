# V4 Ultra QA / Release Notes

## Architecture checks
- React component app structure: PASS
- Vite base configured for `/sonu-invoice/`: PASS
- GitHub Pages workflow included: PASS
- No service worker cache: intentional, prevents stale old UI after redeploy
- LocalStorage persistence: settings / invoices / parts / draft / backup

## Responsive design targets
CSS contains dedicated layouts for:
- 320–420px phones
- 421–700px phones
- 701–980px tablets
- 981–1220px small desktop/tablet landscape
- 1220px+ desktop

Defensive layout rules include `min-width: 0`, stacked mobile invoice items, card-style mobile tables, collapsing sidebar and bottom navigation.

## PDF checks by implementation
- A4 layout
- Fixed Qty / Rate / Amount widths
- Qty / Rate / Amount right-aligned
- Business logo and identity area
- Totals block
- Non-GST label
- Uses `Rs.` in generated PDF for built-in font compatibility

## Runtime note
This environment could not fetch npm dependencies from the internet, so the final Vite production compilation must run through the included GitHub Actions workflow or on the user's internet-connected Termux/computer after `npm install`.
