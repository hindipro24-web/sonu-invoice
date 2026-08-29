(() => {
  'use strict';

  const KEYS = {
    invoices: 'spb_pro_invoices_v1',
    settings: 'spb_pro_settings_v1',
    sequence: 'spb_pro_sequence_v1',
    draft: 'spb_pro_draft_v1',
    customParts: 'spb_pro_custom_parts_v1',
    rates: 'spb_pro_rate_overrides_v1',
    automation: 'spb_pro_automation_v1'
  };

  const DEFAULT_SETTINGS = {
    businessName: 'Smart Parts Billing', businessPhone: '', businessAddress: '',
    invoicePrefix: 'INV', defaultDueDays: 7, footerNote: 'Thank you for your business.',
    paymentDetails: '', logo: '',
    reminderTemplate: 'Hi {name}, reminder for invoice {invoice}. Pending amount: {amount}. Due date: {due}. Thank you.'
  };
  const DEFAULT_AUTOMATION = { autoDraft: true, dueReminder: true, webhook: false, webhookUrl: '' };

  let invoices = readJSON(KEYS.invoices, []);
  let settings = { ...DEFAULT_SETTINGS, ...readJSON(KEYS.settings, {}) };
  let automation = { ...DEFAULT_AUTOMATION, ...readJSON(KEYS.automation, {}) };
  let customParts = readJSON(KEYS.customParts, []);
  let rateOverrides = readJSON(KEYS.rates, {});
  let currentItems = [];
  let currentInvoiceId = null;
  let draftTimer = null;
  let previewBlobUrl = null;
  let customContext = 'invoice';

  const $ = id => document.getElementById(id);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  const els = {
    sidebar: $('sidebar'), mobileMenuBtn: $('mobileMenuBtn'),
    viewEyebrow: $('viewEyebrow'), viewTitle: $('viewTitle'),
    sidebarBusinessName: $('sidebarBusinessName'), sidebarLogo: $('sidebarLogo'), sidebarLogoFallback: $('sidebarLogoFallback'),
    summaryLogo: $('summaryLogo'), summaryLogoFallback: $('summaryLogoFallback'), summaryBusinessName: $('summaryBusinessName'),
    settingsLogoPreview: $('settingsLogoPreview'), settingsLogoFallback: $('settingsLogoFallback'),
    invoiceNoTop: $('invoiceNoTop'), summaryInvoiceNo: $('summaryInvoiceNo'),
    customerName: $('customerName'), customerPhone: $('customerPhone'), customerAddress: $('customerAddress'),
    invoiceDate: $('invoiceDate'), dueDate: $('dueDate'), paymentStatus: $('paymentStatus'), referenceNo: $('referenceNo'),
    partSearch: $('partSearch'), partResults: $('partResults'), itemsList: $('itemsList'), emptyItems: $('emptyItems'),
    discount: $('discount'), otherCharges: $('otherCharges'), invoiceNote: $('invoiceNote'),
    itemCount: $('itemCount'), subtotal: $('subtotal'), discountSummary: $('discountSummary'), chargesSummary: $('chargesSummary'), grandTotal: $('grandTotal'),
    saveBtn: $('saveBtn'), shareBtn: $('shareBtn'), previewBtn: $('previewBtn'), downloadBtn: $('downloadBtn'), newBillBtn: $('newBillBtn'),
    customModal: $('customModal'), customPartNo: $('customPartNo'), customDescription: $('customDescription'), customUnit: $('customUnit'), customRate: $('customRate'), saveCustomToMaster: $('saveCustomToMaster'),
    invoiceSearch: $('invoiceSearch'), invoiceStatusFilter: $('invoiceStatusFilter'), invoiceTableBody: $('invoiceTableBody'), invoiceEmpty: $('invoiceEmpty'),
    customerSearch: $('customerSearch'), customerGrid: $('customerGrid'), customerEmpty: $('customerEmpty'),
    catalogSearch: $('catalogSearch'), partsTableBody: $('partsTableBody'), partsCountChip: $('partsCountChip'),
    autoDraftToggle: $('autoDraftToggle'), dueReminderToggle: $('dueReminderToggle'), webhookToggle: $('webhookToggle'), webhookUrl: $('webhookUrl'), reminderList: $('reminderList'), reminderEmpty: $('reminderEmpty'), reminderCountChip: $('reminderCountChip'),
    businessName: $('businessName'), businessPhone: $('businessPhone'), businessAddress: $('businessAddress'), invoicePrefix: $('invoicePrefix'), defaultDueDays: $('defaultDueDays'), footerNote: $('footerNote'), paymentDetails: $('paymentDetails'), reminderTemplate: $('reminderTemplate'), logoUpload: $('logoUpload'),
    pdfPreviewModal: $('pdfPreviewModal'), pdfPreviewFrame: $('pdfPreviewFrame'), previewTitle: $('previewTitle'), toast: $('toast')
  };

  const VIEW_META = {
    dashboard: ['OVERVIEW','Dashboard'], invoice: ['BILLING','New Invoice'], invoices: ['RECORDS','Invoices'],
    customers: ['CRM','Customers'], parts: ['MASTER DATA','Parts Master'], automation: ['WORKFLOW','Automation Center'], settings: ['WORKSPACE','Settings']
  };

  function readJSON(key, fallback){ try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function esc(value=''){ return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function num(value){ const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function money(value, decimals=2){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(num(value)); }
  function compactMoney(value){ const n=num(value); if(n>=10000000) return `₹${(n/10000000).toFixed(1)}Cr`; if(n>=100000) return `₹${(n/100000).toFixed(1)}L`; if(n>=1000) return `₹${(n/1000).toFixed(1)}K`; return `₹${n.toFixed(0)}`; }
  function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function addDaysISO(dateStr, days){ const d=new Date(`${dateStr || todayISO()}T12:00:00`); d.setDate(d.getDate()+Number(days||0)); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function formatDate(dateStr){ if(!dateStr) return '—'; const d=new Date(`${dateStr}T12:00:00`); return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
  function diffDays(dateStr){ if(!dateStr) return 9999; const a=new Date(`${todayISO()}T00:00:00`); const b=new Date(`${dateStr}T00:00:00`); return Math.ceil((b-a)/86400000); }
  function toast(msg){ els.toast.textContent=msg; els.toast.classList.add('show'); clearTimeout(toast._t); toast._t=setTimeout(()=>els.toast.classList.remove('show'),2600); }
  function uid(prefix='id'){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
  function initials(name){ const p=String(name||'SP').trim().split(/\s+/).filter(Boolean); return ((p[0]?.[0]||'S')+(p[1]?.[0]||'P')).toUpperCase(); }
  function normalizePhone(phone){ let d=String(phone||'').replace(/\D/g,''); if(d.length===10) d='91'+d; return d; }

  function nextInvoiceNo(){ const seq = Number(localStorage.getItem(KEYS.sequence)||1); const prefix=(settings.invoicePrefix||'INV').trim().toUpperCase()||'INV'; return `${prefix}-${String(seq).padStart(4,'0')}`; }
  function bumpSequence(){ const seq = Number(localStorage.getItem(KEYS.sequence)||1); localStorage.setItem(KEYS.sequence,String(seq+1)); }

  function basePartKey(part){ return part._key || `base:${part.id}`; }
  function masterParts(){
    const base=(window.PARTS||[]).map(p=>({...p,_key:`base:${p.id}`,rate:rateOverrides[`base:${p.id}`] ?? p.rate,custom:false}));
    const custom=customParts.map(p=>({...p,rate:rateOverrides[p._key] ?? p.rate,custom:true}));
    return [...base,...custom];
  }

  function currentInvoiceNo(){ return els.invoiceNoTop.textContent.trim(); }
  function totals(){ const subtotal=currentItems.reduce((s,i)=>s+num(i.qty)*num(i.rate),0); const discount=Math.max(0,num(els.discount.value)); const charges=Math.max(0,num(els.otherCharges.value)); return {subtotal,discount,charges,total:Math.max(0,subtotal-discount+charges)}; }
  function effectiveStatus(inv){ if(inv.paymentStatus==='Paid') return 'Paid'; if(inv.dueDate && diffDays(inv.dueDate)<0) return 'Overdue'; return inv.paymentStatus || 'Unpaid'; }
  function statusClass(status){ return String(status).toLowerCase().replace(/\s+/g,'-'); }

  function navigate(view){
    if(!VIEW_META[view]) view='dashboard';
    $$('.view').forEach(v=>v.classList.remove('active-view'));
    $(`${view}View`)?.classList.add('active-view');
    $$('.side-link[data-view],.mobile-nav[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    els.viewEyebrow.textContent=VIEW_META[view][0]; els.viewTitle.textContent=VIEW_META[view][1];
    els.sidebar.classList.remove('open');
    if(view==='dashboard') renderDashboard();
    if(view==='invoices') renderInvoices();
    if(view==='customers') renderCustomers();
    if(view==='parts') renderParts();
    if(view==='automation') renderAutomation();
    if(view==='settings') loadSettingsForm();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function updateBrand(){
    const name=settings.businessName || 'Smart Parts Billing';
    els.sidebarBusinessName.textContent=name; els.summaryBusinessName.textContent=name;
    const fallback=initials(name);
    [els.sidebarLogoFallback,els.summaryLogoFallback,els.settingsLogoFallback].forEach(el=>el.textContent=fallback);
    [[els.sidebarLogo,els.sidebarLogoFallback],[els.summaryLogo,els.summaryLogoFallback],[els.settingsLogoPreview,els.settingsLogoFallback]].forEach(([img,fb])=>{
      if(settings.logo){ img.src=settings.logo; img.hidden=false; fb.hidden=true; } else { img.hidden=true; img.removeAttribute('src'); fb.hidden=false; }
    });
  }

  function newInvoice({keepDraft=false}={}){
    currentInvoiceId=null; currentItems=[];
    const invNo=nextInvoiceNo(); els.invoiceNoTop.textContent=invNo; els.summaryInvoiceNo.textContent=invNo;
    els.customerName.value=''; els.customerPhone.value=''; els.customerAddress.value=''; els.invoiceDate.value=todayISO();
    els.dueDate.value=addDaysISO(todayISO(),settings.defaultDueDays); els.paymentStatus.value='Unpaid'; els.referenceNo.value='';
    els.discount.value='0'; els.otherCharges.value='0'; els.invoiceNote.value=''; els.partSearch.value='';
    if(!keepDraft) localStorage.removeItem(KEYS.draft);
    renderItems(); updateSummary(); scheduleDraft();
  }

  function collectInvoice(){
    const t=totals();
    return {
      id: currentInvoiceId || uid('inv'), invoiceNo: currentInvoiceNo(), date: els.invoiceDate.value || todayISO(), dueDate: els.dueDate.value || '',
      customer:{name:els.customerName.value.trim(),phone:els.customerPhone.value.trim(),address:els.customerAddress.value.trim()},
      items: currentItems.map(i=>({...i,qty:num(i.qty),rate:num(i.rate)})), discount:t.discount, otherCharges:t.charges,
      paymentStatus:els.paymentStatus.value, referenceNo:els.referenceNo.value.trim(), note:els.invoiceNote.value.trim(),
      subtotal:t.subtotal,total:t.total, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()
    };
  }

  function invoiceValid(inv, silent=false){
    if(!inv.customer.name){ if(!silent) toast('Customer name required'); return false; }
    if(!inv.items.length){ if(!silent) toast('At least one item add karo'); return false; }
    return true;
  }

  async function saveInvoice(){
    const inv=collectInvoice(); if(!invoiceValid(inv)) return null;
    const existingIndex=invoices.findIndex(x=>x.id===inv.id);
    if(existingIndex>=0){ inv.createdAt=invoices[existingIndex].createdAt; invoices[existingIndex]=inv; }
    else { invoices.unshift(inv); currentInvoiceId=inv.id; bumpSequence(); }
    saveJSON(KEYS.invoices,invoices); localStorage.removeItem(KEYS.draft); refreshCounts(); renderDashboard();
    toast(existingIndex>=0?'Invoice updated':'Invoice saved successfully');
    if(automation.webhook && automation.webhookUrl) sendWebhook(inv,false);
    return inv;
  }

  function openInvoice(id){
    const inv=invoices.find(x=>x.id===id); if(!inv) return;
    currentInvoiceId=inv.id; els.invoiceNoTop.textContent=inv.invoiceNo; els.summaryInvoiceNo.textContent=inv.invoiceNo;
    els.customerName.value=inv.customer?.name||''; els.customerPhone.value=inv.customer?.phone||''; els.customerAddress.value=inv.customer?.address||'';
    els.invoiceDate.value=inv.date||todayISO(); els.dueDate.value=inv.dueDate||''; els.paymentStatus.value=inv.paymentStatus||'Unpaid'; els.referenceNo.value=inv.referenceNo||'';
    els.discount.value=String(inv.discount||0); els.otherCharges.value=String(inv.otherCharges||0); els.invoiceNote.value=inv.note||'';
    currentItems=(inv.items||[]).map(i=>({...i})); renderItems(); updateSummary(); navigate('invoice');
  }

  function renderItems(){
    els.itemsList.innerHTML=''; els.emptyItems.hidden=currentItems.length>0;
    currentItems.forEach((item,index)=>{
      const row=document.createElement('div'); row.className='item-row';
      row.innerHTML=`<div class="item-info"><strong>${esc(item.partNo||'CUSTOM')}</strong><span>${esc(item.description||'Custom item')} • ${esc(item.unit||'PCS')}</span></div>
      <div class="qty-control"><button data-act="minus" aria-label="Decrease quantity">−</button><input data-act="qty" type="number" min="0.01" step="0.01" value="${num(item.qty)||1}"><button data-act="plus" aria-label="Increase quantity">+</button></div>
      <input class="rate-input" data-act="rate" type="number" min="0" step="0.01" value="${num(item.rate).toFixed(2)}">
      <div class="item-amount">${money(num(item.qty)*num(item.rate))}</div><button class="remove-btn" data-act="remove" aria-label="Remove item">✕</button>`;
      row.addEventListener('click',e=>{ const act=e.target.dataset.act; if(!act) return; if(act==='minus'){item.qty=Math.max(.01,num(item.qty)-1);renderItems();} if(act==='plus'){item.qty=num(item.qty)+1;renderItems();} if(act==='remove'){currentItems.splice(index,1);renderItems();} updateSummary();scheduleDraft(); });
      row.querySelector('[data-act="qty"]').addEventListener('input',e=>{item.qty=Math.max(.01,num(e.target.value));row.querySelector('.item-amount').textContent=money(item.qty*num(item.rate));updateSummary();scheduleDraft();});
      row.querySelector('[data-act="rate"]').addEventListener('input',e=>{item.rate=Math.max(0,num(e.target.value));row.querySelector('.item-amount').textContent=money(num(item.qty)*item.rate);updateSummary();scheduleDraft();});
      els.itemsList.appendChild(row);
    });
    updateSummary();
  }

  function addPart(part){
    const key=basePartKey(part); const existing=currentItems.find(i=>i._key===key);
    if(existing) existing.qty=num(existing.qty)+1; else currentItems.push({_key:key,partNo:part.partNo,description:part.description,unit:part.unit,rate:num(part.rate),qty:1});
    els.partSearch.value=''; els.partResults.hidden=true; renderItems(); scheduleDraft();
  }

  function renderPartSearch(){
    const q=els.partSearch.value.trim().toLowerCase(); if(!q){els.partResults.hidden=true;return;}
    const hits=masterParts().filter(p=>`${p.partNo} ${p.description} ${p.unit}`.toLowerCase().includes(q)).slice(0,10);
    els.partResults.innerHTML=hits.length?hits.map(p=>`<button class="result-row" data-key="${esc(p._key)}"><span class="result-main"><strong>${esc(p.partNo)}</strong><span>${esc(p.description)} • ${esc(p.unit)}</span></span><span class="result-rate"><strong>${money(p.rate)}</strong><span>tap to add</span></span></button>`).join(''):`<div class="empty-state compact-empty"><strong>No part found</strong><span>Custom Item use kar sakte ho.</span></div>`;
    els.partResults.hidden=false; $$('.result-row').forEach(b=>b.addEventListener('click',()=>{const p=masterParts().find(x=>x._key===b.dataset.key);if(p)addPart(p)}));
  }

  function updateSummary(){ const t=totals(); els.itemCount.textContent=String(currentItems.length); els.subtotal.textContent=money(t.subtotal); els.discountSummary.textContent=`− ${money(t.discount)}`; els.chargesSummary.textContent=money(t.charges); els.grandTotal.textContent=money(t.total); }

  function scheduleDraft(){
    if(!automation.autoDraft) return;
    clearTimeout(draftTimer); draftTimer=setTimeout(()=>{
      const draft=collectInvoice(); draft.isDraft=true; saveJSON(KEYS.draft,draft); const a=$('autosaveText'); if(a){a.textContent='Draft saved just now';setTimeout(()=>a.textContent='Auto-draft enabled',1300)}
    },650);
  }

  function restoreDraft(){
    const d=readJSON(KEYS.draft,null); if(!d || !automation.autoDraft) return false;
    const meaningful=d.customer?.name || d.items?.length || d.note; if(!meaningful) return false;
    currentInvoiceId=null; els.invoiceNoTop.textContent=d.invoiceNo||nextInvoiceNo(); els.summaryInvoiceNo.textContent=d.invoiceNo||nextInvoiceNo();
    els.customerName.value=d.customer?.name||''; els.customerPhone.value=d.customer?.phone||''; els.customerAddress.value=d.customer?.address||''; els.invoiceDate.value=d.date||todayISO(); els.dueDate.value=d.dueDate||addDaysISO(todayISO(),settings.defaultDueDays);
    els.paymentStatus.value=d.paymentStatus||'Unpaid'; els.referenceNo.value=d.referenceNo||''; els.discount.value=String(d.discount||0); els.otherCharges.value=String(d.otherCharges||0); els.invoiceNote.value=d.note||''; currentItems=(d.items||[]).map(i=>({...i})); renderItems(); updateSummary(); return true;
  }

  function renderDashboard(){
    const totalBilled=invoices.reduce((s,i)=>s+num(i.total),0); const unpaid=invoices.filter(i=>i.paymentStatus!=='Paid').reduce((s,i)=>s+num(i.total),0);
    const now=new Date(); const monthInv=invoices.filter(i=>{const d=new Date(`${i.date}T12:00:00`);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}); const monthTotal=monthInv.reduce((s,i)=>s+num(i.total),0);
    $('metricInvoices').textContent=invoices.length; $('metricRevenue').textContent=compactMoney(totalBilled); $('metricUnpaid').textContent=compactMoney(unpaid); $('metricMonth').textContent=compactMoney(monthTotal); $('metricMonthHint').textContent=`${monthInv.length} invoice${monthInv.length===1?'':'s'}`;
    $('metricInvoiceHint').textContent=invoices.length?`${invoices.filter(i=>i.paymentStatus==='Paid').length} paid`:'No bills yet'; $('metricUnpaidHint').textContent=unpaid?'Payment follow-up needed':'Nothing pending'; $('invoiceNavCount').textContent=invoices.length;
    const recent=invoices.slice(0,6); $('recentInvoices').innerHTML=recent.map(inv=>`<div class="recent-row"><div><strong>${esc(inv.invoiceNo)}</strong><span>${formatDate(inv.date)}</span></div><div><strong>${esc(inv.customer?.name||'—')}</strong><span>${esc(inv.customer?.phone||'No mobile')}</span></div><span class="status-badge ${statusClass(effectiveStatus(inv))}">${esc(effectiveStatus(inv))}</span><strong class="amount-text">${money(inv.total)}</strong></div>`).join(''); $('recentEmpty').hidden=recent.length>0;
    renderDuePreview();
  }

  function dueInvoices(){ if(!automation.dueReminder) return []; return invoices.filter(i=>i.paymentStatus!=='Paid' && i.dueDate && diffDays(i.dueDate)<=3).sort((a,b)=>diffDays(a.dueDate)-diffDays(b.dueDate)); }
  function renderDuePreview(){ const due=dueInvoices().slice(0,3); $('duePreview').innerHTML=due.length?due.map(i=>`<div class="due-mini"><div><strong>${esc(i.invoiceNo)} • ${esc(i.customer?.name||'Customer')}</strong><span>${diffDays(i.dueDate)<0?`${Math.abs(diffDays(i.dueDate))} day overdue`:`Due ${formatDate(i.dueDate)}`}</span></div><b>${money(i.total)}</b></div>`).join(''):`<div class="due-mini"><div><strong>No payment alerts</strong><span>All current invoices are clear.</span></div><b>✓</b></div>`; }

  function renderInvoices(){
    const q=(els.invoiceSearch.value||'').trim().toLowerCase(), f=els.invoiceStatusFilter.value||'All';
    const rows=invoices.filter(i=>{const st=effectiveStatus(i);const text=`${i.invoiceNo} ${i.customer?.name||''} ${i.customer?.phone||''}`.toLowerCase();return (!q||text.includes(q))&&(f==='All'||st===f)});
    els.invoiceTableBody.innerHTML=rows.map(i=>`<tr><td><strong>${esc(i.invoiceNo)}</strong><small>${i.items?.length||0} items</small></td><td><strong>${esc(i.customer?.name||'—')}</strong><small>${esc(i.customer?.phone||'No mobile')}</small></td><td><strong>${formatDate(i.date)}</strong><small>Due ${formatDate(i.dueDate)}</small></td><td><span class="status-badge ${statusClass(effectiveStatus(i))}">${esc(effectiveStatus(i))}</span></td><td class="num"><strong>${money(i.total)}</strong></td><td><div class="row-actions"><button class="tiny-btn" data-open="${i.id}">Open</button><button class="tiny-btn" data-pdf="${i.id}">PDF</button><button class="tiny-btn danger" data-del="${i.id}">Delete</button></div></td></tr>`).join('');
    els.invoiceEmpty.hidden=rows.length>0;
    $$('[data-open]').forEach(b=>b.addEventListener('click',()=>openInvoice(b.dataset.open)));
    $$('[data-pdf]').forEach(b=>b.addEventListener('click',()=>downloadInvoiceById(b.dataset.pdf)));
    $$('[data-del]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Delete this invoice?')){invoices=invoices.filter(x=>x.id!==b.dataset.del);saveJSON(KEYS.invoices,invoices);refreshCounts();renderInvoices();renderDashboard();toast('Invoice deleted')}}));
  }

  function customerRecords(){
    const map=new Map(); invoices.forEach(i=>{const name=(i.customer?.name||'Unknown').trim();const phone=(i.customer?.phone||'').trim();const key=(phone||name.toLowerCase());if(!map.has(key))map.set(key,{name,phone,address:i.customer?.address||'',count:0,total:0,last:i.date});const c=map.get(key);c.count++;c.total+=num(i.total);if((i.date||'')>(c.last||''))c.last=i.date;}); return [...map.values()].sort((a,b)=>(b.last||'').localeCompare(a.last||''));
  }
  function renderCustomers(){
    const all=customerRecords(), q=(els.customerSearch.value||'').trim().toLowerCase(); const rows=all.filter(c=>`${c.name} ${c.phone} ${c.address}`.toLowerCase().includes(q)); $('customerCount').textContent=all.length; $('repeatCustomerCount').textContent=all.filter(c=>c.count>=2).length;
    els.customerGrid.innerHTML=rows.map(c=>`<article class="customer-card"><div class="customer-avatar">${esc(initials(c.name))}</div><strong>${esc(c.name)}</strong><span>${esc(c.phone||'No mobile')}</span><span>${esc(c.address||'No address saved')}</span><div class="customer-stats"><div><span>Invoices</span><strong>${c.count}</strong></div><div><span>Total billed</span><strong>${compactMoney(c.total)}</strong></div></div></article>`).join(''); els.customerEmpty.hidden=rows.length>0;
  }

  function renderParts(){
    const q=(els.catalogSearch.value||'').trim().toLowerCase(); const parts=masterParts().filter(p=>`${p.partNo} ${p.description} ${p.unit}`.toLowerCase().includes(q)); els.partsCountChip.textContent=`${masterParts().length} parts`;
    els.partsTableBody.innerHTML=parts.map(p=>`<tr><td><strong>${esc(p.partNo)}</strong><small>${p.custom?'Custom':'Master'}</small></td><td>${esc(p.description)}</td><td>${esc(p.unit)}</td><td class="num"><input class="catalog-rate-input" type="number" min="0" step="0.01" value="${num(p.rate).toFixed(2)}" data-rate-key="${esc(p._key)}"></td><td><div class="row-actions"><button class="tiny-btn" data-add-key="${esc(p._key)}">+ Bill</button>${p.custom?`<button class="tiny-btn danger" data-part-del="${esc(p._key)}">Delete</button>`:''}</div></td></tr>`).join('');
    $$('[data-rate-key]').forEach(inp=>inp.addEventListener('change',()=>{rateOverrides[inp.dataset.rateKey]=Math.max(0,num(inp.value));saveJSON(KEYS.rates,rateOverrides);toast('Rate updated')}));
    $$('[data-add-key]').forEach(b=>b.addEventListener('click',()=>{const p=masterParts().find(x=>x._key===b.dataset.addKey);if(p){addPart(p);navigate('invoice');toast('Part added to invoice')}}));
    $$('[data-part-del]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Delete custom part?')){customParts=customParts.filter(x=>x._key!==b.dataset.partDel);saveJSON(KEYS.customParts,customParts);delete rateOverrides[b.dataset.partDel];saveJSON(KEYS.rates,rateOverrides);renderParts()}}));
  }

  function renderAutomation(){
    els.autoDraftToggle.checked=!!automation.autoDraft; els.dueReminderToggle.checked=!!automation.dueReminder; els.webhookToggle.checked=!!automation.webhook; els.webhookUrl.value=automation.webhookUrl||'';
    const activeCount=[automation.autoDraft,automation.dueReminder,automation.webhook].filter(Boolean).length; $('automationScore').textContent=String(activeCount);
    const due=dueInvoices(); els.reminderCountChip.textContent=`${due.length} pending`; els.reminderEmpty.hidden=due.length>0;
    els.reminderList.innerHTML=due.map(i=>`<div class="reminder-row"><div><strong>${esc(i.customer?.name||'Customer')} • ${esc(i.invoiceNo)}</strong><span>${diffDays(i.dueDate)<0?`${Math.abs(diffDays(i.dueDate))} day overdue`:`Due in ${diffDays(i.dueDate)} day`} • ${formatDate(i.dueDate)}</span><div class="reminder-actions"><button class="tiny-btn" data-rem-open="${i.id}">Open</button><button class="tiny-btn" data-rem-wa="${i.id}">WhatsApp</button></div></div><strong class="reminder-amount">${money(i.total)}</strong></div>`).join('');
    $$('[data-rem-open]').forEach(b=>b.addEventListener('click',()=>openInvoice(b.dataset.remOpen))); $$('[data-rem-wa]').forEach(b=>b.addEventListener('click',()=>sendReminder(b.dataset.remWa)));
  }

  function saveAutomation(){ automation={autoDraft:els.autoDraftToggle.checked,dueReminder:els.dueReminderToggle.checked,webhook:els.webhookToggle.checked,webhookUrl:els.webhookUrl.value.trim()};saveJSON(KEYS.automation,automation);renderAutomation();renderDashboard();$('autosaveText').textContent=automation.autoDraft?'Auto-draft enabled':'Auto-draft disabled'; }

  function sendReminder(id){ const inv=invoices.find(i=>i.id===id); if(!inv)return; const phone=normalizePhone(inv.customer?.phone); if(!phone){toast('Customer mobile missing');return;} const msg=(settings.reminderTemplate||DEFAULT_SETTINGS.reminderTemplate).replaceAll('{name}',inv.customer?.name||'').replaceAll('{invoice}',inv.invoiceNo).replaceAll('{amount}',money(inv.total)).replaceAll('{due}',formatDate(inv.dueDate)); window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener'); }

  async function sendWebhook(inv,test=false){
    const url=(els.webhookUrl?.value||automation.webhookUrl||'').trim(); if(!url){toast('Webhook URL add karo');return false;}
    const payload=test?{event:'smart_billing_test',time:new Date().toISOString(),source:'Smart Parts Billing Pro'}:{event:'invoice.saved',invoice:inv,source:'Smart Parts Billing Pro',sentAt:new Date().toISOString()};
    try{ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error(`HTTP ${r.status}`); toast(test?'Webhook test successful':'Webhook automation sent');return true; }
    catch(err){
      try{ await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload)});toast(test?'Webhook request sent (no-CORS mode)':'Webhook request sent');return true; }
      catch{ toast('Webhook failed — URL/CORS check karo');return false; }
    }
  }

  function loadSettingsForm(){ els.businessName.value=settings.businessName||'';els.businessPhone.value=settings.businessPhone||'';els.businessAddress.value=settings.businessAddress||'';els.invoicePrefix.value=settings.invoicePrefix||'INV';els.defaultDueDays.value=settings.defaultDueDays??7;els.footerNote.value=settings.footerNote||'';els.paymentDetails.value=settings.paymentDetails||'';els.reminderTemplate.value=settings.reminderTemplate||DEFAULT_SETTINGS.reminderTemplate;updateBrand(); }
  function saveSettings(){
    settings={...settings,businessName:els.businessName.value.trim()||'Smart Parts Billing',businessPhone:els.businessPhone.value.trim(),businessAddress:els.businessAddress.value.trim(),invoicePrefix:(els.invoicePrefix.value.trim()||'INV').toUpperCase(),defaultDueDays:Math.max(0,num(els.defaultDueDays.value)),footerNote:els.footerNote.value.trim(),paymentDetails:els.paymentDetails.value.trim(),reminderTemplate:els.reminderTemplate.value.trim()||DEFAULT_SETTINGS.reminderTemplate}; saveJSON(KEYS.settings,settings); updateBrand(); toast('Settings saved'); if(!currentInvoiceId && currentItems.length===0){const n=nextInvoiceNo();els.invoiceNoTop.textContent=n;els.summaryInvoiceNo.textContent=n;}
  }

  function resizeLogo(file){ return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=360,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);resolve(c.toDataURL('image/png',.92));};img.onerror=reject;img.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);}); }

  function openCustomModal(context='invoice'){ customContext=context; els.customPartNo.value='';els.customDescription.value='';els.customUnit.value='';els.customRate.value='0';els.saveCustomToMaster.checked=true;els.saveCustomToMaster.closest('label').style.display=context==='master'?'none':''; $('addCustomItemBtn').textContent=context==='master'?'Save Part':'Add Item'; els.customModal.hidden=false;setTimeout(()=>els.customPartNo.focus(),50); }
  function closeCustomModal(){ els.customModal.hidden=true; }
  function addCustomItem(){ const partNo=els.customPartNo.value.trim()||'CUSTOM';const description=els.customDescription.value.trim();if(!description){toast('Description required');return;}const p={_key:uid('custom'),id:Date.now(),partNo,description,unit:els.customUnit.value.trim()||'PCS',rate:Math.max(0,num(els.customRate.value)),custom:true};if(customContext==='master'){customParts.unshift(p);saveJSON(KEYS.customParts,customParts);closeCustomModal();renderParts();toast('Part saved to master');return;}if(els.saveCustomToMaster.checked){customParts.unshift(p);saveJSON(KEYS.customParts,customParts)}addPart(p);closeCustomModal();toast('Custom item added'); }

  function invoiceForPDF(invOverride=null){ const inv=invOverride||collectInvoice(); if(!invoiceValid(inv)) return null; return inv; }

  function getJsPDF(){ return window.jspdf?.jsPDF || null; }
  function fitText(doc,text,maxWidth){ const lines=doc.splitTextToSize(String(text||''),maxWidth); return lines.slice(0,2); }
  function addPdfPageBase(doc, pageNo, invoiceNo){
    const W=210; doc.setFillColor(12,35,57);doc.rect(0,0,W,8,'F');doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(120,132,144);doc.text(`Page ${pageNo}`,198,291,{align:'right'});doc.text(`${invoiceNo} • Smart Parts Billing Pro`,12,291);doc.setDrawColor(226,232,238);doc.line(12,286,198,286);
  }
  function drawTableHeader(doc,y){
    doc.setFillColor(238,243,248);doc.roundedRect(12,y,186,8,1.4,1.4,'F');doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.setTextColor(75,91,106);
    doc.text('#',15,y+5.2);doc.text('PART NO.',22,y+5.2);doc.text('DESCRIPTION',63,y+5.2);doc.text('QTY',145,y+5.2,{align:'right'});doc.text('RATE',169,y+5.2,{align:'right'});doc.text('AMOUNT',195,y+5.2,{align:'right'});return y+10;
  }
  function buildPDF(invOverride=null){
    const inv=invoiceForPDF(invOverride); if(!inv)return null; const JsPDF=getJsPDF(); if(!JsPDF){toast('PDF library load nahi hui. Internet check karo.');return null;}
    const doc=new JsPDF({unit:'mm',format:'a4',compress:true}); let pageNo=1; addPdfPageBase(doc,pageNo,inv.invoiceNo);
    // Header
    if(settings.logo){ try{const fmt=settings.logo.includes('image/jpeg')?'JPEG':'PNG';doc.addImage(settings.logo,fmt,12,14,18,18,undefined,'FAST')}catch{} }
    const brandX=settings.logo?34:12; doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(18,52,80);doc.text(String(settings.businessName||'Smart Parts Billing').slice(0,38),brandX,19);
    doc.setFont('helvetica','normal');doc.setFontSize(7.8);doc.setTextColor(92,108,123);if(settings.businessPhone)doc.text(settings.businessPhone,brandX,24);if(settings.businessAddress){const addr=doc.splitTextToSize(settings.businessAddress,92).slice(0,2);doc.text(addr,brandX,28)}
    doc.setFont('helvetica','bold');doc.setFontSize(19);doc.setTextColor(15,50,80);doc.text('INVOICE',198,19,{align:'right'});doc.setFontSize(7.5);doc.setTextColor(112,126,139);doc.text('NON-GST • ORIGINAL DOCUMENT',198,24,{align:'right'});doc.setFontSize(10);doc.setTextColor(28,73,111);doc.text(inv.invoiceNo,198,30,{align:'right'});
    doc.setDrawColor(224,230,236);doc.line(12,39,198,39);
    // Customer/meta
    doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(117,130,142);doc.text('BILL TO',12,46);doc.text('INVOICE DETAILS',128,46);
    doc.setFontSize(10.5);doc.setTextColor(27,41,53);doc.text(String(inv.customer?.name||'Customer').slice(0,45),12,52);
    doc.setFont('helvetica','normal');doc.setFontSize(7.7);doc.setTextColor(85,100,114);let cy=57;if(inv.customer?.phone){doc.text(inv.customer.phone,12,cy);cy+=4.5}if(inv.customer?.address){doc.text(doc.splitTextToSize(inv.customer.address,98).slice(0,2),12,cy)}
    doc.setFont('helvetica','normal');doc.setFontSize(7.6);doc.setTextColor(88,102,116);doc.text('Invoice date',128,52);doc.text(formatDate(inv.date),198,52,{align:'right'});doc.text('Due date',128,57);doc.text(formatDate(inv.dueDate),198,57,{align:'right'});doc.text('Payment',128,62);doc.text(inv.paymentStatus||'Unpaid',198,62,{align:'right'});if(inv.referenceNo){doc.text('Reference',128,67);doc.text(String(inv.referenceNo).slice(0,25),198,67,{align:'right'})}
    let y=76; y=drawTableHeader(doc,y);
    doc.setFont('helvetica','normal');doc.setFontSize(7.6);
    inv.items.forEach((item,idx)=>{
      const descLines=fitText(doc,item.description||'',70); const rowH=Math.max(8,descLines.length*3.6+3.2);
      if(y+rowH>265){pageNo++;doc.addPage();addPdfPageBase(doc,pageNo,inv.invoiceNo);y=16;y=drawTableHeader(doc,y);}
      if(idx%2===1){doc.setFillColor(249,251,253);doc.rect(12,y-1,186,rowH,'F')}
      doc.setTextColor(92,106,119);doc.text(String(idx+1),15,y+4.5);doc.setTextColor(31,47,61);doc.setFont('helvetica','bold');doc.text(String(item.partNo||'CUSTOM').slice(0,22),22,y+4.5);doc.setFont('helvetica','normal');doc.setTextColor(66,82,97);doc.text(descLines,63,y+3.8);
      // Fixed right-aligned numeric columns: RATE is always under RATE; AMOUNT always under AMOUNT.
      doc.setTextColor(33,49,63);doc.text(num(item.qty).toFixed(num(item.qty)%1?2:0),145,y+4.5,{align:'right'});doc.text(num(item.rate).toFixed(2),169,y+4.5,{align:'right'});doc.setFont('helvetica','bold');doc.text((num(item.qty)*num(item.rate)).toFixed(2),195,y+4.5,{align:'right'});doc.setFont('helvetica','normal');
      doc.setDrawColor(235,239,243);doc.line(12,y+rowH-1,198,y+rowH-1);y+=rowH;
    });
    if(y>236){pageNo++;doc.addPage();addPdfPageBase(doc,pageNo,inv.invoiceNo);y=20;}
    const t={subtotal:num(inv.subtotal),discount:num(inv.discount),charges:num(inv.otherCharges),total:num(inv.total)};
    const boxX=126, boxW=72;doc.setFillColor(247,249,251);doc.roundedRect(boxX,y+4,boxW,37,2,2,'F');doc.setFontSize(7.7);doc.setTextColor(93,106,119);doc.text('Subtotal',boxX+5,y+11);doc.text(t.subtotal.toFixed(2),boxX+boxW-5,y+11,{align:'right'});doc.text('Discount',boxX+5,y+17);doc.text(`- ${t.discount.toFixed(2)}`,boxX+boxW-5,y+17,{align:'right'});doc.text('Other charges',boxX+5,y+23);doc.text(t.charges.toFixed(2),boxX+boxW-5,y+23,{align:'right'});doc.setDrawColor(218,225,232);doc.line(boxX+5,y+27,boxX+boxW-5,y+27);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(20,60,93);doc.text('TOTAL',boxX+5,y+35);doc.text(`Rs. ${t.total.toFixed(2)}`,boxX+boxW-5,y+35,{align:'right'});
    doc.setFont('helvetica','normal');doc.setFontSize(7.3);doc.setTextColor(88,102,116);let ny=y+10;if(inv.note){doc.setFont('helvetica','bold');doc.text('NOTE',12,ny);doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize(inv.note,104).slice(0,3),12,ny+5);ny+=17}if(settings.paymentDetails){doc.setFont('helvetica','bold');doc.text('PAYMENT DETAILS',12,ny);doc.setFont('helvetica','normal');doc.text(doc.splitTextToSize(settings.paymentDetails,104).slice(0,3),12,ny+5)}
    doc.setFontSize(7);doc.setTextColor(115,127,138);doc.text(settings.footerNote||'Thank you for your business.',105,279,{align:'center'});
    // Page numbers may have shifted after addPage, update all footer labels.
    const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(7);doc.setTextColor(120,132,144);doc.text(`Page ${p} of ${pages}`,198,291,{align:'right'});}return doc;
  }

  function pdfFilename(inv){ const customer=(inv.customer?.name||'Customer').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,30);return `${inv.invoiceNo}-${customer}.pdf`; }
  function downloadPDF(invOverride=null){ const inv=invoiceForPDF(invOverride);if(!inv)return;const doc=buildPDF(inv);if(doc)doc.save(pdfFilename(inv)); }
  function previewPDF(invOverride=null){ const inv=invoiceForPDF(invOverride);if(!inv)return;const doc=buildPDF(inv);if(!doc)return;if(previewBlobUrl)URL.revokeObjectURL(previewBlobUrl);previewBlobUrl=URL.createObjectURL(doc.output('blob'));els.pdfPreviewFrame.src=previewBlobUrl;els.previewTitle.textContent=inv.invoiceNo;els.pdfPreviewModal.hidden=false; }
  async function sharePDF(invOverride=null){
    const inv=invoiceForPDF(invOverride);if(!inv)return;const doc=buildPDF(inv);if(!doc)return;const blob=doc.output('blob');const file=new File([blob],pdfFilename(inv),{type:'application/pdf'});
    try{if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title:`Invoice ${inv.invoiceNo}`,text:`Invoice ${inv.invoiceNo} • ${money(inv.total)}`,files:[file]});return;}}catch(err){if(err?.name==='AbortError')return;}
    doc.save(pdfFilename(inv)); const phone=normalizePhone(inv.customer?.phone);const msg=`Invoice ${inv.invoiceNo} PDF downloaded. Total ${money(inv.total)}.`;if(phone)window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener');toast('PDF downloaded. Share-sheet supported browser par direct file share hoga.');
  }
  function downloadInvoiceById(id){const inv=invoices.find(x=>x.id===id);if(inv)downloadPDF(inv);}

  function exportBackup(){ const data={app:'Smart Parts Billing Pro',version:1,exportedAt:new Date().toISOString(),settings,automation,invoices,customParts,rateOverrides,sequence:Number(localStorage.getItem(KEYS.sequence)||1)};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`smart-billing-backup-${todayISO()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup exported'); }
  async function importBackup(file){ try{const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.invoices))throw new Error('Invalid');settings={...DEFAULT_SETTINGS,...(data.settings||{})};automation={...DEFAULT_AUTOMATION,...(data.automation||{})};invoices=data.invoices||[];customParts=data.customParts||[];rateOverrides=data.rateOverrides||{};saveJSON(KEYS.settings,settings);saveJSON(KEYS.automation,automation);saveJSON(KEYS.invoices,invoices);saveJSON(KEYS.customParts,customParts);saveJSON(KEYS.rates,rateOverrides);localStorage.setItem(KEYS.sequence,String(data.sequence||1));updateBrand();loadSettingsForm();refreshCounts();renderDashboard();toast('Backup imported successfully');}catch{toast('Invalid backup file');} }

  function refreshCounts(){ $('invoiceNavCount').textContent=invoices.length; }

  function bindEvents(){
    $$('[data-view]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));
    els.mobileMenuBtn.addEventListener('click',()=>els.sidebar.classList.toggle('open'));
    document.addEventListener('click',e=>{if(window.innerWidth<=760 && els.sidebar.classList.contains('open') && !els.sidebar.contains(e.target) && e.target!==els.mobileMenuBtn) els.sidebar.classList.remove('open');});
    $('topNewInvoiceBtn').addEventListener('click',()=>{newInvoice();navigate('invoice')});
    $('quickBackupBtn').addEventListener('click',exportBackup);
    [els.customerName,els.customerPhone,els.customerAddress,els.invoiceDate,els.dueDate,els.paymentStatus,els.referenceNo,els.discount,els.otherCharges,els.invoiceNote].forEach(el=>el.addEventListener('input',()=>{updateSummary();scheduleDraft()}));
    els.partSearch.addEventListener('input',renderPartSearch);els.partSearch.addEventListener('focus',renderPartSearch);
    document.addEventListener('click',e=>{if(!e.target.closest('.smart-search')&&!e.target.closest('.search-results'))els.partResults.hidden=true});
    document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();navigate('invoice');setTimeout(()=>els.partSearch.focus(),70)}if(e.key==='Escape'){els.partResults.hidden=true;closeCustomModal();els.pdfPreviewModal.hidden=true;}});
    $('customItemBtn').addEventListener('click',()=>openCustomModal('invoice'));$('partsAddCustomBtn').addEventListener('click',()=>openCustomModal('master'));$$('[data-close-custom]').forEach(x=>x.addEventListener('click',closeCustomModal));$('addCustomItemBtn').addEventListener('click',addCustomItem);
    els.saveBtn.addEventListener('click',saveInvoice);els.previewBtn.addEventListener('click',()=>previewPDF());els.downloadBtn.addEventListener('click',()=>downloadPDF());els.shareBtn.addEventListener('click',()=>sharePDF());els.newBillBtn.addEventListener('click',()=>newInvoice());
    els.invoiceSearch.addEventListener('input',renderInvoices);els.invoiceStatusFilter.addEventListener('change',renderInvoices);els.customerSearch.addEventListener('input',renderCustomers);els.catalogSearch.addEventListener('input',renderParts);
    [els.autoDraftToggle,els.dueReminderToggle,els.webhookToggle].forEach(el=>el.addEventListener('change',saveAutomation));els.webhookUrl.addEventListener('change',saveAutomation);$('testWebhookBtn').addEventListener('click',()=>{saveAutomation();sendWebhook(null,true)});
    $('saveSettingsTopBtn').addEventListener('click',saveSettings);$('exportBackupBtn').addEventListener('click',exportBackup);$('importBackupInput').addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importBackup(f);e.target.value=''});
    $('clearDataBtn').addEventListener('click',()=>{if(confirm('All invoices, settings and custom parts delete ho jayenge. Continue?')){Object.values(KEYS).forEach(k=>localStorage.removeItem(k));invoices=[];settings={...DEFAULT_SETTINGS};automation={...DEFAULT_AUTOMATION};customParts=[];rateOverrides={};localStorage.setItem(KEYS.sequence,'1');newInvoice();updateBrand();loadSettingsForm();refreshCounts();renderDashboard();toast('Local data cleared')}});
    els.logoUpload.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){toast('Logo max 5 MB');e.target.value='';return;}try{settings.logo=await resizeLogo(f);saveJSON(KEYS.settings,settings);updateBrand();toast('Logo updated');}catch{toast('Logo read nahi hua')}e.target.value='';});
    $('removeLogoBtn').addEventListener('click',()=>{settings.logo='';saveJSON(KEYS.settings,settings);updateBrand();toast('Logo removed')});
    $$('[data-close-preview]').forEach(x=>x.addEventListener('click',()=>{els.pdfPreviewModal.hidden=true;if(previewBlobUrl){URL.revokeObjectURL(previewBlobUrl);previewBlobUrl=null}}));$('previewDownloadBtn').addEventListener('click',()=>downloadPDF());
  }

  function init(){
    updateBrand(); bindEvents(); refreshCounts();
    els.invoiceDate.value=todayISO(); els.dueDate.value=addDaysISO(todayISO(),settings.defaultDueDays); els.invoiceNoTop.textContent=nextInvoiceNo(); els.summaryInvoiceNo.textContent=nextInvoiceNo();
    loadSettingsForm(); renderItems(); restoreDraft(); renderDashboard(); renderInvoices(); renderCustomers(); renderParts(); renderAutomation();
    if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  init();
})();
