# Smart Parts Billing — Final Client Edition v5.1

Deployment-ready React/Vite non-GST billing app for GitHub Pages.

## Final scope
- Clean responsive SaaS UI with normal vertical scrolling
- No Three.js/WebGL, no fixed bottom nav, no payment/due tracking
- Customer name, mobile, address and invoice date
- 65-part searchable catalog + custom items
- Item Size, Quantity, Rate and Amount
- Discount and Other Charges
- Invoice save/update/delete, invoice history and customer history
- Business logo, name, phone, address, PAN, invoice prefix and footer settings
- Professional A4 PDF with Size, Amount in Words and Authorized Signature
- PDF preview/download and mobile share/WhatsApp share sheet
- Local browser persistence + JSON backup/restore
- GitHub Pages workflow included

## Deploy
Push the project contents to the `main` branch of `hindipro24-web/sonu-invoice`. The included GitHub Actions workflow runs `npm install`, `npm run build`, and deploys `dist` to Pages.

Live path expected by Vite: `/sonu-invoice/`.
