import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend);

export default function CategoryPieChart({ transactions }) {
  const categoryTotals = transactions.reduce((acc, tx) => {
    const cat = tx.personalFinanceCategory || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + tx.amount;
    return acc;
  }, {});

  const data = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        data: Object.values(categoryTotals),
        backgroundColor: [
          "#60a5fa", "#fbbf24", "#34d399", "#f87171", "#a78bfa", "#f472b6", "#facc15", "#38bdf8", "#4ade80", "#f59e42"
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8">
      <h2 className="text-lg font-semibold mb-2 text-center">Spending by Category</h2>
      <Pie data={data} />
    </div>
  );
}
