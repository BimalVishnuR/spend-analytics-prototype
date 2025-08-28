import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5001";

// Updated to NOT use category - only Job Title and Origin
export default function CostModel2({ 
  // Keep these props for consistency but won't use category
  selectedCategory = "", 
  onCategoryChange = () => {},
  selectedSubCategory = "", 
  onSubCategoryChange = () => {},
  selectedRegion = "", 
  onRegionChange = () => {}
}) {
  const [jobTitles, setJobTitles] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState("");
  const [waterfallSequence, setWaterfallSequence] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [error, setError] = useState("");

  // Load job titles and origins (no category filtering)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/home/cost-model-2/options`);
        if (!res.ok) throw new Error(`/home/cost-model-2/options -> ${res.status}`);
        const json = await res.json();
        setJobTitles(json.jobTitles || []);
        setOrigins(json.origins || []);

        // Auto-select first values if none selected
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
  }, [selectedJobTitle, selectedOrigin]);

  // Load waterfall data when filters change (no category)
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
        setWaterfallSequence(json.waterfallSequence || []);
      } catch (e) {
        console.error(e);
        setWaterfallSequence([]);
        setError("Failed to load waterfall data for the selected filters.");
      }
    })();
  }, [selectedJobTitle, selectedOrigin]);

  // Load comparison data when job title changes (no category)
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
    <div className="h-full flex flex-col overflow-hidden px-6 pb-6">
      {/* Error Display */}
      {error && (
        <div className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel: REDESIGNED Filter Panel - 14% (2 cards only) */}
        <div className="w-[14%] flex flex-col gap-4 min-h-0">
          {/* Job Title Filter Card - Takes up more space (60%) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-[3] flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-orange-200 pb-2 mb-4">
              <h4 className="text-sm font-semibold text-orange-800">👤 Job Title</h4>
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {jobTitles.map((jobTitle) => (
                <button
                  key={jobTitle}
                  onClick={() => setSelectedJobTitle(jobTitle)}
                  className={`w-full text-left p-2 rounded-md text-xs transition-all duration-200 ${
                    selectedJobTitle === jobTitle
                      ? "bg-orange-500 text-white font-medium shadow-sm"
                      : "bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800"
                  }`}
                >
                  {jobTitle}
                </button>
              ))}
            </div>
          </div>

          {/* Origin Filter Card - Takes remaining space (40%) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex-[2] flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-teal-200 pb-2 mb-4">
              <h4 className="text-sm font-semibold text-teal-800">🌏 Origin</h4>
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {origins.map((origin) => (
                <button
                  key={origin}
                  onClick={() => setSelectedOrigin(origin)}
                  className={`w-full text-left p-2 rounded-md text-xs transition-all duration-200 ${
                    selectedOrigin === origin
                      ? "bg-teal-500 text-white font-medium shadow-sm"
                      : "bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800"
                  }`}
                >
                  {origin}
                </button>
              ))}
            </div>

            {/* Status indicator */}
            <div className="text-xs text-gray-500 pt-3 border-t border-gray-100 mt-3">
              {waterfallData.length > 0 ? (
                <>
                  ✓ Showing {waterfallData.length} cost components
                  <br />
                  <span className="text-gray-400">(Zero-values hidden)</span>
                </>
              ) : (
                <span className="text-amber-600">⚠ No data available</span>
              )}
            </div>
          </div>
        </div>

        {/* Center Panel: Waterfall Chart - 56% */}
        <div className="w-[56%] bg-gray-50 p-3 rounded-lg flex flex-col min-h-0">
          <h3 className="text-md font-medium mb-2">
            Labor Cost Waterfall: {selectedJobTitle} ({selectedOrigin})
          </h3>
          
          {!selectedJobTitle || !selectedOrigin ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select job title and origin to view labor cost waterfall
            </div>
          ) : waterfallData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              No data available with values greater than zero
            </div>
          ) : (
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
                    fontSize={9}
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
                      fontSize={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend for waterfall colors */}
          <div className="flex-shrink-0 mt-3 flex flex-wrap gap-2 text-xs">
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

        {/* Right Panel: Origin Comparison - 30% */}
        <div className="w-[30%] bg-gray-50 p-3 rounded-lg flex flex-col min-h-0">
          <h3 className="text-md font-medium mb-3">
            Final Rate by Origin
          </h3>
          <p className="text-xs text-gray-600 mb-3">Job Title: {selectedJobTitle}</p>
          
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
                    fontSize={10}
                  />
                  <YAxis 
                    fontSize={9}
                    domain={[0, 'dataMax + 500']}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value?.toLocaleString() || 'N/A'} OMR`, "Final Rate"]}
                  />
                  <Bar 
                    dataKey="finalRate" 
                    fill="#8884d8"
                    name="Final Rate"
                  >
                    <LabelList
                      dataKey="finalRate"
                      position="top"
                      formatter={(v) => v ? `${Math.round(v).toLocaleString()}` : '0'}
                      fontSize={8}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                No comparison data available
              </div>
            )}
          </div>

          {/* Comparison Legend */}
          <div className="flex-shrink-0 mt-3 pt-2 border-t border-gray-200">
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-indigo-500"></div>
                <span>Labor Rates (OMR/month)</span>
              </div>
              <div className="text-gray-500">
                Comparison across different origins for selected job title
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
