import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser"; // ✅ static import
import { loadCSV, toNumber } from "./services/dataService.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
