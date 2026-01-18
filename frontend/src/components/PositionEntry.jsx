import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

function PositionEntry({ position, setPosition, marketTitle }) {
  const [amount, setAmount] = useState(position.amount.toString())
  const [direction, setDirection] = useState(position.direction)

  const handleAmountChange = (e) => {
    const value = e.target.value
    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
      setAmount(value)
      setPosition({ ...position, amount: parseFloat(value) || 0 })
    }
  }

  const handleDirectionChange = (dir) => {
    setDirection(dir)
    setPosition({ ...position, direction: dir })
  }

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-6">Enter Your Position</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Amount Input */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Position Amount ($)</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" size={20} />
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="1000"
              className="w-full pl-12 pr-4 py-3 glass-strong rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
            />
          </div>
        </div>
        
        {/* Direction Selection */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Position Direction</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleDirectionChange('YES')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl glass transition-all ${
                direction === 'YES'
                  ? 'bg-purple-600/30 border-2 border-purple-500/50 glow-purple'
                  : 'hover:glass-strong'
              }`}
            >
              <TrendingUp size={20} className={direction === 'YES' ? 'text-purple-300' : 'text-gray-400'} />
              <span className={direction === 'YES' ? 'text-purple-300 font-semibold' : 'text-gray-400'}>YES</span>
            </button>
            <button
              onClick={() => handleDirectionChange('NO')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl glass transition-all ${
                direction === 'NO'
                  ? 'bg-purple-600/30 border-2 border-purple-500/50 glow-purple'
                  : 'hover:glass-strong'
              }`}
            >
              <TrendingDown size={20} className={direction === 'NO' ? 'text-purple-300' : 'text-gray-400'} />
              <span className={direction === 'NO' ? 'text-purple-300 font-semibold' : 'text-gray-400'}>NO</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Position Summary */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Market</p>
            <p className="text-white font-semibold">{marketTitle}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Position Value</p>
            <p className="text-purple-400 font-semibold text-xl">${parseFloat(amount || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PositionEntry

