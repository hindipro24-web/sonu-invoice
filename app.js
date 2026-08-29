(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const KEYS = { settings:'invoicePro.settings.v1', invoices:'invoicePro.invoices.v1', counter:'invoicePro.counter.v1', draft:'invoicePro.draft.v1' };
  const CATALOG = Array.isArray(window.PARTS_CATALOG) ? window.PARTS_CATALOG : [];

  const DEFAULT_SETTINGS = {
    businessName:'SONU FABRICATION', businessPhone:'', businessAddress:'', paymentDetails:'', invoicePrefix:'INV', footerNote:'Computer generated non-GST invoice.'
  };
  let settings = loadJSON(KEYS.settings, DEFAULT_SETTINGS);
  let items = [];
  let previewUrl = null;

  function loadJSON(key, fallback){ try { const v=JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
  function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function money(n){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(n)||0); }
  function safe(n){ return Number.isFinite(Number(n)) ? Number(n) : 0; }
  function today(){ const d=new Date(); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  function uid(){ return (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`); }
  function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2200); }
  function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function nextInvoiceNo(increment=false){
    let counter=parseInt(localStorage.getItem(KEYS.counter)||'1',10); if(!Number.isFinite(counter)||counter<1) counter=1;
    const no=`${(settings.invoicePrefix||'INV').toUpperCase()}-${String(counter).padStart(4,'0')}`;
    if(increment) localStorage.setItem(KEYS.counter,String(counter+1));
    return no;
  }

  function setView(id){
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
    const meta={invoiceView:['Create Invoice','Professional non-GST invoice builder'],historyView:['Invoice History','Saved invoices on this device'],catalogView:['Parts Catalog','Search the SONU FABRICATION rate list'],settingsView:['Settings','Business profile and invoice preferences']}[id];
    $('pageTitle').textContent=meta[0]; $('pageSubtitle').textContent=meta[1];
    $('sidebar').classList.remove('open');
    if(id==='historyView') renderHistory(); if(id==='catalogView') renderCatalog(); if(id==='settingsView') fillSettingsForm();
  }

  function newInvoice(confirmClear=false){
    if(confirmClear && (items.length || $('customerName').value) && !confirm('Start a new invoice? Unsaved changes will be cleared.')) return;
    items=[]; $('invoiceNo').value=nextInvoiceNo(false); $('invoiceDate').value=today(); $('customerName').value=''; $('customerMobile').value=''; $('customerAddress').value=''; $('invoiceNotes').value='Thank you for your business.'; $('discountInput').value='0'; $('otherChargesInput').value='0';
    renderItems(); localStorage.removeItem(KEYS.draft); setView('invoiceView');
  }

  function invoiceData(){
    const subtotal=items.reduce((s,i)=>s+safe(i.qty)*safe(i.rate),0), discount=Math.max(0,safe($('discountInput').value)), other=Math.max(0,safe($('otherChargesInput').value));
    return { id:uid(), invoiceNo:$('invoiceNo').value.trim()||nextInvoiceNo(false), date:$('invoiceDate').value||today(), customerName:$('customerName').value.trim(), customerMobile:$('customerMobile').value.trim(), customerAddress:$('customerAddress').value.trim(), notes:$('invoiceNotes').value.trim(), items:items.map(i=>({...i})), subtotal, discount, otherCharges:other, total:Math.max(0,subtotal-discount+other), savedAt:new Date().toISOString() };
  }

  function autosaveDraft(){ const d=invoiceData(); d.id='draft'; saveJSON(KEYS.draft,d); }
  function loadDraft(){ const d=loadJSON(KEYS.draft,null); if(!d) return false; applyInvoice(d,false); return true; }
  function applyInvoice(inv, clone=false){
    items=(inv.items||[]).map(i=>({...i,id:uid()})); $('invoiceNo').value=clone?nextInvoiceNo(false):(inv.invoiceNo||nextInvoiceNo(false)); $('invoiceDate').value=clone?today():(inv.date||today()); $('customerName').value=inv.customerName||''; $('customerMobile').value=inv.customerMobile||''; $('customerAddress').value=inv.customerAddress||''; $('invoiceNotes').value=inv.notes||'Thank you for your business.'; $('discountInput').value=inv.discount||0; $('otherChargesInput').value=inv.otherCharges||0; renderItems(); setView('invoiceView');
  }

  function addCatalogItem(part){ items.push({id:uid(),partNo:part.partNo,description:`${part.description}${part.group?' • '+part.group:''}`,qty:1,rate:safe(part.rate)}); $('partSearch').value=''; $('searchResults').classList.add('hidden'); renderItems(); autosaveDraft(); toast('Part added'); }
  function addCustomItem(){
    const desc=$('customDescription').value.trim(); if(!desc){ toast('Enter item description'); return false; }
    items.push({id:uid(),partNo:$('customPartNo').value.trim(),description:desc,qty:Math.max(.01,safe($('customQty').value)||1),rate:Math.max(0,safe($('customRate').value))});
    $('customPartNo').value=''; $('customDescription').value=''; $('customQty').value='1'; $('customRate').value='0'; renderItems(); autosaveDraft(); toast('Item added'); return true;
  }

  function renderItems(){
    const body=$('itemsBody'); body.innerHTML=''; $('emptyItems').classList.toggle('hidden',items.length>0);
    items.forEach((item,idx)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${idx+1}</td><td><div class="item-main"><b>${esc(item.description)}</b><span>${esc(item.partNo||'Custom item')}</span></div></td><td><div class="stepper"><button data-act="minus" data-id="${item.id}" aria-label="Decrease quantity">−</button><input data-field="qty" data-id="${item.id}" type="number" min="0.01" step="0.01" value="${safe(item.qty)}"><button data-act="plus" data-id="${item.id}" aria-label="Increase quantity">+</button></div></td><td><div class="money-input"><span>₹</span><input data-field="rate" data-id="${item.id}" type="number" min="0" step="0.01" value="${safe(item.rate).toFixed(2)}"></div></td><td class="num amount-cell">${money(safe(item.qty)*safe(item.rate))}</td><td><button class="remove-btn" data-act="remove" data-id="${item.id}" aria-label="Remove item">×</button></td>`;
      body.appendChild(tr);
    });
    updateTotals();
  }

  function updateTotals(){ const subtotal=items.reduce((s,i)=>s+safe(i.qty)*safe(i.rate),0); const total=Math.max(0,subtotal-Math.max(0,safe($('discountInput').value))+Math.max(0,safe($('otherChargesInput').value))); $('subtotalText').textContent=money(subtotal); $('grandTotalText').textContent=money(total); }

  function searchCatalog(q){ const x=q.trim().toLowerCase(); if(!x) return []; return CATALOG.filter(p=>`${p.partNo} ${p.description} ${p.group} ${p.thickness} ${p.cutting}`.toLowerCase().includes(x)).slice(0,14); }
  function renderSearchResults(){ const q=$('partSearch').value, res=searchCatalog(q), box=$('searchResults'); if(!q.trim()){box.classList.add('hidden');return;} box.innerHTML=res.length?res.map((p)=>`<button class="search-result" data-sr="${p.sr}"><div><strong>${esc(p.partNo)} — ${esc(p.description)}</strong><span>${esc(p.group)} • ${esc(p.thickness)}mm • Cutting ${esc(p.cutting)}mm</span></div><b>${money(p.rate)}</b></button>`).join(''):'<div class="search-result"><div><strong>No matching part</strong><span>Use “Add Item” for a custom line.</span></div></div>'; box.classList.remove('hidden'); }

  function renderCatalog(filter=''){ const q=filter.trim().toLowerCase(); const arr=CATALOG.filter(p=>!q||`${p.partNo} ${p.description} ${p.group}`.toLowerCase().includes(q)); $('catalogGrid').innerHTML=arr.map(p=>`<article class="catalog-card"><span class="code">${esc(p.partNo)}</span><b>${esc(p.description)}</b><span class="catalog-meta">${esc(p.group)} • THK ${esc(p.thickness)} • Cutting ${esc(p.cutting)}</span><span class="catalog-rate">${money(p.rate)}</span><button class="mini-btn" data-add-sr="${p.sr}">Add to invoice</button></article>`).join(''); }

  function validateInvoice(){ if(!items.length){ toast('Add at least one invoice item'); return false; } if(!$('customerName').value.trim()) toast('Tip: customer name is empty'); return true; }

  function saveInvoice(){
    if(!validateInvoice()) return;
    const inv=invoiceData(); const all=loadJSON(KEYS.invoices,[]); const existing=all.findIndex(x=>x.invoiceNo===inv.invoiceNo); if(existing>=0){ inv.id=all[existing].id; all[existing]=inv; } else { all.unshift(inv); if(inv.invoiceNo===nextInvoiceNo(false)) nextInvoiceNo(true); }
    saveJSON(KEYS.invoices,all.slice(0,500)); localStorage.removeItem(KEYS.draft); toast('Invoice saved'); renderHistory();
  }

  function renderHistory(){ const q=$('historySearch')?.value?.trim().toLowerCase()||''; const all=loadJSON(KEYS.invoices,[]).filter(i=>!q||`${i.invoiceNo} ${i.customerName} ${i.customerMobile}`.toLowerCase().includes(q)); $('historyList').innerHTML=all.length?all.map(i=>`<div class="history-row"><div><b>${esc(i.invoiceNo)}</b><br><span>${esc(i.customerName||'No customer name')}</span></div><div><b>${esc(i.date)}</b><br><span>${esc(i.customerMobile||'—')}</span></div><div><b>${money(i.total)}</b><br><span>${i.items?.length||0} item(s)</span></div><div class="history-actions"><button class="mini-btn" data-history="open" data-id="${i.id}">Open</button><button class="mini-btn" data-history="pdf" data-id="${i.id}">PDF</button><button class="mini-btn danger" data-history="delete" data-id="${i.id}">Delete</button></div></div>`).join(''):'<div class="empty-items"><b>No saved invoices</b><span>Saved invoices will appear here.</span></div>'; }

  function fillSettingsForm(){ $('businessName').value=settings.businessName||''; $('businessPhone').value=settings.businessPhone||''; $('businessAddress').value=settings.businessAddress||''; $('paymentDetails').value=settings.paymentDetails||''; $('invoicePrefix').value=settings.invoicePrefix||'INV'; $('footerNote').value=settings.footerNote||''; }
  function applyBrand(){ $('sidebarBusinessName').textContent=settings.businessName||'Invoice Pro'; }
  function saveSettings(){ settings={businessName:$('businessName').value.trim(),businessPhone:$('businessPhone').value.trim(),businessAddress:$('businessAddress').value.trim(),paymentDetails:$('paymentDetails').value.trim(),invoicePrefix:($('invoicePrefix').value.trim()||'INV').toUpperCase(),footerNote:$('footerNote').value.trim()}; saveJSON(KEYS.settings,settings); applyBrand(); toast('Settings saved'); }

  function createPdf(inv=invoiceData()){
    if(!window.jspdf?.jsPDF) throw new Error('PDF library did not load. Check internet connection once and reload.');
    const { jsPDF }=window.jspdf; const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const W=210, margin=14; const navy=[15,23,42], blue=[37,99,235], muted=[100,116,139], line=[226,232,240];
    doc.setFillColor(...navy); doc.roundedRect(margin,12,18,18,4,4,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('SF',23,23.5,{align:'center'});
    doc.setTextColor(...navy); doc.setFontSize(15); doc.text((settings.businessName||'YOUR BUSINESS NAME').toUpperCase(),36,19); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...muted);
    const address=(settings.businessAddress||'Business address can be added from Settings.'); doc.text(doc.splitTextToSize(address,90),36,24);
    if(settings.businessPhone) doc.text(`Phone: ${settings.businessPhone}`,36,30);
    doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.setTextColor(...navy); doc.text('INVOICE',W-margin,20,{align:'right'}); doc.setFontSize(7.5); doc.setTextColor(...blue); doc.text('NON-GST',W-margin,25,{align:'right'});
    doc.setDrawColor(...line); doc.line(margin,36,W-margin,36);

    doc.setFontSize(7); doc.setTextColor(...muted); doc.setFont('helvetica','bold'); doc.text('BILL TO',margin,44); doc.text('INVOICE DETAILS',131,44);
    doc.setTextColor(...navy); doc.setFontSize(10); doc.text(inv.customerName||'Customer',margin,50); doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...muted); let y=55;
    if(inv.customerMobile){doc.text(`Mobile: ${inv.customerMobile}`,margin,y);y+=4;} if(inv.customerAddress){doc.text(doc.splitTextToSize(inv.customerAddress,95),margin,y);}
    doc.setTextColor(...navy); doc.setFont('helvetica','normal'); doc.text(`Invoice No: ${inv.invoiceNo}`,131,50); doc.text(`Date: ${inv.date}`,131,55);

    const body=inv.items.map((i,idx)=>[String(idx+1),`${i.description}${i.partNo?`\nPart: ${i.partNo}`:''}`,fmtQty(i.qty),fmtNum(i.rate),fmtNum(safe(i.qty)*safe(i.rate))]);
    doc.autoTable({
      startY:68, margin:{left:margin,right:margin}, tableWidth:182,
      head:[['#','PART / DESCRIPTION','QTY','RATE (Rs.)','AMOUNT (Rs.)']], body,
      theme:'plain',
      styles:{font:'helvetica',fontSize:7.4,textColor:navy,cellPadding:{top:3,bottom:3,left:2.2,right:2.2},lineColor:line,lineWidth:{bottom:.18},valign:'middle',overflow:'linebreak'},
      headStyles:{fillColor:navy,textColor:[255,255,255],fontStyle:'bold',fontSize:7,cellPadding:{top:3.2,bottom:3.2,left:2.2,right:2.2},lineWidth:0},
      columnStyles:{0:{cellWidth:10,halign:'center'},1:{cellWidth:82,halign:'left'},2:{cellWidth:18,halign:'center'},3:{cellWidth:31,halign:'right'},4:{cellWidth:41,halign:'right'}},
      didParseCell:(data)=>{ if(data.section==='body' && (data.column.index===3||data.column.index===4)) data.cell.styles.halign='right'; },
      didDrawPage:()=>{}
    });
    let ty=(doc.lastAutoTable?.finalY||78)+8; if(ty>240){doc.addPage();ty=22;}
    const x1=128,x2=W-margin;
    doc.setFontSize(8); doc.setTextColor(...muted); doc.text('Subtotal',x1,ty); doc.setTextColor(...navy); doc.text(`Rs. ${fmtNum(inv.subtotal)}`,x2,ty,{align:'right'}); ty+=6;
    if(inv.discount>0){doc.setTextColor(...muted);doc.text('Discount',x1,ty);doc.setTextColor(...navy);doc.text(`- Rs. ${fmtNum(inv.discount)}`,x2,ty,{align:'right'});ty+=6;}
    if(inv.otherCharges>0){doc.setTextColor(...muted);doc.text('Other Charges',x1,ty);doc.setTextColor(...navy);doc.text(`Rs. ${fmtNum(inv.otherCharges)}`,x2,ty,{align:'right'});ty+=6;}
    doc.setFillColor(...navy); doc.roundedRect(123,ty-3,73,12,2.5,2.5,'F'); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('GRAND TOTAL',128,ty+4.5); doc.setFontSize(10); doc.text(`Rs. ${fmtNum(inv.total)}`,192,ty+4.5,{align:'right'}); ty+=18;
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(...muted); doc.text('NOTES',margin,ty); doc.setFont('helvetica','normal'); doc.setTextColor(...navy); doc.text(doc.splitTextToSize(inv.notes||'Thank you for your business.',102),margin,ty+5);
    if(settings.paymentDetails){ doc.setFont('helvetica','bold');doc.setTextColor(...muted);doc.text('PAYMENT DETAILS',123,ty);doc.setFont('helvetica','normal');doc.setTextColor(...navy);doc.text(doc.splitTextToSize(settings.paymentDetails,73),123,ty+5); }
    const pages=doc.getNumberOfPages(); for(let p=1;p<=pages;p++){doc.setPage(p); doc.setDrawColor(...line); doc.line(margin,286,W-margin,286); doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(...muted);doc.text(settings.footerNote||'Computer generated non-GST invoice.',margin,291);doc.text(`Page ${p} of ${pages}`,W-margin,291,{align:'right'});}
    return doc;
  }
  function fmtNum(n){ return safe(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtQty(n){ return safe(n).toLocaleString('en-IN',{maximumFractionDigits:2}); }
  function pdfBlob(inv){ return createPdf(inv).output('blob'); }
  function pdfName(inv){ return `${(inv.invoiceNo||'Invoice').replace(/[^a-z0-9_-]/gi,'_')}.pdf`; }
  function previewPdf(inv=invoiceData()){ if(!validateInvoice()) return; try{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(pdfBlob(inv));$('pdfFrame').src=previewUrl;$('pdfDialog').showModal();}catch(e){toast(e.message);} }
  function downloadPdf(inv=invoiceData()){ if(!inv.items?.length){toast('Add at least one invoice item');return;} try{createPdf(inv).save(pdfName(inv));toast('PDF downloaded');}catch(e){toast(e.message);} }
  async function sharePdf(inv=invoiceData()){
    if(!validateInvoice()) return; try{ const blob=pdfBlob(inv), file=new File([blob],pdfName(inv),{type:'application/pdf'}); if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title:`Invoice ${inv.invoiceNo}`,text:`Invoice ${inv.invoiceNo}${inv.customerName?' - '+inv.customerName:''}`,files:[file]});}else{createPdf(inv).save(pdfName(inv)); const msg=encodeURIComponent(`Invoice ${inv.invoiceNo} PDF downloaded. Please attach and send it on WhatsApp.`); window.open(`https://wa.me/?text=${msg}`,'_blank'); toast('PDF downloaded — attach it in WhatsApp');} }catch(e){if(e?.name!=='AbortError')toast(e.message||'Could not share PDF');}
  }

  function exportBackup(){ const data={exportedAt:new Date().toISOString(),settings,invoices:loadJSON(KEYS.invoices,[])}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='invoice-pro-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000); }

  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('menuBtn').addEventListener('click',()=> $('sidebar').classList.toggle('open'));
  $('newInvoiceBtn').addEventListener('click',()=>newInvoice(true)); $('saveInvoiceBtn').addEventListener('click',saveInvoice); $('addItemBtn').addEventListener('click',()=> $('itemDialog').showModal());
  $('confirmCustomItemBtn').addEventListener('click',(e)=>{e.preventDefault();if(addCustomItem())$('itemDialog').close();});
  $('partSearch').addEventListener('input',renderSearchResults); $('partSearch').addEventListener('focus',renderSearchResults); document.addEventListener('keydown',e=>{if(e.key==='/' && document.activeElement?.tagName!=='INPUT' && document.activeElement?.tagName!=='TEXTAREA'){e.preventDefault();$('partSearch').focus();}});
  $('searchResults').addEventListener('click',e=>{const btn=e.target.closest('[data-sr]');if(!btn)return;const p=CATALOG.find(x=>x.sr===Number(btn.dataset.sr));if(p)addCatalogItem(p);});
  document.addEventListener('click',e=>{if(!e.target.closest('.quick-search-wrap'))$('searchResults').classList.add('hidden');});
  $('itemsBody').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const i=items.find(x=>x.id===b.dataset.id);if(!i)return;if(b.dataset.act==='plus')i.qty=safe(i.qty)+1;if(b.dataset.act==='minus')i.qty=Math.max(.01,safe(i.qty)-1);if(b.dataset.act==='remove')items=items.filter(x=>x.id!==i.id);renderItems();autosaveDraft();});
  $('itemsBody').addEventListener('input',e=>{const f=e.target.dataset.field,id=e.target.dataset.id;if(!f||!id)return;const i=items.find(x=>x.id===id);if(!i)return;i[f]=Math.max(f==='qty'?0.01:0,safe(e.target.value));updateTotals();autosaveDraft();const row=e.target.closest('tr');if(row)row.querySelector('.amount-cell').textContent=money(safe(i.qty)*safe(i.rate));});
  ['discountInput','otherChargesInput'].forEach(id=>$(id).addEventListener('input',()=>{updateTotals();autosaveDraft();})); ['invoiceNo','invoiceDate','customerName','customerMobile','customerAddress','invoiceNotes'].forEach(id=>$(id).addEventListener('input',autosaveDraft));
  $('previewPdfBtn').addEventListener('click',()=>previewPdf()); $('downloadPdfBtn').addEventListener('click',()=>downloadPdf()); $('sharePdfBtn').addEventListener('click',()=>sharePdf()); $('closePdfDialog').addEventListener('click',()=>{$('pdfDialog').close();});
  $('catalogSearch').addEventListener('input',e=>renderCatalog(e.target.value)); $('catalogGrid').addEventListener('click',e=>{const b=e.target.closest('[data-add-sr]');if(!b)return;const p=CATALOG.find(x=>x.sr===Number(b.dataset.addSr));if(p){addCatalogItem(p);setView('invoiceView');}});
  $('historySearch').addEventListener('input',renderHistory); $('historyList').addEventListener('click',e=>{const b=e.target.closest('[data-history]');if(!b)return;const all=loadJSON(KEYS.invoices,[]),inv=all.find(x=>x.id===b.dataset.id);if(!inv)return;if(b.dataset.history==='open')applyInvoice(inv,false);if(b.dataset.history==='pdf')downloadPdf(inv);if(b.dataset.history==='delete'&&confirm(`Delete ${inv.invoiceNo}?`)){saveJSON(KEYS.invoices,all.filter(x=>x.id!==inv.id));renderHistory();toast('Invoice deleted');}});
  $('saveSettingsBtn').addEventListener('click',saveSettings); $('exportDataBtn').addEventListener('click',exportBackup); $('resetAppBtn').addEventListener('click',()=>{if(confirm('Reset settings, history and current draft?')){Object.values(KEYS).forEach(k=>localStorage.removeItem(k));settings={...DEFAULT_SETTINGS};applyBrand();newInvoice(false);fillSettingsForm();toast('App data reset');}});
  window.addEventListener('beforeunload',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);});
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});

  applyBrand(); fillSettingsForm(); if(!loadDraft()) newInvoice(false); renderCatalog(); renderHistory();
})();
