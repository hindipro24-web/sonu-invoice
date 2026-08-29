# Smart Parts Billing Pro — QA Report

## Build checks
- Static deployment structure: PASS
- `index.html` root entry: PASS
- JavaScript syntax (`node --check`): PASS
- Local HTML/CSS/JS asset references: PASS
- Responsive CSS breakpoints: 1180 / 900 / 760 / 420 px
- 65 base parts included from SONU FABRICATION catalog: PASS

## Billing checks built into code
- Automatic invoice number generation
- Customer name validation
- At least one item validation
- Quantity +/-
- Editable rate and real-time amount
- Discount / other charges / grand total calculation
- Save / update invoice history
- Due date + Paid / Unpaid / Part Paid

## PDF alignment fix
PDF uses fixed numeric x-coordinates and right alignment:
- QTY right edge: 145 mm
- RATE right edge: 169 mm
- AMOUNT right edge: 195 mm

This prevents rate or amount values drifting away from their headings.

## Automation
- Auto draft to localStorage
- Due/overdue detection
- WhatsApp reminder template
- Optional HTTP webhook to n8n / Make on invoice save

## External runtime notes
- jsPDF is loaded from jsDelivr. Internet is needed on first load unless separately vendored.
- Webhook success depends on target URL, HTTPS and CORS configuration.
- Android file sharing uses Web Share API when browser/device supports sharing PDF files.

## Environment note
- Static server response check: PASS (HTTP 200 in container).
- Full headless browser navigation was blocked by the host browser policy, so final device/browser smoke-test is recommended after GitHub Pages deployment.
