import requests
import pandas as pd
import numpy as np
import time
import sys
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# --- Configuration ---
GAMMA_API_URL = "https://gamma-api.polymarket.com"
CLOB_API_URL = "https://clob.polymarket.com"

class PolymarketAnalyzer:
    def __init__(self):
        self.session = requests.Session()

    def get_top_markets(self, limit=20, tag_slug=None):
        """Fetches top active markets by volume to use as a comparison pool."""
        endpoint = f"{GAMMA_API_URL}/events"
        params = {
            "active": "true",
            "closed": "false",
            "limit": limit,
            "order": "volume24hr",
            "ascending": "false"
        }
        if tag_slug:
            params["tag_slug"] = tag_slug

        try:
            r = self.session.get(endpoint, params=params)
            r.raise_for_status()
            events = r.json()
            
            market_list = []
            for e in events:
                if e.get('markets'):
                    for m in e['markets']:
                        # Get outcomes - check if binary market
                        outcomes = m.get('outcomes', [])
                        clob_ids = m.get('clobTokenIds', [])
                        
                        if isinstance(clob_ids, str):
                            try:
                                clob_ids = json.loads(clob_ids)
                            except json.JSONDecodeError:
                                clob_ids = []
                        
                        # Only include binary markets (exactly 2 token IDs = YES/NO market)
                        # Check both outcomes and clob_ids to ensure binary market
                        is_binary = len(clob_ids) == 2
                        if outcomes:
                            is_binary = is_binary and len(outcomes) == 2
                        
                        if is_binary:
                            # Calculate Age
                            created_at = e.get('creationDate')
                            age_str = "?"
                            age_hours = 0
                            if created_at:
                                try:
                                    create_dt = pd.to_datetime(created_at)
                                    now = pd.Timestamp.now(tz=create_dt.tz)
                                    diff = now - create_dt
                                    age_hours = diff.total_seconds() / 3600
                                    days = diff.days
                                    if days < 1:
                                        age_str = f"{int(age_hours)}h"
                                    else:
                                        age_str = f"{days}d"
                                except:
                                    pass
                            
                            # Get volume if available
                            volume_24h = m.get('volume24hr', 0) or e.get('volume24hr', 0)
                            
                            # Create market entry for YES outcome (index 0)
                            market_list.append({
                                'title': e['title'],
                                'question': m['question'],
                                'token_id': clob_ids[0],  # YES token
                                'id': m['id'],
                                'tags': e.get('tags', []),
                                'age': age_str,
                                'age_hours': age_hours,
                                'volume_24h': volume_24h,
                                'outcomes': outcomes,
                                'is_binary': True
                            })
            return market_list
        except Exception as e:
            print(f"Error fetching markets: {e}")
            return []

    def get_price_history(self, token_id, interval="1h"):
        """
        Fetches historical prices for a token.
        Intervals: 1m, 1h, 1d, etc.
        """
        endpoint = f"{CLOB_API_URL}/prices-history"
        params = {
            "market": token_id,
            "interval": "max"
        }
        try:
            r = self.session.get(endpoint, params=params)
            r.raise_for_status()
            data = r.json()
            history = data.get('history', [])
            
            if not history:
                return None
                
            # Convert to DataFrame
            df = pd.DataFrame(history)
            df['t'] = pd.to_datetime(df['t'], unit='s')
            df.set_index('t', inplace=True)
            df.rename(columns={'p': token_id}, inplace=True)
            return df[[token_id]] # Return only the price column
        except Exception as e:
            print(f"Error fetching history for {token_id}: {e}")
            return None

    def analyze_correlations(self, target_token_id, comparison_markets):
        """
        Fetches history for target and all comparison markets using multi-threading, 
        aligns them, and calculates correlation matrix.
        """
        print(f"Fetching data for target market...")
        target_df = self.get_price_history(target_token_id)
        if target_df is None:
            return None, [], "Could not fetch history for target."

        # Check if target has enough real data
        target_data_points = len(target_df)
        print(f"[INFO] Target market has {target_data_points} hourly price points.")
        
        if target_data_points < 10:
            print(f"[WARNING] Target market is too new! Only {target_data_points} hours of data.")
            print("[WARNING] Correlation analysis requires at least 10+ data points to be meaningful.")
            print("[TIP] Try selecting an older, more established market.")
            return None, [], f"Target market too new ({target_data_points} data points). Need at least 10."

        # Store DataFrames in a list instead of iterative joining
        dfs = [target_df]
        valid_comparisons = []

        print(f"Comparing against {len(comparison_markets)} other markets (this may take a moment)...")
        
        # Use ThreadPoolExecutor for parallel fetching
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_market = {
                executor.submit(self.get_price_history, m['token_id']): m 
                for m in comparison_markets if m['token_id'] != target_token_id
            }
            
            for future in as_completed(future_to_market):
                m = future_to_market[future]
                try:
                    df = future.result()
                    if df is not None and len(df) >= 10:  # Only include markets with enough data
                        dfs.append(df)
                        valid_comparisons.append(m)
                except Exception as exc:
                    # Suppress errors for cleaner output
                    pass
        
        print(f"[INFO] Found {len(valid_comparisons)} comparison markets with sufficient history.")
        
        if len(dfs) < 2:
            return None, [], "Not enough comparison markets with sufficient data."

        # Merge all dataframes on the Time Index (Outer Join)
        combined_df = pd.concat(dfs, axis=1)
        
        print(f"[DEBUG] Combined DataFrame shape: {combined_df.shape}")

        # Forward Fill: If a market didn't trade in a specific hour, assume 
        # price remains same as previous hour. Essential for illiquid markets.
        combined_df = combined_df.ffill().bfill()

        # Calculate Correlation Matrix
        # min_periods should be at least 10 for meaningful correlation
        corr_matrix = combined_df.corr(min_periods=10)
        
        # Extract correlations relative to the target
        if target_token_id not in corr_matrix:
            return None, [], "Target not in correlation matrix (insufficient overlap)."

        target_corrs = corr_matrix[target_token_id].drop(target_token_id)
        
        return target_corrs, valid_comparisons, combined_df

