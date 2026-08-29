# Smart Parts Billing — Client Edition V2 QA

## Functional/code checks
- JavaScript syntax: PASS
- Every DOM ID referenced by app.js exists in index.html: PASS
- Duplicate HTML IDs: none
- Manifest JSON: valid
- Required deployment files: present
- Automation/webhook/n8n UI/code: removed
- Explicit Settings Save buttons: desktop top action + persistent bottom action
- Settings dirty/saved state: implemented
- Logo upload/remove: persists to browser storage and updates app/PDF branding
- Invoice save/update/delete: persists in localStorage
- Draft auto-save + restore after reload: enabled
- Parts rate edits/custom parts: persist in localStorage
- Invoice search/status filtering: enabled
- Customers derived from saved invoices: enabled
- JSON backup/import: enabled
- PDF preview/download/share path: enabled through jsPDF
- Fixed PDF numeric columns for QTY / RATE / AMOUNT: retained

## Responsive/UI rules
- Minimum primary form/button sizing: 40–44px
- Normal UI text: 12–15px; major headings 25–36px
- Desktop: fixed navigation + sticky invoice summary
- Tablet: dashboard/invoice layouts collapse safely
- Mobile: drawer navigation + bottom navigation
- Mobile tables convert to cards; no page-level wide table requirement
- Mobile Settings Save action remains visible above bottom navigation
- 350px fallback reduces multi-column metrics to one column

## Important deployment note
This static GitHub Pages edition stores business data in the current browser/device. It is suitable for one-device/one-browser client use. Multi-device sync, logins and staff access need a real backend/database.
