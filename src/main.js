import { DEFAULT_CATEGORIES, ACCT_COLORS, EMOJI_CHOICES, COLOR_CHOICES, MONTHS_IT } from './constants.js';
import { uid, isoToday, addDays, fmtEUR, fmtDate, escapeHTML, lastDayOfMonth, clampDay, dayStart, dateKey, parseISODate, nowIso, fmtDateTime, isTransfer, monthKeyFromDate, addMonths } from './utils.js';

/* ============ STATE ============ */
let state = {
  accounts:[
    {id:"a1",name:"Conto corrente",balance:23.73,initialBalance:23.73},
    {id:"a2",name:"Conto Arancio",balance:3800.68,initialBalance:3800.68},
    {id:"a3",name:"Moneyfarm",balance:14300.00,initialBalance:14300.00}
  ],
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  budgets:{"Spesa":350,"Trasporti":80,"Casa":900,"Bollette":150,"Svago":100,"Ristoranti":120,"Abbonamenti":40},
  goals:[
    {id:"g1",name:"Risparmi liquidi",account:"a2",target:5000},
    {id:"g2",name:"Investimento Moneyfarm",account:"a3",target:20000}
  ],
  transactions:[],
  alertsDismissed:{},
  settings:{salaryDay:27},
  stoppedRecurrings:[]
};

/* ============ CATEGORY HELPERS ============ */
function catMeta(name){ return state.categories.find(c=>c.name===name)||{name,icon:"✦",color:"#bcb5a3"}; }
function catIcon(name){ return catMeta(name).icon; }
function catColor(name){ return catMeta(name).color; }
function catNames(){ return state.categories.map(c=>c.name); }
function isSavingsCategory(name){ return String(name||'').toLowerCase()==='risparmi'; }
function recKey(payee,category){ return (payee||'').toLowerCase()+'|'+(category||''); }
function isRecurringStopped(payee,category){ return (state.stoppedRecurrings||[]).includes(recKey(payee,category)); }
function toggleRecurringStopped(payee,category){
  if(!state.stoppedRecurrings) state.stoppedRecurrings=[];
  const k=recKey(payee,category);
  const idx=state.stoppedRecurrings.indexOf(k);
  if(idx>=0) state.stoppedRecurrings.splice(idx,1);
  else state.stoppedRecurrings.push(k);
  touchState(); saveState(); render();
  toast(idx>=0?'Ricorrente riattivata ▶':'Ricorrente fermata — non apparirà nelle proiezioni ⏹');
}
function stoppedRecurringsDetails(){
  return (state.stoppedRecurrings||[]).map(k=>{
    const sep=k.indexOf('|');
    const payeeLower=k.slice(0,sep), category=k.slice(sep+1);
    const tx=state.transactions.filter(t=>(t.payee||'').toLowerCase()===payeeLower&&(t.category||'')===category).sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(!tx) return null;
    return {payee:tx.payee,category:tx.category,amount:tx.amount,freq:tx.recurringFreq||'Mensile'};
  }).filter(Boolean);
}

