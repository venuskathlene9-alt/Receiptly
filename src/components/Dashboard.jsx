import { lazy, Suspense } from 'react';
import {
  ArrowRight, ArrowUpRight, BarChart3, Camera, FileText, MoreHorizontal, Plus,
  Receipt, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import {
  format, isSameDay, isWithinInterval, startOfMonth, startOfWeek, subDays,
} from 'date-fns';
import { categoryColor, money, shortDate } from '../utils/format.js';

const DashboardSpendingChart = lazy(() => import('./Charts.jsx').then((module) => ({ default: module.DashboardSpendingChart })));
const DashboardCategoryChart = lazy(() => import('./Charts.jsx').then((module) => ({ default: module.DashboardCategoryChart })));

export default function Dashboard({ expenses, currency, profile, onNavigate, onEdit }) {
  const now = new Date();
  const todayExpenses = expenses.filter((item) => isSameDay(new Date(`${item.expense_date}T00:00:00`), now));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const weekExpenses = expenses.filter((item) => isWithinInterval(new Date(`${item.expense_date}T00:00:00`), { start: weekStart, end: now }));
  const monthExpenses = expenses.filter((item) => isWithinInterval(new Date(`${item.expense_date}T00:00:00`), { start: monthStart, end: now }));
  const sum = (items) => items.reduce((total, item) => total + Number(item.total_amount || 0), 0);
  const categoryTotals = expenses.reduce((acc, item) => { acc[item.category] = (acc[item.category] || 0) + Number(item.total_amount || 0); return acc; }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const avg = monthExpenses.length ? sum(monthExpenses) / Math.max(1, new Date().getDate()) : 0;
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = subDays(now, 6 - index);
    return { day: format(day, 'EEE'), amount: expenses.filter((item) => isSameDay(new Date(`${item.expense_date}T00:00:00`), day)).reduce((acc, item) => acc + Number(item.total_amount || 0), 0) };
  });
  const categories = Object.entries(categoryTotals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const recent = [...expenses].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at)).slice(0, 5);
  return (
    <div className="dashboard-page">
      <div className="welcome-strip"><div><span className="welcome-spark"><Sparkles size={17} /></span><span>Good to see you, <b>{profile?.full_name?.split(' ')[0] || 'there'}.</b> Here’s your spending at a glance.</span></div><span className="private-label"><ShieldCheck size={14} /> Saved on this browser</span></div>
      <div className="stat-grid">
        <StatCard label="Spent today" value={money(sum(todayExpenses), currency)} icon={<Wallet />} tint="blue" note={todayExpenses.length ? `${todayExpenses.length} transaction${todayExpenses.length > 1 ? 's' : ''}` : 'No expenses recorded today'} />
        <StatCard label="This week" value={money(sum(weekExpenses), currency)} icon={<TrendingUp />} tint="violet" note="Since Monday" />
        <StatCard label="This month" value={money(sum(monthExpenses), currency)} icon={<BarChart3 />} tint="green" note={format(now, 'MMMM yyyy')} />
        <StatCard label="Receipts saved" value={String(expenses.filter((item) => item.source === 'receipt_scan').length)} icon={<Receipt />} tint="amber" note={`${expenses.length} total expenses`} />
        <StatCard label="Average per day" value={money(avg, currency)} icon={<TrendingDown />} tint="blue" note={`Across ${format(now, 'MMMM')}`} />
        <StatCard label="Top category" value={topCategory?.[0] ?? '—'} icon={<Sparkles />} tint="violet" note={topCategory ? money(topCategory[1], currency) : 'Add expenses to see a pattern'} />
      </div>
      <div className="dashboard-toolbar"><div><h2>Your spending</h2><p>Based on your saved expenses</p></div><div className="toolbar-actions"><button className="button button-outline" onClick={() => onNavigate('/app/reports')}><BarChart3 size={16} /> View reports</button><button className="button button-primary" onClick={() => onNavigate('/app/scan')}><Camera size={16} /> Scan receipt</button></div></div>
      {expenses.length === 0 ? <EmptyState title="Your expense story starts here" text="Scan a receipt or add an expense manually. Your dashboard will fill in as you go." action="Add your first expense" onAction={() => onNavigate('/app/scan')} /> : (
        <div className="dashboard-grid">
          <article className="panel trend-panel">
            <div className="panel-heading"><div><h3>Daily spending</h3><p>Your last 7 days</p></div><span className="chart-legend"><i /> This week</span></div>
            <div className="chart-wrap"><Suspense fallback={<div className="chart-skeleton" />}><DashboardSpendingChart data={days} currency={currency} /></Suspense></div>
          </article>
          <article className="panel category-panel">
            <div className="panel-heading"><div><h3>By category</h3><p>Where your money goes</p></div><button className="icon-button" onClick={() => onNavigate('/app/reports')} aria-label="View all categories"><ArrowUpRight size={17} /></button></div>
            {categories.length ? <><div className="donut-wrap"><Suspense fallback={<div className="chart-skeleton chart-skeleton-donut" />}><DashboardCategoryChart categories={categories} currency={currency} topCategory={topCategory?.[0]} /></Suspense></div><div className="category-legend">{categories.slice(0, 3).map((item) => <div key={item.name}><span><i style={{ background: categoryColor(item.name) }} />{item.name}</span><b>{money(item.value, currency)}</b></div>)}</div></> : <div className="chart-empty">Add expenses to see your breakdown.</div>}
          </article>
          <article className="panel recent-panel">
            <div className="panel-heading"><div><h3>Recent expenses</h3><p>Your latest activity</p></div><button className="text-button" onClick={() => onNavigate('/app/expenses')}>See all <ArrowRight size={14} /></button></div>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Expense</th><th>Category</th><th>Date</th><th className="align-right">Amount</th><th /></tr></thead><tbody>{recent.map((expense) => <tr key={expense.id}><td><div className="expense-name"><span className={`expense-dot ${expense.source === 'receipt_scan' ? 'receipt-dot' : ''}`}>{expense.source === 'receipt_scan' ? <Receipt size={15} /> : <Wallet size={15} />}</span><b>{expense.store_name || 'Untitled expense'}</b></div></td><td><span className="category-chip"><i style={{ background: categoryColor(expense.category) }} />{expense.category}</span></td><td className="muted-cell">{shortDate(expense.expense_date)}</td><td className="align-right amount-cell">{money(expense.total_amount, currency)}</td><td><button className="icon-button row-action" aria-label="Edit expense" onClick={() => onEdit(expense)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>
          </article>
          <article className="side-summary">
            <div className="summary-card"><span className="summary-icon"><TrendingDown size={17} /></span><span className="summary-label">Average daily spend</span><strong>{money(avg, currency)}</strong><small>Across {format(now, 'MMMM')}</small></div>
            <div className="summary-callout"><span className="callout-decoration"><Sparkles size={17} /></span><span className="eyebrow">A GOOD HABIT</span><h3>Every expense tells a story.</h3><p>Keep adding your purchases to spot patterns and plan with confidence.</p><button className="text-button" onClick={() => onNavigate('/app/reports')}>Explore your reports <ArrowRight size={14} /></button></div>
          </article>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, tint, note }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tint}`}>{icon}</span></div><strong>{value}</strong><small>{note}</small></article>;
}

export function EmptyState({ title, text, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><FileText size={23} /></span><h3>{title}</h3><p>{text}</p>{action && <button className="button button-primary" onClick={onAction}><Plus size={16} /> {action}</button>}</div>;
}
