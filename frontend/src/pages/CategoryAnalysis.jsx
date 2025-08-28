// frontend/src/pages/CategoryAnalysis.jsx
import React, { useState } from "react";
import CategoryMI from "./CategoryMI";
import CostModel2 from "./CostModel2";
import CapitalEquipments from "./CapitalEquipments";

export default function CategoryAnalysis() {
  const [activeTab, setActiveTab] = useState("cost-indices");
  const [selectedCategory, setSelectedCategory] = useState(""); // Shared category state
  const [selectedSubCategory, setSelectedSubCategory] = useState(""); // NEW: Shared sub-category state
  const [selectedRegion, setSelectedRegion] = useState(""); // NEW: Shared region state
  
  return (
    <div className="h-[95vh] flex flex-col bg-white">
      {/* Header with shared category filter and tabs */}
      <div className="flex-shrink-0 p-6 pb-0">
        <h1 className="text-2xl font-semibold mb-4">Category Analysis</h1>
        
        {/* Horizontal Tab Bar */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab("cost-indices")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "cost-indices"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Cost Indices Analysis
          </button>
          <button
            onClick={() => setActiveTab("capital-equipments")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "capital-equipments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Capital Equipments
          </button>
          <button
            onClick={() => setActiveTab("labor-scm")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "labor-scm"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Labor SCM Analysis
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "cost-indices" ? (
          <CategoryMI 
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedSubCategory={selectedSubCategory}
            onSubCategoryChange={setSelectedSubCategory}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        ) : activeTab === "labor-scm" ? (
          <CostModel2 
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedSubCategory={selectedSubCategory}
            onSubCategoryChange={setSelectedSubCategory}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        ) : (
          <CapitalEquipments 
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedSubCategory={selectedSubCategory}
            onSubCategoryChange={setSelectedSubCategory}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        )}
      </div>
    </div>
  );
}
