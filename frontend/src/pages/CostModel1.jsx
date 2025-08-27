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

export default function CostModel1() {
  // Store all options
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [allPumpTypes, setAllPumpTypes] = useState([]);
  const [allData, setAllData] = useState([]);
  
  // Filtered supplier options based on pump type
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  
  // Selected values
  const [selectedPumpType, setSelectedPumpType] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [waterfallSequence, setWaterfallSequence] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [error, setError] = useState("");

// Load dropdown options and raw data
useEffect(() => {
  (async () => {
    try {
      console.log("Fetching options from:", `${API_BASE}/home/cost-model-1/options`);
      const res = await fetch(`${API_BASE}/home/cost-model-1/options`);
      console.log("Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`/home/cost-model-1/options -> ${res.status}: ${errorText}`);
      }
      
      const json = await res.json();
      console.log("Options response:", json);
      
      setAllSuppliers(json.suppliers || []);
      setAllPumpTypes(json.pumpTypes || []);
      
      // ... rest of your logic
    } catch (e) {
      console.error("Full error:", e);
      setError(`Failed to load filter options: ${e.message}`);
    }
  })();
}, []);


  // Filter supplier options when pump type changes
useEffect(() => {
  if (!selectedPumpType) {
    setFilteredSuppliers([]);
    setSelectedSupplier("");
    return;
  }

  console.log("Filtering suppliers for pump type:", selectedPumpType); // DEBUG
  console.log("All data available:", allData.length); // DEBUG

  if (allData.length > 0) {
    // Use raw data for filtering if available
    console.log("Sample data row:", allData[0]); // DEBUG - to see data structure
    
    const suppliersForPumpType = allData
      .filter(item => {
        const itemPumpType = String(item["Pump Type"] ?? "").trim();
        const itemSupplier = String(item["Supplier"] ?? "").trim();
        const matches = itemPumpType === String(selectedPumpType).trim() && itemSupplier !== "";
        
        // Debug each row
        if (matches) {
          console.log("Found matching row:", { pumpType: itemPumpType, supplier: itemSupplier });
        }
        
        return matches;
      })
      .map(item => String(item["Supplier"] ?? "").trim());
    
    const uniqueSuppliers = Array.from(new Set(suppliersForPumpType)).filter(Boolean);
    
    console.log("Filtered suppliers from raw data:", uniqueSuppliers); // DEBUG
    
    if (uniqueSuppliers.length > 0) {
      setFilteredSuppliers(uniqueSuppliers);
      setSelectedSupplier(uniqueSuppliers[0] || "");
    } else {
      // If no suppliers found for this pump type, show empty list
      console.log("No suppliers found for pump type:", selectedPumpType);
      setFilteredSuppliers([]);
      setSelectedSupplier("");
    }
  } else {
    // Fallback: if no raw data, don't filter (show all suppliers)
    console.log("No raw data available, showing all suppliers"); // DEBUG
    setFilteredSuppliers(allSuppliers);
    setSelectedSupplier(allSuppliers[0] || "");
  }
}, [selectedPumpType, allData, allSuppliers]);


  // Load waterfall data when both filters change
  useEffect(() => {
    if (!selectedSupplier || !selectedPumpType) return;
    (async () => {
      try {
        setError("");
        const qs = new URLSearchParams({
          supplier: selectedSupplier,
          pumpType: selectedPumpType,
        }).toString();
        const res = await fetch(`${API_BASE}/home/cost-model-1/waterfall?${qs}`);
        if (!res.ok) throw new Error(`/home/cost-model-1/waterfall -> ${res.status}`);
        const json = await res.json();
        console.log("Waterfall data received:", json.waterfallSequence); // DEBUG
        setWaterfallSequence(json.waterfallSequence || []);
      } catch (e) {
        console.error(e);
        setWaterfallSequence([]);
        setError("Failed to load waterfall data for the selected filters.");
      }
    })();
  }, [selectedSupplier, selectedPumpType]);

  // Load comparison data when pump type changes
  useEffect(() => {
    if (!selectedPumpType) return;
    (async () => {
      try {
        const qs = new URLSearchParams({
          pumpType: selectedPumpType,
        }).toString();
        const res = await fetch(`${API_BASE}/home/cost-model-1/comparison?${qs}`);
        if (!res.ok) throw new Error(`/home/cost-model-1/comparison -> ${res.status}`);
        const json = await res.json();
        console.log("Comparison data received:", json.comparisonData); // DEBUG
        setComparisonData(json.comparisonData || []);
      } catch (e) {
        console.error(e);
        setComparisonData([]);
      }
    })();
  }, [selectedPumpType]);

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
          color: item.name.includes('Capital') ? '#3b82f6' :
                 item.name.includes('Cost') || item.name.includes('Maintenance') || item.name.includes('Energy') ? '#ef4444' :
                 item.name === 'Margin' ? '#10b981' :
                 '#f59e0b'
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
            <p className="text-purple-600">Total: ${data.change.toLocaleString()}</p>
          ) : (
            <>
              <p className="text-blue-600">Amount: ${data.change.toLocaleString()}</p>
              <p className="text-gray-600">Running Total: ${data.cumulative.toLocaleString()}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[95vh] flex flex-col p-6 bg-white">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h2 className="text-xl font-semibold mb-4">Cost Model 1 — Pump Cost Waterfall Analysis</h2>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Pump Type comes first */}
          <select
            value={selectedPumpType}
            onChange={(e) => setSelectedPumpType(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="" disabled>
              Select pump type…
            </option>
            {allPumpTypes.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Supplier comes second, filtered by pump type */}
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="" disabled>
              Select supplier…
            </option>
            {filteredSuppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        
        {/* Debug info */}
        <div className="text-xs text-gray-500 mb-2">
          Pump Type: {selectedPumpType} | Suppliers available: {filteredSuppliers.length} | Selected: {selectedSupplier}
        </div>
      </div>

      {/* Charts Container - Full Height */}
      {!selectedSupplier || !selectedPumpType ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Pick a Pump Type and Supplier to see the charts.
        </div>
      ) : (
        <div className="flex-1 flex gap-6">
          {/* Left: Waterfall Chart - 70% */}
          <div className="w-[70%] bg-gray-50 p-4 rounded-lg flex flex-col">
            <h3 className="text-lg font-medium mb-3 flex-shrink-0">
              Cost Breakdown Waterfall: {selectedPumpType} ({selectedSupplier})
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
                      formatter={(v) => `$${v.toLocaleString()}`}
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
                <span>Capital</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500"></div>
                <span>Implementation</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500"></div>
                <span>Operational Costs</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500"></div>
                <span>Margin</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500"></div>
                <span>Totals</span>
              </div>
            </div>
          </div>

          {/* Right: Vertical Comparison Chart - 30% */}
          <div className="w-[30%] bg-gray-50 p-4 rounded-lg flex flex-col">
            <h3 className="text-lg font-medium mb-3 flex-shrink-0">
              Final Cost by Supplier
            </h3>
            <p className="text-sm text-gray-600 mb-3 flex-shrink-0">{selectedPumpType}</p>
            
            <div className="flex-1">
              {comparisonData && comparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={comparisonData} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="supplier" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      fontSize={11}
                    />
                    <YAxis 
                      fontSize={10}
                      domain={[0, 'dataMax + 10000']}
                    />
                    <Tooltip 
                      formatter={(value) => [`$${value?.toLocaleString() || 'N/A'}`, "Final Cost"]}
                    />
                    <Bar 
                      dataKey="finalCost" 
                      fill="#8884d8"
                      minPointSize={2}
                    >
                      <LabelList
                        dataKey="finalCost"
                        position="top"
                        formatter={(v) => v ? `$${Math.round(v).toLocaleString()}` : '$0'}
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
                    {item?.supplier || 'Unknown'}: ${item?.finalCost?.toLocaleString() || 'N/A'}
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
