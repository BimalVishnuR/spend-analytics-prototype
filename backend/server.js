// backend/server.js
// STEP 1: UPDATE backend/server.js (PRESERVE ALL HOME ROUTES)
// Replace your current server.js with this version:

import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";
import { readSheet, latestByField, numberize } from "./services/xlsxService.js";
import { loadCSV, toNumber } from "./services/dataService.js";
import homeRoutes from "./routes/home.js";
import mapRoutes from "./routes/map.js";
import commoditiesRouter from "./routes/commodities.js";

const app = express();
const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== MIDDLEWARE =====
// ===== MIDDLEWARE =====
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://spend-analytics-prototype.vercel.app'
    ];
    
    // Check if the origin is in our allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Also allow any vercel.app subdomain (in case your URL changes)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// ===== ROUTES =====
// Home routes (UNCHANGED - all your existing functionality preserved)
app.use("/home", homeRoutes);
app.use("/api/home", homeRoutes); // Support both /home and /api/home

// Map routes (NEW - only for map functionality)
app.use("/api/map", mapRoutes);
app.use("/api/commodities", commoditiesRouter);
// ===== MULTER SETUP (PRESERVE YOUR FILE UPLOAD) =====
const upload = multer({ dest: "uploads/" });

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({
    status: "Backend is running!",
    timestamp: new Date().toISOString(),
    homeEndpoints: [
      "/home/macro",
      "/home/commodities", 
      "/home/cost-models",
      "/home/ai-insights",
      "/home/trade",
      "/home/news"
    ],
    mapEndpoints: [
      "/api/map/ports",
      "/api/map/suppliers",
      "/api/map/chokepoints",
      "/api/map/freezones",
      "/api/map/fields",
      "/api/map/pipelines"
    ]
  });
});

// ===== ALL YOUR EXISTING ENDPOINTS (PRESERVED EXACTLY) =====

// Upload endpoint (UNCHANGED)
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

// Market: Brent vs LNG (UNCHANGED)
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

// Oman indices (UNCHANGED)
app.get("/indices/oman", async (req, res) => {
  try {
    const rows = await loadCSV("oman_indices.csv");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load oman_indices.csv" });
  }
});

// Benchmarks (UNCHANGED)
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

// Suppliers (UNCHANGED)
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

// Reports (UNCHANGED)
app.get("/reports", async (req, res) => {
  try {
    const rows = await loadCSV("reports.csv");
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load reports.csv" });
  }
});

// Spend demo (UNCHANGED)
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

// OLD Map endpoint (PRESERVED for backward compatibility)
app.get("/map/oman-supply-chain", (req, res) => {
  res.json({
    ports: [
      { name: "Port of Sohar", lat: 24.500, lng: 56.650, cppiRank: 40, throughputMTEU: 1.8 },
      { name: "Port of Salalah", lat: 17.000, lng: 54.100, cppiRank: 15, throughputMTEU: 4.2 },
      { name: "Port of Duqm", lat: 19.670, lng: 57.720, cppiRank: 60, throughputMTEU: 0.8 }
    ],
    suppliers: [
      { name: "Oman Valves Co", lat: 23.600, lng: 58.500, type: "valves" },
      { name: "Muscat Compressors", lat: 23.580, lng: 58.420, type: "compressors" }
    ],
    chokepoints: [
      { name: "Strait of Hormuz", lat: 26.566, lng: 56.250, risk: "Moderate", lastAdvisory: "UKMTO: Transit with caution" }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Home endpoints preserved at /home/*");
  console.log("New map endpoints available at /api/map/*");
});