import { useMemo } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

function HedgeFrontier({ hedges, position }) {
  const data = useMemo(() => {
    return hedges.map((hedge, index) => {
      // Estimate hedge cost (simplified: based on correlation and position size)
      const hedgeCost = Math.abs(hedge.correlation) * position.amount * 0.1
      
      // Estimate drawdown reduction (negative correlation = better hedge)
      const drawdownReduction = Math.abs(hedge.correlation) * position.amount * 0.3
      
      // Robustness proxy (using visual_beta as proxy)
      const robustness = Math.abs(hedge.visual_beta) * 100
      
      // Create short label (first 2-3 words of market title)
      const shortName = hedge.market_title.split(' ').slice(0, 3).join(' ').substring(0, 20)
      
      return {
        cost: Math.round(hedgeCost),
        impact: Math.round(drawdownReduction),
        size: Math.min(robustness, 200), // Cap size for visualization
        name: hedge.market_title,
        shortName: shortName + (hedge.market_title.length > 20 ? '...' : ''),
        correlation: hedge.correlation,
        direction: hedge.correlation < 0 ? 'YES' : 'NO',
        index: index + 1,
      }
    })
  }, [hedges, position])

  const COLORS = ['#A855F7', '#9333EA', '#7E22CE', '#6B21A8', '#581C87']

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 30, right: 30, bottom: 50, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            type="number"
            dataKey="cost"
            name="Hedge Cost"
            stroke="#4B5563"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickLine={{ stroke: '#6B7280' }}
            tickFormatter={(value) => `$${value}`}
          >
            <text x="50%" y={45} textAnchor="middle" fill="#9CA3AF" fontSize={12}>
              Hedge Cost ($)
            </text>
          </XAxis>
          <YAxis
            type="number"
            dataKey="impact"
            name="Drawdown Reduction"
            stroke="#4B5563"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickLine={{ stroke: '#6B7280' }}
            tickFormatter={(value) => `$${value}`}
          >
            <text x={-40} y="50%" textAnchor="middle" fill="#9CA3AF" fontSize={12} transform="rotate(-90, -40, 175)">
              Impact ($)
            </text>
          </YAxis>
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
                strokeWidth={2}
              />
            ))}
            <LabelList 
              dataKey="index" 
              position="top" 
              fill="#E5E7EB"
              fontSize={10}
              formatter={(value) => `#${value}`}
              offset={8}
            />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HedgeFrontier

