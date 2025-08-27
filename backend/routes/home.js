// backend/routes/home.js
import express from 'express';
import { readSheet, numberize } from '../services/xlsxService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: Get absolute path to backend/data file
const getDataPath = (filename) => {
  if (!filename) throw new Error("No filename provided to getDataPath");
  return path.resolve(__dirname, '..', 'data', path.basename(filename));
};

// Helper: clean numeric values (strip %, commas, etc.)
const cleanNumber = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') v = v.replace(/[%,$]/g, '').trim();
  return numberize(v);
};

// ===== Macro endpoint =====
router.get('/macro', async (req, res) => {
  try {
    const filePath = getDataPath('macro_oman.xlsx');
    const macroData = await readSheet(filePath);
    const latest = macroData?.[0] ?? {};

    res.json({
      year: latest['Year'] ?? 2024,
      gdpGrowth: cleanNumber(latest['GDP_Growth_%']),
      inflation: cleanNumber(latest['Inflation_%']),
      oilProductionKbpd: cleanNumber(latest['Oil_Production_kbpd']),
      omrUsd: cleanNumber(latest['OMR_USD']) ?? 0.385,
      fiscalBalance: cleanNumber(latest['Fiscal_Balance_%GDP']),
      brentOmanNote: "Data from macro_oman.xlsx"
    });
  } catch (error) {
    console.error('Error loading macro data:', error);
    res.status(500).json({ error: 'Failed to load macro data', details: error.message });
  }
});

// ===== Commodities endpoint =====
router.get('/commodities', async (req, res) => {
  try {
    const filePath = getDataPath('commodities.xlsx');
    const data = await readSheet(filePath);
    const latest = data?.[0] ?? {};

    const items = [
      { name: 'Brent', value: cleanNumber(latest['Brent_USD_bbl']) },
      { name: 'Oman Crude', value: cleanNumber(latest['Oman_Crude_USD_bbl']) },
      { name: 'NatGas', value: cleanNumber(latest['NatGas_USD_mmbtu']) },
      { name: 'LNG JKM', value: cleanNumber(latest['LNG_JKM_USD_mmbtu']) },
      { name: 'Steel', value: cleanNumber(latest['Steel_USD_ton']) },
      { name: 'Copper', value: cleanNumber(latest['Copper_USD_ton']) },
      { name: 'Baltic Dry Index', value: cleanNumber(latest['Baltic_Dry_Index']) },
    ];

    res.json({ year: latest['Year'] ?? 2024, items });
  } catch (error) {
    console.error('Error loading commodities data:', error);
    res.status(500).json({ error: 'Failed to load commodities data', details: error.message });
  }
});

// ===== Cost Models =====
router.get('/cost-models', async (req, res) => {
  try {
    const valvesFile = getDataPath('cost_model_valves.xlsx');
    const compressorsFile = getDataPath('cost_model_compressors.xlsx');

    let valvesData = [];
    let compressorsData = [];
    try { valvesData = await readSheet(valvesFile); } catch {}
    try { compressorsData = await readSheet(compressorsFile); } catch {}

    const processCostData = (data, type) => {
      const latest = data?.[0] ?? {};
      // Determine top driver (largest cost component)
      const components = { ...latest };
      delete components['Year'];
      delete components['Total_Cost'];
      let topDriverName = null;
      let topDriverValue = null;
      for (const [k, v] of Object.entries(components)) {
        const num = cleanNumber(v);
        if (num !== null && (topDriverValue === null || num > topDriverValue)) {
          topDriverValue = num;
          topDriverName = k;
        }
      }

      return {
        year: latest['Year'] ?? 2024,
        total: cleanNumber(latest['Total_Cost']),
        topDriver: topDriverName ? { name: topDriverName, value: topDriverValue, arrow: '→', change: null } : null
      };
    };

    res.json({
      valves: processCostData(valvesData, 'Valves'),
      compressors: processCostData(compressorsData, 'Compressors'),
    });
  } catch (error) {
    console.error('Error loading cost models data:', error);
    res.status(500).json({ error: 'Failed to load cost models data', details: error.message });
  }
});

