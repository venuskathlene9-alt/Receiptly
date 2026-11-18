import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReportTrend, createReportCsv, filterReportExpenses } from '../src/utils/reporting.js';

const now = new Date(2026, 5, 15, 12);
const expenses = [
  { expense_date: '2025-12-01', category: 'Groceries', total_amount: 10 },
  { expense_date: '2026-06-01', category: 'Groceries', total_amount: 20 },
  { expense_date: '2026-06-15', category: 'Food & Drinks', total_amount: 30 },
  { expense_date: '2026-06-16', category: 'Groceries', total_amount: 40 },
];

test('open-ended custom reports include history through today, not future expenses', () => {
  const records = filterReportExpenses(expenses, {
    range: 'custom', category: '', customStart: '', customEnd: '', now,
  });
  assert.deepEqual(records.map((expense) => expense.expense_date), [
    '2025-12-01', '2026-06-01', '2026-06-15',
  ]);
  assert.equal(buildReportTrend(records, {
    range: 'custom', customStart: '', customEnd: '', now,
  }).reduce((sum, point) => sum + point.amount, 0), 60);
});

test('custom date and category filters constrain both records and chart totals', () => {
  const records = filterReportExpenses(expenses, {
    range: 'custom', category: 'Groceries', customStart: '2026-06-01', customEnd: '2026-06-15', now,
  });
  assert.deepEqual(records.map((expense) => expense.total_amount), [20]);
  assert.equal(buildReportTrend(records, {
    range: 'custom', customStart: '2026-06-01', customEnd: '2026-06-15', now,
  }).reduce((sum, point) => sum + point.amount, 0), 20);
});

test('long custom trends bucket without dropping or including out-of-range days', () => {
  const records = [
    { expense_date: '2026-01-01', total_amount: 1 },
    { expense_date: '2026-02-14', total_amount: 45 },
  ];
  const trend = buildReportTrend(records, {
    range: 'custom', customStart: '2026-01-01', customEnd: '2026-02-14', now,
  });
  assert.equal(trend.length, 23);
  assert.equal(trend.reduce((sum, point) => sum + point.amount, 0), 46);
  assert.equal(trend.at(-1).label, 'Feb 14');
});

test('year trends contain all months with totals from the selected year', () => {
  const records = filterReportExpenses(expenses, {
    range: 'year', category: '', customStart: '', customEnd: '', now,
  });
  const trend = buildReportTrend(records, { range: 'year', customStart: '', customEnd: '', now });
  assert.equal(trend.length, 12);
  assert.equal(trend[5].amount, 90);
});

test('CSV escapes formula cells and quotes commas, quotes, and line breaks', () => {
  const csv = createReportCsv([{
    expense_date: '2026-06-15',
    store_name: '=2+2',
    category: 'Others',
    payment_method: 'Card',
    total_amount: 12.5,
    notes: 'first line, "quoted"\nsecond line',
  }], 'PHP');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes(`,"'=2+2",`));
  assert.ok(csv.includes('"first line, ""quoted""\nsecond line"'));
});
