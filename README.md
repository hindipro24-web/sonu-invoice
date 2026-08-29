# Smart Parts Billing — React V4 Ultra

Premium client-ready Non-GST billing suite rebuilt in React.

## Stack
- React + Vite
- Framer Motion animations
- Three.js live 3D dashboard hero
- jsPDF + AutoTable professional A4 invoice PDFs
- LocalStorage persistence (no server required for single-device use)
- GitHub Actions deployment to GitHub Pages

## Included working modules
- Animated Dashboard
- New Invoice with customer details
- Searchable 65-part catalog
- Quantity +/- and editable rate
- Custom invoice item
- Discount / other charges / notes
- Save and update invoice
- Invoice history / search / payment status
- Customer CRM generated from invoices
- Parts Master with persisted rate changes
- Settings with real Save state
- Business logo upload
- PDF preview, download and Web Share / WhatsApp share-sheet
- JSON export/import backup
- Responsive sidebar + mobile bottom navigation

## Local development
```bash
npm install
npm run dev
```

## Production build
```bash
npm install
npm run build
```

## GitHub Pages
The included `.github/workflows/deploy.yml` automatically builds and deploys `dist/` when `main` is pushed.
`vite.config.js` is already configured for `/sonu-invoice/`.

## Data model note
This edition is local-first. Invoices, parts and settings are saved in the browser on the current device. For multi-user login, multi-device sync or staff permissions, add a backend such as Supabase in a later cloud edition.
