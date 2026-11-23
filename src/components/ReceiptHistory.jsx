import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, FileImage, Filter, MoreHorizontal, Receipt, Search } from 'lucide-react';
import { CATEGORIES, categoryColor, money, shortDate } from '../utils/format.js';
import { getReceiptUrl } from '../services/expenseService.js';
import { EmptyState } from './Dashboard.jsx';

export function HistoryPage({ expenses, currency, onEdit, onDelete }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const filtered = expenses.filter((item) =>
    (item.store_name || '').toLowerCase().includes(query.toLowerCase())
    && (!category || item.category === category)
    && (!startDate || item.expense_date >= startDate)
    && (!endDate || item.expense_date <= endDate),
  );
  return <div className="history-page"><div className="page-toolbar"><div><span className="record-count">{filtered.length} scanned receipts</span><span className="toolbar-sub"> · Synced to your account</span></div><div className="history-filters"><label className="search-field history-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipts" /></label><label className="select-filter history-category"><Filter size={15} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><label className="date-filter">From<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label className="date-filter">To<input type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label></div></div>{filtered.length ? <div className="receipt-grid">{filtered.map((item) => <ReceiptCard key={item.id} expense={item} currency={currency} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyState title={query || category || startDate || endDate ? 'No receipts match those filters' : 'No scanned receipts yet'} text={query || category || startDate || endDate ? 'Try a different search or date range.' : 'Scanned receipts that you confirm and save will appear here.'} />}</div>;
}

function ReceiptCard({ expense, currency, onEdit, onDelete }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl;
    if (expense.receipt_image_path) getReceiptUrl(expense.receipt_image_path).then((value) => {
      objectUrl = value;
      if (active) setUrl(value);
      else if (value) URL.revokeObjectURL(value);
    }).catch(() => { if (active) setFailed(true); });
    else setFailed(true);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [expense.receipt_image_path]);
  return <article className="receipt-card"><div className="receipt-thumb">{url && !failed ? <img src={url} alt={`${expense.store_name} receipt`} onError={() => setFailed(true)} /> : <span><FileImage size={26} /></span>}<span className="receipt-thumb-tag"><Receipt size={12} /> RECEIPT</span></div><div className="receipt-card-body"><div className="receipt-card-title"><div><b>{expense.store_name || 'Untitled receipt'}</b><small>{shortDate(expense.expense_date)}</small></div><button className="icon-button" onClick={() => onDelete(expense)} aria-label="Delete receipt"><MoreHorizontal size={18} /></button></div><div className="receipt-card-footer"><span className="category-chip"><i style={{ background: categoryColor(expense.category) }} />{expense.category}</span><strong>{money(expense.total_amount, currency)}</strong></div><button className="receipt-details-button" onClick={() => onEdit(expense)}>View details <ArrowRight size={14} /></button></div></article>;
}

export function StoredImage({ path, alt }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl;
    getReceiptUrl(path).then((value) => {
      objectUrl = value;
      if (active) setUrl(value);
      else if (value) URL.revokeObjectURL(value);
    }).catch(() => {
      if (active) setUrl('');
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return url ? <img src={url} alt={alt} /> : null;
}
