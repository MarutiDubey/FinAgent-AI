import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, X } from 'lucide-react';
import CircularText from './CircularText';
import './Navbar.css';

export default function Navbar({ view, onLogoClick, onDashboard, onCompare, onAbout, onNewAnalysis, showAbout, onCloseAbout }) {
  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo — click to go home */}
          <button className="nav-logo cursor-target" onClick={onLogoClick}>
            <div className="nav-logo-icon">
              <TrendingUp size={18} />
            </div>
            <span className="nav-logo-text">FinAgent<span className="nav-logo-ai">AI</span></span>
          </button>

          {/* Center nav links */}
          <div className="nav-links">
            <button
              className={`nav-link ${view === 'home' ? 'nav-link--active' : ''}`}
              onClick={onLogoClick}
            >
              Home
            </button>
            <button
              className={`nav-link ${view === 'dashboard' ? 'nav-link--active' : ''}`}
              onClick={onDashboard}
            >
              Dashboard
            </button>
            <button
              className={`nav-link ${view === 'compare' ? 'nav-link--active' : ''}`}
              onClick={onCompare}
            >
              Compare
            </button>
            <a
              href="https://github.com/MarutiDubey/FinAgentAI.git"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
            >
              GitHub ↗
            </a>
            <button className="nav-link" onClick={onAbout}>
              About
            </button>
          </div>

          {/* Right — CTA + rotating badge */}
          <div className="nav-right">
            <button className="nav-cta cursor-target" onClick={onNewAnalysis}>
              Analyze Stock
            </button>
            <div className="nav-circular-badge">
              <CircularText
                text="AI • FINANCE • AGENT • "
                spinDuration={12}
                onHover="speedUp"
              />
              <div className="nav-badge-center">
                <TrendingUp size={13} color="#10b981" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* About Modal */}
      <AnimatePresence>
        {showAbout && (
          <>
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseAbout}
            />
            <motion.div
              className="about-modal glass-card"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            >
              <button className="modal-close" onClick={onCloseAbout}><X size={18} /></button>
              <div className="about-modal-inner">
                <div className="about-logo-row">
                  <div className="nav-logo-icon" style={{ width: 48, height: 48, borderRadius: 14 }}>
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontWeight: 800, fontSize: '1.5rem' }}>FinAgent<span style={{ color: '#10b981' }}>AI</span></h2>
                    <p style={{ color: '#8b9cb5', fontSize: '0.82rem' }}>Multi-Agent Financial Analyst</p>
                  </div>
                </div>

                <p className="about-desc">
                  FinAgentAI is a production-grade multi-agent AI system that combines technical chart analysis,
                  news sentiment intelligence, and portfolio management reasoning to give you actionable stock insights.
                </p>

                <div className="about-stack-grid">
                  {[
                    { label: 'Orchestration', value: 'LangGraph' },
                    { label: 'AI Model', value: 'GPT-4o-mini via OpenRouter' },
                    { label: 'Market Data', value: 'Yahoo Finance (yfinance)' },
                    { label: 'Backend', value: 'FastAPI + Python' },
                    { label: 'Frontend', value: 'React + Vite' },
                    { label: 'Animations', value: 'Framer Motion + React Bits' },
                    { label: 'Charts', value: 'Recharts' },
                    { label: 'Custom Cursor', value: 'GSAP + Three.js + OGL' },
                  ].map(({ label, value }) => (
                    <div key={label} className="about-stack-item">
                      <span className="about-stack-label">{label}</span>
                      <span className="about-stack-value">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="about-agents">
                  <div className="about-agent-card">
                    <div className="about-agent-num">01</div>
                    <div className="about-agent-name">Technical Analyst</div>
                    <div className="about-agent-desc">Calculates RSI, SMA-20/50, MACD and detects chart trends from 90-day OHLC data.</div>
                  </div>
                  <div className="about-agent-card">
                    <div className="about-agent-num">02</div>
                    <div className="about-agent-name">Sentiment Analyst</div>
                    <div className="about-agent-desc">Fetches latest news headlines and uses GPT-4o-mini to score market mood 0–100.</div>
                  </div>
                  <div className="about-agent-card">
                    <div className="about-agent-num">03</div>
                    <div className="about-agent-name">Portfolio Manager</div>
                    <div className="about-agent-desc">Synthesises both signals into a structured BUY/SELL/HOLD report with risk analysis.</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
