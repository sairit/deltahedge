import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const COLORS = ['#EF4444', '#10B981', '#6366F1'];

function HedgeAllocationPie({ position, selectedHedge, targetPrice }) {
  const data = useMemo(() => {
    // Unhedged Value
    const unhedgedValue = position.amount;
    
    // Hedge Value (if selected)
    let hedgeValue = 0;
    let cashValue = 0; // Assuming full investment for now, but could be remaining budget

    if (selectedHedge) { 
        // Logic from PayoffCurve: 
        // const hedgeRatio = Math.abs(hedgeBeta) * 0.5 
        // const hedgeSize = amount * hedgeRatio
        // We'll replicate rough sizing logic here or pass it in.
        // For visualization, let's assume we are adding to the position or splitting the budget.
        // If "hedging", usually we pay a cost. 
        // Let's assume the user allocates additional capital for the hedge 
        // OR splits their current capital.
        // Given the UI allows entering "Position Amount", let's assume Hedge is *additional* cost or part of portfolio.
        
        // Let's model it as: Portfolio Composition.
        // Asset A (Target): $Amount
        // Asset B (Hedge): $HedgeCost
        
        const beta = selectedHedge.visual_beta || 1;
        const ratio = Math.abs(beta) * 0.5; // Using the 50% hedge ratio from PayoffCurve logic
        hedgeValue = unhedgedValue * ratio;
    }

    return [
      { name: 'Target Market', value: unhedgedValue },
      { name: 'Hedge Position', value: hedgeValue },
    ].filter(d => d.value > 0);
  }, [position, selectedHedge]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => `$${value.toFixed(2)}`}
            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#F3F4F6' }}
            itemStyle={{ color: '#F3F4F6' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle"/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HedgeAllocationPie
