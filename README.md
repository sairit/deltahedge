# DeltaHedge - Polymarket Analytics & Hedging Platform

A comprehensive platform for analyzing Polymarket prediction markets, finding correlations, and identifying optimal hedging strategies.

## Features

### Backend (FastAPI)
- Polymarket API integration
- Correlation analysis across markets
- Beta-adjusted hedge sizing calculations
- AI-powered explanations (Google Gemini)
- Real-time market data fetching

### Frontend (React)
- **Market Search**: Browse trending markets and search by category
- **Advanced Analytics Dashboard**:
  - Payoff Curve visualization (P&L vs Probability)
  - Hedge Frontier scatter plot (Impact vs Cost)
  - Correlation matrix with heat visualization
  - Time-based P&L simulation
  - Ranked hedge recommendations
- **AI Explanations**: Contextual insights for market relationships
- **Position Management**: Enter positions and see real-time analytics

## Project Structure

```
deltahedge/
├── api.py              # FastAPI backend
├── hedge.py            # Polymarket analyzer & correlation engine
├── agent.py            # AI explanation service (Gemini)
├── requirements.txt    # Python dependencies
└── frontend/           # React frontend
    ├── src/
    │   ├── pages/      # Main pages
    │   ├── components/ # React components
    │   └── api.js      # API client
    └── package.json
```

## Setup

### Backend

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables (create `.env` file):
```
GOOGLE_API_KEY=your_gemini_api_key
TOKENC_API_KEY=your_tokenc_api_key  # Optional, for token compression
```

3. Start the FastAPI server:
```bash
python api.py
# or
uvicorn api:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

- `GET /markets?category=politics` - Get top markets (optionally filtered by category)
- `GET /analyze?target_id=<token_id>&category=global` - Analyze a market and get correlations
- `POST /explain` - Get AI explanation for a market or correlation

## Design Philosophy

- **Dark Glass Aesthetic**: Modern, space-aged UI with glass morphism effects
- **Purple Gradient Accents**: Consistent purple theme throughout
- **Data-Driven**: Advanced visualizations powered by Recharts
- **Explainable AI**: Clear explanations for all recommendations
- **Real Trading Support**: Actionable insights for actual position management

## Technologies

**Backend:**
- FastAPI
- Pandas & NumPy
- Google Gemini AI
- Polymarket API

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Recharts
- Framer Motion
- React Router

## License

MIT

