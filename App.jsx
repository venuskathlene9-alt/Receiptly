import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowDownUp, ArrowRight, ArrowUpRight, BarChart3, Bell, Camera,
  Check, ChevronDown, CircleHelp, Clock3, CloudUpload, Download, FileImage,
  FileText, Filter, LayoutDashboard, Menu, MoreHorizontal, Plus, Printer, Receipt,
  Search, Settings, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Upload, UserRound,
  Eye, EyeOff, LogOut,
  Wallet, X, Zap,
} from 'lucide-react';
import {
  addDays, endOfDay, endOfMonth, endOfWeek, format, isSameDay, isWithinInterval, startOfDay,
  startOfMonth, startOfWeek, subDays,
} from 'date-fns';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CATEGORIES, CATEGORY_COLORS, CURRENCIES, categoryColor, money, shortDate } from './utils/format.js';
import { deleteExpense, deleteStoredImage, getProfile, getReceiptUrl, listExpenses, saveExpense, updateProfile, uploadAvatar, validateImage } from './services/expenseService.js';
import { getLocalSession, registerLocalAccount, signInLocalAccount, signOutLocalAccount } from './services/localAuth.js';

const DashboardSpendingChart = lazy(() => import('./components/Charts.jsx').then((module) => ({ default: module.DashboardSpendingChart })));
const DashboardCategoryChart = lazy(() => import('./components/Charts.jsx').then((module) => ({ default: module.DashboardCategoryChart })));
const ReportTrendChart = lazy(() => import('./components/Charts.jsx').then((module) => ({ default: module.ReportTrendChart })));
const ReportDonutChart = lazy(() => import('./components/Charts.jsx').then((module) => ({ default: module.ReportDonutChart })));

const EMPTY_EXPENSE = {
  store_name: '', expense_date: format(new Date(), 'yyyy-MM-dd'), expense_time: '',
  subtotal: '', tax: '', discount: '', total_amount: '', category: 'Others',
  payment_method: '', notes: '', source: 'manual',
};
function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const navigate = useNavigate();
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 3800);
  }, []);

  useEffect(() => {
    try { setUser(getLocalSession()); }
    catch (error) { showToast(`Could not restore your local sign-in: ${error.message}`, 'error'); }
    finally { setAuthReady(true); }
  }, [showToast]);

  useEffect(() => {
    if (!user) { setProfile(null); return undefined; }
    let active = true;
    getProfile(user.id)
      .then((currentProfile) => currentProfile.full_name
        ? currentProfile
        : updateProfile(user.id, { full_name: user.username }))
      .then((nextProfile) => { if (active) setProfile(nextProfile); })
      .catch((error) => showToast(`Could not load your workspace: ${error.message}`, 'error'));
    return () => { active = false; };
  }, [showToast, user]);

  function onProfileUpdate(next) { setProfile(next); }
  function onAuthenticated(account) { setUser(account); navigate('/app', { replace: true }); }
  function onSignOut() {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    try {
      signOutLocalAccount();
      setUser(null);
      setProfile(null);
      navigate('/login', { replace: true });
    } catch (error) {
      showToast(`Could not sign out: ${error.message}`, 'error');
    }
  }

  if (!authReady) return null;

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage user={user} />} />
        <Route path="/setup" element={<Navigate to={user ? '/app' : '/register'} replace />} />
        <Route path="/login" element={user ? <Navigate to="/app" replace /> : <AuthPage mode="login" onAuthenticated={onAuthenticated} />} />
        <Route path="/register" element={user ? <Navigate to="/app" replace /> : <AuthPage mode="register" onAuthenticated={onAuthenticated} />} />
        <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
        <Route path="/app/*" element={user
          ? <Workspace key={user.id} userId={user.id} username={user.username} profile={profile} onProfileUpdate={onProfileUpdate} onSignOut={onSignOut} toast={showToast} />
          : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.type === 'success' ? <Check size={17} /> : <CircleHelp size={17} />}{toast.message}</div>}
    </>
  );
}

