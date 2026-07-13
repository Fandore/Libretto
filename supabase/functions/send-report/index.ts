// Libretto — Edge Function: send-report
// Invia il riepilogo settimanale (ogni lunedì) o mensile (primo del mese)
// via Resend a tutti gli utenti registrati con dati nel periodo.
//
// Env vars richieste (impostare in Supabase Dashboard → Functions → Secrets):
//   BREVO_API_KEY        → API key Brevo (obbligatoria)
//   BREVO_FROM_EMAIL     → email mittente verificata su Brevo, es. "manciaracina92@gmail.com"
//   CRON_SECRET          → stringa casuale per proteggere l'endpoint (obbligatoria)
//
// Env vars auto-iniettate da Supabase:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ── Env ─────────────────────────────────────────────────────────────────── */
const BREVO_API_KEY    = Deno.env.get('BREVO_API_KEY')      ?? ''
const BREVO_FROM_EMAIL = Deno.env.get('BREVO_FROM_EMAIL')   ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')       ?? ''
const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const CRON_SECRET      = Deno.env.get('CRON_SECRET')        ?? ''

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
}

interface AppState {
  transactions: Tx[]
  budgets: Record<string, number>
  categories: Array<{ name: string; icon: string; color: string }>
  accounts: Array<{ id: string; name: string; balance: number }>
  settings?: { salaryDay?: number }
}