/* ============ UTILS ============ */
// uid, isoToday, addDays, fmtEUR, fmtDate, escapeHTML, lastDayOfMonth, clampDay,
// dayStart, dateKey, parseISODate, nowIso, fmtDateTime, isTransfer,
// monthKeyFromDate, addMonths → src/utils.js
function isSalaryTx(t){
  const cat=String(t.category||'').toLowerCase();
  const payee=String(t.payee||'').toLowerCase();
  return t.type==='in' && !isTransfer(t) && (cat.includes('stipendio') || payee.includes('stipendio'));
}
function salaryDates(){
  const seen=new Set();
  return state.transactions
    .filter(isSalaryTx)
    .map(t=>dayStart(parseISODate(t.date)))
    .sort((a,b)=>a-b)
    .filter(d=>{ const k=dateKey(d); if(seen.has(k)) return false; seen.add(k); return true; });
}
function fallbackCycleStart(year,month){ return new Date(year,month,1); }
function sameMonthKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function addOneSalaryMonth(start){
  const y=start.getFullYear(), m=start.getMonth()+1, day=start.getDate();
  return new Date(y,m,Math.min(day,lastDayOfMonth(y,m)));
}
function estimateNextSalaryAfter(start){
  const dates=salaryDates();
  const next=dates.find(d=>d>start);
  if(next) return next;
  // Se lo stipendio successivo non è ancora registrato, stima la prossima data
  // mantenendo il giorno dello stipendio più recente. Questo evita di tornare al mese solare.
  return addOneSalaryMonth(start);
}
function latestSalaryStart(refDate=new Date()){
  const today=dayStart(refDate);
  const dates=salaryDates();
  let latest=null;
  for(const d of dates){ if(d<=today) latest=d; else break; }
  if(!latest && dates.length) latest=dates[dates.length-1];
  return latest;
}
function cycleStartForKey(year,month){
  // Per i mesi storici/selezionati usa la data reale dello stipendio in quel mese, se presente.
  const exact=salaryDates().find(d=>d.getFullYear()===year && d.getMonth()===month);
  return exact || fallbackCycleStart(year,month);
}
function nextSalaryAfter(start){ return estimateNextSalaryAfter(start); }
function periodBounds(year,month){
  const start=cycleStartForKey(year,month);
  const next=estimateNextSalaryAfter(start);
  const end=new Date(next.getTime()-1);
  return {start, end};
}
function currentSalaryPeriodBounds(){
  const start=latestSalaryStart();
  if(!start){
    const fallback=fallbackCycleStart(viewYear,viewMonth);
    const end=new Date(new Date(fallback.getFullYear(),fallback.getMonth()+1,1).getTime()-1);
    return {start:fallback,end,estimated:false,hasSalary:false};
  }
  const dates=salaryDates();
  const realNext=dates.find(d=>d>start) || null;
  const next=realNext || estimateNextSalaryAfter(start);
  return {start,end:new Date(next.getTime()-1),estimated:!realNext,hasSalary:true};
}
function periodLabelFromBounds(b){
  const fmt=d=>d.toLocaleDateString('it-IT',{day:'2-digit',month:'short'});
  return `${fmt(b.start)} – ${fmt(b.end)} ${b.end.getFullYear()}`;
}
function periodLabel(year,month){ return periodLabelFromBounds(periodBounds(year,month)); }
function txInBounds(bounds){
  return state.transactions.filter(tx=>{ const d=dayStart(parseISODate(tx.date)); return d>=bounds.start && d<=bounds.end; });
}
function periodKeyFromDate(dateLike){
  const d=dayStart(parseISODate(dateLike));
  const starts=salaryDates();
  let start=null;
  for(const s of starts){ if(s<=d) start=s; else break; }
  if(!start) start=fallbackCycleStart(d.getFullYear(),d.getMonth());
  return monthKeyFromDate(start);
}
function availableCycleKeys(includeAroundView=true){
  const keys=new Set(salaryDates().map(monthKeyFromDate));
  if(includeAroundView){
    const base=new Date(viewYear,viewMonth,1);
    for(let i=-6;i<=6;i++) keys.add(monthKeyFromDate(addMonths(base,i)));
  }
  return [...keys].sort();
}
function latestSalaryCycleKey(){
  const latest=latestSalaryStart();
  return latest ? monthKeyFromDate(latest) : `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
}
function activeDashboardCycle(){
  const b=currentSalaryPeriodBounds();
  return {year:b.start.getFullYear(), month:b.start.getMonth(), bounds:b};
}

/* ============ SEED DATA ============ */
function seedTransactions(){
  const t=isoToday(); const tx=[];
  function push(daysAgo,acct,cat,payee,amount,type){ tx.push({id:uid(),date:addDays(t,-daysAgo),account:acct,category:cat,payee,amount,type}); }
  [2,32,62].forEach(d=>push(d,"a1","Casa","Affitto",650,"out"));
  [5,35,65].forEach(d=>push(d,"a1","Abbonamenti","Netflix",12.99,"out"));
  [7,37].forEach(d=>push(d,"a1","Abbonamenti","Palestra FitClub",39.90,"out"));
  [1,31].forEach(d=>push(d,"a2","Stipendio","Stipendio",1850,"in"));
  push(1,"a1","Spesa","Esselunga",54.30,"out");
  push(3,"a1","Trasporti","Trenord",18.50,"out");
  push(4,"a1","Ristoranti","Trattoria Da Marco",32.00,"out");
  push(6,"a1","Spesa","Carrefour",41.10,"out");
  push(8,"a1","Svago","Cinema UCI",12.00,"out");
  push(9,"a1","Salute","Farmacia Centrale",22.40,"out");
  push(11,"a1","Spesa","Esselunga",37.85,"out");
  push(13,"a1","Trasporti","ATM Milano",22.00,"out");
  push(15,"a1","Ristoranti","Sushi Time",28.50,"out");
  push(18,"a1","Bollette","Enel Energia",78.20,"out");
  push(20,"a1","Spesa","Lidl",29.95,"out");
  push(22,"a1","Svago","Spotify",9.99,"out");
  push(25,"a1","Casa","IKEA",64.00,"out");
  push(0,"a1","Spesa","Esselunga",19.40,"out");
  tx.sort((a,b)=>a.date<b.date?1:-1);
  return tx;
}

/* ============ PERSISTENCE — STANDALONE BROWSER ============ */
const APP_VERSION = '22.2-bimestrale-salary-cashflow';
const PRECONFIGURED_SUPABASE_URL = 'https://marvmbewsgxrabirugkk.supabase.co';
const PRECONFIGURED_SUPABASE_ANON_KEY = 'sb_publishable_Jsd4sX6_6pNCUqHIcun4lA_9F81WlPg';
const STORAGE_KEY = 'libretto-v2-standalone-state';
const CLOUD_CONFIG_KEY = 'libretto-cloud-config';
const DEVICE_ID_KEY = 'libretto-device-id';
let cloud = {client:null,user:null,ready:false,loading:false,syncing:false,status:'local',lastSync:null,lastError:null,pending:false};
let cloudSaveTimer=null;
function deviceId(){
  let id=localStorage.getItem(DEVICE_ID_KEY);
  if(!id){ id='dev-'+Math.random().toString(36).slice(2)+'-'+Date.now().toString(36); localStorage.setItem(DEVICE_ID_KEY,id); }
  return id;
}
// nowIso → src/utils.js
function ensureMeta(){
  if(!state._meta) state._meta={};
  if(!state._meta.createdAt) state._meta.createdAt=nowIso();
  if(!state._meta.deviceId) state._meta.deviceId=deviceId();
  if(!state._meta.appVersion) state._meta.appVersion=APP_VERSION;
  return state._meta;
}
function touchState(){ const m=ensureMeta(); m.updatedAt=nowIso(); m.deviceId=deviceId(); m.appVersion=APP_VERSION; }
function localUpdatedAt(){ return (state._meta && state._meta.updatedAt) || ''; }
// fmtDateTime → src/utils.js
function getCloudConfig(){
  // v20: Supabase è preconfigurato nella build, così ogni dispositivo vede direttamente login/app.
  return {url:PRECONFIGURED_SUPABASE_URL, anonKey:PRECONFIGURED_SUPABASE_ANON_KEY};
}
function hasCloudConfig(){ const c=getCloudConfig(); return !!(c.url&&c.anonKey); }
function cloudStatusText(){
  if(!hasCloudConfig()) return 'Cloud non disponibile';
  if(cloud.syncing) return 'Sincronizzazione in corso…';
  if(cloud.lastError) return 'Errore cloud: controlla connessione o configurazione';
  if(cloud.user) return `Cloud attivo · ${cloud.user.email||cloud.user.id}`;
  return 'Cloud configurato, login non effettuato';
}
function cloudDotClass(){
  if(cloud.syncing) return 'sync';
  if(cloud.user && !cloud.lastError) return 'on';
  return 'off';
}

function userInitial(){
  const email=(cloud.user&&cloud.user.email)||'';
  return (email.trim()[0]||'U').toUpperCase();
}
function mustLogin(){
  return hasCloudConfig() && !cloud.user;
}
function updateUserPill(){
  const root=document.getElementById('userPillRoot');
  if(!root) return;
  if(cloud.user){
    root.innerHTML=`<div class="user-pill" title="Utente collegato">
      <div class="user-pill-main"><div class="avatar">${escapeHTML(userInitial())}</div><div class="uinfo"><div style="font-weight:700;line-height:1">Utente attivo</div><div class="uemail">${escapeHTML(cloud.user.email||cloud.user.id)}</div></div></div>
      <div class="user-pill-actions"><button id="pillCloudBtn" type="button">Cloud</button><button id="pillLogoutBtn" class="danger-mini" type="button">Esci</button></div>
    </div>`;
    const c=document.getElementById('pillCloudBtn');
    if(c) c.addEventListener('click',()=>setPage('cloud'));
    const b=document.getElementById('pillLogoutBtn');
    if(b) b.addEventListener('click',async()=>{ if(cloud.client) await cloud.client.auth.signOut(); cloud.user=null; render(); toast('Logout effettuato'); });
  }else root.innerHTML='';
}
function renderAuthGate(){
  const cfg=getCloudConfig();
  const configured=!!(cfg.url&&cfg.anonKey);
  return `<div class="auth-gate"><div class="auth-card">
    <div class="auth-logo"><div class="mark">L</div><div><div class="auth-title">Libretto</div><div class="auth-sub">Accedi per usare l'app e sincronizzare i tuoi dati su PC e telefono.</div></div></div>
    ${!configured?`<div class="alert-banner warn"><div class="aicon">⚙️</div><div class="abody"><div class="atitle">Cloud non configurato</div><div class="adesc">Configurazione cloud integrata nella build. Ricarica la pagina se il login non compare.</div></div></div><div class="modal-actions"><button class="btn" id="goCloudSetupBtn">Apri cloud</button></div>`:`
      <div class="auth-mode"><button id="authModeLogin" class="active" type="button">Accedi</button><button id="authModeSignup" type="button">Crea account</button></div>
      <div class="field"><label>Email</label><input type="email" id="cloudEmail" placeholder="nome@email.com" autocomplete="email"></div>
      <div class="field"><label>Password</label><input type="password" id="cloudPassword" placeholder="Minimo 6 caratteri" autocomplete="current-password"></div>
      <div class="modal-actions"><button class="btn" id="authSubmitBtn">Accedi</button></div>
      <div class="auth-small">Dopo il primo accesso resterai collegato su questo dispositivo, finché non farai logout o cancellerai i dati del browser.</div>`}
  </div></div>`;
}
function bindAuthGateEvents(){
  const go=document.getElementById('goCloudSetupBtn');
  if(go) go.addEventListener('click',()=>{ currentPage='cloud'; render(); });
  let mode='login';
  const login=document.getElementById('authModeLogin');
  const signup=document.getElementById('authModeSignup');
  const submit=document.getElementById('authSubmitBtn');
  function setMode(m){ mode=m; if(login) login.classList.toggle('active',m==='login'); if(signup) signup.classList.toggle('active',m==='signup'); if(submit) submit.textContent=m==='signup'?'Crea account':'Accedi'; }
  if(login) login.addEventListener('click',()=>setMode('login'));
  if(signup) signup.addEventListener('click',()=>setMode('signup'));
  if(submit) submit.addEventListener('click',()=>cloudAuth(mode));
  ['cloudEmail','cloudPassword'].forEach(id=>{ const el=document.getElementById(id); if(el) el.addEventListener('keydown',e=>{ if(e.key==='Enter') cloudAuth(mode); }); });
}
async function initCloud(){
  if(!window.supabase || !hasCloudConfig()) return false;
  const cfg=getCloudConfig();
  try{
    cloud.client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await cloud.client.auth.getSession();
    cloud.user=data&&data.session?data.session.user:null;
    cloud.ready=true;
    cloud.client.auth.onAuthStateChange(async (_event, session)=>{
      cloud.user=session?session.user:null;
      if(cloud.user){ await loadState(); render(); }
      else { render(); }
    });
    return true;
  }catch(e){ console.warn('Cloud non inizializzato',e); return false; }
}
async function pullCloudState({force=false}={}){
  if(!cloud.client || !cloud.user) return false;
  try{
    cloud.loading=true; cloud.syncing=true; cloud.lastError=null; renderSyncIfVisible();
    let data=null;
    const rpc=await cloud.client.rpc('get_libretto_state');
    if(rpc.error) throw rpc.error;
    if(Array.isArray(rpc.data)) data=rpc.data[0]||null;
    else data=rpc.data||null;
    if(data && data.data){
      const remote=data.data;
      const remoteUpdated=(remote._meta && remote._meta.updatedAt) || data.updated_at || '';
      const localUpdated=localUpdatedAt();
      if(force || !localUpdated || remoteUpdated>=localUpdated){
        state=Object.assign(state,remote);
        migrateState();
        localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
        cloud.lastSync=nowIso(); cloud.status='synced'; cloud.pending=false;
        cloud.loading=false; cloud.syncing=false; renderSyncIfVisible();
        return true;
      }
      cloud.loading=false; cloud.syncing=false; renderSyncIfVisible();
      return false;
    }
    cloud.loading=false; cloud.syncing=false;
    await cloudSaveNow();
    return true;
  }catch(e){
    cloud.loading=false; cloud.syncing=false; cloud.lastError=e.message||String(e); renderSyncIfVisible();
    console.warn('Impossibile leggere dal cloud, uso locale', e); toast('Cloud non disponibile: uso dati locali'); return false;
  }
}
async function syncCloudNow({preferCloud=false}={}){
  if(!cloud.client || !cloud.user) return false;
  if(preferCloud) return await pullCloudState({force:true});
  const pulled=await pullCloudState({force:false});
  if(pulled) return true;
  return await cloudSaveNow();
}
async function loadState(){
  if(cloud.client && cloud.user){
    const ok=await pullCloudState({force:true});
    if(ok) return true;
  }
  try{
    const raw=localStorage.getItem(STORAGE_KEY) || localStorage.getItem('libretto-state2');
    if(raw){ const p=JSON.parse(raw); state=Object.assign(state,p); migrateState(); return true; }
  }catch(e){ console.warn('Impossibile leggere i dati salvati', e); }
  return false;
}
let saveTimer=null;
function saveState(){
  if(!cloud.loading) touchState();
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
    catch(e){ console.warn('Impossibile salvare i dati', e); toast('Salvataggio non riuscito: spazio browser esaurito?'); }
  },150);
  scheduleCloudSave();
}
function forceSaveState(){ try{ touchState(); localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); scheduleCloudSave(50); return true; }catch(e){ console.warn(e); return false; } }
function scheduleCloudSave(delay=700){
  if(!cloud.client || !cloud.user || cloud.loading) return;
  cloud.pending=true; cloud.status='pending'; renderSyncIfVisible();
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(()=>cloudSaveNow(),delay);
}
async function cloudSaveNow(){
  if(!cloud.client || !cloud.user) return false;
  try{
    cloud.syncing=true; cloud.lastError=null; renderSyncIfVisible();
    ensureMeta();
    state._meta.updatedAt=nowIso();
    state._meta.deviceId=deviceId();
    state._meta.appVersion=APP_VERSION;
    const rpc=await cloud.client.rpc('save_libretto_state',{p_data:state});
    if(rpc.error) throw rpc.error;
    cloud.lastSync=nowIso(); cloud.status='synced'; cloud.pending=false; cloud.syncing=false; renderSyncIfVisible();
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }catch(_e){}
    return true;
  }catch(e){ cloud.syncing=false; cloud.lastError=e.message||String(e); renderSyncIfVisible(); console.warn('Salvataggio cloud non riuscito',e); return false; }
}
function renderSyncIfVisible(){
  const box=document.getElementById('cloudLiveStatus');
  if(!box) return;
  box.innerHTML=cloudLiveStatusHTML();
}
function exportBackup(){
  forceSaveState();
  const payload={app:'Libretto',version:APP_VERSION,exportedAt:new Date().toISOString(),state};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`libretto-backup-${isoToday()}.json`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Backup esportato');
}
function importBackupFile(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result);
      const importedState=parsed.state || parsed;
      if(!importedState || !Array.isArray(importedState.accounts) || !Array.isArray(importedState.transactions)) throw new Error('Formato non valido');
      openConfirm('Importare questo backup?', 'I dati attuali verranno sostituiti dai dati del file JSON selezionato.', ()=>{
        state=Object.assign(state,importedState);
        migrateState(); forceSaveState(); selectedTxIds=new Set(); closeModal(); render(); toast('Backup importato');
      });
    }catch(e){ toast('File backup non valido'); }
  };
  reader.readAsText(file);
}

/* ============ DERIVED DATA ============ */
function txInMonth(year,month){ return txInPeriod(year,month); }
function txInPeriod(year,month){ return txInBounds(periodBounds(year,month)); }
function spentByCategory(txs){ const m={}; txs.filter(t=>t.type==='out'&&t.movementType!=='transfer').forEach(t=>{ m[t.category]=(m[t.category]||0)+t.amount; }); return m; }
// isTransfer → src/utils.js
function isRealExpense(t){ return t.type==='out' && !isTransfer(t); }
function accountBalance(accountId){
  const acct=state.accounts.find(a=>a.id===accountId);
  if(!acct) return 0;
  let bal=parseFloat(acct.initialBalance)||0;
  state.transactions.forEach(t=>{
    const amount=parseFloat(t.amount)||0;
    if(t.account===accountId){ bal += t.type==='out' ? -amount : amount; }
    if(isTransfer(t) && t.transferTo===accountId){ bal += amount; }
  });
  return bal;
}
function totalAccountBalance(){ return state.accounts.reduce((s,a)=>s+accountBalance(a.id),0); }
function accountBalanceMap(){ const m={}; state.accounts.forEach(a=>m[a.id]=accountBalance(a.id)); return m; }
function selectedDashboardAccountId(){
  const id=state.settings && state.settings.dashboardAccountId;
  if(id && state.accounts.some(a=>a.id===id)) return id;
  return state.accounts[0] ? state.accounts[0].id : 'all';
}
function dashboardShowBalances(){ return !(state.settings && state.settings.dashboardShowBalances===false); }
function txMatchesAccount(t,accountId){
  if(!accountId || accountId==='all') return true;
  return t.account===accountId || (isTransfer(t) && t.transferTo===accountId);
}
function txForDashboardAccount(txs,accountId){ return txs.filter(t=>txMatchesAccount(t,accountId)); }
function accountOptionLabel(accountId){
  if(accountId==='all') return 'Tutti i conti';
  const a=state.accounts.find(x=>x.id===accountId);
  return a ? a.name : 'Conto';
}
function dashboardBalanceHTML(accountId){
  if(!dashboardShowBalances()) return `<div class="card kpi"><div class="label">Saldo nascosto</div><div class="value num">••••••</div><div class="delta">Riattiva la visualizzazione dalla Dashboard</div></div>`;
  if(accountId && accountId!=='all'){
    const a=state.accounts.find(x=>x.id===accountId);
    return `<div class="card kpi"><div class="label">Saldo ${escapeHTML(a?a.name:'conto')}</div><div class="value num">${fmtEUR(accountBalance(accountId))}</div><div class="delta">saldo iniziale + movimenti</div></div>`;
  }
  return `<div class="card kpi"><div class="label">Saldo totale</div><div class="value num">${fmtEUR(totalAccountBalance())}</div><div class="delta">su ${state.accounts.length} conti</div></div>`;
}
function accountBalancesCardHTML(){
  if(!dashboardShowBalances()) return '';
  return `<div class="card" style="margin-bottom:16px;"><h3>Saldi per conto</h3>${state.accounts.map(a=>`
    <div class="rec-item"><div><div class="nm">🏦 ${escapeHTML(a.name)}</div><div class="freq">Saldo iniziale: <span class="num">${fmtEUR(parseFloat(a.initialBalance)||0)}</span></div></div><div class="num" style="color:${accountBalance(a.id)>=0?'var(--sage)':'var(--coral)'}">${fmtEUR(accountBalance(a.id))}</div></div>`).join('')}</div>`;
}
// monthKeyFromDate, addMonths → src/utils.js
function monthLabel(key){ const [y,m]=key.split('-').map(Number); return periodLabel(y,m-1); }
function firstMovementCycleKey(accountId='all'){
  const list=state.transactions
    .filter(t=>txMatchesAccount(t,accountId))
    .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(!list.length) return null;
  return periodKeyFromDate(list[0].date);
}
function compactCycleLabel(key){
  const [y,m]=key.split('-').map(Number);
  const b=periodBounds(y,m-1);
  const start=b.start.toLocaleDateString('it-IT',{day:'2-digit',month:'short'}).replace('.', '');
  const end=b.end.toLocaleDateString('it-IT',{day:'2-digit',month:'short'}).replace('.', '');
  return `${start}–${end}`;
}
function getMonthlySeries(monthsBack=5, monthsForward=0, baseYear=viewYear, baseMonth=viewMonth, accountId='all'){
  const base=new Date(baseYear,baseMonth,1);
  const endKey=monthKeyFromDate(addMonths(base,monthsForward));
  const startByWindow=monthKeyFromDate(addMonths(base,-monthsBack));
  const firstKey=firstMovementCycleKey(accountId);
  const startKey=firstKey && firstKey>startByWindow ? firstKey : startByWindow;
  const keys=[];
  let cur=startKey;
  let guard=0;
  while(cur<=endKey && guard<36){
    keys.push(cur);
    const [cy,cm]=cur.split('-').map(Number);
    cur=monthKeyFromDate(addMonths(new Date(cy,cm-1,1),1));
    guard++;
  }
  return keys.map(k=>{
    const [y,m]=k.split('-').map(Number);
    const txs=txForDashboardAccount(txInPeriod(y,m-1),accountId);
    const income=txs.filter(t=>t.type==='in'&&!isTransfer(t)).reduce((s,t)=>s+t.amount,0);
    const expense=txs.filter(isRealExpense).reduce((s,t)=>s+t.amount,0);
    const transfers=txs.filter(isTransfer).reduce((s,t)=>s+t.amount,0);
    return {key:k,label:monthLabel(k),shortLabel:compactCycleLabel(k),income,expense,net:income-expense,transfers};
  }).filter(row=>row.income!==0 || row.expense!==0 || row.transfers!==0 || row.key===endKey);
}
function fixedExpenses(){
  const explicit=state.transactions.filter(t=>isRealExpense(t)&&t.recurring&&!isRecurringStopped(t.payee,t.category));
  const detected=detectRecurring().filter(r=>r.type==='out'&&!isRecurringStopped(r.payee,r.category));
  const map={};
  explicit.forEach(t=>{ const k=(t.payee||'').toLowerCase()+'|'+t.account+'|'+t.category; map[k]={payee:t.payee,category:t.category,amount:t.amount,freq:t.recurringFreq||'Mensile',source:'manuale',nextDate:t.recurringNextDate||null}; });
  detected.forEach(r=>{ const k=(r.payee||'').toLowerCase()+'|'+r.category; if(!map[k]) map[k]={payee:r.payee,category:r.category,amount:r.amount,freq:r.freq,source:'rilevata'}; });
  return Object.values(map).sort((a,b)=>b.amount-a.amount);
}
function recurringMonthlyEquivalent(amount,freq){
  if(freq==='Settimanale') return amount*4.33;
  if(freq==='Bimestrale') return amount/2;
  if(freq==='Annuale') return amount/12;
  return amount; // Mensile
}
function monthlyFixedTotal(){ return fixedExpenses().reduce((s,f)=>s+recurringMonthlyEquivalent(f.amount,f.freq),0); }
function fixedExpensesForMonth(projDate){
  // Calcola le spese fisse effettivamente dovute in un mese specifico della proiezione.
  // Mensile/Settimanale: sempre presenti. Bimestrale/Annuale: solo nei mesi in cui cadono.
  const py=projDate.getFullYear(), pm=projDate.getMonth();
  return fixedExpenses().reduce((total,f)=>{
    if(f.freq==='Mensile') return total+f.amount;
    if(f.freq==='Settimanale') return total+f.amount*4.33;
    // Bimestrale / Annuale: senza nextDate usa equivalente mensile come fallback
    if(!f.nextDate) return total+recurringMonthlyEquivalent(f.amount,f.freq);
    const step=f.freq==='Bimestrale'?2:12;
    const nd=parseISODate(f.nextDate);
    let check=new Date(nd.getFullYear(),nd.getMonth(),1);
    // porta check al primo ciclo che non supera il mese target
    while(check>new Date(py,pm,1)) check=addMonths(check,-step);
    while(check<new Date(py,pm,1)) check=addMonths(check,step);
    return (check.getFullYear()===py&&check.getMonth()===pm) ? total+f.amount : total;
  },0);
}
function recurringSummaryByCategory(selectedAccount='all'){
  const items=[];
  state.transactions.filter(t=>isRealExpense(t)&&t.recurring&&txMatchesAccount(t,selectedAccount)).forEach(t=>{
    items.push({payee:t.payee,category:t.category,amount:t.amount,freq:t.recurringFreq||'Mensile',source:'manuale'});
  });
  detectRecurring().filter(r=>r.type==='out').forEach(r=>{
    const matches=state.transactions.some(t=>String(t.payee||'').toLowerCase()===String(r.payee||'').toLowerCase() && txMatchesAccount(t,selectedAccount));
    const already=items.some(x=>String(x.payee||'').toLowerCase()===String(r.payee||'').toLowerCase() && x.category===r.category);
    if(matches && !already) items.push({payee:r.payee,category:r.category,amount:r.amount,freq:r.freq,source:'rilevata'});
  });
  const groups={};
  items.forEach(it=>{
    const cat=it.category||'Altro';
    if(!groups[cat]) groups[cat]={category:cat,total:0,count:0,manual:0,detected:0,items:[]};
    const monthly=recurringMonthlyEquivalent(parseFloat(it.amount)||0,it.freq);
    groups[cat].total+=monthly; groups[cat].count+=1; groups[cat].items.push({...it,monthly});
    if(it.source==='manuale') groups[cat].manual+=1; else groups[cat].detected+=1;
  });
  return Object.values(groups).sort((a,b)=>b.total-a.total);
}
function recurringSummaryHTML(selectedAccount='all'){
  const groups=recurringSummaryByCategory(selectedAccount);
  const stopped=stoppedRecurringsDetails();
  const stoppedSection=stopped.length?`<div style="margin-top:14px"><div class="sync-note" style="margin-bottom:6px">Ricorrenti fermate — non incluse nelle proiezioni:</div>${stopped.map(s=>`<div class="budget-row-foot" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">${catIcon(s.category)} ${escapeHTML(s.payee||'—')} · ${s.freq}<button class="btn small ghost" data-stop-rec="${escapeHTML(s.payee)}" data-stop-rec-cat="${escapeHTML(s.category)}" style="padding:2px 8px;font-size:11px">▶ Riattiva</button></div>`).join('')}</div>`:'';
  if(!groups.length) return `<div class="empty">Nessuna spesa ricorrente ancora. Puoi marcarle quando inserisci o modifichi un movimento.</div>${stoppedSection}`;
  const total=groups.reduce((s,g)=>s+g.total,0);
  const max=Math.max(1,...groups.map(g=>g.total));
  return `<div class="mini-grid" style="grid-template-columns:1fr;margin-bottom:14px;"><div class="mini-kpi"><div class="mlabel">Totale ricorrente stimato</div><div class="mvalue num neg">${fmtEUR(total)}</div><div class="sync-note">equivalente mensile per ${escapeHTML(accountOptionLabel(selectedAccount))}</div></div></div>`+
    groups.map(g=>`<div class="catbar-row">
      <div class="catbar-top"><div class="nm">${catIcon(g.category)} ${g.category} <span class="pill rec">${g.count} voc${g.count===1?'e':'i'}</span></div><div class="amt num">${fmtEUR(g.total)}</div></div>
      <div class="catbar-track"><div class="catbar-fill" style="width:${(g.total/max*100).toFixed(0)}%;background:${catColor(g.category)}"></div></div>
      <div class="budget-row-foot" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${g.items.map(i=>`<span style="display:flex;align-items:center;gap:4px">${escapeHTML(i.payee||'—')} · ${i.freq} · ${fmtEUR(i.monthly)}/mese <button class="btn small ghost" data-stop-rec="${escapeHTML(i.payee)}" data-stop-rec-cat="${escapeHTML(i.category)}" style="padding:2px 6px;font-size:11px" title="Ferma questa ricorrente">⏹</button></span>`).join('<span style="opacity:.4">·</span>')}${g.items.length>3?' …':''}</div>
    </div>`).join('')+stoppedSection;
}
function projectionRows(n=6){
  // Solo lo stipendio è ricorrente: le altre entrate (bonus, rimborsi, ecc.) non si proiettano
  const series=getMonthlySeries(5,0,viewYear,viewMonth,'all');
  const salaryPerCycle=series.map(s=>{
    const [y,m]=s.key.split('-').map(Number);
    return txInPeriod(y,m-1).filter(isSalaryTx).reduce((sum,t)=>sum+t.amount,0);
  }).filter(v=>v>0);
  const incomeAvg=salaryPerCycle.length ? salaryPerCycle.reduce((a,b)=>a+b,0)/salaryPerCycle.length : 0;
  let start=totalAccountBalance();
  const rows=[]; const base=new Date(viewYear,viewMonth,1);
  for(let i=1;i<=n;i++){
    const projDate=addMonths(base,i);
    const key=monthKeyFromDate(projDate);
    const fixed=fixedExpensesForMonth(projDate);
    const net=incomeAvg-fixed;
    start+=net;
    rows.push({key,label:monthLabel(key),income:incomeAvg,fixed,net,balance:start});
  }
  return rows;
}
function drawMonthlyChart(canvasId,series){
  const canvas=document.getElementById(canvasId); if(!canvas) return;
  const ctx=canvas.getContext('2d'); const rect=canvas.getBoundingClientRect(); const ratio=window.devicePixelRatio||1;
  canvas.width=rect.width*ratio; canvas.height=rect.height*ratio; ctx.scale(ratio,ratio);
  const w=rect.width,h=rect.height;
  const isMobile=w<520;
  const p={l:isMobile?42:44,r:isMobile?18:28,t:isMobile?42:34,b:isMobile?64:38};
  ctx.clearRect(0,0,w,h);
  ctx.font=(isMobile?'11px':'12px')+' Source Sans 3'; ctx.lineWidth=1;
  if(!series || !series.length){ ctx.fillStyle='rgba(241,234,217,0.6)'; ctx.textAlign='center'; ctx.fillText('Nessun movimento da mostrare',w/2,h/2); return; }
  const vals=series.flatMap(s=>[s.income,s.expense,Math.abs(s.net)]); const max=Math.max(1,...vals)*1.15;
  const plotW=w-p.l-p.r, plotH=h-p.t-p.b, zero=h-p.b;
  ctx.strokeStyle='rgba(241,234,217,0.12)'; ctx.fillStyle='rgba(241,234,217,0.55)';
  for(let i=0;i<4;i++){ const y=p.t+plotH*i/3; ctx.beginPath(); ctx.moveTo(p.l,y); ctx.lineTo(w-p.r,y); ctx.stroke(); }
  const groupW=plotW/Math.max(1,series.length); const barW=Math.max(isMobile?7:8,Math.min(isMobile?15:18,groupW*.22));
  const labelEvery=isMobile ? Math.ceil(series.length/3) : Math.ceil(series.length/6);
  series.forEach((s,i)=>{ const x=p.l+i*groupW+groupW*.28; const incH=(s.income/max)*plotH; const expH=(s.expense/max)*plotH;
    ctx.fillStyle='#7ea487'; ctx.fillRect(x,zero-incH,barW,incH);
    ctx.fillStyle='#e2725b'; ctx.fillRect(x+barW+4,zero-expH,barW,expH);
    if(i===0 || i===series.length-1 || i%labelEvery===0){
      ctx.save(); ctx.fillStyle='rgba(241,234,217,0.62)'; ctx.textAlign=isMobile?'right':'center';
      if(isMobile){ ctx.translate(x+barW, h-12); ctx.rotate(-Math.PI/5); ctx.fillText(s.shortLabel||s.label,0,0); }
      else ctx.fillText(s.shortLabel||s.label,x+barW, h-10);
      ctx.restore();
    }
  });
  ctx.beginPath(); ctx.strokeStyle='#d6a23c'; ctx.lineWidth=2;
  series.forEach((s,i)=>{ const x=p.l+i*groupW+groupW*.5; const y=zero-((s.net+max/2)/max)*plotH; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  // compact legend
  const ly=16; let lx=p.l;
  function legend(label,color){ ctx.fillStyle=color; ctx.fillRect(lx,ly-8,10,10); ctx.fillStyle='rgba(241,234,217,0.75)'; ctx.textAlign='left'; ctx.fillText(label,lx+15,ly); lx+=isMobile?78:90; }
  legend('Entrate','#7ea487'); legend('Uscite','#e2725b'); legend('Netto','#d6a23c');
}


function detectRecurring(){
  const groups={};
  state.transactions.filter(t=>!isTransfer(t)).forEach(t=>{ const k=t.payee.toLowerCase()+'|'+t.account; (groups[k]=groups[k]||[]).push(t); });
  const recs=[];
  Object.values(groups).forEach(list=>{
    if(list.length<2) return;
    list.sort((a,b)=>new Date(a.date)-new Date(b.date));
    const amounts=list.map(t=>t.amount);
    const avg=amounts.reduce((a,b)=>a+b,0)/amounts.length;
    if(!amounts.every(a=>Math.abs(a-avg)<Math.max(2,avg*0.08))) return;
    let ok=true;
    for(let i=1;i<list.length;i++){ const g=(new Date(list[i].date)-new Date(list[i-1].date))/86400000; if(!(g>=20&&g<=40)&&!(g>=5&&g<=9)) ok=false; }
    if(ok){ const last=list[list.length-1]; const freq=((new Date(list[1].date)-new Date(list[0].date))/86400000)<15?"Settimanale":"Mensile"; recs.push({payee:last.payee,category:last.category,amount:avg,freq,type:last.type,count:list.length}); }
  });
  return recs.sort((a,b)=>b.amount-a.amount);
}

/* ============ BUDGET ALERTS ============ */
const THRESHOLDS = [{pct:100,cls:'danger',label:'100% — budget esaurito'},{pct:90,cls:'danger',label:'90%'},{pct:75,cls:'warn',label:'75%'},{pct:50,cls:'warn',label:'50%'}];

function getBudgetAlerts(year,month){
  const byCat=spentByCategory(txInMonth(year,month));
  const alerts=[];
  catNames().forEach(cat=>{
    const budget=state.budgets[cat]||0;
    if(budget<=0) return;
    const spent=byCat[cat]||0;
    const pct=spent/budget*100;
    for(const th of THRESHOLDS){
      if(pct>=th.pct){
        const key=`${cat}-${th.pct}-${year}-${month}`;
        if(!state.alertsDismissed[key]){
          alerts.push({key,cat,pct:th.pct,cls:th.cls,label:th.label,spent,budget});
        }
        break;
      }
    }
  });
  return alerts;
}

function dismissAlert(key){ state.alertsDismissed[key]=true; saveState(); render(); }

function alertsHTML(year,month){
  const alerts=getBudgetAlerts(year,month);
  if(!alerts.length) return '';
  return `<div style="margin-bottom:20px">${alerts.map(a=>`
    <div class="alert-banner ${a.cls}">
      <div class="aicon">${a.pct>=100?'🚨':a.pct>=90?'⚠️':'💛'}</div>
      <div class="abody">
        <div class="atitle">${catIcon(a.cat)} ${a.cat} — ${a.label} del budget</div>
        <div class="adesc">${fmtEUR(a.spent)} spesi su ${fmtEUR(a.budget)} di budget mensile</div>
      </div>
      <button class="icon-btn" data-dismiss="${a.key}" style="border:none;opacity:.7;font-size:15px">✕</button>
    </div>
  `).join('')}</div>`;
}

/* ============ ROUTER ============ */
let currentPage='dashboard';
let viewMonth=new Date().getMonth();
let viewYear=new Date().getFullYear();
let selectedTxIds=new Set();
let txFilterCat='';
let txFilterMonth='';

function setPage(p){ currentPage=p; selectedTxIds=new Set(); document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.page===p)); render(); document.getElementById('sidebar').classList.remove('open'); }
document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
document.getElementById('menuToggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));

/* ============ MONTH SWITCH ============ */
function monthSwitchHTML(){
  return `<div class="month-switch"><button id="prevMonth">‹</button><div class="label" title="Ciclo budget">${periodLabel(viewYear,viewMonth)}</div><button id="nextMonth">›</button></div>`;
}

/* ============ TX ROW ============ */
function txRowHTML(t,bulk=false){
  const acct=state.accounts.find(a=>a.id===t.account);
  const sel=bulk&&selectedTxIds.has(t.id);
  return `<div class="tx${sel?' selected':''}" data-txid="${t.id}">
    ${bulk?`<input type="checkbox" class="tx-check" data-chk="${t.id}" ${sel?'checked':''}>`:''}
    <div class="icon" style="background:${catColor(t.category)}22">${catIcon(t.category)}</div>
    <div class="body"><div class="payee">${escapeHTML(t.payee)} ${isTransfer(t)?'<span class="pill transfer">trasferimento</span>':''} ${t.recurring?'<span class="pill rec">ricorrente</span>':''}</div><div class="meta">${t.category} · ${acct?acct.name:'—'}${t.transferTo?' → '+(state.accounts.find(a=>a.id===t.transferTo)?.name||'—'):''} · ${fmtDate(t.date)}</div></div>
    <div class="amount ${t.type==='out'?'out':'in'} num">${t.type==='out'?'-':'+'}${fmtEUR(t.amount)}</div>
    ${bulk?`<button class="icon-btn" data-edittx="${t.id}" title="Modifica">✏️</button>`:`<button class="icon-btn" data-edittx="${t.id}" title="Modifica">✏️</button><button class="del" data-del="${t.id}" title="Elimina">✕</button>`}
  </div>`;
}


function budgetSummaryHTML(txs, compact=false){
  const byCat=spentByCategory(txs);
  const rows=catNames().filter(c=>c!=='Stipendio' && !isSavingsCategory(c)).map(cat=>{
    const spent=byCat[cat]||0;
    const budget=state.budgets[cat]||0;
    const pctRaw=budget>0?(spent/budget*100):0;
    const pct=budget>0?Math.min(100,pctRaw):0;
    const remaining=Math.max(0,budget-spent);
    const over=budget>0&&spent>budget;
    const barColor=over?'var(--coral)':(pct>=90?'var(--coral)':pct>=75?'var(--amber)':pct>=50?'var(--gold)':'var(--sage)');
    let badge='';
    if(budget>0){
      if(pctRaw>=100) badge=`<span class="budget-badge b100">🚨 ${pctRaw.toFixed(0)}%</span>`;
      else if(pctRaw>=90) badge=`<span class="budget-badge b90">⚠️ ${pctRaw.toFixed(0)}%</span>`;
      else if(pctRaw>=75) badge=`<span class="budget-badge b75">💛 ${pctRaw.toFixed(0)}%</span>`;
      else if(pctRaw>=50) badge=`<span class="budget-badge b50">${pctRaw.toFixed(0)}%</span>`;
    }
    return {cat,spent,budget,pct,pctRaw,remaining,over,barColor,badge};
  }).filter(r=>r.budget>0 || r.spent>0).sort((a,b)=>{
    if((b.pctRaw||0)!==(a.pctRaw||0)) return (b.pctRaw||0)-(a.pctRaw||0);
    return b.spent-a.spent;
  });
  if(!rows.length) return `<div class="empty">Imposta i budget per vedere il riepilogo qui.</div>`;
  return rows.map(r=>`
    <div class="catbar-row budget-summary-row">
      <div class="catbar-top">
        <div class="nm">${catIcon(r.cat)} ${r.cat}${r.badge}</div>
        <div class="amt num"><span style="color:${r.over?'var(--coral)':'var(--cream)'}">${fmtEUR(r.spent)}</span> / ${fmtEUR(r.budget)}</div>
      </div>
      <div class="catbar-track"><div class="catbar-fill" style="width:${r.pct}%;background:${r.barColor}"></div></div>
      <div class="budget-row-foot">${r.over?`Fuori budget di <span class="num" style="color:var(--coral)">${fmtEUR(r.spent-r.budget)}</span>`:`Residuo <span class="num">${fmtEUR(r.remaining)}</span>`}</div>
    </div>`).join('');
}

/* ============ DASHBOARD ============ */
function renderDashboard(){
  const dash=activeDashboardCycle();
  const allCycleTxs=txInBounds(dash.bounds);
  const selectedAccount=selectedDashboardAccountId();
  const txs=txForDashboardAccount(allCycleTxs,selectedAccount);
  const income=txs.filter(t=>t.type==='in'&&!isTransfer(t)).reduce((s,t)=>s+t.amount,0);
  const expense=txs.filter(isRealExpense).reduce((s,t)=>s+t.amount,0);
  const net=income-expense;
  const byCat=spentByCategory(txs);
  const catEntries=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxCat=catEntries.length?catEntries[0][1]:1;
  const recent=[...state.transactions].filter(t=>txMatchesAccount(t,selectedAccount)).sort((a,b)=>a.date<b.date?1:-1).slice(0,8);
  return `
  <div class="topbar"><h1>Dashboard</h1><div class="month-switch"><div class="label" title="Ciclo corrente basato sullo stipendio più recente">${periodLabelFromBounds(dash.bounds)}</div></div></div>
  ${alertsHTML(dash.year,dash.month)}
  <div class="card" style="margin-bottom:16px;">
    <h3>Vista dashboard</h3>
    <div class="filters-row" style="margin-bottom:0;align-items:center;">
      <select id="dashboardAccountSelect">
        <option value="all" ${selectedAccount==='all'?'selected':''}>Tutti i conti</option>
        ${state.accounts.map(a=>`<option value="${a.id}" ${selectedAccount===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}
      </select>
      <button class="btn small ghost" id="toggleDashboardBalances">${dashboardShowBalances()?'🙈 Nascondi saldi':'👁️ Mostra saldi'}</button>
      <span class="empty" style="padding:0;text-align:left">I valori sotto sono riferiti a: <b>${escapeHTML(accountOptionLabel(selectedAccount))}</b></span>
    </div>
  </div>
  <div class="grid kpis">
    ${dashboardBalanceHTML(selectedAccount)}
    <div class="card kpi"><div class="label">Entrate ciclo</div><div class="value num pos">${fmtEUR(income)}</div><div class="delta">${escapeHTML(accountOptionLabel(selectedAccount))}</div></div>
    <div class="card kpi"><div class="label">Uscite ciclo</div><div class="value num neg">${fmtEUR(expense)}</div><div class="delta">spese reali, esclusi trasferimenti</div></div>
    <div class="card kpi"><div class="label">Risparmio ciclo</div><div class="value num ${net>=0?'pos':'neg'}">${fmtEUR(net)}</div><div class="delta">entrate - uscite</div></div>
  </div>
  ${accountBalancesCardHTML()}
  <div class="card" style="margin-bottom:16px;">
    <h3>Andamento ciclo per ciclo — ${escapeHTML(accountOptionLabel(selectedAccount))}</h3>
    <div class="chart-wrap"><canvas class="lib-chart" id="dashboardTrend"></canvas></div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Riepilogo budget — ciclo corrente</h3>
    ${budgetSummaryHTML(txs,true)}
  </div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card">
      <h3>Spese per categoria</h3>
      ${catEntries.length===0?`<div class="empty">Ancora nessuna spesa in questo ciclo per il conto selezionato.</div>`:catEntries.map(([cat,amt])=>`
        <div class="catbar-row">
          <div class="catbar-top"><div class="nm">${catIcon(cat)} ${cat}</div><div class="amt num">${fmtEUR(amt)}</div></div>
          <div class="catbar-track"><div class="catbar-fill" style="width:${(amt/maxCat*100).toFixed(0)}%;background:${catColor(cat)}"></div></div>
        </div>`).join('')}
    </div>
    <div class="card">
      <h3>Riepilogo spese ricorrenti</h3>
      ${recurringSummaryHTML(selectedAccount)}
    </div>
  </div>
  <div class="card"><h3>Movimenti recenti — ${escapeHTML(accountOptionLabel(selectedAccount))}</h3><div class="tx-list">${recent.length===0?`<div class="empty">Nessun movimento. Premi + per iniziare.</div>`:recent.map(t=>txRowHTML(t,false)).join('')}</div></div>`;
}

/* ============ ANALYTICS ============ */
function renderAnalytics(){
  const dash=activeDashboardCycle();
  const selectedAccount=selectedDashboardAccountId();
  const series=getMonthlySeries(5,0,dash.year,dash.month,selectedAccount).map(row=>{
    const [y,m]=row.key.split('-').map(Number);
    const txs=txForDashboardAccount(txInPeriod(y,m-1),selectedAccount);
    const income=txs.filter(t=>t.type==='in'&&!isTransfer(t)).reduce((s,t)=>s+t.amount,0);
    const expense=txs.filter(isRealExpense).reduce((s,t)=>s+t.amount,0);
    const transfers=txs.filter(isTransfer).reduce((s,t)=>s+t.amount,0);
    return {key:row.key,label:row.label,income,expense,net:income-expense,transfers};
  });
  const current=series[series.length-1]||{income:0,expense:0,net:0};
  const fixed=fixedExpenses();
  const fixedTotal=monthlyFixedTotal();
  const proj=projectionRows(6);
  const txs=txForDashboardAccount(txInBounds(dash.bounds),selectedAccount);
  const byCat=spentByCategory(txs);
  const maxCat=Math.max(1,...Object.values(byCat));
  return `
  <div class="topbar"><h1>Analisi over time</h1><div class="month-switch"><div class="label" title="Ciclo corrente basato sullo stipendio più recente">${periodLabelFromBounds(dash.bounds)}</div></div></div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Ambito analisi</h3>
    <div class="filters-row" style="margin-bottom:0;align-items:center;">
      <select id="dashboardAccountSelect">
        <option value="all" ${selectedAccount==='all'?'selected':''}>Tutti i conti</option>
        ${state.accounts.map(a=>`<option value="${a.id}" ${selectedAccount===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}
      </select>
      <span class="empty" style="padding:0;text-align:left">Analisi allineata al ciclo spese: <b>${periodLabelFromBounds(dash.bounds)}</b></span>
    </div>
  </div>
  <div class="mini-grid">
    <div class="mini-kpi"><div class="mlabel">Bilancio ciclo corrente</div><div class="mvalue num ${current.net>=0?'pos':'neg'}">${fmtEUR(current.net)}</div></div>
    <div class="mini-kpi"><div class="mlabel">Spese fisse stimate / ciclo</div><div class="mvalue num neg">${fmtEUR(fixedTotal)}</div></div>
    <div class="mini-kpi"><div class="mlabel">Saldo previsto tra 6 cicli</div><div class="mvalue num ${proj.at(-1)?.balance>=0?'pos':'neg'}">${fmtEUR(proj.at(-1)?.balance||0)}</div></div>
  </div>
  <div class="card" style="margin-bottom:16px;"><h3>Entrate, uscite e bilancio netto — ciclo per ciclo</h3><div class="chart-wrap"><canvas class="lib-chart" id="analyticsTrend"></canvas></div></div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card"><h3>Dettaglio per categoria — ${periodLabelFromBounds(dash.bounds)}</h3>
      ${Object.keys(byCat).length===0?`<div class="empty">Nessuna uscita reale nel ciclo corrente per il conto selezionato.</div>`:Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>`
        <div class="catbar-row"><div class="catbar-top"><div class="nm">${catIcon(cat)} ${cat}</div><div class="amt num">${fmtEUR(amt)}</div></div><div class="catbar-track"><div class="catbar-fill" style="width:${(amt/maxCat*100).toFixed(0)}%;background:${catColor(cat)}"></div></div></div>`).join('')}
    </div>
    <div class="card"><h3>Spese fisse e ricorrenti</h3>
      ${fixed.length===0?`<div class="empty">Marca le uscite ricorrenti o inserisci più cicli di dati per rilevarle.</div>`:fixed.map(f=>`
        <div class="rec-item"><div><div class="nm">${catIcon(f.category)} ${escapeHTML(f.payee)}</div><div class="freq">${f.freq} · ${f.source}</div></div><div class="num" style="color:var(--coral)">-${fmtEUR(f.amount)}</div></div>`).join('')}
    </div>
  </div>
  <div class="card"><h3>Proiezione cashflow futuro</h3>
    <table class="analysis-table"><thead><tr><th>Ciclo</th><th>Entrate stimate</th><th>Spese fisse</th><th>Netto stimato</th><th>Saldo totale previsto</th></tr></thead><tbody>
      ${proj.map(r=>`<tr><td>${r.label}</td><td class="num" style="color:var(--sage)">${fmtEUR(r.income)}</td><td class="num" style="color:var(--coral)">${fmtEUR(r.fixed)}</td><td class="num ${r.net>=0?'pos':'neg'}">${fmtEUR(r.net)}</td><td class="num">${fmtEUR(r.balance)}</td></tr>`).join('')}
    </tbody></table>
    <div class="empty" style="text-align:left;padding-bottom:0">La proiezione usa la media dello stipendio degli ultimi cicli come entrata ricorrente (bonus e altre entrate una tantum non vengono proiettate). Le spese fisse/ricorrenti sono convertite in equivalente mensile.</div>
  </div>`;
}

/* ============ TRANSACTIONS ============ */
function getFilteredTx(){
  let list=[...state.transactions];
  if(txFilterCat) list=list.filter(t=>t.category===txFilterCat);
  if(txFilterMonth){
    const [y,m]=txFilterMonth.split('-').map(Number);
    list=list.filter(t=>periodKeyFromDate(t.date)===txFilterMonth);
  }
  list.sort((a,b)=>a.date<b.date?1:-1);
  return list;
}

function availableMonths(){
  const months=new Set();
  state.transactions.forEach(t=>months.add(periodKeyFromDate(t.date))); months.add(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}`);
  return [...months].sort().reverse();
}

