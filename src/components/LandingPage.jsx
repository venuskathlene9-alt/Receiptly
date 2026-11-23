import {
  ArrowRight, ArrowUpRight, BarChart3, Camera, Check, MoreHorizontal, Printer,
  Receipt, ShieldCheck, Sparkles, TrendingDown, Wallet, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function Feature({ icon, tint, title, text }) {
  return <article className="feature-card"><span className={`feature-icon ${tint}`}>{icon}</span><h3>{title}</h3><p>{text}</p><ArrowUpRight size={17} className="feature-arrow" /></article>;
}

function Step({ number, title, text }) {
  return <div className="step"><span>{number}</span><div><b>{title}</b><p>{text}</p></div><Check size={17} className="step-check" /></div>;
}

export default function LandingPage() {
  const workspacePath = '/register';
  return (
    <div className="landing">
      <header className="landing-nav wrap">
        <Link className="brand" to="/"><span className="brand-mark"><Receipt size={21} /></span>receiptly</Link>
        <nav className="landing-links">
          <a href="#features">Features</a><a href="#how">How it works</a><a href="#about">About</a>
        </nav>
        <div className="nav-actions">
          <Link className="button button-quiet" to="/login">Log in <ArrowRight size={16} /></Link>
        </div>
      </header>
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="pill"><span className="pill-dot" /> YOUR MONEY, IN FOCUS</span>
            <h1>Your receipts.<br />Your expenses.<br /><span>All in one place.</span></h1>
            <p>Take control of your spending. Scan receipts, record expenses automatically, and see where your money goes.</p>
            <div className="hero-actions"><Link className="button button-primary button-large" to={workspacePath}>Get started for free <ArrowRight size={17} /></Link><a className="button button-outline button-large" href="#how"><Zap size={16} /> See how it works</a></div>
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
        <section id="how" className="how-section"><div className="wrap how-inner"><div><span className="eyebrow">GET STARTED IN MINUTES</span><h2>From paper to<br />peace of mind.</h2><p>Keep the process simple: scan, check, save. You stay in control of every expense.</p><Link className="button button-primary" to={workspacePath}>Try Receiptly <ArrowRight size={16} /></Link></div><div className="steps"><Step number="01" title="Create your account" text="Sign in securely with your Google account. No separate password needed." /><Step number="02" title="Scan or add an expense" text="Upload a receipt or enter an expense manually." /><Step number="03" title="Review and save" text="Check every detail before it becomes a record." /><Step number="04" title="See the bigger picture" text="Explore your spending with reports that update as you go." /></div></div></section>
        <section id="about" className="closing wrap"><span className="closing-icon"><Sparkles size={21} /></span><h2>A little more clarity,<br /><span>every single day.</span></h2><p>Start building a spending habit that works for you.</p><Link className="button button-primary button-large" to={workspacePath}>Get started for free <ArrowRight size={17} /></Link></section>
      </main>
      <footer className="landing-footer"><div className="wrap footer-inner"><Link className="brand" to="/"><span className="brand-mark"><Receipt size={18} /></span>receiptly</Link><span>Scan. Track. Save.</span><span>© {new Date().getFullYear()} Receiptly</span></div></footer>
    </div>
  );
}
