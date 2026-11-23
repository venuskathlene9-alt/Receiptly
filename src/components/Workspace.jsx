import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, Camera, Clock3, LayoutDashboard, LogOut, Menu, MoreHorizontal,
  Plus, Receipt, Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { deleteExpense, listExpenses, saveExpense } from '../services/expenseService.js';
import Dashboard from './Dashboard.jsx';
import ReportsPage from './ReportsPage.jsx';
import { EMPTY_EXPENSE } from '../utils/expenseDefaults.js';
import { ExpenseModal, ExpensesPage } from './ExpensePages.jsx';
import { ProfilePage, SettingsPage } from './AccountPages.jsx';
import { HistoryPage, StoredImage } from './ReceiptHistory.jsx';
import { ScanPage } from './ReceiptScanner.jsx';

export default function Workspace({ userId, userEmail, profile, onProfileUpdate, onSignOut, toast }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [modal, setModal] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const currency = profile?.currency ?? 'PHP';
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setExpenses(await listExpenses(userId)); }
    catch (error) { toast(`Couldn't load your expenses: ${error.message}`, 'error'); }
    finally { setLoading(false); }
  }, [userId, toast]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { setMobileMenu(false); }, [location.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = profile?.theme === 'dark' ? 'dark' : 'light';
  }, [profile?.theme]);

  async function handleSaveExpense(values, file) {
    try {
      const { storageCleanupError } = await saveExpense(userId, values, file, values.receipt_image_path);
      await refresh();
      toast(
        storageCleanupError
          ? `Expense saved, but its previous image could not be removed: ${storageCleanupError.message}`
          : values.id ? 'Expense updated.' : 'Expense saved.',
        storageCleanupError ? 'error' : 'success',
      );
      setModal(null);
      if (location.pathname.endsWith('/scan')) navigate('/app/expenses');
    } catch (error) { toast(`Couldn't save expense: ${error.message}`, 'error'); throw error; }
  }

  async function handleDelete(expense) {
    if (!window.confirm(`Delete "${expense.store_name || 'this expense'}"? This cannot be undone.`)) return;
    try {
      const { storageCleanupError } = await deleteExpense(userId, expense);
      await refresh();
      toast(storageCleanupError ? `Expense deleted, but its image could not be removed: ${storageCleanupError.message}` : 'Expense deleted.', storageCleanupError ? 'error' : 'success');
    }
    catch (error) { toast(`Couldn't delete expense: ${error.message}`, 'error'); }
  }

  const navItems = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/scan', label: 'Scan receipt', icon: Camera },
    { to: '/app/expenses', label: 'My expenses', icon: Wallet },
    { to: '/app/reports', label: 'Reports', icon: BarChart3 },
    { to: '/app/history', label: 'Receipt history', icon: Receipt },
  ];
  const pageTitles = {
    '/app': ['Dashboard', 'Here’s what’s happening with your spending.'],
    '/app/scan': ['Scan receipt', 'Turn a paper receipt into a ready-to-review expense.'],
    '/app/expenses': ['My expenses', 'Your everyday spending, all in one place.'],
    '/app/reports': ['Reports & analytics', 'Understand your spending with a little more clarity.'],
    '/app/history': ['Receipt history', 'Find and revisit your scanned receipts.'],
    '/app/profile': ['My profile', 'Manage your personal information.'],
    '/app/settings': ['Settings', 'Make Receiptly work the way you do.'],
  };
  const title = pageTitles[location.pathname] ?? pageTitles['/app'];
  const avatarLetter = (profile?.full_name || userEmail || 'G').charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <Link to="/app" className="brand sidebar-brand"><span className="brand-mark"><Receipt size={20} /></span>receiptly</Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          <span className="nav-caption">OVERVIEW</span>
          {navItems.slice(0, 1).map((item) => <SideItem key={item.to} {...item} />)}
          <span className="nav-caption nav-caption-spaced">YOUR MONEY</span>
          {navItems.slice(1).map((item) => <SideItem key={item.to} {...item} />)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="avatar">{profile?.avatar_url ? <StoredImage path={profile.avatar_url} alt="" /> : avatarLetter}</div>
            <div className="sidebar-user"><b>{profile?.full_name || 'My workspace'}</b><small>Receipts synced to your account</small></div>
            <button aria-label="Account options" className="icon-button" onClick={() => navigate('/app/profile')}><MoreHorizontal size={19} /></button>
          </div>
        </div>
      </aside>
      {mobileMenu && <button className="mobile-backdrop" onClick={() => setMobileMenu(false)} aria-label="Close menu" />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="topbar-heading"><h1>{title[0]}</h1><p>{title[1]}</p></div>
          <div className="topbar-right">
            <span className="topbar-date"><Clock3 size={14} /> {format(new Date(), 'EEE, MMM d')}</span>
            <button className="button button-primary topbar-add" onClick={() => setModal({ type: 'expense', values: { ...EMPTY_EXPENSE } })}><Plus size={16} /> Add expense</button>
            <button className="topbar-avatar avatar" onClick={() => navigate('/app/profile')} aria-label="Open profile">{profile?.avatar_url ? <StoredImage path={profile.avatar_url} alt="" /> : avatarLetter}</button>
            <button className="icon-button" onClick={onSignOut} aria-label={`Sign out${userEmail ? ` ${userEmail}` : ''}`} title="Sign out"><LogOut size={17} /></button>
          </div>
        </header>
        <section className="page-content">
          {loading && <div className="data-loading"><span className="loader" /> Loading your records…</div>}
          <Routes>
            <Route index element={<Dashboard expenses={expenses} currency={currency} profile={profile} onNavigate={navigate} onEdit={(expense) => setModal({ type: 'expense', values: expense })} />} />
            <Route path="scan" element={<ScanPage onSave={handleSaveExpense} toast={toast} currency={currency} />} />
            <Route path="expenses" element={<ExpensesPage expenses={expenses} currency={currency} onEdit={(expense) => setModal({ type: 'expense', values: expense })} onDelete={handleDelete} onAdd={() => setModal({ type: 'expense', values: { ...EMPTY_EXPENSE } })} />} />
            <Route path="reports" element={<ReportsPage expenses={expenses} currency={currency} profile={profile} toast={toast} />} />
            <Route path="history" element={<HistoryPage expenses={expenses.filter((expense) => expense.source === 'receipt_scan')} currency={currency} onEdit={(expense) => setModal({ type: 'expense', values: expense })} onDelete={handleDelete} />} />
            <Route path="profile" element={<ProfilePage userId={userId} profile={profile} onUpdate={onProfileUpdate} toast={toast} />} />
            <Route path="settings" element={<SettingsPage userId={userId} profile={profile} onUpdate={onProfileUpdate} toast={toast} hasExpenses={loading || expenses.length > 0} />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </section>
      </main>
      {modal?.type === 'expense' && <ExpenseModal values={modal.values} currency={currency} onClose={() => setModal(null)} onSave={handleSaveExpense} />}
    </div>
  );
}

function SideItem({ to, label, icon: Icon, end }) {
  return <NavLink to={to} end={end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Scan receipt' && <span className="new-tag">NEW</span>}</NavLink>;
}
