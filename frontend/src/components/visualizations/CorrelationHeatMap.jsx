import { useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'

function CorrelationHeatMap({ correlations, targetTitle }) {
  const [hoveredCard, setHoveredCard] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const containerRef = useRef(null)

  // Create a matrix-like structure for heat map
  const heatMapData = useMemo(() => {
    // Sort correlations by absolute value for better visualization
    const sorted = [...correlations]
      .filter(c => c.token_id) // Filter out invalid entries
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 20) // Top 20 for readability
    
    return sorted
  }, [correlations])

  // Generate explanation for correlation
  const getCorrelationExplanation = (corr) => {
    const absCorr = Math.abs(corr.correlation)
    const isPositive = corr.correlation > 0
    const strength = absCorr > 0.7 ? 'Strong' : absCorr > 0.4 ? 'Moderate' : 'Weak'
    
    if (isPositive) {
      return `${strength} positive correlation (${corr.correlation.toFixed(2)}): When "${targetTitle.substring(0, 30)}..." moves up, this market tends to move up as well. These markets may share common underlying factors or sentiment drivers.`
    } else {
      return `${strength} negative correlation (${corr.correlation.toFixed(2)}): When "${targetTitle.substring(0, 30)}..." moves up, this market tends to move down. This could be a potential hedge for your position.`
    }
  }

  const handleMouseEnter = (e, corr) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    
    // Position tooltip relative to container, not fixed to viewport
    const tooltipWidth = 320
    let left = rect.left - containerRect.left + rect.width / 2 - tooltipWidth / 2
    
    // Keep tooltip within container bounds
    if (left < 0) left = 0
    if (left + tooltipWidth > containerRect.width) left = containerRect.width - tooltipWidth
    
    setTooltipStyle({
      left: `${left}px`,
      top: `${rect.top - containerRect.top - 130}px`,
    })
    setHoveredCard(corr)
  }

  const handleMouseLeave = () => {
    setHoveredCard(null)
  }

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
    <div className="space-y-4 relative" ref={containerRef}>
      {/* Hover Tooltip - positioned relative to container */}
      {hoveredCard && (
        <div
          className="absolute z-50 w-80 p-4 bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl pointer-events-none"
          style={tooltipStyle}
        >
          <div className="text-sm text-white font-semibold mb-2 line-clamp-2">
            {hoveredCard.market_title}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed">
            {getCorrelationExplanation(hoveredCard)}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-2">
            <span className={`text-xs font-bold ${hoveredCard.correlation < 0 ? 'text-red-400' : 'text-green-400'}`}>
              {hoveredCard.correlation < 0 ? '🛡️ Potential Hedge' : '📈 Moves Together'}
            </span>
          </div>
          {/* Arrow pointing down */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 border-r border-b border-purple-500/30 rotate-45"></div>
        </div>
      )}

      {/* Heat Map Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-36">
        {heatMapData.map((corr, index) => (
          <motion.div
            key={corr.token_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`${getColor(corr.correlation)} ${getTextColor(corr.correlation)} rounded-lg p-4 cursor-pointer transition-transform hover:scale-105 hover:shadow-lg`}
            onMouseEnter={(e) => handleMouseEnter(e, corr)}
            onMouseLeave={handleMouseLeave}
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

