from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from hedge import PolymarketAnalyzer
from agent import run_agent
from concurrent.futures import ThreadPoolExecutor

app = FastAPI(title="PolyHedge API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = PolymarketAnalyzer()

# --- Models ---

class MarketSummary(BaseModel):
    id: str
    title: str
    token_id: str
    question: str
    age: str
    volume_24h: Optional[float] = 0

class CorrelationResult(BaseModel):
    market_title: str
    token_id: str
    correlation: float
    visual_beta: float # Simplified beta for UI
    explanation: str

class PricePoint(BaseModel):
    time: str # ISO string or simple time
    target_price: float
    hedge_price: Optional[float] = None

class AnalyzeResponse(BaseModel):
    target: Dict[str, Any]
    history: List[PricePoint]
    correlations: List[CorrelationResult]

class ExplainRequest(BaseModel):
    market_title: str
    related_market_title: Optional[str] = None
    correlation: Optional[float] = None
    context: Optional[str] = "General analysis"

# --- Endpoints ---

@app.post("/explain")
def explain_insight(req: ExplainRequest):
    """
    On-demand AI explanation for a market or correlation.
    """
    if req.related_market_title:
        prompt = (
            f"Explain the relationship between the prediction market '{req.market_title}' "
            f"and '{req.related_market_title}'. "
            f"The statistical correlation is {req.correlation}. "
            f"Why might these assets move together or inversely? "
            f"Context: {req.context}"
        )
    else:
        prompt = (
            f"Analyze the prediction market '{req.market_title}'. "
            f"What are the key macro drivers or news events likely affecting this market right now? "
            f"Context: {req.context}"
        )
    
    return {"insight": run_agent(prompt)}

@app.get("/")
def health_check():
    return {"status": "ok", "service": "PolyHedge API"}

@app.get("/markets", response_model=List[MarketSummary])
def search_markets(category: Optional[str] = None):
    """
    Fetches top markets. 
    Category slugs: politics, crypto, sports, business, science, pop-culture
    """
    limit = 100 if category else 20
    # Map "global" to None
    slug = None if category == "global" else category
    
    try:
        markets = analyzer.get_top_markets(limit=limit, tag_slug=slug)
        # Convert to lightweight model
        results = []
        for m in markets:
            results.append(MarketSummary(
                id=m['id'],
                title=m['title'],
                token_id=m['token_id'],
                question=m['question'],
                age=m.get('age', 'Active'),
                volume_24h=0 # We might need to add this to hedge.py if available, currently not exposed
            ))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analyze")
def analyze(target_id: str, category: str = "global"):
    """
    Full analysis: 
    1. Fetches target market history.
    2. Fetches comparison pool based on category.
    3. Calculates correlations.
    4. Returns reformatted data for UI.
    """
    # 1. Fetch comparison pool (this repeats logic but it's stateless)
    slug = None if category == "global" else category
    try:
        raw_markets = analyzer.get_top_markets(limit=50 if category == "global" else 30, tag_slug=slug)
        
        # 2. Filter dead markets (Quick check, maybe skip deep check to save time or stick to lightweight check)
        # Re-implementing simplified check for speed
        active_markets = []
        # We'll just trust the fetch for now to speed it up, or do a minimal check if crashes occur
        # hedge.py's check_market_quality is robust but slow (fetches last trade).
        # maximizing speed: rely on 'active=true' from Gamma API.
        active_markets = raw_markets 
        
        # 3. Analyze
        # Find target title first
        target_market = next((m for m in active_markets if m['token_id'] == target_id), None)
        if not target_market:
            # If target not in top 50, fetch it specifically? 
            # For MVP, assume user picked from the list. 
            # If not found, we might need a separate 'get_market_details' but let's proceed.
            # We'll construct a dummy target object if missing from pool
            target_market = {'title': 'Target Market', 'token_id': target_id}

        corrs, valid_markets, combined_df = analyzer.analyze_correlations(target_id, active_markets)
        
        if combined_df is None:
             raise HTTPException(status_code=400, detail="Insufficient data for target market")

        # 4. Format Results
        # Build History for Chart (Downsample if needed)
        # Combined DF has columns: [target_id, other_id1, other_id2...]
        # We want to return list of {time, target_price} for the sparkline/main chart
        
        # Resample to hourly if not already
        chart_data = []
        target_series = combined_df[target_id]
        
        # Limit to last 100 points for performance
        display_df = combined_df.tail(100)
        
        for ts, row in display_df.iterrows():
            chart_data.append({
                "time": ts.isoformat(),
                "target_price": round(row[target_id], 4) if not pd.isna(row[target_id]) else None
            })

        # Process Correlations
        correlation_results = []
        if corrs is not None:
            sorted_corrs = corrs.sort_values(ascending=False)
            top_pos = sorted_corrs.head(5)
            top_neg = sorted_corrs.dropna().tail(5)
            
            # Helper to format
            def add_res(items, is_hedge=False):
                for tid, score in items.items():
                    if tid == target_id: continue
                    m_info = next((m for m in valid_markets if m['token_id'] == tid), None)
                    if m_info:
                        explanation = "Strong inverse movement." if is_hedge else "Moves in lockstep."
                        correlation_results.append({
                            "market_title": m_info['title'],
                            "token_id": tid,
                            "correlation": round(score, 2),
                            "visual_beta": round(score * 1.2, 2), # Mock beta for now
                            "explanation": explanation
                        })

            add_res(top_pos)
            add_res(top_neg, is_hedge=True)

        return {
            "target": {
                "title": target_market['title'],
                "current_price": chart_data[-1]['target_price'] if chart_data else 0,
                "volatility": 0.05 # Mock
            },
            "history": chart_data,
            "correlations": correlation_results
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
