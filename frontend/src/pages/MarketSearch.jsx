import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, TrendingUp, Clock, Users } from 'lucide-react'
import { getMarkets } from '../api'
import { motion } from 'framer-motion'

const CATEGORIES = [
  { name: 'Global', value: 'global' },
  { name: 'Politics', value: 'politics' },
  { name: 'Crypto', value: 'crypto' },
  { name: 'Sports', value: 'sports' },
  { name: 'Business', value: 'business' },
  { name: 'Science', value: 'science' },
  { name: 'Pop Culture', value: 'pop-culture' },
]

function MarketSearch() {
  const [markets, setMarkets] = useState([])
  const [trending, setTrending] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('global')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadMarkets()
  }, [selectedCategory])

  const loadMarkets = async () => {
    setLoading(true)
    try {
      const data = await getMarkets(selectedCategory === 'global' ? null : selectedCategory)
      setMarkets(data)
      setTrending(data.slice(0, 20))
    } catch (error) {
      console.error('Error loading markets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMarkets = markets.filter(m =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.question.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleMarketClick = (market) => {
    navigate(`/analytics/${market.token_id}`)
  }

  return (
    <div className="min-h-screen p-6 md:p-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-4"
      >
        {/* Logo - Purple gradient delta with upward arrow */}
        <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="deltaGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#C084FC" />
              </linearGradient>
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#C084FC" />
              </linearGradient>
              {/* Mask to punch hole where arrow crosses delta */}
              <mask id="deltaMask">
                <rect width="100" height="100" fill="white"/>
                {/* Gap where arrow punches through - right side of triangle */}
                <line 
                  x1="66" y1="26" 
                  x2="82" y2="42" 
                  stroke="black" 
                  strokeWidth="14"
                  strokeLinecap="round"
                />
              </mask>
            </defs>
            {/* Delta triangle with mask for punch-through effect */}
            <path 
              d="M50 8 L92 85 L8 85 Z" 
              fill="none" 
              stroke="url(#deltaGradient)" 
              strokeWidth="8"
              strokeLinejoin="round"
              mask="url(#deltaMask)"
            />
            {/* Upward trending arrow/graph line inside */}
            <path 
              d="M22 68 L38 52 L52 60 L62 48" 
              fill="none" 
              stroke="url(#arrowGradient)" 
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Arrow head - Lucide-style trending up arrow */}
            <polyline 
              points="56,32 72,32 72,48" 
              fill="none"
              stroke="url(#arrowGradient)" 
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="62" y1="48"
              x2="72" y2="32"
              stroke="url(#arrowGradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        <div>
          <h1 className="text-4xl md:text-5xl font-bold mb-1 text-white">
            DeltaHedge
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Polymarket Analytics & Hedging Intelligence
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400" size={20} />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 glass rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 flex flex-wrap gap-3"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-6 py-2 rounded-full glass transition-all ${
              selectedCategory === cat.value
                ? 'bg-purple-600/30 border-purple-500/50 glow-purple'
                : 'hover:bg-white/10'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </motion.div>

      {/* Trending Section */}
      {!searchTerm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-purple-400" size={24} />
            <h2 className="text-2xl font-semibold text-white">Top 20 Trending Markets</h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {trending.map((market, index) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  index={index}
                  onClick={() => handleMarketClick(market)}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Search Results */}
      {searchTerm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-semibold text-white mb-6">
            Search Results ({filteredMarkets.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMarkets.map((market, index) => (
              <MarketCard
                key={market.id}
                market={market}
                index={index}
                onClick={() => handleMarketClick(market)}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function MarketCard({ market, index, onClick }) {
  const formatVolume = (vol) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(2)}M`
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`
    return `$${vol.toFixed(0)}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="glass rounded-xl p-5 cursor-pointer hover:glass-strong hover:border-purple-500/30 border border-transparent transition-all group relative"
    >
      {/* Multi-option market indicator */}
      {market.is_multi_option && (
        <div className="absolute -top-2 left-4 flex items-center gap-1.5 px-2 py-0.5 bg-purple-600/90 rounded-full border border-purple-400/50">
          <Users size={10} className="text-purple-200" />
          <span className="text-[10px] font-medium text-purple-100">
            {market.outcome_name || `${market.total_outcomes} options`}
          </span>
        </div>
      )}
      
      <div className={`flex items-start justify-between ${market.is_multi_option ? 'mt-2' : ''} mb-3`}>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-1">
            {market.title}
          </h3>
          <p className="text-gray-400 text-xs line-clamp-1">
            {market.question}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{market.age}</span>
          </div>
          {market.volume_24h > 0 && (
            <span className="text-gray-500">
              {formatVolume(market.volume_24h)} vol
            </span>
          )}
        </div>
        <span className="text-purple-400 text-xs font-medium group-hover:text-purple-300 transition-colors">
          View Analytics →
        </span>
      </div>
    </motion.div>
  )
}

export default MarketSearch

