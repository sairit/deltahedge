import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

function PayoffCurve({ position, currentPrice, volatility, hedges, selectedHedge, showMetrics = true }) {
  const data = useMemo(() => {
    const points = []
    const { amount, direction } = position
    
    for (let prob = 0; prob <= 100; prob += 2) {
      const price = prob / 100
      
      // Unhedged P&L calculation
      // For YES: Buy at currentPrice, win if outcome probability goes to 100%, lose if goes to 0%
      // For NO: Buy at (1-currentPrice), win if outcome probability goes to 0%, lose if goes to 100%
      let unhedgedPL = 0
      if (direction === 'YES') {
        // YES position: profit when probability increases toward 100%
        unhedgedPL = (price - currentPrice) * amount
      } else {
        // NO position: profit when probability decreases toward 0%
        // If prob goes to 0, NO holders win (1-0) - (1-currentPrice) = currentPrice
        // If prob goes to 100, NO holders lose: (1-1) - (1-currentPrice) = -(1-currentPrice)
        unhedgedPL = (currentPrice - price) * amount
      }
      
      // Hedged P&L (if hedge selected)
      let hedgedPL = unhedgedPL
      if (selectedHedge && hedges.find(h => h.token_id === selectedHedge.token_id)) {
        const hedge = hedges.find(h => h.token_id === selectedHedge.token_id)
        const hedgeCorrelation = hedge.correlation
        const hedgeBeta = hedge.visual_beta
        
        // Calculate hedge position size based on beta
        // For negative correlation hedges, we want opposite direction
        const hedgeRatio = Math.abs(hedgeBeta) * 0.5 // 50% hedge ratio
        const hedgeSize = amount * hedgeRatio
        
        // Estimate hedge price movement based on correlation
        // If correlation is negative, hedge moves opposite to target
        const hedgePriceChange = (price - currentPrice) * hedgeCorrelation
        const hedgeFinalPrice = Math.max(0, Math.min(1, currentPrice + hedgePriceChange))
        
        // Calculate hedge P&L (assuming we take opposite position for negative correlation)
        let hedgePL = 0
        if (hedgeCorrelation < 0) {
          // Negative correlation: hedge moves opposite, so we profit when target loses
          // We take YES position on hedge if target is YES (or vice versa)
          hedgePL = (hedgeFinalPrice - currentPrice) * hedgeSize
        } else {
          // Positive correlation: less effective hedge, but still calculate
          hedgePL = -(hedgeFinalPrice - currentPrice) * hedgeSize
        }
        
        hedgedPL = unhedgedPL + hedgePL
      }
      
      points.push({
        probability: prob,
        unhedged: Math.round(unhedgedPL),
        hedged: selectedHedge ? Math.round(hedgedPL) : null,
      })
    }
    
    return points
  }, [position, currentPrice, hedges, selectedHedge])

  const breakevenProb = useMemo(() => {
    // For both YES and NO, breakeven is at current price
    // YES breaks even when prob = currentPrice
    // NO breaks even when prob = currentPrice (inverted axis)
    return currentPrice * 100
  }, [currentPrice])

  const maxLoss = useMemo(() => {
    return Math.min(...data.map(d => d.unhedged))
  }, [data])

  const maxGain = useMemo(() => {
    return Math.max(...data.map(d => d.unhedged))
  }, [data])

  const downsideReduction = useMemo(() => {
    if (!selectedHedge) return 0
    const unhedgedMin = Math.min(...data.map(d => d.unhedged))
    const hedgedMin = Math.min(...data.map(d => d.hedged || d.unhedged))
    return unhedgedMin !== 0 ? ((unhedgedMin - hedgedMin) / Math.abs(unhedgedMin)) * 100 : 0
  }, [data, selectedHedge])

  return (
    <div className="flex flex-col h-full">
      <ResponsiveContainer width="100%" height={showMetrics ? 280 : "100%"}>
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
              {position.direction === 'YES' ? 'Event Probability (%)' : 'Event Probability (%)'}
            </text>
          </XAxis>
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickLine={{ stroke: '#6B7280' }}
            tickFormatter={(value) => `$${value}`}
          >
            <text x={-30} y="50%" textAnchor="middle" fill="#9CA3AF" fontSize={12} transform="rotate(-90, -30, 200)">
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
            formatter={(value, name) => [`$${value.toLocaleString()}`, name === 'unhedged' ? 'Unhedged' : 'Hedged']}
            labelFormatter={(label) => `Probability: ${label}%`}
          />
          <Legend
            wrapperStyle={{ color: '#9CA3AF' }}
            iconType="line"
          />
          <ReferenceLine
            x={breakevenProb}
            stroke="#9333EA"
            strokeDasharray="5 5"
            label={{ value: 'Breakeven', position: 'top', fill: '#9333EA' }}
          />
          <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="unhedged"
            stroke="#EF4444"
            strokeWidth={2}
            dot={false}
            name="Unhedged Position"
          />
          {selectedHedge && (
            <Line
              type="monotone"
              dataKey="hedged"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Hedged Portfolio"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {/* Key Analytics */}
      {showMetrics && (
      <div className="grid grid-cols-3 gap-3 mt-4 shrink-0">
        <div className="glass rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Breakeven Probability</div>
          <div className="text-purple-400 text-lg font-semibold">{breakevenProb.toFixed(1)}%</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Max Loss</div>
          <div className="text-red-400 text-lg font-semibold">${Math.abs(maxLoss).toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Max Gain</div>
          <div className="text-green-400 text-lg font-semibold">${maxGain.toLocaleString()}</div>
        </div>
      </div>
      )}
    </div>
  )
}

export default PayoffCurve

