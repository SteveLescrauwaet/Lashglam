(() => {
  'use strict';

  const SUPABASE_URL = 'https://cbgxfacrfcblckrwciuh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Twd4c4RPZPLJMiQ4eepx7g_3hCwf2mM';
  const VERSION = '1.6.0';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const PAYMENTS = [
    { id:'espece', label:'Espèce', icon:'€' },
    { id:'carte_perso', label:'CB perso', icon:'P' },
    { id:'carte_pro', label:'CB Pro', icon:'PRO' }
  ];

  const DEFAULT_CATALOG = [
    ['Extensions de cils - cil à cil','prestation',40,120,'https://iara.b-cdn.net/9c17613362ec3b376082c3cddd857edf_DpvsnU05Ib-cover.jpg?class=xs',0,false],
    ['REMPLISSAGE - pose cil à cil','prestation',30,120,'https://iara.b-cdn.net/f91df88d3f783621d7d3f3bd14f3e165_DpvsnU05Ib-cover.jpg?class=xs',1,false],
    ['Extensions de cils - pose mixte','prestation',45,135,'https://iara.b-cdn.net/a47413d364352ce4251f52d0f9c81cbe_DpvsnU05Ib-cover.jpg?class=xs',2,false],
    ['REMPLISSAGE - pose mixte','prestation',35,120,'https://iara.b-cdn.net/370c5fd9e8db8a553c959fcc06f31a52_DpvsnU05Ib-cover.jpg?class=xs',3,false],
    ['Extensions de cils - volume russe','prestation',50,135,'https://iara.b-cdn.net/c6dbf372fabee92b7b725191acbeafb5_DpvsnU05Ib-cover.jpg?class=xs',4,false],
    ['REMPLISSAGE - volume russe','prestation',40,120,'https://iara.b-cdn.net/0a1a1f0d2ceb79c7bf4b65dad6588b85_DpvsnU05Ib-cover.jpg?class=xs',5,false],
    ['Rehaussement de cils','prestation',30,75,'https://iara.b-cdn.net/6db8420092706a897e9dffd5246743f1_CATALOGUE%20TAILLE%20540-2.png?class=xs',6,true],
    ['Rehaussement de cils avec teinture','prestation',35,105,'https://iara.b-cdn.net/69e599f5dafa21a230c30e3e713ac60b_5afe2951a2c827189c361e831161da7d.jpg?class=xs',7,true],
    ['Browlift','prestation',25,45,'https://iara.b-cdn.net/48685eb9e1d5e4a427daeb7f5865097b_657c220d8a19177d202581bc17125d74.jpg?class=xs',8,true],
    ['Dépose','prestation',15,20,'https://iara.b-cdn.net/d3b1bd5e6902b508b6b6f441910cdf65_EyelashRemover.jpg?class=xs',9,true]
  ].map(([name,type,price,duration_minutes,image_url,sort_order,is_solo]) => ({name,type,price,duration_minutes,image_url,sort_order,is_solo}));

  const state = {
    session:null, user:null, view:'sale', month:new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    catalog:[], sales:[], cart:[], catalogTab:'prestation', payment:'espece', saleDate:toDateInput(new Date()), note:'', manualTotal:null, saleSuccess:'', busy:false
  };

  const app = document.getElementById('app');
  const euro = n => new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(Number(n||0));
  const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function toDateInput(d){ const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; }
  function dateLabel(v){ return new Intl.DateTimeFormat('fr-BE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v)); }
  function monthLabel(){ return new Intl.DateTimeFormat('fr-BE',{month:'long',year:'numeric'}).format(state.month); }
  function sameMonth(v){ const d=new Date(v); return d.getFullYear()===state.month.getFullYear() && d.getMonth()===state.month.getMonth(); }
  function payInfo(id){ return PAYMENTS.find(p=>p.id===id) || {id,label:id,icon:'?'}; }
  const META_PREFIX='[[BEAUTY_CA_META:';
  function round2(n){ return Math.round((Number(n)||0)*100)/100; }
  function rawSaleTotal(s){ return round2((s.sale_lines||[]).reduce((a,l)=>a+Number(l.unit_price)*Number(l.quantity),0)); }
  function parseSaleNote(note){
    const raw=String(note||'');
    if(!raw.startsWith(META_PREFIX)) return {text:raw,total:null,base:null};
    const end=raw.indexOf(']]');
    if(end<0) return {text:raw,total:null,base:null};
    try{
      const meta=JSON.parse(raw.slice(META_PREFIX.length,end));
      return {text:raw.slice(end+2).replace(/^\n/,''),total:Number(meta.total),base:Number(meta.base)};
    }catch(_){ return {text:raw,total:null,base:null}; }
  }
  function buildSaleNote(text,base,total){
    const clean=String(text||'').trim(), b=round2(base), t=round2(total);
    if(Math.abs(b-t)<0.005) return clean;
    return `${META_PREFIX}${JSON.stringify({base:b,total:t})}]]${clean?'\n'+clean:''}`;
  }
  function saleTotal(s){ const meta=parseSaleNote(s.note); return Number.isFinite(meta.total)?round2(meta.total):rawSaleTotal(s); }
  function saleDisplayNote(s){ return parseSaleNote(s.note).text.trim(); }
  function saleDiscount(s){ return Math.max(0,round2(rawSaleTotal(s)-saleTotal(s))); }
  function parseMoney(v){ const n=Number(String(v??'').replace(/\s/g,'').replace(',','.')); return Number.isFinite(n)?round2(n):null; }
  function monthSales(){ return state.sales.filter(s=>sameMonth(s.sale_date)); }
  function notify(msg,type='success'){ const old=document.querySelector('.toast'); if(old) old.remove(); const e=document.createElement('div'); e.className=`toast alert ${type}`; e.textContent=msg; Object.assign(e.style,{position:'fixed',right:'16px',bottom:'16px',zIndex:'500',maxWidth:'360px',boxShadow:'0 12px 40px rgba(0,0,0,.4)'}); document.body.appendChild(e); setTimeout(()=>e.remove(),3200); }

  async function init(){
    const {data:{session}} = await sb.auth.getSession();
    state.session=session; state.user=session?.user||null;
    sb.auth.onAuthStateChange(async (_event, session) => { state.session=session; state.user=session?.user||null; if(state.user) await loadAll(); render(); });
    if(state.user) await loadAll();
    render();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }

  async function loadAll(){
    state.busy=true; render();
    await seedDefaults();
    const [catRes,salesRes] = await Promise.all([
      sb.from('catalog_items').select('*').order('type').order('sort_order'),
      sb.from('sales').select('*, sale_lines(*)').order('sale_date',{ascending:false})
    ]);
    if(catRes.error) notify('Catalogue : '+catRes.error.message,'error'); else state.catalog=catRes.data||[];
    if(salesRes.error) notify('Historique : '+salesRes.error.message,'error'); else state.sales=salesRes.data||[];
    state.busy=false;
  }

  async function seedDefaults(){
    if(!state.user) return;
    const {data:settings} = await sb.from('user_settings').select('*').eq('user_id',state.user.id).maybeSingle();
    if(settings?.defaults_seeded) return;
    const {count} = await sb.from('catalog_items').select('*',{count:'exact',head:true}).eq('user_id',state.user.id);
    if(!count){
      const rows=DEFAULT_CATALOG.map(x=>({...x,user_id:state.user.id}));
      const {error}=await sb.from('catalog_items').insert(rows); if(error){ notify('Initialisation : '+error.message,'error'); return; }
    }
    await sb.from('user_settings').upsert({user_id:state.user.id,defaults_seeded:true},{onConflict:'user_id'});
  }

  function render(){
    if(!state.user){ renderAuth(); return; }
    app.innerHTML = shellHTML();
    bindShell();
    renderView();
  }

  function renderAuth(){
    app.innerHTML=`<div class="center-screen"><form id="authForm" class="auth-card">
      <div class="brand-mark">CA</div><p class="eyebrow">SUIVI D’ACTIVITÉ</p><h1>Connexion</h1>
      <p class="muted">Prestations, produits, paiements et chiffre d’affaires synchronisés avec Supabase.</p>
      <label>E-mail<input id="email" type="email" required autocomplete="email"></label>
      <label>Mot de passe<input id="password" type="password" required minlength="6" autocomplete="current-password"></label>
      <div id="authMsg"></div>
      <button class="primary full" type="submit">Se connecter</button>
      <button class="text-btn full" id="signupBtn" type="button">Première utilisation ? Créer le compte</button>
      <small class="muted">Version ${VERSION}</small>
    </form></div>`;
    let mode='login'; const form=document.getElementById('authForm'), sign=document.getElementById('signupBtn'), msg=document.getElementById('authMsg');
    sign.onclick=()=>{ mode=mode==='login'?'signup':'login'; form.querySelector('h1').textContent=mode==='login'?'Connexion':'Créer le compte'; form.querySelector('button[type=submit]').textContent=mode==='login'?'Se connecter':'Créer le compte'; sign.textContent=mode==='login'?'Première utilisation ? Créer le compte':'J’ai déjà un compte'; msg.innerHTML=''; };
    form.onsubmit=async e=>{ e.preventDefault(); const email=document.getElementById('email').value.trim(), password=document.getElementById('password').value; const btn=form.querySelector('button[type=submit]'); btn.disabled=true; btn.textContent='Patiente…'; const res=mode==='login'?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password}); if(res.error) msg.innerHTML=`<div class="alert error">${esc(res.error.message)}</div>`; else if(mode==='signup'&&!res.data.session) msg.innerHTML='<div class="alert success">Compte créé. Vérifie ton e-mail si la confirmation est activée.</div>'; btn.disabled=false; btn.textContent=mode==='login'?'Se connecter':'Créer le compte'; };
  }

  function shellHTML(){
    return `<div class="shell"><header class="topbar"><div class="brand-mark">CA</div><div class="topbar-title"><strong>Suivi Beauty</strong><small>${esc(state.user.email)}</small></div>
      <nav class="nav">${[['sale','Nouvelle vente'],['dashboard','Tableau de bord'],['catalog','Catalogue'],['history','Historique']].map(([id,l])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${l}</button>`).join('')}</nav>
      <div class="top-actions"><span class="connection-dot">Supabase</span><button id="logout" class="secondary">Déconnexion</button></div></header>
      <main id="view" class="page"></main><div class="footer">PWA directe GitHub Pages · v${VERSION}</div></div>`;
  }
  function bindShell(){ document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render();}); document.getElementById('logout').onclick=()=>sb.auth.signOut(); }
  function renderView(){ if(state.view==='dashboard') renderDashboard(); else if(state.view==='sale') renderSale(); else if(state.view==='history') renderHistory(); else renderCatalogAdmin(); }
  function monthNavHTML(){ return `<div class="month-nav"><button id="prevMonth" class="secondary">‹</button><div class="month-label">${esc(monthLabel())}</div><button id="nextMonth" class="secondary">›</button></div>`; }
  function bindMonthNav(){ document.getElementById('prevMonth').onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderView();}; document.getElementById('nextMonth').onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderView();}; }

  function renderDashboard(){
    const sales=monthSales(); let ca=0,prest=0,prod=0;
    sales.forEach(s=>{
      let rawPrest=0,rawProd=0;
      (s.sale_lines||[]).forEach(l=>{ const v=Number(l.unit_price)*Number(l.quantity); if(l.type_snapshot==='prestation')rawPrest+=v; else rawProd+=v; });
      const raw=rawPrest+rawProd, paid=saleTotal(s), ratio=raw>0?paid/raw:0;
      ca+=paid; prest+=rawPrest*ratio; prod+=rawProd*ratio;
    });
    ca=round2(ca); prest=round2(prest); prod=round2(prod);
    const payTotals=Object.fromEntries(PAYMENTS.map(p=>[p.id,0])); sales.forEach(s=>payTotals[s.payment_method]=(payTotals[s.payment_method]||0)+saleTotal(s));
    document.getElementById('view').innerHTML=`<div class="page-head"><div><h1>Tableau de bord</h1><p>Analyse mensuelle de ton activité.</p></div>${monthNavHTML()}</div>
      <div class="metric-grid"><div class="metric"><span>Chiffre d’affaires</span><strong>${euro(ca)}</strong></div><div class="metric"><span>Prestations</span><strong>${euro(prest)}</strong></div><div class="metric"><span>Produits</span><strong>${euro(prod)}</strong></div><div class="metric"><span>Ventes</span><strong>${sales.length}</strong></div><div class="metric"><span>Panier moyen</span><strong>${euro(sales.length?ca/sales.length:0)}</strong></div></div>
      <section class="panel"><h2>Moyens de paiement</h2><div class="payment-bars">${PAYMENTS.map(p=>{const v=payTotals[p.id]||0,pct=ca?Math.round(v/ca*100):0;return `<div class="payment-row"><strong>${p.icon} ${p.label}</strong><div class="bar"><i style="width:${pct}%"></i></div><span>${euro(v)} · ${pct}%</span></div>`}).join('')}</div></section>`;
    bindMonthNav();
  }

  function renderSale(){
    const items=state.catalog.filter(x=>x.type===state.catalogTab).sort((a,b)=>a.sort_order-b.sort_order);
    const baseTotal=round2(state.cart.reduce((a,l)=>a+Number(l.item.price)*l.qty,0));
    const entered=state.manualTotal===null?baseTotal:Math.min(baseTotal,Math.max(0,round2(state.manualTotal)));
    const discount=Math.max(0,round2(baseTotal-entered));
    const discountPct=baseTotal?Math.round(discount/baseTotal*100):0;
    document.getElementById('view').innerHTML=`<div class="page-head"><div><h1>Nouvelle vente</h1><p>Sélectionne les prestations ou produits à encaisser.</p></div></div>${state.saleSuccess?`<div class="alert success sale-success">✓ ${esc(state.saleSuccess)}</div>`:''}
      <div class="checkout"><section><div class="catalog-tabs"><button id="tabPrest" class="${state.catalogTab==='prestation'?'primary':'secondary'}">Prestations</button><button id="tabProd" class="${state.catalogTab==='produit'?'primary':'secondary'}">Produits</button></div>
      <div class="catalog-grid">${items.length?items.map(item=>catalogCard(item)).join(''):'<div class="empty">Aucun élément dans cette catégorie.</div>'}</div></section>
      <aside class="cart"><h2>Panier</h2><div class="cart-lines">${state.cart.length?state.cart.map((l,i)=>`<div class="cart-line"><div class="cart-line-head"><strong>${esc(l.item.name)}</strong><b>${euro(l.item.price*l.qty)}</b></div><div class="qty"><button data-minus="${i}">−</button><strong>${l.qty}</strong><button data-plus="${i}">+</button><span>${euro(l.item.price)} / unité</span></div></div>`).join(''):'<div class="empty">Le panier est vide.</div>'}</div>
      <div class="cart-subtotal"><span>Sous-total</span><strong>${euro(baseTotal)}</strong></div>
      <div class="manual-total-block"><label for="manualTotal">Total à payer <small>(modifiable pour appliquer une remise)</small></label><div class="manual-total-input"><input id="manualTotal" inputmode="decimal" autocomplete="off" value="${entered.toFixed(2).replace('.',',')}" ${state.cart.length?'':'disabled'}><span>€</span></div><div id="discountInfo" class="discount-info ${discount>0?'active':''}">${discount>0?`Remise : −${euro(discount)} (${discountPct} %)`:'Aucune remise'}</div>${discount>0?'<button id="resetDiscount" class="text-btn reset-discount" type="button">Annuler la remise</button>':''}</div>
      <label style="margin-top:12px">Date<input id="saleDate" type="date" value="${state.saleDate}"></label><span style="display:block;margin-top:12px;color:var(--muted);font-size:13px;font-weight:700">Mode de paiement</span><div class="pay-grid">${PAYMENTS.map(p=>`<button class="pay-btn ${state.payment===p.id?'active':''}" data-pay="${p.id}">${p.icon} ${p.label}</button>`).join('')}</div><label>Cliente / remarque<textarea id="saleNote" placeholder="Facultatif">${esc(state.note)}</textarea></label><button id="saveSale" class="primary full" style="margin-top:12px" ${state.cart.length?'':'disabled'}>Enregistrer la vente</button></aside></div>`;
    document.getElementById('tabPrest').onclick=()=>{state.catalogTab='prestation';renderSale();}; document.getElementById('tabProd').onclick=()=>{state.catalogTab='produit';renderSale();};
    document.querySelectorAll('[data-add]').forEach(x=>x.onclick=()=>addCart(x.dataset.add)); document.querySelectorAll('[data-minus]').forEach(x=>x.onclick=()=>changeQty(+x.dataset.minus,-1)); document.querySelectorAll('[data-plus]').forEach(x=>x.onclick=()=>changeQty(+x.dataset.plus,1)); document.querySelectorAll('[data-pay]').forEach(x=>x.onclick=()=>{state.payment=x.dataset.pay;renderSale();});
    const totalInput=document.getElementById('manualTotal');
    totalInput.oninput=e=>{
      const value=parseMoney(e.target.value);
      if(value===null) return;
      state.manualTotal=Math.min(baseTotal,Math.max(0,value));
      const d=Math.max(0,round2(baseTotal-state.manualTotal)), pct=baseTotal?Math.round(d/baseTotal*100):0;
      const info=document.getElementById('discountInfo'); if(info){ info.classList.toggle('active',d>0); info.textContent=d>0?`Remise : −${euro(d)} (${pct} %)`:'Aucune remise'; }
    };
    totalInput.onblur=e=>{ const value=parseMoney(e.target.value); state.manualTotal=value===null?null:Math.min(baseTotal,Math.max(0,value)); renderSale(); };
    const reset=document.getElementById('resetDiscount'); if(reset) reset.onclick=()=>{state.manualTotal=null;renderSale();};
    document.getElementById('saleDate').onchange=e=>state.saleDate=e.target.value; document.getElementById('saleNote').oninput=e=>state.note=e.target.value; document.getElementById('saveSale').onclick=saveSale;
  }
  function catalogCard(item){ const img=item.image_url?`<img src="${esc(item.image_url)}" alt="" onerror="this.outerHTML='<div class=&quot;img-fallback&quot;>Image</div>'">`:'<div class="img-fallback">Image</div>'; return `<article class="catalog-card ${item.is_solo?'solo':''}" data-add="${item.id}">${img}<div class="card-body"><strong>${esc(item.name)}</strong><small>${item.type==='prestation'&&item.duration_minutes?durationLabel(item.duration_minutes):item.type==='produit'?'Produit':''}</small><b>${euro(item.price)}</b><div class="add-hint">+ Ajouter</div></div></article>`; }
  function durationLabel(m){ const h=Math.floor(m/60),min=m%60; return h&&min?`${h}h${String(min).padStart(2,'0')}`:h?`${h}h`:`${min} min`; }
  function addCart(id){ state.saleSuccess=''; state.manualTotal=null; const item=state.catalog.find(x=>x.id===id); if(!item)return; const l=state.cart.find(x=>x.item.id===id); if(l)l.qty++; else state.cart.push({item,qty:1}); renderSale(); }
  function changeQty(i,d){ state.manualTotal=null; state.cart[i].qty+=d; if(state.cart[i].qty<=0)state.cart.splice(i,1); renderSale(); }
  async function saveSale(){
    if(!state.cart.length)return;
    const baseTotal=round2(state.cart.reduce((a,l)=>a+Number(l.item.price)*l.qty,0));
    const finalTotal=state.manualTotal===null?baseTotal:Math.min(baseTotal,Math.max(0,round2(state.manualTotal)));
    const btn=document.getElementById('saveSale'); btn.disabled=true; btn.textContent='Enregistrement…';
    const dt=new Date(`${state.saleDate}T12:00:00`);
    const storedNote=buildSaleNote(state.note,baseTotal,finalTotal);
    const {data:sale,error}=await sb.from('sales').insert({user_id:state.user.id,sale_date:dt.toISOString(),payment_method:state.payment,note:storedNote}).select().single();
    if(error){notify(error.message,'error');renderSale();return;}
    const lines=state.cart.map(l=>({user_id:state.user.id,sale_id:sale.id,catalog_item_id:l.item.id,name_snapshot:l.item.name,type_snapshot:l.item.type,unit_price:l.item.price,quantity:l.qty}));
    const {error:lineErr}=await sb.from('sale_lines').insert(lines);
    if(lineErr){await sb.from('sales').delete().eq('id',sale.id);notify(lineErr.message,'error');renderSale();return;}
    state.cart=[]; state.note=''; state.manualTotal=null; state.saleDate=toDateInput(new Date()); state.saleSuccess='Vente validée';
    await loadAll(); state.view='sale'; render(); notify(finalTotal<baseTotal?`Vente validée avec une remise de ${euro(baseTotal-finalTotal)}.`:'Vente validée.');
  }

  function renderHistory(){
    const sales=monthSales(), total=sales.reduce((a,s)=>a+saleTotal(s),0);
    document.getElementById('view').innerHTML=`<div class="page-head"><div><h1>Historique</h1><p>Ventes regroupées par mode de paiement. Tu peux supprimer une ligne ou une vente complète.</p></div>${monthNavHTML()}</div><div class="history-total">${sales.length} vente${sales.length>1?'s':''} · ${euro(total)}</div><div class="history-groups">${PAYMENTS.map(p=>historyGroup(p,sales.filter(s=>s.payment_method===p.id))).join('')}</div>`;
    bindMonthNav();
    document.querySelectorAll('[data-delete-sale]').forEach(b=>b.onclick=()=>deleteHistorySale(b.dataset.deleteSale));
    document.querySelectorAll('[data-delete-line]').forEach(b=>b.onclick=()=>deleteHistoryLine(b.dataset.deleteLine,b.dataset.saleId));
  }
  function historyGroup(p,sales){
    const total=sales.reduce((a,s)=>a+saleTotal(s),0);
    return `<details class="pay-group" open><summary><div class="pay-icon">${p.icon}</div><div class="pay-title"><strong>${p.label}</strong><span>${sales.length} vente${sales.length>1?'s':''}</span></div><b>${euro(total)}</b></summary><div class="pay-body">${sales.length?sales.map(s=>{
      const raw=rawSaleTotal(s), paid=saleTotal(s), discount=saleDiscount(s), note=saleDisplayNote(s);
      return `<details class="sale-card"><summary><div><strong>${esc(note||'Vente')}</strong><span>${dateLabel(s.sale_date)}</span></div><b>${euro(paid)}</b></summary><div class="sale-details">${(s.sale_lines||[]).map(l=>`<div class="sale-line"><div class="sale-line-main"><strong>${esc(l.name_snapshot)}</strong><br><small>${l.quantity} × ${euro(l.unit_price)} · ${l.type_snapshot==='produit'?'Produit':'Prestation'}</small></div><div class="sale-line-actions"><b>${euro(Number(l.unit_price)*Number(l.quantity))}</b><button class="history-delete-line" type="button" data-delete-line="${l.id}" data-sale-id="${s.id}" title="Supprimer cette ligne">×</button></div></div>`).join('')}${discount>0?`<div class="history-discount"><div><span>Sous-total</span><b>${euro(raw)}</b></div><div><span>Remise appliquée</span><b>−${euro(discount)}</b></div><div class="history-paid"><span>Total payé</span><b>${euro(paid)}</b></div></div>`:''}<div class="sale-footer"><button class="danger-btn compact" type="button" data-delete-sale="${s.id}">Supprimer la vente complète</button></div></div></details>`;
    }).join(''):'<div class="empty">Aucune vente.</div>'}</div></details>`;
  }
  async function deleteHistorySale(id){
    const sale=state.sales.find(s=>s.id===id);
    if(!sale) return;
    const amount=euro(saleTotal(sale));
    if(!confirm(`Supprimer définitivement cette vente de ${amount} ?\n\nCette action supprimera aussi toutes les prestations et tous les produits de cette vente.`)) return;
    const {error}=await sb.from('sales').delete().eq('id',id).eq('user_id',state.user.id);
    if(error){ notify('Suppression : '+error.message,'error'); return; }
    await loadAll(); renderHistory(); notify('Vente supprimée.');
  }
  async function deleteHistoryLine(lineId,saleId){
    const sale=state.sales.find(s=>s.id===saleId);
    const line=sale?.sale_lines?.find(l=>l.id===lineId);
    if(!sale||!line) return;
    const lines=sale.sale_lines||[];
    if(lines.length===1){
      if(!confirm(`« ${line.name_snapshot} » est le seul élément de cette vente.\n\nSupprimer la vente complète ?`)) return;
      const {error}=await sb.from('sales').delete().eq('id',saleId).eq('user_id',state.user.id);
      if(error){ notify('Suppression : '+error.message,'error'); return; }
      await loadAll(); renderHistory(); notify('Vente supprimée.'); return;
    }
    if(!confirm(`Supprimer « ${line.name_snapshot} » de cette vente ?`)) return;
    const oldBase=rawSaleTotal(sale), oldDiscount=saleDiscount(sale), removed=round2(Number(line.unit_price)*Number(line.quantity));
    const newBase=Math.max(0,round2(oldBase-removed)), newTotal=Math.max(0,round2(newBase-oldDiscount));
    const {error}=await sb.from('sale_lines').delete().eq('id',lineId).eq('user_id',state.user.id);
    if(error){ notify('Suppression : '+error.message,'error'); return; }
    const newNote=buildSaleNote(saleDisplayNote(sale),newBase,newTotal);
    const {error:noteErr}=await sb.from('sales').update({note:newNote}).eq('id',saleId).eq('user_id',state.user.id);
    if(noteErr) notify('Ligne supprimée, mais la remise n’a pas pu être recalculée : '+noteErr.message,'error');
    await loadAll(); renderHistory(); notify('Ligne supprimée de la vente.');
  }

  function renderCatalogAdmin(){
    const prest=state.catalog.filter(x=>x.type==='prestation').sort((a,b)=>a.sort_order-b.sort_order), prod=state.catalog.filter(x=>x.type==='produit').sort((a,b)=>a.sort_order-b.sort_order);
    document.getElementById('view').innerHTML=`<div class="admin-head"><div><h1 style="margin:0 0 5px">Catalogue</h1><p class="muted" style="margin:0">Ajoute tes produits et modifie l’ordre d’affichage.</p></div><button id="addItem" class="primary">+ Ajouter</button></div>${adminSection('Prestations',prest)}${adminSection('Produits',prod)}`;
    document.getElementById('addItem').onclick=()=>openItemModal(); document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openItemModal(state.catalog.find(x=>x.id===b.dataset.edit))); document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteItem(b.dataset.delete)); document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>moveItem(b.dataset.up,-1)); document.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>moveItem(b.dataset.down,1));
  }
  function adminSection(title,items){ return `<section style="margin-top:18px"><h2>${title}</h2><div class="admin-list">${items.length?items.map((x,i)=>`<div class="admin-item"><div class="thumb">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:''}</div><div class="admin-main"><strong>${esc(x.name)}</strong><span>${euro(x.price)}${x.type==='prestation'&&x.duration_minutes?' · '+durationLabel(x.duration_minutes):''}${x.is_solo?' · seul sur la ligne':''}</span></div><div class="admin-actions"><button class="icon-btn" data-up="${x.id}" title="Monter" ${i===0?'disabled':''}>↑</button><button class="icon-btn" data-down="${x.id}" title="Descendre" ${i===items.length-1?'disabled':''}>↓</button><button class="icon-btn" data-edit="${x.id}" title="Modifier">✎</button><button class="icon-btn" data-delete="${x.id}" title="Supprimer">×</button></div></div>`).join(''):'<div class="empty">Aucun élément.</div>'}</div></section>`; }

  function openItemModal(item=null){
    const wrap=document.createElement('div'); wrap.className='modal-backdrop'; wrap.innerHTML=`<form class="modal" id="itemForm"><div class="modal-head"><h2>${item?'Modifier':'Ajouter'} un élément</h2><button type="button" id="closeModal" class="secondary">×</button></div><div class="form-grid">
      <label>Type<select id="fType"><option value="prestation">Prestation</option><option value="produit">Produit</option></select></label><label>Nom<input id="fName" required value="${esc(item?.name||'')}"></label><label>Prix (€)<input id="fPrice" required type="number" min="0" step="0.01" value="${item?.price??''}"></label><label>Durée (minutes)<input id="fDuration" type="number" min="0" step="5" value="${item?.duration_minutes??0}"></label><label class="check-row span2"><input id="fSolo" type="checkbox" ${item?.is_solo?'checked':''}> Afficher seul sur une ligne</label>
      <div class="span2"><label>Image depuis le PC</label><div class="image-row" style="margin-top:7px"><div class="image-preview" id="preview">${item?.image_url?`<img src="${esc(item.image_url)}" alt="">`:'Aucune image'}</div><div><input id="fImage" type="file" accept="image/png,image/jpeg,image/webp"><p class="muted" style="font-size:12px">L’image sera envoyée dans Supabase Storage.</p></div></div></div></div><div id="formMsg"></div><div class="modal-actions"><button type="button" id="cancelModal" class="secondary">Annuler</button><button class="primary" type="submit">Enregistrer</button></div></form>`;
    document.body.appendChild(wrap); const type=document.getElementById('fType'); type.value=item?.type||'prestation'; const close=()=>wrap.remove(); document.getElementById('closeModal').onclick=close; document.getElementById('cancelModal').onclick=close; wrap.onclick=e=>{if(e.target===wrap)close();}; const file=document.getElementById('fImage'); file.onchange=()=>{ if(!file.files[0])return; document.getElementById('preview').innerHTML=`<img src="${URL.createObjectURL(file.files[0])}" alt="">`; };
    document.getElementById('itemForm').onsubmit=async e=>{ e.preventDefault(); const btn=e.submitter; btn.disabled=true;btn.textContent='Enregistrement…';let imageUrl=item?.image_url||null; if(file.files[0]){ const f=file.files[0], ext=(f.name.split('.').pop()||'jpg').toLowerCase(), path=`${state.user.id}/${crypto.randomUUID()}.${ext}`; const up=await sb.storage.from('catalog-images').upload(path,f,{upsert:false}); if(up.error){document.getElementById('formMsg').innerHTML=`<div class="alert error">${esc(up.error.message)}</div>`;btn.disabled=false;btn.textContent='Enregistrer';return;} imageUrl=sb.storage.from('catalog-images').getPublicUrl(path).data.publicUrl; }
      const typeVal=type.value; const siblings=state.catalog.filter(x=>x.type===typeVal); const row={user_id:state.user.id,type:typeVal,name:document.getElementById('fName').value.trim(),price:Number(document.getElementById('fPrice').value),duration_minutes:typeVal==='prestation'?Number(document.getElementById('fDuration').value||0):0,is_solo:document.getElementById('fSolo').checked,image_url:imageUrl,sort_order:item?.sort_order ?? siblings.length}; const res=item?await sb.from('catalog_items').update(row).eq('id',item.id):await sb.from('catalog_items').insert(row); if(res.error){document.getElementById('formMsg').innerHTML=`<div class="alert error">${esc(res.error.message)}</div>`;btn.disabled=false;btn.textContent='Enregistrer';return;} close();await loadAll();renderCatalogAdmin();notify(item?'Élément modifié.':'Élément ajouté.'); };
  }
  async function deleteItem(id){ const item=state.catalog.find(x=>x.id===id); if(!item||!confirm(`Supprimer « ${item.name} » ?`))return; const {error}=await sb.from('catalog_items').delete().eq('id',id); if(error){notify(error.message,'error');return;}await loadAll();renderCatalogAdmin();notify('Élément supprimé.'); }
  async function moveItem(id,delta){ const item=state.catalog.find(x=>x.id===id); if(!item)return; const group=state.catalog.filter(x=>x.type===item.type).sort((a,b)=>a.sort_order-b.sort_order), i=group.findIndex(x=>x.id===id), j=i+delta;if(j<0||j>=group.length)return; const other=group[j],a=item.sort_order,b=other.sort_order; const [r1,r2]=await Promise.all([sb.from('catalog_items').update({sort_order:b}).eq('id',item.id),sb.from('catalog_items').update({sort_order:a}).eq('id',other.id)]); if(r1.error||r2.error){notify((r1.error||r2.error).message,'error');return;}await loadAll();renderCatalogAdmin(); }

  init().catch(err=>{ app.innerHTML=`<div class="center-screen"><div class="auth-card"><h1>Erreur de démarrage</h1><div class="alert error">${esc(err.message)}</div><p class="muted">Recharge la page. Si le problème persiste, vérifie la connexion Internet.</p></div></div>`; });
})();
