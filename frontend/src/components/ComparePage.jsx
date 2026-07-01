import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Swords, ShieldAlert, Trophy, BarChart2, Activity, Newspaper } from 'lucide-react';
import MetaBalls from './MetaBalls';
import './ComparePage.css';

/* Loader stages shown while a comparison runs */
const COMPARE_STEPS = [
  { icon: <BarChart2 size={20} />, label: 'Technical Agent', msg: 'Fetching price history & indicators for each ticker...' },
  { icon: <Newspaper size={20} />, label: 'Gathering Metrics', msg: 'Collecting RSI, MACD, P/E, beta and trend for every stock...' },
  { icon: <Activity size={20} />, label: 'Portfolio Manager', msg: 'Ranking the contenders and picking the stronger buy...' },
];

/* Reuse the same markdown renderer shape as App.jsx */
function renderMarkdown(text) {
  if (!text) return { __html: '' };
  let html = text;
  html = html.replace(/^\*\*Winner\*\*:\s*\*\*(.*?)\*\*\n?/gim, '');
  html = html.replace(/^\*\*Winner\*\*:\s*.*?\n?/gim, '');
  html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="md-bold">$1</strong>');
  html = html.replace(/^\- (.*$)/gim, '<li class="md-li">$1</li>');
  html = html.replace(/((<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');
  html = html.split('\n').join('<br/>');
  return { __html: html };
}

/* Pull the winning ticker out of the verdict's "**Winner**: TICKER" line */
function extractWinner(verdict) {
  if (!verdict) return '';
  const m = verdict.match(/\*\*Winner\*\*:\s*\**([A-Z.\-]+)\**/i);
  return m ? m[1].trim().toUpperCase() : '';
}

/* Rows of the side-by-side metric table */
const METRIC_ROWS = [
  { key: 'price', label: 'Price', fmt: (v) => (v != null ? `$${v}` : 'N/A') },
  { key: 'change', label: 'Change %', fmt: (v) => (v != null ? `${v >= 0 ? '+' : ''}${v}%` : 'N/A'), tone: 'change' },
  { key: 'market_cap', label: 'Market Cap' },
  { key: 'pe_ratio', label: 'P/E Ratio' },
  { key: 'forward_pe', label: 'Forward P/E' },
  { key: 'beta', label: 'Beta' },
  { key: 'rsi', label: 'RSI (14)', tone: 'rsi' },
  { key: 'macd', label: 'MACD' },
  { key: 'trend', label: 'Trend' },
  { key: 'week_52_high', label: '52W High', fmt: (v) => (v != null ? `$${v}` : 'N/A') },
  { key: 'week_52_low', label: '52W Low', fmt: (v) => (v != null ? `$${v}` : 'N/A') },
  { key: 'sector', label: 'Sector' },
];

export default function ComparePage({ apiBase }) {
  const [inputs, setInputs] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  /* Cycle loader stages while comparing */
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const id = setInterval(() => setLoadingStep((p) => (p + 1) % COMPARE_STEPS.length), 3500);
    return () => clearInterval(id);
  }, [loading]);

  const setInput = (idx, val) =>
    setInputs((arr) => arr.map((v, i) => (i === idx ? val.toUpperCase() : v)));

  const addInput = () => setInputs((arr) => (arr.length < 3 ? [...arr, ''] : arr));
  const removeInput = (idx) =>
    setInputs((arr) => (arr.length > 2 ? arr.filter((_, i) => i !== idx) : arr));

  const runCompare = async (e) => {
    e?.preventDefault();
    const tickers = inputs.map((t) => t.trim().toUpperCase()).filter(Boolean);
    const unique = [...new Set(tickers)];
    if (unique.length < 2) {
      setError('Enter at least 2 different ticker symbols to compare.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: unique }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Comparison failed. Check the ticker symbols.');
      setResult(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const winner = result ? extractWinner(result.verdict) : '';

  return (
    <motion.div
      key="compare"
      className="compare-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header */}
      <div className="compare-header">
        <span className="section-badge">HEAD-TO-HEAD</span>
        <h2 className="section-title">Compare Stocks Side-by-Side</h2>
        <p className="compare-sub">
          Enter 2–3 tickers. Each is run through the Technical Agent, then an AI
          portfolio manager picks the stronger buy.
        </p>
      </div>

      {/* Ticker inputs */}
      <form className="compare-form glass-card" onSubmit={runCompare}>
        <div className="compare-inputs">
          {inputs.map((val, i) => (
            <div className="compare-input-wrap" key={i}>
              <input
                type="text"
                className="compare-input cursor-target"
                placeholder={`Ticker ${i + 1}`}
                value={val}
                onChange={(e) => setInput(i, e.target.value)}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
              />
              {inputs.length > 2 && (
                <button
                  type="button"
                  className="compare-remove cursor-target"
                  onClick={() => removeInput(i)}
                  disabled={loading}
                  aria-label="Remove ticker"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {inputs.length < 3 && (
            <button
              type="button"
              className="compare-add cursor-target"
              onClick={addInput}
              disabled={loading}
            >
              <Plus size={15} /> Add
            </button>
          )}
        </div>
        <button type="submit" className="search-btn cursor-target" disabled={loading}>
          {loading ? (
            <span className="btn-loading">
              <span className="dot-pulse" />
              <span className="dot-pulse" style={{ animationDelay: '0.2s' }} />
            </span>
          ) : (
            <>
              <Swords size={15} /> Compare
            </>
          )}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {/* Loading — same multi-agent animation as the single-stock dashboard */}
        {loading && (
          <motion.div
            key="compare-loading"
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
              {COMPARE_STEPS.map((step, i) => (
                <div key={i} className={`agent-step ${i < loadingStep ? 'done' : i === loadingStep ? 'active' : 'pending'}`}>
                  <div className="agent-step-icon">{step.icon}</div>
                  <div className="agent-step-label">{step.label}</div>
                  {i < COMPARE_STEPS.length - 1 && <div className="agent-step-line" />}
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
                {COMPARE_STEPS[loadingStep].msg}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {/* Error */}
        {!loading && error && (
          <motion.div
            key="compare-error"
            className="glass-card error-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ShieldAlert size={26} className="error-icon" />
            <div>
              <div className="error-title">Comparison Failed</div>
              <div className="error-msg">{error}</div>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {!loading && !error && result?.stocks?.length > 0 && (
          <motion.div
            key="compare-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Metric table */}
            <div className="glass-card compare-table-card">
              <div className="analysis-header">
                <Swords size={16} style={{ color: '#10b981' }} />
                <span>Metrics Comparison</span>
              </div>
              <div className="compare-table-scroll">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th className="compare-row-label">Metric</th>
                      {result.stocks.map((s) => (
                        <th
                          key={s.ticker}
                          className={`compare-col-head ${winner === s.ticker ? 'is-winner' : ''}`}
                        >
                          {winner === s.ticker && <Trophy size={13} className="compare-trophy" />}
                          <div className="compare-col-ticker">{s.ticker}</div>
                          <div className="compare-col-name">{s.info?.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_ROWS.map((row) => (
                      <tr key={row.key}>
                        <td className="compare-row-label">{row.label}</td>
                        {result.stocks.map((s) => {
                          const raw = s.info?.[row.key];
                          const display = row.fmt ? row.fmt(raw) : raw ?? 'N/A';
                          let cls = '';
                          if (row.tone === 'change' && typeof raw === 'number')
                            cls = raw >= 0 ? 'cell-pos' : 'cell-neg';
                          if (row.tone === 'rsi' && typeof raw === 'number')
                            cls = raw > 70 ? 'cell-neg' : raw < 30 ? 'cell-pos' : '';
                          return (
                            <td
                              key={s.ticker}
                              className={`${cls} ${winner === s.ticker ? 'is-winner-col' : ''}`}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI verdict */}
            <div className="glass-card compare-verdict">
              <div className="report-header">
                <div className="report-title-section">
                  <span className="report-label">AI Portfolio Manager</span>
                  <h2 className="report-title">Comparison Verdict</h2>
                </div>
                {winner && (
                  <div className="compare-winner-badge">
                    <Trophy size={14} /> {winner}
                  </div>
                )}
              </div>
              <div
                className="report-content"
                dangerouslySetInnerHTML={renderMarkdown(result.verdict)}
              />
            </div>
          </motion.div>
        )}

        {/* Empty prompt */}
        {!loading && !error && !result && (
          <motion.div
            key="compare-empty"
            className="glass-card empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="empty-icon-wrap">
              <Swords size={34} strokeWidth={1.5} style={{ color: '#10b981' }} />
            </div>
            <h3>Pick Your Contenders</h3>
            <p>
              Enter 2–3 ticker symbols above and hit Compare. You'll get a
              side-by-side metric table plus an AI verdict on the stronger buy.
            </p>
            <div className="empty-tags">
              {['AAPL vs MSFT', 'TSLA vs NVDA', 'GOOGL vs META'].map((tag) => (
                <span key={tag} className="empty-tag">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
