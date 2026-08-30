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
const nonNegative = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : fallback
}
const quantity = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(1, number) : 1
}

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
  id: item.id || `${Date.now()}-${Math.random()}`,
  partNo: String(item.partNo || 'CUSTOM'),
  description: String(item.description || ''),
  size: String(item.size || ''),
  unit: String(item.unit || 'NOS'),
  qty: quantity(item.qty),
  rate: nonNegative(item.rate),
})

const normalizePart = (part = {}, index = 0) => ({
  id: part.id ?? `part-${index + 1}`,
  partNo: String(part.partNo || 'CUSTOM'),
  description: String(part.description || ''),
  size: String(part.size || ''),
  unit: String(part.unit || 'NOS'),
  rate: nonNegative(part.rate),
})

const normalizeParts = (value, fallback = []) => {
  const rows = Array.isArray(value) ? value : fallback
  return rows.map(normalizePart).filter(part => part.description.trim())
}

const normalizeInvoice = (value = {}) => {
  // Strip fields from older builds that are no longer shown in the app.
  const { dueDate, status, referenceNo, ...rest } = value || {}
  const items = Array.isArray(rest.items) ? rest.items.map(normalizeItem) : []
  const discount = nonNegative(rest.discount)
  const otherCharges = nonNegative(rest.otherCharges)
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

  getParts: (fallback) => normalizeParts(read(KEYS.parts, fallback), fallback),
  saveParts: (value) => write(KEYS.parts, normalizeParts(value)),

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
    const recognized = ['settings', 'invoices', 'parts', 'draft'].some(key => Object.prototype.hasOwnProperty.call(data, key))
    if (!recognized) throw new Error('Backup data not found')
    if (data.invoices !== undefined && !Array.isArray(data.invoices)) throw new Error('Invalid invoices data')
    if (data.parts !== undefined && !Array.isArray(data.parts)) throw new Error('Invalid parts data')
    if (data.settings) write(KEYS.settings, normalizeSettings(data.settings))
    if (Array.isArray(data.invoices)) write(KEYS.invoices, data.invoices.map(normalizeInvoice))
    if (Array.isArray(data.parts)) write(KEYS.parts, normalizeParts(data.parts))
    if (data.draft) write(KEYS.draft, normalizeInvoice(data.draft))
    else localStorage.removeItem(KEYS.draft)
  },
}
