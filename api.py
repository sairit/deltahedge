from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from hedge import PolymarketAnalyzer
from concurrent.futures import ThreadPoolExecutor
from tokenc import TokenClient
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
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

# --- AI Agent Setup ---
API_KEY = os.getenv("GOOGLE_API_KEY")

# Initialize the new SDK Client
# If using AI Studio (most common), pass the api_key directly
client_gemini = genai.Client(api_key=API_KEY)

# Initialize TokenClient for compression
token_client = TokenClient(api_key=os.getenv("TOKENC_API_KEY"))

def run_agent(query: str) -> str:
    try:
        system_instruction = (
            "You are a calm, analytical trading assistant for a prediction market dashboard. "
            "Explain correlations and risks clearly and concisely. "
            "No emojis. No hype. No disclaimers. Max 3-5 sentences. "
            "Focus on macro factors or logical connections."
        )

        full_prompt = f"{system_instruction}\n\nQuery: {query}"
        
        # 1. Compress the prompt
        compressed_text = token_client.compress_input(
            input=full_prompt,
            aggressiveness=0.2
        ).output

        # 2. Generate Content
        # Ensure the model string matches the Jan 2026 release: 'gemini-3-flash-preview'
        response = client_gemini.models.generate_content(
            model="gemini-3-flash-preview",
            contents=compressed_text
        )

        if not response.text:
            return "The model returned an empty response."

        return response.text.strip()
            
    except Exception as e:
        # CRITICAL: Print the error to your console so you can debug!
        print(f"--- AGENT ERROR DEBUG ---")
        print(f"Type: {type(e).__name__}")
        print(f"Message: {str(e)}")
        print(f"--------------------------")
        return "Unable to generate explanation at the moment."
    
# --- Models ---

class MarketSummary(BaseModel):
    id: str
    title: str
    token_id: str
    question: str
    age: str
    volume_24h: Optional[float] = 0
    # Multi-option market fields
    is_multi_option: Optional[bool] = False
    outcome_name: Optional[str] = None  # e.g., "Kamala Harris" for multi-option markets
    total_outcomes: Optional[int] = None
    event_id: Optional[str] = None  # For grouping outcomes
    no_token_id: Optional[str] = None  # NO token for direct trading

class EventOutcome(BaseModel):
    token_id: str
    no_token_id: Optional[str] = None
    outcome_name: str
    volume_24h: Optional[float] = 0

class CorrelationResult(BaseModel):
    market_title: str
    token_id: str
    correlation: float
    visual_beta: float # Simplified beta for UId
    explanation: str
    # Multi-option market fields
    is_multi_option: Optional[bool] = False
    outcome_name: Optional[str] = None

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
    limit = 30 if category else 15  # Reduced for performance
    # Map "global" to None
    slug = None if category == "global" else category
    
    try:
        markets = analyzer.get_top_markets(limit=limit, tag_slug=slug)
        # Convert to lightweight model
        results = []
        for m in markets:
            # For multi-option markets, include the outcome name in the title
            display_title = m['title']
            if m.get('is_multi_option') and m.get('outcome_name'):
                display_title = f"{m['title']}: {m['outcome_name']}"
            
            results.append(MarketSummary(
                id=m['id'],
                title=display_title,
                token_id=m['token_id'],
                question=m['question'],
                age=m.get('age', 'Active'),
                volume_24h=m.get('volume_24h', 0),
                is_multi_option=m.get('is_multi_option', False),
                outcome_name=m.get('outcome_name'),
                total_outcomes=m.get('total_outcomes'),
                event_id=m.get('event_id'),
                no_token_id=m.get('no_token_id')
            ))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/event/{event_id}/outcomes", response_model=List[EventOutcome])
def get_event_outcomes(event_id: str):
    """
    Gets all outcomes for a multi-option event.
    Returns list of outcomes with their token IDs and names.
    """
    try:
        # Fetch all markets
        markets = analyzer.get_top_markets(limit=100)
        
        # Filter to only this event's markets
        event_markets = [m for m in markets if m.get('event_id') == event_id]
        
        if not event_markets:
            raise HTTPException(status_code=404, detail="Event not found")
        
        outcomes = []
        for m in event_markets:
            outcomes.append(EventOutcome(
                token_id=m['token_id'],
                no_token_id=m.get('no_token_id'),
                outcome_name=m.get('outcome_name', m.get('title', 'Unknown')),
                volume_24h=m.get('volume_24h', 0)
            ))
        
        # Sort by volume (most popular first)
        outcomes.sort(key=lambda x: x.volume_24h or 0, reverse=True)
        return outcomes
    except HTTPException:
        raise
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
        # Limit to top 200 markets for comparison
        raw_markets = analyzer.get_top_markets(limit=200, tag_slug=slug)
        
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
        
        # Calculate actual volatility from returns
        returns = target_series.pct_change().dropna()
        volatility = returns.std() if len(returns) > 0 else 0.05
        
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
            top_pos = sorted_corrs.head(10)  # Get more positive correlations
            top_neg = sorted_corrs.dropna().tail(10)  # Get more negative correlations
            
            # Calculate betas for each correlation
            returns_df = combined_df.pct_change().dropna()
            target_vol = returns_df[target_id].std() if target_id in returns_df.columns else volatility
            
            # Helper to format
            def add_res(items, is_hedge=False):
                for tid, score in items.items():
                    if tid == target_id: continue
                    m_info = next((m for m in valid_markets if m['token_id'] == tid), None)
                    if m_info:
                        # Calculate actual beta
                        if tid in returns_df.columns:
                            hedge_vol = returns_df[tid].std()
                            if hedge_vol > 0:
                                beta = score * (target_vol / hedge_vol)
                            else:
                                beta = score * 1.2
                        else:
                            beta = score * 1.2
                        
                        explanation = "Strong inverse movement." if is_hedge else "Moves in lockstep."
                        
                        # For multi-option markets, include the outcome name in the title
                        display_title = m_info['title']
                        if m_info.get('is_multi_option') and m_info.get('outcome_name'):
                            display_title = f"{m_info['title']}: {m_info['outcome_name']}"
                        
                        correlation_results.append({
                            "market_title": display_title,
                            "token_id": tid,
                            "correlation": round(score, 2),
                            "visual_beta": round(beta, 2),
                            "explanation": explanation,
                            "is_multi_option": m_info.get('is_multi_option', False),
                            "outcome_name": m_info.get('outcome_name'),
                            "total_outcomes": m_info.get('total_outcomes')
                        })

            add_res(top_pos)
            add_res(top_neg, is_hedge=True)
            
            # Sort by absolute correlation strength (strongest first)
            correlation_results.sort(key=lambda x: abs(x['correlation']), reverse=True)

        return {
            "target": {
                "title": target_market['title'],
                "current_price": chart_data[-1]['target_price'] if chart_data else 0,
                "volatility": round(float(volatility), 4),
                "is_multi_option": target_market.get('is_multi_option', False),
                "outcome_name": target_market.get('outcome_name'),
                "total_outcomes": target_market.get('total_outcomes')
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