// ===== Cost Model 1 (Pump Types) - UPDATED =====

// 1) Options for filters (unique Suppliers & Pump Types)
router.get("/cost-model-1/options", async (req, res) => {
  try {
    const filePath = getDataPath("cost_model_1.xlsx");
    const rows = await readSheet(filePath);

    const suppliers = Array.from(
      new Set((rows || []).map(r => String(r["Supplier"] ?? "").trim()).filter(Boolean))
    );
    const pumpTypes = Array.from(
      new Set((rows || []).map(r => String(r["Pump Type"] ?? "").trim()).filter(Boolean))
    );

    res.json({ suppliers, pumpTypes });
  } catch (error) {
    console.error("Error loading cost model 1 options:", error);
    res.status(500).json({ error: "Failed to load options", details: error.message });
  }
});

// 2) Waterfall data for specific Supplier + Pump Type
router.get("/cost-model-1/waterfall", async (req, res) => {
  try {
    const filePath = getDataPath("cost_model_1.xlsx");
    const rows = await readSheet(filePath);

    const { supplier, pumpType } = req.query;
    if (!supplier || !pumpType) {
      return res.status(400).json({ error: "Please provide supplier and pumpType query params" });
    }

    // Find the row
    const match = rows.find(
      r => (String(r["Supplier"] ?? "").trim() === String(supplier).trim()) &&
           (String(r["Pump Type"] ?? "").trim() === String(pumpType).trim())
    );

    if (!match) {
      return res.status(404).json({ error: "No data found for selection" });
    }

    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "string") v = v.replace(/[%,$\s]/g, '').replace(/−/g, '-');
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // Build waterfall in correct order
    const waterfallSequence = [
      // Individual components first
      { name: "Capital Cost", value: toNum(match["Capital Cost"]), type: "component" },
      { name: "Engg & Design", value: toNum(match["Engg & Design"]), type: "component" },
      { name: "Logistics to Oman", value: toNum(match["Logistics to Oman"]), type: "component" },
      { name: "Installation", value: toNum(match["Installation"]), type: "component" },
      { name: "Training", value: toNum(match["Training"]), type: "component" },
      { name: "Digital Integration", value: toNum(match["Digital Integration"]), type: "component" },
      { name: "Maintenance (5 yrs)", value: toNum(match["Maintenance (5 yrs)"]), type: "component" },
      { name: "Downtime Cost", value: toNum(match["Downtime Cost"]), type: "component" },
      { name: "Energy Cost (5 yrs)", value: toNum(match["Energy Cost (5 yrs)"]), type: "component" },
      
      // First milestone - Base Lifecycle Cost
      { name: "Base Lifecycle Cost", value: toNum(match["Base Lifecycle Cost"]), type: "milestone" },
      
      // Continue with margin
      { name: "Margin", value: toNum(match["Margin"]), type: "component" },
      
      // Final milestone
      { name: "Lifecycle cost including margin", value: toNum(match["Lifecycle cost including margin"]), type: "milestone" }
    ];

    res.json({
      supplier,
      pumpType,
      waterfallSequence
    });
  } catch (error) {
    console.error("Error loading cost model 1 waterfall data:", error);
    res.status(500).json({ error: "Failed to load waterfall data", details: error.message });
  }
});

