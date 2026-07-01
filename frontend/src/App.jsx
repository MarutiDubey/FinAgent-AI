import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Newspaper, ShieldAlert, BarChart2, Copy, Check,
  TrendingUp, TrendingDown, Activity, ArrowRight, Zap, Brain, Shield, GitMerge
} from 'lucide-react';

import ClickSpark from './components/ClickSpark';
import ShapeGrid from './components/ShapeGrid';
import ASCIIText from './components/ASCIIText';
import TargetCursor from './components/TargetCursor';
import MetaBalls from './components/MetaBalls';
import Navbar from './components/Navbar';
import StockChart from './components/StockChart';
import MetricCard from './components/MetricCard';
import ConfidenceBar from './components/ConfidenceBar';
import SidePanel from './components/SidePanel';
import ComparePage from './components/ComparePage';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/* ── Constants ───────────────────────────────────────────── */
const LOADING_STEPS = [
  { icon: <BarChart2 size={20} />, label: 'Technical Agent', msg: 'Fetching price history, calculating RSI, SMA & MACD...' },
  { icon: <Newspaper size={20} />, label: 'Sentiment Agent', msg: 'Pulling latest news headlines and gauging market mood...' },
  { icon: <Activity size={20} />, label: 'Portfolio Manager', msg: 'Synthesising signals and writing investment report...' },
];

const POPULAR = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'NFLX'];

const FEATURES = [
  {
    icon: <BarChart2 size={24} />,
    title: 'Technical Analysis',
    desc: 'RSI, dual SMA crossovers, MACD momentum signals, and 90-day price history chart — all calculated in real-time.',
  },
  {
    icon: <Brain size={24} />,
    title: 'Sentiment Intelligence',
    desc: 'GPT-4o-mini scans the latest news headlines and outputs a structured 0–100 sentiment score with key themes.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Portfolio Advice',
    desc: 'A portfolio manager agent synthesises both signals into a BUY / SELL / HOLD report with risk factors and price targets.',
  },
  {
    icon: <Zap size={24} />,
    title: 'Real-time Data',
    desc: 'Powered by Yahoo Finance — live price, market cap, P/E ratio, 52-week range, volume, beta and dividend yield.',
  },
  {
    icon: <GitMerge size={24} />,
    title: 'Stock Comparison',
    desc: 'Compare 2–3 stocks side-by-side. Our AI ranks them on technical strength, sentiment, and fundamentals — and picks the stronger buy.',
  },
];

/* ── Markdown renderer ───────────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return { __html: '' };
  let html = text;
  html = html.replace(/^\*\*Recommendation\*\*:\s*\*\*(.*?)\*\*\n?/gim, '');
  html = html.replace(/^\*\*Recommendation\*\*:\s*.*?\n?/gim, '');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="md-bold">$1</strong>');
  html = html.replace(/^\- (.*$)/gim, '<li class="md-li">$1</li>');
  html = html.replace(/((<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');
  html = html.split('\n').join('<br/>');
  return { __html: html };
}

/* ── Rating helpers ──────────────────────────────────────── */
function getRatingInfo(rec) {
  if (!rec) return { cls: 'hold', text: 'HOLD' };
  const r = rec.toLowerCase();
  if (r.includes('strong buy')) return { cls: 'strong-buy', text: 'STRONG BUY' };
  if (r.includes('buy')) return { cls: 'buy', text: 'BUY' };
  if (r.includes('strong sell')) return { cls: 'strong-sell', text: 'STRONG SELL' };
  if (r.includes('sell')) return { cls: 'sell', text: 'SELL' };
  return { cls: 'hold', text: 'HOLD' };
}

