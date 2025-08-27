// backend/server.js
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

// ===== CORS CONFIGURATION =====
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://spend-analytics-prototype.vercel.app',
    /^https:\/\/spend-analytics-prototype-.+\.vercel\.app$/  // Regex for preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'Access-Control-Allow-Headers',
    'X-Requested-With',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version'
  ],
  optionsSuccessStatus: 200
};

// ===== MIDDLEWARE =====
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));


// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== ROUTES =====
// Home routes (all your existing functionality preserved)
app.use("/home", homeRoutes);
app.use("/api/home", homeRoutes); // Support both /home and /api/home

// Map routes
app.use("/api/map", mapRoutes);
app.use("/api/commodities", commoditiesRouter);

// ===== MULTER SETUP =====
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({
    status: "Backend is running!",
    timestamp: new Date().toISOString(),
    cors: "Enabled for Vercel",
    homeEndpoints: [
      "/home/macro",
      "/home/commodities", 
      "/home/cost-models",
      "/home/cost-model-1/options",
      "/home/cost-model-2/options",
      "/home/capital-equipments/options",
      "/home/category-mi/categories",
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

// ===== ALL YOUR EXISTING ENDPOINTS =====

// Upload endpoint
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        res.json({
          message: "File uploaded and parsed successfully!",
          preview: results.slice(0, 10),
        });
      })
      .on("error", (err) => {
        console.error("CSV Parse Error:", err);
        res.status(500).json({ error: "Parse failed", message: err.message });
      });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ error: "Upload failed", message: error.message });
  }
});

// Market: Brent vs LNG
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
    console.error("Brent LNG Error:", e);
    res.status(500).json({ error: "Failed to load brent_lng_30d.csv", message: e.message });
  }
});

// Oman indices
app.get("/indices/oman", async (req, res) => {
  try {
    const rows = await loadCSV("oman_indices.csv");
    res.json(rows);
  } catch (e) {
    console.error("Oman Indices Error:", e);
    res.status(500).json({ error: "Failed to load oman_indices.csv", message: e.message });
  }
});

// Benchmarks
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
    console.error("Benchmarks Error:", e);
    res.status(500).json({ error: "Failed to load benchmarks.csv", message: e.message });
  }
});

// Suppliers
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
    console.error("Suppliers Error:", e);
    res.status(500).json({ error: "Failed to load suppliers_oman.csv", message: e.message });
  }
});

// Reports
app.get("/reports", async (req, res) => {
  try {
    const rows = await loadCSV("reports.csv");
    res.json(rows);
  } catch (e) {
    console.error("Reports Error:", e);
    res.status(500).json({ error: "Failed to load reports.csv", message: e.message });
  }
});

// Spend demo
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
    console.error("Spend Demo Error:", e);
    res.status(500).json({ error: "Failed to process spend_demo.csv", message: e.message });
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

// ===== ERROR HANDLING MIDDLEWARE =====
app.use((error, req, res, next) => {
  console.error('Server Error:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message,
    endpoint: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// ===== 404 HANDLER =====
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      health: '/',
      home: '/home/*',
      api: '/api/*'
    }
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled for: https://spend-analytics-prototype.vercel.app`);
  console.log(`🏠 Home endpoints available at /home/*`);
  console.log(`🗺️  Map endpoints available at /api/map/*`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
});