function AuthPage({ mode, onAuthenticated }) {
  const creating = mode === 'register';
  const [username, setUsername] = useState(creating ? 'vening143' : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (creating && password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const account = creating
        ? await registerLocalAccount(username, password)
        : await signInLocalAccount(username, password);
      onAuthenticated(account);
    } catch (authError) {
      setError(authError.message || 'Could not complete local sign-in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" to="/"><span className="brand-mark"><Receipt size={21} /></span>receiptly</Link>
      <section className="auth-card">
        <div className="auth-heading">
          <span className="auth-badge"><UserRound size={20} /></span>
          <h1>{creating ? 'Create your local account' : 'Welcome back'}</h1>
          <p>{creating ? 'Set up a demo account saved only in this browser.' : 'Sign in to your local Receiptly workspace.'}</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>Username<input autoComplete="username" autoFocus value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={32} /></label>
          <label>Password<span className="auth-password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={creating ? 8 : undefined} /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          {creating && <label>Confirm password<span className="auth-password-field"><input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><button className="auth-password-toggle" type="button" onClick={() => setShowConfirmPassword((shown) => !shown)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword}>{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button>
        </form>
        <div className="auth-bottom">{creating ? 'Already have a local account?' : 'New to Receiptly?'} <Link to={creating ? '/login' : '/register'}>{creating ? 'Sign in' : 'Create account'} <ArrowRight size={13} /></Link></div>
        <Link className="auth-home" to="/">Back to home</Link>
      </section>
    </main>
  );
}

function LandingPage({ user }) {
  const workspacePath = user ? '/app' : '/register';
  const actionLabel = user ? 'Open dashboard' : 'Create local account';
  return (
    <div className="landing">
      <header className="landing-nav wrap">
        <Link className="brand" to="/"><span className="brand-mark"><Receipt size={21} /></span>receiptly</Link>
        <nav className="landing-links">
          <a href="#features">Features</a><a href="#how">How it works</a><a href="#about">About</a>
        </nav>
        <div className="nav-actions">
          <Link className="button button-quiet" to={workspacePath}>{actionLabel} <ArrowRight size={16} /></Link>
        </div>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="pill"><span className="pill-dot" /> YOUR MONEY, IN FOCUS</span>
            <h1>Your receipts.<br />Your expenses.<br /><span>All in one place.</span></h1>
            <p>Take control of your spending. Scan receipts, record expenses automatically, and see where your money goes.</p>
            <div className="hero-actions"><Link className="button button-primary button-large" to={workspacePath}>{user ? 'Open your workspace' : 'Create local account'} <ArrowRight size={17} /></Link><a className="button button-outline button-large" href="#how"><Zap size={16} /> See how it works</a></div>
            <div className="hero-proof"><div className="proof-avatars"><span>J</span><span>M</span><span>A</span><span>+</span></div><span>Built for a clearer view of everyday spending</span></div>
          </div>
          <div className="hero-art" aria-label="Receiptly expense dashboard preview">
            <div className="art-glow" />
            <div className="floating-receipt"><div className="receipt-head"><span className="receipt-mini-logo"><Receipt size={16} /></span><span>DAILY GOODS</span><MoreHorizontal size={17} /></div><div className="receipt-lines"><i /><i /><i /><i /></div><div className="receipt-total"><span>TOTAL PAID</span><strong>₱1,248.50</strong></div><span className="receipt-check"><Check size={17} /></span></div>
            <div className="preview-card">
              <span className="preview-demo-label">ILLUSTRATIVE PREVIEW</span>
              <div className="preview-top"><div><span className="preview-kicker">TOTAL SPENT THIS MONTH</span><strong>₱18,420<span>.00</span></strong></div><span className="preview-icon"><Wallet size={19} /></span></div>
              <div className="preview-change"><span><TrendingDown size={14} /> 8.4%</span> vs last month</div>
              <div className="preview-chart"><svg viewBox="0 0 360 112" role="img" aria-label="Example spending trend"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4678ef" stopOpacity=".22" /><stop offset="1" stopColor="#4678ef" stopOpacity="0" /></linearGradient></defs><path d="M0 79 C22 76 24 56 48 62 S81 87 100 69 S127 31 151 47 S183 69 202 54 S228 63 250 42 S277 18 294 36 S328 50 360 15 V112 H0Z" fill="url(#chartFill)" /><path d="M0 79 C22 76 24 56 48 62 S81 87 100 69 S127 31 151 47 S183 69 202 54 S228 63 250 42 S277 18 294 36 S328 50 360 15" fill="none" stroke="#4779ef" strokeWidth="3" strokeLinecap="round" /></svg><div className="chart-labels"><span>May 01</span><span>May 08</span><span>May 15</span><span>May 22</span><span>May 31</span></div></div>
              <div className="preview-expense"><span className="expense-icon groceries">◈</span><span><b>Market Basket</b><small>Groceries · Today</small></span><strong>−₱842.00</strong></div>
            </div>
            <div className="scan-float"><span><Sparkles size={16} /></span><div><b>Receipt scanned</b><small>Expense is ready to review</small></div><Check size={16} /></div>
          </div>
        </section>
        <section className="trust-strip"><div className="wrap trust-content"><span>ONE SIMPLE PLACE FOR YOUR</span><b><Receipt size={16} /> RECEIPTS</b><i /><b><BarChart3 size={16} /> SPENDING</b><i /><b><ShieldCheck size={16} /> PRIVATE DATA</b></div></section>
        <section id="features" className="section wrap">
          <div className="section-heading"><span className="eyebrow">LESS GUESSWORK, MORE CLARITY</span><h2>Small habits. <span>Big picture.</span></h2><p>From the moment you get a receipt to your end-of-month review, everything has a place.</p></div>
          <div className="feature-grid">
            <Feature icon={<Camera />} tint="blue" title="Smart receipt scanner" text="Upload or capture a receipt. OCR picks out the details so you can review them in seconds." />
            <Feature icon={<Wallet />} tint="green" title="Effortless expense log" text="Scanned and everyday expenses live together in one clear, searchable history." />
            <Feature icon={<BarChart3 />} tint="violet" title="Spending, explained" text="See daily trends, category breakdowns, and monthly reports based on your records." />
            <Feature icon={<Printer />} tint="amber" title="Reports that travel" text="Print a tidy summary or export your expense records to CSV whenever you need them." />
          </div>
        </section>
        <section id="how" className="how-section"><div className="wrap how-inner"><div><span className="eyebrow">GET STARTED IN MINUTES</span><h2>From paper to<br />peace of mind.</h2><p>Keep the process simple: scan, check, save. You stay in control of every expense.</p><Link className="button button-primary" to={workspacePath}>{user ? 'Open your workspace' : 'Create your local account'} <ArrowRight size={16} /></Link></div><div className="steps"><Step number="01" title="Create a local account" text="Choose your username and password. They stay in this browser." /><Step number="02" title="Scan or add an expense" text="Upload a receipt or enter an expense manually." /><Step number="03" title="Review and save" text="Check every detail before it becomes a record." /><Step number="04" title="See the bigger picture" text="Explore your spending with reports that update as you go." /></div></div></section>
        <section id="about" className="closing wrap"><span className="closing-icon"><Sparkles size={21} /></span><h2>A little more clarity,<br /><span>every single day.</span></h2><p>Start building a spending habit that works for you.</p><Link className="button button-primary button-large" to={workspacePath}>{user ? 'Open your dashboard' : 'Get started with a local account'} <ArrowRight size={17} /></Link></section>
      </main>
      <footer className="landing-footer"><div className="wrap footer-inner"><Link className="brand" to="/"><span className="brand-mark"><Receipt size={18} /></span>receiptly</Link><span>Scan. Track. Save.</span><span>© {new Date().getFullYear()} Receiptly</span></div></footer>
    </div>
  );
}

function Feature({ icon, tint, title, text }) {
  return <article className="feature-card"><span className={`feature-icon ${tint}`}>{icon}</span><h3>{title}</h3><p>{text}</p><ArrowUpRight size={17} className="feature-arrow" /></article>;
}

function Step({ number, title, text }) {
  return <div className="step"><span>{number}</span><div><b>{title}</b><p>{text}</p></div><Check size={17} className="step-check" /></div>;
}

function Workspace({ userId, username, profile, onProfileUpdate, onSignOut, toast }) {
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
      await saveExpense(userId, values, file, values.receipt_image_path);
      await refresh();
      toast(values.id ? 'Expense updated.' : 'Expense saved.');
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
  const avatarLetter = (profile?.full_name || 'G').charAt(0).toUpperCase();

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
          <div className="side-help"><span><CircleHelp size={17} /></span><div><b>Need a hand?</b><small>Tips for getting started</small></div><ArrowUpRight size={15} /></div>
          <div className="sidebar-profile">
            <div className="avatar">{profile?.avatar_url ? <StoredImage path={profile.avatar_url} alt="" /> : avatarLetter}</div>
            <div className="sidebar-user"><b>{profile?.full_name || username}</b><small>@{username} · local account</small></div>
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
            <button className="icon-button topbar-signout" onClick={onSignOut} aria-label="Sign out" title="Sign out"><LogOut size={17} /></button>
          </div>
        </header>
        <section className="page-content">
          {loading && <div className="data-loading"><span className="loader" /> Loading your records…</div>}
          <Routes>
            <Route index element={<Dashboard expenses={expenses} currency={currency} profile={profile} onNavigate={navigate} onEdit={(expense) => setModal({ type: 'expense', values: expense })} />} />
            <Route path="scan" element={<ScanPage onSave={handleSaveExpense} toast={toast} currency={currency} />} />
            <Route path="expenses" element={<ExpensesPage expenses={expenses} currency={currency} onEdit={(expense) => setModal({ type: 'expense', values: expense })} onDelete={handleDelete} onAdd={() => setModal({ type: 'expense', values: { ...EMPTY_EXPENSE } })} />} />
            <Route path="reports" element={<ReportsPage expenses={expenses} currency={currency} profile={profile} />} />
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

function Dashboard({ expenses, currency, profile, onNavigate, onEdit }) {
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

function EmptyState({ title, text, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><FileText size={23} /></span><h3>{title}</h3><p>{text}</p>{action && <button className="button button-primary" onClick={onAction}><Plus size={16} /> {action}</button>}</div>;
}

function ExpensesPage({ expenses, currency, onEdit, onDelete, onAdd }) {
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

function ExpenseModal({ values, currency, onClose, onSave }) {
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

function ScanPage({ onSave, toast, currency }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({ ...EMPTY_EXPENSE, source: 'receipt_scan' });
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(nextFile) {
    if (!nextFile) return;
    try { validateImage(nextFile); setFile(nextFile); setForm({ ...EMPTY_EXPENSE, source: 'receipt_scan' }); setHasScanned(false); setScanError(''); }
    catch (error) { toast(error.message, 'error'); }
  }
  async function processReceipt() {
    if (!file) return;
    setScanning(true); setScanError(''); setProgress(0);
    try {
      const { scanReceipt } = await import('./services/receiptOCR.js');
      const result = await scanReceipt(file, setProgress);
      setForm((current) => ({ ...current, ...result.values, source: 'receipt_scan' }));
      setHasScanned(true);
      if (!result.values.total_amount) setScanError('We couldn’t confidently find the final total. Please check the receipt and enter it below.');
      else toast('Receipt read. Review the details before saving.');
    } catch (error) {
      setHasScanned(true);
      setScanError(`We couldn't read this receipt clearly. ${error.message || 'Please upload a clearer image or enter the details manually.'}`);
    } finally { setScanning(false); }
  }
  async function saveScanned(event) {
    event.preventDefault();
    if (!form.store_name.trim()) return setScanError('Enter a store or business name.');
    if (!form.total_amount || Number(form.total_amount) <= 0) return setScanError('Enter the final total amount.');
    try { await onSave({ ...form, total_amount: Number(form.total_amount), subtotal: form.subtotal === '' ? null : Number(form.subtotal), tax: form.tax === '' ? null : Number(form.tax), discount: form.discount === '' ? null : Number(form.discount) }, file); }
    catch { /* The parent displays the database error. */ }
  }
  function setField(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  return <div className="scan-page">
    <div className="scan-intro"><span className="scan-intro-icon"><Sparkles size={18} /></span><div><b>Smart receipt scanner</b><p>We’ll read the receipt on your device. You’ll always review the details before anything is saved.</p></div><span className="ocr-badge"><Zap size={13} /> OCR READY</span></div>
    {!file ? <div className={`upload-card ${dragging ? 'dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); }}>
      <div className="upload-illustration"><CloudUpload size={27} /></div><h2>Drop your receipt here</h2><p>Choose an image from your device or take a photo</p><div className="upload-actions"><button className="button button-primary" onClick={() => inputRef.current?.click()}><Upload size={16} /> Choose image</button><button className="button button-outline" onClick={() => setCameraOpen(true)}><Camera size={16} /> Use camera</button></div><span className="upload-formats">JPG or PNG · Max 10 MB · Your receipt stays private</span><input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png" onChange={(e) => selectFile(e.target.files?.[0])} /></div> : <div className="scan-workspace">
      <div className="receipt-preview panel"><div className="panel-heading"><div><h3>Receipt preview</h3><p>Check that the image is clear and readable</p></div><button className="text-button" onClick={() => { setFile(null); setHasScanned(false); setScanError(''); }}>Remove <X size={14} /></button></div><div className={`preview-image ${scanning ? 'is-scanning' : ''}`}><img src={preview} alt="Uploaded receipt preview" />{scanning && <div className="scan-overlay"><div className="scan-laser" /><div className="scan-overlay-text"><span className="loader" /> Reading your receipt… {progress}%</div></div>}</div><div className="file-meta"><FileImage size={16} /><span>{file.name}</span><small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small></div>{!hasScanned && <button className="button button-primary process-button" onClick={processReceipt} disabled={scanning}><Sparkles size={16} /> Read receipt details</button>}{scanning && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}</div>
      <form className="panel review-panel" onSubmit={saveScanned}><div className="panel-heading"><div><span className="eyebrow">STEP 2 · REVIEW & SAVE</span><h3>Check the details</h3><p>OCR suggestions can be changed before saving.</p></div><span className="review-badge"><ShieldCheck size={14} /> YOU’RE IN CONTROL</span></div>{scanError && <div className="inline-alert"><CircleHelp size={16} /><span>{scanError} You can still enter the details manually.</span></div>}
        <div className="form-grid scanner-fields"><label className="span-two">Store name<input value={form.store_name} onChange={(e) => setField('store_name', e.target.value)} placeholder="Store or business name" /></label><label>Receipt date<input type="date" value={form.expense_date} onChange={(e) => setField('expense_date', e.target.value)} /></label><label>Receipt time<input type="time" value={form.expense_time || ''} onChange={(e) => setField('expense_time', e.target.value)} /></label><label>Subtotal<input type="number" min="0" step="0.01" value={form.subtotal ?? ''} onChange={(e) => setField('subtotal', e.target.value)} placeholder="0.00" /></label><label>Tax<input type="number" min="0" step="0.01" value={form.tax ?? ''} onChange={(e) => setField('tax', e.target.value)} placeholder="0.00" /></label><label>Discount<input type="number" min="0" step="0.01" value={form.discount ?? ''} onChange={(e) => setField('discount', e.target.value)} placeholder="0.00" /></label><label>Category<select value={form.category} onChange={(e) => setField('category', e.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="span-two total-highlight"><span>Total amount ({currency}) <small>Most important</small></span><div><span>{currency}</span><input required type="number" min="0.01" step="0.01" value={form.total_amount} onChange={(e) => setField('total_amount', e.target.value)} placeholder="0.00" /></div></label><label className="span-two">Payment method<input value={form.payment_method} onChange={(e) => setField('payment_method', e.target.value)} placeholder="Cash, card, GCash…" /></label><label className="span-two">Notes<textarea rows="2" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Optional notes" /></label></div><div className="scanner-actions"><button type="button" className="button button-outline" onClick={() => { setFile(null); setHasScanned(false); }}>Scan again</button><button type="submit" className="button button-primary" disabled={!hasScanned || scanning}><Check size={16} /> Confirm & save</button></div></form>
    </div>}
    <div className="privacy-note"><ShieldCheck size={16} /><span><b>Your receipt is yours.</b> Images stay in this browser. OCR runs on your device and nothing is saved until you confirm.</span></div>
    {cameraOpen && <CameraCapture onCapture={(captured) => { selectFile(captured); setCameraOpen(false); }} onClose={() => setCameraOpen(false)} />}
  </div>;
}

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera capture.');
      return () => { alive = false; };
    }
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => { if (alive) { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; } else stream.getTracks().forEach((track) => track.stop()); })
      .catch((cameraError) => { if (alive) setError(`Camera access failed: ${cameraError.message}`); });
    return () => { alive = false; streamRef.current?.getTracks().forEach((track) => track.stop()); };
  }, []);
  function capture() {
    const video = videoRef.current;
    if (!video?.videoWidth) return setError('The camera is not ready yet.');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return setError('Could not capture an image. Please try again.');
      onCapture(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }
  return <div className="modal-backdrop camera-backdrop"><section className="camera-modal" role="dialog" aria-modal="true"><div className="camera-heading"><b>Capture a receipt</b><button className="icon-button" onClick={onClose} aria-label="Close camera"><X size={20} /></button></div>{error ? <div className="camera-error"><Camera size={24} /><p>{error}</p><small>Allow camera permission in your browser, or upload an image instead.</small></div> : <video ref={videoRef} autoPlay playsInline muted />}{error && <button className="button button-outline" onClick={onClose}>Close</button>}{!error && <div className="camera-actions"><span>Keep the receipt in focus and within the frame.</span><button className="camera-shutter" onClick={capture} aria-label="Take photo"><span /></button></div>}</section></div>;
}

function ReportsPage({ expenses, currency, profile }) {
  const [range, setRange] = useState('month');
  const [category, setCategory] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const now = new Date();
  const bounds = range === 'today'
    ? { start: startOfDay(now), end: endOfDay(now) }
    : range === 'week'
      ? { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
      : range === 'year'
        ? { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) }
        : { start: startOfMonth(now), end: endOfMonth(now) };
  const records = expenses.filter((item) => {
    const date = new Date(`${item.expense_date}T00:00:00`);
    const dateMatches = range === 'custom'
      ? (!customStart || item.expense_date >= customStart) && (!customEnd || item.expense_date <= customEnd)
      : isWithinInterval(date, bounds);
    return dateMatches && (!category || item.category === category);
  });
  const total = records.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const byCategory = CATEGORIES.map((name) => ({ name, value: records.filter((item) => item.category === name).reduce((sum, item) => sum + Number(item.total_amount || 0), 0) })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  const trend = range === 'year'
    ? Array.from({ length: 12 }, (_, index) => {
      const month = new Date(now.getFullYear(), index, 1);
      const matching = expenses.filter((item) => {
        const date = new Date(`${item.expense_date}T00:00:00`);
        return date.getMonth() === month.getMonth() && date.getFullYear() === now.getFullYear() && (!category || item.category === category);
      });
      return { label: format(month, 'MMM'), amount: matching.reduce((sum, item) => sum + Number(item.total_amount || 0), 0) };
    })
    : (() => {
      const periodStart = range === 'today' ? startOfDay(now)
        : range === 'week' ? startOfWeek(now, { weekStartsOn: 1 })
          : range === 'custom' && customStart ? new Date(`${customStart}T00:00:00`) : startOfMonth(now);
      const periodEnd = range === 'today' ? endOfDay(now)
        : range === 'week' ? endOfWeek(now, { weekStartsOn: 1 })
          : range === 'custom' && customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfMonth(now);
      const days = Math.max(1, Math.ceil((periodEnd - periodStart) / 86400000) + 1);
      const pointCount = Math.min(days, 31);
      const bucketDays = Math.ceil(days / pointCount);
      return Array.from({ length: pointCount }, (_, index) => {
        const from = addDays(periodStart, index * bucketDays);
        const to = endOfDay(addDays(from, bucketDays - 1));
        const amount = expenses.filter((item) => {
          const date = new Date(`${item.expense_date}T00:00:00`);
          return isWithinInterval(date, { start: from, end: to }) && (!category || item.category === category);
        }).reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
        return { label: format(from, days > 31 ? 'MMM d' : 'd'), amount };
      });
    })();
  const periodLabel = range === 'today' ? format(now, 'MMMM d, yyyy')
    : range === 'week' ? 'This week'
      : range === 'month' ? format(now, 'MMMM yyyy')
        : range === 'year' ? String(now.getFullYear())
          : `${customStart || 'Any date'} – ${customEnd || 'Today'}`;
  function exportCsv() {
    const rows = [['Date', 'Store / Expense', 'Category', 'Payment method', 'Amount', 'Currency', 'Notes'], ...records.map((item) => [item.expense_date, item.store_name, item.category, item.payment_method || '', item.total_amount, item.currency || currency, item.notes || ''])];
    const csv = rows.map((row) => row.map((field) => `"${String(field ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.href = url;
    link.download = `receiptly-expenses-${format(now, 'yyyy-MM-dd')}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="reports-page">
    <div className="report-controls"><div className="range-tabs">{[['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['custom', 'Custom']].map(([value, label]) => <button key={value} className={range === value ? 'selected' : ''} onClick={() => setRange(value)}>{label}</button>)}</div>{range === 'custom' && <div className="custom-dates"><label>From<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></label><label>To<input type="date" min={customStart || undefined} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></label></div>}<div className="report-actions"><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><button className="button button-outline" onClick={exportCsv}><Download size={15} /> Export CSV</button><button className="button button-primary" onClick={() => window.print()}><Printer size={15} /> Print report</button></div></div>
    <div className="print-heading"><span className="brand"><span className="brand-mark"><Receipt size={17} /></span>receiptly</span><span>Generated {format(now, 'MMMM d, yyyy')}</span></div>
    <div className="report-summary panel"><div><span className="eyebrow">EXPENSE SUMMARY · {periodLabel}</span><h2>{money(total, currency)}</h2><p>Total across {records.length} transaction{records.length === 1 ? '' : 's'}{profile?.full_name ? ` for ${profile.full_name}` : ''}</p></div><span className="report-summary-icon"><BarChart3 size={23} /></span><div className="report-summary-details"><span><b>{records.length}</b> Transactions</span><span><b>{byCategory.length}</b> Categories used</span></div></div>
    {records.length ? <div className="reports-grid">
      <article className="panel report-trend"><div className="panel-heading"><div><h3>Spending trend</h3><p>{range === 'year' ? 'Month by month' : 'Day by day'}</p></div></div><Suspense fallback={<div className="chart-skeleton" />}><ReportTrendChart data={trend} currency={currency} /></Suspense></article>
      <article className="panel report-categories"><div className="panel-heading"><div><h3>Spending by category</h3><p>Share of your total expenses</p></div></div><div className="report-donut"><Suspense fallback={<div className="chart-skeleton chart-skeleton-donut" />}><ReportDonutChart data={byCategory} currency={currency} total={total} /></Suspense></div><div className="report-legend">{byCategory.map((item) => <div key={item.name}><span><i style={{ background: categoryColor(item.name) }} />{item.name}</span><b>{money(item.value, currency)}</b><small>{total ? `${(item.value / total * 100).toFixed(0)}%` : '0%'}</small></div>)}</div></article>
      <article className="panel transactions-panel"><div className="panel-heading"><div><h3>Transactions</h3><p>Included in this report</p></div><span className="record-count">{records.length} items</span></div><div className="table-scroll"><table className="data-table"><thead><tr><th>DATE</th><th>EXPENSE</th><th>CATEGORY</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{records.map((item) => <tr key={item.id}><td>{shortDate(item.expense_date)}</td><td><b>{item.store_name}</b></td><td>{item.category}</td><td className="align-right amount-cell">{money(item.total_amount, currency)}</td></tr>)}</tbody></table></div></article>
    </div> : <EmptyState title="No expenses in this period" text="Try another date range or add an expense to start your report." />}
  </div>;
}

function HistoryPage({ expenses, currency, onEdit, onDelete }) {
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
  return <div className="history-page"><div className="page-toolbar"><div><span className="record-count">{filtered.length} scanned receipts</span><span className="toolbar-sub"> · Stored in this browser</span></div><div className="history-filters"><label className="search-field history-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search receipts" /></label><label className="select-filter history-category"><Filter size={15} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><label className="date-filter">From<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label><label className="date-filter">To<input type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label></div></div>{filtered.length ? <div className="receipt-grid">{filtered.map((item) => <ReceiptCard key={item.id} expense={item} currency={currency} onEdit={onEdit} onDelete={onDelete} />)}</div> : <EmptyState title={query || category || startDate || endDate ? 'No receipts match those filters' : 'No scanned receipts yet'} text={query || category || startDate || endDate ? 'Try a different search or date range.' : 'Scanned receipts that you confirm and save will appear here.'} />}</div>;
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

function StoredImage({ path, alt }) {
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

function ProfilePage({ userId, profile, onUpdate, toast }) {
  const [name, setName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  useEffect(() => setName(profile?.full_name ?? ''), [profile?.full_name]);
  async function save(event) {
    event.preventDefault(); setSaving(true);
    try { const next = await updateProfile(userId, { full_name: name.trim(), currency: profile?.currency ?? 'PHP' }); onUpdate({ ...profile, ...next }); toast('Profile updated.'); }
    catch (error) { toast(`Could not update profile: ${error.message}`, 'error'); }
    finally { setSaving(false); }
  }
  async function changeAvatar(file) {
    if (!file) return;
    setBusyAvatar(true);
    try {
      const avatar_url = await uploadAvatar(userId, file);
      const next = await updateProfile(userId, { ...profile, avatar_url });
      if (profile?.avatar_url) await deleteStoredImage(profile.avatar_url);
      onUpdate({ ...profile, ...next });
      toast('Profile photo updated.');
    }
    catch (error) { toast(error.message, 'error'); }
    finally { setBusyAvatar(false); }
  }
  const avatarLetter = (profile?.full_name || 'G').charAt(0).toUpperCase();
  return <div className="settings-layout"><section className="panel settings-main"><div className="settings-section-head"><span className="settings-icon"><UserRound size={18} /></span><div><h3>Personal information</h3><p>Your details are stored only in this browser.</p></div></div><div className="profile-picture-row"><div className="avatar profile-avatar">{profile?.avatar_url ? <StoredImage path={profile.avatar_url} alt="" /> : avatarLetter}</div><div><b>Profile photo</b><p>JPG or PNG, up to 10 MB</p><label className="button button-outline file-button">{busyAvatar ? 'Uploading…' : 'Change photo'}<input type="file" accept="image/jpeg,image/png" disabled={busyAvatar} onChange={(e) => changeAvatar(e.target.files?.[0])} /></label></div></div><form onSubmit={save} className="settings-form"><label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required /></label><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <Check size={15} /></button></form></section><aside className="settings-aside"><div className="settings-aside-card"><span className="settings-icon green"><ShieldCheck size={18} /></span><h3>Your data stays here</h3><p>Expenses and receipts stay in this browser. They aren’t synced or backed up, and can be lost if browser data is cleared.</p></div></aside></div>;
}

function SettingsPage({ userId, profile, onUpdate, toast, hasExpenses }) {
  const [currency, setCurrency] = useState(profile?.currency ?? 'PHP');
  const [theme, setTheme] = useState(profile?.theme ?? 'light');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setCurrency(profile?.currency ?? 'PHP'); setTheme(profile?.theme ?? 'light'); }, [profile?.currency, profile?.theme]);
  async function save() {
    setSaving(true);
    try { const updated = await updateProfile(userId, { full_name: profile?.full_name ?? '', currency, theme }); onUpdate({ ...profile, ...updated }); toast('Preferences saved.'); }
    catch (error) { toast(`Could not save preferences: ${error.message}`, 'error'); }
    finally { setSaving(false); }
  }
  return <div className="settings-layout"><section className="panel settings-main"><div className="settings-section-head"><span className="settings-icon"><Settings size={18} /></span><div><h3>Preferences</h3><p>Customize how amounts are displayed in your workspace.</p></div></div><div className="preference-block"><label htmlFor="currency-setting">Default currency</label><p>Your expense amounts are saved in this currency. Receiptly does not convert values.</p><select id="currency-setting" value={currency} disabled={hasExpenses} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</select>{hasExpenses && <small className="currency-lock-note">Currency is fixed after your first expense so existing amounts keep their original meaning.</small>}<div className="currency-preview"><span>Example display</span><b>{money(1234.56, currency)}</b></div></div><div className="preference-block"><span className="preference-title">Appearance</span><p>Choose a comfortable look for your workspace.</p><div className="theme-options"><button className={theme === 'light' ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme('light')}><span className="theme-swatch light-swatch" />Light {theme === 'light' && <Check size={15} />}</button><button className={theme === 'dark' ? 'theme-choice selected' : 'theme-choice'} onClick={() => setTheme('dark')}><span className="theme-swatch dark-swatch" />Dark {theme === 'dark' && <Check size={15} />}</button></div></div><button className="button button-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'} <Check size={15} /></button></section><aside className="settings-aside"><div className="settings-aside-card"><span className="settings-icon amber"><ShieldCheck size={18} /></span><h3>Stored on this browser</h3><p>Your workspace isn’t synced or backed up. Clearing browser data can permanently delete your expenses and receipts.</p></div></aside></div>;
}

export default App;
