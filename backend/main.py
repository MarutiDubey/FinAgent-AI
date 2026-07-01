import os
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import build_graph, compare_stocks

app = FastAPI(title="Financial Analyst Agent API")

# Comma-separated list of allowed origins. Defaults to local dev + the Vercel domain.
# Override in production via the ALLOWED_ORIGINS env var.
_default_origins = "http://localhost:5173,http://localhost:3000,https://fin-agent-ai.vercel.app"
allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = build_graph()

import math

def sanitize(obj):
    if isinstance(obj, float):
        return None if math.isnan(obj) or math.isinf(obj) else obj
    elif isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj

@app.get("/api/analyze")
async def analyze_stock(ticker: str):
    ticker = ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker parameter is required")

    try:
        initial_state = {
            "ticker": ticker,
            "technical_analysis": "",
            "sentiment_analysis": "",
            "recommendation": "",
            "info": {},
            "history": [],
            "error": ""
        }

        result = agent.invoke(initial_state)

        if result.get("error"):
            raise HTTPException(status_code=404, detail=result["error"])

        return sanitize({
            "ticker": result["ticker"],
            "info": result["info"],
            "history": result.get("history", []),
            "technical_analysis": result["technical_analysis"],
            "sentiment_analysis": result["sentiment_analysis"],
            "recommendation": result["recommendation"]
        })
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

class CompareRequest(BaseModel):
    tickers: List[str]


@app.post("/api/compare")
async def compare(req: CompareRequest):
    try:
        result = compare_stocks(req.tickers)
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        return sanitize(result)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