// 3) Comparison data for all suppliers of a specific pump type
router.get("/cost-model-1/comparison", async (req, res) => {
  try {
    const filePath = getDataPath("cost_model_1.xlsx");
    const rows = await readSheet(filePath);

    const { pumpType } = req.query;
    if (!pumpType) {
      return res.status(400).json({ error: "Please provide pumpType query param" });
    }

    // Find all rows for this pump type
    const matches = rows.filter(
      r => String(r["Pump Type"] ?? "").trim() === String(pumpType).trim()
    );

    if (!matches.length) {
      return res.status(404).json({ error: "No data found for pump type" });
    }

    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "string") v = v.replace(/[%,$\s]/g, '').replace(/−/g, '-');
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const comparisonData = matches.map(match => ({
      supplier: match["Supplier"],
      baseLifecycleCost: toNum(match["Base Lifecycle Cost"]),
      margin: toNum(match["Margin"]),
      finalCost: toNum(match["Lifecycle cost including margin"])
    }));

    res.json({
      pumpType,
      comparisonData
    });
  } catch (error) {
    console.error("Error loading cost model 1 comparison data:", error);
    res.status(500).json({ error: "Failed to load comparison data", details: error.message });
  }
});

// 4) Get raw data for client-side filtering
router.get("/cost-model-1/raw-data", async (req, res) => {
  try {
    const filePath = getDataPath("cost_model_1.xlsx");
    const rows = await readSheet(filePath);

    res.json({
      data: rows || []
    });
  } catch (error) {
    console.error("Error loading cost model 1 raw data:", error);
    res.status(500).json({ error: "Failed to load raw data", details: error.message });
  }
});


// ===== Cost Model 2 (Labor SCM) =====

// 1) Options for filters (unique Job Titles & Origins)
router.get("/cost-model-2/options", async (req, res) => {
  try {
    const filePath = getDataPath("Labor_scm.xlsx");
    const rows = await readSheet(filePath);

    const jobTitles = Array.from(
      new Set((rows || []).map(r => String(r["Job Title"] ?? "").trim()).filter(Boolean))
    );
    const origins = Array.from(
      new Set((rows || []).map(r => String(r["Origin"] ?? "").trim()).filter(Boolean))
    );

    res.json({ jobTitles, origins });
  } catch (error) {
    console.error("Error loading cost model 2 options:", error);
    res.status(500).json({ error: "Failed to load options", details: error.message });
  }
});

// 2) Waterfall data for specific Job Title + Origin
router.get("/cost-model-2/waterfall", async (req, res) => {
  try {
    const filePath = getDataPath("Labor_scm.xlsx");
    const rows = await readSheet(filePath);

    const { jobTitle, origin } = req.query;
    if (!jobTitle || !origin) {
      return res.status(400).json({ error: "Please provide jobTitle and origin query params" });
    }

    // Find the row
    const match = rows.find(
      r => (String(r["Job Title"] ?? "").trim() === String(jobTitle).trim()) &&
           (String(r["Origin"] ?? "").trim() === String(origin).trim())
    );

    if (!match) {
      return res.status(404).json({ error: "No data found for selection" });
    }

    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "string") v = v.replace(/[%,$\s]/g, '').replace(/−/g, '-');
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // Build waterfall in correct order
    const waterfallSequence = [
      // Individual components first
      { name: "Base Salary (OMR)", value: toNum(match["Base Salary (OMR)"]), type: "component" },
      { name: "Housing Allowance", value: toNum(match["Housing Allowance"]), type: "component" },
      { name: "Transport Allowance", value: toNum(match["Transport Allowance"]), type: "component" },
      { name: "Other Allowances", value: toNum(match["Other Allowances"]), type: "component" },
      
      // First milestone - Gross Cash
      { name: "Gross Cash (OMR)", value: toNum(match["Gross Cash (OMR)"]), type: "milestone" },
      
      // Continue with remaining components
      { name: "EOS Accrual", value: toNum(match["EOS Accrual"]), type: "component" },
      { name: "Social Insurance", value: toNum(match["Social Insurance"]), type: "component" },
      { name: "Work Injury Insurance", value: toNum(match["Work Injury Insurance"]), type: "component" },
      { name: "Visa/Permit", value: toNum(match["Visa/Permit"]), type: "component" },
      { name: "Flights (Monthly)", value: toNum(match["Flights (Monthly)"]), type: "component" },
      { name: "Medical Insurance", value: toNum(match["Medical Insurance"]), type: "component" },
      
      // Final milestones
      { name: "Total Cost Before Overhead", value: toNum(match["Total Cost Before Overhead"]), type: "milestone" },
      { name: "With Overhead (15%)", value: toNum(match["With Overhead (15%)"]), type: "milestone" },
      { name: "Final Rate incl. Margin (10%)", value: toNum(match["Final Rate incl. Margin (10%)"]), type: "milestone" }
    ];

    res.json({
      jobTitle,
      origin,
      waterfallSequence
    });
  } catch (error) {
    console.error("Error loading cost model 2 waterfall data:", error);
    res.status(500).json({ error: "Failed to load waterfall data", details: error.message });
  }
});


