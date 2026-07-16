// Libretto — Edge Function: send-monthly-reminder
// Invia il promemoria mensile delle scadenze ricorrenti ogni 1° del mese (07:00 UTC).
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

interface AppState {
  transactions: Tx[]
  categories: Array<{ name: string; icon: string; color: string }>
  settings?: { salaryDay?: number }
}

interface RecurringItem {
  day: number
  payee: string
  category: string
  amount: number
  freq: string
  isSaving: boolean
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function isTransfer(t: Tx): boolean {
  return t.movementType === 'transfer'
}

function isSalaryTx(t: Tx): boolean {
  const cat   = String(t.category ?? '').toLowerCase()
  const payee = String(t.payee    ?? '').toLowerCase()
  return t.type === 'in' &&
    !isTransfer(t) &&
    (cat.includes('stipendio') || payee.includes('stipendio'))
}

function fmtEUR(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

/* ── Stipendio medio (ultimi 3 stipendi) ─────────────────────────────────── */
function avgSalaryFromTxs(transactions: Tx[]): number {
  const salaries = transactions
    .filter(isSalaryTx)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)
  if (salaries.length === 0) return 0
  return salaries.reduce((s, t) => s + t.amount, 0) / salaries.length
}

/* ── Proiezione scadenze ricorrenti per un mese ──────────────────────────── */
// Replica la logica di recurringDaysInMonth() + fixedExpenses() dall'app.
function getRecurringItemsForMonth(
  transactions: Tx[],
  year: number,
  month: number,
): RecurringItem[] {
  const items: RecurringItem[] = []
  const seen = new Set<string>()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStart  = new Date(year, month, 1)
  const monthEnd    = new Date(year, month + 1, 0)

  // Deduplication: per ogni combinazione payee+category+tipo, prendi solo la più recente
  const recurringTxs = [...transactions]
    .filter(t => t.recurring)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  for (const t of recurringTxs) {
    const isSaving = isTransfer(t)

    // Include solo uscite e trasferimenti ricorrenti (no entrate salario)
    if (t.type === 'in' && !isSaving) continue

    const key = `${(t.payee || '').toLowerCase()}|${t.category || ''}|${isSaving ? 's' : 'e'}`
    if (seen.has(key)) continue
    seen.add(key)

    const freq     = t.recurringFreq || 'Mensile'
    const nextDate = t.recurringNextDate ? new Date(t.recurringNextDate) : null
    const txDay    = new Date(t.date).getDate()

    if (freq === 'Mensile') {
      const raw = nextDate ? nextDate.getDate() : txDay
      const day = Math.min(raw, daysInMonth)
      items.push({
        day, payee: t.payee || '', category: t.category || '',
        amount: t.amount, freq, isSaving,
      })

    } else if (freq === 'Settimanale') {
      if (!nextDate) {
        // Senza nextDate: includi come voce mensile approssimata
        items.push({
          day: 1, payee: t.payee || '', category: t.category || '',
          amount: t.amount * 4, freq: 'Settimanale (×4)', isSaving,
        })
        continue
      }
      // Trova la prima occorrenza nel mese e itera di 7 giorni
      let d = new Date(nextDate.getTime())
      while (d > monthStart) d = new Date(d.getTime() - 7 * 86_400_000)
      while (d < monthStart) d = new Date(d.getTime() + 7 * 86_400_000)
      while (d <= monthEnd) {
        items.push({
          day: d.getDate(), payee: t.payee || '', category: t.category || '',
          amount: t.amount, freq, isSaving,
        })
        d = new Date(d.getTime() + 7 * 86_400_000)
      }

    } else if (freq === 'Bimestrale' || freq === 'Annuale') {
      if (!nextDate) continue
      const step = freq === 'Bimestrale' ? 2 : 12
      const target = new Date(year, month, 1)

      let check = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
      while (check > target) {
        check = new Date(check.getFullYear(), check.getMonth() - step, 1)
      }
      while (check < target) {
        check = new Date(check.getFullYear(), check.getMonth() + step, 1)
      }

      if (check.getFullYear() === year && check.getMonth() === month) {
        const day = Math.min(nextDate.getDate(), daysInMonth)
        items.push({
          day, payee: t.payee || '', category: t.category || '',
          amount: t.amount, freq, isSaving,
        })
      }
    }
  }

  // Ordina per giorno poi per tipo (spese prima dei risparmi)
  return items.sort((a, b) => a.day - b.day || Number(a.isSaving) - Number(b.isSaving))
}

/* ── HTML email ──────────────────────────────────────────────────────────── */
function buildReminderEmail(params: {
  monthLabel: string
  items: RecurringItem[]
  avgSalary: number
  categories: AppState['categories']
}): string {
  const { monthLabel, items, avgSalary, categories } = params
  const catIcon = (name: string) => categories.find(c => c.name === name)?.icon ?? '•'

  const expenses = items.filter(i => !i.isSaving)
  const savings  = items.filter(i => i.isSaving)

  const totalExpenses = expenses.reduce((s, i) => s + i.amount, 0)
  const totalSavings  = savings.reduce((s, i) => s + i.amount, 0)
  const available     = avgSalary - totalExpenses - totalSavings
  const availColor    = available >= 0 ? '#22c55e' : '#ef4444'

  /* Righe spese */
  const expenseRows = expenses.map(item => `
    <tr style="border-bottom:1px solid #f0eeea;">
      <td style="padding:8px 14px;color:#888;font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums;">
        ${String(item.day).padStart(2, '0')}
      </td>
      <td style="padding:8px 14px;font-size:14px;">${item.payee}</td>
      <td style="padding:8px 14px;font-size:12px;color:#888;">${catIcon(item.category)} ${item.category}</td>
      <td style="padding:8px 14px;font-size:11px;color:#bcb5a3;">${item.freq}</td>
      <td style="padding:8px 14px;text-align:right;font-weight:600;font-size:14px;color:#ef4444;">${fmtEUR(item.amount)}</td>
    </tr>`).join('')

  const noExpensesMsg = expenses.length === 0
    ? `<tr><td colspan="5" style="padding:16px 14px;text-align:center;color:#bcb5a3;font-size:13px;">Nessuna uscita ricorrente prevista.</td></tr>`
    : ''

  /* Totale spese footer */
  const expenseTotalRow = expenses.length > 0 ? `
    <tr style="background:#f8f7f5;border-top:2px solid #e8e6e2;">
      <td colspan="4" style="padding:10px 14px;font-size:13px;font-weight:600;color:#555;">Totale uscite fisse</td>
      <td style="padding:10px 14px;text-align:right;font-size:15px;font-weight:700;color:#ef4444;">${fmtEUR(totalExpenses)}</td>
    </tr>` : ''

  /* Sezione risparmi */
  const savingRows = savings.map(item => `
    <tr style="border-bottom:1px solid #e0f2ec;">
      <td style="padding:8px 14px;color:#888;font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums;">
        ${String(item.day).padStart(2, '0')}
      </td>
      <td style="padding:8px 14px;font-size:14px;">${item.payee}</td>
      <td style="padding:8px 14px;font-size:12px;color:#3ea67a;">${catIcon(item.category)} ${item.category}</td>
      <td style="padding:8px 14px;font-size:11px;color:#bcb5a3;">${item.freq}</td>
      <td style="padding:8px 14px;text-align:right;font-weight:600;font-size:14px;color:#3ea67a;">${fmtEUR(item.amount)}</td>
    </tr>`).join('')

  const savingsSection = savings.length > 0 ? `
  <tr>
    <td style="padding:24px 32px 0;">
      <div style="font-size:15px;font-weight:600;margin-bottom:10px;">🏦 Risparmi programmati</div>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #c6e9d8;">
        <tr style="background:#f0faf5;">
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Giorno</th>
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Descrizione</th>
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Categoria</th>
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Freq.</th>
          <th style="padding:8px 14px;text-align:right;font-weight:500;color:#999;font-size:12px;">Importo</th>
        </tr>
        ${savingRows}
        <tr style="background:#f0faf5;border-top:2px solid #c6e9d8;">
          <td colspan="4" style="padding:10px 14px;font-size:13px;font-weight:600;color:#3ea67a;">Totale risparmi</td>
          <td style="padding:10px 14px;text-align:right;font-size:15px;font-weight:700;color:#3ea67a;">${fmtEUR(totalSavings)}</td>
        </tr>
      </table>
    </td>
  </tr>` : ''

  /* Nota disponibile */
  const salaryNote = avgSalary === 0
    ? '<br><span style="font-size:11px;color:#bcb5a3;">(nessuno stipendio rilevato — verifica di aver registrato entrate stipendio)</span>'
    : ''

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Scadenze ${monthLabel} — Libretto</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1b1a;">

<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
  style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

  <!-- HEADER -->
  <tr>
    <td style="background:#1c1b1a;padding:28px 32px 24px;">
      <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-.5px;">📓 Libretto</div>
      <div style="font-size:13px;color:#bcb5a3;margin-top:6px;">
        📅 Promemoria scadenze &nbsp;·&nbsp; <strong style="color:#fff;">${monthLabel}</strong>
      </div>
    </td>
  </tr>

  <!-- SUMMARY CARDS -->
  <tr>
    <td style="padding:28px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background:#f0fdf4;border-radius:10px;padding:16px 10px;text-align:center;width:23%;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:5px;">Stipendio</div>
            <div style="font-size:18px;font-weight:700;color:#22c55e;">${fmtEUR(avgSalary)}</div>
            <div style="font-size:10px;color:#bcb5a3;margin-top:3px;">media ultimi 3</div>
          </td>
          <td style="width:2%;"></td>
          <td style="background:#fef2f2;border-radius:10px;padding:16px 10px;text-align:center;width:23%;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:5px;">Uscite fisse</div>
            <div style="font-size:18px;font-weight:700;color:#ef4444;">${fmtEUR(totalExpenses)}</div>
            <div style="font-size:10px;color:#bcb5a3;margin-top:3px;">${expenses.length} scadenz${expenses.length === 1 ? 'a' : 'e'}</div>
          </td>
          <td style="width:2%;"></td>
          <td style="background:#f0faf5;border-radius:10px;padding:16px 10px;text-align:center;width:23%;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:5px;">Risparmi</div>
            <div style="font-size:18px;font-weight:700;color:#3ea67a;">${fmtEUR(totalSavings)}</div>
            <div style="font-size:10px;color:#bcb5a3;margin-top:3px;">${savings.length} transfer${savings.length === 1 ? '' : 'imenti'}</div>
          </td>
          <td style="width:2%;"></td>
          <td style="background:#f8f7f5;border-radius:10px;padding:16px 10px;text-align:center;width:23%;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#888;margin-bottom:5px;">Disponibile</div>
            <div style="font-size:18px;font-weight:700;color:${availColor};">${fmtEUR(available)}</div>
            <div style="font-size:10px;color:#bcb5a3;margin-top:3px;">netto libero</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- USCITE RICORRENTI -->
  <tr>
    <td style="padding:24px 32px 0;">
      <div style="font-size:15px;font-weight:600;margin-bottom:10px;">📋 Uscite ricorrenti previste</div>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #f0eeea;">
        <tr style="background:#f8f7f5;">
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Giorno</th>
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Descrizione</th>
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Categoria</th>
          <th style="padding:8px 14px;text-align:left;font-weight:500;color:#999;font-size:12px;">Freq.</th>
          <th style="padding:8px 14px;text-align:right;font-weight:500;color:#999;font-size:12px;">Importo</th>
        </tr>
        ${noExpensesMsg || expenseRows}
        ${expenseTotalRow}
      </table>
    </td>
  </tr>

  ${savingsSection}

  <!-- BOX DISPONIBILE -->
  <tr>
    <td style="padding:20px 32px 0;">
      <div style="background:#f8f7f5;border-radius:10px;padding:16px 20px;border-left:4px solid ${availColor};">
        <div style="font-size:13px;color:#555;line-height:1.6;">
          Il tuo <strong>disponibile stimato</strong> per <strong>${monthLabel}</strong> è
          <strong style="font-size:15px;color:${availColor};">${fmtEUR(available)}</strong>
          dopo aver detratto uscite fisse (${fmtEUR(totalExpenses)}) e risparmi programmati (${fmtEUR(totalSavings)}).
          ${salaryNote}
        </div>
      </div>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="padding:28px 32px;margin-top:28px;border-top:1px solid #f0eeea;">
      <div style="font-size:12px;color:#bcb5a3;text-align:center;line-height:1.6;">
        <a href="https://fandore.github.io/Libretto/" style="color:#bcb5a3;text-decoration:none;">Apri Libretto</a>
        &nbsp;·&nbsp; Promemoria automatico — ogni 5° del mese.
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
    return new Response(JSON.stringify({ ok: true, fn: 'send-monthly-reminder' }), {
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

  // Verifica env vars
  if (!BREVO_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing env vars')
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Mese corrente (il giorno in cui viene eseguito il cron, cioè il 1°)
  const now        = new Date()
  const year       = now.getFullYear()
  const month      = now.getMonth()
  const monthLabel = `${MONTHS_IT[month]} ${year}`

  console.log(`send-monthly-reminder → ${monthLabel}`)

  // Carica tutti gli utenti
  const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers()
  if (usersErr) {
    return new Response(JSON.stringify({ error: usersErr.message }), { status: 500 })
  }

  const results: Array<{ email: string; ok: boolean; skipped?: boolean; error?: string }> = []

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

    // Calcola scadenze del mese
    const items  = getRecurringItemsForMonth(allTxs, year, month)
    const salary = avgSalaryFromTxs(allTxs)

    // Salta se non ci sono scadenze
    if (items.length === 0) {
      console.log(`skip ${user.email} — nessuna scadenza ricorrente in ${monthLabel}`)
      results.push({ email: user.email, ok: true, skipped: true })
      continue
    }

    const html = buildReminderEmail({
      monthLabel,
      items,
      avgSalary: salary,
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
        subject:     `📅 Scadenze di ${monthLabel} — Libretto`,
        htmlContent: html,
      }),
    })

    if (brevoRes.status === 201) {
      console.log(`✓ Promemoria inviato a ${user.email}`)
      results.push({ email: user.email, ok: true })
    } else {
      const errText = await brevoRes.text()
      console.error(`✗ Errore Brevo per ${user.email}:`, errText)
      results.push({ email: user.email, ok: false, error: errText })
    }
  }

  return new Response(
    JSON.stringify({
      month: monthLabel,
      sent: results.filter(r => r.ok && !r.skipped).length,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
