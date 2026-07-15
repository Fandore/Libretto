/* ============ BANK IMPORT — FORMAT REGISTRY & PARSERS ============ */
import * as XLSX from 'xlsx';

/**
 * Parse an amount value that can be:
 *  - a JS number (from Excel raw cells): already a float, return as-is
 *  - an Italian-formatted string (from CSV or Excel formatted): "-3,90", "+2.682,84"
 */
function parseITAmount(val) {
  if (typeof val === 'number') return val; // Excel numeric cell — no parsing needed
  if (!val && val !== 0) return 0;
  // Italian format: dots = thousand separator, comma = decimal → remove dots, swap comma
  const s = String(val).replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(s) || 0;
}

/** Convert various date formats → YYYY-MM-DD */
function itDateToISO(str) {
  if (!str && str !== 0) return '';
  const s = String(str).trim();
  let m;
  // DD/MM/YYYY or D/M/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // Already YYYY-MM-DD
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  return '';
}

/**
 * Extract merchant/payee name from ING DESCRIZIONE OPERAZIONE field.
 * Each CAUSALE type has a different description format.
 */
function extractPayeeING(causale, desc) {
  const d = String(desc || '');
  switch ((causale || '').trim()) {
    case 'Pagamento Carta': {
      // "...presso NOME_ESERCENTE - Transazione C-less" or "...presso NOME_ESERCENTE"
      const m = d.match(/presso\s+(.+?)(?:\s+-\s+Transazione|\s*$)/i);
      return m ? m[1].trim() : d.slice(0, 50).trim();
    }
    case 'Addebito Diretto': {
      // "Creditor id. XXXX NOME_CREDITORE Id Mandato ..."
      const m = d.match(/Creditor id\.\s+\S+\s+(.+?)\s+Id Mandato/i);
      return m ? m[1].trim() : d.slice(0, 50).trim();
    }
    case 'Bonifico In Uscita': {
      // "...A favore di NOME IBAN beneficiario ..."
      const m = d.match(/A favore di\s+(.+?)(?:\s+IBAN|\s*$)/i);
      return m ? m[1].trim() : d.slice(0, 50).trim();
    }
    case 'Accredito Bonifico': {
      // "...Anagrafica Ordinante NOME Note: ..."
      const m = d.match(/Anagrafica Ordinante\s+(.+?)(?:\s+Note:|\s*$)/i);
      return m ? m[1].trim() : d.slice(0, 50).trim();
    }
    default:
      return ((causale && causale.trim()) || d.slice(0, 50)).trim();
  }
}

/**
 * Convert CSV text → array of arrays.
 * ING uses plain semicolons, no quoting needed.
 */
function csvToRows(text) {
  text = text.replace(/^[\uFEFF\uFFFE]+/, ''); // strip BOM
  return text.split(/\r?\n/).map(l => l.trimEnd().split(';'));
}

/**
 * Convert comma-separated CSV text → array of arrays.
 * Used by IsyBank (comma delimiter, no field quoting in practice).
 */
function csvToRowsComma(text) {
  text = text.replace(/^[\uFEFF\uFFFE]+/, ''); // strip BOM
  return text.split(/\r?\n/).map(l => l.split(','));
}

/**
 * Convert Excel ArrayBuffer → array of arrays via SheetJS.
 * Uses cellDates:true so date cells become JS Date objects.
 * Date objects are then converted to DD/MM/YYYY strings (same as ING CSV).
 * All other cells keep their raw type (numbers stay numbers, strings stay strings).
 */
function xlsxToRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
  return raw.map(row => row.map(cell => {
    if (cell instanceof Date) {
      const d = String(cell.getDate()).padStart(2, '0');
      const m = String(cell.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${cell.getFullYear()}`; // → DD/MM/YYYY
    }
    return cell; // numbers and strings passed through unchanged
  }));
}

/**
 * Core ING row parser — works on array-of-arrays from either CSV or XLSX.
 * Detects column indices dynamically from the header row.
 */
function parseINGRows(allRows) {
  const headerIdx = allRows.findIndex(row => {
    const cell = String(row[0] || '').replace(/[\uFEFF\uFFFE\u200B]/g, '').trim();
    return cell === 'DATA CONTABILE';
  });
  if (headerIdx < 0) {
    return { rows: [], errors: ['Intestazione CSV/Excel non trovata. Verifica che sia un file esportato da ING (Lista Transazioni).'] };
  }

  // Detect column positions dynamically — robust to extra/reordered columns
  const hdr = allRows[headerIdx].map(h => String(h || '').replace(/[\uFEFF]/g, '').trim().toUpperCase());
  const iContabile   = hdr.findIndex(h => h === 'DATA CONTABILE');
  const iValuta      = hdr.findIndex(h => h === 'DATA VALUTA');
  const iUscite      = hdr.findIndex(h => h === 'USCITE');
  const iEntrate     = hdr.findIndex(h => h === 'ENTRATE');
  const iImporto     = hdr.findIndex(h => h.includes('IMPORTO'));   // Excel: "IMPORTO IN EURO"
  const iCausale     = hdr.findIndex(h => h === 'CAUSALE');
  const iDescrizione = hdr.findIndex(h => h.includes('DESCRIZIONE'));

  // CSV has USCITE+ENTRATE; Excel has a single IMPORTO column — at least one must exist
  if (iCausale < 0 || (iUscite < 0 && iEntrate < 0 && iImporto < 0)) {
    return { rows: [], errors: [`Colonne ING non trovate. Header letto: "${hdr.join(' | ')}"`] };
  }

  const rows = [];
  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const cols = allRows[i];
    if (!cols || cols.every(c => String(c || '').trim() === '')) continue;

    const causale = String(cols[iCausale] || '').trim();
    if (!causale) continue; // skip "Saldo iniziale" / "Saldo finale"

    const dateRaw = cols[iValuta >= 0 ? iValuta : iContabile];
    const dateISO = itDateToISO(dateRaw) || itDateToISO(cols[iContabile]);
    if (!dateISO) continue;

    let amount, type;
    if (iImporto >= 0 && cols[iImporto] !== undefined && cols[iImporto] !== '') {
      // Excel format: single signed amount column (negative = uscita, positive = entrata)
      const val = parseITAmount(cols[iImporto]);
      if (!val) continue;
      amount = Math.abs(val);
      type = val < 0 ? 'out' : 'in';
    } else {
      // CSV format: separate USCITE / ENTRATE columns
      const rawOut = (iUscite >= 0 && cols[iUscite] !== undefined && cols[iUscite] !== '') ? cols[iUscite] : null;
      const rawIn  = (iEntrate >= 0 && cols[iEntrate] !== undefined && cols[iEntrate] !== '') ? cols[iEntrate] : null;
      if (rawOut !== null) {
        amount = Math.abs(parseITAmount(rawOut));
        type = 'out';
      } else if (rawIn !== null) {
        amount = Math.abs(parseITAmount(rawIn));
        type = 'in';
      } else {
        continue;
      }
    }
    if (!amount) continue;

    const desc  = String(cols[iDescrizione >= 0 ? iDescrizione : 5] || '').trim();
    const payee = extractPayeeING(causale, desc);
    rows.push({ date: dateISO, amount, type, payee, causale, rawDescription: desc });
  }

  if (!rows.length) {
    // Diagnostic: show raw values of first data row to help debug
    const sample = allRows[headerIdx + 1] || [];
    const diag = hdr.map((h, i) => `${h}=${JSON.stringify(sample[i])}`).join(' | ');
    return { rows: [], errors: [`Nessun movimento trovato. Diagnosi prima riga: ${diag}`] };
  }
  return { rows, errors: [] };
}

/**
 * Parse ING Italia CSV or XLSX export.
 * @param {string|ArrayBuffer} data  — string for CSV, ArrayBuffer for XLSX
 */
function parseING(data) {
  const allRows = (typeof data === 'string') ? csvToRows(data) : xlsxToRows(data);
  return parseINGRows(allRows);
}

/* ============ IsyBank ============ */

/**
 * Mapping from IsyBank category labels (lowercased) to Libretto default category names.
 * main.js uses this via fmt.categoryMap when building enriched rows.
 */
const ISYBANK_CATEGORY_MAP = {
  'ristoranti e bar':                 'Ristoranti',
  'generi alimentari e supermercato': 'Spesa',
  'farmacia':                         'Salute',
  'salute e benessere':               'Salute',
  'trasporti':                        'Trasporti',
  'casa':                             'Casa',
  'bollette':                         'Bollette',
  'bollette e utenze':                'Bollette',
  'svago':                            'Svago',
  'tempo libero':                     'Svago',
  'abbonamenti':                      'Abbonamenti',
  'abbonamenti e servizi':            'Abbonamenti',
  'stipendio':                        'Stipendio',
  'lavoro':                           'Stipendio',
  'risparmi':                         'Risparmi',
  'altra entrata':                    'Altro',
  'altre uscite':                     'Altro',
  'altro':                            'Altro',
};

/**
 * Core IsyBank row parser — works on array-of-arrays from either CSV or XLSX.
 * Expected header: Data | Operazione | Dettagli | Conto o carta | Contabilizzazione | Categoria | Valuta | Importo
 * Amounts are plain JS-style floats (dot decimal, signed). Negative = expense.
 */
function parseIsyBankRows(allRows) {
  const headerIdx = allRows.findIndex(row => {
    const cell = String(row[0] || '').replace(/[\uFEFF\uFFFE\u200B]/g, '').trim();
    return cell === 'Data';
  });
  if (headerIdx < 0) {
    return { rows: [], errors: ['Intestazione non trovata. Verifica che sia un file esportato da IsyBank (Lista Operazioni).'] };
  }

  const hdr = allRows[headerIdx].map(h => String(h || '').replace(/[\uFEFF]/g, '').trim().toUpperCase());
  const iData = hdr.findIndex(h => h === 'DATA');
  const iOper = hdr.findIndex(h => h === 'OPERAZIONE');
  const iDet  = hdr.findIndex(h => h === 'DETTAGLI');
  const iCat  = hdr.findIndex(h => h === 'CATEGORIA');
  const iImp  = hdr.findIndex(h => h === 'IMPORTO');

  if (iData < 0 || iOper < 0 || iImp < 0) {
    return { rows: [], errors: [`Colonne IsyBank non trovate. Header letto: "${hdr.join(' | ')}"`] };
  }

  const rows = [];
  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const cols = allRows[i];
    if (!cols || cols.every(c => String(c || '').trim() === '')) continue;

    const dateISO = itDateToISO(cols[iData]);
    if (!dateISO) continue;

    // Amounts: JS number (from Excel) or plain float string (from CSV, dot decimal)
    const rawAmt = cols[iImp];
    const val = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt || '').trim());
    if (!val || isNaN(val)) continue;

    const payee = String(cols[iOper] || '').trim();
    if (!payee) continue;

    const amount = Math.abs(val);
    const type = val < 0 ? 'out' : 'in';
    const categoryHint = iCat >= 0 ? String(cols[iCat] || '').trim() : '';
    const rawDescription = iDet >= 0 ? String(cols[iDet] || '').trim() : '';

    rows.push({ date: dateISO, amount, type, payee, categoryHint, rawDescription });
  }

  if (!rows.length) {
    const sample = allRows[headerIdx + 1] || [];
    const diag = hdr.map((h, i) => `${h}=${JSON.stringify(sample[i])}`).join(' | ');
    return { rows: [], errors: [`Nessun movimento trovato. Diagnosi prima riga: ${diag}`] };
  }
  return { rows, errors: [] };
}

/**
 * Parse IsyBank CSV or XLSX export.
 * @param {string|ArrayBuffer} data — string for CSV, ArrayBuffer for XLSX
 */
function parseIsyBank(data) {
  const allRows = (typeof data === 'string') ? csvToRowsComma(data) : xlsxToRows(data);
  return parseIsyBankRows(allRows);
}

/* -------- Public API -------- */

/**
 * Registry of supported bank formats.
 * To add a new bank: push an entry with { id, label, accept, parse }.
 * parse(data) receives a string (CSV) or ArrayBuffer (XLSX/XLS).
 */
export const BANK_FORMATS = [
  { id: 'ing',     label: 'ING Italia', accept: '.csv,.xlsx,.xls,text/csv', parse: parseING },
  { id: 'isybank', label: 'IsyBank',    accept: '.csv,.xlsx,.xls,text/csv', parse: parseIsyBank, categoryMap: ISYBANK_CATEGORY_MAP }
];

/**
 * Parse a bank file. data is string (CSV) or ArrayBuffer (Excel).
 */
export function parseBankFile(formatId, data) {
  const fmt = BANK_FORMATS.find(f => f.id === formatId);
  if (!fmt) return { rows: [], errors: [`Formato "${formatId}" non supportato.`] };
  return fmt.parse(data);
}