function renderTransactions(){
  const list=getFilteredTx();
  const selCount=selectedTxIds.size;
  const months=availableMonths();
  return `
  <div class="topbar">
    <h1>Movimenti</h1>
    <div class="topbar-right">
      <button class="btn small ghost" id="downloadTxTemplateBtn">⬇️ Template CSV</button>
      <button class="btn small" id="bulkImportTxBtn">⬆️ Importa CSV</button>
      <input type="file" id="bulkImportTxFile" accept=".csv,text/csv,.txt" style="display:none">
      <button class="btn small danger" id="delAllBtn">🗑 Elimina tutti</button>
    </div>
  </div>
  <div class="filters-row">
    <select id="filterCat">
      <option value="">Tutte le categorie</option>
      ${catNames().map(c=>`<option value="${c}" ${txFilterCat===c?'selected':''}>${catIcon(c)} ${c}</option>`).join('')}
    </select>
    <select id="filterMonth">
      <option value="">Tutti i mesi</option>
      ${months.map(m=>`<option value="${m}" ${txFilterMonth===m?'selected':''}>${monthLabel(m)}</option>`).join('')}
    </select>
    <button class="btn small ghost" id="selectAllBtn">${selCount===list.length&&list.length>0?'Deseleziona tutti':'Seleziona tutti'}</button>
    ${selCount>0?`<button class="btn small danger" id="delSelBtn">🗑 Elimina selezionati (${selCount})</button>`:''}
  </div>
  ${selCount>0?`<div class="bulk-bar"><span class="cnt">✓ ${selCount} selezionat${selCount===1?'o':'i'}</span></div>`:''}
  <div class="card">
    <div class="tx-list">
      ${list.length===0?`<div class="empty">Nessun movimento${txFilterCat||txFilterMonth?' per i filtri selezionati':''}.</div>`:list.map(t=>txRowHTML(t,true)).join('')}
    </div>
  </div>`;
}

