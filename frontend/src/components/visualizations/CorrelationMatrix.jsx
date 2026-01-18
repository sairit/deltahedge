import { useMemo } from 'react'

function CorrelationMatrix({ correlations, targetTitle }) {
  const sortedCorrelations = useMemo(() => {
    return [...correlations].sort((a, b) => b.correlation - a.correlation)
  }, [correlations])

  const getColor = (correlation) => {
    if (correlation > 0.7) return 'from-green-500 to-green-600'
    if (correlation > 0.3) return 'from-blue-500 to-blue-600'
    if (correlation > -0.3) return 'from-gray-500 to-gray-600'
    if (correlation > -0.7) return 'from-orange-500 to-orange-600'
    return 'from-red-500 to-red-600'
  }

  const getIntensity = (correlation) => {
    return Math.abs(correlation) * 100
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedCorrelations.map((corr, index) => (
          <div
            key={corr.token_id}
            className="glass rounded-xl p-4 hover:glass-strong transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium text-sm line-clamp-1">
                {corr.market_title}
              </h4>
              <span className={`text-xs font-semibold ${
                corr.correlation > 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getColor(corr.correlation)} transition-all`}
                  style={{ width: `${getIntensity(corr.correlation)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 min-w-[60px] text-right">
                {corr.correlation > 0 ? 'Positive' : 'Negative'}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400 pt-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded"></div>
          <span>Strong Positive (&gt;0.7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded"></div>
          <span>Strong Negative (&lt;-0.7)</span>
        </div>
      </div>
    </div>
  )
}

export default CorrelationMatrix

