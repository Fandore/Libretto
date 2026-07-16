// Libretto — Edge Function: send-report
// Tipi supportati:
//   weekly          → riepilogo spese ultimi 7 giorni (ogni martedì 08:00 UTC)
//   monthly         → riepilogo ciclo stipendio completato (ogni 5° del mese 08:00 UTC)
//   sunday-preview  → anteprima scadenze settimana prossima: reminder + ricorrenti (ogni domenica 08:00 UTC)
//
// Env vars richieste:
//   BREVO_API_KEY, BREVO_FROM_EMAIL, CRON_SECRET
// Env vars auto-iniettate da Supabase:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ── Env ─────────────────────────────────────────────────────────────────── */
const BREVO_API_KEY    = Deno.env.get('BREVO_API_KEY')             ?? ''
const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL')          ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              ?? ''
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET      = Deno.env.get('CRON_SECRET')               ?? ''

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Tx {
  id: string
  date: string
  account: string
  category: string
  payee: string
  amount: number
  type: 'in' | 'out'
  movementType?: string
  recurring?: boolean
  recurringFreq?: string
  recurringNextDate?: string
}

interface Reminder {
  id: string
  date: string
  payee: string
  category: string
  amount: number
  note?: string
}

interface AppState {
  transactions: Tx[]
  budgets: Record<string, number>
  categories: Array<{ name: string; icon: string; color: string }>
  accounts: Array<{ id: string; name: string; balance: number }>
  settings?: { salaryDay?: number }
  reminders?: Reminder[]
}

interface PeriodBounds { start: Date; end: Date; label: string }

interface PreviewItem {
  date: Date
  payee: string
  category: string
  amount: number
  freq?: string        // solo per ricorrenti
  note?: string        // solo per reminder
  isReminder: boolean
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function isRealExpense(t: Tx): boolean { return t.type === 'out' && t.movementType !== 'transfer' }
function isIncome(t: Tx): boolean { return t.type === 'in' && t.movementType !== 'transfer' }
function isSalaryTx(t: Tx): boolean {
  const cat   = String(t.category ?? '').toLowerCase()
  const payee = String(t.payee    ?? '').toLowerCase()
  return t.type === 'in' && t.movementType !== 'transfer' &&
    (cat.includes('stipendio') || payee.includes('stipendio'))
}
function fmtEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}
function fmtDateIT(d: Date): string {
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
  return `${days[d.getDay()]} ${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]}`
}

