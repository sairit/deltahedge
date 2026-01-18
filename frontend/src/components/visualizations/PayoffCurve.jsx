import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

function PayoffCurve({ position, currentPrice, volatility, hedges, selectedHedge }) {
  const data = useMemo(() => {
    const points = []
    const { amount, direction } = position
    
    for (let prob = 0; prob <= 100; prob += 2) {
      const price = prob / 100
      
      // Unhedged P&L calculation
      // For YES: Buy at currentPrice, if outcome happens (price=1) you win (1-currentPrice)*amount
      //          If outcome doesn't happen (price=0) you lose currentPrice*amount
      // For NO: Buy NO at (1-currentPrice), if outcome doesn't happen you win currentPrice*amount
      //         If outcome happens you lose (1-currentPrice)*amount
      let unhedgedPL = 0
      if (direction === 'YES') {
        // YES position: profit if price goes to 1, loss if goes to 0
        unhedgedPL = (price - currentPrice) * amount
      } else {
        // NO position: profit if price goes to 0, loss if goes to 1
        // NO price = 1 - YES price
        const noPrice = 1 - price
        const noCurrentPrice = 1 - currentPrice
        unhedgedPL = (noPrice - noCurrentPrice) * amount
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
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" opacity={0.3} />
          <XAxis
            dataKey="probability"
            label={{ value: 'Outcome Probability (%)', position: 'bottom', offset: 0 }}
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
          />
          <YAxis
            label={{ value: 'Profit / Loss ($)', angle: -90, position: 'insideLeft' }}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="glass rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Breakeven Probability</div>
          <div className="text-purple-400 text-xl font-semibold">{breakevenProb.toFixed(1)}%</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Max Loss</div>
          <div className="text-red-400 text-xl font-semibold">${maxLoss.toLocaleString()}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-gray-400 text-sm mb-1">Max Gain</div>
          <div className="text-green-400 text-xl font-semibold">${maxGain.toLocaleString()}</div>
        </div>
        {selectedHedge && (
          <div className="glass rounded-xl p-4">
            <div className="text-gray-400 text-sm mb-1">Downside Reduction</div>
            <div className="text-purple-400 text-xl font-semibold">{downsideReduction.toFixed(1)}%</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PayoffCurve

