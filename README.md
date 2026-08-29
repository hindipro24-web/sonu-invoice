# Smart Parts Billing Pro

Professional local-first, non-GST fabrication billing software.

## Included
- SaaS-style responsive dashboard
- Business logo upload (logo appears in app and PDF)
- 65-part searchable master catalog
- Custom parts + editable master rates
- Quantity +/- controls and editable rate per invoice
- Customer CRM generated from invoice history
- Invoice history, search, payment status and due dates
- Professional A4 PDF with fixed RATE / AMOUNT alignment
- PDF preview, download and Android Web Share (WhatsApp/share sheet)
- Automation Center
  - Auto-save invoice draft
  - Due / overdue reminder detection
  - One-tap WhatsApp payment reminder
  - Optional n8n / Make / custom webhook on invoice save
- JSON backup / restore
- PWA manifest + service worker
- No backend required for core billing

## Deploy on GitHub Pages
Upload all files in this folder to the repository root and enable Pages from `main` branch `/ (root)`.

## Automation webhook payload
On invoice save, when webhook automation is enabled, the app sends:

```json
{
  "event": "invoice.saved",
  "invoice": { "...": "full invoice object" },
  "source": "Smart Parts Billing Pro",
  "sentAt": "ISO timestamp"
}
```

Use the webhook with n8n / Make to write Google Sheets, email staff, update CRM or connect an approved WhatsApp API provider.

## Important
Browser data uses localStorage. Export backup periodically. Direct PDF file sharing depends on Android/browser Web Share support and HTTPS (GitHub Pages supports HTTPS).
