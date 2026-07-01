import os
import yfinance as yf
from typing import TypedDict, List
from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

load_dotenv()

# Define state
class AgentState(TypedDict):
    ticker: str
    info: dict
    history: list
    technical_analysis: str
    sentiment_analysis: str
    recommendation: str
    error: str

# Helper to calculate RSI
def calculate_rsi(prices, period=14):
    if len(prices) < period + 1:
        return 50.0
    gains, losses = [], []
    for i in range(1, len(prices)):
        diff = prices[i] - prices[i-1]
        gains.append(diff if diff > 0 else 0)
        losses.append(abs(diff) if diff < 0 else 0)

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    if avg_loss == 0:
        return 100.0

    for i in range(period, len(prices) - 1):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    rs = avg_gain / avg_loss if avg_loss != 0 else 0
    return 100.0 - (100.0 / (1.0 + rs))

def _safe_float(val, default=None):
    try:
        f = float(val)
        return round(f, 4) if f else default
    except (TypeError, ValueError):
        return default

def _format_large(val):
    try:
        v = float(val)
        if v >= 1e12:
            return f"${v/1e12:.2f}T"
        if v >= 1e9:
            return f"${v/1e9:.2f}B"
        if v >= 1e6:
            return f"${v/1e6:.2f}M"
        return str(int(v))
    except:
        return "N/A"

def technical_analyst(state: AgentState) -> dict:
    ticker_sym = state["ticker"]
    try:
        ticker = yf.Ticker(ticker_sym)
        hist = ticker.history(period="3mo")
        
        # Drop rows with NaN in Close price (common Yahoo API bug)
        hist = hist.dropna(subset=['Close'])
        
        if hist.empty:
            return {"error": f"No data found for ticker '{ticker_sym}'. Please check the symbol."}

        close_prices = hist['Close'].tolist()
        current_price = close_prices[-1]

        # SMAs
        sma_20 = sum(close_prices[-20:]) / 20 if len(close_prices) >= 20 else current_price
        sma_50 = sum(close_prices[-50:]) / 50 if len(close_prices) >= 50 else current_price

        # RSI
        rsi = calculate_rsi(close_prices)

        # MACD (12/26 EMA approximation)
        def ema(prices, period):
            k = 2 / (period + 1)
            ema_val = prices[0]
            for p in prices[1:]:
                ema_val = p * k + ema_val * (1 - k)
            return ema_val

        ema_12 = ema(close_prices, 12) if len(close_prices) >= 12 else current_price
        ema_26 = ema(close_prices, 26) if len(close_prices) >= 26 else current_price
        macd = ema_12 - ema_26

        # Trend
        trend = "Bullish 🟢" if current_price > sma_20 > sma_50 else ("Bearish 🔴" if current_price < sma_20 < sma_50 else "Neutral ⚪")

        # Volume
        volumes = hist['Volume'].tolist()
        avg_vol = sum(volumes) / len(volumes) if volumes else 0
        latest_vol = volumes[-1] if volumes else 0

        analysis_str = (
            f"Technical Analysis for {ticker_sym}:\n"
            f"- Current Price: ${current_price:.2f}\n"
            f"- 20-day SMA: ${sma_20:.2f}\n"
            f"- 50-day SMA: ${sma_50:.2f}\n"
            f"- 14-day RSI: {rsi:.2f}\n"
            f"- MACD: {macd:.4f}\n"
            f"- Volume: {latest_vol:,.0f} (Avg: {avg_vol:,.0f})\n"
            f"- Overall Trend: {trend}\n"
        )

        # Build OHLC history list for chart
        history_data = []
        for idx, row in hist.iterrows():
            history_data.append({
                "date": idx.strftime("%Y-%m-%d"),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume'])
            })

        # Rich info dict
        raw_info = {}
        try:
            raw_info = ticker.info
        except Exception:
            pass

        prev_close = close_prices[-2] if len(close_prices) > 1 else current_price
        change_pct = ((current_price - prev_close) / prev_close) * 100

        info = {
            "name": raw_info.get("longName", ticker_sym),
            "price": round(current_price, 2),
            "change": round(change_pct, 2),
            "currency": raw_info.get("currency", "USD"),
            "sector": raw_info.get("sector", "N/A"),
            "industry": raw_info.get("industry", "N/A"),
            "market_cap": _format_large(raw_info.get("marketCap")),
            "pe_ratio": _safe_float(raw_info.get("trailingPE"), "N/A"),
            "forward_pe": _safe_float(raw_info.get("forwardPE"), "N/A"),
            "week_52_high": _safe_float(raw_info.get("fiftyTwoWeekHigh"), round(max(close_prices), 2)),
            "week_52_low": _safe_float(raw_info.get("fiftyTwoWeekLow"), round(min(close_prices), 2)),
            "volume": f"{latest_vol:,.0f}",
            "avg_volume": f"{avg_vol:,.0f}",
            "beta": _safe_float(raw_info.get("beta"), "N/A"),
            "dividend_yield": f"{round(float(raw_info.get('dividendYield', 0) or 0) * 100, 2)}%",
            "rsi": round(rsi, 2),
            "macd": round(macd, 4),
            "sma_20": round(sma_20, 2),
            "sma_50": round(sma_50, 2),
            "trend": trend,
            "description": raw_info.get("longBusinessSummary", "")[:400] if raw_info.get("longBusinessSummary") else ""
        }

        return {"technical_analysis": analysis_str, "info": info, "history": history_data}
    except Exception as e:
        return {"error": f"Technical analysis failed: {str(e)}"}


