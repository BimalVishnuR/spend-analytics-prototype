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

// Updated to accept props for shared state
export default function CapitalEquipments({ 
  selectedCategory = "", 
  onCategoryChange = () => {},
  selectedSubCategory = "", 
  onSubCategoryChange = () => {},
  selectedRegion = "", 
  onRegionChange = () => {}
}) {
  const [allCategories, setAllCategories] = useState([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [filteredRegions, setFilteredRegions] = useState([]);
  
  const [waterfallSequence, setWaterfallSequence] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [error, setError] = useState("");

  // Load all options and raw data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/home/capital-equipments/options`);
        if (!res.ok) throw new Error(`/home/capital-equipments/options -> ${res.status}`);
        const json = await res.json();
        
        setAllCategories(json.categories || []);

        // Load raw data for filtering
        const dataRes = await fetch(`${API_BASE}/home/capital-equipments/raw-data`);
        if (dataRes.ok) {
          const rawData = await dataRes.json();
          setAllData(rawData.data || []);
        }

        // Auto-select first category if none selected
        if (json.categories?.length && !selectedCategory && onCategoryChange) {
          onCategoryChange(json.categories[0]);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load options from backend.");
      }
    })();
  }, [selectedCategory, onCategoryChange]);

  // Update filtered options when category changes
  useEffect(() => {
    if (!selectedCategory || !allData.length) return;

    // Filter sub-categories for the selected category
    const categoryData = allData.filter(item => 
      String(item["Category"] ?? "").trim() === String(selectedCategory).trim()
    );

    const subCats = Array.from(
      new Set(categoryData.map(r => String(r["Sub-Category"] ?? r["Sub_Category"] ?? "").trim()).filter(Boolean))
    );

    setFilteredSubCategories(subCats);

    // Auto-select first available sub-category if none selected
    if (subCats.length && !selectedSubCategory) {
      onSubCategoryChange(subCats[0]);
    }

    // Filter regions for the selected category and current sub-category
    const subCategoryData = categoryData.filter(item =>
      String(item["Sub-Category"] ?? item["Sub_Category"] ?? "").trim() === String(selectedSubCategory || subCats[0] || "").trim()
    );

    const regions = Array.from(
      new Set(subCategoryData.map(r => String(r["Region"] ?? "").trim()).filter(Boolean))
    );

    setFilteredRegions(regions);

    // Auto-select first available region if none selected
    if (regions.length && !selectedRegion) {
      onRegionChange(regions[0]);
    }
  }, [selectedCategory, allData, selectedSubCategory, onSubCategoryChange, selectedRegion, onRegionChange]);

  // Update filtered regions when sub-category changes
  useEffect(() => {
    if (!selectedCategory || !selectedSubCategory || !allData.length) return;

    // Filter regions for the selected category and sub-category
    const filteredData = allData.filter(item => 
      String(item["Category"] ?? "").trim() === String(selectedCategory).trim() &&
      String(item["Sub-Category"] ?? item["Sub_Category"] ?? "").trim() === String(selectedSubCategory).trim()
    );

    const regions = Array.from(
      new Set(filteredData.map(r => String(r["Region"] ?? "").trim()).filter(Boolean))
    );

    setFilteredRegions(regions);

    // Auto-select first available region if current selection is not valid
    if (regions.length && !regions.includes(selectedRegion)) {
      onRegionChange(regions[0]);
    }
  }, [selectedSubCategory, selectedCategory, allData, selectedRegion, onRegionChange]);

  // Load waterfall data when all filters change
  useEffect(() => {
    if (!selectedCategory || !selectedSubCategory || !selectedRegion) return;
    (async () => {
      try {
        setError("");
        const qs = new URLSearchParams({
          category: selectedCategory,
          subCategory: selectedSubCategory,
          region: selectedRegion,
        }).toString();
        const res = await fetch(`${API_BASE}/home/capital-equipments/waterfall?${qs}`);
        if (!res.ok) throw new Error(`/home/capital-equipments/waterfall -> ${res.status}`);
        const json = await res.json();
        setWaterfallSequence(json.waterfallSequence || []);
      } catch (e) {
        console.error(e);
        setWaterfallSequence([]);
        setError("Failed to load waterfall data for the selected filters.");
      }
    })();
  }, [selectedCategory, selectedSubCategory, selectedRegion]);

  // Load comparison data when category and sub-category change
  useEffect(() => {
    if (!selectedCategory || !selectedSubCategory) return;
    (async () => {
      try {
        const qs = new URLSearchParams({
          category: selectedCategory,
          subCategory: selectedSubCategory,
        }).toString();
        const res = await fetch(`${API_BASE}/home/capital-equipments/comparison?${qs}`);
        if (!res.ok) throw new Error(`/home/capital-equipments/comparison -> ${res.status}`);
        const json = await res.json();
        setComparisonData(json.comparisonData || []);
      } catch (e) {
        console.error(e);
        setComparisonData([]);
      }
    })();
  }, [selectedCategory, selectedSubCategory]);

  // Waterfall chart data processing (same as before)
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
                 item.name.includes('Engg') || item.name.includes('Design') ? '#f59e0b' :
                 item.name.includes('Logistics') ? '#10b981' :
                 item.name.includes('Installation') ? '#8b5cf6' :
                 item.name.includes('Profit') || item.name.includes('margin') ? '#ef4444' :
                 item.name.includes('O&M') || item.name.includes('Maintenance') || item.name.includes('Energy') || item.name.includes('Downtime') ? '#6b7280' : '#84cc16'
        });
      } else {
        data.push({
          name: item.name,
          base: 0,
          change: item.value,
          cumulative: item.value,
          isMilestone: true,
          color: '#dc2626'
        });
      }
    });

    return data;
  }, [waterfallSequence]);

  // Custom tooltip (same as before)
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow">
          <p className="font-semibold">{label}</p>
          {data.isMilestone ? (
            <p className="text-red-600">Total: {data.change.toLocaleString()} OMR</p>
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
    <div className="h-full flex flex-col px-6 pb-6">
      {/* Error Display */}
      {error && (
        <div className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel: REDESIGNED Filter Panel - 14% */}
        <div className="w-[14%] flex flex-col gap-3 min-h-0">
          {/* Category Filter Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
              <h4 className="text-sm font-semibold text-blue-800">📊 Category</h4>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {allCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category)}
                  className={`w-full text-left p-2 rounded-md text-xs transition-all duration-200 ${
                    selectedCategory === category
                      ? "bg-blue-500 text-white font-medium shadow-sm"
                      : "bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Category Filter Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-green-200 pb-2 mb-3">
              <h4 className="text-sm font-semibold text-green-800">📋 Sub-Category</h4>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {filteredSubCategories.map((subCat) => (
                <button
                  key={subCat}
                  onClick={() => onSubCategoryChange(subCat)}
                  className={`w-full text-left p-2 rounded-md text-xs transition-all duration-200 ${
                    selectedSubCategory === subCat
                      ? "bg-green-500 text-white font-medium shadow-sm"
                      : "bg-green-50 hover:bg-green-100 border border-green-200 text-green-800"
                  }`}
                >
                  {subCat}
                </button>
              ))}
            </div>
          </div>

          {/* Region Filter Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2 mb-3">
              <h4 className="text-sm font-semibold text-purple-800">🌍 Region</h4>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {filteredRegions.map((region) => (
                <button
                  key={region}
                  onClick={() => onRegionChange(region)}
                  className={`w-full text-left p-2 rounded-md text-xs transition-all duration-200 ${
                    selectedRegion === region
                      ? "bg-purple-500 text-white font-medium shadow-sm"
                      : "bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800"
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>

            {/* Status indicator */}
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">
              {waterfallData.length > 0 ? (
                <>
                  ✓ Showing {waterfallData.length} components
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
            Cost Breakdown: {selectedCategory} - {selectedSubCategory} ({selectedRegion})
          </h3>
          
          {!selectedCategory || !selectedSubCategory || !selectedRegion ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select category, sub-category, and region to view waterfall
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
                  
                  <Bar dataKey="base" stackId="stack" fill="transparent" />
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

          {/* Legend */}
          <div className="flex-shrink-0 mt-3 flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500"></div>
              <span>Capital</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500"></div>
              <span>Engineering</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500"></div>
              <span>Logistics</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500"></div>
              <span>Installation</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500"></div>
              <span>Margin</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-500"></div>
              <span>Operations</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-600"></div>
              <span>Totals</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Regional Comparison Only - 30% */}
        <div className="w-[30%] bg-gray-50 p-3 rounded-lg flex flex-col min-h-0">
          <h3 className="text-md font-medium mb-3">
            Regional Comparison
          </h3>
          <p className="text-xs text-gray-600 mb-3">{selectedCategory} - {selectedSubCategory}</p>
          
          <div className="flex-1">
            {comparisonData && comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={comparisonData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="region" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={10}
                  />
                  <YAxis 
                    fontSize={9}
                    domain={[0, 'dataMax + 1000']}
                  />
                  <Tooltip 
                    formatter={(value, name) => [`${value?.toLocaleString() || 'N/A'} OMR`, name]}
                  />
                  <Bar 
                    dataKey="totalCostOfOwnership" 
                    fill="#8884d8"
                    name="Total Cost of Ownership"
                  >
                    <LabelList
                      dataKey="totalCostOfOwnership"
                      position="top"
                      formatter={(v) => v ? `${Math.round(v/1000)}k` : '0'}
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
        </div>
      </div>
    </div>
  );
}
