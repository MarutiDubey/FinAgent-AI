import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { useMemo } from 'react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(10,10,12,0.95)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        fontSize: '0.82rem',
        backdropFilter: 'blur(12px)',
        minWidth: '140px'
      }}>
        <div style={{ color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>{label}</div>
        <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>${d.close?.toFixed(2)}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem' }}>
          H: ${d.high?.toFixed(2)} · L: ${d.low?.toFixed(2)}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
          Vol: {(d.volume / 1e6).toFixed(1)}M
        </div>
      </div>
    );
  }
  return null;
};

export default function StockChart({ history, ticker, currentPrice }) {
  const { chartData, isUp, minPrice, maxPrice, avg } = useMemo(() => {
    if (!history || history.length === 0) return { chartData: [], isUp: true };
    const first = history[0]?.close;
    const last = history[history.length - 1]?.close;
    const prices = history.map(d => d.close);
    const minPrice = Math.min(...prices) * 0.995;
    const maxPrice = Math.max(...prices) * 1.005;
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    // Thin out to max 60 points for readability
    const step = Math.max(1, Math.floor(history.length / 60));
    const chartData = history.filter((_, i) => i % step === 0 || i === history.length - 1);
    return { chartData, isUp: last >= first, minPrice, maxPrice, avg };
  }, [history]);

  const gradientId = isUp ? 'greenGrad' : 'redGrad';
  const strokeColor = isUp ? '#10b981' : '#f43f5e';

  if (!chartData.length) return (
    <div style={{ textAlign: 'center', color: '#475569', padding: '2rem', fontSize: '0.9rem' }}>
      No chart data available
    </div>
  );

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <span className="chart-label">90-Day Price History</span>
        <span style={{ color: strokeColor, fontWeight: 700, fontSize: '0.9rem' }}>
          {isUp ? '▲' : '▼'} {ticker}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#475569', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(d) => {
              const date = new Date(d);
              return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: '#475569', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avg}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 4"
            label={null}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor, stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
