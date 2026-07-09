/* ============ UTILS ============ */
export function uid(){ return 't'+Math.random().toString(36).slice(2,10); }
export function isoToday(){ return new Date().toISOString().slice(0,10); }
export function addDays(iso,n){ const d=new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
export function fmtEUR(n){ const s=n<0?"-":""; return s+"€"+Math.abs(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
export function fmtDate(iso){ return new Date(iso).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}); }
export function escapeHTML(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
export function lastDayOfMonth(year,month){ return new Date(year,month+1,0).getDate(); }
export function clampDay(year,month,day){ return Math.min(Math.max(1,parseInt(day)||1),lastDayOfMonth(year,month)); }
export function dayStart(d){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
export function dateKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function parseISODate(iso){ const [y,m,d]=String(iso).slice(0,10).split('-').map(Number); return new Date(y,(m||1)-1,d||1); }
export function nowIso(){ return new Date().toISOString(); }
export function fmtDateTime(iso){ return iso ? new Date(iso).toLocaleString('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : 'mai'; }
export function isTransfer(t){ return t.movementType==='transfer'; }
export function monthKeyFromDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
export function addMonths(date,n){ const d=new Date(date); d.setMonth(d.getMonth()+n); return d; }