interface PeriodBounds { start: Date; end: Date; label: string }

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function isRealExpense(t: Tx): boolean {
  return t.type === 'out' && t.movementType !== 'transfer'
}
function isIncome(t: Tx): boolean {
  return t.type === 'in' && t.movementType !== 'transfer'
}
function isSalaryTx(t: Tx): boolean {
  const cat   = String(t.category ?? '').toLowerCase()
  const payee = String(t.payee    ?? '').toLowerCase()
  return t.type === 'in' &&
    t.movementType !== 'transfer' &&
    (cat.includes('stipendio') || payee.includes('stipendio'))
}
function fmtEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}
function fmtDateIT(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')} ${
    ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][d.getMonth()]
  }`
}

/* ── Periodo SETTIMANALE (globale, uguale per tutti) ─────────────────────── */
function weeklyBounds(): PeriodBounds {
  const now = new Date()
  const end = new Date(now)
  end.setDate(now.getDate() - 1)
  end.setHours(23, 59, 59, 999)
  const start = new Date(now)
  start.setDate(now.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  const label = `${fmtDateIT(start)} – ${fmtDateIT(end)} ${end.getFullYear()}`
  return { start, end, label }
}

/* ── Periodo MENSILE = ciclo stipendio dell'utente (per-user) ────────────── */
// Replica la logica di periodBounds() / cycleStartForKey() dall'app.
// Identifica il ciclo COMPLETATO più recente:
//   - ciclo N inizia il giorno dello stipendio N
//   - ciclo N finisce il giorno prima dello stipendio N+1
// Quando chiamato il 1° del mese (o comunque dopo che lo stipendio del mese
// corrente è già arrivato), restituisce il ciclo che si è appena concluso.
function monthlyCycleBounds(transactions: Tx[], settings: AppState['settings']): PeriodBounds {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Raccoglie date stipendio univoche ≤ oggi, ordinate crescenti
  const seen = new Set<string>()
  const salaryDates: Date[] = []
  for (const t of transactions) {
    if (!isSalaryTx(t)) continue
    const d = new Date(t.date)
    d.setHours(0, 0, 0, 0)
    if (d <= today) {
      const key = d.toISOString().slice(0, 10)
      if (!seen.has(key)) { seen.add(key); salaryDates.push(d) }
    }
  }
  salaryDates.sort((a, b) => a.getTime() - b.getTime())

  const fmtLabel = (s: Date, e: Date) =>
    `${fmtDateIT(s)} – ${fmtDateIT(e)} ${e.getFullYear()}`

  // Con almeno 2 stipendi storici possiamo definire il ciclo precedente:
  //   stipendi: [..., S(n-1), S(n)]   (S(n) = stipendio corrente, già arrivato)
  //   ciclo completato: da S(n-1) al giorno prima di S(n)
  if (salaryDates.length >= 2) {
    const currentCycleStart  = salaryDates[salaryDates.length - 1]
    const previousCycleStart = salaryDates[salaryDates.length - 2]
    const previousCycleEnd   = new Date(currentCycleStart.getTime() - 86_400_000)
    previousCycleEnd.setHours(23, 59, 59, 999)
    return {
      start: previousCycleStart,
      end:   previousCycleEnd,
      label: fmtLabel(previousCycleStart, previousCycleEnd),
    }
  }

  // Fallback: usa salaryDay dalle impostazioni (default 27)
  // e stima il ciclo precedente da quello
  const salaryDay = settings?.salaryDay ?? 27

  // Inizio ciclo corrente = salaryDay di questo o del mese scorso
  let currentStart: Date
  if (today.getDate() >= salaryDay) {
    currentStart = new Date(today.getFullYear(), today.getMonth(), salaryDay)
  } else {
    // Il salaryDay di questo mese non è ancora passato → ciclo corrente è partito il mese scorso
    const m = today.getMonth() - 1
    const y = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
    const lastDayOfM = new Date(y, m + 1, 0).getDate()
    currentStart = new Date(y, m, Math.min(salaryDay, lastDayOfM))
  }
  currentStart.setHours(0, 0, 0, 0)

  // Ciclo precedente: da salaryDay del mese prima di currentStart, a currentStart - 1 giorno
  const prevM = currentStart.getMonth() - 1
  const prevY = currentStart.getMonth() === 0 ? currentStart.getFullYear() - 1 : currentStart.getFullYear()
  const lastDayOfPrevM = new Date(prevY, prevM + 1, 0).getDate()
  const prevStart = new Date(prevY, prevM, Math.min(salaryDay, lastDayOfPrevM))
  prevStart.setHours(0, 0, 0, 0)

  const prevEnd = new Date(currentStart.getTime() - 86_400_000)
  prevEnd.setHours(23, 59, 59, 999)

  return { start: prevStart, end: prevEnd, label: fmtLabel(prevStart, prevEnd) }
}

/* ── HTML email ──────────────────────────────────────────────────────────── */
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
  const catIcon = (name: string) => categories.find(c => c.name === name)?.icon ?? '•'
  const balance  = income - expenses
  const balColor = balance >= 0 ? '#22c55e' : '#ef4444'

  /* Righe categorie */
  const catRows = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amt]) => {
      const budget = type === 'monthly' ? (budgets[name] ?? 0) : 0
      let budgetCell = `<td style="padding:7px 14px;text-align:right;color:#bcb5a3;font-size:12px;">—</td>`
      if (budget > 0) {
        const pct = (amt / budget) * 100
        const col = pct > 100 ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e'
        budgetCell = `<td style="padding:7px 14px;text-align:right;font-size:12px;color:${col};">${fmtEUR(budget)}<br><span style="font-size:10px;">${pct.toFixed(0)}% usato</span></td>`
      }
      return `<tr style="border-bottom:1px solid #f0eeea;">
        <td style="padding:7px 14px;font-size:14px;">${catIcon(name)} ${name}</td>
        <td style="padding:7px 14px;text-align:right;font-weight:600;font-size:14px;">${fmtEUR(amt)}</td>
        ${budgetCell}
      </tr>`
    }).join('')

  /* Righe top 5 */
  const top5Rows = top5.map((t, i) => `<tr style="border-bottom:1px solid #f0eeea;">
    <td style="padding:6px 14px;font-size:13px;color:#888;">${i + 1}</td>
    <td style="padding:6px 14px;font-size:13px;">${t.payee}</td>
    <td style="padding:6px 14px;font-size:12px;color:#888;">${catIcon(t.category)} ${t.category}</td>
    <td style="padding:6px 14px;text-align:right;font-weight:600;font-size:13px;color:#ef4444;">${fmtEUR(t.amount)}</td>
  </tr>`).join('')

  const budgetTh = type === 'monthly'
    ? `<th style="padding:8px 14px;text-align:right;font-weight:500;color:#999;font-size:12px;">Budget</th>`
    : ''

  const noCatMsg = Object.keys(byCat).length === 0
    ? `<tr><td colspan="3" style="padding:16px 14px;text-align:center;color:#bcb5a3;font-size:13px;">Nessuna spesa nel periodo.</td></tr>`
    : catRows

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Riepilogo Libretto</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1b1a;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- HEADER -->
  <tr>
    <td style="background:#1c1b1a;padding:28px 32px 24px;">
      <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-.5px;">📓 Libretto</div>
      <div style="font-size:13px;color:#bcb5a3;margin-top:6px;">
        Riepilogo ${type === 'weekly' ? 'settimanale' : 'mensile'} &nbsp;·&nbsp; ${label}
      </div>
    </td>
  </tr>

  <!-- SUMMARY CARDS -->
  <tr>
    <td style="padding:28px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td width="31%" style="background:#f0fdf4;border-radius:10px;padding:18px 12px;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px;">Entrate</div>
            <div style="font-size:22px;font-weight:700;color:#22c55e;">${fmtEUR(income)}</div>
          </td>
          <td width="5%"></td>
          <td width="31%" style="background:#fef2f2;border-radius:10px;padding:18px 12px;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px;">Uscite</div>
            <div style="font-size:22px;font-weight:700;color:#ef4444;">${fmtEUR(expenses)}</div>
          </td>
          <td width="5%"></td>
          <td width="31%" style="background:#f8f7f5;border-radius:10px;padding:18px 12px;text-align:center;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:6px;">Saldo netto</div>
            <div style="font-size:22px;font-weight:700;color:${balColor};">${fmtEUR(balance)}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- SPESE PER CATEGORIA -->
  <tr>
    <td style="padding:28px 32px 0;">
      <div style="font-size:15px;font-weight:600;margin-bottom:10px;">Spese per categoria</div>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0eeea;">
        <tr style="background:#f8f7f5;">
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Categoria</th>
          <th style="padding:8px 14px;text-align:right;font-weight:500;color:#999;font-size:12px;">Speso</th>
          ${budgetTh}
        </tr>
        ${noCatMsg}
      </table>
    </td>
  </tr>

  <!-- TOP 5 SPESE -->
  ${top5.length > 0 ? `
  <tr>
    <td style="padding:24px 32px 0;">
      <div style="font-size:15px;font-weight:600;margin-bottom:10px;">Top 5 spese singole</div>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0eeea;">
        ${top5Rows}
      </table>
    </td>
  </tr>` : ''}

  <!-- FOOTER -->
  <tr>
    <td style="padding:28px 32px;border-top:1px solid #f0eeea;margin-top:28px;">
      <div style="font-size:12px;color:#bcb5a3;text-align:center;">
        <a href="https://fandore.github.io/Libretto/" style="color:#bcb5a3;text-decoration:none;">Apri Libretto</a>
        &nbsp;·&nbsp; Questo messaggio è generato automaticamente.
      </div>
    </td>
  </tr>

</table>
</body>
</html>`
}

