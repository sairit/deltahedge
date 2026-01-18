import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

function TimeBasedSimulation({ position, currentPrice, volatility, selectedHedge }) {
  const [timeHorizon, setTimeHorizon] = useState(30) // days
  const [resolutionMode, setResolutionMode] = useState('fast') // fast or slow

  const data = useMemo(() => {
    const points = []
    const { amount, direction } = position
    
    // Simulate P&L over time
    for (let day = 0; day <= timeHorizon; day += 1) {
      // Simplified time decay and volatility model
      const timeDecay = Math.exp(-day / (timeHorizon * 2))
      const volatilityEffect = volatility * Math.sqrt(day / 365) * (resolutionMode === 'fast' ? 0.7 : 1.3)
      
      // Simulate price movement
      const priceChange = (Math.random() - 0.5) * volatilityEffect
      const simulatedPrice = Math.max(0, Math.min(1, currentPrice + priceChange))
      
      // Calculate P&L
      let pnl = 0
      if (direction === 'YES') {
        pnl = (simulatedPrice - currentPrice) * amount * timeDecay
      } else {
        pnl = ((1 - simulatedPrice) - (1 - currentPrice)) * amount * timeDecay
      }
      
      // Add hedge effect if selected
      if (selectedHedge) {
        const hedgeCorrelation = selectedHedge.correlation
        const hedgeBeta = selectedHedge.visual_beta
        const hedgeSize = -hedgeBeta * amount * 0.5
        
        const hedgePriceChange = priceChange * hedgeCorrelation
        const hedgeSimulatedPrice = Math.max(0, Math.min(1, currentPrice + hedgePriceChange))
        const hedgePL = (hedgeSimulatedPrice - currentPrice) * hedgeSize * timeDecay
        
        pnl += hedgePL
      }
      
      // Calculate percentiles (simplified)
      const p10 = pnl * 0.7 // Downside
      const p50 = pnl // Median
      const p90 = pnl * 1.3 // Upside
      
      points.push({
        day,
        p10: Math.round(p10),
        p50: Math.round(p50),
        p90: Math.round(p90),
      })
    }
    
    return points
  }, [position, currentPrice, volatility, selectedHedge, timeHorizon, resolutionMode])

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-6 mb-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-400 mb-2">Time Horizon (days)</label>
          <input
            type="range"
            min="7"
            max="90"
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>7d</span>
            <span className="text-purple-400 font-semibold">{timeHorizon}d</span>
            <span>90d</span>
          </div>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-400 mb-2">Resolution Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setResolutionMode('fast')}
              className={`px-4 py-2 rounded-lg glass transition-all ${
                resolutionMode === 'fast'
                  ? 'bg-purple-600/30 border-purple-500/50'
                  : 'hover:bg-white/10'
              }`}
            >
              Fast Resolution
            </button>
            <button
              onClick={() => setResolutionMode('slow')}
              className={`px-4 py-2 rounded-lg glass transition-all ${
                resolutionMode === 'slow'
                  ? 'bg-purple-600/30 border-purple-500/50'
                  : 'hover:bg-white/10'
              }`}
            >
              Slow Resolution
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="colorUpside" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorDownside" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.3} />
          <XAxis
            dataKey="day"
            label={{ value: 'Time (Days)', position: 'insideBottom', offset: -10 }}
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis
            label={{ value: 'P&L ($)', angle: -90, position: 'insideLeft' }}
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            formatter={(value, name) => {
              const labels = { p10: 'P10 (Downside)', p50: 'P50 (Median)', p90: 'P90 (Upside)' }
              return [`$${value.toLocaleString()}`, labels[name] || name]
            }}
            labelFormatter={(label) => `Day ${label}`}
          />
          <Legend wrapperStyle={{ color: '#9CA3AF' }} />
          <Area
            type="monotone"
            dataKey="p90"
            stroke="#10B981"
            fill="url(#colorUpside)"
            strokeWidth={2}
            name="P90 (Upside)"
          />
          <Area
            type="monotone"
            dataKey="p50"
            stroke="#9333EA"
            fill="none"
            strokeWidth={3}
            name="P50 (Median)"
          />
          <Area
            type="monotone"
            dataKey="p10"
            stroke="#EF4444"
            fill="url(#colorDownside)"
            strokeWidth={2}
            name="P10 (Downside)"
          />
        </AreaChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-sm text-gray-400">
        <p>• P50 (Median): Expected P&L path</p>
        <p>• P10/P90: Downside and upside scenarios based on volatility and time decay</p>
        <p>• {resolutionMode === 'fast' ? 'Fast resolution' : 'Slow resolution'} mode affects volatility scaling</p>
      </div>
    </div>
  )
}

export default TimeBasedSimulation

