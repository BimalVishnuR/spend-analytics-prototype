import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser"; // ✅ static import
import { readSheet, latestByField, numberize } from "./services/xlsxService.js";
import { loadCSV, toNumber } from "./services/dataService.js";
import homeRoutes from "./routes/home.js";




const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use("/home", homeRoutes);

const upload = multer({ dest: "uploads/" });

// --- Health ---
app.get("/", (req, res) => {
  res.send("Backend is running! 🚀 Use POST /upload to upload files.");
});

// --- Upload (fixed) ---
app.post("/upload", upload.single("file"), (req, res) => {
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      res.json({
        message: "File uploaded and parsed successfully!",
        preview: results.slice(0, 10),
      });
    })
    .on("error", (err) => {
      console.error(err);
      res.status(500).json({ message: "Parse failed." });
    });
});

// --- Market: Brent vs LNG (CSV) ---
app.get("/market/brent-lng", async (req, res) => {
  try {
    const rows = await loadCSV("brent_lng_30d.csv");
    const clean = rows.map((r) => ({
      date: r.date,
      brent: toNumber(r.brent),
      lng: toNumber(r.lng),
    }));
    res.json(clean);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load brent_lng_30d.csv" });
  }
});

// --- Oman indices (CSV) ---
app.get("/indices/oman", async (req, res) => {
  try {
    const rows = await loadCSV("oman_indices.csv");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load oman_indices.csv" });
  }
});

// --- Benchmarks (CSV) ---
app.get("/benchmarks", async (req, res) => {
  try {
    const rows = await loadCSV("benchmarks.csv");
    const clean = rows.map((r) => ({
      category: r.category,
      Oman: toNumber(r.Oman),
      GCC: toNumber(r.GCC || r.UAE),
      India: toNumber(r.India),
    }));
    res.json(clean);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load benchmarks.csv" });
  }
});

// --- Suppliers (CSV) ---
app.get("/suppliers", async (req, res) => {
  try {
    const rows = await loadCSV("suppliers_oman.csv");
    const clean = rows.map((r) => ({
      name: r.name,
      city: r.city,
      type: r.type,
      icv: toNumber(r.icv),
    }));
    res.json(clean);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load suppliers_oman.csv" });
  }
});

// --- Reports (CSV) ---
app.get("/reports", async (req, res) => {
  try {
    const rows = await loadCSV("reports.csv");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load reports.csv" });
  }
});