# --- User Interface & Logic ---

def print_header(text):
    print(f"\n{'='*60}\n{text}\n{'='*60}")

def calculate_hedge_sizing(target_vol, hedge_vol, correlation, position_value):
    """
    Calculates Beta-adjusted hedge size.
    Beta = Correlation * (StdDev_Target / StdDev_Hedge)
    Hedge Amount = -Beta * Position_Value
    """
    if hedge_vol == 0: return 0
    beta = correlation * (target_vol / hedge_vol)
    hedge_amount = -beta * position_value
    return beta, hedge_amount

def main():
    analyzer = PolymarketAnalyzer()
    
    print_header("Polymarket Correlation & Hedge Finder")
    
    # --- Step 1: Select Category ---
    POPULAR_CATEGORIES = [
        ("Global (All Markets)", None),
        ("Politics", "politics"),
        ("Crypto", "crypto"),
        ("Sports", "sports"),
        ("Business", "business"),
        ("Science", "science"),
        ("Pop Culture", "pop-culture")
    ]
    
    print("Select a Category to analyze:")
    for i, (name, slug) in enumerate(POPULAR_CATEGORIES):
        print(f"{i+1}. {name}")
    
    cat_idx = -1
    while cat_idx < 0 or cat_idx >= len(POPULAR_CATEGORIES):
        try:
            val = input("\nEnter category number: ")
            cat_idx = int(val) - 1
        except ValueError:
            pass
            
    selected_cat_name, selected_cat_slug = POPULAR_CATEGORIES[cat_idx]
    print(f"\nFetching top active markets for: {selected_cat_name}...")
    
    # Fetch markets (limit=500 for Global, 100 for specific to ensure deep enough pool)
    limit = 500 if selected_cat_slug is None else 100
    raw_markets = analyzer.get_top_markets(limit=limit, tag_slug=selected_cat_slug)
    
    # --- Step 2: Filter by Age & Data Quality ---
    # We remove anything less than 24h old AND perform a quick data check
    print(f"Fetched {len(raw_markets)} markets. Filtering for data quality (checking {len(raw_markets)} markets)...")
    
    active_markets = []
    
    def check_market_quality(m):
        if m.get('age_hours', 0) < 24:
            return None # Too young
        
        # Check history length (only need small fetch to verify existence)
        # We allow 1 call per market here. It adds partial overhead but saves user frustration.
        # We reuse the session from the analyzer instance (thread-safe enough for read)
        # However, to be cleaner, we can just fetch 1h history.
        try:
            # We call the internal method directly or via helper
            # Note: This increases API load.
             
            # Optimization: Just use age filter first, then only check history on the SHORTLIST 
            # displayed to the user during search to keep it snappy?
            # NO, user want to scroll top 20 and pick one that works.
            
            # Let's perform the check.
            hist = analyzer.get_price_history(m['token_id'])
            if hist is not None and len(hist) >= 10:
                return m
            return None
        except:
            return None

    # Use ThreadPool to check markets in parallel
    with ThreadPoolExecutor(max_workers=20) as executor:
        # Submit all checks
        futures = {executor.submit(check_market_quality, m): m for m in raw_markets}
        
        completed_count = 0
        total = len(raw_markets)
        
        for future in as_completed(futures):
            result = future.result()
            if result:
                active_markets.append(result)
            completed_count += 1
            # Optional progress bar or generic print could go here
            if completed_count % 25 == 0:
                print(f"  Verified {completed_count}/{total} markets...")

    removed_count = len(raw_markets) - len(active_markets)
    print(f"Removed {removed_count} markets with insufficient history (<10h data).")
    print(f"Active Pool Size: {len(active_markets)} verified markets.")
    
    if not active_markets:
        print("No eligible markets found in this category (others were too new). Exiting.")
        return

    # --- Step 3: Select Target Market (Loop until valid selection) ---
    while True:
        target_market = None
        while target_market is None:
            search_term = input("\nSearch for your market (keyword) or press Enter to see Top 20: ").strip().lower()
            if not search_term:
                 matches = active_markets[:20]
                 print(f"\n--- Top 20 Markets in {selected_cat_name} ---")
            else:
                 matches = [m for m in active_markets if search_term in m['title'].lower() or search_term in m['question'].lower()]
                 print(f"\n--- Found {len(matches)} matches for '{search_term}' ---")
        
            if not matches:
                 print("No markets found matching that keyword.")
                 continue
                 
            for i, m in enumerate(matches[:20]): # Match Limit for display
                print(f"{i+1}. [{m.get('age', '?')}] {m['title']}")
                
            try:
                sel_input = input("\nSelect your market number (or 'r' to retry search): ")
                if sel_input.lower() == 'r': continue
                
                selection = int(sel_input) - 1
                if 0 <= selection < len(matches):
                    target_market = matches[selection]
                else:
                     print("Invalid selection.")
            except ValueError:
                print("Invalid input.")

        # --- Pre-check Target Data Quality ---
        print(f"\nVerifying data for: {target_market['title']}...")
        target_id = target_market['token_id']
        # Quick check for data history before proceeding
        # We use a throwaway call just to check length
        history_check = analyzer.get_price_history(target_id)
        if history_check is None or len(history_check) < 10:
             print(f"❌ Error: '{target_market['title']}' has insufficient price history ({0 if history_check is None else len(history_check)} hours).")
             print("This market is likely illiquid or inactive. Please select a different market.")
             target_market = None # Reset and loop
        else:
             break # Valid market found!

    amount_invested = float(input(f"How much have you invested in '{target_market['title']}'? $"))

    # --- Step 4: Auto-set Comparison Pool ---
    # The comparison pool is simply the rest of the category we already fetched
    print_header("Step 2: Comparison Analysis")
    print(f"Comparing against the rest of the '{selected_cat_name}' pool ({len(active_markets)-1} markets)...")
    
    comparison_pool = active_markets

    # 4. Run Analysis
    print_header(f"Analyzing Correlations for: {target_market['title']}")
    correlations, valid_markets, price_data = analyzer.analyze_correlations(target_id, comparison_pool)
    
    if correlations is None:
        print(f"Analysis failed: {price_data}")
        return

    # 5. Sort Results
    sorted_corr = correlations.sort_values(ascending=False)
    
    # Debug: Show raw correlation stats
    non_nan = sorted_corr.dropna()
    print(f"\n[DEBUG] Total correlations calculated: {len(sorted_corr)}")
    print(f"[DEBUG] Non-NaN correlations: {len(non_nan)}")
    if len(non_nan) > 0:
        print(f"[DEBUG] Correlation range: {non_nan.min():.4f} to {non_nan.max():.4f}")
    else:
        print("[DEBUG] All correlations are NaN - not enough overlapping data points.")
        print("[DEBUG] This usually means the target market is too new or has sparse trading history.")
    
    # --- Display Top Correlations ---
    print("\n--- 🔗 Top POSITIVE Correlations (Moves Together) ---")
    print("If your market goes UP, these likely go UP.")
    displayed = 0
    for token_id, score in sorted_corr.head(5).items():
        if pd.isna(score):
            continue
        m_info = next((m for m in valid_markets if m['token_id'] == token_id), None)
        if m_info:
            print(f"  [Corr: {score:.2f}] {m_info['title']}")
            displayed += 1
    if displayed == 0:
        print("  (No positive correlations found)")
    
    # --- Display Hedges ---
    print("\n--- 🛡️ Top NEGATIVE Correlations (Potential Hedges) ---")
    print("If your market goes DOWN, these likely go UP.")
    
    # Get bottom 5 (most negative)
    negative_corrs = sorted_corr.dropna().tail(5)
    found_hedge = False
    
    for token_id, score in negative_corrs.items():
        if score < 0: # Show any negative correlation
            found_hedge = True
            m_info = next((m for m in valid_markets if m['token_id'] == token_id), None)
            
            # Hedge Sizing Calculation
            # Calculate volatility (standard deviation of returns)
            returns = price_data.pct_change().dropna()
            target_vol = returns[target_id].std()
            hedge_vol = returns[token_id].std()
            
            beta, hedge_amt = calculate_hedge_sizing(target_vol, hedge_vol, score, amount_invested)
            
            print(f"\n  MARKET: {m_info['title']}")
            print(f"  Correlation: {score:.2f}")
            print(f"  Suggested Hedge: Bet ${hedge_amt:.2f} on this market")
            print(f"  (Beta: {beta:.2f} | If Target drops 10%, this likely rises {abs(beta)*10:.1f}%)")

    if not found_hedge:
        print("  No strong hedges found among top markets.")

if __name__ == "__main__":
    main()