// 3) Comparison data for all origins of a specific job title
router.get("/cost-model-2/comparison", async (req, res) => {
  try {
    const filePath = getDataPath("Labor_scm.xlsx");
    const rows = await readSheet(filePath);

    const { jobTitle } = req.query;
    if (!jobTitle) {
      return res.status(400).json({ error: "Please provide jobTitle query param" });
    }

    // Find all rows for this job title
    const matches = rows.filter(
      r => String(r["Job Title"] ?? "").trim() === String(jobTitle).trim()
    );

    if (!matches.length) {
      return res.status(404).json({ error: "No data found for job title" });
    }

    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "string") v = v.replace(/[%,$\s]/g, '').replace(/−/g, '-');
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const comparisonData = matches.map(match => ({
      origin: match["Origin"],
      grossCash: toNum(match["Gross Cash (OMR)"]),
      totalCostBeforeOverhead: toNum(match["Total Cost Before Overhead"]),
      withOverhead: toNum(match["With Overhead (15%)"]),
      finalRate: toNum(match["Final Rate incl. Margin (10%)"])
    }));

    res.json({
      jobTitle,
      comparisonData
    });
  } catch (error) {
    console.error("Error loading cost model 2 comparison data:", error);
    res.status(500).json({ error: "Failed to load comparison data", details: error.message });
  }
});

// ===== Category MI (Cost Indices) =====

// 1) Get all unique categories
router.get("/category-mi/categories", async (req, res) => {
  try {
    const filePath = getDataPath("Oman_cost_Indices.xlsx");
    const rows = await readSheet(filePath);

    const categories = Array.from(
      new Set((rows || []).map(r => String(r["Category"] ?? "").trim()).filter(Boolean))
    );

    res.json({ categories });
  } catch (error) {
    console.error("Error loading category MI categories:", error);
    res.status(500).json({ error: "Failed to load categories", details: error.message });
  }
});

// 2) Get time series data for a specific category
router.get("/category-mi/indices", async (req, res) => {
  try {
    const filePath = getDataPath("Oman_cost_Indices.xlsx");
    const rows = await readSheet(filePath);

    const { category } = req.query;
    if (!category) {
      return res.status(400).json({ error: "Please provide category query param" });
    }

    // Find all rows for this category
    const matches = rows.filter(
      r => String(r["Category"] ?? "").trim() === String(category).trim()
    );

    if (!matches.length) {
      return res.status(404).json({ error: "No data found for category" });
    }

    const toNum = (v) => {
      if (v === null || v === undefined) return null;
      if (typeof v === "string") v = v.replace(/[%,$\s]/g, '').replace(/−/g, '-');
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // Years from 2020 to 2030
    const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];
    
    // Process each sub-category
    const seriesData = matches.map(match => {
      const subCategory = match["Sub_Category"];
      const yearlyData = years.map(year => ({
        year: parseInt(year),
        value: toNum(match[year]),
        isHistorical: parseInt(year) <= 2024,
        isPrediction: parseInt(year) >= 2025
      })).filter(d => d.value !== null);

      return {
        subCategory,
        data: yearlyData
      };
    });

    res.json({
      category,
      seriesData
    });
  } catch (error) {
    console.error("Error loading category MI indices:", error);
    res.status(500).json({ error: "Failed to load indices data", details: error.message });
  }
});

