import { useMemo } from 'react'
import { TrendingDown, TrendingUp, Shield, Target, DollarSign, Percent } from 'lucide-react'

function RiskSummary({ position, currentPrice, selectedHedge, hedges }) {
  const metrics = useMemo(() => {
    const { amount, direction } = position
    
    // Calculate unhedged metrics
    let maxGain, maxLoss, breakeven
    if (direction === 'YES') {
      maxGain = (1 - currentPrice) * amount
      maxLoss = currentPrice * amount
      breakeven = currentPrice * 100
    } else {
      maxGain = currentPrice * amount
      maxLoss = (1 - currentPrice) * amount
      breakeven = currentPrice * 100
    }
    
    // Calculate hedged metrics if a hedge is selected
    let hedgedMaxLoss = maxLoss
    let hedgedMaxGain = maxGain
    let downsideReduction = 0
    let upsideCost = 0
    let hedgeCost = 0
    let riskRewardRatio = maxGain / maxLoss
    let hedgedRiskReward = riskRewardRatio
    
    if (selectedHedge) {
      const hedgeBeta = Math.abs(selectedHedge.visual_beta)
      const hedgeCorrelation = selectedHedge.correlation
      const hedgeRatio = hedgeBeta * 0.5
      const hedgeSize = amount * hedgeRatio
      
      // Estimated hedge cost (premium/spread)
      hedgeCost = Math.abs(hedgeCorrelation) * hedgeSize * 0.1
      
      // Downside reduction (how much the hedge helps when your position loses)
      // For negative correlation hedges, they gain when your position loses
      const hedgeGainOnLoss = Math.abs(hedgeCorrelation) * hedgeSize
      hedgedMaxLoss = Math.max(0, maxLoss - hedgeGainOnLoss + hedgeCost)
      
      // Upside reduction (cost of hedge when your position wins)
      const hedgeLossOnGain = Math.abs(hedgeCorrelation) * hedgeSize
      hedgedMaxGain = maxGain - hedgeLossOnGain - hedgeCost
      
      downsideReduction = maxLoss > 0 ? ((maxLoss - hedgedMaxLoss) / maxLoss) * 100 : 0
      upsideCost = maxGain > 0 ? ((maxGain - hedgedMaxGain) / maxGain) * 100 : 0
      hedgedRiskReward = hedgedMaxLoss > 0 ? hedgedMaxGain / hedgedMaxLoss : 0
    }
    
    return {
      maxGain: Math.round(maxGain),
      maxLoss: Math.round(maxLoss),
      breakeven,
      hedgedMaxLoss: Math.round(hedgedMaxLoss),
      hedgedMaxGain: Math.round(hedgedMaxGain),
      downsideReduction: downsideReduction.toFixed(1),
      upsideCost: upsideCost.toFixed(1),
      hedgeCost: Math.round(hedgeCost),
      riskRewardRatio: riskRewardRatio.toFixed(2),
      hedgedRiskReward: hedgedRiskReward.toFixed(2),
    }
  }, [position, currentPrice, selectedHedge])

  return (
    <div className="h-full flex flex-col gap-4 p-2">
      <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
        {selectedHedge ? 'Hedged Risk Analysis' : 'Position Risk Analysis'}
      </h3>
      
      {/* Current Position Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-green-400" size={16} />
            <span className="text-gray-400 text-sm">Max Gain</span>
          </div>
          <div className="text-right">
            <div className="text-green-400 font-mono font-semibold">${metrics.maxGain.toLocaleString()}</div>
            {selectedHedge && metrics.hedgedMaxGain !== metrics.maxGain && (
              <div className="text-xs text-yellow-500">→ ${metrics.hedgedMaxGain.toLocaleString()}</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2">
            <TrendingDown className="text-red-400" size={16} />
            <span className="text-gray-400 text-sm">Max Loss</span>
          </div>
          <div className="text-right">
            <div className="text-red-400 font-mono font-semibold">-${metrics.maxLoss.toLocaleString()}</div>
            {selectedHedge && metrics.hedgedMaxLoss !== metrics.maxLoss && (
              <div className="text-xs text-green-500">→ -${metrics.hedgedMaxLoss.toLocaleString()}</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2">
            <Target className="text-purple-400" size={16} />
            <span className="text-gray-400 text-sm">Breakeven</span>
          </div>
          <div className="text-purple-400 font-mono font-semibold">{metrics.breakeven.toFixed(1)}%</div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
          <div className="flex items-center gap-2">
            <Percent className="text-blue-400" size={16} />
            <span className="text-gray-400 text-sm">Risk/Reward</span>
          </div>
          <div className="text-right">
            <div className="text-blue-400 font-mono font-semibold">{metrics.riskRewardRatio}x</div>
            {selectedHedge && (
              <div className="text-xs text-gray-500">→ {metrics.hedgedRiskReward}x</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Hedge Impact */}
      {selectedHedge && (
        <div className="mt-2 pt-3 border-t border-gray-700/50">
          <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Hedge Impact</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-green-900/20 rounded-lg border border-green-500/20 text-center">
              <div className="text-green-400 font-semibold text-lg">{metrics.downsideReduction}%</div>
              <div className="text-xs text-gray-500">Loss Reduction</div>
            </div>
            <div className="p-2 bg-yellow-900/20 rounded-lg border border-yellow-500/20 text-center">
              <div className="text-yellow-400 font-semibold text-lg">{metrics.upsideCost}%</div>
              <div className="text-xs text-gray-500">Upside Cost</div>
            </div>
          </div>
          <div className="mt-2 p-2 bg-purple-900/20 rounded-lg border border-purple-500/20 text-center">
            <div className="text-purple-400 font-semibold">${metrics.hedgeCost}</div>
            <div className="text-xs text-gray-500">Est. Hedge Cost</div>
          </div>
        </div>
      )}
      
      {!selectedHedge && (
        <div className="mt-auto p-3 bg-gray-800/30 rounded-lg border border-gray-700/30 text-center">
          <Shield className="text-gray-600 mx-auto mb-2" size={24} />
          <p className="text-xs text-gray-500">Select a hedge above to see risk reduction metrics</p>
        </div>
      )}
    </div>
  )
}

export default RiskSummary