def sentiment_analyst(state: AgentState) -> dict:
    if state.get("error"):
        return {}
    ticker_sym = state["ticker"]
    try:
        ticker = yf.Ticker(ticker_sym)
        news = ticker.news[:7] if ticker.news else []

        if not news:
            return {"sentiment_analysis": "No recent news found for this stock. Sentiment is neutral."}

        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = "https://openrouter.ai/api/v1" if api_key.startswith("sk-or") else None
        llm = ChatOpenAI(model="openai/gpt-4o-mini", temperature=0, base_url=base_url)

        news_items = []
        for item in news:
            content = item.get("content", {})
            title = content.get("title", item.get("title", ""))
            publisher = content.get("provider", {}).get("displayName", item.get("publisher", ""))
            news_items.append(f"- {title} (Source: {publisher})")

        news_text = "\n".join(news_items)

        system_msg = SystemMessage(content=(
            "You are a financial sentiment analyst. Analyze the news headlines below for the given stock ticker. "
            "Provide:\n1. Overall Sentiment: Positive / Negative / Neutral\n"
            "2. Sentiment Score: A number from 0-100 (0=very bearish, 50=neutral, 100=very bullish)\n"
            "3. Key Themes: 2-3 bullet points describing major themes in the news\n"
            "4. Summary: 2-3 sentences synthesizing the news impact.\n"
            "Format your response exactly as shown above."
        ))
        human_msg = HumanMessage(content=f"Stock: {ticker_sym}\nHeadlines:\n{news_text}")

        response = llm.invoke([system_msg, human_msg])
        return {"sentiment_analysis": response.content}
    except Exception as e:
        return {"sentiment_analysis": f"Sentiment analysis unavailable: {str(e)}. Defaulting to Neutral."}


def portfolio_manager(state: AgentState) -> dict:
    if state.get("error"):
        return {"recommendation": f"Failed to generate report: {state['error']}"}

    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = "https://openrouter.ai/api/v1" if api_key.startswith("sk-or") else None
    llm = ChatOpenAI(model="openai/gpt-4o-mini", temperature=0, base_url=base_url)

    info = state.get("info", {})
    company_name = info.get("name", state["ticker"])
    current_price = info.get("price", 0.0)

    system_msg = SystemMessage(content=(
        "You are an expert Portfolio Manager AI. Synthesize the technical and sentiment analysis "
        "into a clear, structured investment report. Follow this EXACT format:\n\n"
        "**Recommendation**: [BUY / SELL / HOLD]\n\n"
        "## Executive Summary\n"
        "[2-3 sentence overview of the company and current situation]\n\n"
        "## Technical Outlook\n"
        "[Analysis of price action, SMA crossovers, RSI, MACD signals]\n\n"
        "## Sentiment Outlook\n"
        "[Interpretation of news sentiment and market perception]\n\n"
        "## Risk Factors\n"
        "- [Risk 1]\n- [Risk 2]\n- [Risk 3]\n\n"
        "## Final Verdict\n"
        "[Clear justification for the recommendation with price targets if possible]\n\n"
        "Be professional, concise, and use markdown formatting."
    ))

    human_msg = HumanMessage(content=(
        f"Company: {company_name} ({state['ticker']})\n"
        f"Current Price: ${current_price:.2f}\n"
        f"Sector: {info.get('sector', 'N/A')} | Industry: {info.get('industry', 'N/A')}\n"
        f"P/E Ratio: {info.get('pe_ratio', 'N/A')} | Market Cap: {info.get('market_cap', 'N/A')}\n"
        f"Beta: {info.get('beta', 'N/A')} | RSI: {info.get('rsi', 'N/A')}\n"
        f"52-Week High: {info.get('week_52_high', 'N/A')} | Low: {info.get('week_52_low', 'N/A')}\n\n"
        f"Technical Analysis:\n{state['technical_analysis']}\n\n"
        f"Sentiment Analysis:\n{state['sentiment_analysis']}"
    ))

    response = llm.invoke([system_msg, human_msg])
    return {"recommendation": response.content}


