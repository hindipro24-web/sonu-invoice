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
  pan: '',
  invoicePrefix: 'INV',
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

const normalizeSettings = (value = {}) => ({
  businessName: String(value.businessName || DEFAULT_SETTINGS.businessName),
  phone: String(value.phone || ''),
  address: String(value.address || ''),
  pan: String(value.pan || ''),
  invoicePrefix: String(value.invoicePrefix || DEFAULT_SETTINGS.invoicePrefix),
  footerNote: String(value.footerNote ?? DEFAULT_SETTINGS.footerNote),
  logo: String(value.logo || ''),
})

const normalizeItem = (item = {}) => ({
  ...item,
  size: String(item.size || ''),
  qty: Math.max(1, Number(item.qty || 1)),
  rate: Math.max(0, Number(item.rate || 0)),
})

const normalizeInvoice = (value = {}) => {
  // Strip fields from older builds that are no longer shown in the app.
  const { dueDate, status, referenceNo, ...rest } = value || {}
  const items = Array.isArray(rest.items) ? rest.items.map(normalizeItem) : []
  const discount = Math.max(0, Number(rest.discount || 0))
  const otherCharges = Math.max(0, Number(rest.otherCharges || 0))
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0)
  const total = Math.max(0, subtotal - discount + otherCharges)
  return {
    ...rest,
    customerName: String(rest.customerName || ''),
    phone: String(rest.phone || ''),
    address: String(rest.address || ''),
    date: String(rest.date || ''),
    items,
    discount,
    otherCharges,
    note: String(rest.note || ''),
    subtotal,
    total,
  }
}

export const storage = {
  getSettings: () => normalizeSettings({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }),
  saveSettings: (value) => write(KEYS.settings, normalizeSettings(value)),

  getInvoices: () => {
    const rows = read(KEYS.invoices, [])
    return Array.isArray(rows) ? rows.map(normalizeInvoice) : []
  },
  saveInvoices: (value) => write(KEYS.invoices, Array.isArray(value) ? value.map(normalizeInvoice) : []),

  getParts: (fallback) => read(KEYS.parts, fallback),
  saveParts: (value) => write(KEYS.parts, value),

  getDraft: () => {
    const draft = read(KEYS.draft, null)
    return draft ? normalizeInvoice(draft) : null
  },
  saveDraft: (value) => write(KEYS.draft, normalizeInvoice(value)),
  clearDraft: () => localStorage.removeItem(KEYS.draft),

  exportAll: () => ({
    version: 5,
    exportedAt: new Date().toISOString(),
    settings: normalizeSettings(read(KEYS.settings, {})),
    invoices: (read(KEYS.invoices, []) || []).map(normalizeInvoice),
    parts: read(KEYS.parts, []),
    draft: read(KEYS.draft, null) ? normalizeInvoice(read(KEYS.draft, null)) : null,
  }),

  importAll: (data) => {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup file')
    if (data.settings) write(KEYS.settings, normalizeSettings(data.settings))
    if (Array.isArray(data.invoices)) write(KEYS.invoices, data.invoices.map(normalizeInvoice))
    if (Array.isArray(data.parts)) write(KEYS.parts, data.parts)
    if (data.draft) write(KEYS.draft, normalizeInvoice(data.draft))
    else localStorage.removeItem(KEYS.draft)
  },
}
