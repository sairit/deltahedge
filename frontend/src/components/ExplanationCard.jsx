import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'

function ExplanationCard({ title, correlation, explanation, type }) {
  const isPositive = correlation > 0
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-6 hover:glass-strong transition-all"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-lg ${
          isPositive ? 'bg-green-600/20' : 'bg-red-600/20'
        }`}>
          {isPositive ? (
            <TrendingUp className={isPositive ? 'text-green-400' : 'text-red-400'} size={20} />
          ) : (
            <TrendingDown className="text-red-400" size={20} />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-sm font-semibold ${
              isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {isPositive ? '+' : ''}{correlation.toFixed(2)} correlation
            </span>
            {type === 'correlation' && (
              <span className="text-xs text-gray-400">
                {isPositive ? 'Moves together' : 'Inverse movement'}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="pl-16">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-purple-400 mt-1 flex-shrink-0" />
          <p className="text-gray-300 text-sm leading-relaxed">
            {explanation || 'Loading explanation...'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default ExplanationCard