// 3) Get news for a specific category
router.get("/category-mi/news", async (req, res) => {
  try {
    const filePath = getDataPath("Oman_category_news.xlsx");
    const rows = await readSheet(filePath);

    const { category } = req.query;
    if (!category) {
      return res.status(400).json({ error: "Please provide category query param" });
    }

    // Find all news for this category
    const matches = rows.filter(
      r => String(r["Category"] ?? "").trim() === String(category).trim()
    );

    const newsData = matches.map(match => ({
      headline: match["Headline"] || "No headline available",
      url: match["URL"] || "#"
    }));

    res.json({
      category,
      news: newsData
    });
  } catch (error) {
    console.error("Error loading category MI news:", error);
    res.status(500).json({ error: "Failed to load news data", details: error.message });
  }
});

// ===== Capital Equipments Cost Model =====

// 1) Get all unique categories, sub-categories, and regions
router.get("/capital-equipments/options", async (req, res) => {
  try {
    const filePath = getDataPath("Cap_g_cost_model.xlsx");
    const rows = await readSheet(filePath);

    const categories = Array.from(
      new Set((rows || []).map(r => String(r["Category"] ?? "").trim()).filter(Boolean))
    );
    const subCategories = Array.from(
      new Set((rows || []).map(r => String(r["Sub-Category"] ?? r["Sub_Category"] ?? "").trim()).filter(Boolean))
    );
    const regions = Array.from(
      new Set((rows || []).map(r => String(r["Region"] ?? "").trim()).filter(Boolean))
    );

    res.json({ categories, subCategories, regions });
  } catch (error) {
    console.error("Error loading capital equipments options:", error);
    res.status(500).json({ error: "Failed to load options", details: error.message });
  }
});

// 2) Waterfall data for specific Category + Sub-Category + Region
router.get("/capital-equipments/waterfall", async (req, res) => {
  try {
    const filePath = getDataPath("Cap_g_cost_model.xlsx");
    const rows = await readSheet(filePath);

    const { category, subCategory, region } = req.query;
    if (!category || !subCategory || !region) {
      return res.status(400).json({ error: "Please provide category, subCategory, and region query params" });
    }

    // Find the row
    const match = rows.find(
      r => (String(r["Category"] ?? "").trim() === String(category).trim()) &&
           (String(r["Sub-Category"] ?? r["Sub_Category"] ?? "").trim() === String(subCategory).trim()) &&
           (String(r["Region"] ?? "").trim() === String(region).trim())
    );

    if (!match) {
      return res.status(404).json({ error: "No data found for selection" });
    }

    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "string") v = v.replace(/[%,$\s]/g, '').replace(/−/g, '-');
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    // Build waterfall in correct order
    const waterfallSequence = [
      // Individual components first
      { name: "Capital Cost (OMR)", value: toNum(match["Capital Cost (OMR)"]), type: "component" },
      { name: "Engg & Design (OMR)", value: toNum(match["Engg & Design (OMR)"]), type: "component" },
      { name: "Logistics (OMR)", value: toNum(match["Logistics (OMR)"]), type: "component" },
      { name: "Installation / Onsite (OMR)", value: toNum(match["Installation / Onsite (OMR)"]), type: "component" },
      { name: "Profit margin", value: toNum(match["Profit margin"]), type: "component" },
      
      // First milestone - Total Acquisition Cost
      { name: "Total Acquisition Cost", value: toNum(match["Total Acquisition Cost"]), type: "milestone" },
      
      // Continue with O&M
      { name: "O&M (Lifecycle, OMR)", value: toNum(match["O&M (Lifecycle, OMR)"]), type: "component" },
      
      // Final milestone
      { name: "Total Cost of Ownership", value: toNum(match["Total Cost of Ownership"]), type: "milestone" }
    ];

    res.json({
      category,
      subCategory,
      region,
      waterfallSequence
    });
  } catch (error) {
    console.error("Error loading capital equipments waterfall data:", error);
    res.status(500).json({ error: "Failed to load waterfall data", details: error.message });
  }
});

