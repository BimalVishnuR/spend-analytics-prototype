import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/today", (req, res) => {
  try {
    // Build absolute path correctly
    const filePath = path.join(process.cwd(), "data", "today.json");
    console.log("🔎 Looking for:", filePath);

    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    res.json(data);
  } catch (err) {
    console.error("❌ Error loading today.json:", err.message);
    res.status(500).json({ error: "Failed to load Today KPIs" });
  }
});

export default router;
