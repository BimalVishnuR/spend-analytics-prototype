// backend/services/xlsxService.js
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATA directory (../data relative to this file)
const DATA_DIR = path.resolve(__dirname, "../data");

function readSheet(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  // defval keeps empty cells as null instead of undefined
  return xlsx.utils.sheet_to_json(ws, { defval: null });
}

function latestByField(rows, field) {
  if (!rows?.length) return null;
  const clean = rows.filter(r => r[field] !== null && r[field] !== undefined);

  // If field looks like a number (Year), sort numerically; else try Date
  const numLike = clean.every(r => typeof r[field] === "number");
  clean.sort((a, b) => {
    if (numLike) return a[field] - b[field];
    return new Date(a[field]) - new Date(b[field]);
  });

  return clean[clean.length - 1] || null;
}

function numberize(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export { DATA_DIR, readSheet, latestByField, numberize };
