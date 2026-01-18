import { useMemo } from 'react'
import { Shield, TrendingDown, DollarSign, Target } from 'lucide-react'
import { motion } from 'framer-motion'

function HedgeRecommendations({ hedges, position, targetPrice, explanations, onSelectHedge, selectedHedge }) {
  // Generate a fallback explanation locally
  const getLocalExplanation = (hedge) => {
    const absCorr = Math.abs(hedge.correlation)
    const strength = absCorr > 0.7 ? 'Strong' : absCorr > 0.4 ? 'Moderate' : 'Weak'
    return `${strength} negative correlation (${hedge.correlation.toFixed(2)}). When your position loses value, this market tends to gain. This inverse relationship makes it an effective hedge to reduce portfolio risk.`
  }

  // Check if explanation is valid (not an error message)
  const getExplanation = (hedge) => {
    const exp = explanations[hedge.token_id]
    if (!exp || exp.includes('Unable to generate') || exp.includes('at the moment')) {
      return getLocalExplanation(hedge)
    }
    return exp
  }

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
    <div className="glass rounded-2xl p-6 md:p-8 h-full flex flex-col w-full">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <Shield className="text-purple-400" size={24} />
        <h2 className="text-xl font-semibold uppercase tracking-wider text-white">Top Hedge Recommendations</h2>
      </div>
      
      <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4">
        {rankedHedges.map((hedge, index) => (
          <motion.div
            key={hedge.token_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectHedge(hedge)}
            className={`min-w-[300px] w-[350px] bg-gray-900/40 border rounded-xl p-5 cursor-pointer hover:bg-gray-800 transition-all group shrink-0 ${
              selectedHedge?.token_id === hedge.token_id 
                ? 'border-purple-500 bg-purple-900/20 ring-2 ring-purple-500/30' 
                : index === 0 
                  ? 'border-purple-500/50 bg-purple-900/5 hover:border-purple-500/80' 
                  : 'border-gray-700/50 hover:border-purple-500/50'
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
                {getExplanation(hedge)}
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default HedgeRecommendations

