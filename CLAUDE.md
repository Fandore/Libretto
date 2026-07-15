# Libretto — Contesto Progetto

## Cos'è
App web PWA per la gestione delle finanze personali (multi-utente, accesso con login).
Usata da Vito e altri utenti familiari. L'admin è `manciaracina92@gmail.com`.

**Live:** https://fandore.github.io/Libretto/
**Repo:** https://github.com/Fandore/Libretto
**Supabase project ref:** `marvmbewsgxrabirugkk`

---

## Stack tecnico
- **Frontend:** Vanilla JS (ES modules) + HTML + CSS — nessun framework
- **Build tool:** Vite 8 (`vite.config.js`)
- **Backend/Auth/DB:** Supabase (PostgreSQL + Auth + Edge Functions)
- **Email:** Resend API (via Supabase Edge Function)
- **Deploy:** `npm run deploy` → Vite build + gh-pages pubblica `dist/` sul branch `gh-pages`
- **CI:** `.github/workflows/deploy.yml` presente ma non usato (deploy manuale con gh-pages)

---

## Struttura file
```
Libretto/
├── src/
│   ├── main.js          # Logica principale (~1745 righe): state, render, handlers, pagine
│   ├── constants.js     # DEFAULT_CATEGORIES, ACCT_COLORS, EMOJI_CHOICES, COLOR_CHOICES, MONTHS_IT
│   └── utils.js         # 16 funzioni pure (uid, fmtEUR, fmtDate, dateKey, isTransfer, ecc.)
├── css/app.css          # Tutti gli stili dell'app
├── index.html           # Shell HTML (57 righe) — struttura + import CSS + import main.js
├── public/              # File statici copiati da Vite in dist/ as-is
│   ├── sw.js            # Service Worker (PWA)
│   ├── manifest.webmanifest
│   └── libretto-icon.svg
├── supabase/
│   ├── functions/send-report/index.ts  # Edge Function per mail riepilogo
│   └── sql/cron_setup.sql              # Setup pg_cron + pg_net per scheduling
├── note/
│   ├── SAL.txt              # Diario di sessione (State-of-Art Libretto) — aggiornare ad ogni sessione
│   └── ChatGPT_requests.txt # Backlog feature approvate
├── vite.config.js
└── package.json
```

---

## Architettura app

### State
Unico oggetto `state` in `main.js` con: `accounts`, `categories`, `budgets`, `goals`,
`transactions`, `alertsDismissed`, `settings` (es. `salaryDay:27`), `stoppedRecurrings`.

### Persistenza
- **localStorage** come storage primario offline
- **Supabase** per sync cloud e auth multi-utente

### Versioning
Stringa `APP_VERSION` in `main.js` — formato: `22.x-descrizione`.
Versione corrente: **v22.7** (import homebanking — 15/07/2026).

### Pagine admin-only
Le pagine visibili solo all'admin (`manciaracina92@gmail.com`) sono definite in un array
`ADMIN_ONLY_PAGES` in `main.js`. Gli altri utenti vedono solo le pagine operative.

---

## Convenzioni importanti
- **Frequenze ricorrenti:** Mensile / Settimanale / Bimestrale / Annuale
- **Cashflow:** entrate proiettate = solo stipendi (non bonus o entrate una tantum)
- **Spese fermate:** `state.stoppedRecurrings[]` — chiave `"payeeLower|categoria"` — escluse da proiezioni
- **Ciclo stipendio:** determinato da `salaryDates()` basandosi su transazioni con categoria/payee "stipendio"
- **Formato valuta:** `fmtEUR(n)` — es. `€1.234,56`
- **Trasferimenti:** `isTransfer(t)` — `movementType === 'transfer'`

---

## Comandi sviluppo
```bash
npm run dev      # Dev server → http://localhost:5173
npm run build    # Build in dist/
npm run deploy   # Build + pubblica su gh-pages (GitHub Pages)
```

**Supabase Edge Function deploy:**
```bash
supabase functions deploy send-report --no-verify-jwt
supabase functions invoke send-report --body '{"type":"weekly"}'
supabase functions invoke send-report --body '{"type":"monthly"}'
```

---

## Backlog (prossime sessioni)
- **req. 10:** ✅ Import movimenti da file bancario — **COMPLETATO v22.7**
  - Wizard 2 step in `src/bankImport.js` + `src/main.js`; registry `BANK_FORMATS` estensibile
  - Parser ING Italia: CSV `;`, data valuta, payee estratto da DESCRIZIONE per CAUSALE
  - `state.merchantMappings` per memorizzare payee→category; suggestCategoryForPayee + isDuplicateBankTx
  - Per aggiungere nuova banca: aggiungere entry `{ id, label, accept, parse }` a `BANK_FORMATS` in `src/bankImport.js`
- **req. 8:** Modularizzazione Fase 2 — estrarre `src/state.js` + `src/storage.js` da `main.js`
  *(attenzione a dipendenze circolari: storage chiama render, render usa storage)*
- **req. 9:** Export movimenti in Excel per intervallo date (SheetJS lato client, stesse colonne del CSV import)

---

## Note operative
- Dopo ogni sessione aggiornare **`note/SAL.txt`** con il nuovo SAL in cima allo storico
- Le feature approvate vanno aggiunte in coda a **`note/ChatGPT_requests.txt`**
- Il branch di lavoro è `develop` → merge su `main` per il deploy