// 3) Comparison data for all regions of a specific category + sub-category
router.get("/capital-equipments/comparison", async (req, res) => {
  try {
    const filePath = getDataPath("Cap_g_cost_model.xlsx");
    const rows = await readSheet(filePath);

    const { category, subCategory } = req.query;
    if (!category || !subCategory) {
      return res.status(400).json({ error: "Please provide category and subCategory query params" });
    }

    // Find all rows for this category + sub-category combination
    const matches = rows.filter(
      r => (String(r["Category"] ?? "").trim() === String(category).trim()) &&
           (String(r["Sub-Category"] ?? r["Sub_Category"] ?? "").trim() === String(subCategory).trim())
    );

    if (!matches.length) {
      return res.status(404).json({ error: "No data found for category and sub-category" });
    }

    const toNum = (v) => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "string") v = v.replace(/[%,$\s]/g, '').replace(/−/g, '-');
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const comparisonData = matches.map(match => ({
      region: match["Region"],
      totalAcquisitionCost: toNum(match["Total Acquisition Cost"]),
      totalCostOfOwnership: toNum(match["Total Cost of Ownership"]),
      capitalCost: toNum(match["Capital Cost (OMR)"]),
      omCost: toNum(match["O&M (Lifecycle, OMR)"])
    }));

    res.json({
      category,
      subCategory,
      comparisonData
    });
  } catch (error) {
    console.error("Error loading capital equipments comparison data:", error);
    res.status(500).json({ error: "Failed to load comparison data", details: error.message });
  }
});
// Add this new endpoint after the existing capital-equipments endpoints

// 4) Get raw data for client-side filtering
router.get("/capital-equipments/raw-data", async (req, res) => {
  try {
    const filePath = getDataPath("Cap_g_cost_model.xlsx");
    const rows = await readSheet(filePath);

    res.json({
      data: rows || []
    });
  } catch (error) {
    console.error("Error loading capital equipments raw data:", error);
    res.status(500).json({ error: "Failed to load raw data", details: error.message });
  }
});


// ===== AI Insights =====
router.get('/ai-insights', async (req, res) => {
  try {
    const filePath = getDataPath('ai_insights.xlsx');
    const data = await readSheet(filePath);
    const latest = data?.[0] ?? {};

    const insights = [];
    for (let i = 1; i <= 3; i++) {
      const val = latest[`Insight_${i}`];
      if (val) insights.push(val);
    }

    res.json({
      date: latest['Date'] ?? new Date().toISOString().split('T')[0],
      insights: insights.length ? insights : ["No insights available"],
    });
  } catch (error) {
    console.error('Error loading AI insights data:', error);
    res.status(500).json({ error: 'Failed to load AI insights data', details: error.message });
  }
});

// ===== Trade partners =====
router.get('/trade', async (req, res) => {
  try {
    const filePath = getDataPath('trade_partners.xlsx');
    const data = await readSheet(filePath);

    const partners = (data ?? []).map(r => ({
      partner: r['Partner'] ?? r['Country'] ?? 'Unknown',
      exports: cleanNumber(r['Exports_USD_million']),
      imports: cleanNumber(r['Imports_USD_million']),
    }));

    res.json({ year: data?.[0]?.Year ?? 2024, partners: partners.slice(0, 10) });
  } catch (error) {
    console.error('Error loading trade data:', error);
    res.status(500).json({ error: 'Failed to load trade data', details: error.message });
  }
});

// ===== News (static) =====
router.get('/news', (req, res) => {
  res.json({
    headlines: [
      "Oman announces $2B investment in renewable energy projects",
      "New LNG terminal construction begins in Sohar port",
      "Digital transformation initiatives boost operational efficiency",
      "Strategic partnership with Asian markets strengthens trade relations"
    ]
  });
});

export default router;
