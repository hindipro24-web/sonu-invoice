import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import {
  LayoutDashboard, FilePlus2, ReceiptText, Users, Boxes, Settings, Search, Plus, Minus,
  Trash2, Download, Share2, Eye, Save, Upload, Building2, Phone, MapPin,
  CheckCircle2, IndianRupee, TrendingUp, Menu, X, ChevronRight, Pencil, FileDown,
  RefreshCw, ShieldCheck, Sparkles, PackagePlus, BadgeCheck, Database, ArrowUpRight,
} from 'lucide-react'
import { DEFAULT_PARTS } from './data/parts.js'
import { DEFAULT_SETTINGS, storage } from './lib/storage.js'
import { buildInvoicePdf, downloadInvoicePdf, shareInvoicePdf } from './lib/pdf.js'

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['invoice', 'New Invoice', FilePlus2],
  ['invoices', 'Invoices', ReceiptText],
  ['customers', 'Customers', Users],
  ['parts', 'Parts Master', Boxes],
  ['settings', 'Settings', Settings],
]

const today = () => new Date().toISOString().slice(0, 10)
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

function nextInvoiceNumber(settings, invoices = []) {
  const prefix = String(settings.invoicePrefix || 'INV').trim() || 'INV'
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${escaped}-(\\d+)$`, 'i')
  let max = 0
  for (const row of invoices) {
    const match = String(row.invoiceNo || '').match(re)
    if (match) max = Math.max(max, Number(match[1]) || 0)
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

function blankInvoice(settings, invoices = []) {
  return {
    id: uid(),
    invoiceNo: nextInvoiceNumber(settings, invoices),
    customerName: '', phone: '', address: '', date: today(),
    items: [], discount: 0, otherCharges: 0, note: '', savedAt: null,
  }
}

function calcInvoice(inv) {
  const subtotal = (inv.items || []).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.rate || 0), 0)
  const total = Math.max(0, subtotal - Number(inv.discount || 0) + Number(inv.otherCharges || 0))
  return { ...inv, subtotal, total }
}

function invoiceError(inv) {
  if (!String(inv.customerName || '').trim()) return 'Customer name required'
  if (!String(inv.date || '').trim()) return 'Invoice date required'
  if (!Array.isArray(inv.items) || !inv.items.length) return 'Add at least one item'
  const invalidItem = inv.items.find(item => !String(item.description || '').trim() || !Number.isFinite(Number(item.qty)) || Number(item.qty) < 1 || !Number.isFinite(Number(item.rate)) || Number(item.rate) < 0)
  if (invalidItem) return 'Check item description, quantity and rate'
  return ''
}

function useToast() {
  const [toast, setToast] = useState(null)
  const show = (message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone })
    setTimeout(() => setToast(null), 2800)
  }
  return [toast, show]
}

function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || Capacitor.isNativePlatform()
    setInstalled(isStandalone)

    const capturePrompt = (event) => {
      event.preventDefault()
      setPrompt(event)
    }
    const markInstalled = () => {
      setInstalled(true)
      setPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  const install = async () => {
    if (installed) return 'installed'
    if (!prompt) return 'unavailable'
    await prompt.prompt()
    const choice = await prompt.userChoice
    setPrompt(null)
    return choice.outcome
  }

  return { install, installed, ready: Boolean(prompt) }
}

function LogoMark({ settings, size = 'md' }) {
  return (
    <div className={`logo-mark logo-${size}`}>
      {settings.logo ? <img src={settings.logo} alt="Business logo" /> : <span>{(settings.businessName || 'SP').split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase()}</span>}
    </div>
  )
}

function Card({ children, className = '' }) {
  return <div className={`glass-card ${className}`}>{children}</div>
}

function PageHeader({ eyebrow, title, text, action }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, hint, tone = 'cyan' }) {
  return (
    <motion.div className={`metric-card tone-${tone}`} whileHover={{ y: -4 }} transition={{ duration: .2 }}>
      <div className="metric-icon"><Icon size={22} /></div>
      <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
      <div className="metric-sheen" />
    </motion.div>
  )
}

function EmptyState({ icon: Icon = ReceiptText, title, text, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={28}/></div><strong>{title}</strong><span>{text}</span>{action}</div>
}

function Shell({ view, setView, settings, invoices, children, onBackup, onInstall, installReady, installed, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="app-shell">
      <div className="ambient ambient-a"/><div className="ambient ambient-b"/><div className="grid-glow"/>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-row">
          <LogoMark settings={settings}/>
          <div className="brand-copy"><strong>{settings.businessName || 'Smart Parts Billing'}</strong><span>PROFESSIONAL BILLING SUITE</span></div>
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}><X size={20}/></button>
        </div>
        <div className="workspace-pill"><ShieldCheck size={16}/><div><strong>Private workspace</strong><span>Local-first billing</span></div></div>
        <nav className="side-nav">
          {NAV.map(([id, label, Icon]) => (
            <button key={id} className={`nav-link ${view === id ? 'active' : ''}`} onClick={() => { setView(id); setSidebarOpen(false) }}>
              {view === id && <motion.span layoutId="nav-active" className="nav-active-bg" />}
              <Icon size={20}/><span>{label}</span>{id === 'invoices' && invoices.length > 0 && <b>{invoices.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="backup-btn" onClick={onBackup}><Database size={18}/><div><strong>Export backup</strong><span>Keep a safe copy</span></div><ChevronRight size={17}/></button>
          <div className="version-row"><span>V6 • White & Royal Blue</span><BadgeCheck size={15}/></div>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={21}/></button><div><span>SMART PARTS BILLING</span><strong>{NAV.find(x => x[0] === view)?.[1]}</strong></div></div>
          <div className="topbar-right">
            <span className="online-pill"><i/>Workspace ready</span>
            <button className={`install-btn ${installed ? 'installed' : ''}`} onClick={onInstall} disabled={installed} title={installed ? 'App is installed' : 'Install app on this device'}>
              {installed ? <BadgeCheck size={18}/> : <Download size={18}/>}<span>{installed ? 'App Installed' : installReady ? 'Install App' : 'Get App'}</span>
            </button>
            <button className="primary-btn top-new" onClick={() => setView('invoice')}><Plus size={18}/><span>New Invoice</span></button>
          </div>
        </header>
        <div className="content-shell">{children}</div>
      </main>

    </div>
  )
}

function Dashboard({ invoices, settings, setView }) {
  const totals = useMemo(() => {
    const total = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
    const customerCount = new Set(invoices.map(i => String(i.customerName || '').trim().toLowerCase()).filter(Boolean)).size
    const month = new Date().toISOString().slice(0,7)
    const monthInv = invoices.filter(i => String(i.date || '').startsWith(month))
    return { total, customerCount, month: monthInv.reduce((s,i)=>s+Number(i.total||0),0), monthCount: monthInv.length }
  }, [invoices])
  const latest = [...invoices].sort((a,b)=>String(b.savedAt||'').localeCompare(String(a.savedAt||''))).slice(0,5)

  return <motion.div className="page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <section className="hero-panel">
      <div className="hero-content">
        <div className="hero-badge"><Sparkles size={15}/> V6 • Business Billing App</div>
        <h1>Clear billing. Faster work. Better business.</h1>
        <p>Create professional bills, manage parts and customers, and share a polished PDF from one simple workspace.</p>
        <div className="hero-actions"><button className="primary-btn hero-primary" onClick={()=>setView('invoice')}><FilePlus2 size={19}/> Create Invoice</button><button className="ghost-btn" onClick={()=>setView('invoices')}><ReceiptText size={18}/> View Invoices</button></div>
        <div className="hero-proof"><span><CheckCircle2 size={15}/> Non-GST ready</span><span><CheckCircle2 size={15}/> Installable app</span><span><CheckCircle2 size={15}/> Mobile friendly</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-orb" aria-hidden="true"/>
        <div className="hero-invoice-card">
          <div className="hero-invoice-top"><ReceiptText size={18}/><span>Invoice workspace</span></div>
          <div className="hero-invoice-business">{settings.businessName || 'Your Business'}</div>
          <div className="hero-invoice-row"><span>Next invoice</span><strong>{settings.invoicePrefix || 'INV'}-0001</strong></div>
          <div className="hero-invoice-lines"><i/><i/><i/></div>
          <div className="hero-invoice-total"><span>Total billed</span><strong>{money(totals.total)}</strong></div>
        </div>
      </div>
    </section>

    <div className="metrics-grid">
      <MetricCard icon={ReceiptText} label="Total Invoices" value={invoices.length} hint="All saved bills" tone="cyan" />
      <MetricCard icon={IndianRupee} label="Total Billed" value={money(totals.total)} hint="Lifetime billing" tone="violet" />
      <MetricCard icon={Users} label="Customers" value={totals.customerCount} hint="Unique customers" tone="amber" />
      <MetricCard icon={TrendingUp} label="This Month" value={money(totals.month)} hint={`${totals.monthCount} invoice${totals.monthCount === 1 ? '' : 's'}`} tone="green" />
    </div>

    <div className="dashboard-grid">
      <Card className="section-card recent-card">
        <div className="section-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Latest invoices</h2></div><button className="text-btn" onClick={()=>setView('invoices')}>View all <ArrowUpRight size={16}/></button></div>
        {latest.length ? <div className="invoice-list">{latest.map(inv => <div className="invoice-list-row" key={inv.id}><div className="invoice-avatar">{(inv.customerName||'?')[0].toUpperCase()}</div><div className="invoice-main"><strong>{inv.customerName}</strong><span>{inv.invoiceNo} • {inv.date}</span></div><strong className="invoice-amount">{money(inv.total)}</strong></div>)}</div> : <EmptyState title="No invoices yet" text="Create your first premium invoice." action={<button className="primary-btn" onClick={()=>setView('invoice')}>Create Invoice</button>} />}
      </Card>
      <Card className="section-card quick-card">
        <div className="section-head"><div><span className="eyebrow">QUICK CONTROL</span><h2>Workspace shortcuts</h2></div><span className="ready-chip"><i/> READY</span></div>
        <div className="quick-stack">
          <button onClick={()=>setView('parts')}><div className="quick-icon"><Boxes size={21}/></div><div><strong>Parts Master</strong><span>Search & update rates</span></div><ChevronRight size={19}/></button>
          <button onClick={()=>setView('customers')}><div className="quick-icon"><Users size={21}/></div><div><strong>Customers</strong><span>Billing history & totals</span></div><ChevronRight size={19}/></button>
          <button onClick={()=>setView('settings')}><div className="quick-icon"><Settings size={21}/></div><div><strong>Brand Settings</strong><span>Logo, details & PDF</span></div><ChevronRight size={19}/></button>
        </div>
        <div className="brand-preview"><LogoMark settings={settings} size="lg"/><div><span>Your invoice brand</span><strong>{settings.businessName}</strong><small>{settings.phone || 'Add phone in Settings'}</small></div></div>
      </Card>
    </div>
  </motion.div>
}

function InvoiceEditor({ invoice, setInvoice, parts, settings, invoices, onSave, onBlank, showToast }) {
  const [query, setQuery] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState({ partNo:'', description:'', size:'', unit:'NOS', rate:'' })
  const calculated = calcInvoice(invoice)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase(); if (!q) return []
    const tokens = q.split(/\s+/).filter(Boolean)
    return parts
      .filter(p => { const hay = `${p.partNo} ${p.description} ${p.size || ''} ${p.unit}`.toLowerCase(); return tokens.every(token => hay.includes(token)) })
      .sort((a,b) => {
        const aNo=String(a.partNo || '').toLowerCase(); const bNo=String(b.partNo || '').toLowerCase()
        return Number(bNo===q)-Number(aNo===q) || Number(bNo.startsWith(q))-Number(aNo.startsWith(q))
      })
      .slice(0, 8)
  }, [query, parts])

  useEffect(() => {
    if (invoice.savedAt) return undefined
    const t = setTimeout(() => storage.saveDraft(invoice), 350)
    return () => clearTimeout(t)
  }, [invoice])

  const addPart = (p) => {
    const existing = invoice.items.find(i => i.partKey === `${p.partNo}-${p.unit}`)
    if (existing) setInvoice({ ...invoice, items: invoice.items.map(i => i.id === existing.id ? { ...i, qty: Number(i.qty)+1 } : i) })
    else setInvoice({ ...invoice, items: [...invoice.items, { id:uid(), partKey:`${p.partNo}-${p.unit}`, partNo:p.partNo, description:p.description, size:p.size || '', unit:p.unit, qty:1, rate:Number(p.rate||0) }] })
    setQuery('')
  }
  const updateItem = (id, patch) => setInvoice({ ...invoice, items: invoice.items.map(i => i.id === id ? { ...i, ...patch } : i) })
  const removeItem = id => setInvoice({ ...invoice, items: invoice.items.filter(i => i.id !== id) })
  const addCustom = () => {
    if (!custom.description.trim()) return showToast('Custom item description required', 'error')
    addPart({ partNo:custom.partNo || 'CUSTOM', description:custom.description, size:custom.size || '', unit:custom.unit || 'NOS', rate:Number(custom.rate||0) })
    setCustom({ partNo:'', description:'', size:'', unit:'NOS', rate:'' }); setCustomOpen(false)
  }

  const save = () => onSave(calcInvoice(invoice))
  const preview = async () => {
    const error = invoiceError(invoice)
    if (error) return showToast(error, 'error')
    if (Capacitor.isNativePlatform()) {
      try {
        await downloadInvoicePdf(calcInvoice(invoice), settings)
        showToast('PDF options opened')
      } catch (previewError) {
        showToast(previewError?.name === 'AbortError' ? 'PDF action cancelled' : 'Could not create PDF', 'error')
      }
      return
    }
    const url = buildInvoicePdf(calcInvoice(invoice), settings).output('bloburl')
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  const download = async () => {
    const error = invoiceError(invoice)
    if (error) return showToast(error, 'error')
    try {
      const result = await downloadInvoicePdf(calcInvoice(invoice), settings)
      showToast(result.native ? 'PDF options opened' : 'PDF downloaded')
    } catch (downloadError) {
      showToast(downloadError?.name === 'AbortError' ? 'PDF action cancelled' : 'Could not create PDF', 'error')
    }
  }
  const share = async () => {
    const error = invoiceError(invoice)
    if (error) return showToast(error, 'error')
    try {
      const result = await shareInvoicePdf(calcInvoice(invoice), settings)
      showToast(result.shared ? 'Share sheet opened — select WhatsApp' : 'PDF downloaded — attach it in WhatsApp', result.shared ? 'success' : 'info')
    } catch (shareError) {
      showToast(shareError?.name === 'AbortError' ? 'Sharing cancelled' : 'Could not create or share PDF', 'error')
    }
  }

  return <motion.div className="page" initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}>
    <PageHeader eyebrow="CREATE BILL" title="New Invoice" text="Fast part search, clear totals and a client-ready PDF." action={<div className="invoice-number-card"><span>INVOICE NO.</span><strong>{invoice.invoiceNo}</strong></div>} />
    <div className="invoice-layout">
      <div className="invoice-workspace">
        <Card className="form-card">
          <div className="section-head"><div><span className="eyebrow">01 • CUSTOMER</span><h2>Billing details</h2></div><span className="save-state"><i/> {invoice.savedAt ? 'Saved invoice' : 'Draft autosaved'}</span></div>
          <div className="form-grid cols-3">
            <Field label="Customer Name *"><input value={invoice.customerName} onChange={e=>setInvoice({...invoice,customerName:e.target.value})} placeholder="Enter customer name" /></Field>
            <Field label="Mobile"><input value={invoice.phone} onChange={e=>setInvoice({...invoice,phone:e.target.value})} placeholder="Mobile number" inputMode="tel" /></Field>
            <Field label="Invoice Date"><input type="date" value={invoice.date} onChange={e=>setInvoice({...invoice,date:e.target.value})}/></Field>
          </div>
          <Field label="Address / Site" className="mt-16"><input value={invoice.address} onChange={e=>setInvoice({...invoice,address:e.target.value})} placeholder="Area, city or site" /></Field>
        </Card>

        <Card className="form-card items-card">
          <div className="section-head"><div><span className="eyebrow">02 • ITEMS</span><h2>Add parts</h2></div><span className="catalog-chip"><Boxes size={15}/> {parts.length} parts</span></div>
          <div className="part-search-row">
            <div className="search-box"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&results[0]){e.preventDefault();addPart(results[0])}}} placeholder="Search part no., description, size or unit..." />{query && <button onClick={()=>setQuery('')} aria-label="Clear part search"><X size={17}/></button>}
              {results.length > 0 && <div className="search-popover">{results.map(p => <button key={`${p.id}-${p.unit}`} onClick={()=>addPart(p)}><div><strong>{p.partNo}</strong><span>{p.description} • {p.unit}</span></div><b>{money(p.rate)}</b><Plus size={18}/></button>)}</div>}
            </div>
            <button className="secondary-btn" onClick={()=>setCustomOpen(true)}><PackagePlus size={18}/> Custom Item</button>
          </div>
          {invoice.items.length ? <div className="items-wrap">
            <div className="items-header"><span>PART DETAILS</span><span>SIZE</span><span>QTY</span><span>RATE</span><span>AMOUNT</span><span/></div>
            {invoice.items.map(item => <motion.div layout className="item-row" key={item.id}>
              <div className="item-desc"><span className="item-code">{item.partNo}</span><strong>{item.description}</strong><small>{item.unit}</small></div>
              <input className="size-input" value={item.size || ''} placeholder="12mm" onChange={e=>updateItem(item.id,{size:e.target.value})}/>
              <div className="qty-control"><button onClick={()=>updateItem(item.id,{qty:Math.max(1,Number(item.qty)-1)})}><Minus size={16}/></button><input value={item.qty} inputMode="numeric" onChange={e=>updateItem(item.id,{qty:Math.max(1,Number(e.target.value)||1)})}/><button onClick={()=>updateItem(item.id,{qty:Number(item.qty)+1})}><Plus size={16}/></button></div>
              <div className="money-input"><span>₹</span><input type="number" min="0" step="0.01" value={item.rate} inputMode="decimal" onChange={e=>updateItem(item.id,{rate:Math.max(0,Number(e.target.value)||0)})}/></div>
              <strong className="line-total">{money(Number(item.qty)*Number(item.rate))}</strong>
              <button className="delete-btn" onClick={()=>removeItem(item.id)}><Trash2 size={18}/></button>
            </motion.div>)}
          </div> : <EmptyState icon={Boxes} title="No items added" text="Search the catalog above and tap a part to add it." />}
        </Card>

        <Card className="form-card">
          <div className="section-head"><div><span className="eyebrow">03 • FINAL DETAILS</span><h2>Adjustments & notes</h2></div></div>
          <div className="form-grid cols-2"><Field label="Discount (₹)"><input type="number" min="0" step="0.01" value={invoice.discount} onChange={e=>setInvoice({...invoice,discount:Math.max(0,Number(e.target.value)||0)})}/></Field><Field label="Other Charges (₹)"><input type="number" min="0" step="0.01" value={invoice.otherCharges} onChange={e=>setInvoice({...invoice,otherCharges:Math.max(0,Number(e.target.value)||0)})}/></Field></div>
          <Field label="Invoice Note" className="mt-16"><textarea rows="3" value={invoice.note} onChange={e=>setInvoice({...invoice,note:e.target.value})} placeholder="Optional invoice note" /></Field>
        </Card>
      </div>

      <aside className="invoice-summary-col">
        <Card className="invoice-summary">
          <div className="summary-brand"><LogoMark settings={settings}/><div><strong>{settings.businessName}</strong><span>NON-GST INVOICE</span></div></div>
          <div className="summary-no"><span>Invoice</span><strong>{invoice.invoiceNo}</strong></div>
          <div className="summary-lines"><div><span>Items</span><strong>{invoice.items.length}</strong></div><div><span>Subtotal</span><strong>{money(calculated.subtotal)}</strong></div><div><span>Discount</span><strong>- {money(invoice.discount)}</strong></div><div><span>Other charges</span><strong>{money(invoice.otherCharges)}</strong></div></div>
          <div className="grand-total"><span>Grand Total</span><strong>{money(calculated.total)}</strong></div>
          <div className="summary-actions"><button className="primary-btn full" onClick={save}><Save size={18}/> {invoice.savedAt ? 'Update Invoice' : 'Save Invoice'}</button><button className="share-btn full" onClick={share}><Share2 size={18}/> Share PDF / WhatsApp</button><div className="split-actions"><button className="secondary-btn" onClick={preview}><Eye size={17}/> Preview</button><button className="secondary-btn" onClick={download}><Download size={17}/> PDF</button></div><button className="text-btn centered" onClick={onBlank}><RefreshCw size={16}/> Start blank invoice</button></div>
          <div className="secure-note"><ShieldCheck size={16}/><span>Data stays on this device</span></div>
        </Card>
      </aside>
    </div>

    <AnimatePresence>{customOpen && <Modal onClose={()=>setCustomOpen(false)} title="Add custom item"><div className="form-grid cols-2"><Field label="Part No."><input value={custom.partNo} onChange={e=>setCustom({...custom,partNo:e.target.value})}/></Field><Field label="Unit"><input value={custom.unit} onChange={e=>setCustom({...custom,unit:e.target.value})}/></Field></div><Field label="Description" className="mt-16"><input value={custom.description} onChange={e=>setCustom({...custom,description:e.target.value})}/></Field><div className="form-grid cols-2 mt-16"><Field label="Size"><input value={custom.size} placeholder="e.g. 12mm" onChange={e=>setCustom({...custom,size:e.target.value})}/></Field><Field label="Rate (₹)"><input type="number" value={custom.rate} onChange={e=>setCustom({...custom,rate:e.target.value})}/></Field></div><div className="modal-actions"><button className="secondary-btn" onClick={()=>setCustomOpen(false)}>Cancel</button><button className="primary-btn" onClick={addCustom}><Plus size={17}/> Add Item</button></div></Modal>}</AnimatePresence>
  </motion.div>
}

function Field({ label, children, className='' }) { return <label className={`field ${className}`}><span>{label}</span>{children}</label> }
function Modal({ title, children, onClose }) { return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={onClose}><motion.div className="modal" initial={{opacity:0,scale:.96,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.97}} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={20}/></button></div>{children}</motion.div></motion.div> }

function InvoicesPage({ invoices, onEdit, onDelete, showToast }) {
  const [q,setQ]=useState('')
  const rows = useMemo(() => invoices.filter(i => {
    const hay = `${i.invoiceNo} ${i.customerName} ${i.phone}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  }).sort((a,b)=>String(b.savedAt||'').localeCompare(String(a.savedAt||''))), [invoices,q])
  const download = async (invoice) => {
    try {
      const result = await downloadInvoicePdf(invoice, storage.getSettings())
      showToast(result.native ? 'PDF options opened' : 'PDF downloaded')
    } catch (downloadError) {
      showToast(downloadError?.name === 'AbortError' ? 'PDF action cancelled' : 'Could not create PDF', 'error')
    }
  }

  return <motion.div className="page" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><PageHeader eyebrow="BILLING RECORDS" title="Invoices" text="Search, reopen and manage every saved bill." />
    <Card className="table-card"><div className="toolbar"><div className="search-box simple"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search invoice, customer or mobile..."/></div></div>
      {rows.length ? <div className="responsive-table simple-invoice-table"><div className="rt-head"><span>INVOICE</span><span>CUSTOMER</span><span>DATE</span><span>AMOUNT</span><span/></div>{rows.map(inv=><div className="rt-row" key={inv.id}><div data-label="Invoice"><strong>{inv.invoiceNo}</strong><small>Saved invoice</small></div><div data-label="Customer"><strong>{inv.customerName}</strong><small>{inv.phone || 'No mobile'}</small></div><div data-label="Date"><strong>{inv.date}</strong></div><div className="rt-amount" data-label="Amount">{money(inv.total)}</div><div className="row-actions"><button onClick={()=>onEdit(inv)} title="Edit"><Pencil size={17}/></button><button onClick={()=>download(inv)} title="PDF"><FileDown size={17}/></button><button className="danger" onClick={()=>onDelete(inv.id)} title="Delete"><Trash2 size={17}/></button></div></div>)}</div> : <EmptyState title="No matching invoices" text="Saved invoices will appear here."/>}
    </Card></motion.div>
}

