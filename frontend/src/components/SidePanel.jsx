import { useState, useEffect } from 'react';
import { Clock, Star, StarOff, X } from 'lucide-react';

const HISTORY_KEY = 'finagent_history';
const WATCHLIST_KEY = 'finagent_watchlist';

export default function SidePanel({ onSearch, currentTicker }) {
  const [history, setHistory] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [tab, setTab] = useState('history');

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
      setWatchlist(JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]'));
    } catch {}
  }, []);

  const addToHistory = (ticker) => {
    setHistory(prev => {
      const next = [ticker, ...prev.filter(t => t !== ticker)].slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Expose addToHistory to parent via ref pattern — use window event
  useEffect(() => {
    if (!currentTicker) return;
    addToHistory(currentTicker);
  }, [currentTicker]);

  const toggleWatchlist = (ticker) => {
    setWatchlist(prev => {
      const next = prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeHistory = (ticker) => {
    setHistory(prev => {
      const next = prev.filter(t => t !== ticker);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const list = tab === 'history' ? history : watchlist;

  return (
    <div className="side-panel glass-card">
      <div className="side-panel-tabs">
        <button
          className={`side-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          <Clock size={13} /> Recent
        </button>
        <button
          className={`side-tab ${tab === 'watchlist' ? 'active' : ''}`}
          onClick={() => setTab('watchlist')}
        >
          <Star size={13} /> Watchlist
        </button>
      </div>

      {list.length === 0 ? (
        <p className="side-panel-empty">
          {tab === 'history' ? 'Your recent searches appear here.' : 'Star a ticker to add it to your watchlist.'}
        </p>
      ) : (
        <ul className="side-panel-list">
          {list.map(ticker => (
            <li key={ticker} className="side-panel-item">
              <button className="side-ticker-btn cursor-target" onClick={() => onSearch(ticker)}>
                {ticker}
              </button>
              <div className="side-item-actions">
                <button
                  className="side-action-btn"
                  title={watchlist.includes(ticker) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  onClick={() => toggleWatchlist(ticker)}
                >
                  {watchlist.includes(ticker) ? <Star size={13} color="#f59e0b" fill="#f59e0b" /> : <StarOff size={13} />}
                </button>
                {tab === 'history' && (
                  <button className="side-action-btn" title="Remove" onClick={() => removeHistory(ticker)}>
                    <X size={13} />
                  </button>
                )}
                {tab === 'watchlist' && (
                  <button className="side-action-btn" title="Remove" onClick={() => toggleWatchlist(ticker)}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
