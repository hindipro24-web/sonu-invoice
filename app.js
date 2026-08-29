(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const STORAGE = {settings:'spb_settings_v2', invoices:'spb_invoices_v2', counter:'spb_counter_v2'};
  const defaults = {businessName:'SONU FABRICATION',businessPhone:'',businessAddress:'',invoicePrefix:'INV',footerNote:'Thank you for your business.',paymentDetails:''};
  let settings = load(STORAGE.settings, defaults);
  let invoices = load(STORAGE.invoices, []);
  let items = [];
  let editingId = null;
  let toastTimer = null;

  function load(key, fallback){ try{const raw=localStorage.getItem(key); return raw?JSON.parse(raw):structuredClone(fallback);}catch{return structuredClone(fallback);} }
  function save(key,val){ localStorage.setItem(key,JSON.stringify(val)); }
  function money(n){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(n)||0); }
  function num(v){ const n=parseFloat(v); return Number.isFinite(n)?n:0; }
  function today(){ const d=new Date(); return d.toISOString().slice(0,10); }
  function safe(s){ return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function toast(msg){ clearTimeout(toastTimer); const t=$('toast'); t.textContent=msg; t.classList.add('show'); toastTimer=setTimeout(()=>t.classList.remove('show'),2600); }
  function nextNumber(){ let c=parseInt(localStorage.getItem(STORAGE.counter)||'1',10); if(!Number.isFinite(c)||c<1)c=1; return `${(settings.invoicePrefix||'INV').toUpperCase()}-${String(c).padStart(4,'0')}`; }
  function advanceCounter(){ const n=parseInt(localStorage.getItem(STORAGE.counter)||'1',10)||1; localStorage.setItem(STORAGE.counter,String(n+1)); }
  function currentInvoiceNo(){ return editingId ? (invoices.find(x=>x.id===editingId)?.invoiceNo || nextNumber()) : nextNumber(); }

  function switchView(name){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    const map={new:'newView',history:'historyView',catalog:'catalogView'}; $(map[name]).classList.add('active-view');
    if(name==='history') renderHistory(); if(name==='catalog') renderCatalog(); window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>switchView(el.dataset.view)));
  $('historyNewBtn').onclick=()=>{newBill();switchView('new')}; $('catalogNewBtn').onclick=()=>switchView('new');

  function setInvoiceLabels(){ const no=currentInvoiceNo(); $('invoiceNoTop').textContent=no; $('summaryInvoiceNo').textContent=no; }
  function totals(){ const subtotal=items.reduce((s,i)=>s+(num(i.qty)*num(i.rate)),0); const discount=Math.max(0,num($('discount').value)); const charges=Math.max(0,num($('otherCharges').value)); return {subtotal,discount,charges,total:Math.max(0,subtotal-discount+charges)}; }
  function updateSummary(){ const t=totals(); $('itemCount').textContent=String(items.length); $('subtotal').textContent=money(t.subtotal); $('discountSummary').textContent=`− ${money(t.discount)}`; $('chargesSummary').textContent=money(t.charges); $('grandTotal').textContent=money(t.total); }

  function renderItems(){
    $('emptyItems').style.display=items.length?'none':'grid';
    $('itemsList').innerHTML=items.map((it,idx)=>`<div class="item-row" data-index="${idx}">
      <div class="item-info"><strong>${safe(it.description||'Custom Item')}</strong><span>${safe(it.partNo||'Custom')} • ${safe(it.unit||'')}</span></div>
      <div class="qty-control"><button data-act="minus" aria-label="Decrease quantity">−</button><input data-field="qty" type="number" min="0.01" step="0.01" value="${it.qty}"><button data-act="plus" aria-label="Increase quantity">+</button></div>
      <input class="rate-input" data-field="rate" type="number" min="0" step="0.01" value="${it.rate}">
      <div class="amount">${money(num(it.qty)*num(it.rate))}</div>
      <button class="remove-btn" data-act="remove" aria-label="Remove item">×</button>
    </div>`).join('');
    updateSummary();
  }
  $('itemsList').addEventListener('click',e=>{ const row=e.target.closest('.item-row'); if(!row)return; const idx=+row.dataset.index; const act=e.target.dataset.act; if(act==='plus'){items[idx].qty=num(items[idx].qty)+1} if(act==='minus'){items[idx].qty=Math.max(.01,num(items[idx].qty)-1)} if(act==='remove'){items.splice(idx,1)} renderItems(); });
  $('itemsList').addEventListener('input',e=>{ const row=e.target.closest('.item-row'); if(!row)return; const idx=+row.dataset.index; const f=e.target.dataset.field; if(f){items[idx][f]=num(e.target.value); const amount=row.querySelector('.amount'); amount.textContent=money(num(items[idx].qty)*num(items[idx].rate)); updateSummary();} });
  ['discount','otherCharges'].forEach(id=>$(id).addEventListener('input',updateSummary));

  const searchInput=$('partSearch'), results=$('partResults');
  function searchParts(q){ const term=q.trim().toLowerCase(); if(!term)return PARTS.slice(0,8); return PARTS.filter(p=>`${p.partNo} ${p.description} ${p.unit}`.toLowerCase().includes(term)).slice(0,12); }
  function showResults(){ const list=searchParts(searchInput.value); results.innerHTML=list.length?list.map(p=>`<button class="result-row" data-id="${p.id}"><span class="result-main"><strong>${safe(p.partNo)}</strong><span>${safe(p.description)} • ${safe(p.unit)}</span></span><span class="result-rate"><strong>${money(p.rate)}</strong><span>rate</span></span></button>`).join(''):'<div class="no-results">Part nahi mila. “+ Custom” se add karo.</div>'; results.hidden=false; }
  searchInput.addEventListener('focus',showResults); searchInput.addEventListener('input',showResults);
  results.addEventListener('click',e=>{ const b=e.target.closest('[data-id]'); if(!b)return; const p=PARTS.find(x=>x.id===+b.dataset.id); if(p)addPart(p); });
  document.addEventListener('click',e=>{if(!e.target.closest('.part-search-wrap'))results.hidden=true;});
  function addPart(p){ const existing=items.find(i=>i.partNo===p.partNo && i.unit===p.unit && i.rate===p.rate); if(existing)existing.qty=num(existing.qty)+1; else items.push({...p,qty:1}); renderItems(); searchInput.value=''; results.hidden=true; toast('Part added'); }

  function openModal(id){ $(id).hidden=false; document.body.style.overflow='hidden'; }
  function closeModal(id){ $(id).hidden=true; document.body.style.overflow=''; }
  $('settingsBtn').onclick=()=>{fillSettings();openModal('settingsModal')}; document.querySelectorAll('[data-close-modal]').forEach(x=>x.onclick=()=>closeModal('settingsModal'));
  $('customItemBtn').onclick=()=>openModal('customModal'); document.querySelectorAll('[data-close-custom]').forEach(x=>x.onclick=()=>closeModal('customModal'));
  $('addCustomBtn').onclick=()=>{ const desc=$('customDescription').value.trim(); if(!desc){toast('Description enter karo');return;} items.push({id:`custom-${Date.now()}`,partNo:$('customPartNo').value.trim()||'CUSTOM',description:desc,unit:'',qty:Math.max(.01,num($('customQty').value)||1),rate:Math.max(0,num($('customRate').value))}); renderItems(); closeModal('customModal'); $('customPartNo').value=''; $('customDescription').value=''; $('customQty').value='1'; $('customRate').value='0'; toast('Custom item added'); };
  function fillSettings(){ $('businessName').value=settings.businessName||''; $('businessPhone').value=settings.businessPhone||''; $('businessAddress').value=settings.businessAddress||''; $('invoicePrefix').value=settings.invoicePrefix||'INV'; $('footerNote').value=settings.footerNote||''; $('paymentDetails').value=settings.paymentDetails||''; }
  $('saveSettingsBtn').onclick=()=>{ settings={businessName:$('businessName').value.trim()||'My Business',businessPhone:$('businessPhone').value.trim(),businessAddress:$('businessAddress').value.trim(),invoicePrefix:($('invoicePrefix').value.trim()||'INV').toUpperCase().replace(/[^A-Z0-9-]/g,''),footerNote:$('footerNote').value.trim(),paymentDetails:$('paymentDetails').value.trim()}; save(STORAGE.settings,settings); setInvoiceLabels(); closeModal('settingsModal'); toast('Settings saved'); };

  function collect(){ const t=totals(); return {id:editingId||`bill_${Date.now()}`,invoiceNo:currentInvoiceNo(),date:$('invoiceDate').value||today(),customer:{name:$('customerName').value.trim(),phone:$('customerPhone').value.trim(),address:$('customerAddress').value.trim()},items:items.map(x=>({...x,qty:num(x.qty),rate:num(x.rate)})),discount:t.discount,otherCharges:t.charges,paymentStatus:$('paymentStatus').value,note:$('invoiceNote').value.trim(),subtotal:t.subtotal,total:t.total,createdAt:new Date().toISOString()}; }
  function validate(inv){ if(!inv.customer.name){toast('Customer name enter karo');$('customerName').focus();return false;} if(!inv.items.length){toast('Kam se kam 1 part add karo');searchInput.focus();return false;} return true; }
  function saveInvoice(silent=false){ const inv=collect(); if(!validate(inv))return null; const idx=invoices.findIndex(x=>x.id===inv.id); if(idx>=0)invoices[idx]=inv; else {invoices.unshift(inv); advanceCounter(); editingId=inv.id;} save(STORAGE.invoices,invoices); setInvoiceLabels(); if(!silent)toast('Bill saved ✓'); return inv; }
  $('saveBtn').onclick=()=>saveInvoice();

  function newBill(){ editingId=null; items=[]; $('customerName').value=''; $('customerPhone').value=''; $('customerAddress').value=''; $('invoiceDate').value=today(); $('discount').value='0'; $('otherCharges').value='0'; $('paymentStatus').value='Unpaid'; $('invoiceNote').value=''; renderItems(); setInvoiceLabels(); }
  $('newBillBtn').onclick=()=>{newBill();toast('New bill ready')};

  function loadInvoice(id){ const inv=invoices.find(x=>x.id===id); if(!inv)return; editingId=id; $('customerName').value=inv.customer?.name||''; $('customerPhone').value=inv.customer?.phone||''; $('customerAddress').value=inv.customer?.address||''; $('invoiceDate').value=inv.date||today(); $('discount').value=inv.discount||0; $('otherCharges').value=inv.otherCharges||0; $('paymentStatus').value=inv.paymentStatus||'Unpaid'; $('invoiceNote').value=inv.note||''; items=(inv.items||[]).map(x=>({...x})); renderItems(); setInvoiceLabels(); switchView('new'); toast('Saved bill opened'); }

  function renderHistory(){ const q=$('historySearch').value.trim().toLowerCase(); const list=invoices.filter(i=>`${i.invoiceNo} ${i.customer?.name||''} ${i.customer?.phone||''}`.toLowerCase().includes(q)); $('emptyHistory').style.display=list.length?'none':'grid'; $('historyList').innerHTML=list.map(i=>`<div class="history-row" data-id="${i.id}"><div><strong>${safe(i.invoiceNo)}</strong><span>${safe(i.date)}</span></div><div><strong>${safe(i.customer?.name||'—')}</strong><span>${safe(i.customer?.phone||'')}</span></div><div><strong>${safe(i.paymentStatus||'Unpaid')}</strong><span>${i.items?.length||0} items</span></div><div><strong class="history-amount">${money(i.total)}</strong></div><div class="history-actions"><button class="tiny-btn" data-act="open">Open</button><button class="tiny-btn" data-act="pdf">PDF</button><button class="tiny-btn danger" data-act="delete">Delete</button></div></div>`).join(''); }
  $('historySearch').addEventListener('input',renderHistory);
  $('historyList').addEventListener('click',async e=>{ const row=e.target.closest('.history-row'); if(!row)return; const id=row.dataset.id, act=e.target.dataset.act; if(act==='open')loadInvoice(id); if(act==='delete'){if(confirm('Is bill ko delete karna hai?')){invoices=invoices.filter(x=>x.id!==id);save(STORAGE.invoices,invoices);renderHistory();toast('Bill deleted');}} if(act==='pdf'){const inv=invoices.find(x=>x.id===id);if(inv)downloadPDF(inv);} });
  $('exportBackupBtn').onclick=()=>{ const blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),settings,invoices},null,2)],{type:'application/json'}); downloadBlob(blob,`smart-parts-backup-${today()}.json`); toast('Backup exported'); };

  function renderCatalog(){ const q=$('catalogSearch').value.trim().toLowerCase(); const list=PARTS.filter(p=>`${p.partNo} ${p.description} ${p.unit}`.toLowerCase().includes(q)); $('catalogList').innerHTML=list.map(p=>`<div class="catalog-row"><div><strong>${safe(p.partNo)}</strong><span>${safe(p.description)} • ${safe(p.unit)}</span></div><div style="text-align:right"><div class="catalog-rate">${money(p.rate)}</div><button class="catalog-add" data-id="${p.id}">ADD TO BILL</button></div></div>`).join(''); }
  $('catalogSearch').addEventListener('input',renderCatalog); $('catalogList').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(!b)return;const p=PARTS.find(x=>x.id===+b.dataset.id);addPart(p);switchView('new');});

  // --- Minimal client-side PDF generator (no external library) ---
  function pdfEscape(s){ return String(s??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[\r\n]+/g,' '); }
  const widths={ '0':556,'1':556,'2':556,'3':556,'4':556,'5':556,'6':556,'7':556,'8':556,'9':556,'.':278,',':278,'-':333,' ':278,'R':722,'s':500};
  function textWidth(txt,size,bold=false){ let u=0; for(const ch of String(txt)){ if(widths[ch]!=null)u+=widths[ch]; else if(/[A-Z]/.test(ch))u+=bold?690:667; else if(/[a-z]/.test(ch))u+=bold?540:500; else u+=500;} return u/1000*size; }
  function makePDF(inv){
    const W=595.28,H=841.89,M=42; const pages=[]; let cmds=[],y=0;
    const c={brand:'0.067 0.247 0.404',ink:'0.10 0.15 0.19',muted:'0.42 0.47 0.52',line:'0.87 0.89 0.91',light:'0.96 0.98 0.99',green:'0.08 0.52 0.37'};
    const line=(x1,y1,x2,y2,color=c.line,w=.7)=>cmds.push(`${color} RG ${w} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    const rect=(x,y,w,h,fill,stroke=null)=>{ if(fill)cmds.push(`${fill} rg ${x} ${y} ${w} ${h} re f`); if(stroke)cmds.push(`${stroke} RG ${x} ${y} ${w} ${h} re S`); };
    const txt=(s,x,y,size=10,bold=false,color=c.ink,align='left',rightX=null)=>{ s=pdfEscape(s); let xx=x; if(align==='right'){ const end=rightX??x; xx=end-textWidth(s,size,bold);} if(align==='center')xx=x-textWidth(s,size,bold)/2; cmds.push(`BT ${color} rg /${bold?'F2':'F1'} ${size} Tf 1 0 0 1 ${xx.toFixed(2)} ${y.toFixed(2)} Tm (${s}) Tj ET`); };
    const wrap=(s,maxChars)=>{ const words=String(s||'').split(/\s+/); const out=[]; let cur=''; for(const w of words){if(!w)continue; if((cur+' '+w).trim().length>maxChars){if(cur)out.push(cur);cur=w}else cur=(cur+' '+w).trim()} if(cur)out.push(cur); return out.length?out:['']; };
    function header(first=true){
      rect(0,H-112,W,112,c.brand); txt((settings.businessName||'SMART PARTS BILLING').toUpperCase(),M,H-55,19,true,'1 1 1');
      const addr=[settings.businessAddress,settings.businessPhone].filter(Boolean).join(' • '); if(addr)txt(addr,M,H-75,8,false,'0.82 0.89 0.94');
      txt('INVOICE',W-M,H-50,21,true,'1 1 1','right',W-M); txt('NON-GST',W-M,H-70,8,true,'0.74 0.87 0.95','right',W-M);
      y=H-145;
      txt('BILL TO',M,y,8,true,c.muted); txt('INVOICE DETAILS',335,y,8,true,c.muted); y-=18;
      txt(inv.customer.name||'Customer',M,y,12,true,c.ink); txt(`Invoice No: ${inv.invoiceNo}`,335,y,9,true,c.ink); y-=15;
      if(inv.customer.phone){txt(inv.customer.phone,M,y,9,false,c.ink);} txt(`Date: ${inv.date}`,335,y,9,false,c.ink); y-=14;
      if(inv.customer.address){wrap(inv.customer.address,44).slice(0,2).forEach(a=>{txt(a,M,y,8,false,c.muted);y-=11;});}
      y-=10; tableHeader();
    }
    function tableHeader(){ const top=y; rect(M,top-24,W-2*M,24,c.light); txt('S.NO',M+8,top-16,8,true,c.muted); txt('PART / DESCRIPTION',M+50,top-16,8,true,c.muted); txt('QTY',386,top-16,8,true,c.muted,'right',410); txt('RATE',448,top-16,8,true,c.muted,'right',475); txt('AMOUNT',W-M,top-16,8,true,c.muted,'right',W-M-6); line(M,top-24,W-M,top-24,c.line,.7); y=top-31; }
    function newPage(){ pages.push(cmds.join('\n')); cmds=[]; header(false); }
    header();
    inv.items.forEach((it,idx)=>{
      const descLines=wrap(`${it.partNo||''}  ${it.description||''}`,42).slice(0,2); const rh=descLines.length>1?32:25; if(y-rh<150)newPage();
      txt(String(idx+1),M+9,y-12,8,false,c.ink); txt(descLines[0],M+50,y-12,8.5,true,c.ink); if(descLines[1])txt(descLines[1],M+50,y-23,7.5,false,c.muted);
      const qty=Number(it.qty||0).toFixed(Number(it.qty)%1?2:0); const rate=Number(it.rate||0).toFixed(2); const amount=(Number(it.qty||0)*Number(it.rate||0)).toFixed(2);
      txt(qty,410,y-12,8.5,false,c.ink,'right',410); txt(rate,475,y-12,8.5,false,c.ink,'right',475); txt(amount,W-M-6,y-12,8.5,true,c.ink,'right',W-M-6);
      line(M,y-rh,W-M,y-rh,c.line,.55); y-=rh;
    });
    if(y<205)newPage();
    const t={subtotal:inv.subtotal??inv.items.reduce((s,i)=>s+num(i.qty)*num(i.rate),0),discount:inv.discount||0,charges:inv.otherCharges||0,total:inv.total};
    const bx=330,bw=W-M-bx; y-=12; txt('Subtotal',bx,y,9,false,c.muted); txt(`Rs. ${Number(t.subtotal).toFixed(2)}`,W-M,y,9,true,c.ink,'right',W-M); y-=20;
    txt('Discount',bx,y,9,false,c.muted); txt(`Rs. ${Number(t.discount).toFixed(2)}`,W-M,y,9,true,c.ink,'right',W-M); y-=20;
    txt('Other charges',bx,y,9,false,c.muted); txt(`Rs. ${Number(t.charges).toFixed(2)}`,W-M,y,9,true,c.ink,'right',W-M); y-=8; line(bx,y,W-M,y,c.line,.8); y-=25;
    txt('GRAND TOTAL',bx,y,10,true,c.brand); txt(`Rs. ${Number(t.total||0).toFixed(2)}`,W-M,y,14,true,c.brand,'right',W-M); y-=28;
    if(inv.note){txt('Note:',M,y,8,true,c.muted); wrap(inv.note,70).slice(0,3).forEach((s,k)=>txt(s,M,y-13-(k*11),8,false,c.ink));}
    const footY=56; line(M,footY+22,W-M,footY+22,c.line,.7); txt(settings.footerNote||'Thank you for your business.',M,footY,8,false,c.muted); txt(`Payment: ${inv.paymentStatus||'Unpaid'}`,W-M,footY,8,true,inv.paymentStatus==='Paid'?c.green:c.muted,'right',W-M);
    if(settings.paymentDetails)txt(settings.paymentDetails,M,footY-14,7.5,false,c.muted);
    pages.push(cmds.join('\n'));

    const objs=[]; const add=o=>{objs.push(o);return objs.length};
    const catalog=add(''); const pagesObj=add(''); const f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); const f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const pageIds=[];
    for(const content of pages){ const stream=add(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`); const p=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${stream} 0 R >>`); pageIds.push(p); }
    objs[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`; objs[pagesObj-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    let out='%PDF-1.4\n%SPB\n', offsets=[0]; for(let i=0;i<objs.length;i++){ offsets[i+1]=new TextEncoder().encode(out).length; out+=`${i+1} 0 obj\n${objs[i]}\nendobj\n`; } const xref=new TextEncoder().encode(out).length; out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objs.length;i++)out+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`; out+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([new TextEncoder().encode(out)],{type:'application/pdf'});
  }
  function downloadBlob(blob,name){ const u=URL.createObjectURL(blob); const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500); }
  function fileName(inv){ return `${(inv.invoiceNo||'invoice').replace(/[^a-z0-9-_]/gi,'-')}-${(inv.customer.name||'customer').replace(/[^a-z0-9-_]/gi,'-')}.pdf`; }
  function downloadPDF(inv){ const blob=makePDF(inv); downloadBlob(blob,fileName(inv)); }
  $('downloadBtn').onclick=()=>{ const inv=saveInvoice(true); if(inv){downloadPDF(inv);toast('PDF downloaded');} };
  $('previewBtn').onclick=()=>{ const inv=collect(); if(!validate(inv))return; const url=URL.createObjectURL(makePDF(inv)); window.open(url,'_blank','noopener'); setTimeout(()=>URL.revokeObjectURL(url),60000); };
  $('shareBtn').onclick=async()=>{ const inv=saveInvoice(true); if(!inv)return; const blob=makePDF(inv), file=new File([blob],fileName(inv),{type:'application/pdf'}); try{ if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({title:`Invoice ${inv.invoiceNo}`,text:`Invoice ${inv.invoiceNo} - ${inv.customer.name}`,files:[file]}); toast('PDF shared');}else{downloadBlob(blob,file.name);toast('PDF download hua — WhatsApp me attach karo');} }catch(e){ if(e?.name!=='AbortError'){downloadBlob(blob,file.name);toast('Share unavailable — PDF downloaded');} } };

  $('exportBackupBtn').title='JSON backup';
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  $('invoiceDate').value=today(); renderItems(); setInvoiceLabels(); renderCatalog();
})();
