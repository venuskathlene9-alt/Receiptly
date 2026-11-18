import {
  addDays, differenceInCalendarDays, endOfMonth, endOfWeek, format, parseISO,
  startOfDay, startOfMonth, startOfWeek,
} from 'date-fns';

function getBounds(range, now) {
  if (range === 'today') return [startOfDay(now), startOfDay(now)];
  if (range === 'week') return [startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })];
  if (range === 'year') return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), 11, 31)];
  return [startOfMonth(now), endOfMonth(now)];
}

export function filterReportExpenses(expenses, { range, category, customStart, customEnd, now }) {
  const [start, end] = range === 'custom'
    ? [customStart || '', customEnd || format(now, 'yyyy-MM-dd')]
    : getBounds(range, now).map((date) => format(date, 'yyyy-MM-dd'));

  return expenses.filter((expense) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expense.expense_date || '')) return false;
    return expense.expense_date >= start
      && expense.expense_date <= end
      && (!category || expense.category === category);
  });
}

export function buildReportTrend(records, { range, customStart, customEnd, now }) {
  if (range === 'year') {
    return Array.from({ length: 12 }, (_, index) => {
      const month = new Date(now.getFullYear(), index, 1);
      const monthKey = format(month, 'yyyy-MM');
      return {
        label: format(month, 'MMM'),
        amount: records
          .filter((expense) => expense.expense_date.startsWith(monthKey))
          .reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0),
      };
    });
  }

  let start;
  let end;
  if (range === 'custom') {
    start = customStart || records.reduce((earliest, expense) => (
      !earliest || expense.expense_date < earliest ? expense.expense_date : earliest
    ), '');
    end = customEnd || format(now, 'yyyy-MM-dd');
  } else {
    [start, end] = getBounds(range, now).map((date) => format(date, 'yyyy-MM-dd'));
  }
  if (!start || !end || start > end) return [];

  const periodStart = parseISO(start);
  const dayCount = differenceInCalendarDays(parseISO(end), periodStart) + 1;
  const bucketDays = Math.max(1, Math.ceil(dayCount / 31));
  const bucketCount = Math.ceil(dayCount / bucketDays);

  return Array.from({ length: bucketCount }, (_, index) => {
    const offset = index * bucketDays;
    const from = addDays(periodStart, offset);
    const to = addDays(from, Math.min(bucketDays - 1, dayCount - offset - 1));
    const fromKey = format(from, 'yyyy-MM-dd');
    const toKey = format(to, 'yyyy-MM-dd');
    return {
      label: format(from, dayCount > 31 ? 'MMM d' : 'd'),
      amount: records
        .filter((expense) => expense.expense_date >= fromKey && expense.expense_date <= toKey)
        .reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0),
    };
  });
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function createReportCsv(records, currency) {
  const rows = [
    ['Date', 'Store / Expense', 'Category', 'Payment method', 'Amount', 'Currency', 'Notes'],
    ...records.map((expense) => [
      expense.expense_date,
      expense.store_name,
      expense.category,
      expense.payment_method || '',
      expense.total_amount,
      expense.currency || currency,
      expense.notes || '',
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
}
