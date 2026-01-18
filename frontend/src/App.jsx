import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import MarketSearch from './pages/MarketSearch'
import Analytics from './pages/Analytics'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/" element={<MarketSearch />} />
          <Route path="/analytics/:marketId" element={<Analytics />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