/* ============ BUDGET ============ */
function renderBudget(){
  const budgetCycle=activeDashboardCycle();
  const txs=txInBounds(budgetCycle.bounds);
  const byCat=spentByCategory(txs);
  return `
  <div class="topbar"><h1>Budget</h1><div class="month-switch"><div class="label" title="Ciclo corrente basato sullo stipendio più recente">${periodLabelFromBounds(budgetCycle.bounds)}</div></div></div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Ciclo budget dinamico</h3>
    <div class="empty" style="text-align:left;padding:0;">Il budget viene calcolato automaticamente dalla data dello <strong>Stipendio più recente registrato</strong> fino al giorno prima dello stipendio successivo. Ciclo corrente: <strong>${periodLabelFromBounds(budgetCycle.bounds)}</strong>. Se non esiste ancora nessuno stipendio registrato, l'app usa temporaneamente il mese selezionato.</div>
  </div>
  ${alertsHTML(budgetCycle.year,budgetCycle.month)}
  <div class="card budget-table">
    ${catNames().filter(c=>c!=='Stipendio').map(cat=>{
      const spent=byCat[cat]||0;
      const budget=state.budgets[cat]||0;
      const pct=budget>0?Math.min(100,(spent/budget*100)):0;
      const over=budget>0&&spent>budget;
      const barColor=over?'var(--coral)':(pct>=90?'var(--coral)':pct>=75?'var(--amber)':pct>=50?'var(--gold)':'var(--sage)');
      let badge='';
      if(budget>0){
        if(pct>=100) badge=`<span class="budget-badge b100">🚨 100%</span>`;
        else if(pct>=90) badge=`<span class="budget-badge b90">⚠️ ${pct.toFixed(0)}%</span>`;
        else if(pct>=75) badge=`<span class="budget-badge b75">💛 ${pct.toFixed(0)}%</span>`;
        else if(pct>=50) badge=`<span class="budget-badge b50">💛 ${pct.toFixed(0)}%</span>`;
      }
      return `<div class="cat-row">
        <div class="cat-info"><span>${catIcon(cat)}</span> ${cat}${badge}</div>
        <div class="bar-area"><div class="catbar-track"><div class="catbar-fill" style="width:${pct}%;background:${barColor}"></div></div></div>
        <div class="nums"><span style="color:${over?'var(--coral)':'var(--cream)'}">${fmtEUR(spent)}</span> / <input class="budget-input" data-budget="${cat}" type="number" min="0" step="10" value="${budget}"></div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ============ GOALS ============ */
function renderGoals(){
  return `
  <div class="topbar"><h1>Obiettivi di risparmio</h1><button class="btn small" id="addGoalBtn">+ Nuovo obiettivo</button></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">
    ${state.goals.map(g=>{
      const acct=state.accounts.find(a=>a.id===g.account);
      const balance=acct?accountBalance(acct.id):0;
      const pct=g.target>0?Math.min(100,(balance/g.target*100)):0;
      return `<div class="card goal-card">
        <div class="goal-top"><div class="goal-name">🏺 ${escapeHTML(g.name)}</div><div class="goal-pct">${pct.toFixed(0)}%</div></div>
        <div class="goal-track"><div class="goal-fill" style="width:${pct}%"></div></div>
        <div class="goal-sub num">${fmtEUR(balance)} su ${fmtEUR(g.target)} · ${acct?acct.name:'—'}</div>
        <div class="goal-actions"><button class="btn small ghost" data-editgoal="${g.id}">✏️ Modifica</button><button class="btn small danger" data-delgoal="${g.id}">Elimina</button></div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ============ ACCOUNTS ============ */
function renderAccounts(){
  return `
  <div class="topbar"><h1>Conti</h1><button class="btn small" id="addAcctBtn">+ Nuovo conto</button></div>
  <div class="grid" style="gap:12px;">
    ${state.accounts.map((a,i)=>`
      <div class="card acct-card">
        <div class="l"><div class="acct-dot" style="background:${ACCT_COLORS[i%ACCT_COLORS.length]}"></div>
        <div><div class="acct-name">${escapeHTML(a.name)}</div><div class="acct-sub">Saldo iniziale: <span class="num">${fmtEUR(parseFloat(a.initialBalance)||0)}</span></div></div></div>
        <div style="text-align:right"><div class="acct-bal">${fmtEUR(accountBalance(a.id))}</div><button class="icon-btn" data-editacct="${a.id}" style="margin-top:8px">✏️ Modifica saldo iniziale</button></div>
      </div>`).join('')}
  </div>`;
}

/* ============ CATEGORIES PAGE ============ */
function renderCategories(){
  return `
  <div class="topbar"><h1>Categorie</h1><button class="btn small" id="addCatBtn">+ Nuova categoria</button></div>
  <div class="card">
    <div id="catList">
      ${state.categories.map((c,i)=>`
        <div class="cat-mgmt-row">
          <div class="cat-badge" style="background:${c.color}22">${c.icon}</div>
          <div class="cat-detail">
            <div class="cn">${escapeHTML(c.name)}</div>
            <div class="cs" style="color:${c.color}">${c.color}</div>
          </div>
          <div class="cat-mgmt-actions">
            <button class="icon-btn" data-editcat="${i}">✏️ Modifica</button>
            <button class="icon-btn red" data-delcat="${i}">✕</button>
          </div>
        </div>`).join('')}
    </div>
  </div>`;
}




function cloudLiveStatusHTML(){
  const logged=!!cloud.user;
  return `<span class="cloud-dot ${cloudDotClass()}"></span><span>${escapeHTML(cloudStatusText())}</span>`;
}
function renderSyncDetails(){
  return `<div class="sync-grid">
    <div class="sync-pill">Stato<b>${cloud.syncing?'In corso':cloud.pending?'Da sincronizzare':cloud.lastError?'Errore':cloud.user?'Sincronizzato':'Locale'}</b></div>
    <div class="sync-pill">Ultimo sync<b>${fmtDateTime(cloud.lastSync)}</b></div>
    <div class="sync-pill">Ultima modifica<b>${fmtDateTime(localUpdatedAt())}</b></div>
  </div>
  ${cloud.lastError?`<div class="alert-banner danger"><div class="aicon">⚠️</div><div class="abody"><div class="atitle">Errore sincronizzazione</div><div class="adesc">${escapeHTML(cloud.lastError)}</div></div></div>`:''}`;
}

/* ============ CLOUD / MULTI-USER PAGE ============ */
function renderCloud(){
  const cfg=getCloudConfig();
  const logged=!!cloud.user;
  const sql=`-- LIBRETTO v18 - clean install Supabase
-- Nuovo progetto: esegui SOLO questo script in Supabase > SQL Editor.
-- Architettura semplice: una riga JSON per ogni utente.

create extension if not exists pgcrypto;

create table if not exists public.libretto_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.libretto_user_state enable row level security;

drop policy if exists "libretto_state_select_own" on public.libretto_user_state;
drop policy if exists "libretto_state_insert_own" on public.libretto_user_state;
drop policy if exists "libretto_state_update_own" on public.libretto_user_state;
drop policy if exists "libretto_state_delete_own" on public.libretto_user_state;

create policy "libretto_state_select_own"
on public.libretto_user_state
for select
to authenticated
using (auth.uid() = user_id);

create policy "libretto_state_insert_own"
on public.libretto_user_state
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "libretto_state_update_own"
on public.libretto_user_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "libretto_state_delete_own"
on public.libretto_user_state
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.save_libretto_state(p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.libretto_user_state(user_id, data, updated_at)
  values (auth.uid(), p_data, now())
  on conflict (user_id)
  do update set data = excluded.data, updated_at = now();
end;
$$;

grant execute on function public.save_libretto_state(jsonb) to authenticated;

create or replace function public.get_libretto_state()
returns table(data jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.data, s.updated_at
  from public.libretto_user_state s
  where s.user_id = auth.uid();
$$;

grant execute on function public.get_libretto_state() to authenticated;`
  return `
  <div class="topbar"><h1>Utenti / Cloud</h1></div>
  <div class="cloud-status" id="cloudLiveStatus">${cloudLiveStatusHTML()}</div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card">
      <h3>Accesso utente</h3>
      ${!hasCloudConfig()?`<div class="empty" style="text-align:left;padding-top:0">Configura Supabase qui sotto, poi potrai creare utenti e salvare i dati separatamente per ciascun account.</div>`:''}
      ${logged?`
        <div class="empty" style="text-align:left;padding-top:0">Sei collegato come <b>${escapeHTML(cloud.user.email||cloud.user.id)}</b>. Ogni modifica viene salvata nel cloud del tuo utente e mantenuta anche in cache locale sul dispositivo.</div>
        ${renderSyncDetails()}<div class="modal-actions"><button class="btn" id="cloudSyncBtn">↻ Sincronizza ora</button><button class="btn ghost" id="cloudPullBtn">Scarica dal cloud</button><button class="btn ghost" id="cloudPushBtn">☁️ Forza upload</button><button class="btn danger" id="cloudLogoutBtn">Esci</button></div>
      `:`
        <div class="field"><label>Email</label><input type="email" id="cloudEmail" placeholder="nome@email.com"></div>
        <div class="field"><label>Password</label><input type="password" id="cloudPassword" placeholder="Minimo 6 caratteri"></div>
        <div class="modal-actions"><button class="btn ghost" id="cloudSignupBtn">Crea account</button><button class="btn" id="cloudLoginBtn">Accedi</button></div>
      `}
    </div>
    <div class="card">
      <h3>Cloud preconfigurato</h3>
      <div class="empty" style="text-align:left;padding-top:0">Questa build è già collegata al progetto Supabase di Libretto. Su ogni nuovo dispositivo devi solo accedere con email e password; non serve inserire URL o chiavi.</div>
      <div class="cloud-status"><span class="dot on"></span><div><b>Supabase configurato</b><div class="mini">Sessione persistente attiva su questo browser/dispositivo.</div></div></div>
      <div class="modal-actions"><button class="btn ghost" id="cloudHardReloadBtn">↻ Ricarica app</button></div>
    </div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Schema database da creare in Supabase</h3>
    <div class="empty" style="text-align:left;padding-top:0">In Supabase apri <b>SQL Editor</b>, incolla questo blocco e premi Run. Ogni utente potrà leggere/modificare solo la propria riga.</div>
    <div class="code-block">${escapeHTML(sql)}</div>
    <div class="modal-actions" style="max-width:260px"><button class="btn ghost" id="copySqlBtn">📋 Copia SQL</button></div>
  </div>
  <div class="card">
    <h3>Come funziona</h3>
    <ul class="tech-list">
      <li>Ogni account Supabase/Auth ha un proprio <span class="num">user_id</span>.</li>
      <li>I dati Libretto vengono salvati in una riga JSON separata per utente, con timestamp di ultima modifica.</li>
      <li>Le policy RLS impediscono a un utente di leggere o modificare i dati degli altri.</li>
      <li>PC e telefono restano allineati usando lo stesso login: all'avvio l'app scarica il cloud e a ogni modifica fa upload automatico.</li><li>Il backup JSON resta disponibile come sicurezza aggiuntiva.</li>
    </ul>
  </div>`;
}

/* ============ HELP PAGE ============ */
function renderHelp(){
  return `
  <div class="topbar"><h1>Help</h1></div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card">
      <h3>Assistenza aggiornamenti</h3>
      <div class="empty" style="text-align:left;padding-top:0">Da qui puoi aprire ChatGPT o Claude, copiare un prompt tecnico già pronto ed esportare l'HTML corrente da allegare per richieste di modifiche o nuove funzionalità.</div>
      <div class="help-actions">
        <button class="help-action" id="openChatGPTBtn" type="button"><span class="h-title">🤖 Apri ChatGPT</span><span class="h-sub">Apre una nuova chat. Poi allega/esporta questo HTML.</span></button>
        <button class="help-action" id="openClaudeBtn" type="button"><span class="h-title">🧠 Apri Claude</span><span class="h-sub">Apre Claude in una nuova scheda per richieste tecniche.</span></button>
        <button class="help-action" id="copyUpdatePromptBtn" type="button"><span class="h-title">📋 Prompt update</span><span class="h-sub">Copia o visualizza il contesto tecnico dell'app.</span></button>
        <button class="help-action" id="exportHtmlBtn" type="button"><span class="h-title">💾 Esporta HTML corrente</span><span class="h-sub">Scarica la versione dell'app che stai usando ora.</span></button>
      </div>
    </div>
    <div class="card">
      <h3>Stato app / note tecniche</h3>
      <ul class="tech-list">
        <li>Single-file HTML/CSS/JS standalone, pronta anche per pubblicazione web.</li>
        <li>Persistenza locale con <span class="num">localStorage</span>; cloud multiutente Supabase preconfigurato.</li>
        <li>Saldi conto calcolati da saldo iniziale + movimenti.</li>
        <li>Supporto a entrate, uscite e trasferimenti tra conti.</li>
        <li>Ciclo budget/dashboard basato sullo Stipendio più recente.</li>
        <li>Spese ricorrenti e forecast cashflow.</li>
        <li>Backup/import JSON disponibili nel menu laterale.</li><li>Bulk upload CSV dei movimenti dalla sezione Movimenti, con template scaricabile.</li>
      </ul>
    </div>
  </div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card">
      <h3>Usarla su iPhone / Pixel</h3>
      <div class="empty" style="text-align:left;padding-top:0">Il modo più affidabile è pubblicarla online via HTTPS e poi aggiungerla alla schermata Home. In questo modo il salvataggio locale è legato al browser/dispositivo e non al file aperto come allegato.</div>
      <div class="install-steps">
        <div class="install-step"><b>iPhone / iPad:</b> apri il link in Safari → Condividi → Aggiungi alla schermata Home.</div>
        <div class="install-step"><b>Pixel / Android:</b> apri il link in Chrome → menu ⋮ → Installa app o Aggiungi a schermata Home.</div>
        <div class="install-step"><b>Desktop:</b> apri il link in Chrome/Edge/Safari. Su Chrome/Edge puoi installarla dalla barra indirizzi quando disponibile.</div>
      </div>
    </div>
    <div class="card">
      <h3>Compatibilità</h3>
      <div class="compat-grid">
        <div class="compat-card"><b>iOS / iPadOS</b>Funziona via Safari. Le PWA su iPhone sono più limitate di Android, ma localStorage e Home Screen funzionano se pubblicata online.</div>
        <div class="compat-card"><b>Android / Pixel</b>Funziona molto bene via Chrome. Installazione PWA generalmente più completa.</div>
        <div class="compat-card"><b>Windows / Mac</b>Funziona su browser moderni. Per uso serio, meglio URL online + backup JSON periodico.</div>
      </div>
    </div>
  </div>
  <div class="card">
    <h3>Come chiedere nuove modifiche</h3>
    <div class="empty" style="text-align:left;padding-top:0">Usa “Prompt update”, descrivi la modifica desiderata e allega il file HTML esportato. Specifica sempre di mantenere intatti salvataggio locale/cloud, saldi derivati, ciclo stipendio e dati già presenti.</div>
  </div>`;
}

/* ============ MASTER RENDER ============ */
function render(){
  const main=document.getElementById('main');
  updateUserPill();
  const fab=document.getElementById('fabAdd');
  if(fab) fab.style.display=mustLogin()?'none':'flex';
  try{
    if(mustLogin() && currentPage!=='cloud' && currentPage!=='help'){ main.innerHTML=renderAuthGate(); bindAuthGateEvents(); return; }
    if(currentPage==='dashboard') main.innerHTML=renderDashboard();
    else if(currentPage==='transactions') main.innerHTML=renderTransactions();
    else if(currentPage==='budget') main.innerHTML=renderBudget();
    else if(currentPage==='analytics') main.innerHTML=renderAnalytics();
    else if(currentPage==='goals') main.innerHTML=renderGoals();
    else if(currentPage==='accounts') main.innerHTML=renderAccounts();
    else if(currentPage==='categories') main.innerHTML=renderCategories();
    else if(currentPage==='cloud') main.innerHTML=renderCloud();
    else if(currentPage==='help') main.innerHTML=renderHelp();
    bindPageEvents();
  }catch(e){
    console.error('Errore rendering Libretto', e);
    main.innerHTML=`<div class="topbar"><h1>Ops, qualcosa non torna</h1></div><div class="card"><h3>Errore temporaneo</h3><div class="empty" style="text-align:left">Ho intercettato un problema nel rendering della pagina. Prova a esportare un backup dalla sezione Conti/Backup se disponibile, oppure ricarica la pagina. Dettaglio tecnico: ${escapeHTML(e.message||String(e))}</div></div>`;
  }
}


/* ============ BULK IMPORT CSV ============ */
const BULK_TEMPLATE_COLUMNS = ['date','type','amount','payee','account','category','movementType','transferTo','goal','recurring','recurringFreq','recurringNextDate'];
function csvEscape(v){
  const s=String(v??'');
  return /[";,\n\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function downloadTxTemplate(){
  const rows=[
    BULK_TEMPLATE_COLUMNS,
    [isoToday(),'out','12.50','Esselunga','Conto corrente','Spesa','standard','','','no','',''],
    [isoToday(),'in','1850.00','Stipendio','Conto corrente','Stipendio','standard','','','no','',''],
    [isoToday(),'out','300.00','Giroconto risparmio','Conto corrente','Risparmi','transfer','Conto Arancio','Risparmi liquidi','no','',''],
    [isoToday(),'out','9.99','Spotify','Conto corrente','Abbonamenti','standard','','','yes','Mensile',addDays(isoToday(),30)]
  ];
  const csv=rows.map(r=>r.map(csvEscape).join(';')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='libretto-template-movimenti.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast('Template CSV scaricato');
}
function parseDelimited(text){
  text=String(text||'').replace(/^\ufeff/,'');
  const firstLine=(text.split(/\r?\n/).find(l=>l.trim())||'');
  const candidates=[';',',','\t'];
  let delim=';'; let best=-1;
  for(const d of candidates){ const count=(firstLine.match(new RegExp(d==='\t'?'\\t':d.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length; if(count>best){best=count;delim=d;} }
  const rows=[]; let row=[],field='',q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch==='"'){
      if(q && next==='"'){ field+='"'; i++; }
      else q=!q;
    }else if(ch===delim && !q){ row.push(field); field=''; }
    else if((ch==='\n'||ch==='\r') && !q){ if(ch==='\r'&&next==='\n') i++; row.push(field); if(row.some(x=>String(x).trim()!=='')) rows.push(row); row=[]; field=''; }
    else field+=ch;
  }
  row.push(field); if(row.some(x=>String(x).trim()!=='')) rows.push(row);
  if(!rows.length) return [];
  const headers=rows[0].map(h=>String(h||'').trim());
  return rows.slice(1).map((r,idx)=>{ const o={_row:idx+2}; headers.forEach((h,i)=>o[h]=String(r[i]||'').trim()); return o; });
}
function findAccountIdByName(name){
  if(!name) return '';
  const n=String(name).trim().toLowerCase();
  const byId=state.accounts.find(a=>String(a.id).toLowerCase()===n);
  if(byId) return byId.id;
  const byName=state.accounts.find(a=>String(a.name||'').trim().toLowerCase()===n);
  return byName?byName.id:'';
}
function findGoalIdByName(name){
  if(!name) return null;
  const n=String(name).trim().toLowerCase();
  const byId=state.goals.find(g=>String(g.id).toLowerCase()===n);
  if(byId) return byId.id;
  const byName=state.goals.find(g=>String(g.name||'').trim().toLowerCase()===n);
  return byName?byName.id:null;
}
function parseBool(v){ return ['si','sì','yes','true','1','y'].includes(String(v||'').trim().toLowerCase()); }
function normalizeImportedTx(row){
  const errors=[];
  const date=(row.date||row.data||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('data non valida: usa YYYY-MM-DD');
  const type=String(row.type||row.tipo||'out').toLowerCase();
  if(!['in','out'].includes(type)) errors.push('type deve essere in oppure out');
  const amount=parseFloat(String(row.amount||row.importo||'').replace(',','.'));
  if(!amount||amount<=0) errors.push('importo non valido');
  const account=findAccountIdByName(row.account||row.conto||row.accountId);
  if(!account) errors.push('conto origine non trovato');
  let category=row.category||row.categoria||'Altro';
  const cat=state.categories.find(c=>String(c.name).toLowerCase()===String(category).toLowerCase());
  if(cat) category=cat.name;
  else errors.push('categoria non trovata');
  const movementType=String(row.movementType||row.tipoMovimento||'standard').toLowerCase()==='transfer'?'transfer':'standard';
  const transferTo=movementType==='transfer'?findAccountIdByName(row.transferTo||row.contoDestinazione||row.toAccount):null;
  if(movementType==='transfer'&&!transferTo) errors.push('conto destinazione non trovato');
  if(movementType==='transfer'&&transferTo===account) errors.push('origine e destinazione devono essere diversi');
  const recurring=parseBool(row.recurring||row.ricorrente);
  const recurringFreq=row.recurringFreq||row.frequenza||'Mensile';
  const recurringNextDate=(row.recurringNextDate||row.prossimaData||'').slice(0,10) || null;
  const tx={id:uid(),date,account,category,payee:row.payee||row.descrizione||row.esercente||(movementType==='transfer'?'Trasferimento':(type==='in'?'Entrata':'Spesa')),amount,type,movementType,transferTo,goalId:findGoalIdByName(row.goal||row.obiettivo),recurring:recurring&&movementType!=='transfer',recurringFreq:recurring?recurringFreq:null,recurringNextDate:recurring?recurringNextDate:null};
  return {tx, errors, row:row._row};
}
function openBulkImportModal(fileText){
  const parsed=parseDelimited(fileText).map(normalizeImportedTx);
  const valid=parsed.filter(x=>!x.errors.length);
  const invalid=parsed.filter(x=>x.errors.length);
  document.getElementById('modalRoot').innerHTML=`
  <div class="modal-bg" id="bulkBg"><div class="modal" style="max-width:860px;">
    <button class="close-x" id="bulkClose">✕</button>
    <h3>Import movimenti CSV</h3>
    <div class="mini-grid"><div class="mini-kpi"><div class="mlabel">Righe valide</div><div class="mvalue">${valid.length}</div></div><div class="mini-kpi"><div class="mlabel">Righe da correggere</div><div class="mvalue ${invalid.length?'neg':''}">${invalid.length}</div></div><div class="mini-kpi"><div class="mlabel">Totale file</div><div class="mvalue">${parsed.length}</div></div></div>
    <div class="empty" style="text-align:left;padding:0 0 10px;">Formato accettato: CSV da Excel con colonne <span class="num">${BULK_TEMPLATE_COLUMNS.join(', ')}</span>. Le colonne principali sono: date, type, amount, payee, account, category.</div>
    ${invalid.length?`<div class="alert-banner danger"><div class="aicon">⚠️</div><div class="abody"><div class="atitle">Alcune righe non verranno importate</div><div class="adesc">Correggi il CSV e riprova, oppure importa solo le righe valide.</div></div></div>`:''}
    <div class="import-preview"><table><thead><tr><th>Riga</th><th>Data</th><th>Tipo</th><th>Importo</th><th>Descrizione</th><th>Conto</th><th>Categoria</th><th>Note</th></tr></thead><tbody>
      ${parsed.slice(0,80).map(x=>`<tr><td>${x.row}</td><td>${escapeHTML(x.tx.date)}</td><td>${escapeHTML(x.tx.type)}</td><td class="num">${isFinite(x.tx.amount)?fmtEUR(x.tx.amount):'—'}</td><td>${escapeHTML(x.tx.payee)}</td><td>${escapeHTML(state.accounts.find(a=>a.id===x.tx.account)?.name||'—')}</td><td>${escapeHTML(x.tx.category||'—')}</td><td>${x.errors.length?`<div class="import-error">${escapeHTML(x.errors.join(' · '))}</div>`:'OK'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="modal-actions"><button class="btn ghost" id="bulkCancel">Annulla</button><button class="btn" id="bulkImportOk" ${valid.length?'':'disabled'}>Importa ${valid.length} movimenti validi</button></div>
  </div></div>`;
  document.getElementById('bulkBg').addEventListener('click',e=>{ if(e.target.id==='bulkBg') closeModal(); });
  document.getElementById('bulkClose').addEventListener('click',closeModal);
  document.getElementById('bulkCancel').addEventListener('click',closeModal);
  document.getElementById('bulkImportOk').addEventListener('click',()=>{
    state.transactions.push(...valid.map(x=>x.tx));
    state.transactions.sort((a,b)=>a.date<b.date?1:-1);
    saveState(); closeModal(); render(); toast(`${valid.length} movimenti importati`);
  });
}
function handleBulkImportFile(file){
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>openBulkImportModal(reader.result);
  reader.readAsText(file);
}

/* ============ BIND PAGE EVENTS ============ */
function bindPageEvents(){
  // month nav
  const prev=document.getElementById('prevMonth');
  const next=document.getElementById('nextMonth');
  if(prev) prev.addEventListener('click',()=>{
    const keys=availableCycleKeys(true);
    const cur=`${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
    const idx=keys.indexOf(cur);
    const target=idx>0 ? keys[idx-1] : monthKeyFromDate(addMonths(new Date(viewYear,viewMonth,1),-1));
    const [y,m]=target.split('-').map(Number); viewYear=y; viewMonth=m-1; render();
  });
  if(next) next.addEventListener('click',()=>{
    const keys=availableCycleKeys(true);
    const cur=`${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
    const idx=keys.indexOf(cur);
    const target=idx>=0 && idx<keys.length-1 ? keys[idx+1] : monthKeyFromDate(addMonths(new Date(viewYear,viewMonth,1),1));
    const [y,m]=target.split('-').map(Number); viewYear=y; viewMonth=m-1; render();
  });

  // alert dismiss
  document.querySelectorAll('[data-dismiss]').forEach(b=>b.addEventListener('click',()=>dismissAlert(b.dataset.dismiss)));

  // stop / resume ricorrenti
  document.querySelectorAll('[data-stop-rec]').forEach(b=>b.addEventListener('click',()=>toggleRecurringStopped(b.dataset.stopRec,b.dataset.stopRecCat)));
  const dashboardAccountSelect=document.getElementById('dashboardAccountSelect');
  if(dashboardAccountSelect) dashboardAccountSelect.addEventListener('change',()=>{ state.settings.dashboardAccountId=dashboardAccountSelect.value; saveState(); render(); });
  const toggleDashboardBalances=document.getElementById('toggleDashboardBalances');
  if(toggleDashboardBalances) toggleDashboardBalances.addEventListener('click',()=>{ state.settings.dashboardShowBalances=!dashboardShowBalances(); saveState(); render(); });

  if(document.getElementById('dashboardTrend')) { const dash=activeDashboardCycle(); const acc=selectedDashboardAccountId(); const ser=getMonthlySeries(5,0,dash.year,dash.month,acc).map(row=>{ const [y,m]=row.key.split('-').map(Number); const txs=txForDashboardAccount(txInPeriod(y,m-1),acc); const income=txs.filter(t=>t.type==='in'&&!isTransfer(t)).reduce((s,t)=>s+t.amount,0); const expense=txs.filter(isRealExpense).reduce((s,t)=>s+t.amount,0); return Object.assign({},row,{income,expense,net:income-expense}); }); drawMonthlyChart('dashboardTrend',ser); }
  if(document.getElementById('analyticsTrend')) { const dash=activeDashboardCycle(); const acc=selectedDashboardAccountId(); const ser=getMonthlySeries(5,0,dash.year,dash.month,acc).map(row=>{ const [y,m]=row.key.split('-').map(Number); const txs=txForDashboardAccount(txInPeriod(y,m-1),acc); const income=txs.filter(t=>t.type==='in'&&!isTransfer(t)).reduce((s,t)=>s+t.amount,0); const expense=txs.filter(isRealExpense).reduce((s,t)=>s+t.amount,0); return Object.assign({},row,{income,expense,net:income-expense}); }); drawMonthlyChart('analyticsTrend',ser); }

  // single delete
  document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.del;
    removeTx([id]);
    render();
    toast('Movimento eliminato');
  }));

  // edit transaction
  document.querySelectorAll('[data-edittx]').forEach(b=>b.addEventListener('click',()=>openTransactionModal(b.dataset.edittx)));

  // budget inputs
  document.querySelectorAll('[data-budget]').forEach(inp=>inp.addEventListener('change',()=>{
    state.budgets[inp.dataset.budget]=parseFloat(inp.value)||0;
    saveState(); render();
  }));





  // CLOUD / MULTI-USER
  const saveCloudConfigBtn=document.getElementById('saveCloudConfigBtn');
  if(saveCloudConfigBtn) saveCloudConfigBtn.addEventListener('click',async()=>{
    let url=(document.getElementById('supabaseUrl').value||'').trim();
    url=url.replace(/\/rest\/v1\/?$/,'').replace(/\/auth\/v1\/?$/,'').replace(/\/$/,'');
    const anonKey=(document.getElementById('supabaseAnon').value||'').trim();
    if(!url||!anonKey){ toast('Inserisci URL e anon key Supabase'); return; }
    localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify({url,anonKey}));
    await initCloud(); render(); toast('Cloud configurato');
  });
  const clearCloudConfigBtn=document.getElementById('clearCloudConfigBtn');
  if(clearCloudConfigBtn) clearCloudConfigBtn.addEventListener('click',async()=>{
    if(cloud.client) try{ await cloud.client.auth.signOut(); }catch(e){}
    localStorage.removeItem(CLOUD_CONFIG_KEY); cloud={client:null,user:null,ready:false,loading:false}; render(); toast('Configurazione cloud rimossa');
  });
  const cloudLoginBtn=document.getElementById('cloudLoginBtn');
  if(cloudLoginBtn) cloudLoginBtn.addEventListener('click',async()=>cloudAuth('login'));
  const cloudSignupBtn=document.getElementById('cloudSignupBtn');
  if(cloudSignupBtn) cloudSignupBtn.addEventListener('click',async()=>cloudAuth('signup'));
  const cloudLogoutBtn=document.getElementById('cloudLogoutBtn');
  if(cloudLogoutBtn) cloudLogoutBtn.addEventListener('click',async()=>{ if(cloud.client) await cloud.client.auth.signOut(); cloud.user=null; render(); toast('Logout effettuato'); });
  const cloudSyncBtn=document.getElementById('cloudSyncBtn');
  if(cloudSyncBtn) cloudSyncBtn.addEventListener('click',async()=>{ const ok=await syncCloudNow(); render(); toast(ok?'Sincronizzazione completata':'Sincronizzazione non riuscita'); });
  const cloudPullBtn=document.getElementById('cloudPullBtn');
  if(cloudPullBtn) cloudPullBtn.addEventListener('click',async()=>{ const ok=await pullCloudState({force:true}); render(); toast(ok?'Dati scaricati dal cloud':'Download cloud non riuscito'); });
  const cloudPushBtn=document.getElementById('cloudPushBtn');
  if(cloudPushBtn) cloudPushBtn.addEventListener('click',async()=>{ const ok=await cloudSaveNow(); render(); toast(ok?'Dati salvati nel cloud':'Salvataggio cloud non riuscito'); });

  const cloudHardReloadBtn=document.getElementById('cloudHardReloadBtn');
  if(cloudHardReloadBtn) cloudHardReloadBtn.addEventListener('click',()=>{ location.href=location.pathname+'?v=22&refresh='+Date.now(); });
  const copySqlBtn=document.getElementById('copySqlBtn');
  if(copySqlBtn) copySqlBtn.addEventListener('click',()=>{ const txt=document.querySelector('.code-block')?.textContent||''; navigator.clipboard.writeText(txt).then(()=>toast('SQL copiato')); });

  // HELP
  const chatgptBtn=document.getElementById('openChatGPTBtn');
  if(chatgptBtn) chatgptBtn.addEventListener('click',()=>openAiChat('https://chatgpt.com/', 'ChatGPT'));
  const claudeBtn=document.getElementById('openClaudeBtn');
  if(claudeBtn) claudeBtn.addEventListener('click',()=>openAiChat('https://claude.ai/new', 'Claude'));
  const promptBtn=document.getElementById('copyUpdatePromptBtn');
  if(promptBtn) promptBtn.addEventListener('click',openUpdatePromptModal);
  const exportHtmlButton=document.getElementById('exportHtmlBtn');
  if(exportHtmlButton) exportHtmlButton.addEventListener('click',exportCurrentHtml);

  // TRANSACTIONS specific
  const filterCat=document.getElementById('filterCat');
  const filterMonth=document.getElementById('filterMonth');
  if(filterCat) filterCat.addEventListener('change',()=>{ txFilterCat=filterCat.value; selectedTxIds=new Set(); render(); });
  if(filterMonth) filterMonth.addEventListener('change',()=>{ txFilterMonth=filterMonth.value; selectedTxIds=new Set(); render(); });

  const selAllBtn=document.getElementById('selectAllBtn');
  if(selAllBtn) selAllBtn.addEventListener('click',()=>{
    const list=getFilteredTx();
    if(selectedTxIds.size===list.length) selectedTxIds=new Set();
    else list.forEach(t=>selectedTxIds.add(t.id));
    render();
  });

  document.querySelectorAll('[data-chk]').forEach(chk=>chk.addEventListener('change',()=>{
    if(chk.checked) selectedTxIds.add(chk.dataset.chk);
    else selectedTxIds.delete(chk.dataset.chk);
    render();
  }));

  const delSelBtn=document.getElementById('delSelBtn');
  if(delSelBtn) delSelBtn.addEventListener('click',()=>{
    const ids=[...selectedTxIds];
    openConfirm(`Eliminare ${ids.length} moviment${ids.length===1?'o':'i'}?`,`L'operazione non è reversibile.`,()=>{ removeTx(ids); selectedTxIds=new Set(); render(); toast(`${ids.length} moviment${ids.length===1?'o':'i'} eliminat${ids.length===1?'o':'i'}`); });
  });

  const delAllBtn=document.getElementById('delAllBtn');
  if(delAllBtn) delAllBtn.addEventListener('click',()=>{
    const list=getFilteredTx();
    if(!list.length){ toast('Nessun movimento da eliminare'); return; }
    const label=txFilterCat||txFilterMonth?'i movimenti filtrati':'tutti i movimenti';
    openConfirm(`Eliminare ${label}?`,`Verranno rimossi ${list.length} movimenti. L'operazione non è reversibile.`,()=>{ removeTx(list.map(t=>t.id)); selectedTxIds=new Set(); render(); toast(`${list.length} movimenti eliminati`); });
  });


  const tplBtn=document.getElementById('downloadTxTemplateBtn');
  if(tplBtn) tplBtn.addEventListener('click',downloadTxTemplate);
  const bulkBtn=document.getElementById('bulkImportTxBtn');
  const bulkFile=document.getElementById('bulkImportTxFile');
  if(bulkBtn&&bulkFile) bulkBtn.addEventListener('click',()=>bulkFile.click());
  if(bulkFile) bulkFile.addEventListener('change',()=>{ handleBulkImportFile(bulkFile.files[0]); bulkFile.value=''; });

  // CATEGORIES
  const addCatBtn=document.getElementById('addCatBtn');
  if(addCatBtn) addCatBtn.addEventListener('click',()=>openCatModal(null));
  document.querySelectorAll('[data-editcat]').forEach(b=>b.addEventListener('click',()=>openCatModal(parseInt(b.dataset.editcat))));
  document.querySelectorAll('[data-delcat]').forEach(b=>b.addEventListener('click',()=>{
    const i=parseInt(b.dataset.delcat);
    const cat=state.categories[i];
    const used=state.transactions.some(t=>t.category===cat.name);
    if(used){ openConfirm(`Eliminare "${cat.name}"?`,`Questa categoria è usata da alcuni movimenti. I movimenti esistenti conserveranno il nome della categoria ma non sarà più gestibile.`,()=>{ state.categories.splice(i,1); saveState(); render(); toast('Categoria eliminata'); }); }
    else{ state.categories.splice(i,1); saveState(); render(); toast('Categoria eliminata'); }
  }));

  // Goals / Accounts
  const addGoalBtn=document.getElementById('addGoalBtn');
  if(addGoalBtn) addGoalBtn.addEventListener('click',()=>openGoalModal(null));
  document.querySelectorAll('[data-editgoal]').forEach(b=>b.addEventListener('click',()=>openGoalModal(b.dataset.editgoal)));
  document.querySelectorAll('[data-delgoal]').forEach(b=>b.addEventListener('click',()=>{ const g=state.goals.find(x=>x.id===b.dataset.delgoal); if(!g) return; openConfirm(`Eliminare obiettivo "${escapeHTML(g.name)}"?`,`I movimenti già registrati resteranno invariati.`,()=>{ state.goals=state.goals.filter(x=>x.id!==g.id); saveState(); render(); toast('Obiettivo eliminato'); }); }));
  const addAcctBtn=document.getElementById('addAcctBtn');
  if(addAcctBtn) addAcctBtn.addEventListener('click',()=>openAccountModal(null));
  document.querySelectorAll('[data-editacct]').forEach(b=>b.addEventListener('click',()=>openAccountModal(b.dataset.editacct))); 
}


async function cloudAuth(mode){
  if(!cloud.client){ toast('Prima salva la configurazione Supabase'); return; }
  const email=(document.getElementById('cloudEmail')?.value||'').trim();
  const password=(document.getElementById('cloudPassword')?.value||'').trim();
  if(!email||!password){ toast('Inserisci email e password'); return; }
  try{
    const res = mode==='signup'
      ? await cloud.client.auth.signUp({email,password,options:{emailRedirectTo:'https://fandore.github.io/Libretto/'}})
      : await cloud.client.auth.signInWithPassword({email,password});
    if(res.error) throw res.error;
    if(res.data && res.data.session && res.data.session.user) cloud.user=res.data.session.user;
    else if(res.data && res.data.user) cloud.user=res.data.user;
    const fresh=await cloud.client.auth.getUser();
    if(fresh && fresh.data && fresh.data.user) cloud.user=fresh.data.user;
    await loadState();
    await syncCloudNow();
    currentPage='dashboard';
    render();
    toast(mode==='signup'?'Account creato. Controlla eventuale email di conferma.':'Accesso effettuato');
  }catch(e){ console.warn(e); toast(e.message||'Accesso non riuscito'); }
}

/* ============ REMOVE TX HELPER ============ */
function removeTx(ids){
  state.transactions=state.transactions.filter(t=>!ids.includes(t.id));
  saveState();
}

/* ============ TOAST ============ */
function toast(msg){ const root=document.getElementById('toastRoot'); const el=document.createElement('div'); el.className='toast'; el.textContent=msg; root.innerHTML=''; root.appendChild(el); setTimeout(()=>el.remove(),2400); }

/* ============ CLOSE MODAL ============ */
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }

/* ============ CONFIRM MODAL ============ */
function openConfirm(title,desc,onConfirm){
  document.getElementById('modalRoot').innerHTML=`
  <div class="modal-bg" id="confBg">
    <div class="modal confirm-modal">
      <button class="close-x" id="confClose">✕</button>
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="modal-actions">
        <button class="btn ghost" id="confCancel">Annulla</button>
        <button class="btn danger" id="confOk">Conferma</button>
      </div>
    </div>
  </div>`;
  document.getElementById('confBg').addEventListener('click',e=>{ if(e.target.id==='confBg') closeModal(); });
  document.getElementById('confClose').addEventListener('click',closeModal);
  document.getElementById('confCancel').addEventListener('click',closeModal);
  document.getElementById('confOk').addEventListener('click',()=>{ closeModal(); onConfirm(); });
}

/* ============ MODAL: ADD TRANSACTION ============ */
let formType='out'; let formCategory=catNames()[0];

function openAddModal(){ openTransactionModal(null); }

function openTransactionModal(txId=null){
  const existing=txId?state.transactions.find(t=>t.id===txId):null;
  formType=existing?existing.type:'out';
  formCategory=existing?existing.category:catNames()[0];
  let isRecurring=!!(existing&&existing.recurring);
  let isTransferFlag=!!(existing&&isTransfer(existing));
  const title=existing?'Modifica movimento':'Nuovo movimento';
  document.getElementById('modalRoot').innerHTML=`
  <div class="modal-bg" id="modalBg">
    <div class="modal">
      <button class="close-x" id="closeModal">✕</button>
      <h3>${title}</h3>
      <div class="toggle-type">
        <button type="button" id="typeOut" class="${formType==='out'?'active ':''}out">− Uscita</button>
        <button type="button" id="typeIn" class="${formType==='in'?'active ':''}in">+ Entrata</button>
      </div>
      <div class="transfer-box">
        <label class="checkline"><input type="checkbox" id="fTransfer" ${isTransferFlag?'checked':''}> Trasferimento tra conti / risparmio verso obiettivo</label>
        <div id="transferFields" style="display:${isTransferFlag?'block':'none'};margin-top:12px;">
          <div class="field"><label>Conto destinazione</label><select id="fTransferTo">${state.accounts.map(a=>`<option value="${a.id}" ${existing&&existing.transferTo===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}</select></div>
          <div class="field"><label>Obiettivo associato opzionale</label><select id="fGoal"><option value="">Nessun obiettivo</option>${state.goals.map(g=>`<option value="${g.id}" ${existing&&existing.goalId===g.id?'selected':''}>${escapeHTML(g.name)}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="frow">
        <div class="field"><label>Importo (€)</label><input type="number" id="fAmount" step="0.01" min="0" placeholder="0,00" value="${existing?existing.amount:''}" autofocus></div>
        <div class="field"><label>Data</label><input type="date" id="fDate" value="${existing?existing.date:isoToday()}"></div>
      </div>
      <div class="field"><label>Descrizione / Esercente</label><input type="text" id="fPayee" value="${existing?escapeHTML(existing.payee):''}" placeholder="es. Esselunga, Affitto, Netflix..."></div>
      <div class="field"><label>Conto origine</label><select id="fAccount">${state.accounts.map(a=>`<option value="${a.id}" ${existing&&existing.account===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Categoria</label>
        <div class="cat-pick" id="catPick">${catNames().map(c=>`<div class="cat-chip ${c===formCategory?'active':''}" data-cat="${c}">${catIcon(c)} ${c}</div>`).join('')}</div>
      </div>
      <div class="recurrence-box">
        <label class="checkline"><input type="checkbox" id="fRecurring" ${isRecurring?'checked':''}> Questa uscita è ricorrente / fissa</label>
        <div id="recFields" style="display:${isRecurring?'block':'none'};margin-top:12px;">
          <div class="frow"><div class="field"><label>Frequenza</label><select id="fRecFreq"><option ${existing&&existing.recurringFreq==='Mensile'?'selected':''}>Mensile</option><option ${existing&&existing.recurringFreq==='Settimanale'?'selected':''}>Settimanale</option><option ${existing&&existing.recurringFreq==='Bimestrale'?'selected':''}>Bimestrale</option><option ${existing&&existing.recurringFreq==='Annuale'?'selected':''}>Annuale</option></select></div><div class="field"><label>Prossima data</label><input type="date" id="fRecNext" value="${existing&&existing.recurringNextDate?existing.recurringNextDate:addDays(isoToday(),30)}"></div></div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="cancelAdd">Annulla</button>
        <button class="btn" id="saveAdd">${existing?'Salva modifiche':'Salva movimento'}</button>
      </div>
    </div>
  </div>`;
  function setType(type){ formType=type; document.getElementById('typeOut').classList.toggle('active',type==='out'); document.getElementById('typeIn').classList.toggle('active',type==='in'); if(type==='in'){ isTransferFlag=false; document.getElementById('fTransfer').checked=false; document.getElementById('transferFields').style.display='none'; } }
  document.getElementById('modalBg').addEventListener('click',e=>{ if(e.target.id==='modalBg') closeModal(); });
  document.getElementById('closeModal').addEventListener('click',closeModal);
  document.getElementById('cancelAdd').addEventListener('click',closeModal);
  document.getElementById('typeOut').addEventListener('click',()=>setType('out'));
  document.getElementById('typeIn').addEventListener('click',()=>setType('in'));
  document.getElementById('fRecurring').addEventListener('change',e=>{ isRecurring=e.target.checked; document.getElementById('recFields').style.display=isRecurring?'block':'none'; });
  document.getElementById('fTransfer').addEventListener('change',e=>{ isTransferFlag=e.target.checked; document.getElementById('transferFields').style.display=isTransferFlag?'block':'none'; if(isTransferFlag){ setType('out'); const chip=[...document.querySelectorAll('#catPick .cat-chip')].find(c=>c.dataset.cat==='Risparmi'); if(chip) chip.click(); } });
  document.querySelectorAll('#catPick .cat-chip').forEach(chip=>chip.addEventListener('click',()=>{ formCategory=chip.dataset.cat; document.querySelectorAll('#catPick .cat-chip').forEach(c=>c.classList.remove('active')); chip.classList.add('active'); }));
  document.getElementById('saveAdd').addEventListener('click',()=>{
    const amount=parseFloat(document.getElementById('fAmount').value);
    const date=document.getElementById('fDate').value||isoToday();
    const payee=document.getElementById('fPayee').value.trim()||(isTransferFlag?'Trasferimento':(formType==='out'?'Spesa':'Entrata'));
    const account=document.getElementById('fAccount').value;
    const transferTo=isTransferFlag?document.getElementById('fTransferTo').value:'';
    if(!amount||amount<=0){ toast('Inserisci un importo valido'); return; }
    if(isTransferFlag&&transferTo===account){ toast('Scegli un conto destinazione diverso'); return; }
    const tx={id:existing?existing.id:uid(),date,account,category:formCategory,payee,amount,type:formType,movementType:isTransferFlag?'transfer':'standard',transferTo:transferTo||null,goalId:isTransferFlag?document.getElementById('fGoal').value||null:null,recurring:isRecurring&&!isTransferFlag,recurringFreq:isRecurring?document.getElementById('fRecFreq').value:null,recurringNextDate:isRecurring?document.getElementById('fRecNext').value:null};
    if(existing){ Object.assign(existing,tx); }
    else { state.transactions.push(tx); }
    saveState(); closeModal(); render(); toast(existing?'Movimento aggiornato':(isTransferFlag?'Trasferimento aggiunto':'Movimento aggiunto'));
  });
}

/* ============ MODAL: CATEGORY ============ */
function openCatModal(editIdx){
  const existing=editIdx!=null?state.categories[editIdx]:null;
  let selIcon=existing?existing.icon:'🛒';
  let selColor=existing?existing.color:COLOR_CHOICES[0];
  document.getElementById('modalRoot').innerHTML=`
  <div class="modal-bg" id="catModalBg">
    <div class="modal">
      <button class="close-x" id="closeCatModal">✕</button>
      <h3>${existing?'Modifica categoria':'Nuova categoria'}</h3>
      <div class="field"><label>Nome</label><input type="text" id="catName" value="${existing?escapeHTML(existing.name):''}" placeholder="es. Regali, Animali..."></div>
      <div class="field"><label>Icona</label>
        <div class="emoji-grid" id="emojiGrid">${EMOJI_CHOICES.map(e=>`<button class="emoji-opt${e===selIcon?' active':''}" data-emoji="${e}" type="button">${e}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Colore</label>
        <div class="color-grid" id="colorGrid">${COLOR_CHOICES.map(c=>`<div class="color-opt${c===selColor?' active':''}" data-color="${c}" style="background:${c}"></div>`).join('')}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <div id="catPreview" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;background:${selColor}22">${selIcon}</div>
        <span id="catPreviewName" style="font-size:15px;font-weight:500">${existing?escapeHTML(existing.name):'Anteprima'}</span>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="cancelCat">Annulla</button>
        <button class="btn" id="saveCat">${existing?'Salva modifiche':'Crea categoria'}</button>
      </div>
    </div>
  </div>`;

  function updatePreview(){ document.getElementById('catPreview').style.background=selColor+'22'; document.getElementById('catPreview').textContent=selIcon; }
  document.getElementById('catModalBg').addEventListener('click',e=>{ if(e.target.id==='catModalBg') closeModal(); });
  document.getElementById('closeCatModal').addEventListener('click',closeModal);
  document.getElementById('cancelCat').addEventListener('click',closeModal);
  document.getElementById('catName').addEventListener('input',()=>{ document.getElementById('catPreviewName').textContent=document.getElementById('catName').value||'Anteprima'; });
  document.querySelectorAll('#emojiGrid .emoji-opt').forEach(b=>b.addEventListener('click',()=>{ selIcon=b.dataset.emoji; document.querySelectorAll('#emojiGrid .emoji-opt').forEach(x=>x.classList.remove('active')); b.classList.add('active'); updatePreview(); }));
  document.querySelectorAll('#colorGrid .color-opt').forEach(d=>d.addEventListener('click',()=>{ selColor=d.dataset.color; document.querySelectorAll('#colorGrid .color-opt').forEach(x=>x.classList.remove('active')); d.classList.add('active'); updatePreview(); }));

  document.getElementById('saveCat').addEventListener('click',()=>{
    const name=document.getElementById('catName').value.trim();
    if(!name){ toast('Inserisci un nome'); return; }
    const duplicate=state.categories.find((c,i)=>c.name===name&&i!==editIdx);
    if(duplicate){ toast('Esiste già una categoria con questo nome'); return; }
    if(editIdx!=null){
      const oldName=state.categories[editIdx].name;
      state.categories[editIdx]={name,icon:selIcon,color:selColor};
      // update existing transactions
      state.transactions.forEach(t=>{ if(t.category===oldName) t.category=name; });
      // update budgets
      if(state.budgets[oldName]!==undefined){ state.budgets[name]=state.budgets[oldName]; delete state.budgets[oldName]; }
    } else {
      state.categories.push({name,icon:selIcon,color:selColor});
    }
    saveState(); closeModal(); render(); toast(editIdx!=null?'Categoria aggiornata':'Categoria creata');
  });
}

/* ============ MODAL: GOAL ============ */
function openGoalModal(goalId=null){
  const g=goalId?state.goals.find(x=>x.id===goalId):null;
  document.getElementById('modalRoot').innerHTML=`
  <div class="modal-bg" id="goalBg">
    <div class="modal"><button class="close-x" id="closeGoal">✕</button><h3>${g?'Modifica obiettivo':'Nuovo obiettivo di risparmio'}</h3>
      <div class="field"><label>Nome</label><input type="text" id="gName" value="${g?escapeHTML(g.name):''}" placeholder="es. Fondo emergenza"></div>
      <div class="field"><label>Conto in cui lo deposito</label><select id="gAccount">${state.accounts.map(a=>`<option value="${a.id}" ${g&&g.account===a.id?'selected':''}>${escapeHTML(a.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Obiettivo (€)</label><input type="number" id="gTarget" min="0" step="50" value="${g?g.target:''}" placeholder="5000"></div>
      <div class="modal-actions"><button class="btn ghost" id="cancelGoal">Annulla</button><button class="btn" id="saveGoal">${g?'Salva modifiche':'Crea obiettivo'}</button></div>
    </div>
  </div>`;
  document.getElementById('goalBg').addEventListener('click',e=>{ if(e.target.id==='goalBg') closeModal(); });
  document.getElementById('closeGoal').addEventListener('click',closeModal);
  document.getElementById('cancelGoal').addEventListener('click',closeModal);
  document.getElementById('saveGoal').addEventListener('click',()=>{
    const name=document.getElementById('gName').value.trim();
    const account=document.getElementById('gAccount').value;
    const target=parseFloat(document.getElementById('gTarget').value);
    if(!name||!target||target<=0){ toast('Compila tutti i campi'); return; }
    if(g){ g.name=name; g.account=account; g.target=target; }
    else state.goals.push({id:uid(),name,account,target});
    saveState(); closeModal(); render(); toast(g?'Obiettivo aggiornato':'Obiettivo creato');
  });
}

/* ============ MODAL: ACCOUNT ============ */
function openAccountModal(accountId=null){
  const acct=accountId?state.accounts.find(a=>a.id===accountId):null;
  document.getElementById('modalRoot').innerHTML=`
  <div class="modal-bg" id="acctBg">
    <div class="modal"><button class="close-x" id="closeAcct">✕</button><h3>${acct?'Modifica conto':'Nuovo conto'}</h3>
      <div class="field"><label>Nome conto</label><input type="text" id="aName" value="${acct?escapeHTML(acct.name):''}" placeholder="es. Conto risparmio"></div>
      <div class="field"><label>Saldo iniziale (€)</label><input type="number" id="aInitial" step="0.01" value="${acct?(acct.initialBalance??0):''}" placeholder="0,00"></div>
      <div class="empty" style="text-align:left;padding-top:0">Il saldo attuale non si modifica manualmente: viene calcolato da saldo iniziale + entrate − uscite + trasferimenti.</div>
      ${acct?`<div class="mini-kpi" style="margin-bottom:14px"><div class="mlabel">Saldo calcolato oggi</div><div class="mvalue num">${fmtEUR(accountBalance(acct.id))}</div></div>`:''}
      <div class="modal-actions"><button class="btn ghost" id="cancelAcct">Annulla</button><button class="btn" id="saveAcct">${acct?'Salva conto':'Crea conto'}</button></div>
    </div>
  </div>`;
  document.getElementById('acctBg').addEventListener('click',e=>{ if(e.target.id==='acctBg') closeModal(); });
  document.getElementById('closeAcct').addEventListener('click',closeModal);
  document.getElementById('cancelAcct').addEventListener('click',closeModal);
  document.getElementById('saveAcct').addEventListener('click',()=>{
    const name=document.getElementById('aName').value.trim();
    const initialBalance=parseFloat(document.getElementById('aInitial').value)||0;
    if(!name){ toast('Inserisci un nome'); return; }
    if(acct){ acct.name=name; acct.initialBalance=initialBalance; }
    else state.accounts.push({id:uid(),name,initialBalance});
    saveState(); closeModal(); render(); toast(acct?'Conto aggiornato':'Conto creato');
  });
}


/* ============ AI UPDATE TOOLBAR ============ */
function currentHtmlSource(){
  return '<!doctype html>\n' + document.documentElement.outerHTML;
}

function buildUpdatePrompt(includeHtml=true){
  const base = `Sto sviluppando una single-file web app HTML/CSS/JS standalone chiamata Libretto.\n\nDevi aiutarmi ad aggiornarla senza rompere le funzioni esistenti. Requisiti architetturali importanti:\n- persistenza dati locale con localStorage e cloud Supabase multiutente preconfigurato;\n- saldi dei conti calcolati solo da saldo iniziale + movimenti + trasferimenti;\n- i singoli movimenti devono essere modificabili;\n- supporto trasferimenti tra conti;\n- ciclo Dashboard e Budget basato sul movimento Stipendio più recente fino al prossimo Stipendio;\n- riepilogo budget con barre di completamento in Dashboard;\n- non cancellare dati già salvati in localStorage;\n- preferisci patch mirate e conservative rispetto a riscrivere tutto.\n\nRichiesta di modifica / nuova funzionalità:\n[SCRIVI QUI COSA VUOI MODIFICARE]\n\nAnalizza prima il codice e poi restituisci un file HTML completo aggiornato.`;
  return includeHtml ? `${base}\n\n--- CODICE HTML CORRENTE ---\n${currentHtmlSource()}` : base;
}

async function copyTextToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.position='fixed'; ta.style.left='-9999px'; ta.style.top='-9999px';
    document.body.appendChild(ta); ta.focus(); ta.select();
    let ok=false;
    try{ ok=document.execCommand('copy'); }catch(err){}
    ta.remove();
    return ok;
  }
}

async function openAiChat(url, label){
  const ok=await copyTextToClipboard(buildUpdatePrompt(true));
  toast(ok ? `Prompt + HTML copiati. Incollali in ${label}.` : `Apri ${label} e allega/esporta il file HTML.`);
  window.open(url, '_blank', 'noopener,noreferrer');
}

function exportCurrentHtml(){
  const blob=new Blob([currentHtmlSource()],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`libretto-current-${isoToday()}.html`; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('HTML corrente esportato');
}

function openUpdatePromptModal(){
  const prompt=buildUpdatePrompt(false);
  document.getElementById('modalRoot').innerHTML=`
  <div class="modal-bg" id="promptBg">
    <div class="modal" style="max-width:720px">
      <button class="close-x" id="closePrompt">✕</button>
      <h3>Prompt per richieste di aggiornamento</h3>
      <div class="empty" style="text-align:left;padding-top:0">Questo prompt spiega come modificare Libretto senza rompere salvataggio, saldi e ciclo stipendio. Puoi copiarlo e poi allegare il file HTML esportato.</div>
      <textarea class="prompt-box" id="promptText">${escapeHTML(prompt)}</textarea>
      <div class="modal-actions">
        <button class="btn ghost" id="cancelPrompt">Chiudi</button>
        <button class="btn" id="copyPromptOnly">Copia prompt</button>
        <button class="btn" id="copyPromptFull">Copia prompt + HTML</button>
      </div>
    </div>
  </div>`;
  document.getElementById('promptBg').addEventListener('click',e=>{ if(e.target.id==='promptBg') closeModal(); });
  document.getElementById('closePrompt').addEventListener('click',closeModal);
  document.getElementById('cancelPrompt').addEventListener('click',closeModal);
  document.getElementById('copyPromptOnly').addEventListener('click',async()=>{ const ok=await copyTextToClipboard(document.getElementById('promptText').value); toast(ok?'Prompt copiato':'Copia non riuscita'); });
  document.getElementById('copyPromptFull').addEventListener('click',async()=>{ const ok=await copyTextToClipboard(buildUpdatePrompt(true)); toast(ok?'Prompt + HTML copiati':'Copia non riuscita'); });
}


document.getElementById('fabAdd').addEventListener('click',openAddModal);
document.getElementById('exportBackupBtn').addEventListener('click',exportBackup);
document.getElementById('importBackupBtn').addEventListener('click',()=>document.getElementById('importBackupFile').click());
document.getElementById('importBackupFile').addEventListener('change',e=>{ const file=e.target.files&&e.target.files[0]; if(file) importBackupFile(file); e.target.value=''; });


function migrateState(){
  if(!state.categories.some(c=>c.name==='Risparmi')) state.categories.splice(Math.max(0,state.categories.length-1),0,{name:'Risparmi',icon:'🏦',color:'#d6a23c'});
  state.accounts.forEach(a=>{ if(a.initialBalance===undefined) a.initialBalance=parseFloat(a.balance)||0; delete a.balance; });
  state.transactions.forEach(t=>{ if(!t.movementType) t.movementType='standard'; if(t.recurring===undefined) t.recurring=false; });
  if(!state.goals) state.goals=[];
  if(!state.settings) state.settings={};
  if(state.settings.dashboardShowBalances===undefined) state.settings.dashboardShowBalances=true;
  if(!state.settings.dashboardAccountId && state.accounts[0]) state.settings.dashboardAccountId=state.accounts[0].id;
  if(!state.stoppedRecurrings) state.stoppedRecurrings=[];
  ensureMeta();
  // Il ciclo budget ora è derivato dai movimenti Stipendio, non da un giorno fisso.
}


/* ============ PWA SERVICE WORKER ============ */
(function registerPwa(){
  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js').catch(()=>{});
    });
  }
})();

/* ============ INIT ============ */
(async function init(){
  await initCloud();
  const had=await loadState();
  if(!had){ migrateState(); state.transactions=seedTransactions(); saveState(); } else { migrateState(); saveState(); }
  setPage('dashboard');
  window.addEventListener('focus',()=>{ if(cloud.client&&cloud.user) syncCloudNow(); });
  setInterval(()=>{ if(cloud.client&&cloud.user) syncCloudNow(); }, 60000);
})();
