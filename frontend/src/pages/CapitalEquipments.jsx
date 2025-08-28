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

// Updated to accept props for shared category state
export default function CapitalEquipments({ 
  selectedCategory = "", 
  onCategoryChange = () => {} 
}) {
  const [allCategories, setAllCategories] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  
  // Filtered options based on selected category and sub-category
  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [filteredRegions, setFilteredRegions] = useState([]);
  
  // Selected values (category comes from props)
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  
  const [waterfallSequence, setWaterfallSequence] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [allData, setAllData] = useState([]); // Store all raw data for filtering
  const [error, setError] = useState("");

  // Load all options and raw data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/home/capital-equipments/options`);
        if (!res.ok) throw new Error(`/home/capital-equipments/options -> ${res.status}`);
        const json = await res.json();
        
        setAllCategories(json.categories || []);
        setAllSubCategories(json.subCategories || []);
        setAllRegions(json.regions || []);

        // Load raw data for filtering
        const dataRes = await fetch(`${API_BASE}/home/capital-equipments/raw-data`);
        if (dataRes.ok) {
          const rawData = await dataRes.json();
          setAllData(rawData.data || []);
        }

        // Use prop function instead of local state
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

    console.log("Category changed to:", selectedCategory); // DEBUG

    // Filter sub-categories for the selected category
    const categoryData = allData.filter(item => 
      String(item["Category"] ?? "").trim() === String(selectedCategory).trim()
    );

    const subCats = Array.from(
      new Set(categoryData.map(r => String(r["Sub-Category"] ?? r["Sub_Category"] ?? "").trim()).filter(Boolean))
    );

    setFilteredSubCategories(subCats);

    // Auto-select first available sub-category
    const firstSubCategory = subCats[0] || "";
    setSelectedSubCategory(firstSubCategory);

    // Filter regions for the selected category and first sub-category
    const firstSubCategoryData = categoryData.filter(item =>
      String(item["Sub-Category"] ?? item["Sub_Category"] ?? "").trim() === String(firstSubCategory).trim()
    );

    const regions = Array.from(
      new Set(firstSubCategoryData.map(r => String(r["Region"] ?? "").trim()).filter(Boolean))
    );

    setFilteredRegions(regions);

    // Auto-select first available region
    setSelectedRegion(regions[0] || "");

    console.log("Filtered subcategories:", subCats); // DEBUG
    console.log("Filtered regions:", regions); // DEBUG
  }, [selectedCategory, allData]);

  // Update filtered regions when sub-category changes
  useEffect(() => {
    if (!selectedCategory || !selectedSubCategory || !allData.length) return;

    console.log("Sub-category changed to:", selectedSubCategory); // DEBUG

    // Filter regions for the selected category and sub-category
    const filteredData = allData.filter(item => 
      String(item["Category"] ?? "").trim() === String(selectedCategory).trim() &&
      String(item["Sub-Category"] ?? item["Sub_Category"] ?? "").trim() === String(selectedSubCategory).trim()
    );

    const regions = Array.from(
      new Set(filteredData.map(r => String(r["Region"] ?? "").trim()).filter(Boolean))
    );

    setFilteredRegions(regions);

    // Auto-select first available region
    setSelectedRegion(regions[0] || "");

    console.log("Filtered regions for subcategory:", regions); // DEBUG
  }, [selectedSubCategory, selectedCategory, allData]);

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
        console.log("Waterfall data received:", json.waterfallSequence); // DEBUG
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
        console.log("Comparison data received:", json.comparisonData); // DEBUG
        setComparisonData(json.comparisonData || []);
      } catch (e) {
        console.error(e);
        setComparisonData([]);
      }
    })();
  }, [selectedCategory, selectedSubCategory]);

  // True waterfall chart data - No additional filtering needed since backend already filters
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
        // Milestone - show as full bar
        data.push({
          name: item.name,
          base: 0,
          change: item.value,
          cumulative: item.value,
          isMilestone: true,
          color: '#dc2626' // Red for milestones
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
        {/* Left Panel: Category Selector - 14% */}
        <div className="w-[14%] bg-gray-50 p-3 rounded-lg flex flex-col">
          <h3 className="text-md font-medium mb-3">Select Category</h3>
          
          <div className="flex-1 space-y-1 overflow-y-auto">
            {allCategories.map((category) => (
              <button
                key={category}
                onClick={() => onCategoryChange(category)} // Use prop function
                className={`w-full text-left p-2 rounded text-xs transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-500 text-white font-medium"
                    : "bg-white hover:bg-blue-50 border border-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
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

        {/* Right Panel: Filters + Regional Comparison - 30% */}
        <div className="w-[30%] flex flex-col gap-4 min-h-0">
          {/* MOVED: Better looking filters section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Filters</h3>
            
            <div className="space-y-3">
              {/* Sub-Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sub-Category
                </label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={!filteredSubCategories.length}
                >
                  <option value="" disabled>
                    Select sub-category...
                  </option>
                  {filteredSubCategories.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={!filteredRegions.length}
                >
                  <option value="" disabled>
                    Select region...
                  </option>
                  {filteredRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status indicator */}
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                {waterfallData.length > 0 ? (
                  <>
                    ✓ Showing {waterfallData.length} cost components
                    <br />
                    <span className="text-gray-400">(Zero-value items hidden)</span>
                  </>
                ) : (
                  <span className="text-amber-600">⚠ No data available</span>
                )}
              </div>
            </div>
          </div>

          {/* Regional Comparison Chart */}
          <div className="flex-1 bg-gray-50 p-3 rounded-lg flex flex-col min-h-0">
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

            {/* Raw data for debugging */}
            <div className="text-xs text-gray-500 mt-2 max-h-20 overflow-auto flex-shrink-0">
              {comparisonData && comparisonData.length > 0 ? (
                comparisonData.map((item, idx) => (
                  <div key={idx}>
                    {item?.region || 'Unknown'}: {item?.totalCostOfOwnership?.toLocaleString() || 'N/A'} OMR
                  </div>
                ))
              ) : (
                <div>No data to display</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
