# Quick Start Guide

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

## Step 1: Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the root directory:
```
GOOGLE_API_KEY=your_gemini_api_key
TOKENC_API_KEY=your_tokenc_api_key  # Optional
```

3. Start the backend server:
```bash
python api.py
```

The API will run on `http://localhost:8000`

## Step 2: Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Step 3: Using the Application

1. **Browse Markets**: On the home page, browse trending markets or search by category
2. **Select a Market**: Click on any market card to view analytics
3. **Enter Position**: Enter your position amount and direction (YES/NO)
4. **View Analytics**: Explore correlations, hedge recommendations, and visualizations
5. **Select Hedge**: Click on a hedge recommendation to see its impact on the payoff curve
6. **Analyze**: Review AI explanations for market correlations

## Features Overview

### Market Search Page
- Top 20 trending markets
- Category filtering (Politics, Crypto, Sports, etc.)
- Real-time search functionality
- Market cards with age and volume info

### Analytics Page
- **Payoff Curve**: See P&L at different probability outcomes
- **Hedge Recommendations**: Top 5 ranked hedge candidates with explanations
- **Hedge Frontier**: Scatter plot showing cost vs impact
- **Correlation Matrix**: Visual correlation strength indicators
- **Time Simulation**: P&L paths over time with different scenarios
- **AI Explanations**: Contextual insights for each correlation

## Troubleshooting

### Backend Issues
- Ensure Python dependencies are installed: `pip install -r requirements.txt`
- Check that `.env` file exists with valid API keys
- Verify port 8000 is not in use

### Frontend Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check that backend is running on port 8000
- Verify browser console for API errors

### API Connection Issues
- Ensure backend is running before starting frontend
- Check CORS settings if accessing from different origin
- Verify API endpoint URLs in `frontend/src/api.js`

## Development Tips

- Backend auto-reloads on file changes (if using `uvicorn --reload`)
- Frontend hot-reloads automatically via Vite
- Use browser DevTools to inspect API calls
- Check backend terminal for correlation analysis progress

