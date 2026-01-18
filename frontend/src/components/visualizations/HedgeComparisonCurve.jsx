import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

// Distinct colors for hedges - more vibrant and distinguishable
const HEDGE_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'] // Green, Blue, Orange, Pink, Purple
const UNHEDGED_COLOR = '#F87171' // Light red for unhedged

function HedgeComparisonCurve({ position, currentPrice, volatility, hedges, selectedHedge }) {
  // State for hedge direction (YES or NO for each hedge)
  const [hedgeDirections, setHedgeDirections] = useState({})
  
  // Initialize hedge directions - hedge should be OPPOSITE of your main bet direction
  useEffect(() => {
    const initial = {}
    hedges.forEach(h => {
      // For effective hedging with negative correlation:
      // If you're YES on main and hedge has negative corr, hedge moves opposite
      // So you want YES on hedge (it goes up when main goes down)
      // If you're NO on main and hedge has negative corr, you want NO on hedge
      if (h.correlation < 0) {
        // Negative correlation: same direction as your main bet
        initial[h.token_id] = position.direction
      } else {
        // Positive correlation: opposite direction to your main bet
        initial[h.token_id] = position.direction === 'YES' ? 'NO' : 'YES'
      }
    })
    setHedgeDirections(initial)
  }, [hedges, position.direction])

  const toggleHedgeDirection = (tokenId) => {
    setHedgeDirections(prev => ({
      ...prev,
      [tokenId]: prev[tokenId] === 'YES' ? 'NO' : 'YES'
    }))
  }

  const data = useMemo(() => {
    const points = []
    const { amount, direction } = position
    
    for (let prob = 0; prob <= 100; prob += 2) {
      const price = prob / 100
      
      // Unhedged P&L calculation - FIXED for NO bets
      let unhedgedPL = 0
      if (direction === 'YES') {
        unhedgedPL = (price - currentPrice) * amount
      } else {
        // NO position: profit when probability decreases
        unhedgedPL = (currentPrice - price) * amount
      }
      
      const point = {
        probability: prob,
        unhedged: Math.round(unhedgedPL),
      }

      // Calculate P&L for each hedge
      hedges.forEach((hedge, index) => {
        const hedgeCorrelation = hedge.correlation
        const hedgeBeta = hedge.visual_beta
        const hedgeDirection = hedgeDirections[hedge.token_id] || 'YES'
        
        const hedgeRatio = Math.abs(hedgeBeta) * 0.5
        const hedgeSize = amount * hedgeRatio
        
        // Hedge price movement based on correlation
        const hedgePriceChange = (price - currentPrice) * hedgeCorrelation
        const hedgeFinalPrice = Math.max(0, Math.min(1, currentPrice + hedgePriceChange))
        
        // Calculate hedge P&L based on the direction selected
        let hedgePL = 0
        if (hedgeDirection === 'YES') {
          hedgePL = (hedgeFinalPrice - currentPrice) * hedgeSize
        } else {
          // NO position on hedge
          hedgePL = (currentPrice - hedgeFinalPrice) * hedgeSize
        }
        
        point[`hedge_${index}`] = Math.round(unhedgedPL + hedgePL)
      })
      
      points.push(point)
    }
    
    return points
  }, [position, currentPrice, hedges, hedgeDirections])

  const breakevenProb = useMemo(() => {
    return currentPrice * 100
  }, [currentPrice])

  // Calculate metrics for unhedged position
  const unhedgedMaxLoss = useMemo(() => {
    return Math.min(...data.map(d => d.unhedged))
  }, [data])

  const unhedgedMaxGain = useMemo(() => {
    return Math.max(...data.map(d => d.unhedged))
  }, [data])

  // If a hedge is selected from parent, only show that one
  const activeHedgeIndex = selectedHedge 
    ? hedges.findIndex(h => h.token_id === selectedHedge.token_id)
    : -1

  // Calculate metrics for hedged position (if hedge selected)
  const hedgedMetrics = useMemo(() => {
    if (!selectedHedge || activeHedgeIndex < 0) {
      return { maxLoss: unhedgedMaxLoss, maxGain: unhedgedMaxGain, downsideReduction: 0 }
    }
    
    const hedgeKey = `hedge_${activeHedgeIndex}`
    const hedgedValues = data.map(d => d[hedgeKey]).filter(v => v !== undefined)
    
    if (hedgedValues.length === 0) {
      return { maxLoss: unhedgedMaxLoss, maxGain: unhedgedMaxGain, downsideReduction: 0 }
    }
    
    const hedgedMaxLoss = Math.min(...hedgedValues)
    const hedgedMaxGain = Math.max(...hedgedValues)
    
    // Downside reduction: how much the max loss is reduced
    const downsideReduction = unhedgedMaxLoss !== 0 
      ? ((Math.abs(unhedgedMaxLoss) - Math.abs(hedgedMaxLoss)) / Math.abs(unhedgedMaxLoss)) * 100 
      : 0
    
    return { maxLoss: hedgedMaxLoss, maxGain: hedgedMaxGain, downsideReduction }
  }, [data, selectedHedge, activeHedgeIndex, unhedgedMaxLoss, unhedgedMaxGain])

  return (
    <div className="flex flex-col h-full">
      {/* Hedge Selection with Direction Toggle */}
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {selectedHedge ? (
          <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-4 py-2 border border-purple-500/30">
            <span 
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: HEDGE_COLORS[activeHedgeIndex % HEDGE_COLORS.length] }}
            />
            <span className="text-sm text-white font-medium">
              {selectedHedge.market_title.substring(0, 40)}...
            </span>
            <button
              onClick={() => toggleHedgeDirection(selectedHedge.token_id)}
              className={`px-2 py-1 rounded text-xs font-bold ${
                hedgeDirections[selectedHedge.token_id] === 'YES' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}
            >
              {hedgeDirections[selectedHedge.token_id] || 'YES'}
            </button>
          </div>
        ) : (
          <div className="text-gray-500 text-sm py-2">
            Select a hedge from above to see its payoff curve
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 60, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.3} />
            <XAxis
              dataKey="probability"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={{ stroke: '#6B7280' }}
              domain={[0, 100]}
            >
              <text x="50%" y={35} textAnchor="middle" fill="#9CA3AF" fontSize={12}>
                Event Probability (%)
              </text>
            </XAxis>
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
              tickLine={{ stroke: '#6B7280' }}
              tickFormatter={(value) => `$${value}`}
            >
              <text x={-40} y="50%" textAnchor="middle" fill="#9CA3AF" fontSize={12} transform="rotate(-90, -40, 200)">
                P/L ($)
              </text>
            </YAxis>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '8px',
                color: '#F3F4F6',
              }}
              formatter={(value, name) => {
                if (name === 'unhedged') return [`$${value.toLocaleString()}`, 'Unhedged Position']
                const hedgeIndex = parseInt(name.split('_')[1])
                const hedge = hedges[hedgeIndex]
                const dir = hedgeDirections[hedge?.token_id] || 'YES'
                return [`$${value.toLocaleString()}`, `Hedged (${dir} on hedge)`]
              }}
              labelFormatter={(label) => `Probability: ${label}%`}
            />
            <Legend
              wrapperStyle={{ color: '#9CA3AF', paddingTop: '10px' }}
              iconType="line"
              formatter={(value) => {
                if (value === 'unhedged') return <span className="text-gray-300">Your Position (Unhedged)</span>
                return <span className="text-gray-300">Hedged Portfolio</span>
              }}
            />
            <ReferenceLine
              x={breakevenProb}
              stroke="#9333EA"
              strokeDasharray="5 5"
              label={{ value: 'BE', position: 'top', fill: '#9333EA', fontSize: 10 }}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            
            {/* Unhedged line - dashed for distinction */}
            <Line
              type="monotone"
              dataKey="unhedged"
              stroke={UNHEDGED_COLOR}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="unhedged"
            />
            
            {/* Show selected hedge line only - solid for clarity */}
            {selectedHedge && activeHedgeIndex >= 0 && (
              <Line
                type="monotone"
                dataKey={`hedge_${activeHedgeIndex}`}
                stroke={HEDGE_COLORS[activeHedgeIndex % HEDGE_COLORS.length]}
                strokeWidth={3}
                dot={false}
                name={`hedge_${activeHedgeIndex}`}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 shrink-0">
        <div className="glass rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Breakeven Probability</div>
          <div className="text-purple-400 text-lg font-semibold">{breakevenProb.toFixed(1)}%</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Max Loss</div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-lg font-semibold">${Math.abs(unhedgedMaxLoss).toLocaleString()}</span>
            {selectedHedge && hedgedMetrics.maxLoss !== unhedgedMaxLoss && (
              <span className="text-green-400 text-sm">→ ${Math.abs(hedgedMetrics.maxLoss).toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Max Gain</div>
          <div className="flex items-center gap-2">
            <span className="text-green-400 text-lg font-semibold">${unhedgedMaxGain.toLocaleString()}</span>
            {selectedHedge && hedgedMetrics.maxGain !== unhedgedMaxGain && (
              <span className="text-yellow-400 text-sm">→ ${hedgedMetrics.maxGain.toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Downside Reduction</div>
          <div className={`text-lg font-semibold ${selectedHedge && hedgedMetrics.downsideReduction > 0 ? 'text-green-400' : 'text-gray-500'}`}>
            {selectedHedge ? `${hedgedMetrics.downsideReduction.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HedgeComparisonCurve