/* ── Bounds settimanale (speso) ──────────────────────────────────────────── */
function weeklyBounds(): PeriodBounds {
  const now = new Date()
  const end = new Date(now); end.setDate(now.getDate()-1); end.setHours(23,59,59,999)
  const start = new Date(now); start.setDate(now.getDate()-7); start.setHours(0,0,0,0)
  const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2,'0')} ${
    ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][d.getMonth()]}`
  return { start, end, label: `${fmtShort(start)} – ${fmtShort(end)} ${end.getFullYear()}` }
}

/* ── Bounds anteprima domenicale (prossimi 7 giorni) ────────────────────── */
function previewWeekBounds(): PeriodBounds {
  const now = new Date(); now.setHours(0,0,0,0)
  const start = new Date(now); start.setDate(now.getDate()+1)   // domani
  const end   = new Date(now); end.setDate(now.getDate()+7); end.setHours(23,59,59,999)
  return { start, end, label: `${fmtDateIT(start)} – ${fmtDateIT(end)}` }
}

/* ── Bounds mensile (ciclo stipendio completato, per-utente) ─────────────── */
function monthlyCycleBounds(transactions: Tx[], settings: AppState['settings']): PeriodBounds {
  const today = new Date(); today.setHours(0,0,0,0)
  const seen = new Set<string>()
  const salaryDates: Date[] = []
  for (const t of transactions) {
    if (!isSalaryTx(t)) continue
    const d = new Date(t.date); d.setHours(0,0,0,0)
    if (d <= today) { const k = d.toISOString().slice(0,10); if(!seen.has(k)){ seen.add(k); salaryDates.push(d) } }
  }
  salaryDates.sort((a,b)=>a.getTime()-b.getTime())
  const fmtShort = (d: Date) => `${String(d.getDate()).padStart(2,'0')} ${
    ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][d.getMonth()]}`
  const fmtLabel = (s:Date,e:Date) => `${fmtShort(s)} – ${fmtShort(e)} ${e.getFullYear()}`
  if (salaryDates.length >= 2) {
    const cur  = salaryDates[salaryDates.length-1]
    const prev = salaryDates[salaryDates.length-2]
    const end  = new Date(cur.getTime()-86_400_000); end.setHours(23,59,59,999)
    return { start: prev, end, label: fmtLabel(prev,end) }
  }
  const salaryDay = settings?.salaryDay ?? 27
  let currentStart: Date
  if (today.getDate() >= salaryDay) {
    currentStart = new Date(today.getFullYear(), today.getMonth(), salaryDay)
  } else {
    const m = today.getMonth()-1; const y = today.getMonth()===0?today.getFullYear()-1:today.getFullYear()
    currentStart = new Date(y, m, Math.min(salaryDay, new Date(y,m+1,0).getDate()))
  }
  currentStart.setHours(0,0,0,0)
  const prevM = currentStart.getMonth()-1
  const prevY = currentStart.getMonth()===0?currentStart.getFullYear()-1:currentStart.getFullYear()
  const prevStart = new Date(prevY, prevM, Math.min(salaryDay, new Date(prevY,prevM+1,0).getDate()))
  prevStart.setHours(0,0,0,0)
  const prevEnd = new Date(currentStart.getTime()-86_400_000); prevEnd.setHours(23,59,59,999)
  return { start: prevStart, end: prevEnd, label: fmtLabel(prevStart,prevEnd) }
}

/* ── Ricorrenti in scadenza in un range di date ──────────────────────────── */
function getRecurringItemsInRange(transactions: Tx[], rangeStart: Date, rangeEnd: Date): PreviewItem[] {
  const items: PreviewItem[] = []
  const seen = new Set<string>()
  const recurringTxs = [...transactions]
    .filter(t => t.recurring && t.type==='out' && t.movementType!=='transfer')
    .sort((a,b) => new Date(b.date).getTime()-new Date(a.date).getTime())

  for (const t of recurringTxs) {
    const key = `${(t.payee||'').toLowerCase()}|${t.category||''}`
    if (seen.has(key)) continue
    seen.add(key)
    const freq = t.recurringFreq || 'Mensile'
    const nextDate = t.recurringNextDate ? new Date(t.recurringNextDate) : null

    if (freq === 'Settimanale') {
      if (!nextDate) continue
      let d = new Date(nextDate.getTime()); d.setHours(0,0,0,0)
      while (d < rangeStart) d = new Date(d.getTime()+7*86_400_000)
      while (d <= rangeEnd) {
        items.push({ date: new Date(d), payee: t.payee||'', category: t.category||'', amount: t.amount, freq, isReminder: false })
        d = new Date(d.getTime()+7*86_400_000)
      }
    } else {
      // Mensile, Bimestrale, Annuale: controlla se nextDate cade nel range
      if (!nextDate) continue
      const d = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()); d.setHours(0,0,0,0)
      if (d >= rangeStart && d <= rangeEnd) {
        items.push({ date: d, payee: t.payee||'', category: t.category||'', amount: t.amount, freq, isReminder: false })
      }
    }
  }
  return items
}

/* ── HTML email riepilogo weekly/monthly ─────────────────────────────────── */
function buildEmail(params: {
  type: 'weekly' | 'monthly'
  label: string
  income: number
  expenses: number
  byCat: Record<string, number>
  top5: Tx[]
  budgets: Record<string, number>
  categories: AppState['categories']
}): string {
  const { type, label, income, expenses, byCat, top5, budgets, categories } = params
  const catIcon = (name: string) => categories.find(c=>c.name===name)?.icon ?? '•'
  const balance = income-expenses
  const balColor = balance>=0?'#22c55e':'#ef4444'

  const catRows = Object.entries(byCat).sort(([,a],[,b])=>b-a).map(([name,amt])=>{
    const budget = type==='monthly'?(budgets[name]??0):0
    let budgetCell = `<td style="padding:7px 14px;text-align:right;color:#bcb5a3;font-size:12px;">—</td>`
    if (budget>0) {
      const pct=(amt/budget)*100
      const col=pct>100?'#ef4444':pct>80?'#f59e0b':'#22c55e'
      budgetCell=`<td style="padding:7px 14px;text-align:right;font-size:12px;color:${col};">${fmtEUR(budget)}<br><span style="font-size:10px;">${pct.toFixed(0)}% usato</span></td>`
    }
    return `<tr style="border-bottom:1px solid #f0eeea;">
      <td style="padding:7px 14px;font-size:14px;">${catIcon(name)} ${name}</td>
      <td style="padding:7px 14px;text-align:right;font-weight:600;font-size:14px;">${fmtEUR(amt)}</td>
      ${budgetCell}
    </tr>`
  }).join('')
  const top5Rows = top5.map((t,i)=>`<tr style="border-bottom:1px solid #f0eeea;">
    <td style="padding:6px 14px;font-size:13px;color:#888;">${i+1}</td>
    <td style="padding:6px 14px;font-size:13px;">${t.payee}</td>
    <td style="padding:6px 14px;font-size:12px;color:#888;">${catIcon(t.category)} ${t.category}</td>
    <td style="padding:6px 14px;text-align:right;font-weight:600;font-size:13px;color:#ef4444;">${fmtEUR(t.amount)}</td>
  </tr>`).join('')
  const budgetTh = type==='monthly'?`<th style="padding:8px 14px;text-align:right;font-weight:500;color:#999;font-size:12px;">Budget</th>`:''
  const noCatMsg = Object.keys(byCat).length===0
    ?`<tr><td colspan="3" style="padding:16px 14px;text-align:center;color:#bcb5a3;font-size:13px;">Nessuna spesa nel periodo.</td></tr>`
    :catRows

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Riepilogo Libretto</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1b1a;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <tr><td style="background:#1c1b1a;padding:28px 32px 24px;">
    <div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-.5px;">📓 Libretto</div>
    <div style="font-size:13px;color:#bcb5a3;margin-top:6px;">Riepilogo ${type==='weekly'?'settimanale':'mensile'} &nbsp;·&nbsp; ${label}</div>
  </td></tr>
  <tr><td style="padding:28px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
      <td width="31%" style="background:#f0fdf4;border-radius:10px;padding:18px 12px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px;">Entrate</div>
        <div style="font-size:22px;font-weight:700;color:#22c55e;">${fmtEUR(income)}</div>
      </td><td width="5%"></td>
      <td width="31%" style="background:#fef2f2;border-radius:10px;padding:18px 12px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px;">Uscite</div>
        <div style="font-size:22px;font-weight:700;color:#ef4444;">${fmtEUR(expenses)}</div>
      </td><td width="5%"></td>
      <td width="31%" style="background:#f8f7f5;border-radius:10px;padding:18px 12px;text-align:center;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px;">Saldo netto</div>
        <div style="font-size:22px;font-weight:700;color:${balColor};">${fmtEUR(balance)}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px 0;">
    <div style="font-size:15px;font-weight:600;margin-bottom:10px;">Spese per categoria</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0eeea;">
      <tr style="background:#f8f7f5;">
        <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Categoria</th>
        <th style="padding:8px 14px;text-align:right;font-weight:500;color:#999;font-size:12px;">Speso</th>
        ${budgetTh}
      </tr>${noCatMsg}
    </table>
  </td></tr>
  ${top5.length>0?`<tr><td style="padding:24px 32px 0;">
    <div style="font-size:15px;font-weight:600;margin-bottom:10px;">Top 5 spese singole</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0eeea;">${top5Rows}</table>
  </td></tr>`:''}
  <tr><td style="padding:28px 32px;border-top:1px solid #f0eeea;">
    <div style="font-size:12px;color:#bcb5a3;text-align:center;">
      <a href="https://fandore.github.io/Libretto/" style="color:#bcb5a3;text-decoration:none;">Apri Libretto</a>
      &nbsp;·&nbsp; Questo messaggio è generato automaticamente.
    </div>
  </td></tr>
</table></body></html>`
}

