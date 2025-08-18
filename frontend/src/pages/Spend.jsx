// frontend/src/pages/Spend.jsx
import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config.js";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#60a5fa","#34d399","#fbbf24","#f87171"];

const fallbackBreakdown = [
  { name: "Drilling", value: 40, percent: 40 },
  { name: "Logistics", value: 20, percent: 20 },
  { name: "Fabrication", value: 15, percent: 15 },
  { name: "Maintenance", value: 25, percent: 25 },
];

const fallbackPreview = [
  { Category: "Drilling", Amount: 40000 },
  { Category: "Logistics", Amount: 20000 },
  { Category: "Fabrication", Amount: 15000 },
  { Category: "Maintenance", Amount: 25000 },
];

export default function Spend() {
  const [preview, setPreview] = useState(fallbackPreview);
  const [breakdown, setBreakdown] = useState(fallbackBreakdown);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/spend/demo`);
        if (!res.ok) throw new Error("API failed");
        const json = await res.json();
        setPreview(json.preview || fallbackPreview);
        setBreakdown(json.breakdown || fallbackBreakdown);
        setGrandTotal(json.grandTotal || 0);
      } catch (e) {
        console.error("Fetch failed, using fallback data", e);
        setPreview(fallbackPreview);
        setBreakdown(fallbackBreakdown);
        setGrandTotal(fallbackPreview.reduce((acc, r) => acc + r.Amount, 0));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Spend (Demo)</h1>
      <p className="text-sm text-gray-600 mb-4">Grand Total: {grandTotal.toLocaleString()}</p>

      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 border rounded bg-white">
              <h2 className="font-semibold mb-2">Category Breakdown</h2>
              <div className="w-full h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="name" outerRadius={100} label>
                      {breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 border rounded bg-white">
              <h2 className="font-semibold mb-2">Percent by Category</h2>
              <ul className="text-sm space-y-1">
                {breakdown.map((b) => (
                  <li key={b.name}>
                    <span className="font-medium">{b.name}</span>: {b.percent}% ({b.value.toLocaleString()})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 border rounded bg-white">
            <h2 className="font-semibold mb-2">Preview Rows</h2>
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(preview[0]).map((col) => (
                    <th key={col} className="px-2 py-1 border border-gray-300">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-2 py-1 border border-gray-300">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