function CustomersPage({ invoices }) {
  const [q,setQ]=useState('')
  const customers=useMemo(()=>{const map=new Map(); invoices.forEach(i=>{const key=(i.phone||i.customerName||'').toLowerCase(); if(!key)return; const c=map.get(key)||{name:i.customerName,phone:i.phone,address:i.address,total:0,count:0,last:i.date}; c.total+=Number(i.total||0); c.count++; if(String(i.date)>String(c.last))c.last=i.date; map.set(key,c)});return [...map.values()].filter(c=>`${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.total-a.total)},[invoices,q])
  return <motion.div className="page" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><PageHeader eyebrow="CUSTOMER CRM" title="Customers" text="Automatically built from your invoice history." />
    <div className="metrics-grid compact-metrics"><MetricCard icon={Users} label="Total Customers" value={customers.length} hint="Unique billing profiles"/><MetricCard icon={TrendingUp} label="Repeat Customers" value={customers.filter(c=>c.count>1).length} hint="2+ invoices" tone="green"/></div>
    <Card className="table-card"><div className="toolbar"><div className="search-box simple"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search customer or mobile..."/></div></div>{customers.length?<div className="customer-grid">{customers.map((c,i)=><motion.div whileHover={{y:-3}} className="customer-card" key={`${c.phone}-${i}`}><div className="customer-avatar">{(c.name||'?')[0].toUpperCase()}</div><div className="customer-info"><strong>{c.name}</strong><span>{c.phone||'No mobile'}</span><small>{c.address||'No address saved'}</small></div><div className="customer-stat"><span>Total billed</span><strong>{money(c.total)}</strong><small>{c.count} invoice{c.count===1?'':'s'} • Last {c.last}</small></div></motion.div>)}</div>:<EmptyState icon={Users} title="No customers yet" text="Customers appear automatically after saving invoices."/>}</Card></motion.div>
}

function PartsPage({ parts, setParts, showToast }) {
  const emptyPart = {partNo:'',description:'',size:'',unit:'NOS',rate:''}
  const [q,setQ]=useState(''); const [editorOpen,setEditorOpen]=useState(false); const [editingId,setEditingId]=useState(null); const [custom,setCustom]=useState(emptyPart)
  const queryTokens=q.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const rows=parts.filter(p=>{const hay=`${p.partNo} ${p.description} ${p.size || ''} ${p.unit}`.toLowerCase();return queryTokens.every(token=>hay.includes(token))})
  const openAdd=()=>{setEditingId(null);setCustom(emptyPart);setEditorOpen(true)}
  const openEdit=(part)=>{setEditingId(part.id);setCustom({partNo:part.partNo || '',description:part.description || '',size:part.size || '',unit:part.unit || 'NOS',rate:String(part.rate ?? '')});setEditorOpen(true)}
  const closeEditor=()=>{setEditorOpen(false);setEditingId(null);setCustom(emptyPart)}
  const savePart=()=>{
    const description=custom.description.trim(); const rate=Number(custom.rate || 0)
    if(!description)return showToast('Description required','error')
    if(!Number.isFinite(rate)||rate<0)return showToast('Enter a valid rate','error')
    const clean={partNo:custom.partNo.trim() || 'CUSTOM',description,size:custom.size.trim(),unit:custom.unit.trim() || 'NOS',rate}
    const next=editingId===null?[...parts,{...clean,id:Date.now()}]:parts.map(p=>p.id===editingId?{...p,...clean}:p)
    setParts(next);storage.saveParts(next);closeEditor();showToast(editingId===null?'Part added':'Part updated')
  }
  const deletePart=(part)=>{if(!confirm(`Delete ${part.partNo || part.description} from Parts Master?`))return;const next=parts.filter(p=>p.id!==part.id);setParts(next);storage.saveParts(next);showToast('Part deleted')}
  return <motion.div className="page" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><PageHeader eyebrow="PARTS MASTER" title="Parts & Rates" text={`${parts.length} catalog items ready for billing.`} action={<button className="primary-btn" onClick={openAdd}><Plus size={18}/> Add Part</button>} />
    <Card className="table-card"><div className="toolbar"><div className="search-box simple"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search part number, description, size or unit..."/></div><span className="catalog-chip"><Boxes size={15}/>{rows.length} shown</span></div>{rows.length?<div className="responsive-table parts-table"><div className="rt-head"><span>PART NO.</span><span>DESCRIPTION</span><span>SIZE</span><span>UNIT</span><span>RATE</span><span>ACTIONS</span></div>{rows.map(p=><div className="rt-row" key={`${p.id}-${p.unit}`}><div data-label="Part No."><strong>{p.partNo}</strong></div><div data-label="Description"><strong>{p.description}</strong></div><div data-label="Size"><span>{p.size || '—'}</span></div><div data-label="Unit"><span>{p.unit}</span></div><div data-label="Rate"><strong>{money(p.rate)}</strong></div><div className="row-actions" data-label="Actions"><button onClick={()=>openEdit(p)} title="Edit part" aria-label={`Edit ${p.partNo || p.description}`}><Pencil size={17}/></button><button className="danger" onClick={()=>deletePart(p)} title="Delete part" aria-label={`Delete ${p.partNo || p.description}`}><Trash2 size={17}/></button></div></div>)}</div>:<EmptyState icon={Boxes} title="No matching parts" text="Try another part number, description, size or unit."/>}</Card>
    <AnimatePresence>{editorOpen&&<Modal title={editingId===null?'Add Part':'Edit Part'} onClose={closeEditor}><div className="form-grid cols-2"><Field label="Part No."><input value={custom.partNo} onChange={e=>setCustom({...custom,partNo:e.target.value})}/></Field><Field label="Unit"><input value={custom.unit} onChange={e=>setCustom({...custom,unit:e.target.value})}/></Field></div><Field className="mt-16" label="Description"><input value={custom.description} onChange={e=>setCustom({...custom,description:e.target.value})}/></Field><div className="form-grid cols-2 mt-16"><Field label="Size"><input value={custom.size} placeholder="e.g. 12mm" onChange={e=>setCustom({...custom,size:e.target.value})}/></Field><Field label="Rate (₹)"><input type="number" min="0" step="0.01" value={custom.rate} onChange={e=>setCustom({...custom,rate:e.target.value})}/></Field></div><div className="modal-actions"><button className="secondary-btn" onClick={closeEditor}>Cancel</button><button className="primary-btn" onClick={savePart}><Save size={17}/> {editingId===null?'Add Part':'Save Changes'}</button></div></Modal>}</AnimatePresence>
  </motion.div>
}

function SettingsPage({ settings, setSettings, showToast, onImport }) {
  const [draft,setDraft]=useState(settings); const [dirty,setDirty]=useState(false); const fileRef=useRef(null); const importRef=useRef(null)
  useEffect(()=>{setDraft(settings);setDirty(false)},[settings])
  const patch=(p)=>{setDraft(d=>({...d,...p}));setDirty(true)}
  const uploadLogo=(file)=>{if(!file)return; if(file.size>2*1024*1024)return showToast('Logo must be under 2 MB','error'); const r=new FileReader();r.onload=()=>patch({logo:r.result});r.readAsDataURL(file)}
  const save=()=>{const businessName=draft.businessName.trim();const invoicePrefix=draft.invoicePrefix.trim();if(!businessName)return showToast('Business name required','error');if(!invoicePrefix)return showToast('Invoice prefix required','error');storage.saveSettings({...draft,businessName,invoicePrefix});const next=storage.getSettings();setSettings(next);setDraft(next);setDirty(false);showToast('Settings saved successfully')}
  return <motion.div className="page settings-page" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}><PageHeader eyebrow="WORKSPACE SETTINGS" title="Brand & Invoice Settings" text="Control how your business appears inside the app and on every PDF." action={<button className="primary-btn settings-save-action" disabled={!dirty} onClick={save}><Save size={18}/> Save Changes</button>} />
    <div className="settings-layout">
      <div className="settings-main">
        <Card className="form-card"><div className="section-head"><div><span className="eyebrow">BRANDING</span><h2>Business identity</h2></div><span className={`dirty-chip ${dirty?'dirty':''}`}>{dirty?'Unsaved changes':'All changes saved'}</span></div>
          <div className="logo-setting"><LogoMark settings={draft} size="xl"/><div><strong>Business logo</strong><span>PNG or JPG, max 2 MB. Used in app and PDF.</span><div className="logo-actions"><button className="secondary-btn" onClick={()=>fileRef.current?.click()}><Upload size={17}/> Upload Logo</button>{draft.logo&&<button className="text-btn danger-text" onClick={()=>patch({logo:''})}>Remove</button>}<input ref={fileRef} hidden type="file" accept="image/png,image/jpeg" onChange={e=>uploadLogo(e.target.files?.[0])}/></div></div></div>
          <div className="form-grid cols-2 mt-24"><Field label="Business Name"><div className="input-icon"><Building2 size={18}/><input value={draft.businessName} onChange={e=>patch({businessName:e.target.value})}/></div></Field><Field label="Phone"><div className="input-icon"><Phone size={18}/><input value={draft.phone} onChange={e=>patch({phone:e.target.value})}/></div></Field></div>
          <Field label="Business Address" className="mt-16"><div className="input-icon"><MapPin size={18}/><input value={draft.address} onChange={e=>patch({address:e.target.value})}/></div></Field>
        </Card>
        <Card className="form-card"><div className="section-head"><div><span className="eyebrow">INVOICE</span><h2>Invoice settings</h2></div></div><Field label="Invoice Prefix"><input value={draft.invoicePrefix} onChange={e=>patch({invoicePrefix:e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,'')})}/></Field><Field label="PAN No. (Optional)" className="mt-16"><input value={draft.pan || ''} placeholder="Enter PAN number" onChange={e=>patch({pan:e.target.value.toUpperCase()})}/></Field><Field label="PDF Footer Note" className="mt-16"><textarea rows="2" value={draft.footerNote} onChange={e=>patch({footerNote:e.target.value})}/></Field></Card>
        <Card className="form-card"><div className="section-head"><div><span className="eyebrow">DATA</span><h2>Backup & restore</h2></div></div><p className="muted-copy">Export a JSON backup before moving the software to another device.</p><div className="backup-actions"><button className="secondary-btn" onClick={()=>{const blob=new Blob([JSON.stringify(storage.exportAll(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`smart-billing-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)}}><Download size={18}/> Export Backup</button><button className="secondary-btn" onClick={()=>importRef.current?.click()}><Upload size={18}/> Import Backup</button><input ref={importRef} hidden type="file" accept="application/json" onChange={e=>{onImport(e.target.files?.[0]);e.target.value=''}}/></div></Card>
      </div>
      <aside className="settings-preview"><Card className="brand-preview-card"><span className="eyebrow">LIVE PREVIEW</span><LogoMark settings={draft} size="xl"/><strong>{draft.businessName||'Business Name'}</strong><span>{draft.phone||'Phone number'}</span><small>{draft.address||'Business address'}</small><div className="mini-invoice"><div><span>INVOICE</span><strong>{draft.invoicePrefix||'INV'}-0001</strong></div><div className="mini-line"/><div className="mini-line short"/><div className="mini-total"><span>Grand Total</span><strong>₹12,450.00</strong></div></div></Card></aside>
    </div>

  </motion.div>
}

