import { lazy, Suspense, useState } from 'react';
import { BarChart3, Download, Printer, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { CATEGORIES, categoryColor, money, shortDate } from '../utils/format.js';
import { buildReportTrend, createReportCsv, filterReportExpenses } from '../utils/reporting.js';
import { EmptyState } from './Dashboard.jsx';

const ReportTrendChart = lazy(() => import('./Charts.jsx').then((module) => ({ default: module.ReportTrendChart })));
const ReportDonutChart = lazy(() => import('./Charts.jsx').then((module) => ({ default: module.ReportDonutChart })));

export default function ReportsPage({ expenses, currency, profile, toast }) {
  const [range, setRange] = useState('month');
  const [category, setCategory] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const now = new Date();
  const records = filterReportExpenses(expenses, { range, category, customStart, customEnd, now });
  const total = records.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const byCategory = CATEGORIES
    .map((name) => ({
      name,
      value: records.filter((item) => item.category === name)
        .reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const trend = buildReportTrend(records, { range, customStart, customEnd, now });
  const periodLabel = range === 'today' ? format(now, 'MMMM d, yyyy')
    : range === 'week' ? 'This week'
      : range === 'month' ? format(now, 'MMMM yyyy')
        : range === 'year' ? String(now.getFullYear())
          : `${customStart || 'Any date'} – ${customEnd || 'Today'}`;
  function exportCsv() {
    const csv = createReportCsv(records, currency);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `receiptly-expenses-${format(now, 'yyyy-MM-dd')}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function printReport() {
    try {
      await import('./Charts.jsx');
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      window.print();
    } catch (error) {
      toast(`Could not prepare the report for printing: ${error.message}`, 'error');
    }
  }
  return (
    <div className="reports-page">
      <div className="report-controls">
        <div className="range-tabs">
          {[['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['custom', 'Custom']].map(([value, label]) => (
            <button key={value} className={range === value ? 'selected' : ''} onClick={() => setRange(value)}>{label}</button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="custom-dates">
            <label>
              From
              <input
                type="date"
                value={customStart}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomStart(value);
                  if (customEnd && value && customEnd < value) setCustomEnd(value);
                }}
              />
            </label>
            <label>To<input type="date" min={customStart || undefined} value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></label>
          </div>
        )}
        <div className="report-actions">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button className="button button-outline" onClick={exportCsv}><Download size={15} /> Export CSV</button>
          <button className="button button-primary" onClick={printReport}><Printer size={15} /> Print report</button>
        </div>
      </div>
      <div className="print-heading">
        <span className="brand"><span className="brand-mark"><Receipt size={17} /></span>receiptly</span>
        <span>Generated {format(now, 'MMMM d, yyyy')}</span>
      </div>
      <div className="report-summary panel">
        <div>
          <span className="eyebrow">EXPENSE SUMMARY · {periodLabel}</span>
          <h2>{money(total, currency)}</h2>
          <p>Total across {records.length} transaction{records.length === 1 ? '' : 's'}{profile?.full_name ? ` for ${profile.full_name}` : ''}</p>
        </div>
        <span className="report-summary-icon"><BarChart3 size={23} /></span>
        <div className="report-summary-details">
          <span><b>{records.length}</b> Transactions</span>
          <span><b>{byCategory.length}</b> Categories used</span>
        </div>
      </div>
      {records.length ? (
        <div className="reports-grid">
          <article className="panel report-trend">
            <div className="panel-heading"><div><h3>Spending trend</h3><p>{range === 'year' ? 'Month by month' : 'Day by day'}</p></div></div>
            <Suspense fallback={<div className="chart-skeleton" />}><ReportTrendChart data={trend} currency={currency} /></Suspense>
          </article>
          <article className="panel report-categories">
            <div className="panel-heading"><div><h3>Spending by category</h3><p>Share of your total expenses</p></div></div>
            <div className="report-donut">
              <Suspense fallback={<div className="chart-skeleton chart-skeleton-donut" />}><ReportDonutChart data={byCategory} currency={currency} total={total} /></Suspense>
            </div>
            <div className="report-legend">
              {byCategory.map((item) => (
                <div key={item.name}>
                  <span><i style={{ background: categoryColor(item.name) }} />{item.name}</span>
                  <b>{money(item.value, currency)}</b>
                  <small>{total ? `${(item.value / total * 100).toFixed(0)}%` : '0%'}</small>
                </div>
              ))}
            </div>
          </article>
          <article className="panel transactions-panel">
            <div className="panel-heading">
              <div><h3>Transactions</h3><p>Included in this report</p></div>
              <span className="record-count">{records.length} items</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>DATE</th><th>EXPENSE</th><th>CATEGORY</th><th className="align-right">AMOUNT</th></tr></thead>
                <tbody>
                  {records.map((item) => (
                    <tr key={item.id}>
                      <td>{shortDate(item.expense_date)}</td>
                      <td><b>{item.store_name || 'Untitled expense'}</b></td>
                      <td>{item.category}</td>
                      <td className="align-right amount-cell">{money(item.total_amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : <EmptyState title="No expenses in this period" text="Try another date range or add an expense to start your report." />}
    </div>
  );
}
