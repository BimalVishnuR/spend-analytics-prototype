// routes/commodities.js
import express from "express";
import { readSheet } from "../services/xlsxService.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // ✅ only filename, not full path
    const rows = await readSheet("commodities-2.xlsx", "Prices");

    // Convert Excel rows to structured object
    const commodities = {};
    const keys = Object.keys(rows[0]).filter(k => k !== "date");
    keys.forEach(k => { commodities[k] = []; });

    rows.forEach(r => {
      keys.forEach(k => {
        commodities[k].push({ date: r.date, value: parseFloat(r[k]) });
      });
    });

    res.json(commodities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read commodities.xlsx" });
  }
});

export default router;