/* ── Main handler ────────────────────────────────────────────────────────── */
Deno.serve(async (req: Request) => {
  // Health-check
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ ok: true, fn: 'send-report' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Autorizzazione CRON_SECRET
  if (CRON_SECRET) {
    const auth = req.headers.get('Authorization') ?? ''
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  // Parsing body
  let type: 'weekly' | 'monthly' = 'weekly'
  try {
    const body = await req.json()
    if (body.type === 'monthly') type = 'monthly'
  } catch { /* ok */ }

  // Verifica env vars
  if (!BREVO_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing env vars: BREVO_API_KEY, SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Per il settimanale il periodo è fisso e uguale per tutti gli utenti.
  // Per il mensile il periodo è calcolato per-utente dal ciclo stipendio.
  const weeklyPeriod = type === 'weekly' ? weeklyBounds() : null
  if (weeklyPeriod) console.log(`send-report [weekly] → ${weeklyPeriod.label}`)

  // Carica tutti gli utenti auth
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers()
  if (usersErr) {
    return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 })
  }

  const results: Array<{ email: string; ok: boolean; period?: string; skipped?: boolean; error?: string }> = []

  for (const user of usersData.users) {
    if (!user.email) continue

    // Carica lo state dell'utente
    const { data: row } = await admin
      .from('libretto_user_state')
      .select('data')
      .eq('user_id', user.id)
      .single()

    if (!row?.data) {
      results.push({ email: user.email, ok: true, skipped: true })
      continue
    }

    const appState = row.data as AppState
    const allTxs: Tx[] = appState.transactions ?? []

    // Calcola i bounds del periodo per questo utente
    const { start, end, label } =
      type === 'weekly'
        ? weeklyPeriod!                                                // stesso per tutti
        : monthlyCycleBounds(allTxs, appState.settings)               // per-utente

    console.log(`send-report [${type}] ${user.email} → ${label}`)

    // Filtra le transazioni del periodo
    const periodTxs = allTxs.filter(t => {
      const d = new Date(t.date)
      d.setHours(0, 0, 0, 0)
      return d >= start && d <= end
    })

    const income   = periodTxs.filter(isIncome).reduce((s, t) => s + t.amount, 0)
    const expenses = periodTxs.filter(isRealExpense).reduce((s, t) => s + t.amount, 0)

    // Salta se il periodo è completamente vuoto
    if (income === 0 && expenses === 0) {
      results.push({ email: user.email, ok: true, period: label, skipped: true })
      continue
    }

    // Aggregazione per categoria
    const byCat: Record<string, number> = {}
    periodTxs.filter(isRealExpense).forEach(t => {
      byCat[t.category] = (byCat[t.category] ?? 0) + t.amount
    })

    // Top 5 spese singole
    const top5 = [...periodTxs]
      .filter(isRealExpense)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    const html = buildEmail({
      type, label, income, expenses, byCat, top5,
      budgets:    appState.budgets    ?? {},
      categories: appState.categories ?? [],
    })

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key':      BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender:      { name: 'Libretto', email: BREVO_FROM_EMAIL },
        to:          [{ email: user.email }],
        subject:     `📊 Riepilogo ${type === 'weekly' ? 'settimanale' : 'mensile'} Libretto · ${label}`,
        htmlContent: html,
      }),
    })

    if (brevoRes.status === 201) {
      console.log(`✓ Mail inviata a ${user.email}`)
      results.push({ email: user.email, ok: true, period: label })
    } else {
      const errText = await brevoRes.text()
      console.error(`✗ Errore Brevo per ${user.email}:`, errText)
      results.push({ email: user.email, ok: false, period: label, error: errText })
    }
  }

  return new Response(
    JSON.stringify({
      type,
      sent: results.filter(r => r.ok && !r.skipped).length,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
