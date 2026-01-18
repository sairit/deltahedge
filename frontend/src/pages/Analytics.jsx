import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingDown, TrendingUp, Shield, Info, PieChart as PieChartIcon } from 'lucide-react'
import { analyzeMarket, explainInsight } from '../api'
import { motion } from 'framer-motion'
import PayoffCurve from '../components/visualizations/PayoffCurve'
import HedgeFrontier from '../components/visualizations/HedgeFrontier'
import CorrelationMatrix from '../components/visualizations/CorrelationMatrix'
import CorrelationHeatMap from '../components/visualizations/CorrelationHeatMap'
import HedgeAllocationPie from '../components/visualizations/HedgeAllocationPie'
import HedgeRecommendations from '../components/HedgeRecommendations'
import PositionEntry from '../components/PositionEntry'
import ExplanationCard from '../components/ExplanationCard'

function Analytics() {
  const { marketId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [explanations, setExplanations] = useState({})
  const [position, setPosition] = useState({ amount: 1000, direction: 'YES' })
  const [selectedHedge, setSelectedHedge] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [marketId])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const result = await analyzeMarket(marketId)
      setData(result)
      
      // Separate hedges and positive correlations to prioritize explanations
      const hedges = result.correlations.filter(c => c.correlation < 0).slice(0, 5)
      const positiveCorrs = result.correlations.filter(c => c.correlation > 0).slice(0, 5)
      const marketsToExplain = [...hedges, ...positiveCorrs];

      // Load explanations
      const expPromises = marketsToExplain.map(async (corr) => {
        try {
          if (explanations[corr.token_id]) return;

          const exp = await explainInsight(
            result.target.title,
            corr.market_title,
            corr.correlation,
            corr.correlation < 0 ? 'Hedge recommendation analysis' : 'Correlation analysis'
          )
          return { [corr.token_id]: exp.insight || corr.explanation || 'Analysis available.' }
        } catch (error) {
          console.error(`Error loading explanation for ${corr.token_id}:`, error)
          return { [corr.token_id]: corr.explanation || 'Unable to generate explanation at this time.' }
        }
      })
      const expResults = await Promise.all(expPromises)
      const validResults = expResults.filter(Boolean);
      const expMap = Object.assign({}, ...validResults)
      setExplanations(prev => ({ ...prev, ...expMap }))
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-12 flex items-center justify-center bg-black">
         <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing market correlations...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen p-6 md:p-12 bg-black">
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Search
        </button>
        <div className="glass rounded-2xl p-8 text-center text-red-400">
          Error loading market data. Try again later.
        </div>
      </div>
    )
  }

  const hedges = data.correlations.filter(c => c.correlation < 0).slice(0, 5)

  return (
    <div className="min-h-screen p-6 md:p-8 bg-black text-gray-100 font-sans">
      {/* 1. Header Area: Title & Context */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-800 pb-6"
      >
        <div>
          <button
            onClick={() => navigate('/')}
            className="group mb-2 flex items-center gap-2 text-gray-500 hover:text-purple-400 transition-colors text-sm font-medium"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Search
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {data.target.title}
          </h1>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-400 bg-gray-900 rounded-lg p-3 border border-gray-800">
             <div className="flex flex-col">
               <span className="text-xs text-gray-500 uppercase tracking-wider">Current Price</span>
               <span className="text-purple-400 font-mono text-lg font-semibold">{(data.target.current_price * 100)?.toFixed(1) || '0.0'}%</span>
             </div>
             <div className="w-px h-8 bg-gray-800"></div>
             <div className="flex flex-col">
               <span className="text-xs text-gray-500 uppercase tracking-wider">Volatility</span>
               <span className="text-gray-300 font-mono text-lg">{(data.target.volatility * 100).toFixed(1)}%</span>
             </div>
        </div>
      </motion.div>

      {/* 2. Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT SECTOR: Position management & Outcomes (Col Span 4) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
           <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6"
           >
              <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                 1. Position Sizing
              </h2>
              <PositionEntry
                  position={position}
                  setPosition={setPosition}
                  marketTitle={data.target.title}
                />
           </motion.div>

           <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 flex-1"
           >
              <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
                 2. Portfolio Split
              </h2>
               <div className="h-64">
                   <HedgeAllocationPie 
                        position={position}
                        selectedHedge={selectedHedge}
                        targetPrice={data.target.current_price}
                    />
               </div>
           </motion.div>
        </div>

        {/* MIDDLE SECTOR: Risk Analysis (Col Span 5) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6 h-full"
              >
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                     3. Payoff Analysis
                     <Info size={14} className="text-gray-600" />
                  </h2>
                   {selectedHedge && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/20 border border-purple-500/30">
                        <Shield size={12} className="text-purple-400" />
                        <span className="text-xs text-purple-300">Hedging Active</span>
                    </div>
                  )}
                </div>
                
                <div className="h-[450px] w-full">
                  <PayoffCurve
                    position={position}
                    currentPrice={data.target.current_price}
                    volatility={data.target.volatility}
                    hedges={hedges}
                    selectedHedge={selectedHedge}
                  />
                </div>
            </motion.div>
        </div>

        {/* RIGHT SECTOR: Hedge Discovery (Col Span 3) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
             <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col h-full gap-6"
             >
                 {/* Hedge Suggestions */}
                 <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 flex-1 overflow-hidden flex flex-col">
                    <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">
                       Top Hedge Candidates
                    </h2>
                     <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {hedges.length > 0 ? (
                            <HedgeRecommendations
                            hedges={hedges}
                            position={position}
                            targetPrice={data.target.current_price}
                            explanations={explanations}
                            onSelectHedge={setSelectedHedge}
                            compact={true} 
                            />
                        ) : (
                        <div className="text-center text-gray-500 py-10">
                            No correlations found.
                        </div>
                        )}
                     </div>
                 </div>

                 {/* Frontier Mini Map */}
                  <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 h-64">
                    <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">
                       Hedge Efficiency Frontier
                    </h2>
                    <div className="h-full w-full">
                         <HedgeFrontier
                            hedges={hedges}
                            position={position}
                        />
                    </div>
                 </div>
             </motion.div>
        </div>
      </div>

       {/* 3. Bottom Context Row */}
       <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6"
            >
                <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-6">
                    Correlation Heatmap
                </h2>
                <CorrelationHeatMap
                    correlations={data.correlations}
                    targetTitle={data.target.title}
                />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6"
            >
                 <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-6">
                    Comparison Matrix
                </h2>
                 <CorrelationMatrix
                    correlations={data.correlations}
                    targetTitle={data.target.title}
                 />
            </motion.div>
       </div>
    </div>
  )
}

export default Analytics