export default function App() {
  const [view,setView]=useState('dashboard')
  const [settings,setSettings]=useState(()=>storage.getSettings())
  const [invoices,setInvoices]=useState(()=>storage.getInvoices())
  const [parts,setParts]=useState(()=>storage.getParts(DEFAULT_PARTS))
  const [invoice,setInvoice]=useState(()=>storage.getDraft() || blankInvoice(storage.getSettings(), storage.getInvoices()))
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const [toast,showToast]=useToast()
  const appInstall=useInstallPrompt()

  const saveInvoice=(inv)=>{
    const error=invoiceError(inv);if(error)return showToast(error,'error')
    const now=new Date().toISOString(); const saved={...inv,savedAt:now}
    const exists=invoices.some(i=>i.id===saved.id); const next=exists?invoices.map(i=>i.id===saved.id?saved:i):[saved,...invoices]
    setInvoices(next);storage.saveInvoices(next);setInvoice(saved);storage.clearDraft();showToast(exists?'Invoice updated':'Invoice saved successfully')
  }
  const newBlank=()=>{const next=blankInvoice(settings,invoices);setInvoice(next);storage.clearDraft();showToast('Blank invoice ready')}
  const editInvoice=(inv)=>{setInvoice({...inv});setView('invoice')}
  const deleteInvoice=(id)=>{if(!confirm('Delete this invoice permanently?'))return;const next=invoices.filter(i=>i.id!==id);setInvoices(next);storage.saveInvoices(next);showToast('Invoice deleted')}
  const exportBackup=()=>{const blob=new Blob([JSON.stringify(storage.exportAll(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`smart-billing-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);showToast('Backup exported')}
  const importBackup=(file)=>{if(!file)return;if(file.size>5*1024*1024)return showToast('Backup file is too large','error');if(!confirm('Restore this backup? Current settings, parts and invoices may be replaced.'))return;const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);storage.importAll(data);setSettings(storage.getSettings());setInvoices(storage.getInvoices());setParts(storage.getParts(DEFAULT_PARTS));setInvoice(storage.getDraft()||blankInvoice(storage.getSettings(),storage.getInvoices()));showToast('Backup restored')}catch{showToast('Invalid or unsupported backup file','error')}};r.onerror=()=>showToast('Could not read backup file','error');r.readAsText(file)}
  const installApp=async()=>{
    const result=await appInstall.install()
    if(result==='accepted')showToast('App installation started')
    else if(result==='dismissed')showToast('Installation cancelled','info')
    else if(result==='installed')showToast('App is already installed','info')
    else showToast('Chrome menu > Add to Home screen se app install karein','info')
  }

  return <Shell view={view} setView={setView} settings={settings} invoices={invoices} onBackup={exportBackup} onInstall={installApp} installReady={appInstall.ready} installed={appInstall.installed} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
    <AnimatePresence mode="wait">
      <motion.div key={view} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.16}}>
        {view==='dashboard'&&<Dashboard invoices={invoices} settings={settings} setView={setView}/>} 
        {view==='invoice'&&<InvoiceEditor invoice={invoice} setInvoice={setInvoice} parts={parts} settings={settings} invoices={invoices} onSave={saveInvoice} onBlank={newBlank} showToast={showToast}/>} 
        {view==='invoices'&&<InvoicesPage invoices={invoices} onEdit={editInvoice} onDelete={deleteInvoice} showToast={showToast}/>}
        {view==='customers'&&<CustomersPage invoices={invoices}/>} 
        {view==='parts'&&<PartsPage parts={parts} setParts={setParts} showToast={showToast}/>} 
        {view==='settings'&&<SettingsPage settings={settings} setSettings={setSettings} showToast={showToast} onImport={importBackup}/>} 
      </motion.div>
    </AnimatePresence>
    <AnimatePresence>{toast&&<motion.div className={`toast toast-${toast.tone}`} initial={{opacity:0,y:22,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16}}>{toast.tone==='error'?<X size={19}/>:<CheckCircle2 size={19}/>}<span>{toast.message}</span></motion.div>}</AnimatePresence>
  </Shell>
}
