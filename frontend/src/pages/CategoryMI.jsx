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

export default function CategoryMI() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [seriesData, setSeriesData] = useState([]);
  const [news, setNews] = useState([]);
  const [error, setError] = useState("");

// Load categories
useEffect(() => {
  (async () => {
    try {
      console.log("Fetching categories from:", `${API_BASE}/home/category-mi/categories`);
      const res = await fetch(`${API_BASE}/home/category-mi/categories`);
      console.log("Response status:", res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        throw new Error(`/home/category-mi/categories -> ${res.status}: ${errorText}`);
      }
      
      const json = await res.json();
      console.log("Categories response:", json);
      setCategories(json.categories || []);

      if (json.categories?.length && !selectedCategory) {
        setSelectedCategory(json.categories[0]);
      }
    } catch (e) {
      console.error("Full error:", e);
      setError(`Failed to load categories: ${e.message}`);
    }
  })();
}, []);


  // Load indices data when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    (async () => {
      try {
        setError("");
        const qs = new URLSearchParams({ category: selectedCategory }).toString();
        const res = await fetch(`${API_BASE}/home/category-mi/indices?${qs}`);
        if (!res.ok) throw new Error(`/home/category-mi/indices -> ${res.status}`);
        const json = await res.json();
        console.log("Indices data received:", json.seriesData); // DEBUG
        setSeriesData(json.seriesData || []);
        
        // Reset sub-category selection and auto-select first one
        setSelectedSubCategory("");
        if (json.seriesData?.length) {
          setSelectedSubCategory(json.seriesData[0].subCategory);
        }
      } catch (e) {
        console.error(e);
        setSeriesData([]);
        setError("Failed to load indices data for the selected category.");
      }
    })();
  }, [selectedCategory]);

  // Load news when category changes
  useEffect(() => {
    if (!selectedCategory) return;
    (async () => {
      try {
        const qs = new URLSearchParams({ category: selectedCategory }).toString();
        const res = await fetch(`${API_BASE}/home/category-mi/news?${qs}`);
        if (!res.ok) throw new Error(`/home/category-mi/news -> ${res.status}`);
        const json = await res.json();
        console.log("News data received:", json.news); // DEBUG
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

    // Get all unique years
    const allYears = new Set();
    seriesData.forEach(series => {
      series.data.forEach(point => allYears.add(point.year));
    });
    
    const years = Array.from(allYears).sort((a, b) => a - b);

    // Create combined data points
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

  // Get available sub-categories
  const subCategories = seriesData.map(s => s.subCategory);

  // Custom tooltip for main chart
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

  // Custom tooltip for YoY change chart
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
    <div className="h-[95vh] flex flex-col p-6 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h2 className="text-xl font-semibold mb-2">Category MI — Cost Indices Analysis</h2>

        {error && (
          <div className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-red-800 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel: Category Selector - 20% */}
        <div className="w-[20%] bg-gray-50 p-3 rounded-lg flex flex-col">
          <h3 className="text-md font-medium mb-3">Select Category</h3>
          
          <div className="flex-1 space-y-1 overflow-y-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
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

        {/* Center Panel: Charts - 50% */}
        <div className="w-[50%] bg-gray-50 p-3 rounded-lg flex flex-col min-h-0">
          {/* Main Line Chart */}
          <div className="flex-1 mb-4 min-h-0">
            <h3 className="text-md font-medium mb-2">
              Cost Indices: {selectedCategory}
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

          {/* Sub-Category Selector and YoY Change Chart */}
          {subCategories.length > 0 && (
            <div className="h-44 flex-shrink-0 bg-white p-2 rounded border border-gray-200">
              <div className="mb-3 flex flex-wrap gap-1">
                <span className="text-xs font-medium">Sub-Category:</span>
                {subCategories.map((subCat) => (
                  <button
                    key={subCat}
                    onClick={() => setSelectedSubCategory(subCat)}
                    className={`px-2 py-1 text-xs rounded transition-colors z-10 relative ${
                      selectedSubCategory === subCat
                        ? "bg-green-500 text-white"
                        : "bg-white hover:bg-green-50 border border-gray-300 shadow-sm"
                    }`}
                  >
                    {subCat}
                  </button>
                ))}
              </div>

              <div className="h-32">
                <h4 className="text-xs font-medium mb-1">
                  YoY % Change: {selectedSubCategory}
                </h4>
                <ResponsiveContainer width="100%" height="100%">
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
                          fill={entry.isPositive ? "#ef4444" : "#10b981"} // Red for increase, Green for decrease
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
