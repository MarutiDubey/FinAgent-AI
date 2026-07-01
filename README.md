<div align="center">
  <img src="https://api.iconify.design/lucide/trending-up.svg?color=%2322c55e" width="80" alt="FinAgentAI Logo">
  
  # FinAgent AI
  **A production-grade, multi-agent financial analyst built with LangGraph and React.**

  [**✨ Live Demo**](https://fin-agent-ai.vercel.app/)

  [![React](https://img.shields.io/badge/React-18-20232A?style=flat-square&logo=react)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.138-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-FF9900?style=flat-square)](https://python.langchain.com/docs/langgraph)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
</div>

<br />

FinAgent AI is an intelligent financial dashboard powered by three specialized AI agents working in sequence. It combines real-time market data, technical chart analysis, and GPT-4o-mini news sentiment into a single, actionable BUY / SELL / HOLD report — all wrapped in a stunning glassmorphic UI.

> Sach bolu to, pehli baar kisi UI par itna time lagaya hai. I don't know if I'll feel this excited in the future, but right now... this UI is absolutely insane. 🔥

---

## 🚀 Features

- **Multi-Agent Architecture** — Powered by LangGraph. Three specialized agents (Technical, Sentiment, and Portfolio Manager) work in sequence to generate a comprehensive report.
- **Stock Comparison** — Analyze 2–3 tickers side-by-side. The AI ranks them on technical strength, sentiment, and fundamentals, then picks the strongest buy candidate.
- **Real-Time Market Data** — Pulls live price, volume, P/E ratio, market cap, and 52-week ranges via Yahoo Finance (`yfinance`).
- **Technical Indicators** — Automatically calculates RSI, MACD, and 20/50-day SMAs, complete with a 90-day interactive price history chart.
- **Sentiment Intelligence** — Scrapes the latest news headlines and feeds them to GPT-4o-mini to calculate a structured market mood score (0–100).
- **Beautiful UI/UX** — Built with Framer Motion, GSAP, and Three.js for smooth interactions, custom cursors, and an animated ASCII hero section.
- **Persistent Watchlist** — Remembers your recent ticker searches and lets you pin favourite stocks to a local watchlist.

> [!IMPORTANT]
> **Searching for International Stocks**
> Because FinAgent AI uses Yahoo Finance, you must append the correct exchange suffix for non-US stocks.
> - **NSE:** Append `.NS` (e.g., `TCS.NS`, `RELIANCE.NS`)
> - **BSE:** Append `.BO` (e.g., `TCS.BO`, `INFY.BO`)

---

## 🧠 How the Agents Work

```
 User Input (Ticker Symbol)
         │
         ▼
 ┌─────────────────────┐
 │  Technical Analyst  │  Fetches 90-day OHLC data, calculates RSI, SMA-20/50, MACD
 └─────────────────────┘
         │
         ▼
 ┌─────────────────────┐
 │  Sentiment Analyst  │  Scrapes latest news → GPT-4o-mini → 0–100 sentiment score
 └─────────────────────┘
         │
         ▼
 ┌─────────────────────┐
 │  Portfolio Manager  │  Synthesises both signals → BUY / SELL / HOLD + risk report
 └─────────────────────┘
```

1. **Technical Analyst Agent** — Fetches historical OHLC data, computes RSI, dual SMA crossovers, MACD momentum, and determines the mathematical trend.
2. **Sentiment Analyst Agent** — Gathers recent news headlines and uses an LLM to evaluate overarching market sentiment with a structured score.
3. **Portfolio Manager Agent** — Synthesises the technical and sentiment data into a professional investment report featuring a **BUY / SELL / HOLD** verdict, executive summary, risk factors, and price targets.

---

## 🛠️ Tech Stack

**Frontend:**
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| Framer Motion | Page transitions and micro-animations |
| Recharts | Interactive 90-day price history chart |
| Three.js & React Bits | Visual effects and ASCII hero |
| Lucide React | Icon system |

**Backend:**
| Technology | Purpose |
|---|---|
| Python 3.10+ | Runtime |
| FastAPI | REST API server |
| LangGraph & LangChain | Multi-agent workflow orchestration |
| OpenAI GPT-4o-mini (via OpenRouter) | Sentiment & portfolio manager LLM |
| Yahoo Finance (`yfinance`) | Live market data |

---

## ⚙️ Local Installation

### Prerequisites
- Node.js v18+
- Python 3.10+
- An [OpenRouter](https://openrouter.ai/) API key

### 1. Clone the repository
```bash
git clone https://github.com/MarutiDubey/FinAgentAI.git
cd FinAgentAI
```

### 2. Setup the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create a .env file with your credentials
cp .env.example .env
# Then edit .env and fill in your OPENAI_API_KEY
```

### 3. Setup the Frontend
```bash
cd ../frontend
npm install

# Create local env file
cp .env.example .env
# Edit .env — set VITE_API_BASE=http://localhost:8000
```

### 4. Run the Application
You will need two terminal windows.

**Terminal 1 — Backend:**
```bash
cd backend
python main.py
```
*(Runs on http://localhost:8000)*

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
*(Runs on http://localhost:5173)*

---

## 🌍 Deployment

The project is deployed on a **free-tier** infrastructure with zero ongoing cost:

| Layer | Platform | Notes |
|---|---|---|
| Frontend | [Vercel](https://vercel.com/) | Set `VITE_API_BASE` env var to your Render URL |
| Backend | [Render](https://render.com/) | Set `OPENAI_API_KEY`, `OPENAI_API_BASE`, `ALLOWED_ORIGINS` |

> [!NOTE]
> **Environment Variables — Render (Backend)**
> ```
> OPENAI_API_KEY=your_openrouter_key
> OPENAI_API_BASE=https://openrouter.ai/api/v1
> ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173
> ```

> [!NOTE]
> **Environment Variables — Vercel (Frontend)**
> ```
> VITE_API_BASE=https://your-render-backend.onrender.com
> ```

---

## 📁 Project Structure

```
FinAgentAI/
├── backend/
│   ├── agent.py          # LangGraph agents (Technical, Sentiment, Portfolio Manager)
│   ├── main.py           # FastAPI app, CORS config, NaN sanitizer
│   ├── requirements.txt  # Pinned Python dependencies
│   ├── .env.example      # Environment variable template
│   └── .gitignore
│
└── frontend/
    ├── src/
    │   ├── App.jsx               # Main app shell + routing
    │   ├── index.css             # Global design system
    │   └── components/
    │       ├── ComparePage.jsx   # Stock comparison view
    │       ├── Navbar.jsx        # Navigation bar
    │       ├── SidePanel.jsx     # Watchlist & history panel
    │       ├── StockChart.jsx    # 90-day price chart
    │       ├── MetricCard.jsx    # Reusable metric display
    │       └── ...               # Visual effect components
    ├── .env.example
    └── vite.config.js
```

---

## 👨‍💻 Built By
**Manthan Dubey**  
Designed for speed, insight, and an unparalleled user experience.
