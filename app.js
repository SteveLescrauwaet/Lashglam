(() => {
  'use strict';

  const SUPABASE_URL = 'https://cbgxfacrfcblckrwciuh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Twd4c4RPZPLJMiQ4eepx7g_3hCwf2mM';
  const VERSION = '1.13.0';
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const PAYMENTS = [
    { id:'espece', label:'Espèces', icon:'€' },
    { id:'carte_perso', label:'CB Perso', icon:'P' },
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
    catalog:[], clients:[], sales:[], cart:[], catalogTab:'prestation', selectedClientId:null, payment:null, saleDate:toDateInput(new Date()), note:'', manualTotal:null, saleSuccess:'', clientError:null, settingsError:null, loyaltyDiscountPercent:10, busy:false
  };

  const app = document.getElementById('app');
  const euro = n => new Intl.NumberFormat('fr-BE',{style:'currency',currency:'EUR'}).format(Number(n||0));
  const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function toDateInput(d){ const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; }
  function saleHistoryDateTime(s){ const d=new Date(s.sale_date); const encoded=new Date(s.created_at||s.sale_date); const date=new Intl.DateTimeFormat('fr-BE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d); const time=new Intl.DateTimeFormat('fr-BE',{hour:'2-digit',minute:'2-digit',hour12:false}).format(encoded); return `${date} · ${time}`; }
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
  function clientCode(c){ return c ? `CL${String(Number(c.client_number)||0).padStart(4,'0')}` : ''; }
  function clientName(c){ return c ? `${String(c.first_name||'').trim()} ${String(c.last_name||'').trim()}`.trim() : ''; }
  function clientForSale(s){ return state.clients.find(c=>c.id===s.client_id) || null; }
  function clientAppointmentCount(clientId){
    if(!clientId) return 0;
    return state.sales.filter(s=>s.client_id===clientId && (s.sale_lines||[]).some(l=>l.type_snapshot==='prestation')).length;
  }
  function loyaltyInfo(clientId){
    const completed=clientAppointmentCount(clientId);
    const hasPrestation=state.cart.some(l=>l.item.type==='prestation');
    const currentAppointment=completed+(hasPrestation?1:0);
    const eligible=completed>=5 || (hasPrestation && currentAppointment>=5);
    return {completed,hasPrestation,currentAppointment,eligible};
  }
  function loyaltyPercent(){ return Math.min(100,Math.max(0,Number(state.loyaltyDiscountPercent)||0)); }
  function percentLabel(v){ return new Intl.NumberFormat('fr-BE',{maximumFractionDigits:2}).format(Number(v)||0); }
  function clientSaleLabel(s){
    const c=clientForSale(s);
    if(c) return `${clientCode(c)} - ${clientName(c)}`;
    const legacy=saleDisplayNote(s);
    return legacy || 'Ancienne vente (sans client)';
  }
  function saleBreakdown(s){
    let rawPrest=0, rawProd=0;
    (s.sale_lines||[]).forEach(l=>{
      const v=Number(l.unit_price)*Number(l.quantity);
      if(l.type_snapshot==='prestation') rawPrest+=v; else rawProd+=v;
    });
    const raw=round2(rawPrest+rawProd), paid=saleTotal(s), ratio=raw>0?paid/raw:0;
    return {raw,paid,discount:Math.max(0,round2(raw-paid)),prest:round2(rawPrest*ratio),prod:round2(rawProd*ratio),ratio};
  }
  function exportMonthExcel(){
    if(!window.XLSX){ notify('Le module Excel n’a pas pu être chargé. Vérifie la connexion Internet puis recharge la page.','error'); return; }
    const sales=monthSales().slice().sort((a,b)=>new Date(a.sale_date)-new Date(b.sale_date));
    let ca=0,prest=0,prod=0,discounts=0;
    const payTotals=Object.fromEntries(PAYMENTS.map(p=>[p.id,0]));
    sales.forEach(s=>{
      const b=saleBreakdown(s); ca+=b.paid; prest+=b.prest; prod+=b.prod; discounts+=b.discount;
      payTotals[s.payment_method]=(payTotals[s.payment_method]||0)+b.paid;
    });
    ca=round2(ca); prest=round2(prest); prod=round2(prod); discounts=round2(discounts);
    const ym=`${state.month.getFullYear()}-${String(state.month.getMonth()+1).padStart(2,'0')}`;
    const niceMonth=new Intl.DateTimeFormat('fr-BE',{month:'long',year:'numeric'}).format(state.month);

    const summary=[
      ['CHIFFRE D’AFFAIRES MENSUEL'],['Mois',niceMonth],[],['Indicateur','Montant / valeur'],
      ['Chiffre d’affaires',ca],['Prestations',prest],['Produits',prod],['Remises accordées',discounts],
      ['Nombre de ventes',sales.length],['Panier moyen',sales.length?round2(ca/sales.length):0],[],
      ['Moyen de paiement','Montant','Part du CA'],
      ...PAYMENTS.map(p=>[p.label,round2(payTotals[p.id]||0),ca?round2((payTotals[p.id]||0)/ca*100)/100:0])
    ];
    const wsSummary=XLSX.utils.aoa_to_sheet(summary);
    wsSummary['!cols']=[{wch:28},{wch:20},{wch:14}];
    wsSummary['!merges']=[XLSX.utils.decode_range('A1:C1')];
    ['B5','B6','B7','B8','B10','B13','B14','B15'].forEach(a=>{if(wsSummary[a]) wsSummary[a].z='#,##0.00 [$€-fr-BE]';});
    ['C13','C14','C15'].forEach(a=>{if(wsSummary[a]) wsSummary[a].z='0.0%';});

    const saleRows=[['Date','Heure','N° client','Client','E-mail','Téléphone','Remarque','Mode de paiement','Sous-total (€)','Remise (€)','Total payé (€)','Prestations encaissées (€)','Produits encaissés (€)','Nombre de lignes']];
    sales.forEach(s=>{
      const d=new Date(s.sale_date), b=saleBreakdown(s), c=clientForSale(s);
      saleRows.push([
        new Date(d.getFullYear(),d.getMonth(),d.getDate()),`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
        c?clientCode(c):'',c?clientName(c):'',c?.email||'',c?.phone||'',saleDisplayNote(s),payInfo(s.payment_method).label,
        b.raw,b.discount,b.paid,b.prest,b.prod,(s.sale_lines||[]).length
      ]);
    });
    const wsSales=XLSX.utils.aoa_to_sheet(saleRows);
    wsSales['!cols']=[{wch:12},{wch:8},{wch:11},{wch:28},{wch:30},{wch:18},{wch:30},{wch:18},{wch:16},{wch:14},{wch:16},{wch:24},{wch:21},{wch:16}];
    wsSales['!autofilter']={ref:`A1:N${Math.max(1,saleRows.length)}`};
    for(let r=2;r<=saleRows.length;r++){
      if(wsSales[`A${r}`]) wsSales[`A${r}`].z='dd/mm/yyyy';
      ['I','J','K','L','M'].forEach(c=>{if(wsSales[`${c}${r}`]) wsSales[`${c}${r}`].z='#,##0.00 [$€-fr-BE]';});
    }

    const detailRows=[['Date','Heure','N° client','Client','Type','Désignation','Quantité','Prix unitaire (€)','Montant brut (€)','Remise répartie (€)','Montant encaissé (€)','Mode de paiement','Remarque']];
    sales.forEach(s=>{
      const d=new Date(s.sale_date), b=saleBreakdown(s), note=saleDisplayNote(s), pay=payInfo(s.payment_method).label, c=clientForSale(s);
      (s.sale_lines||[]).forEach(l=>{
        const gross=round2(Number(l.unit_price)*Number(l.quantity)), net=round2(gross*b.ratio), lineDiscount=Math.max(0,round2(gross-net));
        detailRows.push([new Date(d.getFullYear(),d.getMonth(),d.getDate()),`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,c?clientCode(c):'',c?clientName(c):'',l.type_snapshot==='produit'?'Produit':'Prestation',l.name_snapshot,Number(l.quantity),Number(l.unit_price),gross,lineDiscount,net,pay,note]);
      });
    });
    const wsDetail=XLSX.utils.aoa_to_sheet(detailRows);
    wsDetail['!cols']=[{wch:12},{wch:8},{wch:11},{wch:28},{wch:13},{wch:38},{wch:10},{wch:17},{wch:17},{wch:19},{wch:20},{wch:18},{wch:30}];
    wsDetail['!autofilter']={ref:`A1:M${Math.max(1,detailRows.length)}`};
    for(let r=2;r<=detailRows.length;r++){
      if(wsDetail[`A${r}`]) wsDetail[`A${r}`].z='dd/mm/yyyy';
      ['H','I','J','K'].forEach(c=>{if(wsDetail[`${c}${r}`]) wsDetail[`${c}${r}`].z='#,##0.00 [$€-fr-BE]';});
    }

    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,wsSummary,'Résumé');
    XLSX.utils.book_append_sheet(wb,wsSales,'Ventes');
    XLSX.utils.book_append_sheet(wb,wsDetail,'Détail');
    XLSX.writeFile(wb,`CA_${ym}.xlsx`,{compression:true});
    notify(`Export Excel ${niceMonth} créé.`);
  }
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
    const [catRes,clientsRes,salesRes,settingsRes] = await Promise.all([
      sb.from('catalog_items').select('*').order('type').order('sort_order'),
      sb.from('clients').select('*').order('client_number'),
      sb.from('sales').select('*, sale_lines(*)').order('sale_date',{ascending:false}),
      sb.from('user_settings').select('loyalty_discount_percent').eq('user_id',state.user.id).maybeSingle()
    ]);
    if(catRes.error) notify('Catalogue : '+catRes.error.message,'error'); else state.catalog=catRes.data||[];
    if(clientsRes.error){ state.clientError=clientsRes.error.message; state.clients=[]; notify('Clients : '+clientsRes.error.message,'error'); } else { state.clientError=null; state.clients=clientsRes.data||[]; }
    if(salesRes.error) notify('Historique : '+salesRes.error.message,'error'); else state.sales=salesRes.data||[];
    if(settingsRes.error){ state.settingsError=settingsRes.error.message; state.loyaltyDiscountPercent=10; } else { state.settingsError=null; state.loyaltyDiscountPercent=Number(settingsRes.data?.loyalty_discount_percent ?? 10); }
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
      <nav class="nav">${[['sale','Nouvelle vente'],['dashboard','Tableau de bord'],['catalog','Catalogue'],['clients','Clients'],['history','Historique']].map(([id,l])=>`<button data-view="${id}" class="${state.view===id?'active':''}">${l}</button>`).join('')}</nav>
      <div class="top-actions"><span class="connection-dot">Supabase</span><button id="logout" class="secondary">Déconnexion</button></div></header>
      <main id="view" class="page"></main><div class="footer">PWA directe GitHub Pages · v${VERSION}</div></div>`;
  }
  function bindShell(){ document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render();}); document.getElementById('logout').onclick=()=>sb.auth.signOut(); }
  function renderView(){ if(state.view==='dashboard') renderDashboard(); else if(state.view==='sale') renderSale(); else if(state.view==='history') renderHistory(); else if(state.view==='clients') renderClients(); else renderCatalogAdmin(); }
  function monthNavHTML(){ return `<div class="month-nav"><button id="prevMonth" class="secondary">‹</button><div class="month-label">${esc(monthLabel())}</div><button id="nextMonth" class="secondary">›</button></div>`; }
  function bindMonthNav(){ document.getElementById('prevMonth').onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderView();}; document.getElementById('nextMonth').onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderView();}; }

  function renderDashboard(){
    const sales=monthSales(); let ca=0,prest=0,prod=0;
    sales.forEach(s=>{ const b=saleBreakdown(s); ca+=b.paid; prest+=b.prest; prod+=b.prod; });
    ca=round2(ca); prest=round2(prest); prod=round2(prod);
    const payTotals=Object.fromEntries(PAYMENTS.map(p=>[p.id,0])); sales.forEach(s=>payTotals[s.payment_method]=(payTotals[s.payment_method]||0)+saleTotal(s));
    document.getElementById('view').innerHTML=`<div class="page-head"><div><h1>Tableau de bord</h1><p>Analyse mensuelle de ton activité.</p></div><div class="dashboard-tools">${monthNavHTML()}<button id="exportExcel" class="primary export-btn" type="button">↓ Exporter Excel</button></div></div>
      <div class="metric-grid"><div class="metric"><span>Chiffre d’affaires</span><strong>${euro(ca)}</strong></div><div class="metric"><span>Prestations</span><strong>${euro(prest)}</strong></div><div class="metric"><span>Produits</span><strong>${euro(prod)}</strong></div><div class="metric"><span>Ventes</span><strong>${sales.length}</strong></div><div class="metric"><span>Panier moyen</span><strong>${euro(sales.length?ca/sales.length:0)}</strong></div></div>
      <section class="panel"><h2>Moyens de paiement</h2><div class="payment-bars">${PAYMENTS.map(p=>{const v=payTotals[p.id]||0,pct=ca?Math.round(v/ca*100):0;return `<div class="payment-row"><strong>${p.icon} ${p.label}</strong><div class="bar"><i style="width:${pct}%"></i></div><span>${euro(v)} · ${pct}%</span></div>`}).join('')}</div></section>`;
    bindMonthNav();
    document.getElementById('exportExcel').onclick=exportMonthExcel;
  }

  function renderSale(){
    const items=state.catalog.filter(x=>x.type===state.catalogTab).sort((a,b)=>a.sort_order-b.sort_order);
    const selectedClient=state.clients.find(c=>c.id===state.selectedClientId)||null;
    const loyalty=selectedClient?loyaltyInfo(selectedClient.id):{completed:0,hasPrestation:false,currentAppointment:0,eligible:false};
    const baseTotal=round2(state.cart.reduce((a,l)=>a+Number(l.item.price)*l.qty,0));
    const loyaltyPct=loyaltyPercent(), loyaltyPctText=percentLabel(loyaltyPct);
    const loyaltyTotal=loyalty.eligible?round2(baseTotal*(1-loyaltyPct/100)):baseTotal;
    const entered=state.manualTotal===null?loyaltyTotal:Math.min(loyaltyTotal,Math.max(0,round2(state.manualTotal)));
    const discount=Math.max(0,round2(baseTotal-entered));
    const discountPct=baseTotal?Math.round(discount/baseTotal*100):0;
    const canChoosePayment=!!selectedClient;
    const canSave=state.cart.length>0 && !!selectedClient && !!state.payment;
    const loyaltyText=selectedClient ? (loyalty.completed>=5
      ? `<div class="loyalty-banner active">★ Fidélité active : ${loyaltyPctText} % de remise automatique · ${loyalty.completed} RDV réalisés</div>`
      : loyalty.eligible
        ? `<div class="loyalty-banner active">★ ${loyalty.currentAppointment}e RDV : ${loyaltyPctText} % de remise appliquée automatiquement</div>`
        : `<div class="loyalty-banner">${loyalty.completed} RDV réalisé${loyalty.completed>1?'s':''} · ${5-loyalty.completed} avant la remise fidélité de ${loyaltyPctText} %</div>`)
      : '';
    const discountText=discount>0
      ? `${loyalty.eligible?'Remise fidélité incluse · ':''}Remise totale : −${euro(discount)} (${discountPct} %)`
      : 'Aucune remise';

    document.getElementById('view').innerHTML=`<div class="page-head"><div><h1>Nouvelle vente</h1><p>Sélectionne d’abord le client, puis les prestations et le moyen de paiement.</p></div></div>${state.saleSuccess?`<div class="alert success sale-success">✓ ${esc(state.saleSuccess)}</div>`:''}${state.clientError?`<div class="alert error">Le fichier clients n’est pas encore configuré dans Supabase. Exécute le fichier <strong>supabase/update_v1.8_clients.sql</strong>.</div>`:''}
      <div class="checkout"><section><div class="catalog-tabs"><button id="tabPrest" class="${state.catalogTab==='prestation'?'primary':'secondary'}">Prestations</button><button id="tabProd" class="${state.catalogTab==='produit'?'primary':'secondary'}">Produits</button></div>
      <div class="catalog-grid">${items.length?items.map(item=>catalogCard(item)).join(''):'<div class="empty">Aucun élément dans cette catégorie.</div>'}</div></section>
      <aside class="cart"><h2>Panier</h2>
      <div class="checkout-step client-step"><div class="step-title"><span>1</span><strong>Client</strong></div><label class="client-search-label" for="clientSearchSale">Rechercher un client</label><div class="client-select-row client-search-sale-row"><div class="client-search-sale"><input id="clientSearchSale" type="search" autocomplete="off" spellcheck="false" placeholder="Tape le nom du client (ex. Flora)…" ${state.clientError?'disabled':''}><div id="clientSearchResults" class="client-search-results"></div></div><button id="newClientFromSale" class="secondary" type="button" ${state.clientError?'disabled':''}>+ Nouveau</button></div><div class="client-search-help">Tu peux rechercher par prénom, nom ou n° client. Clique sur le résultat pour le sélectionner.</div>${selectedClient?`<div class="selected-client"><div><small>Client sélectionné</small><strong>${esc(clientCode(selectedClient)+' - '+clientName(selectedClient))}</strong><span>${esc(selectedClient.email||'Pas d’e-mail')}${selectedClient.phone?' · '+esc(selectedClient.phone):''}</span></div><button id="clearSelectedClient" class="text-btn client-change-btn" type="button">Changer</button></div>${loyaltyText}`:'<div class="locked-hint">Commence à taper le nom du client ci-dessus, puis sélectionne-le dans la liste.</div>'}</div>
      <div class="cart-lines">${state.cart.length?state.cart.map((l,i)=>`<div class="cart-line"><div class="cart-line-head"><strong>${esc(l.item.name)}</strong><b>${euro(l.item.price*l.qty)}</b></div><div class="qty"><button data-minus="${i}">−</button><strong>${l.qty}</strong><button data-plus="${i}">+</button><span>${euro(l.item.price)} / unité</span></div></div>`).join(''):'<div class="empty">Le panier est vide.</div>'}</div>
      <div class="cart-subtotal"><span>Sous-total</span><strong>${euro(baseTotal)}</strong></div>
      <div class="manual-total-block"><label for="manualTotal">Total à payer <small>${loyalty.eligible?`La remise fidélité de ${loyaltyPctText} % est automatique. Tu peux encore diminuer le total.`:'Modifiable pour appliquer une remise.'}</small></label><div class="manual-total-input"><input id="manualTotal" inputmode="decimal" autocomplete="off" value="${entered.toFixed(2).replace('.',',')}" ${state.cart.length?'':'disabled'}><span>€</span></div><div id="discountInfo" class="discount-info ${discount>0?'active':''}">${discountText}</div>${discount>0?`<button id="resetDiscount" class="text-btn reset-discount" type="button">${loyalty.eligible?'Revenir à la remise fidélité':'Annuler la remise'}</button>`:''}</div>
      <label style="margin-top:12px">Date<input id="saleDate" type="date" value="${state.saleDate}"></label>
      <div class="checkout-step payment-step ${canChoosePayment?'':'locked'}"><div class="step-title"><span>2</span><strong>Mode de paiement</strong></div>${canChoosePayment?'':'<div class="locked-hint">Sélectionne d’abord le client.</div>'}<div class="pay-grid">${PAYMENTS.map(p=>`<button class="pay-btn ${state.payment===p.id?'active':''}" data-pay="${p.id}" ${canChoosePayment?'':'disabled'}>${p.icon} ${p.label}</button>`).join('')}</div></div>
      <label>Remarque<textarea id="saleNote" placeholder="Facultatif">${esc(state.note)}</textarea></label><button id="saveSale" class="primary full" style="margin-top:12px" ${canSave?'':'disabled'}>Enregistrer la vente</button></aside></div>`;

    document.getElementById('tabPrest').onclick=()=>{state.catalogTab='prestation';renderSale();};
    document.getElementById('tabProd').onclick=()=>{state.catalogTab='produit';renderSale();};
    document.querySelectorAll('[data-add]').forEach(x=>x.onclick=()=>addCart(x.dataset.add));
    document.querySelectorAll('[data-minus]').forEach(x=>x.onclick=()=>changeQty(+x.dataset.minus,-1));
    document.querySelectorAll('[data-plus]').forEach(x=>x.onclick=()=>changeQty(+x.dataset.plus,1));
    document.querySelectorAll('[data-pay]').forEach(x=>x.onclick=()=>{ if(!selectedClient)return; state.payment=x.dataset.pay;renderSale(); });
    const clientSearchInput=document.getElementById('clientSearchSale');
    const clientSearchResults=document.getElementById('clientSearchResults');
    const normalizeText=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    let currentClientMatches=[];
    const selectClientFromSearch=id=>{
      const client=state.clients.find(c=>c.id===id);
      if(!client)return;
      state.selectedClientId=id;
      state.payment=null;
      state.manualTotal=null;
      state.saleSuccess='';
      renderSale();
    };
    const renderClientSearchResults=(query='',showAll=false)=>{
      if(!clientSearchResults)return;
      const q=normalizeText(query.trim());
      let matches=state.clients.slice().sort((a,b)=>clientName(a).localeCompare(clientName(b),'fr',{sensitivity:'base'}));
      if(q){
        const tokens=q.split(/\s+/).filter(Boolean);
        matches=matches.filter(c=>{
          const haystack=normalizeText([clientCode(c),c.first_name,c.last_name,clientName(c),c.email,c.phone].join(' '));
          return tokens.every(t=>haystack.includes(t));
        });
        matches.sort((a,b)=>{
          const an=normalizeText(clientName(a)), bn=normalizeText(clientName(b));
          const as=an.startsWith(q)?0:1, bs=bn.startsWith(q)?0:1;
          return as-bs || an.localeCompare(bn,'fr');
        });
      } else if(!showAll){
        currentClientMatches=[];
        clientSearchResults.classList.remove('open');
        clientSearchResults.innerHTML='';
        return;
      }
      currentClientMatches=matches.slice(0,12);
      clientSearchResults.innerHTML=currentClientMatches.length?currentClientMatches.map(c=>`<button type="button" class="client-search-result" data-client-result="${c.id}"><strong>${esc(clientName(c))}</strong><span>${esc(clientCode(c))}${c.phone?' · '+esc(c.phone):''}${c.email?' · '+esc(c.email):''}</span></button>`).join(''):`<div class="client-search-empty">Aucun client trouvé. Utilise « + Nouveau » pour le créer.</div>`;
      clientSearchResults.classList.add('open');
      clientSearchResults.querySelectorAll('[data-client-result]').forEach(btn=>btn.onclick=()=>selectClientFromSearch(btn.dataset.clientResult));
    };
    if(clientSearchInput){
      clientSearchInput.oninput=e=>renderClientSearchResults(e.target.value,true);
      clientSearchInput.onfocus=e=>renderClientSearchResults(e.target.value,true);
      clientSearchInput.onkeydown=e=>{
        if(e.key==='Escape'){
          clientSearchResults.classList.remove('open');
          clientSearchInput.blur();
        } else if(e.key==='Enter'){
          e.preventDefault();
          if(currentClientMatches.length) selectClientFromSearch(currentClientMatches[0].id);
        }
      };
    }
    document.addEventListener('click',function closeClientSearch(ev){
      if(!clientSearchResults || !clientSearchResults.classList.contains('open'))return;
      if(ev.target.closest('.client-search-sale'))return;
      clientSearchResults.classList.remove('open');
      document.removeEventListener('click',closeClientSearch);
    });
    const clearSelectedClient=document.getElementById('clearSelectedClient');
    if(clearSelectedClient) clearSelectedClient.onclick=()=>{ state.selectedClientId=null; state.payment=null; state.manualTotal=null; state.saleSuccess=''; renderSale(); };
    document.getElementById('newClientFromSale').onclick=()=>openClientModal(null,{selectAfter:true});
    const totalInput=document.getElementById('manualTotal');
    totalInput.oninput=e=>{
      const value=parseMoney(e.target.value); if(value===null)return;
      state.manualTotal=Math.min(loyaltyTotal,Math.max(0,value));
      const d=Math.max(0,round2(baseTotal-state.manualTotal)), pct=baseTotal?Math.round(d/baseTotal*100):0;
      const info=document.getElementById('discountInfo'); if(info){ info.classList.toggle('active',d>0); info.textContent=d>0?`${loyalty.eligible?'Remise fidélité incluse · ':''}Remise totale : −${euro(d)} (${pct} %)`:'Aucune remise'; }
    };
    totalInput.onblur=e=>{ const value=parseMoney(e.target.value); state.manualTotal=value===null?null:Math.min(loyaltyTotal,Math.max(0,value)); renderSale(); };
    const reset=document.getElementById('resetDiscount'); if(reset) reset.onclick=()=>{state.manualTotal=null;renderSale();};
    document.getElementById('saleDate').onchange=e=>state.saleDate=e.target.value;
    document.getElementById('saleNote').oninput=e=>state.note=e.target.value;
    document.getElementById('saveSale').onclick=saveSale;
  }
  function catalogCard(item){ const img=item.image_url?`<img src="${esc(item.image_url)}" alt="" onerror="this.outerHTML='<div class=&quot;img-fallback&quot;>Image</div>'">`:'<div class="img-fallback">Image</div>'; return `<article class="catalog-card ${item.is_solo?'solo':''}" data-add="${item.id}">${img}<div class="card-body"><strong>${esc(item.name)}</strong><small>${item.type==='prestation'&&item.duration_minutes?durationLabel(item.duration_minutes):item.type==='produit'?'Produit':''}</small><b>${euro(item.price)}</b><div class="add-hint">+ Ajouter</div></div></article>`; }
  function durationLabel(m){ const h=Math.floor(m/60),min=m%60; return h&&min?`${h}h${String(min).padStart(2,'0')}`:h?`${h}h`:`${min} min`; }
  function addCart(id){ state.saleSuccess=''; state.manualTotal=null; const item=state.catalog.find(x=>x.id===id); if(!item)return; const l=state.cart.find(x=>x.item.id===id); if(l)l.qty++; else state.cart.push({item,qty:1}); renderSale(); }
  function changeQty(i,d){ state.manualTotal=null; state.cart[i].qty+=d; if(state.cart[i].qty<=0)state.cart.splice(i,1); renderSale(); }
  async function saveSale(){
    if(!state.cart.length) return;
    const client=state.clients.find(c=>c.id===state.selectedClientId);
    if(!client){ notify('Sélectionne ou crée le client avant de valider la vente.','error'); return; }
    if(!state.payment){ notify('Sélectionne le moyen de paiement.','error'); return; }
    const baseTotal=round2(state.cart.reduce((a,l)=>a+Number(l.item.price)*l.qty,0));
    const loyalty=loyaltyInfo(client.id), loyaltyPct=loyaltyPercent(), loyaltyPctText=percentLabel(loyaltyPct), loyaltyTotal=loyalty.eligible?round2(baseTotal*(1-loyaltyPct/100)):baseTotal;
    const finalTotal=state.manualTotal===null?loyaltyTotal:Math.min(loyaltyTotal,Math.max(0,round2(state.manualTotal)));
    const btn=document.getElementById('saveSale'); btn.disabled=true; btn.textContent='Enregistrement…';
    const dt=new Date(`${state.saleDate}T12:00:00`);
    const storedNote=buildSaleNote(state.note,baseTotal,finalTotal);
    const {data:sale,error}=await sb.from('sales').insert({user_id:state.user.id,client_id:client.id,sale_date:dt.toISOString(),payment_method:state.payment,note:storedNote}).select().single();
    if(error){notify(error.message,'error');renderSale();return;}
    const lines=state.cart.map(l=>({user_id:state.user.id,sale_id:sale.id,catalog_item_id:l.item.id,name_snapshot:l.item.name,type_snapshot:l.item.type,unit_price:l.item.price,quantity:l.qty}));
    const {error:lineErr}=await sb.from('sale_lines').insert(lines);
    if(lineErr){await sb.from('sales').delete().eq('id',sale.id);notify(lineErr.message,'error');renderSale();return;}
    const loyaltyApplied=loyalty.eligible;
    state.cart=[]; state.note=''; state.manualTotal=null; state.saleDate=toDateInput(new Date()); state.selectedClientId=null; state.payment=null;
    state.saleSuccess=`Vente validée pour ${clientCode(client)} - ${clientName(client)}${loyaltyApplied?` · remise fidélité ${loyaltyPctText} %`:''}`;
    await loadAll(); state.view='sale'; render();
    notify(loyaltyApplied?`Vente validée · remise fidélité ${loyaltyPctText} % appliquée.`:finalTotal<baseTotal?`Vente validée avec une remise de ${euro(baseTotal-finalTotal)}.`:'Vente validée.');
  }

  function renderHistory(){
    const sales=monthSales(), total=sales.reduce((a,s)=>a+saleTotal(s),0);
    document.getElementById('view').innerHTML=`<div class="page-head"><div><h1>Historique</h1><p>Ventes regroupées par mode de paiement. Les ventes de septembre déjà existantes restent sans fiche client.</p></div>${monthNavHTML()}</div><div class="history-total">${sales.length} vente${sales.length>1?'s':''} · ${euro(total)}</div><div class="history-groups">${PAYMENTS.map(p=>historyGroup(p,sales.filter(s=>s.payment_method===p.id))).join('')}</div>`;
    bindMonthNav();
    document.querySelectorAll('[data-delete-sale]').forEach(b=>b.onclick=()=>deleteHistorySale(b.dataset.deleteSale));
    document.querySelectorAll('[data-delete-line]').forEach(b=>b.onclick=()=>deleteHistoryLine(b.dataset.deleteLine,b.dataset.saleId));
  }
  function historyGroup(p,sales){
    const total=sales.reduce((a,s)=>a+saleTotal(s),0);
    return `<details class="pay-group" open><summary><div class="pay-icon">${p.icon}</div><div class="pay-title"><strong>${p.label}</strong><span>${sales.length} vente${sales.length>1?'s':''}</span></div><b>${euro(total)}</b></summary><div class="pay-body">${sales.length?sales.map(s=>{
      const raw=rawSaleTotal(s), paid=saleTotal(s), discount=saleDiscount(s), note=saleDisplayNote(s), c=clientForSale(s);
      const title=c?`${clientCode(c)} - ${clientName(c)}`:(note||'Ancienne vente (sans client)');
      return `<details class="sale-card"><summary><div><strong>${esc(title)}</strong><span>${saleHistoryDateTime(s)}</span></div><b>${euro(paid)}</b></summary><div class="sale-details">${c?`<div class="history-client"><strong>${esc(clientCode(c)+' - '+clientName(c))}</strong><span>${esc(c.email||'')}${c.phone?' · '+esc(c.phone):''}</span></div>`:''}${note&&c?`<div class="history-note">Remarque : ${esc(note)}</div>`:''}${(s.sale_lines||[]).map(l=>`<div class="sale-line"><div class="sale-line-main"><strong>${esc(l.name_snapshot)}</strong><br><small>${l.quantity} × ${euro(l.unit_price)} · ${l.type_snapshot==='produit'?'Produit':'Prestation'}</small></div><div class="sale-line-actions"><b>${euro(Number(l.unit_price)*Number(l.quantity))}</b><button class="history-delete-line" type="button" data-delete-line="${l.id}" data-sale-id="${s.id}" title="Supprimer cette ligne">×</button></div></div>`).join('')}${discount>0?`<div class="history-discount"><div><span>Sous-total</span><b>${euro(raw)}</b></div><div><span>Remise appliquée</span><b>−${euro(discount)}</b></div><div class="history-paid"><span>Total payé</span><b>${euro(paid)}</b></div></div>`:''}<div class="sale-footer"><button class="danger-btn compact" type="button" data-delete-sale="${s.id}">Supprimer la vente complète</button></div></div></details>`;
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

  function renderClients(){
    const clients=state.clients.slice().sort((a,b)=>Number(a.client_number)-Number(b.client_number));
    const loyaltyPct=loyaltyPercent(), loyaltyPctText=percentLabel(loyaltyPct);
    const settingsWarning=state.settingsError?`<div class="alert error">Le réglage du pourcentage fidélité n’est pas encore disponible dans Supabase. Exécute <strong>supabase/update_v1.9_loyalty_rate.sql</strong>. En attendant, l’application utilise 10 %.</div>`:'';
    document.getElementById('view').innerHTML=`<div class="admin-head"><div><h1 style="margin:0 0 5px">Fichier clients</h1><p class="muted" style="margin:0">Les anciens passages de septembre ne sont pas transformés en clients. Le compteur commence avec les nouvelles ventes liées à une fiche client.</p></div><button id="addClient" class="primary" ${state.clientError?'disabled':''}>+ Nouveau client</button></div>${state.clientError?`<div class="alert error">Le fichier clients n’est pas encore disponible : ${esc(state.clientError)}. Exécute <strong>supabase/update_v1.8_clients.sql</strong>.</div>`:`${settingsWarning}<section class="loyalty-settings"><div><strong>Remise fidélité à partir du 5e RDV</strong><span>Ce taux s’applique automatiquement au 5e RDV et aux suivants.</span></div><div class="loyalty-rate-control"><input id="loyaltyRate" type="number" min="0" max="100" step="0.5" value="${loyaltyPct}" ${state.settingsError?'disabled':''}><span>%</span><button id="saveLoyaltyRate" class="secondary" type="button" ${state.settingsError?'disabled':''}>Enregistrer</button></div></section><div class="client-search"><input id="clientSearch" type="search" placeholder="Rechercher par nom, n° client, e-mail ou téléphone…"></div><div class="client-list">${clients.length?clients.map(c=>clientCard(c)).join(''):'<div class="empty">Aucun client. Le premier créé recevra le numéro CL0001.</div>'}</div>`}`;
    const add=document.getElementById('addClient'); if(add) add.onclick=()=>openClientModal();
    const saveRate=document.getElementById('saveLoyaltyRate'); if(saveRate) saveRate.onclick=saveLoyaltyRate;
    document.querySelectorAll('[data-edit-client]').forEach(b=>b.onclick=()=>openClientModal(state.clients.find(c=>c.id===b.dataset.editClient)));
    const search=document.getElementById('clientSearch');
    if(search) search.oninput=e=>{ const q=e.target.value.trim().toLowerCase(); document.querySelectorAll('.client-card').forEach(card=>{card.hidden=q&&!card.dataset.search.includes(q);}); };
  }
  async function saveLoyaltyRate(){
    const input=document.getElementById('loyaltyRate');
    const value=Number(String(input?.value??'').replace(',','.'));
    if(!Number.isFinite(value)||value<0||value>100){ notify('Indique un pourcentage compris entre 0 et 100.','error'); return; }
    const rate=Math.round(value*100)/100;
    const btn=document.getElementById('saveLoyaltyRate'); if(btn){btn.disabled=true;btn.textContent='Enregistrement…';}
    const {error}=await sb.from('user_settings').upsert({user_id:state.user.id,loyalty_discount_percent:rate},{onConflict:'user_id'});
    if(error){ notify('Réglage fidélité : '+error.message,'error'); if(btn){btn.disabled=false;btn.textContent='Enregistrer';} return; }
    state.loyaltyDiscountPercent=rate; state.settingsError=null; renderClients(); notify(`Remise fidélité réglée à ${percentLabel(rate)} %.`);
  }
  function clientCard(c){
    const n=clientAppointmentCount(c.id), active=n>=5, pct=percentLabel(loyaltyPercent());
    const search=[clientCode(c),clientName(c),c.email||'',c.phone||''].join(' ').toLowerCase();
    return `<article class="client-card" data-search="${esc(search)}"><div class="client-number">${esc(clientCode(c))}</div><div class="client-card-main"><strong>${esc(clientName(c))}</strong><span>${esc(c.email||'Pas d’e-mail')}${c.phone?' · '+esc(c.phone):' · Pas de téléphone'}</span></div><div class="client-rdv ${active?'active':''}"><strong>${n} RDV</strong><span>${active?`−${pct} % actif`:`${Math.max(0,5-n)} avant −${pct} %`}</span></div><button class="icon-btn" type="button" data-edit-client="${c.id}" title="Modifier">✎</button></article>`;
  }
  function openClientModal(client=null,{selectAfter=false}={}){
    const wrap=document.createElement('div'); wrap.className='modal-backdrop';
    wrap.innerHTML=`<form class="modal client-modal" id="clientForm"><div class="modal-head"><div><h2>${client?'Modifier le client':'Nouveau client'}</h2>${client?`<p class="client-modal-code">${esc(clientCode(client))}</p>`:'<p class="client-modal-code">Le numéro sera attribué automatiquement.</p>'}</div><button type="button" id="closeClientModal" class="secondary">×</button></div><div class="form-grid"><label>Prénom<input id="cFirstName" required autocomplete="given-name" value="${esc(client?.first_name||'')}"></label><label>Nom<input id="cLastName" required autocomplete="family-name" value="${esc(client?.last_name||'')}"></label><label>E-mail<input id="cEmail" type="email" autocomplete="email" value="${esc(client?.email||'')}"></label><label>Téléphone<input id="cPhone" type="tel" autocomplete="tel" value="${esc(client?.phone||'')}"></label></div><div id="clientFormMsg"></div><div class="modal-actions"><button type="button" id="cancelClientModal" class="secondary">Annuler</button><button class="primary" type="submit">${client?'Enregistrer':'Créer le client'}</button></div></form>`;
    document.body.appendChild(wrap);
    const close=()=>wrap.remove(); document.getElementById('closeClientModal').onclick=close; document.getElementById('cancelClientModal').onclick=close; wrap.onclick=e=>{if(e.target===wrap)close();};
    document.getElementById('clientForm').onsubmit=async e=>{
      e.preventDefault(); const btn=e.submitter; btn.disabled=true; btn.textContent='Enregistrement…';
      const row={user_id:state.user.id,first_name:document.getElementById('cFirstName').value.trim(),last_name:document.getElementById('cLastName').value.trim(),email:document.getElementById('cEmail').value.trim()||null,phone:document.getElementById('cPhone').value.trim()||null};
      const q=client?sb.from('clients').update(row).eq('id',client.id).eq('user_id',state.user.id):sb.from('clients').insert(row);
      const {data,error}=await q.select().single();
      if(error){document.getElementById('clientFormMsg').innerHTML=`<div class="alert error">${esc(error.message)}</div>`;btn.disabled=false;btn.textContent=client?'Enregistrer':'Créer le client';return;}
      close(); await loadAll();
      if(selectAfter){ state.selectedClientId=data.id; state.payment=null; state.manualTotal=null; state.view='sale'; render(); notify(`${clientCode(data)} - ${clientName(data)} créé et sélectionné.`); }
      else { state.view='clients'; render(); notify(client?'Fiche client modifiée.':`${clientCode(data)} - ${clientName(data)} créé.`); }
    };
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
