import { useMemo } from 'react'
import { motion } from 'framer-motion'

function CorrelationHeatMap({ correlations, targetTitle }) {
  // Create a matrix-like structure for heat map
  const heatMapData = useMemo(() => {
    // Sort correlations by absolute value for better visualization
    const sorted = [...correlations]
      .filter(c => c.token_id) // Filter out invalid entries
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 20) // Top 20 for readability
    
    return sorted
  }, [correlations])

  const getColor = (correlation) => {
    const absCorr = Math.abs(correlation)
    if (correlation > 0) {
      // Positive correlation - green shades
      if (absCorr > 0.7) return 'bg-green-500'
      if (absCorr > 0.5) return 'bg-green-400'
      if (absCorr > 0.3) return 'bg-green-300'
      return 'bg-green-200'
    } else {
      // Negative correlation - red shades
      if (absCorr > 0.7) return 'bg-red-500'
      if (absCorr > 0.5) return 'bg-red-400'
      if (absCorr > 0.3) return 'bg-red-300'
      return 'bg-red-200'
    }
  }

  const getTextColor = (correlation) => {
    const absCorr = Math.abs(correlation)
    return absCorr > 0.5 ? 'text-white' : 'text-gray-800'
  }

  return (
    <div className="space-y-4">
      {/* Heat Map Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {heatMapData.map((corr, index) => (
          <motion.div
            key={corr.token_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`${getColor(corr.correlation)} ${getTextColor(corr.correlation)} rounded-lg p-4 cursor-pointer hover:scale-105 transition-transform`}
            title={corr.market_title}
          >
            <div className="text-xs font-semibold mb-1 line-clamp-2">
              {corr.market_title.length > 30 
                ? corr.market_title.substring(0, 30) + '...' 
                : corr.market_title}
            </div>
            <div className="text-lg font-bold">
              {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(2)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Strong Positive (&gt;0.7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-300 rounded"></div>
            <span>Weak Positive (&lt;0.3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Strong Negative (&lt;-0.7)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-300 rounded"></div>
            <span>Weak Negative (&gt;-0.3)</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Showing top {heatMapData.length} correlations
        </div>
      </div>
    </div>
  )
}

export default CorrelationHeatMap

