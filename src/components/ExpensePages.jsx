import { useMemo, useState } from 'react';
import { ArrowDownUp, ArrowRight, Check, ChevronDown, Filter, Plus, Receipt, Search, Settings, Wallet, X } from 'lucide-react';
import { CATEGORIES, categoryColor, money, shortDate } from '../utils/format.js';
import { validateImage } from '../services/expenseService.js';
import { EMPTY_EXPENSE } from '../utils/expenseDefaults.js';
import { EmptyState } from './Dashboard.jsx';

export function ExpensesPage({ expenses, currency, onEdit, onDelete, onAdd }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const filtered = useMemo(() => expenses.filter((item) =>
    (item.store_name || '').toLowerCase().includes(query.toLowerCase())
    && (!category || item.category === category),
  ).filter((item) =>
    (!startDate || item.expense_date >= startDate)
    && (!endDate || item.expense_date <= endDate),
  ).sort((a, b) => {
    if (sort === 'oldest') return a.expense_date.localeCompare(b.expense_date);
    if (sort === 'highest') return Number(b.total_amount) - Number(a.total_amount);
    if (sort === 'lowest') return Number(a.total_amount) - Number(b.total_amount);
    return b.expense_date.localeCompare(a.expense_date);
  }), [expenses, query, category, sort, startDate, endDate]);
  return (
    <div className="list-page">
      <div className="page-toolbar"><div><span className="record-count">{filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}</span><span className="toolbar-sub"> · Personal records</span></div><button className="button button-primary" onClick={onAdd}><Plus size={16} /> Add expense</button></div>
      <div className="filter-bar"><label className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by store or expense" /></label><label className="select-filter"><Filter size={15} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><label className="select-filter"><ArrowDownUp size={15} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select><ChevronDown size={14} /></label><label className="date-filter">From<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label className="date-filter">To<input type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label></div>
      {filtered.length ? <div className="panel table-panel"><div className="table-scroll"><table className="data-table full-table"><thead><tr><th>EXPENSE</th><th>DATE</th><th>CATEGORY</th><th>PAYMENT</th><th className="align-right">AMOUNT</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{filtered.map((expense) => <tr key={expense.id}><td><div className="expense-name"><span className={`expense-dot ${expense.source === 'receipt_scan' ? 'receipt-dot' : ''}`}>{expense.source === 'receipt_scan' ? <Receipt size={15} /> : <Wallet size={15} />}</span><span><b>{expense.store_name || 'Untitled expense'}</b><small>{expense.source === 'receipt_scan' ? 'Scanned receipt' : 'Manual entry'}</small></span></div></td><td>{shortDate(expense.expense_date)}</td><td><span className="category-chip"><i style={{ background: categoryColor(expense.category) }} />{expense.category}</span></td><td className="muted-cell">{expense.payment_method || '—'}</td><td className="align-right amount-cell">{money(expense.total_amount, currency)}</td><td className="align-right action-cell"><button className="icon-button" onClick={() => onEdit(expense)} aria-label="Edit expense"><Settings size={16} /></button><button className="icon-button danger-icon" onClick={() => onDelete(expense)} aria-label="Delete expense"><X size={16} /></button></td></tr>)}</tbody></table></div></div> : <EmptyState title={query || category ? 'No matching expenses' : 'No expenses yet'} text={query || category ? 'Try another search or clear your filters.' : 'Add an expense or scan a receipt to start tracking.'} action={query || category ? null : 'Add an expense'} onAction={onAdd} />}
    </div>
  );
}

export function ExpenseModal({ values, currency, onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_EXPENSE, ...values });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function change(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    if (!form.store_name.trim()) return setError('Enter an expense or store name.');
    if (!form.expense_date) return setError('Choose an expense date.');
    if (!Number.isFinite(Number(form.total_amount)) || Number(form.total_amount) <= 0) return setError('Enter an amount greater than zero.');
    setSaving(true); setError('');
    try { await onSave({ ...form, store_name: form.store_name.trim(), total_amount: Number(form.total_amount), subtotal: form.subtotal === '' ? null : Number(form.subtotal), tax: form.tax === '' ? null : Number(form.tax), discount: form.discount === '' ? null : Number(form.discount), source: form.source || 'manual', currency }, file); }
    catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
        <div className="modal-heading">
          <div><span className="eyebrow">{form.id ? 'UPDATE YOUR RECORD' : 'NEW TRANSACTION'}</span><h2 id="expense-modal-title">{form.id ? 'Edit expense' : 'Add an expense'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="span-two">Store or expense name<input autoFocus required value={form.store_name} onChange={(e) => change('store_name', e.target.value)} placeholder="e.g. Coffee shop or electricity bill" /></label>
            <label>Expense date<input required type="date" value={form.expense_date || ''} onChange={(e) => change('expense_date', e.target.value)} /></label>
            <label>Receipt time<input type="time" value={form.expense_time || ''} onChange={(e) => change('expense_time', e.target.value)} /></label>
            <label>Total amount ({currency})<input required type="number" min="0.01" step="0.01" value={form.total_amount ?? ''} onChange={(e) => change('total_amount', e.target.value)} placeholder="0.00" /></label>
            <label>Subtotal<input type="number" min="0" step="0.01" value={form.subtotal ?? ''} onChange={(e) => change('subtotal', e.target.value)} placeholder="Optional" /></label>
            <label>Tax<input type="number" min="0" step="0.01" value={form.tax ?? ''} onChange={(e) => change('tax', e.target.value)} placeholder="Optional" /></label>
            <label>Discount<input type="number" min="0" step="0.01" value={form.discount ?? ''} onChange={(e) => change('discount', e.target.value)} placeholder="Optional" /></label>
            <label>Category<select value={form.category || 'Others'} onChange={(e) => change('category', e.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Payment method<select value={form.payment_method || ''} onChange={(e) => change('payment_method', e.target.value)}><option value="">Not specified</option>{['Cash', 'Debit card', 'Credit card', 'GCash', 'Maya', 'Bank transfer', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="span-two">Notes<textarea rows="3" value={form.notes || ''} onChange={(e) => change('notes', e.target.value)} placeholder="Anything you’d like to remember?" /></label>
            <label className="span-two optional-file"><span>Receipt image <small>(optional · JPG or PNG, up to 10 MB)</small></span><input type="file" accept="image/jpeg,image/png" onChange={(e) => { const selected = e.target.files?.[0]; if (selected) { try { validateImage(selected); setFile(selected); setError(''); } catch (validationError) { setError(validationError.message); } } }} /></label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? <><span className="button-loader" /> Saving…</> : <><Check size={16} /> Save expense</>}</button></div>
        </form>
      </section>
    </div>
  );
}