/* ── HTML email anteprima domenicale ─────────────────────────────────────── */
function buildSundayPreviewEmail(params: {
  label: string
  items: PreviewItem[]
  categories: AppState['categories']
}): string {
  const { label, items, categories } = params
  const catIcon = (name: string) => categories.find(c=>c.name===name)?.icon ?? '•'
  const reminders  = items.filter(i=>i.isReminder)
  const recurrings = items.filter(i=>!i.isReminder)
  const totalRem = reminders.reduce((s,i)=>s+i.amount,0)
  const totalRec = recurrings.reduce((s,i)=>s+i.amount,0)
  const totalAll = totalRem+totalRec

  const makeRows = (list: PreviewItem[], color: string) => list.map(item=>`
    <tr style="border-bottom:1px solid #f0eeea;">
      <td style="padding:8px 14px;color:#888;font-size:13px;white-space:nowrap;">${fmtDateIT(item.date)}</td>
      <td style="padding:8px 14px;font-size:14px;">${item.payee}</td>
      <td style="padding:8px 14px;font-size:12px;color:#888;">${catIcon(item.category)} ${item.category}</td>
      <td style="padding:8px 14px;text-align:right;font-weight:600;font-size:14px;color:${color};">${fmtEUR(item.amount)}</td>
    </tr>`).join('')

  const thead = `<tr style="background:#f8f7f5;">
    <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Giorno</th>
    <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Descrizione</th>
    <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Categoria</th>
    <th style="padding:8px 14px;text-align:right;font-weight:500;color:#999;font-size:12px;">Importo</th>
  </tr>`

  const remSection = reminders.length>0 ? `
  <tr><td style="padding:24px 32px 0;">
    <div style="font-size:15px;font-weight:600;margin-bottom:10px;">📌 Reminder in scadenza</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e8e0f5;">
      ${thead}${makeRows(reminders,'#a08de0')}
      <tr style="background:#f5f0ff;border-top:2px solid #e8e0f5;">
        <td colspan="3" style="padding:9px 14px;font-size:13px;font-weight:600;color:#7c5cbf;">Totale reminder</td>
        <td style="padding:9px 14px;text-align:right;font-size:15px;font-weight:700;color:#a08de0;">${fmtEUR(totalRem)}</td>
      </tr>
    </table>
  </td></tr>` : ''

  const recSection = recurrings.length>0 ? `
  <tr><td style="padding:24px 32px 0;">
    <div style="font-size:15px;font-weight:600;margin-bottom:10px;">🔁 Spese ricorrenti previste</div>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0eeea;">
      ${thead}${makeRows(recurrings,'#ef4444')}
      <tr style="background:#f8f7f5;border-top:2px solid #e8e6e2;">
        <td colspan="3" style="padding:9px 14px;font-size:13px;font-weight:600;color:#555;">Totale ricorrenti</td>
        <td style="padding:9px 14px;text-align:right;font-size:15px;font-weight:700;color:#ef4444;">${fmtEUR(totalRec)}</td>
      </tr>
    </table>
  </td></tr>` : ''

  const emptyMsg = items.length===0 ? `
  <tr><td style="padding:32px;text-align:center;color:#bcb5a3;font-size:14px;">
    Nessun reminder o scadenza ricorrente nella settimana. Buona settimana! 🎉
  </td></tr>` : ''

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Anteprima settimana — Libretto</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1b1a;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <tr><td style="background:#1c1b1a;padding:28px 32px 24px;">
    <div style="font-size:24px;font-weight:700;color:#fff;letter-spacing:-.5px;">📓 Libretto</div>
    <div style="font-size:13px;color:#bcb5a3;margin-top:6px;">📅 Anteprima settimana &nbsp;·&nbsp; <strong style="color:#fff;">${label}</strong></div>
  </td></tr>
  <tr><td style="padding:24px 32px 0;">
    <div style="background:#f8f7f5;border-radius:10px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:4px;">Totale atteso questa settimana</div>
        <div style="font-size:26px;font-weight:700;color:${totalAll>0?'#ef4444':'#22c55e'};">${totalAll>0?'−':''}${fmtEUR(totalAll)}</div>
      </div>
      <div style="text-align:right;font-size:13px;color:#888;">
        ${reminders.length} reminder<br>${recurrings.length} ricorrenti
      </div>
    </div>
  </td></tr>
  ${remSection}${recSection}${emptyMsg}
  <tr><td style="padding:28px 32px;border-top:1px solid #f0eeea;margin-top:16px;">
    <div style="font-size:12px;color:#bcb5a3;text-align:center;">
      <a href="https://fandore.github.io/Libretto/" style="color:#bcb5a3;text-decoration:none;">Apri Libretto</a>
      &nbsp;·&nbsp; Anteprima automatica — ogni domenica mattina.
    </div>
  </td></tr>
</table></body></html>`
}

/* ── Main handler ────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {
  if (req.method==='GET') {
    return new Response(JSON.stringify({ ok: true, fn: 'send-report' }), { headers: { 'Content-Type': 'application/json' } })
  }

  if (CRON_SECRET) {
    const auth = req.headers.get('Authorization') ?? ''
    if (auth !== `Bearer ${CRON_SECRET}`) return new Response('Unauthorized', { status: 401 })
  }

  let type: 'weekly' | 'monthly' | 'sunday-preview' = 'weekly'
  try {
    const body = await req.json()
    if (body.type==='monthly') type='monthly'
    else if (body.type==='sunday-preview') type='sunday-preview'
  } catch { /* ok */ }

  if (!BREVO_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const weeklyPeriod   = type==='weekly'         ? weeklyBounds()      : null
  const previewPeriod  = type==='sunday-preview' ? previewWeekBounds() : null
  if (weeklyPeriod)  console.log(`send-report [weekly] → ${weeklyPeriod.label}`)
  if (previewPeriod) console.log(`send-report [sunday-preview] → ${previewPeriod.label}`)

  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers()
  if (usersErr) return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 })

  const results: Array<{ email: string; ok: boolean; period?: string; skipped?: boolean; error?: string }> = []

  for (const user of usersData.users) {
    if (!user.email) continue

    const { data: row } = await admin
      .from('libretto_user_state').select('data').eq('user_id', user.id).single()

    if (!row?.data) { results.push({ email: user.email, ok: true, skipped: true }); continue }

    const appState  = row.data as AppState
    const allTxs    = appState.transactions ?? []
    const cats      = appState.categories   ?? []

    /* ── sunday-preview ── */
    if (type==='sunday-preview') {
      const { start, end, label } = previewPeriod!
      console.log(`send-report [sunday-preview] ${user.email} → ${label}`)

      // Ricorrenti in scadenza
      const recItems = getRecurringItemsInRange(allTxs, start, end)

      // Reminder in scadenza
      const reminders = (appState.reminders ?? []).filter(r => {
        const d = new Date(r.date); d.setHours(0,0,0,0)
        return d >= start && d <= end
      })
      const remItems: PreviewItem[] = reminders.map(r => ({
        date: new Date(r.date), payee: r.payee, category: r.category,
        amount: r.amount, note: r.note, isReminder: true,
      }))

      const allItems = [...remItems, ...recItems].sort((a,b)=>a.date.getTime()-b.date.getTime())

      // Salta se non c'è nulla (e non ha reminder)
      if (allItems.length===0) {
        results.push({ email: user.email, ok: true, period: label, skipped: true }); continue
      }

      const html = buildSundayPreviewEmail({ label, items: allItems, categories: cats })

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender:      { name: 'Libretto', email: BREVO_FROM_EMAIL },
          to:          [{ email: user.email }],
          subject:     `📅 Settimana ${label} — cosa ti aspetta`,
          htmlContent: html,
        }),
      })

      if (brevoRes.status===201) {
        console.log(`✓ Preview inviata a ${user.email}`)
        results.push({ email: user.email, ok: true, period: label })
      } else {
        const errText = await brevoRes.text()
        console.error(`✗ Errore Brevo per ${user.email}:`, errText)
        results.push({ email: user.email, ok: false, period: label, error: errText })
      }
      continue
    }

    /* ── weekly / monthly ── */
    const { start, end, label } =
      type==='weekly' ? weeklyPeriod! : monthlyCycleBounds(allTxs, appState.settings)
    console.log(`send-report [${type}] ${user.email} → ${label}`)

    const periodTxs = allTxs.filter(t => {
      const d = new Date(t.date); d.setHours(0,0,0,0)
      return d>=start && d<=end
    })

    const income   = periodTxs.filter(isIncome).reduce((s,t)=>s+t.amount,0)
    const expenses = periodTxs.filter(isRealExpense).reduce((s,t)=>s+t.amount,0)

    if (income===0 && expenses===0) {
      results.push({ email: user.email, ok: true, period: label, skipped: true }); continue
    }

    const byCat: Record<string,number> = {}
    periodTxs.filter(isRealExpense).forEach(t=>{ byCat[t.category]=(byCat[t.category]??0)+t.amount })

    const top5 = [...periodTxs].filter(isRealExpense).sort((a,b)=>b.amount-a.amount).slice(0,5)

    const html = buildEmail({ type: type as 'weekly'|'monthly', label, income, expenses, byCat, top5,
      budgets: appState.budgets??{}, categories: cats })

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender:      { name: 'Libretto', email: BREVO_FROM_EMAIL },
        to:          [{ email: user.email }],
        subject:     `📊 Riepilogo ${type==='weekly'?'settimanale':'mensile'} Libretto · ${label}`,
        htmlContent: html,
      }),
    })

    if (brevoRes.status===201) {
      console.log(`✓ Mail inviata a ${user.email}`)
      results.push({ email: user.email, ok: true, period: label })
    } else {
      const errText = await brevoRes.text()
      console.error(`✗ Errore Brevo per ${user.email}:`, errText)
      results.push({ email: user.email, ok: false, period: label, error: errText })
    }
  }

  return new Response(
    JSON.stringify({ type, sent: results.filter(r=>r.ok&&!r.skipped).length, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
