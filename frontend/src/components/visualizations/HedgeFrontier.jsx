import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function HedgeFrontier({ hedges, position }) {
  const data = useMemo(() => {
    return hedges.map((hedge, index) => {
      // Estimate hedge cost (simplified: based on correlation and position size)
      const hedgeCost = Math.abs(hedge.correlation) * position.amount * 0.1
      
      // Estimate drawdown reduction (negative correlation = better hedge)
      const drawdownReduction = Math.abs(hedge.correlation) * position.amount * 0.3
      
      // Robustness proxy (using visual_beta as proxy)
      const robustness = Math.abs(hedge.visual_beta) * 100
      
      return {
        cost: Math.round(hedgeCost),
        impact: Math.round(drawdownReduction),
        size: Math.min(robustness, 200), // Cap size for visualization
        name: hedge.market_title,
        correlation: hedge.correlation,
        direction: hedge.correlation < 0 ? 'YES' : 'NO',
      }
    })
  }, [hedges, position])

  const COLORS = ['#A855F7', '#9333EA', '#7E22CE', '#6B21A8', '#581C87']

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            type="number"
            dataKey="cost"
            name="Hedge Cost"
            label={{ value: 'Cost ($)', position: 'bottom', offset: 0, fill: '#6B7280', fontSize: 12 }}
            stroke="#4B5563"
            tick={{ fill: '#6B7280', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="impact"
            name="Drawdown Reduction"
            label={{ value: 'Impact ($)', angle: -90, position: 'insideLeft', offset: 10, fill: '#6B7280', fontSize: 12 }}
            stroke="#4B5563"
            tick={{ fill: '#6B7280', fontSize: 10 }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid rgba(75, 85, 99, 0.4)',
              borderRadius: '8px',
              color: '#F3F4F6',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
            }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload
                return (
                  <div className="p-3">
                    <p className="font-semibold text-white mb-2 text-xs">{data.name}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-gray-400">Cost:</span> <span className="text-purple-400 font-mono">${data.cost}</span>
                        <span className="text-gray-400">Impact:</span> <span className="text-green-400 font-mono">${data.impact}</span>
                        <span className="text-gray-400">Eff:</span> <span className="text-purple-400 font-mono">{(data.impact / data.cost || 0).toFixed(1)}x</span>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          <Scatter name="Hedges" data={data} fill="#A855F7" shape="circle">
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.8}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HedgeFrontier

