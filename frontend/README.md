# DeltaHedge Frontend

A modern, space-aged UI for Polymarket analytics and hedging intelligence.

## Features

- **Market Search**: Browse and search Polymarket markets with trending indicators
- **Advanced Analytics**: Comprehensive correlation analysis and hedge recommendations
- **Data Visualizations**:
  - Payoff Curve (P&L vs Probability)
  - Hedge Frontier (Impact vs Cost scatter plot)
  - Correlation Matrix
  - Time-Based P&L Simulation
- **AI-Powered Explanations**: Contextual insights for market correlations
- **Position Management**: Enter and analyze positions with real-time P&L calculations

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Recharts (data visualization)
- Framer Motion (animations)
- React Router

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Environment Variables

Create a `.env` file in the frontend directory:

```
VITE_API_URL=http://localhost:8000
```

## Design System

- **Theme**: Dark glass aesthetic with purple gradient accents
- **Colors**: Purple (#A855F7) primary, gray scale for backgrounds
- **Typography**: Inter font family
- **Effects**: Glass morphism, glow effects, smooth animations

## Project Structure

```
src/
  ├── pages/          # Main page components
  ├── components/     # Reusable components
  │   └── visualizations/  # Chart components
  ├── api.js         # API client
  ├── App.jsx        # Root component
  └── index.css      # Global styles
```

