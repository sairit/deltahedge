import { useMemo } from 'react'
import { Shield, TrendingDown, DollarSign, Target } from 'lucide-react'
import { motion } from 'framer-motion'

function HedgeRecommendations({ hedges, position, targetPrice, explanations, onSelectHedge }) {
  const rankedHedges = useMemo(() => {
    return hedges.map((hedge) => {
      // Calculate hedge metrics
      const hedgeCost = Math.abs(hedge.correlation) * position.amount * 0.1
      const drawdownReduction = Math.abs(hedge.correlation) * position.amount * 0.3
      const efficiency = drawdownReduction / hedgeCost || 0
      
      // Ranking score (weighted)
      const rankingScore = 
        (Math.abs(hedge.correlation) * 0.4) + // Correlation strength
        (efficiency * 0.3) + // Efficiency
        (Math.abs(hedge.visual_beta) * 0.3) // Robustness
      
      return {
        ...hedge,
        hedgeCost: Math.round(hedgeCost),
        drawdownReduction: Math.round(drawdownReduction),
        efficiency: efficiency.toFixed(2),
        rankingScore,
      }
    }).sort((a, b) => b.rankingScore - a.rankingScore)
  }, [hedges, position])

  const calculateHedgeSize = (hedge) => {
    const beta = hedge.visual_beta
    return Math.abs(beta * position.amount * 0.5).toFixed(2)
  }

  return (
    <div className="glass rounded-2xl p-6 md:p-8 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <Shield className="text-purple-400" size={24} />
        <h2 className="text-xl font-semibold uppercase tracking-wider text-white">Top Hedge Recommendations</h2>
      </div>
      
      <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
        {rankedHedges.map((hedge, index) => (
          <motion.div
            key={hedge.token_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectHedge(hedge)}
            className={`bg-gray-900/40 border border-gray-700/50 rounded-xl p-5 cursor-pointer hover:bg-gray-800 hover:border-purple-500/50 transition-all group ${
              index === 0 ? 'border-purple-500/50 bg-purple-900/5' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index === 0 ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'
                } font-bold text-sm`}>
                  #{index + 1}
                </div>
                <div>
                   <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {hedge.market_title}
                  </h3>
                   <div className="text-xs text-gray-400 flex items-center gap-2">
                     <span className="text-red-400">{hedge.correlation.toFixed(2)} Corr</span>
                     <span>•</span>
                     <span className="text-green-400">Beta {hedge.visual_beta.toFixed(2)}</span>
                   </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase">Est. Cost</div>
                <div className="text-sm font-mono text-gray-300">${hedge.hedgeCost}</div>
              </div>
            </div>

             {/* Explanation Snippet */}
             <div className="mt-3 text-xs text-gray-500 bg-black/30 p-2 rounded-lg border border-white/5 line-clamp-2">
                {explanations[hedge.token_id] || "Analyzing correlation drivers..."}
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default HedgeRecommendations
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 font-semibold text-sm">
                    #{index + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-white">{hedge.market_title}</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {explanations[hedge.token_id] || hedge.explanation || 'Loading explanation...'}
                </p>
              </div>
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="glass rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <TrendingDown size={14} />
                  <span>Correlation</span>
                </div>
                <div className="text-purple-400 font-semibold">{hedge.correlation.toFixed(2)}</div>
              </div>
              
              <div className="glass rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Target size={14} />
                  <span>Beta</span>
                </div>
                <div className="text-purple-400 font-semibold">{hedge.visual_beta.toFixed(2)}</div>
              </div>
              
              <div className="glass rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <DollarSign size={14} />
                  <span>Hedge Size</span>
                </div>
                <div className="text-green-400 font-semibold">${calculateHedgeSize(hedge)}</div>
              </div>
              
              <div className="glass rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Shield size={14} />
                  <span>Efficiency</span>
                </div>
                <div className="text-purple-400 font-semibold">{hedge.efficiency}x</div>
              </div>
            </div>
            
            {/* Why this hedge */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">Why this hedge:</p>
              <div className="flex flex-wrap gap-2">
                {Math.abs(hedge.correlation) > 0.5 && (
                  <span className="px-2 py-1 rounded-full bg-purple-600/20 text-purple-300 text-xs">
                    Strong negative correlation
                  </span>
                )}
                {parseFloat(hedge.efficiency) > 2 && (
                  <span className="px-2 py-1 rounded-full bg-green-600/20 text-green-300 text-xs">
                    High efficiency
                  </span>
                )}
                {Math.abs(hedge.visual_beta) > 0.8 && (
                  <span className="px-2 py-1 rounded-full bg-blue-600/20 text-blue-300 text-xs">
                    Robust protection
                  </span>
                )}
              </div>
            </div>
            
            {index === 0 && (
              <div className="mt-4 pt-4 border-t border-purple-500/30">
                <p className="text-purple-400 text-sm font-semibold">⭐ Most Recommended Hedge</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      
      {rankedHedges.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Shield size={48} className="mx-auto mb-4 opacity-50" />
          <p>No suitable hedges found for this market.</p>
        </div>
      )}
    </div>
  )
}

export default HedgeRecommendations

