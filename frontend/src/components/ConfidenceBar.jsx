import { useMemo } from 'react';

export default function ConfidenceBar({ recommendation }) {
  const { label, score, color, bg } = useMemo(() => {
    if (!recommendation) return { label: 'HOLD', score: 50, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    const rec = recommendation.toLowerCase();
    if (rec.includes('strong buy'))  return { label: 'STRONG BUY', score: 92, color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
    if (rec.includes('buy'))          return { label: 'BUY', score: 75, color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
    if (rec.includes('strong sell')) return { label: 'STRONG SELL', score: 8,  color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' };
    if (rec.includes('sell'))         return { label: 'SELL', score: 25, color: '#f43f5e', bg: 'rgba(244,63,94,0.15)' };
    return { label: 'HOLD', score: 50, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  }, [recommendation]);

  return (
    <div className="confidence-bar-wrapper" style={{ background: bg, border: `1px solid ${color}33` }}>
      <div className="confidence-labels">
        <span style={{ color }}>Agent Verdict</span>
        <span className="confidence-badge" style={{ color, background: `${color}20`, border: `1px solid ${color}44` }}>
          {label}
        </span>
      </div>
      <div className="confidence-track">
        <div
          className="confidence-fill"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }}
        />
        <div className="confidence-marker" style={{ left: `${score}%`, background: color }} />
      </div>
      <div className="confidence-ends">
        <span>SELL</span>
        <span>HOLD</span>
        <span>BUY</span>
      </div>
    </div>
  );
}
