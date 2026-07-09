(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[{name:`Spesa`,icon:`🛒`,color:`#d6a23c`},{name:`Trasporti`,icon:`🚌`,color:`#7ea487`},{name:`Casa`,icon:`🏠`,color:`#e2725b`},{name:`Bollette`,icon:`💡`,color:`#a78bd1`},{name:`Svago`,icon:`🎬`,color:`#5fb3c9`},{name:`Ristoranti`,icon:`🍝`,color:`#e0975c`},{name:`Salute`,icon:`⚕️`,color:`#7ec99a`},{name:`Abbonamenti`,icon:`📺`,color:`#d17ea8`},{name:`Stipendio`,icon:`💼`,color:`#7ea487`},{name:`Risparmi`,icon:`🏦`,color:`#d6a23c`},{name:`Altro`,icon:`✦`,color:`#bcb5a3`}],t=[`#d6a23c`,`#7ea487`,`#5fb3c9`,`#e2725b`,`#a78bd1`],n=`🛒.🚌.🏠.💡.🎬.🍝.⚕️.📺.💼.✦.🎓.🐾.👕.✈️.🎁.🔧.📱.☕.💪.🧾.🎮.🏋️.🧴.🐶.🌿.🎵.🍕.🚗.🏖️.📚`.split(`.`),r=[`#d6a23c`,`#7ea487`,`#e2725b`,`#a78bd1`,`#5fb3c9`,`#e0975c`,`#7ec99a`,`#d17ea8`,`#bcb5a3`,`#8aa6d6`,`#c97070`,`#70c9b0`,`#e8c847`,`#9e7ac4`];function i(){return`t`+Math.random().toString(36).slice(2,10)}function a(){return new Date().toISOString().slice(0,10)}function o(e,t){let n=new Date(e);return n.setDate(n.getDate()+t),n.toISOString().slice(0,10)}function s(e){return(e<0?`-`:``)+`€`+Math.abs(e).toLocaleString(`it-IT`,{minimumFractionDigits:2,maximumFractionDigits:2})}function c(e){return new Date(e).toLocaleDateString(`it-IT`,{day:`2-digit`,month:`short`})}function l(e){let t=document.createElement(`div`);return t.textContent=e,t.innerHTML}function u(e,t){return new Date(e,t+1,0).getDate()}function d(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate())}function f(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function p(e){let[t,n,r]=String(e).slice(0,10).split(`-`).map(Number);return new Date(t,(n||1)-1,r||1)}function m(){return new Date().toISOString()}function h(e){return e?new Date(e).toLocaleString(`it-IT`,{day:`2-digit`,month:`2-digit`,hour:`2-digit`,minute:`2-digit`}):`mai`}function g(e){return e.movementType===`transfer`}function _(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}`}function v(e,t){let n=new Date(e);return n.setMonth(n.getMonth()+t),n}var y={accounts:[{id:`a1`,name:`Conto corrente`,balance:23.73,initialBalance:23.73},{id:`a2`,name:`Conto Arancio`,balance:3800.68,initialBalance:3800.68},{id:`a3`,name:`Moneyfarm`,balance:14300,initialBalance:14300}],categories:JSON.parse(JSON.stringify(e)),budgets:{Spesa:350,Trasporti:80,Casa:900,Bollette:150,Svago:100,Ristoranti:120,Abbonamenti:40},goals:[{id:`g1`,name:`Risparmi liquidi`,account:`a2`,target:5e3},{id:`g2`,name:`Investimento Moneyfarm`,account:`a3`,target:2e4}],transactions:[],alertsDismissed:{},settings:{salaryDay:27}};function b(e){return y.categories.find(t=>t.name===e)||{name:e,icon:`✦`,color:`#bcb5a3`}}function x(e){return b(e).icon}function S(e){return b(e).color}function C(){return y.categories.map(e=>e.name)}function ee(e){return String(e||``).toLowerCase()===`risparmi`}function te(e){let t=String(e.category||``).toLowerCase(),n=String(e.payee||``).toLowerCase();return e.type===`in`&&!g(e)&&(t.includes(`stipendio`)||n.includes(`stipendio`))}function w(){let e=new Set;return y.transactions.filter(te).map(e=>d(p(e.date))).sort((e,t)=>e-t).filter(t=>{let n=f(t);return e.has(n)?!1:(e.add(n),!0)})}function T(e,t){return new Date(e,t,1)}function ne(e){let t=e.getFullYear(),n=e.getMonth()+1,r=e.getDate();return new Date(t,n,Math.min(r,u(t,n)))}function re(e){return w().find(t=>t>e)||ne(e)}function E(e=new Date){let t=d(e),n=w(),r=null;for(let e of n)if(e<=t)r=e;else break;return!r&&n.length&&(r=n[n.length-1]),r}function ie(e,t){return w().find(n=>n.getFullYear()===e&&n.getMonth()===t)||T(e,t)}function D(e,t){let n=ie(e,t),r=re(n);return{start:n,end:new Date(r.getTime()-1)}}function ae(){let e=E();if(!e){let e=T(W,U);return{start:e,end:new Date(new Date(e.getFullYear(),e.getMonth()+1,1).getTime()-1),estimated:!1,hasSalary:!1}}let t=w().find(t=>t>e)||null,n=t||re(e);return{start:e,end:new Date(n.getTime()-1),estimated:!t,hasSalary:!0}}function O(e){let t=e=>e.toLocaleDateString(`it-IT`,{day:`2-digit`,month:`short`});return`${t(e.start)} – ${t(e.end)} ${e.end.getFullYear()}`}function oe(e,t){return O(D(e,t))}function se(e){return y.transactions.filter(t=>{let n=d(p(t.date));return n>=e.start&&n<=e.end})}function ce(e){let t=d(p(e)),n=w(),r=null;for(let e of n)if(e<=t)r=e;else break;return r||=T(t.getFullYear(),t.getMonth()),_(r)}function le(e=!0){let t=new Set(w().map(_));if(e){let e=new Date(W,U,1);for(let n=-6;n<=6;n++)t.add(_(v(e,n)))}return[...t].sort()}function k(){let e=ae();return{year:e.start.getFullYear(),month:e.start.getMonth(),bounds:e}}function ue(){let e=a(),t=[];function n(n,r,a,s,c,l){t.push({id:i(),date:o(e,-n),account:r,category:a,payee:s,amount:c,type:l})}return[2,32,62].forEach(e=>n(e,`a1`,`Casa`,`Affitto`,650,`out`)),[5,35,65].forEach(e=>n(e,`a1`,`Abbonamenti`,`Netflix`,12.99,`out`)),[7,37].forEach(e=>n(e,`a1`,`Abbonamenti`,`Palestra FitClub`,39.9,`out`)),[1,31].forEach(e=>n(e,`a2`,`Stipendio`,`Stipendio`,1850,`in`)),n(1,`a1`,`Spesa`,`Esselunga`,54.3,`out`),n(3,`a1`,`Trasporti`,`Trenord`,18.5,`out`),n(4,`a1`,`Ristoranti`,`Trattoria Da Marco`,32,`out`),n(6,`a1`,`Spesa`,`Carrefour`,41.1,`out`),n(8,`a1`,`Svago`,`Cinema UCI`,12,`out`),n(9,`a1`,`Salute`,`Farmacia Centrale`,22.4,`out`),n(11,`a1`,`Spesa`,`Esselunga`,37.85,`out`),n(13,`a1`,`Trasporti`,`ATM Milano`,22,`out`),n(15,`a1`,`Ristoranti`,`Sushi Time`,28.5,`out`),n(18,`a1`,`Bollette`,`Enel Energia`,78.2,`out`),n(20,`a1`,`Spesa`,`Lidl`,29.95,`out`),n(22,`a1`,`Svago`,`Spotify`,9.99,`out`),n(25,`a1`,`Casa`,`IKEA`,64,`out`),n(0,`a1`,`Spesa`,`Esselunga`,19.4,`out`),t.sort((e,t)=>e.date<t.date?1:-1),t}var de=`22.1-sidebar-user-recurring-summary`,fe=`https://marvmbewsgxrabirugkk.supabase.co`,pe=`sb_publishable_Jsd4sX6_6pNCUqHIcun4lA_9F81WlPg`,A=`libretto-v2-standalone-state`,me=`libretto-cloud-config`,he=`libretto-device-id`,j={client:null,user:null,ready:!1,loading:!1,syncing:!1,status:`local`,lastSync:null,lastError:null,pending:!1},ge=null;function _e(){let e=localStorage.getItem(he);return e||(e=`dev-`+Math.random().toString(36).slice(2)+`-`+Date.now().toString(36),localStorage.setItem(he,e)),e}function ve(){return y._meta||={},y._meta.createdAt||(y._meta.createdAt=m()),y._meta.deviceId||(y._meta.deviceId=_e()),y._meta.appVersion||(y._meta.appVersion=de),y._meta}function ye(){let e=ve();e.updatedAt=m(),e.deviceId=_e(),e.appVersion=de}function be(){return y._meta&&y._meta.updatedAt||``}function xe(){return{url:fe,anonKey:pe}}function M(){let e=xe();return!!(e.url&&e.anonKey)}function Se(){return M()?j.syncing?`Sincronizzazione in corso…`:j.lastError?`Errore cloud: controlla connessione o configurazione`:j.user?`Cloud attivo · ${j.user.email||j.user.id}`:`Cloud configurato, login non effettuato`:`Cloud non disponibile`}function Ce(){return j.syncing?`sync`:j.user&&!j.lastError?`on`:`off`}function we(){return((j.user&&j.user.email||``).trim()[0]||`U`).toUpperCase()}function Te(){return M()&&!j.user}function Ee(){let e=document.getElementById(`userPillRoot`);if(e)if(j.user){e.innerHTML=`<div class="user-pill" title="Utente collegato">
      <div class="user-pill-main"><div class="avatar">${l(we())}</div><div class="uinfo"><div style="font-weight:700;line-height:1">Utente attivo</div><div class="uemail">${l(j.user.email||j.user.id)}</div></div></div>
      <div class="user-pill-actions"><button id="pillCloudBtn" type="button">Cloud</button><button id="pillLogoutBtn" class="danger-mini" type="button">Esci</button></div>
    </div>`;let t=document.getElementById(`pillCloudBtn`);t&&t.addEventListener(`click`,()=>st(`cloud`));let n=document.getElementById(`pillLogoutBtn`);n&&n.addEventListener(`click`,async()=>{j.client&&await j.client.auth.signOut(),j.user=null,J(),Y(`Logout effettuato`)})}else e.innerHTML=``}function De(){let e=xe();return`<div class="auth-gate"><div class="auth-card">
    <div class="auth-logo"><div class="mark">L</div><div><div class="auth-title">Libretto</div><div class="auth-sub">Accedi per usare l'app e sincronizzare i tuoi dati su PC e telefono.</div></div></div>
    ${e.url&&e.anonKey?`
      <div class="auth-mode"><button id="authModeLogin" class="active" type="button">Accedi</button><button id="authModeSignup" type="button">Crea account</button></div>
      <div class="field"><label>Email</label><input type="email" id="cloudEmail" placeholder="nome@email.com" autocomplete="email"></div>
      <div class="field"><label>Password</label><input type="password" id="cloudPassword" placeholder="Minimo 6 caratteri" autocomplete="current-password"></div>
      <div class="modal-actions"><button class="btn" id="authSubmitBtn">Accedi</button></div>
      <div class="auth-small">Dopo il primo accesso resterai collegato su questo dispositivo, finché non farai logout o cancellerai i dati del browser.</div>`:`<div class="alert-banner warn"><div class="aicon">⚙️</div><div class="abody"><div class="atitle">Cloud non configurato</div><div class="adesc">Configurazione cloud integrata nella build. Ricarica la pagina se il login non compare.</div></div></div><div class="modal-actions"><button class="btn" id="goCloudSetupBtn">Apri cloud</button></div>`}
  </div></div>`}function Oe(){let e=document.getElementById(`goCloudSetupBtn`);e&&e.addEventListener(`click`,()=>{H=`cloud`,J()});let t=`login`,n=document.getElementById(`authModeLogin`),r=document.getElementById(`authModeSignup`),i=document.getElementById(`authSubmitBtn`);function a(e){t=e,n&&n.classList.toggle(`active`,e===`login`),r&&r.classList.toggle(`active`,e===`signup`),i&&(i.textContent=e===`signup`?`Crea account`:`Accedi`)}n&&n.addEventListener(`click`,()=>a(`login`)),r&&r.addEventListener(`click`,()=>a(`signup`)),i&&i.addEventListener(`click`,()=>Pt(t)),[`cloudEmail`,`cloudPassword`].forEach(e=>{let n=document.getElementById(e);n&&n.addEventListener(`keydown`,e=>{e.key===`Enter`&&Pt(t)})})}async function ke(){if(!window.supabase||!M())return!1;let e=xe();try{j.client=window.supabase.createClient(e.url,e.anonKey,{auth:{persistSession:!0,autoRefreshToken:!0,detectSessionInUrl:!0}});let{data:t}=await j.client.auth.getSession();return j.user=t&&t.session?t.session.user:null,j.ready=!0,j.client.auth.onAuthStateChange(async(e,t)=>{j.user=t?t.user:null,j.user&&await Me(),J()}),!0}catch(e){return console.warn(`Cloud non inizializzato`,e),!1}}async function Ae({force:e=!1}={}){if(!j.client||!j.user)return!1;try{j.loading=!0,j.syncing=!0,j.lastError=null,P();let t=null,n=await j.client.rpc(`get_libretto_state`);if(n.error)throw n.error;if(t=Array.isArray(n.data)?n.data[0]||null:n.data||null,t&&t.data){let n=t.data,r=n._meta&&n._meta.updatedAt||t.updated_at||``,i=be();return e||!i||r>=i?(y=Object.assign(y,n),$(),localStorage.setItem(A,JSON.stringify(y)),j.lastSync=m(),j.status=`synced`,j.pending=!1,j.loading=!1,j.syncing=!1,P(),!0):(j.loading=!1,j.syncing=!1,P(),!1)}return j.loading=!1,j.syncing=!1,await Ie(),!0}catch(e){return j.loading=!1,j.syncing=!1,j.lastError=e.message||String(e),P(),console.warn(`Impossibile leggere dal cloud, uso locale`,e),Y(`Cloud non disponibile: uso dati locali`),!1}}async function je({preferCloud:e=!1}={}){return!j.client||!j.user?!1:e?await Ae({force:!0}):await Ae({force:!1})?!0:await Ie()}async function Me(){if(j.client&&j.user&&await Ae({force:!0}))return!0;try{let e=localStorage.getItem(A)||localStorage.getItem(`libretto-state2`);if(e){let t=JSON.parse(e);return y=Object.assign(y,t),$(),!0}}catch(e){console.warn(`Impossibile leggere i dati salvati`,e)}return!1}var Ne=null;function N(){j.loading||ye(),clearTimeout(Ne),Ne=setTimeout(()=>{try{localStorage.setItem(A,JSON.stringify(y))}catch(e){console.warn(`Impossibile salvare i dati`,e),Y(`Salvataggio non riuscito: spazio browser esaurito?`)}},150),Fe()}function Pe(){try{return ye(),localStorage.setItem(A,JSON.stringify(y)),Fe(50),!0}catch(e){return console.warn(e),!1}}function Fe(e=700){!j.client||!j.user||j.loading||(j.pending=!0,j.status=`pending`,P(),clearTimeout(ge),ge=setTimeout(()=>Ie(),e))}async function Ie(){if(!j.client||!j.user)return!1;try{j.syncing=!0,j.lastError=null,P(),ve(),y._meta.updatedAt=m(),y._meta.deviceId=_e(),y._meta.appVersion=de;let e=await j.client.rpc(`save_libretto_state`,{p_data:y});if(e.error)throw e.error;j.lastSync=m(),j.status=`synced`,j.pending=!1,j.syncing=!1,P();try{localStorage.setItem(A,JSON.stringify(y))}catch{}return!0}catch(e){return j.syncing=!1,j.lastError=e.message||String(e),P(),console.warn(`Salvataggio cloud non riuscito`,e),!1}}function P(){let e=document.getElementById(`cloudLiveStatus`);e&&(e.innerHTML=yt())}function Le(){Pe();let e={app:`Libretto`,version:de,exportedAt:new Date().toISOString(),state:y},t=new Blob([JSON.stringify(e,null,2)],{type:`application/json`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`libretto-backup-${a()}.json`,document.body.appendChild(r),r.click(),r.remove(),URL.revokeObjectURL(n),Y(`Backup esportato`)}function Re(e){let t=new FileReader;t.onload=()=>{try{let e=JSON.parse(t.result),n=e.state||e;if(!n||!Array.isArray(n.accounts)||!Array.isArray(n.transactions))throw Error(`Formato non valido`);Z(`Importare questo backup?`,`I dati attuali verranno sostituiti dai dati del file JSON selezionato.`,()=>{y=Object.assign(y,n),$(),Pe(),G=new Set,X(),J(),Y(`Backup importato`)})}catch{Y(`File backup non valido`)}},t.readAsText(e)}function ze(e,t){return F(e,t)}function F(e,t){return se(D(e,t))}function I(e){let t={};return e.filter(e=>e.type===`out`&&e.movementType!==`transfer`).forEach(e=>{t[e.category]=(t[e.category]||0)+e.amount}),t}function L(e){return e.type===`out`&&!g(e)}function R(e){let t=y.accounts.find(t=>t.id===e);if(!t)return 0;let n=parseFloat(t.initialBalance)||0;return y.transactions.forEach(t=>{let r=parseFloat(t.amount)||0;t.account===e&&(n+=t.type===`out`?-r:r),g(t)&&t.transferTo===e&&(n+=r)}),n}function Be(){return y.accounts.reduce((e,t)=>e+R(t.id),0)}function Ve(){let e=y.settings&&y.settings.dashboardAccountId;return e&&y.accounts.some(t=>t.id===e)?e:y.accounts[0]?y.accounts[0].id:`all`}function He(){return!(y.settings&&y.settings.dashboardShowBalances===!1)}function z(e,t){return!t||t===`all`||e.account===t||g(e)&&e.transferTo===t}function B(e,t){return e.filter(e=>z(e,t))}function V(e){if(e===`all`)return`Tutti i conti`;let t=y.accounts.find(t=>t.id===e);return t?t.name:`Conto`}function Ue(e){if(!He())return`<div class="card kpi"><div class="label">Saldo nascosto</div><div class="value num">••••••</div><div class="delta">Riattiva la visualizzazione dalla Dashboard</div></div>`;if(e&&e!==`all`){let t=y.accounts.find(t=>t.id===e);return`<div class="card kpi"><div class="label">Saldo ${l(t?t.name:`conto`)}</div><div class="value num">${s(R(e))}</div><div class="delta">saldo iniziale + movimenti</div></div>`}return`<div class="card kpi"><div class="label">Saldo totale</div><div class="value num">${s(Be())}</div><div class="delta">su ${y.accounts.length} conti</div></div>`}function We(){return He()?`<div class="card" style="margin-bottom:16px;"><h3>Saldi per conto</h3>${y.accounts.map(e=>`
    <div class="rec-item"><div><div class="nm">🏦 ${l(e.name)}</div><div class="freq">Saldo iniziale: <span class="num">${s(parseFloat(e.initialBalance)||0)}</span></div></div><div class="num" style="color:${R(e.id)>=0?`var(--sage)`:`var(--coral)`}">${s(R(e.id))}</div></div>`).join(``)}</div>`:``}function Ge(e){let[t,n]=e.split(`-`).map(Number);return oe(t,n-1)}function Ke(e=`all`){let t=y.transactions.filter(t=>z(t,e)).sort((e,t)=>String(e.date).localeCompare(String(t.date)));return t.length?ce(t[0].date):null}function qe(e){let[t,n]=e.split(`-`).map(Number),r=D(t,n-1);return`${r.start.toLocaleDateString(`it-IT`,{day:`2-digit`,month:`short`}).replace(`.`,``)}–${r.end.toLocaleDateString(`it-IT`,{day:`2-digit`,month:`short`}).replace(`.`,``)}`}function Je(e=5,t=0,n=W,r=U,i=`all`){let a=new Date(n,r,1),o=_(v(a,t)),s=_(v(a,-e)),c=Ke(i),l=c&&c>s?c:s,u=[],d=l,f=0;for(;d<=o&&f<36;){u.push(d);let[e,t]=d.split(`-`).map(Number);d=_(v(new Date(e,t-1,1),1)),f++}return u.map(e=>{let[t,n]=e.split(`-`).map(Number),r=B(F(t,n-1),i),a=r.filter(e=>e.type===`in`&&!g(e)).reduce((e,t)=>e+t.amount,0),o=r.filter(L).reduce((e,t)=>e+t.amount,0),s=r.filter(g).reduce((e,t)=>e+t.amount,0);return{key:e,label:Ge(e),shortLabel:qe(e),income:a,expense:o,net:a-o,transfers:s}}).filter(e=>e.income!==0||e.expense!==0||e.transfers!==0||e.key===o)}function Ye(){let e=y.transactions.filter(e=>L(e)&&e.recurring),t=nt().filter(e=>e.type===`out`),n={};return e.forEach(e=>{let t=(e.payee||``).toLowerCase()+`|`+e.account+`|`+e.category;n[t]={payee:e.payee,category:e.category,amount:e.amount,freq:e.recurringFreq||`Mensile`,source:`manuale`}}),t.forEach(e=>{let t=(e.payee||``).toLowerCase()+`|`+e.category;n[t]||(n[t]={payee:e.payee,category:e.category,amount:e.amount,freq:e.freq,source:`rilevata`})}),Object.values(n).sort((e,t)=>t.amount-e.amount)}function Xe(){return Ye().filter(e=>e.freq!==`Settimanale`).reduce((e,t)=>e+t.amount,0)+Ye().filter(e=>e.freq===`Settimanale`).reduce((e,t)=>e+t.amount*4.33,0)}function Ze(e,t){return t===`Settimanale`?e*4.33:t===`Annuale`?e/12:e}function Qe(e=`all`){let t=[];y.transactions.filter(t=>L(t)&&t.recurring&&z(t,e)).forEach(e=>{t.push({payee:e.payee,category:e.category,amount:e.amount,freq:e.recurringFreq||`Mensile`,source:`manuale`})}),nt().filter(e=>e.type===`out`).forEach(n=>{let r=y.transactions.some(t=>String(t.payee||``).toLowerCase()===String(n.payee||``).toLowerCase()&&z(t,e)),i=t.some(e=>String(e.payee||``).toLowerCase()===String(n.payee||``).toLowerCase()&&e.category===n.category);r&&!i&&t.push({payee:n.payee,category:n.category,amount:n.amount,freq:n.freq,source:`rilevata`})});let n={};return t.forEach(e=>{let t=e.category||`Altro`;n[t]||(n[t]={category:t,total:0,count:0,manual:0,detected:0,items:[]});let r=Ze(parseFloat(e.amount)||0,e.freq);n[t].total+=r,n[t].count+=1,n[t].items.push({...e,monthly:r}),e.source===`manuale`?n[t].manual+=1:n[t].detected+=1}),Object.values(n).sort((e,t)=>t.total-e.total)}function $e(e=`all`){let t=Qe(e);if(!t.length)return`<div class="empty">Nessuna spesa ricorrente ancora. Puoi marcarle quando inserisci o modifichi un movimento.</div>`;let n=t.reduce((e,t)=>e+t.total,0),r=Math.max(1,...t.map(e=>e.total));return`<div class="mini-grid" style="grid-template-columns:1fr;margin-bottom:14px;"><div class="mini-kpi"><div class="mlabel">Totale ricorrente stimato</div><div class="mvalue num neg">${s(n)}</div><div class="sync-note">equivalente mensile per ${l(V(e))}</div></div></div>`+t.map(e=>`<div class="catbar-row">
      <div class="catbar-top"><div class="nm">${x(e.category)} ${e.category} <span class="pill rec">${e.count} voc${e.count===1?`e`:`i`}</span></div><div class="amt num">${s(e.total)}</div></div>
      <div class="catbar-track"><div class="catbar-fill" style="width:${(e.total/r*100).toFixed(0)}%;background:${S(e.category)}"></div></div>
      <div class="budget-row-foot">${e.items.slice(0,3).map(e=>`${l(e.payee||`—`)} · ${e.freq} · ${s(e.monthly)}/mese`).join(` · `)}${e.items.length>3?` · …`:``}</div>
    </div>`).join(``)}function et(e=6){let t=Je(5,0,W,U,`all`).filter(e=>e.income>0).reduce((e,t,n,r)=>e+t.income/r.length,0)||0,n=Xe(),r=Be(),i=[],a=new Date(W,U,1);for(let o=1;o<=e;o++){let e=_(v(a,o)),s=t-n;r+=s,i.push({key:e,label:Ge(e),income:t,fixed:n,net:s,balance:r})}return i}function tt(e,t){let n=document.getElementById(e);if(!n)return;let r=n.getContext(`2d`),i=n.getBoundingClientRect(),a=window.devicePixelRatio||1;n.width=i.width*a,n.height=i.height*a,r.scale(a,a);let o=i.width,s=i.height,c=o<520,l={l:c?42:44,r:c?18:28,t:c?42:34,b:c?64:38};if(r.clearRect(0,0,o,s),r.font=(c?`11px`:`12px`)+` Source Sans 3`,r.lineWidth=1,!t||!t.length){r.fillStyle=`rgba(241,234,217,0.6)`,r.textAlign=`center`,r.fillText(`Nessun movimento da mostrare`,o/2,s/2);return}let u=t.flatMap(e=>[e.income,e.expense,Math.abs(e.net)]),d=Math.max(1,...u)*1.15,f=o-l.l-l.r,p=s-l.t-l.b,m=s-l.b;r.strokeStyle=`rgba(241,234,217,0.12)`,r.fillStyle=`rgba(241,234,217,0.55)`;for(let e=0;e<4;e++){let t=l.t+p*e/3;r.beginPath(),r.moveTo(l.l,t),r.lineTo(o-l.r,t),r.stroke()}let h=f/Math.max(1,t.length),g=Math.max(c?7:8,Math.min(c?15:18,h*.22)),_=Math.ceil(c?t.length/3:t.length/6);t.forEach((e,n)=>{let i=l.l+n*h+h*.28,a=e.income/d*p,o=e.expense/d*p;r.fillStyle=`#7ea487`,r.fillRect(i,m-a,g,a),r.fillStyle=`#e2725b`,r.fillRect(i+g+4,m-o,g,o),(n===0||n===t.length-1||n%_===0)&&(r.save(),r.fillStyle=`rgba(241,234,217,0.62)`,r.textAlign=c?`right`:`center`,c?(r.translate(i+g,s-12),r.rotate(-Math.PI/5),r.fillText(e.shortLabel||e.label,0,0)):r.fillText(e.shortLabel||e.label,i+g,s-10),r.restore())}),r.beginPath(),r.strokeStyle=`#d6a23c`,r.lineWidth=2,t.forEach((e,t)=>{let n=l.l+t*h+h*.5,i=m-(e.net+d/2)/d*p;t===0?r.moveTo(n,i):r.lineTo(n,i)}),r.stroke();let v=l.l;function y(e,t){r.fillStyle=t,r.fillRect(v,8,10,10),r.fillStyle=`rgba(241,234,217,0.75)`,r.textAlign=`left`,r.fillText(e,v+15,16),v+=c?78:90}y(`Entrate`,`#7ea487`),y(`Uscite`,`#e2725b`),y(`Netto`,`#d6a23c`)}function nt(){let e={};y.transactions.filter(e=>!g(e)).forEach(t=>{let n=t.payee.toLowerCase()+`|`+t.account;(e[n]=e[n]||[]).push(t)});let t=[];return Object.values(e).forEach(e=>{if(e.length<2)return;e.sort((e,t)=>new Date(e.date)-new Date(t.date));let n=e.map(e=>e.amount),r=n.reduce((e,t)=>e+t,0)/n.length;if(!n.every(e=>Math.abs(e-r)<Math.max(2,r*.08)))return;let i=!0;for(let t=1;t<e.length;t++){let n=(new Date(e[t].date)-new Date(e[t-1].date))/864e5;!(n>=20&&n<=40)&&!(n>=5&&n<=9)&&(i=!1)}if(i){let n=e[e.length-1],i=(new Date(e[1].date)-new Date(e[0].date))/864e5<15?`Settimanale`:`Mensile`;t.push({payee:n.payee,category:n.category,amount:r,freq:i,type:n.type,count:e.length})}}),t.sort((e,t)=>t.amount-e.amount)}var rt=[{pct:100,cls:`danger`,label:`100% — budget esaurito`},{pct:90,cls:`danger`,label:`90%`},{pct:75,cls:`warn`,label:`75%`},{pct:50,cls:`warn`,label:`50%`}];function it(e,t){let n=I(ze(e,t)),r=[];return C().forEach(i=>{let a=y.budgets[i]||0;if(a<=0)return;let o=n[i]||0,s=o/a*100;for(let n of rt)if(s>=n.pct){let s=`${i}-${n.pct}-${e}-${t}`;y.alertsDismissed[s]||r.push({key:s,cat:i,pct:n.pct,cls:n.cls,label:n.label,spent:o,budget:a});break}}),r}function at(e){y.alertsDismissed[e]=!0,N(),J()}function ot(e,t){let n=it(e,t);return n.length?`<div style="margin-bottom:20px">${n.map(e=>`
    <div class="alert-banner ${e.cls}">
      <div class="aicon">${e.pct>=100?`🚨`:e.pct>=90?`⚠️`:`💛`}</div>
      <div class="abody">
        <div class="atitle">${x(e.cat)} ${e.cat} — ${e.label} del budget</div>
        <div class="adesc">${s(e.spent)} spesi su ${s(e.budget)} di budget mensile</div>
      </div>
      <button class="icon-btn" data-dismiss="${e.key}" style="border:none;opacity:.7;font-size:15px">✕</button>
    </div>
  `).join(``)}</div>`:``}var H=`dashboard`,U=new Date().getMonth(),W=new Date().getFullYear(),G=new Set,K=``,q=``;function st(e){H=e,G=new Set,document.querySelectorAll(`.navbtn`).forEach(t=>t.classList.toggle(`active`,t.dataset.page===e)),J(),document.getElementById(`sidebar`).classList.remove(`open`)}document.querySelectorAll(`.navbtn`).forEach(e=>e.addEventListener(`click`,()=>st(e.dataset.page))),document.getElementById(`menuToggle`).addEventListener(`click`,()=>document.getElementById(`sidebar`).classList.toggle(`open`));function ct(e,t=!1){let n=y.accounts.find(t=>t.id===e.account),r=t&&G.has(e.id);return`<div class="tx${r?` selected`:``}" data-txid="${e.id}">
    ${t?`<input type="checkbox" class="tx-check" data-chk="${e.id}" ${r?`checked`:``}>`:``}
    <div class="icon" style="background:${S(e.category)}22">${x(e.category)}</div>
    <div class="body"><div class="payee">${l(e.payee)} ${g(e)?`<span class="pill transfer">trasferimento</span>`:``} ${e.recurring?`<span class="pill rec">ricorrente</span>`:``}</div><div class="meta">${e.category} · ${n?n.name:`—`}${e.transferTo?` → `+(y.accounts.find(t=>t.id===e.transferTo)?.name||`—`):``} · ${c(e.date)}</div></div>
    <div class="amount ${e.type===`out`?`out`:`in`} num">${e.type===`out`?`-`:`+`}${s(e.amount)}</div>
    ${t?`<button class="icon-btn" data-edittx="${e.id}" title="Modifica">✏️</button>`:`<button class="icon-btn" data-edittx="${e.id}" title="Modifica">✏️</button><button class="del" data-del="${e.id}" title="Elimina">✕</button>`}
  </div>`}function lt(e,t=!1){let n=I(e),r=C().filter(e=>e!==`Stipendio`&&!ee(e)).map(e=>{let t=n[e]||0,r=y.budgets[e]||0,i=r>0?t/r*100:0,a=r>0?Math.min(100,i):0,o=Math.max(0,r-t),s=r>0&&t>r,c=s||a>=90?`var(--coral)`:a>=75?`var(--amber)`:a>=50?`var(--gold)`:`var(--sage)`,l=``;return r>0&&(i>=100?l=`<span class="budget-badge b100">🚨 ${i.toFixed(0)}%</span>`:i>=90?l=`<span class="budget-badge b90">⚠️ ${i.toFixed(0)}%</span>`:i>=75?l=`<span class="budget-badge b75">💛 ${i.toFixed(0)}%</span>`:i>=50&&(l=`<span class="budget-badge b50">${i.toFixed(0)}%</span>`)),{cat:e,spent:t,budget:r,pct:a,pctRaw:i,remaining:o,over:s,barColor:c,badge:l}}).filter(e=>e.budget>0||e.spent>0).sort((e,t)=>(t.pctRaw||0)===(e.pctRaw||0)?t.spent-e.spent:(t.pctRaw||0)-(e.pctRaw||0));return r.length?r.map(e=>`
    <div class="catbar-row budget-summary-row">
      <div class="catbar-top">
        <div class="nm">${x(e.cat)} ${e.cat}${e.badge}</div>
        <div class="amt num"><span style="color:${e.over?`var(--coral)`:`var(--cream)`}">${s(e.spent)}</span> / ${s(e.budget)}</div>
      </div>
      <div class="catbar-track"><div class="catbar-fill" style="width:${e.pct}%;background:${e.barColor}"></div></div>
      <div class="budget-row-foot">${e.over?`Fuori budget di <span class="num" style="color:var(--coral)">${s(e.spent-e.budget)}</span>`:`Residuo <span class="num">${s(e.remaining)}</span>`}</div>
    </div>`).join(``):`<div class="empty">Imposta i budget per vedere il riepilogo qui.</div>`}function ut(){let e=k(),t=se(e.bounds),n=Ve(),r=B(t,n),i=r.filter(e=>e.type===`in`&&!g(e)).reduce((e,t)=>e+t.amount,0),a=r.filter(L).reduce((e,t)=>e+t.amount,0),o=i-a,c=I(r),u=Object.entries(c).sort((e,t)=>t[1]-e[1]),d=u.length?u[0][1]:1,f=[...y.transactions].filter(e=>z(e,n)).sort((e,t)=>e.date<t.date?1:-1).slice(0,8);return`
  <div class="topbar"><h1>Dashboard</h1><div class="month-switch"><div class="label" title="Ciclo corrente basato sullo stipendio più recente">${O(e.bounds)}</div></div></div>
  ${ot(e.year,e.month)}
  <div class="card" style="margin-bottom:16px;">
    <h3>Vista dashboard</h3>
    <div class="filters-row" style="margin-bottom:0;align-items:center;">
      <select id="dashboardAccountSelect">
        <option value="all" ${n===`all`?`selected`:``}>Tutti i conti</option>
        ${y.accounts.map(e=>`<option value="${e.id}" ${n===e.id?`selected`:``}>${l(e.name)}</option>`).join(``)}
      </select>
      <button class="btn small ghost" id="toggleDashboardBalances">${He()?`🙈 Nascondi saldi`:`👁️ Mostra saldi`}</button>
      <span class="empty" style="padding:0;text-align:left">I valori sotto sono riferiti a: <b>${l(V(n))}</b></span>
    </div>
  </div>
  <div class="grid kpis">
    ${Ue(n)}
    <div class="card kpi"><div class="label">Entrate ciclo</div><div class="value num pos">${s(i)}</div><div class="delta">${l(V(n))}</div></div>
    <div class="card kpi"><div class="label">Uscite ciclo</div><div class="value num neg">${s(a)}</div><div class="delta">spese reali, esclusi trasferimenti</div></div>
    <div class="card kpi"><div class="label">Risparmio ciclo</div><div class="value num ${o>=0?`pos`:`neg`}">${s(o)}</div><div class="delta">entrate - uscite</div></div>
  </div>
  ${We()}
  <div class="card" style="margin-bottom:16px;">
    <h3>Andamento ciclo per ciclo — ${l(V(n))}</h3>
    <div class="chart-wrap"><canvas class="lib-chart" id="dashboardTrend"></canvas></div>
  </div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Riepilogo budget — ciclo corrente</h3>
    ${lt(r,!0)}
  </div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card">
      <h3>Spese per categoria</h3>
      ${u.length===0?`<div class="empty">Ancora nessuna spesa in questo ciclo per il conto selezionato.</div>`:u.map(([e,t])=>`
        <div class="catbar-row">
          <div class="catbar-top"><div class="nm">${x(e)} ${e}</div><div class="amt num">${s(t)}</div></div>
          <div class="catbar-track"><div class="catbar-fill" style="width:${(t/d*100).toFixed(0)}%;background:${S(e)}"></div></div>
        </div>`).join(``)}
    </div>
    <div class="card">
      <h3>Riepilogo spese ricorrenti</h3>
      ${$e(n)}
    </div>
  </div>
  <div class="card"><h3>Movimenti recenti — ${l(V(n))}</h3><div class="tx-list">${f.length===0?`<div class="empty">Nessun movimento. Premi + per iniziare.</div>`:f.map(e=>ct(e,!1)).join(``)}</div></div>`}function dt(){let e=k(),t=Ve(),n=Je(5,0,e.year,e.month,t).map(e=>{let[n,r]=e.key.split(`-`).map(Number),i=B(F(n,r-1),t),a=i.filter(e=>e.type===`in`&&!g(e)).reduce((e,t)=>e+t.amount,0),o=i.filter(L).reduce((e,t)=>e+t.amount,0),s=i.filter(g).reduce((e,t)=>e+t.amount,0);return{key:e.key,label:e.label,income:a,expense:o,net:a-o,transfers:s}}),r=n[n.length-1]||{income:0,expense:0,net:0},i=Ye(),a=Xe(),o=et(6),c=I(B(se(e.bounds),t)),u=Math.max(1,...Object.values(c));return`
  <div class="topbar"><h1>Analisi over time</h1><div class="month-switch"><div class="label" title="Ciclo corrente basato sullo stipendio più recente">${O(e.bounds)}</div></div></div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Ambito analisi</h3>
    <div class="filters-row" style="margin-bottom:0;align-items:center;">
      <select id="dashboardAccountSelect">
        <option value="all" ${t===`all`?`selected`:``}>Tutti i conti</option>
        ${y.accounts.map(e=>`<option value="${e.id}" ${t===e.id?`selected`:``}>${l(e.name)}</option>`).join(``)}
      </select>
      <span class="empty" style="padding:0;text-align:left">Analisi allineata al ciclo spese: <b>${O(e.bounds)}</b></span>
    </div>
  </div>
  <div class="mini-grid">
    <div class="mini-kpi"><div class="mlabel">Bilancio ciclo corrente</div><div class="mvalue num ${r.net>=0?`pos`:`neg`}">${s(r.net)}</div></div>
    <div class="mini-kpi"><div class="mlabel">Spese fisse stimate / ciclo</div><div class="mvalue num neg">${s(a)}</div></div>
    <div class="mini-kpi"><div class="mlabel">Saldo previsto tra 6 cicli</div><div class="mvalue num ${o.at(-1)?.balance>=0?`pos`:`neg`}">${s(o.at(-1)?.balance||0)}</div></div>
  </div>
  <div class="card" style="margin-bottom:16px;"><h3>Entrate, uscite e bilancio netto — ciclo per ciclo</h3><div class="chart-wrap"><canvas class="lib-chart" id="analyticsTrend"></canvas></div></div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card"><h3>Dettaglio per categoria — ${O(e.bounds)}</h3>
      ${Object.keys(c).length===0?`<div class="empty">Nessuna uscita reale nel ciclo corrente per il conto selezionato.</div>`:Object.entries(c).sort((e,t)=>t[1]-e[1]).map(([e,t])=>`
        <div class="catbar-row"><div class="catbar-top"><div class="nm">${x(e)} ${e}</div><div class="amt num">${s(t)}</div></div><div class="catbar-track"><div class="catbar-fill" style="width:${(t/u*100).toFixed(0)}%;background:${S(e)}"></div></div></div>`).join(``)}
    </div>
    <div class="card"><h3>Spese fisse e ricorrenti</h3>
      ${i.length===0?`<div class="empty">Marca le uscite ricorrenti o inserisci più cicli di dati per rilevarle.</div>`:i.map(e=>`
        <div class="rec-item"><div><div class="nm">${x(e.category)} ${l(e.payee)}</div><div class="freq">${e.freq} · ${e.source}</div></div><div class="num" style="color:var(--coral)">-${s(e.amount)}</div></div>`).join(``)}
    </div>
  </div>
  <div class="card"><h3>Proiezione cashflow futuro</h3>
    <table class="analysis-table"><thead><tr><th>Ciclo</th><th>Entrate stimate</th><th>Spese fisse</th><th>Netto stimato</th><th>Saldo totale previsto</th></tr></thead><tbody>
      ${o.map(e=>`<tr><td>${e.label}</td><td class="num" style="color:var(--sage)">${s(e.income)}</td><td class="num" style="color:var(--coral)">${s(e.fixed)}</td><td class="num ${e.net>=0?`pos`:`neg`}">${s(e.net)}</td><td class="num">${s(e.balance)}</td></tr>`).join(``)}
    </tbody></table>
    <div class="empty" style="text-align:left;padding-bottom:0">La proiezione usa la media delle entrate degli ultimi cicli e le spese ricorrenti/manuali. I trasferimenti tra conti non vengono trattati come spese reali.</div>
  </div>`}function ft(){let e=[...y.transactions];if(K&&(e=e.filter(e=>e.category===K)),q){let[t,n]=q.split(`-`).map(Number);e=e.filter(e=>ce(e.date)===q)}return e.sort((e,t)=>e.date<t.date?1:-1),e}function pt(){let e=new Set;return y.transactions.forEach(t=>e.add(ce(t.date))),e.add(`${W}-${String(U+1).padStart(2,`0`)}`),[...e].sort().reverse()}function mt(){let e=ft(),t=G.size,n=pt();return`
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
      ${C().map(e=>`<option value="${e}" ${K===e?`selected`:``}>${x(e)} ${e}</option>`).join(``)}
    </select>
    <select id="filterMonth">
      <option value="">Tutti i mesi</option>
      ${n.map(e=>`<option value="${e}" ${q===e?`selected`:``}>${Ge(e)}</option>`).join(``)}
    </select>
    <button class="btn small ghost" id="selectAllBtn">${t===e.length&&e.length>0?`Deseleziona tutti`:`Seleziona tutti`}</button>
    ${t>0?`<button class="btn small danger" id="delSelBtn">🗑 Elimina selezionati (${t})</button>`:``}
  </div>
  ${t>0?`<div class="bulk-bar"><span class="cnt">✓ ${t} selezionat${t===1?`o`:`i`}</span></div>`:``}
  <div class="card">
    <div class="tx-list">
      ${e.length===0?`<div class="empty">Nessun movimento${K||q?` per i filtri selezionati`:``}.</div>`:e.map(e=>ct(e,!0)).join(``)}
    </div>
  </div>`}function ht(){let e=k(),t=I(se(e.bounds));return`
  <div class="topbar"><h1>Budget</h1><div class="month-switch"><div class="label" title="Ciclo corrente basato sullo stipendio più recente">${O(e.bounds)}</div></div></div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Ciclo budget dinamico</h3>
    <div class="empty" style="text-align:left;padding:0;">Il budget viene calcolato automaticamente dalla data dello <strong>Stipendio più recente registrato</strong> fino al giorno prima dello stipendio successivo. Ciclo corrente: <strong>${O(e.bounds)}</strong>. Se non esiste ancora nessuno stipendio registrato, l'app usa temporaneamente il mese selezionato.</div>
  </div>
  ${ot(e.year,e.month)}
  <div class="card budget-table">
    ${C().filter(e=>e!==`Stipendio`).map(e=>{let n=t[e]||0,r=y.budgets[e]||0,i=r>0?Math.min(100,n/r*100):0,a=r>0&&n>r,o=a||i>=90?`var(--coral)`:i>=75?`var(--amber)`:i>=50?`var(--gold)`:`var(--sage)`,c=``;return r>0&&(i>=100?c=`<span class="budget-badge b100">🚨 100%</span>`:i>=90?c=`<span class="budget-badge b90">⚠️ ${i.toFixed(0)}%</span>`:i>=75?c=`<span class="budget-badge b75">💛 ${i.toFixed(0)}%</span>`:i>=50&&(c=`<span class="budget-badge b50">💛 ${i.toFixed(0)}%</span>`)),`<div class="cat-row">
        <div class="cat-info"><span>${x(e)}</span> ${e}${c}</div>
        <div class="bar-area"><div class="catbar-track"><div class="catbar-fill" style="width:${i}%;background:${o}"></div></div></div>
        <div class="nums"><span style="color:${a?`var(--coral)`:`var(--cream)`}">${s(n)}</span> / <input class="budget-input" data-budget="${e}" type="number" min="0" step="10" value="${r}"></div>
      </div>`}).join(``)}
  </div>`}function gt(){return`
  <div class="topbar"><h1>Obiettivi di risparmio</h1><button class="btn small" id="addGoalBtn">+ Nuovo obiettivo</button></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">
    ${y.goals.map(e=>{let t=y.accounts.find(t=>t.id===e.account),n=t?R(t.id):0,r=e.target>0?Math.min(100,n/e.target*100):0;return`<div class="card goal-card">
        <div class="goal-top"><div class="goal-name">🏺 ${l(e.name)}</div><div class="goal-pct">${r.toFixed(0)}%</div></div>
        <div class="goal-track"><div class="goal-fill" style="width:${r}%"></div></div>
        <div class="goal-sub num">${s(n)} su ${s(e.target)} · ${t?t.name:`—`}</div>
        <div class="goal-actions"><button class="btn small ghost" data-editgoal="${e.id}">✏️ Modifica</button><button class="btn small danger" data-delgoal="${e.id}">Elimina</button></div>
      </div>`}).join(``)}
  </div>`}function _t(){return`
  <div class="topbar"><h1>Conti</h1><button class="btn small" id="addAcctBtn">+ Nuovo conto</button></div>
  <div class="grid" style="gap:12px;">
    ${y.accounts.map((e,n)=>`
      <div class="card acct-card">
        <div class="l"><div class="acct-dot" style="background:${t[n%t.length]}"></div>
        <div><div class="acct-name">${l(e.name)}</div><div class="acct-sub">Saldo iniziale: <span class="num">${s(parseFloat(e.initialBalance)||0)}</span></div></div></div>
        <div style="text-align:right"><div class="acct-bal">${s(R(e.id))}</div><button class="icon-btn" data-editacct="${e.id}" style="margin-top:8px">✏️ Modifica saldo iniziale</button></div>
      </div>`).join(``)}
  </div>`}function vt(){return`
  <div class="topbar"><h1>Categorie</h1><button class="btn small" id="addCatBtn">+ Nuova categoria</button></div>
  <div class="card">
    <div id="catList">
      ${y.categories.map((e,t)=>`
        <div class="cat-mgmt-row">
          <div class="cat-badge" style="background:${e.color}22">${e.icon}</div>
          <div class="cat-detail">
            <div class="cn">${l(e.name)}</div>
            <div class="cs" style="color:${e.color}">${e.color}</div>
          </div>
          <div class="cat-mgmt-actions">
            <button class="icon-btn" data-editcat="${t}">✏️ Modifica</button>
            <button class="icon-btn red" data-delcat="${t}">✕</button>
          </div>
        </div>`).join(``)}
    </div>
  </div>`}function yt(){return j.user,`<span class="cloud-dot ${Ce()}"></span><span>${l(Se())}</span>`}function bt(){return`<div class="sync-grid">
    <div class="sync-pill">Stato<b>${j.syncing?`In corso`:j.pending?`Da sincronizzare`:j.lastError?`Errore`:j.user?`Sincronizzato`:`Locale`}</b></div>
    <div class="sync-pill">Ultimo sync<b>${h(j.lastSync)}</b></div>
    <div class="sync-pill">Ultima modifica<b>${h(be())}</b></div>
  </div>
  ${j.lastError?`<div class="alert-banner danger"><div class="aicon">⚠️</div><div class="abody"><div class="atitle">Errore sincronizzazione</div><div class="adesc">${l(j.lastError)}</div></div></div>`:``}`}function xt(){let e=!!j.user;return`
  <div class="topbar"><h1>Utenti / Cloud</h1></div>
  <div class="cloud-status" id="cloudLiveStatus">${yt()}</div>
  <div class="grid row2" style="margin-bottom:16px;">
    <div class="card">
      <h3>Accesso utente</h3>
      ${M()?``:`<div class="empty" style="text-align:left;padding-top:0">Configura Supabase qui sotto, poi potrai creare utenti e salvare i dati separatamente per ciascun account.</div>`}
      ${e?`
        <div class="empty" style="text-align:left;padding-top:0">Sei collegato come <b>${l(j.user.email||j.user.id)}</b>. Ogni modifica viene salvata nel cloud del tuo utente e mantenuta anche in cache locale sul dispositivo.</div>
        ${bt()}<div class="modal-actions"><button class="btn" id="cloudSyncBtn">↻ Sincronizza ora</button><button class="btn ghost" id="cloudPullBtn">Scarica dal cloud</button><button class="btn ghost" id="cloudPushBtn">☁️ Forza upload</button><button class="btn danger" id="cloudLogoutBtn">Esci</button></div>
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
    <div class="code-block">${l(`-- LIBRETTO v18 - clean install Supabase
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

grant execute on function public.get_libretto_state() to authenticated;`)}</div>
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
  </div>`}function St(){return`
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
  </div>`}function J(){let e=document.getElementById(`main`);Ee();let t=document.getElementById(`fabAdd`);t&&(t.style.display=Te()?`none`:`flex`);try{if(Te()&&H!==`cloud`&&H!==`help`){e.innerHTML=De(),Oe();return}H===`dashboard`?e.innerHTML=ut():H===`transactions`?e.innerHTML=mt():H===`budget`?e.innerHTML=ht():H===`analytics`?e.innerHTML=dt():H===`goals`?e.innerHTML=gt():H===`accounts`?e.innerHTML=_t():H===`categories`?e.innerHTML=vt():H===`cloud`?e.innerHTML=xt():H===`help`&&(e.innerHTML=St()),Nt()}catch(t){console.error(`Errore rendering Libretto`,t),e.innerHTML=`<div class="topbar"><h1>Ops, qualcosa non torna</h1></div><div class="card"><h3>Errore temporaneo</h3><div class="empty" style="text-align:left">Ho intercettato un problema nel rendering della pagina. Prova a esportare un backup dalla sezione Conti/Backup se disponibile, oppure ricarica la pagina. Dettaglio tecnico: ${l(t.message||String(t))}</div></div>`}}var Ct=[`date`,`type`,`amount`,`payee`,`account`,`category`,`movementType`,`transferTo`,`goal`,`recurring`,`recurringFreq`,`recurringNextDate`];function wt(e){let t=String(e??``);return/[";,\n\r]/.test(t)?`"`+t.replace(/"/g,`""`)+`"`:t}function Tt(){let e=[Ct,[a(),`out`,`12.50`,`Esselunga`,`Conto corrente`,`Spesa`,`standard`,``,``,`no`,``,``],[a(),`in`,`1850.00`,`Stipendio`,`Conto corrente`,`Stipendio`,`standard`,``,``,`no`,``,``],[a(),`out`,`300.00`,`Giroconto risparmio`,`Conto corrente`,`Risparmi`,`transfer`,`Conto Arancio`,`Risparmi liquidi`,`no`,``,``],[a(),`out`,`9.99`,`Spotify`,`Conto corrente`,`Abbonamenti`,`standard`,``,``,`yes`,`Mensile`,o(a(),30)]].map(e=>e.map(wt).join(`;`)).join(`
`),t=new Blob([e],{type:`text/csv;charset=utf-8`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.href=n,r.download=`libretto-template-movimenti.csv`,document.body.appendChild(r),r.click(),r.remove(),URL.revokeObjectURL(n),Y(`Template CSV scaricato`)}function Et(e){e=String(e||``).replace(/^\ufeff/,``);let t=e.split(/\r?\n/).find(e=>e.trim())||``,n=[`;`,`,`,`	`],r=`;`,i=-1;for(let e of n){let n=(t.match(new RegExp(e===`	`?`\\t`:e.replace(/[.*+?^${}()|[\]\\]/g,`\\$&`),`g`))||[]).length;n>i&&(i=n,r=e)}let a=[],o=[],s=``,c=!1;for(let t=0;t<e.length;t++){let n=e[t],i=e[t+1];n===`"`?c&&i===`"`?(s+=`"`,t++):c=!c:n===r&&!c?(o.push(s),s=``):(n===`
`||n===`\r`)&&!c?(n===`\r`&&i===`
`&&t++,o.push(s),o.some(e=>String(e).trim()!==``)&&a.push(o),o=[],s=``):s+=n}if(o.push(s),o.some(e=>String(e).trim()!==``)&&a.push(o),!a.length)return[];let l=a[0].map(e=>String(e||``).trim());return a.slice(1).map((e,t)=>{let n={_row:t+2};return l.forEach((t,r)=>n[t]=String(e[r]||``).trim()),n})}function Dt(e){if(!e)return``;let t=String(e).trim().toLowerCase(),n=y.accounts.find(e=>String(e.id).toLowerCase()===t);if(n)return n.id;let r=y.accounts.find(e=>String(e.name||``).trim().toLowerCase()===t);return r?r.id:``}function Ot(e){if(!e)return null;let t=String(e).trim().toLowerCase(),n=y.goals.find(e=>String(e.id).toLowerCase()===t);if(n)return n.id;let r=y.goals.find(e=>String(e.name||``).trim().toLowerCase()===t);return r?r.id:null}function kt(e){return[`si`,`sì`,`yes`,`true`,`1`,`y`].includes(String(e||``).trim().toLowerCase())}function At(e){let t=[],n=(e.date||e.data||``).slice(0,10);/^\d{4}-\d{2}-\d{2}$/.test(n)||t.push(`data non valida: usa YYYY-MM-DD`);let r=String(e.type||e.tipo||`out`).toLowerCase();[`in`,`out`].includes(r)||t.push(`type deve essere in oppure out`);let a=parseFloat(String(e.amount||e.importo||``).replace(`,`,`.`));(!a||a<=0)&&t.push(`importo non valido`);let o=Dt(e.account||e.conto||e.accountId);o||t.push(`conto origine non trovato`);let s=e.category||e.categoria||`Altro`,c=y.categories.find(e=>String(e.name).toLowerCase()===String(s).toLowerCase());c?s=c.name:t.push(`categoria non trovata`);let l=String(e.movementType||e.tipoMovimento||`standard`).toLowerCase()===`transfer`?`transfer`:`standard`,u=l===`transfer`?Dt(e.transferTo||e.contoDestinazione||e.toAccount):null;l===`transfer`&&!u&&t.push(`conto destinazione non trovato`),l===`transfer`&&u===o&&t.push(`origine e destinazione devono essere diversi`);let d=kt(e.recurring||e.ricorrente),f=e.recurringFreq||e.frequenza||`Mensile`,p=(e.recurringNextDate||e.prossimaData||``).slice(0,10)||null;return{tx:{id:i(),date:n,account:o,category:s,payee:e.payee||e.descrizione||e.esercente||(l===`transfer`?`Trasferimento`:r===`in`?`Entrata`:`Spesa`),amount:a,type:r,movementType:l,transferTo:u,goalId:Ot(e.goal||e.obiettivo),recurring:d&&l!==`transfer`,recurringFreq:d?f:null,recurringNextDate:d?p:null},errors:t,row:e._row}}function jt(e){let t=Et(e).map(At),n=t.filter(e=>!e.errors.length),r=t.filter(e=>e.errors.length);document.getElementById(`modalRoot`).innerHTML=`
  <div class="modal-bg" id="bulkBg"><div class="modal" style="max-width:860px;">
    <button class="close-x" id="bulkClose">✕</button>
    <h3>Import movimenti CSV</h3>
    <div class="mini-grid"><div class="mini-kpi"><div class="mlabel">Righe valide</div><div class="mvalue">${n.length}</div></div><div class="mini-kpi"><div class="mlabel">Righe da correggere</div><div class="mvalue ${r.length?`neg`:``}">${r.length}</div></div><div class="mini-kpi"><div class="mlabel">Totale file</div><div class="mvalue">${t.length}</div></div></div>
    <div class="empty" style="text-align:left;padding:0 0 10px;">Formato accettato: CSV da Excel con colonne <span class="num">${Ct.join(`, `)}</span>. Le colonne principali sono: date, type, amount, payee, account, category.</div>
    ${r.length?`<div class="alert-banner danger"><div class="aicon">⚠️</div><div class="abody"><div class="atitle">Alcune righe non verranno importate</div><div class="adesc">Correggi il CSV e riprova, oppure importa solo le righe valide.</div></div></div>`:``}
    <div class="import-preview"><table><thead><tr><th>Riga</th><th>Data</th><th>Tipo</th><th>Importo</th><th>Descrizione</th><th>Conto</th><th>Categoria</th><th>Note</th></tr></thead><tbody>
      ${t.slice(0,80).map(e=>`<tr><td>${e.row}</td><td>${l(e.tx.date)}</td><td>${l(e.tx.type)}</td><td class="num">${isFinite(e.tx.amount)?s(e.tx.amount):`—`}</td><td>${l(e.tx.payee)}</td><td>${l(y.accounts.find(t=>t.id===e.tx.account)?.name||`—`)}</td><td>${l(e.tx.category||`—`)}</td><td>${e.errors.length?`<div class="import-error">${l(e.errors.join(` · `))}</div>`:`OK`}</td></tr>`).join(``)}
    </tbody></table></div>
    <div class="modal-actions"><button class="btn ghost" id="bulkCancel">Annulla</button><button class="btn" id="bulkImportOk" ${n.length?``:`disabled`}>Importa ${n.length} movimenti validi</button></div>
  </div></div>`,document.getElementById(`bulkBg`).addEventListener(`click`,e=>{e.target.id===`bulkBg`&&X()}),document.getElementById(`bulkClose`).addEventListener(`click`,X),document.getElementById(`bulkCancel`).addEventListener(`click`,X),document.getElementById(`bulkImportOk`).addEventListener(`click`,()=>{y.transactions.push(...n.map(e=>e.tx)),y.transactions.sort((e,t)=>e.date<t.date?1:-1),N(),X(),J(),Y(`${n.length} movimenti importati`)})}function Mt(e){if(!e)return;let t=new FileReader;t.onload=()=>jt(t.result),t.readAsText(e)}function Nt(){let e=document.getElementById(`prevMonth`),t=document.getElementById(`nextMonth`);e&&e.addEventListener(`click`,()=>{let e=le(!0),t=`${W}-${String(U+1).padStart(2,`0`)}`,n=e.indexOf(t),[r,i]=(n>0?e[n-1]:_(v(new Date(W,U,1),-1))).split(`-`).map(Number);W=r,U=i-1,J()}),t&&t.addEventListener(`click`,()=>{let e=le(!0),t=`${W}-${String(U+1).padStart(2,`0`)}`,n=e.indexOf(t),[r,i]=(n>=0&&n<e.length-1?e[n+1]:_(v(new Date(W,U,1),1))).split(`-`).map(Number);W=r,U=i-1,J()}),document.querySelectorAll(`[data-dismiss]`).forEach(e=>e.addEventListener(`click`,()=>at(e.dataset.dismiss)));let n=document.getElementById(`dashboardAccountSelect`);n&&n.addEventListener(`change`,()=>{y.settings.dashboardAccountId=n.value,N(),J()});let r=document.getElementById(`toggleDashboardBalances`);if(r&&r.addEventListener(`click`,()=>{y.settings.dashboardShowBalances=!He(),N(),J()}),document.getElementById(`dashboardTrend`)){let e=k(),t=Ve();tt(`dashboardTrend`,Je(5,0,e.year,e.month,t).map(e=>{let[n,r]=e.key.split(`-`).map(Number),i=B(F(n,r-1),t),a=i.filter(e=>e.type===`in`&&!g(e)).reduce((e,t)=>e+t.amount,0),o=i.filter(L).reduce((e,t)=>e+t.amount,0);return Object.assign({},e,{income:a,expense:o,net:a-o})}))}if(document.getElementById(`analyticsTrend`)){let e=k(),t=Ve();tt(`analyticsTrend`,Je(5,0,e.year,e.month,t).map(e=>{let[n,r]=e.key.split(`-`).map(Number),i=B(F(n,r-1),t),a=i.filter(e=>e.type===`in`&&!g(e)).reduce((e,t)=>e+t.amount,0),o=i.filter(L).reduce((e,t)=>e+t.amount,0);return Object.assign({},e,{income:a,expense:o,net:a-o})}))}document.querySelectorAll(`[data-del]`).forEach(e=>e.addEventListener(`click`,()=>{let t=e.dataset.del;Ft([t]),J(),Y(`Movimento eliminato`)})),document.querySelectorAll(`[data-edittx]`).forEach(e=>e.addEventListener(`click`,()=>Rt(e.dataset.edittx))),document.querySelectorAll(`[data-budget]`).forEach(e=>e.addEventListener(`change`,()=>{y.budgets[e.dataset.budget]=parseFloat(e.value)||0,N(),J()}));let i=document.getElementById(`saveCloudConfigBtn`);i&&i.addEventListener(`click`,async()=>{let e=(document.getElementById(`supabaseUrl`).value||``).trim();e=e.replace(/\/rest\/v1\/?$/,``).replace(/\/auth\/v1\/?$/,``).replace(/\/$/,``);let t=(document.getElementById(`supabaseAnon`).value||``).trim();if(!e||!t){Y(`Inserisci URL e anon key Supabase`);return}localStorage.setItem(me,JSON.stringify({url:e,anonKey:t})),await ke(),J(),Y(`Cloud configurato`)});let a=document.getElementById(`clearCloudConfigBtn`);a&&a.addEventListener(`click`,async()=>{if(j.client)try{await j.client.auth.signOut()}catch{}localStorage.removeItem(me),j={client:null,user:null,ready:!1,loading:!1},J(),Y(`Configurazione cloud rimossa`)});let o=document.getElementById(`cloudLoginBtn`);o&&o.addEventListener(`click`,async()=>Pt(`login`));let s=document.getElementById(`cloudSignupBtn`);s&&s.addEventListener(`click`,async()=>Pt(`signup`));let c=document.getElementById(`cloudLogoutBtn`);c&&c.addEventListener(`click`,async()=>{j.client&&await j.client.auth.signOut(),j.user=null,J(),Y(`Logout effettuato`)});let u=document.getElementById(`cloudSyncBtn`);u&&u.addEventListener(`click`,async()=>{let e=await je();J(),Y(e?`Sincronizzazione completata`:`Sincronizzazione non riuscita`)});let d=document.getElementById(`cloudPullBtn`);d&&d.addEventListener(`click`,async()=>{let e=await Ae({force:!0});J(),Y(e?`Dati scaricati dal cloud`:`Download cloud non riuscito`)});let f=document.getElementById(`cloudPushBtn`);f&&f.addEventListener(`click`,async()=>{let e=await Ie();J(),Y(e?`Dati salvati nel cloud`:`Salvataggio cloud non riuscito`)});let p=document.getElementById(`cloudHardReloadBtn`);p&&p.addEventListener(`click`,()=>{location.href=location.pathname+`?v=22&refresh=`+Date.now()});let m=document.getElementById(`copySqlBtn`);m&&m.addEventListener(`click`,()=>{let e=document.querySelector(`.code-block`)?.textContent||``;navigator.clipboard.writeText(e).then(()=>Y(`SQL copiato`))});let h=document.getElementById(`openChatGPTBtn`);h&&h.addEventListener(`click`,()=>Gt(`https://chatgpt.com/`,`ChatGPT`));let b=document.getElementById(`openClaudeBtn`);b&&b.addEventListener(`click`,()=>Gt(`https://claude.ai/new`,`Claude`));let x=document.getElementById(`copyUpdatePromptBtn`);x&&x.addEventListener(`click`,qt);let S=document.getElementById(`exportHtmlBtn`);S&&S.addEventListener(`click`,Kt);let C=document.getElementById(`filterCat`),ee=document.getElementById(`filterMonth`);C&&C.addEventListener(`change`,()=>{K=C.value,G=new Set,J()}),ee&&ee.addEventListener(`change`,()=>{q=ee.value,G=new Set,J()});let te=document.getElementById(`selectAllBtn`);te&&te.addEventListener(`click`,()=>{let e=ft();G.size===e.length?G=new Set:e.forEach(e=>G.add(e.id)),J()}),document.querySelectorAll(`[data-chk]`).forEach(e=>e.addEventListener(`change`,()=>{e.checked?G.add(e.dataset.chk):G.delete(e.dataset.chk),J()}));let w=document.getElementById(`delSelBtn`);w&&w.addEventListener(`click`,()=>{let e=[...G];Z(`Eliminare ${e.length} moviment${e.length===1?`o`:`i`}?`,`L'operazione non è reversibile.`,()=>{Ft(e),G=new Set,J(),Y(`${e.length} moviment${e.length===1?`o`:`i`} eliminat${e.length===1?`o`:`i`}`)})});let T=document.getElementById(`delAllBtn`);T&&T.addEventListener(`click`,()=>{let e=ft();if(!e.length){Y(`Nessun movimento da eliminare`);return}Z(`Eliminare ${K||q?`i movimenti filtrati`:`tutti i movimenti`}?`,`Verranno rimossi ${e.length} movimenti. L'operazione non è reversibile.`,()=>{Ft(e.map(e=>e.id)),G=new Set,J(),Y(`${e.length} movimenti eliminati`)})});let ne=document.getElementById(`downloadTxTemplateBtn`);ne&&ne.addEventListener(`click`,Tt);let re=document.getElementById(`bulkImportTxBtn`),E=document.getElementById(`bulkImportTxFile`);re&&E&&re.addEventListener(`click`,()=>E.click()),E&&E.addEventListener(`change`,()=>{Mt(E.files[0]),E.value=``});let ie=document.getElementById(`addCatBtn`);ie&&ie.addEventListener(`click`,()=>zt(null)),document.querySelectorAll(`[data-editcat]`).forEach(e=>e.addEventListener(`click`,()=>zt(parseInt(e.dataset.editcat)))),document.querySelectorAll(`[data-delcat]`).forEach(e=>e.addEventListener(`click`,()=>{let t=parseInt(e.dataset.delcat),n=y.categories[t];y.transactions.some(e=>e.category===n.name)?Z(`Eliminare "${n.name}"?`,`Questa categoria è usata da alcuni movimenti. I movimenti esistenti conserveranno il nome della categoria ma non sarà più gestibile.`,()=>{y.categories.splice(t,1),N(),J(),Y(`Categoria eliminata`)}):(y.categories.splice(t,1),N(),J(),Y(`Categoria eliminata`))}));let D=document.getElementById(`addGoalBtn`);D&&D.addEventListener(`click`,()=>Bt(null)),document.querySelectorAll(`[data-editgoal]`).forEach(e=>e.addEventListener(`click`,()=>Bt(e.dataset.editgoal))),document.querySelectorAll(`[data-delgoal]`).forEach(e=>e.addEventListener(`click`,()=>{let t=y.goals.find(t=>t.id===e.dataset.delgoal);t&&Z(`Eliminare obiettivo "${l(t.name)}"?`,`I movimenti già registrati resteranno invariati.`,()=>{y.goals=y.goals.filter(e=>e.id!==t.id),N(),J(),Y(`Obiettivo eliminato`)})}));let ae=document.getElementById(`addAcctBtn`);ae&&ae.addEventListener(`click`,()=>Vt(null)),document.querySelectorAll(`[data-editacct]`).forEach(e=>e.addEventListener(`click`,()=>Vt(e.dataset.editacct)))}async function Pt(e){if(!j.client){Y(`Prima salva la configurazione Supabase`);return}let t=(document.getElementById(`cloudEmail`)?.value||``).trim(),n=(document.getElementById(`cloudPassword`)?.value||``).trim();if(!t||!n){Y(`Inserisci email e password`);return}try{let r=e===`signup`?await j.client.auth.signUp({email:t,password:n,options:{emailRedirectTo:`https://fandore.github.io/Libretto/`}}):await j.client.auth.signInWithPassword({email:t,password:n});if(r.error)throw r.error;r.data&&r.data.session&&r.data.session.user?j.user=r.data.session.user:r.data&&r.data.user&&(j.user=r.data.user);let i=await j.client.auth.getUser();i&&i.data&&i.data.user&&(j.user=i.data.user),await Me(),await je(),H=`dashboard`,J(),Y(e===`signup`?`Account creato. Controlla eventuale email di conferma.`:`Accesso effettuato`)}catch(e){console.warn(e),Y(e.message||`Accesso non riuscito`)}}function Ft(e){y.transactions=y.transactions.filter(t=>!e.includes(t.id)),N()}function Y(e){let t=document.getElementById(`toastRoot`),n=document.createElement(`div`);n.className=`toast`,n.textContent=e,t.innerHTML=``,t.appendChild(n),setTimeout(()=>n.remove(),2400)}function X(){document.getElementById(`modalRoot`).innerHTML=``}function Z(e,t,n){document.getElementById(`modalRoot`).innerHTML=`
  <div class="modal-bg" id="confBg">
    <div class="modal confirm-modal">
      <button class="close-x" id="confClose">✕</button>
      <h3>${e}</h3>
      <p>${t}</p>
      <div class="modal-actions">
        <button class="btn ghost" id="confCancel">Annulla</button>
        <button class="btn danger" id="confOk">Conferma</button>
      </div>
    </div>
  </div>`,document.getElementById(`confBg`).addEventListener(`click`,e=>{e.target.id===`confBg`&&X()}),document.getElementById(`confClose`).addEventListener(`click`,X),document.getElementById(`confCancel`).addEventListener(`click`,X),document.getElementById(`confOk`).addEventListener(`click`,()=>{X(),n()})}var Q=`out`,It=C()[0];function Lt(){Rt(null)}function Rt(e=null){let t=e?y.transactions.find(t=>t.id===e):null;Q=t?t.type:`out`,It=t?t.category:C()[0];let n=!!(t&&t.recurring),r=!!(t&&g(t)),s=t?`Modifica movimento`:`Nuovo movimento`;document.getElementById(`modalRoot`).innerHTML=`
  <div class="modal-bg" id="modalBg">
    <div class="modal">
      <button class="close-x" id="closeModal">✕</button>
      <h3>${s}</h3>
      <div class="toggle-type">
        <button type="button" id="typeOut" class="${Q===`out`?`active `:``}out">− Uscita</button>
        <button type="button" id="typeIn" class="${Q===`in`?`active `:``}in">+ Entrata</button>
      </div>
      <div class="transfer-box">
        <label class="checkline"><input type="checkbox" id="fTransfer" ${r?`checked`:``}> Trasferimento tra conti / risparmio verso obiettivo</label>
        <div id="transferFields" style="display:${r?`block`:`none`};margin-top:12px;">
          <div class="field"><label>Conto destinazione</label><select id="fTransferTo">${y.accounts.map(e=>`<option value="${e.id}" ${t&&t.transferTo===e.id?`selected`:``}>${l(e.name)}</option>`).join(``)}</select></div>
          <div class="field"><label>Obiettivo associato opzionale</label><select id="fGoal"><option value="">Nessun obiettivo</option>${y.goals.map(e=>`<option value="${e.id}" ${t&&t.goalId===e.id?`selected`:``}>${l(e.name)}</option>`).join(``)}</select></div>
        </div>
      </div>
      <div class="frow">
        <div class="field"><label>Importo (€)</label><input type="number" id="fAmount" step="0.01" min="0" placeholder="0,00" value="${t?t.amount:``}" autofocus></div>
        <div class="field"><label>Data</label><input type="date" id="fDate" value="${t?t.date:a()}"></div>
      </div>
      <div class="field"><label>Descrizione / Esercente</label><input type="text" id="fPayee" value="${t?l(t.payee):``}" placeholder="es. Esselunga, Affitto, Netflix..."></div>
      <div class="field"><label>Conto origine</label><select id="fAccount">${y.accounts.map(e=>`<option value="${e.id}" ${t&&t.account===e.id?`selected`:``}>${l(e.name)}</option>`).join(``)}</select></div>
      <div class="field"><label>Categoria</label>
        <div class="cat-pick" id="catPick">${C().map(e=>`<div class="cat-chip ${e===It?`active`:``}" data-cat="${e}">${x(e)} ${e}</div>`).join(``)}</div>
      </div>
      <div class="recurrence-box">
        <label class="checkline"><input type="checkbox" id="fRecurring" ${n?`checked`:``}> Questa uscita è ricorrente / fissa</label>
        <div id="recFields" style="display:${n?`block`:`none`};margin-top:12px;">
          <div class="frow"><div class="field"><label>Frequenza</label><select id="fRecFreq"><option ${t&&t.recurringFreq===`Mensile`?`selected`:``}>Mensile</option><option ${t&&t.recurringFreq===`Settimanale`?`selected`:``}>Settimanale</option><option ${t&&t.recurringFreq===`Annuale`?`selected`:``}>Annuale</option></select></div><div class="field"><label>Prossima data</label><input type="date" id="fRecNext" value="${t&&t.recurringNextDate?t.recurringNextDate:o(a(),30)}"></div></div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="cancelAdd">Annulla</button>
        <button class="btn" id="saveAdd">${t?`Salva modifiche`:`Salva movimento`}</button>
      </div>
    </div>
  </div>`;function c(e){Q=e,document.getElementById(`typeOut`).classList.toggle(`active`,e===`out`),document.getElementById(`typeIn`).classList.toggle(`active`,e===`in`),e===`in`&&(r=!1,document.getElementById(`fTransfer`).checked=!1,document.getElementById(`transferFields`).style.display=`none`)}document.getElementById(`modalBg`).addEventListener(`click`,e=>{e.target.id===`modalBg`&&X()}),document.getElementById(`closeModal`).addEventListener(`click`,X),document.getElementById(`cancelAdd`).addEventListener(`click`,X),document.getElementById(`typeOut`).addEventListener(`click`,()=>c(`out`)),document.getElementById(`typeIn`).addEventListener(`click`,()=>c(`in`)),document.getElementById(`fRecurring`).addEventListener(`change`,e=>{n=e.target.checked,document.getElementById(`recFields`).style.display=n?`block`:`none`}),document.getElementById(`fTransfer`).addEventListener(`change`,e=>{if(r=e.target.checked,document.getElementById(`transferFields`).style.display=r?`block`:`none`,r){c(`out`);let e=[...document.querySelectorAll(`#catPick .cat-chip`)].find(e=>e.dataset.cat===`Risparmi`);e&&e.click()}}),document.querySelectorAll(`#catPick .cat-chip`).forEach(e=>e.addEventListener(`click`,()=>{It=e.dataset.cat,document.querySelectorAll(`#catPick .cat-chip`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`)})),document.getElementById(`saveAdd`).addEventListener(`click`,()=>{let e=parseFloat(document.getElementById(`fAmount`).value),o=document.getElementById(`fDate`).value||a(),s=document.getElementById(`fPayee`).value.trim()||(r?`Trasferimento`:Q===`out`?`Spesa`:`Entrata`),c=document.getElementById(`fAccount`).value,l=r?document.getElementById(`fTransferTo`).value:``;if(!e||e<=0){Y(`Inserisci un importo valido`);return}if(r&&l===c){Y(`Scegli un conto destinazione diverso`);return}let u={id:t?t.id:i(),date:o,account:c,category:It,payee:s,amount:e,type:Q,movementType:r?`transfer`:`standard`,transferTo:l||null,goalId:r&&document.getElementById(`fGoal`).value||null,recurring:n&&!r,recurringFreq:n?document.getElementById(`fRecFreq`).value:null,recurringNextDate:n?document.getElementById(`fRecNext`).value:null};t?Object.assign(t,u):y.transactions.push(u),N(),X(),J(),Y(t?`Movimento aggiornato`:r?`Trasferimento aggiunto`:`Movimento aggiunto`)})}function zt(e){let t=e==null?null:y.categories[e],i=t?t.icon:`🛒`,a=t?t.color:r[0];document.getElementById(`modalRoot`).innerHTML=`
  <div class="modal-bg" id="catModalBg">
    <div class="modal">
      <button class="close-x" id="closeCatModal">✕</button>
      <h3>${t?`Modifica categoria`:`Nuova categoria`}</h3>
      <div class="field"><label>Nome</label><input type="text" id="catName" value="${t?l(t.name):``}" placeholder="es. Regali, Animali..."></div>
      <div class="field"><label>Icona</label>
        <div class="emoji-grid" id="emojiGrid">${n.map(e=>`<button class="emoji-opt${e===i?` active`:``}" data-emoji="${e}" type="button">${e}</button>`).join(``)}</div>
      </div>
      <div class="field"><label>Colore</label>
        <div class="color-grid" id="colorGrid">${r.map(e=>`<div class="color-opt${e===a?` active`:``}" data-color="${e}" style="background:${e}"></div>`).join(``)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <div id="catPreview" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;background:${a}22">${i}</div>
        <span id="catPreviewName" style="font-size:15px;font-weight:500">${t?l(t.name):`Anteprima`}</span>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="cancelCat">Annulla</button>
        <button class="btn" id="saveCat">${t?`Salva modifiche`:`Crea categoria`}</button>
      </div>
    </div>
  </div>`;function o(){document.getElementById(`catPreview`).style.background=a+`22`,document.getElementById(`catPreview`).textContent=i}document.getElementById(`catModalBg`).addEventListener(`click`,e=>{e.target.id===`catModalBg`&&X()}),document.getElementById(`closeCatModal`).addEventListener(`click`,X),document.getElementById(`cancelCat`).addEventListener(`click`,X),document.getElementById(`catName`).addEventListener(`input`,()=>{document.getElementById(`catPreviewName`).textContent=document.getElementById(`catName`).value||`Anteprima`}),document.querySelectorAll(`#emojiGrid .emoji-opt`).forEach(e=>e.addEventListener(`click`,()=>{i=e.dataset.emoji,document.querySelectorAll(`#emojiGrid .emoji-opt`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),o()})),document.querySelectorAll(`#colorGrid .color-opt`).forEach(e=>e.addEventListener(`click`,()=>{a=e.dataset.color,document.querySelectorAll(`#colorGrid .color-opt`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),o()})),document.getElementById(`saveCat`).addEventListener(`click`,()=>{let t=document.getElementById(`catName`).value.trim();if(!t){Y(`Inserisci un nome`);return}if(y.categories.find((n,r)=>n.name===t&&r!==e)){Y(`Esiste già una categoria con questo nome`);return}if(e!=null){let n=y.categories[e].name;y.categories[e]={name:t,icon:i,color:a},y.transactions.forEach(e=>{e.category===n&&(e.category=t)}),y.budgets[n]!==void 0&&(y.budgets[t]=y.budgets[n],delete y.budgets[n])}else y.categories.push({name:t,icon:i,color:a});N(),X(),J(),Y(e==null?`Categoria creata`:`Categoria aggiornata`)})}function Bt(e=null){let t=e?y.goals.find(t=>t.id===e):null;document.getElementById(`modalRoot`).innerHTML=`
  <div class="modal-bg" id="goalBg">
    <div class="modal"><button class="close-x" id="closeGoal">✕</button><h3>${t?`Modifica obiettivo`:`Nuovo obiettivo di risparmio`}</h3>
      <div class="field"><label>Nome</label><input type="text" id="gName" value="${t?l(t.name):``}" placeholder="es. Fondo emergenza"></div>
      <div class="field"><label>Conto in cui lo deposito</label><select id="gAccount">${y.accounts.map(e=>`<option value="${e.id}" ${t&&t.account===e.id?`selected`:``}>${l(e.name)}</option>`).join(``)}</select></div>
      <div class="field"><label>Obiettivo (€)</label><input type="number" id="gTarget" min="0" step="50" value="${t?t.target:``}" placeholder="5000"></div>
      <div class="modal-actions"><button class="btn ghost" id="cancelGoal">Annulla</button><button class="btn" id="saveGoal">${t?`Salva modifiche`:`Crea obiettivo`}</button></div>
    </div>
  </div>`,document.getElementById(`goalBg`).addEventListener(`click`,e=>{e.target.id===`goalBg`&&X()}),document.getElementById(`closeGoal`).addEventListener(`click`,X),document.getElementById(`cancelGoal`).addEventListener(`click`,X),document.getElementById(`saveGoal`).addEventListener(`click`,()=>{let e=document.getElementById(`gName`).value.trim(),n=document.getElementById(`gAccount`).value,r=parseFloat(document.getElementById(`gTarget`).value);if(!e||!r||r<=0){Y(`Compila tutti i campi`);return}t?(t.name=e,t.account=n,t.target=r):y.goals.push({id:i(),name:e,account:n,target:r}),N(),X(),J(),Y(t?`Obiettivo aggiornato`:`Obiettivo creato`)})}function Vt(e=null){let t=e?y.accounts.find(t=>t.id===e):null;document.getElementById(`modalRoot`).innerHTML=`
  <div class="modal-bg" id="acctBg">
    <div class="modal"><button class="close-x" id="closeAcct">✕</button><h3>${t?`Modifica conto`:`Nuovo conto`}</h3>
      <div class="field"><label>Nome conto</label><input type="text" id="aName" value="${t?l(t.name):``}" placeholder="es. Conto risparmio"></div>
      <div class="field"><label>Saldo iniziale (€)</label><input type="number" id="aInitial" step="0.01" value="${t?t.initialBalance??0:``}" placeholder="0,00"></div>
      <div class="empty" style="text-align:left;padding-top:0">Il saldo attuale non si modifica manualmente: viene calcolato da saldo iniziale + entrate − uscite + trasferimenti.</div>
      ${t?`<div class="mini-kpi" style="margin-bottom:14px"><div class="mlabel">Saldo calcolato oggi</div><div class="mvalue num">${s(R(t.id))}</div></div>`:``}
      <div class="modal-actions"><button class="btn ghost" id="cancelAcct">Annulla</button><button class="btn" id="saveAcct">${t?`Salva conto`:`Crea conto`}</button></div>
    </div>
  </div>`,document.getElementById(`acctBg`).addEventListener(`click`,e=>{e.target.id===`acctBg`&&X()}),document.getElementById(`closeAcct`).addEventListener(`click`,X),document.getElementById(`cancelAcct`).addEventListener(`click`,X),document.getElementById(`saveAcct`).addEventListener(`click`,()=>{let e=document.getElementById(`aName`).value.trim(),n=parseFloat(document.getElementById(`aInitial`).value)||0;if(!e){Y(`Inserisci un nome`);return}t?(t.name=e,t.initialBalance=n):y.accounts.push({id:i(),name:e,initialBalance:n}),N(),X(),J(),Y(t?`Conto aggiornato`:`Conto creato`)})}function Ht(){return`<!doctype html>
`+document.documentElement.outerHTML}function Ut(e=!0){let t=`Sto sviluppando una single-file web app HTML/CSS/JS standalone chiamata Libretto.

Devi aiutarmi ad aggiornarla senza rompere le funzioni esistenti. Requisiti architetturali importanti:
- persistenza dati locale con localStorage e cloud Supabase multiutente preconfigurato;
- saldi dei conti calcolati solo da saldo iniziale + movimenti + trasferimenti;
- i singoli movimenti devono essere modificabili;
- supporto trasferimenti tra conti;
- ciclo Dashboard e Budget basato sul movimento Stipendio più recente fino al prossimo Stipendio;
- riepilogo budget con barre di completamento in Dashboard;
- non cancellare dati già salvati in localStorage;
- preferisci patch mirate e conservative rispetto a riscrivere tutto.

Richiesta di modifica / nuova funzionalità:
[SCRIVI QUI COSA VUOI MODIFICARE]

Analizza prima il codice e poi restituisci un file HTML completo aggiornato.`;return e?`${t}\n\n--- CODICE HTML CORRENTE ---\n${Ht()}`:t}async function Wt(e){try{return await navigator.clipboard.writeText(e),!0}catch{let t=document.createElement(`textarea`);t.value=e,t.style.position=`fixed`,t.style.left=`-9999px`,t.style.top=`-9999px`,document.body.appendChild(t),t.focus(),t.select();let n=!1;try{n=document.execCommand(`copy`)}catch{}return t.remove(),n}}async function Gt(e,t){Y(await Wt(Ut(!0))?`Prompt + HTML copiati. Incollali in ${t}.`:`Apri ${t} e allega/esporta il file HTML.`),window.open(e,`_blank`,`noopener,noreferrer`)}function Kt(){let e=new Blob([Ht()],{type:`text/html`}),t=URL.createObjectURL(e),n=document.createElement(`a`);n.href=t,n.download=`libretto-current-${a()}.html`,document.body.appendChild(n),n.click(),n.remove(),URL.revokeObjectURL(t),Y(`HTML corrente esportato`)}function qt(){let e=Ut(!1);document.getElementById(`modalRoot`).innerHTML=`
  <div class="modal-bg" id="promptBg">
    <div class="modal" style="max-width:720px">
      <button class="close-x" id="closePrompt">✕</button>
      <h3>Prompt per richieste di aggiornamento</h3>
      <div class="empty" style="text-align:left;padding-top:0">Questo prompt spiega come modificare Libretto senza rompere salvataggio, saldi e ciclo stipendio. Puoi copiarlo e poi allegare il file HTML esportato.</div>
      <textarea class="prompt-box" id="promptText">${l(e)}</textarea>
      <div class="modal-actions">
        <button class="btn ghost" id="cancelPrompt">Chiudi</button>
        <button class="btn" id="copyPromptOnly">Copia prompt</button>
        <button class="btn" id="copyPromptFull">Copia prompt + HTML</button>
      </div>
    </div>
  </div>`,document.getElementById(`promptBg`).addEventListener(`click`,e=>{e.target.id===`promptBg`&&X()}),document.getElementById(`closePrompt`).addEventListener(`click`,X),document.getElementById(`cancelPrompt`).addEventListener(`click`,X),document.getElementById(`copyPromptOnly`).addEventListener(`click`,async()=>{Y(await Wt(document.getElementById(`promptText`).value)?`Prompt copiato`:`Copia non riuscita`)}),document.getElementById(`copyPromptFull`).addEventListener(`click`,async()=>{Y(await Wt(Ut(!0))?`Prompt + HTML copiati`:`Copia non riuscita`)})}document.getElementById(`fabAdd`).addEventListener(`click`,Lt),document.getElementById(`exportBackupBtn`).addEventListener(`click`,Le),document.getElementById(`importBackupBtn`).addEventListener(`click`,()=>document.getElementById(`importBackupFile`).click()),document.getElementById(`importBackupFile`).addEventListener(`change`,e=>{let t=e.target.files&&e.target.files[0];t&&Re(t),e.target.value=``});function $(){y.categories.some(e=>e.name===`Risparmi`)||y.categories.splice(Math.max(0,y.categories.length-1),0,{name:`Risparmi`,icon:`🏦`,color:`#d6a23c`}),y.accounts.forEach(e=>{e.initialBalance===void 0&&(e.initialBalance=parseFloat(e.balance)||0),delete e.balance}),y.transactions.forEach(e=>{e.movementType||=`standard`,e.recurring===void 0&&(e.recurring=!1)}),y.goals||=[],y.settings||={},y.settings.dashboardShowBalances===void 0&&(y.settings.dashboardShowBalances=!0),!y.settings.dashboardAccountId&&y.accounts[0]&&(y.settings.dashboardAccountId=y.accounts[0].id),ve()}(function(){`serviceWorker`in navigator&&location.protocol.startsWith(`http`)&&window.addEventListener(`load`,()=>{navigator.serviceWorker.register(`./sw.js`).catch(()=>{})})})(),(async function(){await ke(),await Me()?($(),N()):($(),y.transactions=ue(),N()),st(`dashboard`),window.addEventListener(`focus`,()=>{j.client&&j.user&&je()}),setInterval(()=>{j.client&&j.user&&je()},6e4)})();