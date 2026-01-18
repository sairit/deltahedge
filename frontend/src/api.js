import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const getMarkets = async (category = null) => {
  const params = category ? { category } : {}
  const response = await api.get('/markets', { params })
  return response.data
}

export const analyzeMarket = async (targetId, category = 'global') => {
  const response = await api.get('/analyze', {
    params: { target_id: targetId, category },
  })
  return response.data
}

export const explainInsight = async (marketTitle, relatedMarketTitle = null, correlation = null, context = 'General analysis') => {
  const response = await api.post('/explain', {
    market_title: marketTitle,
    related_market_title: relatedMarketTitle,
    correlation,
    context,
  })
  return response.data
}

export default api