def compare_stocks(tickers: List[str]) -> dict:
    """Run technical analysis on 2-3 tickers and ask the LLM to pick the stronger buy.

    Reuses ``technical_analyst`` for each ticker, then makes a single LLM call that
    ranks them. Returns ``{stocks: [...], verdict: str}`` (or ``{error: str}``).
    """
    clean = []
    seen = set()
    for t in tickers:
        sym = (t or "").strip().upper()
        if sym and sym not in seen:
            seen.add(sym)
            clean.append(sym)

    if len(clean) < 2:
        return {"error": "Please provide at least 2 different tickers to compare."}
    if len(clean) > 3:
        clean = clean[:3]

    stocks = []
    for sym in clean:
        result = technical_analyst({"ticker": sym})
        if result.get("error"):
            return {"error": f"{sym}: {result['error']}"}
        info = result.get("info", {})
        stocks.append({
            "ticker": sym,
            "info": info,
            "technical_analysis": result.get("technical_analysis", ""),
            "history": result.get("history", []),
        })

    try:
        api_key = os.getenv("OPENAI_API_KEY", "")
        base_url = "https://openrouter.ai/api/v1" if api_key.startswith("sk-or") else None
        llm = ChatOpenAI(model="openai/gpt-4o-mini", temperature=0, base_url=base_url)

        summaries = []
        for s in stocks:
            info = s["info"]
            summaries.append(
                f"### {info.get('name', s['ticker'])} ({s['ticker']})\n"
                f"- Price: ${info.get('price', 'N/A')} | Change: {info.get('change', 'N/A')}%\n"
                f"- Sector: {info.get('sector', 'N/A')} | Industry: {info.get('industry', 'N/A')}\n"
                f"- Market Cap: {info.get('market_cap', 'N/A')} | P/E: {info.get('pe_ratio', 'N/A')} | Beta: {info.get('beta', 'N/A')}\n"
                f"- RSI: {info.get('rsi', 'N/A')} | MACD: {info.get('macd', 'N/A')} | Trend: {info.get('trend', 'N/A')}\n"
                f"- 52W High: {info.get('week_52_high', 'N/A')} | 52W Low: {info.get('week_52_low', 'N/A')}\n"
            )

        ticker_list = ", ".join(s["ticker"] for s in stocks)
        system_msg = SystemMessage(content=(
            "You are an expert Portfolio Manager AI comparing stocks head-to-head. "
            "Analyze the technical metrics for each stock and decide which is the stronger BUY right now. "
            "Follow this EXACT markdown format:\n\n"
            "**Winner**: [TICKER]\n\n"
            "## Verdict\n"
            "[2-3 sentences naming the stronger buy and why]\n\n"
            "## Head-to-Head\n"
            "[Compare the stocks on momentum (RSI/MACD/trend), valuation (P/E), and risk (beta). "
            "Use a few bullet points.]\n\n"
            "## Watch-outs\n"
            "- [Key risk for the comparison]\n\n"
            "Be professional and concise. Base your reasoning only on the data provided."
        ))
        human_msg = HumanMessage(content=(
            f"Compare these stocks and pick the stronger buy: {ticker_list}\n\n"
            + "\n".join(summaries)
        ))

        response = llm.invoke([system_msg, human_msg])
        verdict = response.content
    except Exception as e:
        verdict = f"AI verdict unavailable: {str(e)}. Compare the metrics side-by-side above."

    return {"stocks": stocks, "verdict": verdict}


def build_graph() -> StateGraph:
    workflow = StateGraph(AgentState)
    workflow.add_node("technical", technical_analyst)
    workflow.add_node("sentiment", sentiment_analyst)
    workflow.add_node("manager", portfolio_manager)

    workflow.set_entry_point("technical")
    workflow.add_edge("technical", "sentiment")
    workflow.add_edge("sentiment", "manager")
    workflow.add_edge("manager", END)

    return workflow.compile()
