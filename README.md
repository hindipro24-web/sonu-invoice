# Smart Parts Billing — Client Final v5.2

Deployment-ready React/Vite non-GST billing app for GitHub Pages.

## Final scope
- Clean responsive SaaS UI with normal vertical scrolling
- No Three.js/WebGL, no fixed bottom nav, no payment/due tracking
- Customer name, mobile, address and invoice date
- 65-part searchable catalog + custom items
- Multi-word catalog search with size support and Enter-to-add
- Parts Master add, edit and delete controls
- Item Size, Quantity, Rate and Amount
- Discount and Other Charges
- Invoice save/update/delete, invoice history and customer history
- Business logo, name, phone, address, PAN, invoice prefix and footer settings
- Professional A4 PDF with wrapped business/customer details, aligned columns, Size, Amount in Words, page numbers and Authorized Signature
- PDF preview/download and mobile share/WhatsApp share sheet with clear download fallback
- Local browser persistence + JSON backup/restore
- GitHub Pages workflow included

## V5.2 safeguards
- Required customer name, invoice date and valid item values before save/PDF/share
- Non-negative rate, discount and other-charge controls
- Backup format validation, 5 MB file limit and overwrite confirmation
- Multi-page PDF rows stay together and totals/signature never overlap the table

## Deploy
Push the project contents to the `main` branch of `hindipro24-web/sonu-invoice`. The included GitHub Actions workflow runs `npm install`, `npm run build`, and deploys `dist` to Pages.

Live path expected by Vite: `/sonu-invoice/`.