// --- Spend demo: aggregate by Category ---
app.get("/spend/demo", async (req, res) => {
  try {
    const rows = await loadCSV("spend_demo.csv");
    const totals = {};
    let grand = 0;
    for (const r of rows) {
      const amt = toNumber(r.Amount);
      grand += amt;
      const cat = r.Category || "Other";
      totals[cat] = (totals[cat] || 0) + amt;
    }
    const breakdown = Object.entries(totals).map(([name, value]) => ({
      name,
      value,
      percent: grand ? Number(((value / grand) * 100).toFixed(1)) : 0,
    }));
    res.json({
      preview: rows.slice(0, 10),
      breakdown,
      grandTotal: grand,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to process spend_demo.csv" });
  }
});

// --- Home: Macro snapshot (latest year) ---
app.get("/home/macro", (req, res) => {
  try {
    const rows = readSheet("macro_oman.xlsx");
    const latest = latestByField(rows, "Year") || {};
    const payload = {
      year: latest.Year ?? null,
      gdpGrowth: numberize(latest["GDP_Growth_%"]),
      inflation: numberize(latest["Inflation_%"]),
      oilProductionKbpd: numberize(latest.Oil_Production_kbpd),
      brentOmanNote: "See commodities section",
      omrUsd: latest.OMR_USD ?? 0.385, // pegged, but from sheet if present
    };
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load macro_oman.xlsx" });
  }
});

// --- Home: Commodities (latest year + list) ---
app.get("/home/commodities", (req, res) => {
  try {
    const rows = readSheet("commodities.xlsx");
    const latest = latestByField(rows, "Year") || {};
    const list = [
      { name: "Brent (USD/bbl)", value: numberize(latest.Brent_USD_bbl) },
      { name: "Oman Crude (USD/bbl)", value: numberize(latest.Oman_Crude_USD_bbl) },
      { name: "NatGas (USD/MMBtu)", value: numberize(latest.NatGas_USD_mmbtu) },
      { name: "LNG JKM (USD/MMBtu)", value: numberize(latest.LNG_JKM_USD_mmbtu) },
      { name: "Steel (USD/t)", value: numberize(latest.Steel_USD_ton) },
      { name: "Copper (USD/t)", value: numberize(latest.Copper_USD_ton) },
      { name: "Baltic Dry Index", value: numberize(latest.Baltic_Dry_Index) },
    ].filter(x => x.value !== null);

    res.json({ year: latest.Year ?? null, items: list });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load commodities.xlsx" });
  }
});

// --- Home: Cost model teasers (detect top driver and change vs prior year) ---
app.get("/home/cost-models", (req, res) => {
  try {
    const vRows = readSheet("cost_model_valves.xlsx");
    const cRows = readSheet("cost_model_compressors.xlsx");

    function topDriver(rows, kind) {
      const latest = latestByField(rows, "Year") || {};
      const years = rows.map(r => r.Year).filter(y => y != null).sort((a,b)=>a-b);
      const prevYear = years.length >= 2 ? years[years.length - 2] : null;
      const prev = prevYear ? rows.find(r => r.Year === prevYear) || {} : {};

      // driver keys by model
      const keys =
        kind === "valves"
          ? ["Steel_Cost", "Labor_Cost", "Energy_Cost", "Transport_Cost", "Overhead"]
          : ["Steel_Cost", "Electronics_Cost", "Energy_Cost", "Transport_Cost", "Overhead"];

      // find max component
      let best = { name: null, value: -Infinity, change: null, arrow: "→" };
      keys.forEach(k => {
        const v = numberize(latest[k]);
        if (v !== null && v > best.value) {
          const prevV = numberize(prev[k]);
          const change = prevV !== null ? v - prevV : null;
          best = {
            name: k.replace("_Cost", "").replace("_", " "),
            value: v,
            change,
            arrow: change == null ? "→" : change > 0 ? "↑" : change < 0 ? "↓" : "→",
          };
        }
      });

      return {
        year: latest.Year ?? null,
        total: numberize(latest.Total_Cost),
        topDriver: best,
      };
    }

    res.json({
      valves: topDriver(vRows, "valves"),
      compressors: topDriver(cRows, "compressors"),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load cost model sheets" });
  }
});

// --- Home: AI insights (latest row) ---
app.get("/home/ai-insights", (req, res) => {
  try {
    const rows = readSheet("ai_insights.xlsx");
    const latest = latestByField(rows, "Date") || {};
    res.json({
      date: latest.Date || null,
      insights: [latest.Insight_1, latest.Insight_2, latest.Insight_3].filter(Boolean),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load ai_insights.xlsx" });
  }
});

// --- Home: Trade partners (latest year: top 5 exports) ---
app.get("/home/trade", (req, res) => {
  try {
    const rows = readSheet("trade_partners.xlsx");
    const latestYear = latestByField(rows, "Year")?.Year ?? null;
    const latestRows = rows.filter(r => r.Year === latestYear);
    // top 5 by Exports_USD_million
    const sorted = latestRows
      .map(r => ({
        partner: r.Partner,
        exports: numberize(r.Exports_USD_million),
        imports: numberize(r.Imports_USD_million),
      }))
      .filter(x => x.partner && x.exports !== null)
      .sort((a, b) => b.exports - a.exports)
      .slice(0, 5);

    res.json({ year: latestYear, partners: sorted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load trade_partners.xlsx" });
  }
});

// --- Home: simple news (static starter) ---
app.get("/home/news", (req, res) => {
  res.json({
    headlines: [
      "Oil prices stable amid Gulf tensions",
      "Oman CPI down 0.2% MoM",
      "Steel prices rebound after China stimulus",
    ],
  });
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
