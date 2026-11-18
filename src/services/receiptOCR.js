import { createWorker } from 'tesseract.js';
import { CATEGORIES } from '../utils/format.js';

const categoryHints = {
  'Food & Drinks': ['restaurant', 'cafe', 'coffee', 'food', 'dining', 'pizza', 'burger'],
  Groceries: ['supermarket', 'grocery', 'market', 'sm supermarket', 'puregold'],
  Transportation: ['gas', 'fuel', 'taxi', 'grab', 'jeep', 'transit', 'parking'],
  Shopping: ['mall', 'department', 'clothing', 'store', 'shop'],
  'Bills & Utilities': ['electric', 'electricity', 'water bill', 'internet', 'utility', 'power bill'],
  Healthcare: ['pharmacy', 'drugstore', 'medical', 'clinic', 'hospital'],
  Education: ['school', 'university', 'bookstore', 'tuition'],
  Entertainment: ['cinema', 'movie', 'theater', 'game'],
  'Personal Care': ['salon', 'barber', 'beauty', 'spa'],
};

export function suggestCategory(text) {
  const normalized = text.toLowerCase();
  const found = Object.entries(categoryHints)
    .map(([category, hints]) => ({ category, score: hints.filter((hint) => normalized.includes(hint)).length }))
    .sort((a, b) => b.score - a.score)[0];
  return found?.score ? found.category : CATEGORIES.at(-1);
}

function parseAmount(value) {
  const normalized = value.replace(/[^\d.,]/g, '').replace(/,(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function findTotal(lines) {
  const labeledTotal = findLabeledAmount(
    lines,
    /\b(?:grand\s+total|bill\s+amount|amount\s+due|total\s+due|balance\s+due|net\s+total|amount\s+paid|gross\s+amount)\b/,
  );
  if (labeledTotal !== null) return labeledTotal;

  const totalLine = findLabeledAmount(lines, /\btotal\b(?!\s*(?:qty|quantity|items?))/);
  if (totalLine !== null) return totalLine;

  const candidates = [];
  const amountPattern = /(?:₱|PHP|P\s?)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b/gi;
  lines.forEach((line, index) => {
    const normalized = line.toLowerCase();
    if (/\b(?:bill|receipt|invoice|serial|reference|transaction|trans|permit|tin|terminal)\s*(?:no|number|#)\b/.test(normalized)) return;
    for (const match of line.matchAll(amountPattern)) {
      const amount = parseAmount(match[1]);
      if (amount === null) continue;
      let score = 0;
      if (/\b(grand total|amount due|total due|balance due|total|amount paid|net total)\b/.test(normalized)) score += 5;
      if (/\b(subtotal|tax|vat|change|cash|tendered|discount|quantity|qty)\b/.test(normalized)) score -= 4;
      if (/₱|php/.test(normalized)) score += 0.5;
      if (index >= lines.length - 5) score += 0.5;
      candidates.push({ amount, score, index });
    }
  });
  candidates.sort((a, b) => b.score - a.score || b.index - a.index);
  return candidates[0]?.amount ?? null;
}

function findLabeledAmount(lines, labelPattern) {
  for (const line of lines) {
    if (!labelPattern.test(line.toLowerCase())) continue;
    const amount = [...line.matchAll(/(?:₱|PHP|P\s?)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\b/gi)].at(-1)?.[1];
    if (amount) return parseAmount(amount);
  }
  return null;
}

function findDate(lines) {
  const text = lines.join(' ');
  const numeric = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (numeric) return `${numeric[1]}-${numeric[2].padStart(2, '0')}-${numeric[3].padStart(2, '0')}`;
  const alternate = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (alternate) {
    const first = Number(alternate[1]);
    const second = Number(alternate[2]);
    const [month, day] = first > 12 ? [second, first] : [first, second];
    return `${alternate[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function scanReceipt(file, onProgress = () => {}) {
  const worker = await createWorker('eng', 1, {
    logger: (event) => {
      if (event.status === 'recognizing text') onProgress(Math.round(event.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(file);
    const lines = data.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const firstLine = data.lines?.[0];
    const storeName = firstLine?.confidence >= 35
      ? firstLine.text.replace(/[^a-z0-9 &'./-]/gi, '').trim()
      : '';
    const total = findTotal(lines);
    const subtotal = findLabeledAmount(lines, /\b(subtotal|sub total|vatable amount)\b/);
    const recognizedTax = findLabeledAmount(lines, /\b(tax|vat)\b(?!\s*[- ]?(?:exem|zero))/);
    const tax = recognizedTax !== null && (total === null || recognizedTax <= total) ? recognizedTax : null;
    const discount = findLabeledAmount(lines, /\b(discount|less)\b/);
    const dateLine = lines.find((line) => /\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/.test(line));
    const time = dateLine?.match(/\b([01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/)?.[0]?.slice(0, 5) ?? '';
    const payment = lines.find((line) => /\b(visa|mastercard|cash|debit|credit|gcash|maya)\b/i.test(line))?.match(/\b(visa|mastercard|cash|debit|credit|gcash|maya)\b/i)?.[0] ?? '';

    return {
      recognizedText: data.text,
      values: {
        store_name: storeName.slice(0, 120),
        expense_date: findDate(lines),
        expense_time: time,
        subtotal: subtotal ?? '',
        tax: tax ?? '',
        discount: discount ?? '',
        total_amount: total ?? '',
        category: suggestCategory(`${storeName}\n${data.text}`),
        payment_method: payment,
        notes: '',
      },
    };
  } finally {
    await worker.terminate();
  }
}
