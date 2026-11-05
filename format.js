import { format, parseISO } from 'date-fns';

export const CATEGORIES = [
  'Food & Drinks',
  'Groceries',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Entertainment',
  'Personal Care',
  'Others',
];

export const CATEGORY_COLORS = [
  '#4f7df3', '#24b47e', '#f5a623', '#9b7bf7', '#ef6a6a',
  '#21a8b8', '#e28b42', '#dd69a8', '#7b8b9b', '#a8b1bd',
];

export const CURRENCIES = [
  { code: 'PHP', label: 'Philippine Peso', locale: 'en-PH' },
  { code: 'USD', label: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', label: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CAD', label: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian Dollar', locale: 'en-AU' },
  { code: 'SGD', label: 'Singapore Dollar', locale: 'en-SG' },
];

export function money(value, currency = 'PHP') {
  const selected = CURRENCIES.find((item) => item.code === currency);
  return new Intl.NumberFormat(selected?.locale ?? 'en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function shortDate(value) {
  if (!value) return '—';
  try {
    return format(typeof value === 'string' ? parseISO(value) : value, 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function categoryColor(category) {
  const index = CATEGORIES.indexOf(category);
  return CATEGORY_COLORS[index < 0 ? CATEGORY_COLORS.length - 1 : index];
}