/* ══════════════════════════════════════════════════════════ */
export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'dashboard' | 'compare'
  const [showAbout, setShowAbout] = useState(false);
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lastTicker, setLastTicker] = useState('');
  const searchRef = useRef(null);

  /* Cycle loading step */
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const id = setInterval(() => setLoadingStep(p => (p + 1) % LOADING_STEPS.length), 3500);
    return () => clearInterval(id);
  }, [loading]);

  /* Core analysis fetch */
  const fetchAnalysis = useCallback(async (sym) => {
    const t = (sym || ticker).trim().toUpperCase();
    if (!t) {
      searchRef.current?.focus();
      return;
    }
    setTicker(t);
    setLoading(true);
    setError('');
    setData(null);
    setView('dashboard');
    try {
      const res = await fetch(`${API_BASE}/api/analyze?ticker=${encodeURIComponent(t)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Analysis failed. Please check the ticker symbol.');
      setData(json);
      setLastTicker(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  const handleSearch = (e) => { e.preventDefault(); fetchAnalysis(); };
  const handleNewAnalysis = () => {
    setView('dashboard');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  /* Copy report */
  const copyReport = () => {
    if (!data?.recommendation) return;
    navigator.clipboard.writeText(data.recommendation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const rating = getRatingInfo(data?.recommendation);

  /* ── HOME PAGE ──────────────────────────────────────── */
  const HomePage = (
    <motion.div
      key="home"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hero */}
      <section className="home-hero">
        {/* ASCII animated title */}
        <motion.div
          className="home-ascii-wrap"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <ASCIIText
            text="FinAgent AI"
            asciiFontSize={7}
            textFontSize={140}
            enableWaves={true}
            textColor="#10b981"
            planeBaseHeight={9}
          />
        </motion.div>

        <motion.h1
          className="home-tagline"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Three AI Agents.<br />
          <span className="gradient-text">One Investment Decision.</span>
        </motion.h1>

        <motion.p
          className="home-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          A production-grade LangGraph multi-agent workflow that combines technical chart analysis,
          GPT-4o-mini news sentiment, and portfolio management reasoning into a single BUY/SELL/HOLD report.
        </motion.p>

        {/* Hero search */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="home-search-wrap"
        >
          <form onSubmit={handleSearch} className="search-box home-search-box">
            <Search size={20} style={{ color: '#475569', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              className="search-input cursor-target"
              placeholder="Enter a ticker symbol — AAPL, TSLA, NVDA…"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="search-btn cursor-target">
              Analyze Now <ArrowRight size={15} />
            </button>
          </form>

          <div className="quick-tickers">
            {POPULAR.map(t => (
              <button
                key={t}
                className="quick-ticker-btn cursor-target"
                onClick={() => fetchAnalysis(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="home-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {[
            { num: '3', label: 'Specialized Agents' },
            { num: '10+', label: 'Financial Metrics' },
            { num: 'GPT-4o', label: 'AI Model' },
            { num: '90-day', label: 'Price History' },
          ].map(({ num, label }) => (
            <div key={label} className="home-stat">
              <div className="home-stat-num">{num}</div>
              <div className="home-stat-label">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="home-features">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="section-badge">CAPABILITIES</span>
          <h2 className="section-title">Everything you need to analyse a stock</h2>
        </motion.div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-card glass-card cursor-target"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="home-how">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="section-badge">WORKFLOW</span>
          <h2 className="section-title">How the agents work together</h2>
        </motion.div>
        <div className="how-steps">
          {[
            { n: '01', title: 'You enter a ticker', desc: 'Type any NYSE/NASDAQ symbol and hit Analyze.' },
            { n: '02', title: 'Technical Agent runs', desc: 'Fetches 90-day OHLC, computes RSI, SMA-20/50, MACD and trend signals.' },
            { n: '03', title: 'Sentiment Agent runs', desc: 'Scrapes recent headlines, feeds them to GPT-4o-mini for a sentiment score.' },
            { n: '04', title: 'Portfolio Manager synthesises', desc: 'Combines both reports into a structured BUY/SELL/HOLD with risk analysis.' },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              className="how-step"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <div className="how-num">{step.n}</div>
              <div className="how-content">
                <div className="how-title">{step.title}</div>
                <div className="how-desc">{step.desc}</div>
              </div>
              {i < 3 && <div className="how-connector" />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <motion.section
        className="home-cta-banner glass-card"
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2>Ready to analyse your first stock?</h2>
        <p>No API keys needed — just a ticker symbol. Or compare multiple stocks side-by-side.</p>
        <div className="cta-btn-group">
          <button
            className="search-btn cta-big cursor-target"
            onClick={() => { setView('dashboard'); setTimeout(() => searchRef.current?.focus(), 100); }}
          >
            Start Analysis <ArrowRight size={16} />
          </button>
          <button
            className="search-btn cta-big cta-secondary cursor-target"
            onClick={() => setView('compare')}
          >
            Compare Stocks
          </button>
        </div>
      </motion.section>
    </motion.div>
  );

  /* ── DASHBOARD VIEW ───────────────────────────────────── */
  const DashboardView = (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Search Bar */}
      <motion.div
        className="search-container"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <form onSubmit={handleSearch} className="search-box">
          <Search size={20} style={{ color: '#475569', flexShrink: 0 }} />
          <input
            ref={searchRef}
            type="text"
            className="search-input cursor-target"
            placeholder="Enter stock ticker (AAPL, TSLA, MSFT, NVDA…)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="search-btn cursor-target" disabled={loading}>
            {loading
              ? <span className="btn-loading"><span className="dot-pulse" /><span className="dot-pulse" style={{ animationDelay: '0.2s' }} /></span>
              : 'Analyze'}
          </button>
        </form>

        <div className="quick-tickers">
          {POPULAR.map(t => (
            <button
              key={t}
              className="quick-ticker-btn cursor-target"
              onClick={() => fetchAnalysis(t)}
              disabled={loading}
            >
              {t}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Dynamic results area */}
      <AnimatePresence mode="wait">

        {/* Loading */}
        {loading && (
          <motion.div
            key="loading"
            className="glass-card loader-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div style={{ width: '110px', height: '110px' }}>
              <MetaBalls
                color="#10b981" cursorBallColor="#34d399"
                cursorBallSize={1.5} ballCount={8} speed={0.5}
                animationSize={20} clumpFactor={0.8}
                enableMouseInteraction={true} enableTransparency={true}
              />
            </div>

            <div className="agent-stepper">
              {LOADING_STEPS.map((step, i) => (
                <div key={i} className={`agent-step ${i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'pending'}`}>
                  <div className="agent-step-icon">{step.icon}</div>
                  <div className="agent-step-label">{step.label}</div>
                  {i < LOADING_STEPS.length - 1 && <div className="agent-step-line" />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="loader-msg"
              >
                {LOADING_STEPS[loadingStep].msg}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* Error */}
        {!loading && error && (
          <motion.div
            key="error"
            className="glass-card error-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ShieldAlert size={28} className="error-icon" />
            <div>
              <div className="error-title">Analysis Failed</div>
              <div className="error-msg">{error}</div>
            </div>
          </motion.div>
        )}

        {/* Empty / prompt */}
        {!loading && !error && !data && (
          <motion.div
            key="empty"
            className="glass-card empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="empty-icon-wrap">
              <TrendingUp size={36} strokeWidth={1.5} style={{ color: '#10b981' }} />
            </div>
            <h3>Ready to Analyse</h3>
            <p>
              Enter any stock ticker above. The three-agent workflow will return technical indicators,
              news sentiment, key metrics and a full portfolio report.
            </p>
            <div className="empty-tags">
              {['RSI & MACD', 'News Sentiment', 'BUY/SELL/HOLD', 'Price Chart', '10+ Metrics', 'Risk Analysis'].map(tag => (
                <span key={tag} className="empty-tag">{tag}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Dashboard */}
        {!loading && !error && data && (
          <motion.div
            key="dashboard-data"
            className="dashboard-grid"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            {/* LEFT */}
            <div className="sidebar-layout">

              {/* Overview */}
              <div className="glass-card overview-card">
                <div className="ticker-title">
                  <div>
                    <div className="ticker-name">{data.info.name}</div>
                    <div className="ticker-symbol">{data.ticker} · {data.info.currency}</div>
                  </div>
                  <div className={`rating-badge ${rating.cls}`}>{rating.text}</div>
                </div>

                <div className="price-section">
                  <div className="current-price">${data.info.price?.toFixed(2)}</div>
                  <div className={`price-change ${data.info.change >= 0 ? 'positive' : 'negative'}`}>
                    {data.info.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {data.info.change >= 0 ? '+' : ''}{data.info.change?.toFixed(2)}%
                  </div>
                </div>

                <div className="trend-badge">
                  <span className="trend-dot" style={{
                    background: data.info.trend?.includes('Bullish') ? '#10b981' :
                      data.info.trend?.includes('Bearish') ? '#f43f5e' : '#94a3b8'
                  }} />
                  {data.info.trend || 'Neutral'}
                </div>

                <ConfidenceBar recommendation={data.recommendation} />

                {data.info.description && (
                  <p className="company-desc">{data.info.description}…</p>
                )}

                <div className="metadata-grid">
                  <div className="meta-item"><span className="meta-label">Sector</span><span className="meta-value">{data.info.sector}</span></div>
                  <div className="meta-item"><span className="meta-label">Industry</span><span className="meta-value">{data.info.industry}</span></div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="glass-card">
                <div className="analysis-header">
                  <Activity size={16} style={{ color: '#10b981' }} />
                  <span>Key Metrics</span>
                </div>
                <div className="metrics-grid">
                  <MetricCard label="Market Cap" value={data.info.market_cap} icon="🏦" />
                  <MetricCard label="P/E Ratio" value={data.info.pe_ratio} icon="📊" />
                  <MetricCard label="Forward P/E" value={data.info.forward_pe} icon="🔮" />
                  <MetricCard label="Beta" value={data.info.beta} icon="⚡" />
                  <MetricCard label="52W High" value={`$${data.info.week_52_high}`} icon="🔼" accent="#10b981" />
                  <MetricCard label="52W Low" value={`$${data.info.week_52_low}`} icon="🔽" accent="#f43f5e" />
                  <MetricCard label="Volume" value={data.info.volume} icon="📦" />
                  <MetricCard label="Avg Volume" value={data.info.avg_volume} icon="📈" />
                  <MetricCard label="Div. Yield" value={data.info.dividend_yield} icon="💰" />
                  <MetricCard label="RSI (14)" value={data.info.rsi}
                    accent={data.info.rsi > 70 ? '#f43f5e' : data.info.rsi < 30 ? '#10b981' : undefined}
                    icon="📡"
                  />
                </div>
              </div>

              {/* Technical Agent */}
              <div className="glass-card">
                <div className="analysis-header">
                  <BarChart2 size={16} style={{ color: '#10b981' }} />
                  <span>Technical Analyst Agent</span>
                </div>
                <div className="technical-data">{data.technical_analysis}</div>
              </div>

              {/* Sentiment Agent */}
              <div className="glass-card">
                <div className="analysis-header">
                  <Newspaper size={16} style={{ color: '#10b981' }} />
                  <span>Sentiment Analyst Agent</span>
                </div>
                <div className="news-list">{data.sentiment_analysis}</div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="right-layout">
              {data.history?.length > 0 && (
                <div className="glass-card chart-card">
                  <StockChart history={data.history} ticker={data.ticker} currentPrice={data.info.price} />
                </div>
              )}

              <div className="glass-card report-panel">
                <div className="report-header">
                  <div className="report-title-section">
                    <span className="report-label">Synthesized Intelligence</span>
                    <h2 className="report-title">Portfolio Manager Report</h2>
                  </div>
                  <button className="copy-btn cursor-target" onClick={copyReport}>
                    {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>
                <div className="report-content" dangerouslySetInnerHTML={renderMarkdown(data.recommendation)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  /* ── RENDER ───────────────────────────────────────────── */
  return (
    <ClickSpark sparkColor="rgba(255, 255, 255, 1)" sparkSize={10} sparkRadius={18} sparkCount={8}>
      <TargetCursor
        targetSelector=".cursor-target"
        spinDuration={3}
        cursorColor="#10b981"
        cursorColorOnTarget="#34d399"
        hideDefaultCursor={false}
        parallaxOn={true}
      />

      <div className="bg-container">
        <ShapeGrid
          direction="diagonal"
          speed={0.1}
          borderColor="rgba(255, 255, 255, 0.07)"
          hoverFillColor="rgba(16, 185, 129, 0.5)"
          shape="square"
          squareSize={48}
          hoverTrailAmount={8}
        />
      </div>
      <div className="bg-radial" />

      <Navbar
        view={view}
        onLogoClick={() => setView('home')}
        onDashboard={() => { setView('dashboard'); setTimeout(() => searchRef.current?.focus(), 100); }}
        onCompare={() => setView('compare')}
        onAbout={() => setShowAbout(true)}
        onNewAnalysis={handleNewAnalysis}
        showAbout={showAbout}
        onCloseAbout={() => setShowAbout(false)}
      />

      <div className="page-layout">
        {/* Sidebar — only in dashboard view and when data exists */}
        {view === 'dashboard' && (
          <aside className="left-sidebar">
            <SidePanel onSearch={fetchAnalysis} currentTicker={lastTicker} />
          </aside>
        )}

        <main className={`main-content ${view === 'home' ? 'main-content--home' : ''}`}>
          <AnimatePresence mode="wait">
            {view === 'home'
              ? HomePage
              : view === 'compare'
                ? <ComparePage key="compare" apiBase={API_BASE} />
                : DashboardView}
          </AnimatePresence>

          {/* Footer */}
          <footer className="app-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span>Built with</span>
              <span className="footer-tags">
                {['LangGraph', 'FastAPI', 'React', 'Framer Motion', 'OpenRouter', 'Three.js'].map(t => (
                  <span key={t} className="footer-tag">{t}</span>
                ))}
              </span>
              <span style={{ color: '#374151' }}>·</span>
              <a
                href="https://github.com/MarutiDubey/FinAgentAI.git"
                target="_blank"
                rel="noreferrer"
                className="footer-link"
              >
                GitHub ↗
              </a>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
              Built by <span style={{ color: '#fff', fontWeight: 700 }}>Manthan Dubey</span>
            </div>
          </footer>
        </main>
      </div>
    </ClickSpark>
  );
}
