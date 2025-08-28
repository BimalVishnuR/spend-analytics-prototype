import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5001";

// Better color palette with more distinct colors
const COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
];

// Updated to accept props for shared state
export default function CategoryMI({ 
  selectedCategory, 
  onCategoryChange,
  selectedSubCategory, 
  onSubCategoryChange,
  selectedRegion, 
  onRegionChange 
}) {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [regions, setRegions] = useState([]);
  const [seriesData, setSeriesData] = useState([]);
  const [news, setNews] = useState([]);
  const [error, setError] = useState("");

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/home/category-mi/categories`);
        if (!res.ok) throw new Error(`/home/category-mi/categories -> ${res.status}`);
        const json = await res.json();
        setCategories(json.categories || []);

        // Auto-select first category if none selected
        if (json.categories?.length && !selectedCategory) {
          onCategoryChange(json.categories[0]);
        }
      } catch (e) {
        console.error("Error loading categories:", e);
        setError(`Failed to load categories: ${e.message}`);
      }
    })();
  }, [selectedCategory, onCategoryChange]);

  // Load sub-categories and regions when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    (async () => {
      try {
        const qs = new URLSearchParams({ category: selectedCategory }).toString();
        const res = await fetch(`${API_BASE}/home/category-mi/indices?${qs}`);
        if (!res.ok) throw new Error(`/home/category-mi/indices -> ${res.status}`);
        const json = await res.json();
        
        setSeriesData(json.seriesData || []);
        
        // Extract sub-categories
        const subCats = json.seriesData?.map(s => s.subCategory) || [];
        setSubCategories(subCats);
        
        // For CategoryMI, regions can be mock data or from a separate endpoint
        const mockRegions = ["Global", "Middle East", "Asia Pacific", "Europe", "North America"];
        setRegions(mockRegions);
        
        // Auto-select first sub-category if none selected
        if (subCats.length && !selectedSubCategory) {
          onSubCategoryChange(subCats[0]);
        }
        
        // Auto-select first region if none selected
        if (mockRegions.length && !selectedRegion) {
          onRegionChange(mockRegions[0]);
        }
      } catch (e) {
        console.error(e);
        setSeriesData([]);
        setError("Failed to load indices data for the selected category.");
      }
    })();
  }, [selectedCategory, selectedSubCategory, onSubCategoryChange, selectedRegion, onRegionChange]);

  // Load news when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    (async () => {
      try {
        const qs = new URLSearchParams({ category: selectedCategory }).toString();
        const res = await fetch(`${API_BASE}/home/category-mi/news?${qs}`);
        if (!res.ok) throw new Error(`/home/category-mi/news -> ${res.status}`);
        const json = await res.json();
        setNews(json.news || []);
      } catch (e) {
        console.error(e);
        setNews([]);
      }
    })();
  }, [selectedCategory]);

  // Prepare main line chart data (shows all sub-categories)
  const mainChartData = React.useMemo(() => {
    if (!seriesData.length) return [];

    const allYears = new Set();
    seriesData.forEach(series => {
      series.data.forEach(point => allYears.add(point.year));
    });
    
    const years = Array.from(allYears).sort((a, b) => a - b);

    return years.map(year => {
      const dataPoint = { 
        year, 
        isHistorical: year <= 2024,
        isPrediction: year >= 2025 
      };
      
      seriesData.forEach(series => {
        const point = series.data.find(d => d.year === year);
        dataPoint[series.subCategory] = point ? point.value : null;
      });
      
      return dataPoint;
    });
  }, [seriesData]);

  // Prepare YoY change chart data (shows only selected sub-category)
  const yoyChangeData = React.useMemo(() => {
    if (!selectedSubCategory || !seriesData.length) return [];

    const selectedSeries = seriesData.find(s => s.subCategory === selectedSubCategory);
    if (!selectedSeries) return [];

    const changeData = [];
    for (let i = 1; i < selectedSeries.data.length; i++) {
      const currentYear = selectedSeries.data[i];
      const previousYear = selectedSeries.data[i - 1];
      
      if (currentYear.value && previousYear.value) {
        const yoyChange = ((currentYear.value - previousYear.value) / previousYear.value) * 100;
        changeData.push({
          year: currentYear.year,
          change: yoyChange,
          isPositive: yoyChange >= 0,
          isHistorical: currentYear.year <= 2024,
          isPrediction: currentYear.year >= 2025,
          currentValue: currentYear.value,
          previousValue: previousYear.value
        });
      }
    }

    return changeData;
  }, [selectedSubCategory, seriesData]);

  // Custom tooltips (same as before)
  const MainCustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const isHistorical = label <= 2024;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow">
          <p className="font-semibold">
            {label} {isHistorical ? "(Historical)" : "(Prediction)"}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value?.toFixed(1) || 'N/A'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const YoYTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isHistorical = label <= 2024;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow">
          <p className="font-semibold">
            {label} {isHistorical ? "(Historical)" : "(Prediction)"}
          </p>
          <p style={{ color: payload[0].color }}>
            YoY Change: {data.change?.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600">
            From {data.previousValue?.toFixed(1)} to {data.currentValue?.toFixed(1)}
          </p>
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
        {/* Left Panel: REDESIGNED Filter Panel - 14% */}
        <div className="w-[14%] flex flex-col gap-3 min-h-0">
          {/* Category Filter Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
              <h4 className="text-sm font-semibold text-blue-800">📊 Category</h4>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
              {categories.map((category) => (
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
              {subCategories.map((subCat) => (
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
              {regions.map((region) => (
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
          </div>
        </div>

        {/* Center Panel: Charts - 56% */}
        <div className="w-[56%] bg-gray-50 p-3 rounded-lg flex flex-col min-h-0">
          {/* Main Line Chart */}
          <div className="flex-1 mb-4 min-h-0">
            <h3 className="text-md font-medium mb-2">
              Cost Indices: {selectedCategory} - {selectedSubCategory} ({selectedRegion})
            </h3>
            
            {!selectedCategory ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a category to view indices
              </div>
            ) : (
              <div className="h-full max-h-[calc(100%-2rem)]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mainChartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="year" 
                      tickFormatter={(value) => value.toString()}
                      fontSize={10}
                    />
                    <YAxis 
                      fontSize={10}
                      label={{ value: 'Index', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }}
                    />
                    <Tooltip content={<MainCustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    
                    {/* Render lines for each sub-category */}
                    {seriesData.map((series, index) => (
                      <Line
                        key={series.subCategory}
                        type="monotone"
                        dataKey={series.subCategory}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[index % COLORS.length], r: 2 }}
                        activeDot={{ r: 4 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* YoY Change Chart */}
          {selectedSubCategory && (
            <div className="h-44 flex-shrink-0 bg-white p-2 rounded border border-gray-200">
              <div className="h-full">
                <h4 className="text-xs font-medium mb-1">
                  YoY % Change: {selectedSubCategory}
                </h4>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={yoyChangeData} margin={{ top: 5, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="year" 
                      tickFormatter={(value) => value.toString()}
                      fontSize={9}
                    />
                    <YAxis 
                      fontSize={9}
                      label={{ value: '%', angle: 0, position: 'insideLeft' }}
                    />
                    <Tooltip content={<YoYTooltip />} />
                    <Bar dataKey="change">
                      {yoyChangeData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isPositive ? "#ef4444" : "#10b981"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: News - 30% */}
        <div className="w-[30%] bg-gray-50 p-3 rounded-lg flex flex-col min-h-0">
          <h3 className="text-md font-medium mb-3">Related News</h3>
          
          <div className="flex-1 space-y-2 overflow-y-auto">
            {news.length > 0 ? (
              news.map((article, index) => (
                <a
                  key={index}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2 bg-white rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="text-blue-600 hover:text-blue-800 text-xs font-medium line-clamp-3">
                    {article.headline}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Click to read ↗
                  </div>
                </a>
              ))
            ) : (
              <div className="text-gray-500 text-xs">No news available</div>
            )}
          </div>

          {/* Compact Legend */}
          <div className="flex-shrink-0 mt-3 pt-2 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-blue-500"></div>
                <span>Historical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-red-500"></div>
                <span>Prediction</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500"></div>
                <span>Increase</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500"></div>
                <span>Decrease</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
