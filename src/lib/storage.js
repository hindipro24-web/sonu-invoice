const KEYS = {
  settings: 'spb_v4_settings',
  invoices: 'spb_v4_invoices',
  parts: 'spb_v4_parts',
  draft: 'spb_v4_draft',
}

export const DEFAULT_SETTINGS = {
  businessName: 'Smart Parts Billing',
  phone: '',
  address: '',
  paymentDetails: '',
  pan: '',
  invoicePrefix: 'INV',
  dueDays: 7,
  footerNote: 'Thank you for your business.',
  logo: '',
}

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const write = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const storage = {
  getSettings: () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }),
  saveSettings: (value) => write(KEYS.settings, value),
  getInvoices: () => read(KEYS.invoices, []),
  saveInvoices: (value) => write(KEYS.invoices, value),
  getParts: (fallback) => read(KEYS.parts, fallback),
  saveParts: (value) => write(KEYS.parts, value),
  getDraft: () => read(KEYS.draft, null),
  saveDraft: (value) => write(KEYS.draft, value),
  clearDraft: () => localStorage.removeItem(KEYS.draft),
  exportAll: () => ({
    version: 4,
    exportedAt: new Date().toISOString(),
    settings: read(KEYS.settings, {}),
    invoices: read(KEYS.invoices, []),
    parts: read(KEYS.parts, []),
    draft: read(KEYS.draft, null),
  }),
  importAll: (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file')
    if (data.settings) write(KEYS.settings, data.settings)
    if (Array.isArray(data.invoices)) write(KEYS.invoices, data.invoices)
    if (Array.isArray(data.parts)) write(KEYS.parts, data.parts)
    if (data.draft) write(KEYS.draft, data.draft)
  },
}
