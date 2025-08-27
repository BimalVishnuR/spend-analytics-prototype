import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5001";

export default function CostModel2() {
  const [jobTitles, setJobTitles] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("");
  const [waterfallSequence, setWaterfallSequence] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [error, setError] = useState("");

  // Load dropdown options
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/home/cost-model-2/options`);
        if (!res.ok) throw new Error(`/home/cost-model-2/options -> ${res.status}`);
        const json = await res.json();
        setJobTitles(json.jobTitles || []);
        setOrigins(json.origins || []);

        // Optionally preselect the first values
        if (json.jobTitles?.length && !selectedJobTitle) {
          setSelectedJobTitle(json.jobTitles[0]);
        }
        if (json.origins?.length && !selectedOrigin) {
          setSelectedOrigin(json.origins[0]);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load filter options from backend.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load waterfall data when both filters change
  useEffect(() => {
    if (!selectedJobTitle || !selectedOrigin) return;
    (async () => {
      try {
        setError("");
        const qs = new URLSearchParams({
          jobTitle: selectedJobTitle,
          origin: selectedOrigin,
        }).toString();
        const res = await fetch(`${API_BASE}/home/cost-model-2/waterfall?${qs}`);
        if (!res.ok) throw new Error(`/home/cost-model-2/waterfall -> ${res.status}`);
        const json = await res.json();
        console.log("Waterfall data received:", json.waterfallSequence); // DEBUG
        setWaterfallSequence(json.waterfallSequence || []);
      } catch (e) {
        console.error(e);
        setWaterfallSequence([]);
        setError("Failed to load waterfall data for the selected filters.");
      }
    })();
  }, [selectedJobTitle, selectedOrigin]);

  // Load comparison data when job title changes
  useEffect(() => {
    if (!selectedJobTitle) return;
    (async () => {
      try {
        const qs = new URLSearchParams({
          jobTitle: selectedJobTitle,
        }).toString();
        const res = await fetch(`${API_BASE}/home/cost-model-2/comparison?${qs}`);
        if (!res.ok) throw new Error(`/home/cost-model-2/comparison -> ${res.status}`);
        const json = await res.json();
        console.log("Comparison data received:", json.comparisonData); // DEBUG
        setComparisonData(json.comparisonData || []);
      } catch (e) {
        console.error(e);
        setComparisonData([]);
      }
    })();
  }, [selectedJobTitle]);

  // True waterfall chart data
  const waterfallData = useMemo(() => {
    if (!waterfallSequence?.length) return [];
    
    const data = [];
    let cumulative = 0;

    waterfallSequence.forEach((item, index) => {
      if (item.type === 'component') {
        const base = cumulative;
        const change = item.value || 0;
        cumulative += change;
        
        data.push({
          name: item.name,
          base,
          change,
          cumulative,
          isComponent: true,
          color: item.name.includes('Salary') ? '#3b82f6' :
                 item.name.includes('Allowance') ? '#10b981' :
                 item.name.includes('Insurance') ? '#f59e0b' : '#ef4444'
        });
      } else {
        // Milestone - show as full bar
        data.push({
          name: item.name,
          base: 0,
          change: item.value,
          cumulative: item.value,
          isMilestone: true,
          color: '#8b5cf6' // Purple for milestones
        });
      }
    });

    return data;
  }, [waterfallSequence]);

  // Custom tooltip for waterfall
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow">
          <p className="font-semibold">{label}</p>
          {data.isMilestone ? (
            <p className="text-purple-600">Total: {data.change.toLocaleString()} OMR</p>
          ) : (
            <>
              <p className="text-blue-600">Amount: {data.change.toLocaleString()} OMR</p>
              <p className="text-gray-600">Running Total: {data.cumulative.toLocaleString()} OMR</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[89vh] flex flex-col p-6 bg-white">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h2 className="text-xl font-semibold mb-4">Cost Model 2 — Labor SCM Waterfall Analysis</h2>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={selectedJobTitle}
            onChange={(e) => setSelectedJobTitle(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="" disabled>
              Select job title…
            </option>
            {jobTitles.map((jt) => (
              <option key={jt} value={jt}>
                {jt}
              </option>
            ))}
          </select>

          <select
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="" disabled>
              Select origin…
            </option>
            {origins.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts Container - Full Height */}
      {!selectedJobTitle || !selectedOrigin ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Pick a Job Title and Origin to see the charts.
        </div>
      ) : (
        <div className="flex-1 flex gap-6">
          {/* Left: Waterfall Chart - 70% */}
          <div className="w-[70%] bg-gray-50 p-4 rounded-lg flex flex-col">
            <h3 className="text-lg font-medium mb-3 flex-shrink-0">
              Cost Breakdown Waterfall: {selectedJobTitle} ({selectedOrigin})
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 40, bottom: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={0}
                    fontSize={10}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Base (invisible/transparent) for waterfall effect */}
                  <Bar dataKey="base" stackId="stack" fill="transparent" />
                  
                  {/* Actual value bars */}
                  <Bar dataKey="change" stackId="stack">
                    {waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="change"
                      position="top"
                      formatter={(v) => `${v.toLocaleString()}`}
                      fontSize={9}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend for waterfall colors */}
            <div className="flex-shrink-0 mt-4 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500"></div>
                <span>Salary</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500"></div>
                <span>Allowances</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500"></div>
                <span>Insurance</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500"></div>
                <span>Other Costs</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500"></div>
                <span>Milestones</span>
              </div>
            </div>
          </div>

          {/* Right: Vertical Comparison Chart - 30% */}
          <div className="w-[30%] bg-gray-50 p-4 rounded-lg flex flex-col">
            <h3 className="text-lg font-medium mb-3 flex-shrink-0">
              Final Rate by Origin
            </h3>
            <p className="text-sm text-gray-600 mb-3 flex-shrink-0">{selectedJobTitle}</p>
            
            {/* Debug info */}
            <div className="text-xs text-gray-500 mb-2 flex-shrink-0">
              Data points: {comparisonData?.length || 0}
            </div>
            
            <div className="flex-1">
              {comparisonData && comparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={comparisonData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="origin" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      fontSize={11}
                    />
                    <YAxis 
                      fontSize={10}
                      domain={[0, 'dataMax + 500']}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value?.toLocaleString() || 'N/A'} OMR`, "Final Rate"]}
                    />
                    <Bar 
                      dataKey="finalRate" 
                      fill="#8884d8"
                      minPointSize={2}
                    >
                      <LabelList
                        dataKey="finalRate"
                        position="top"
                        formatter={(v) => v ? `${Math.round(v).toLocaleString()}` : '0'}
                        fontSize={9}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No comparison data available
                </div>
              )}
            </div>

            {/* Show raw data for debugging */}
            <div className="text-xs text-gray-500 mt-2 max-h-20 overflow-auto flex-shrink-0">
              {comparisonData && comparisonData.length > 0 ? (
                comparisonData.map((item, idx) => (
                  <div key={idx}>
                    {item?.origin || 'Unknown'}: {item?.finalRate?.toLocaleString() || 'N/A'}
                  </div>
                ))
              ) : (
                <div>No data to display</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
