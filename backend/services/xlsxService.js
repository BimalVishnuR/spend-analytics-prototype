// backend/services/xlsxService.js
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATA directory (../data relative to this file). This is where excel files will sit. Can be changed later if we want excel sheets somewhere else
const DATA_DIR = path.resolve(__dirname, "../data");

function readSheet(filePathOrName) {
  // If the path is absolute, use it; else resolve relative to DATA_DIR
  const filePath = path.isAbsolute(filePathOrName)
    ? filePathOrName
    : path.join(DATA_DIR, filePathOrName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const wb = xlsx.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
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


/* ---------------------------------------------------
   📊 GRAPH-READY TRANSFORM FUNCTIONS
--------------------------------------------------- */

/**
 * Group rows by a given field (e.g. Category)
 * and count how many belong in each group.
 * Useful for Pie / Donut charts.
 */
function groupByCount(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = row[field] ?? "Unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

/**
 * Sum a numeric field by category.
 * Useful for Bar charts (e.g. spend by supplier).
 */
function sumByField(rows, groupField, valueField) {
  const sums = {};
  for (const row of rows) {
    const key = row[groupField] ?? "Unknown";
    const val = numberize(row[valueField]) ?? 0;
    sums[key] = (sums[key] || 0) + val;
  }
  return Object.entries(sums).map(([name, value]) => ({ name, value }));
}

/**
 * Prepare timeseries data for Line/Area charts.
 * Assumes xField = time (Year/Date), yField = numeric value.
 */
function timeSeries(rows, xField, yField) {
  return rows
    .map(r => ({
      x: r[xField],
      y: numberize(r[yField]),
    }))
    .filter(r => r.x !== null && r.y !== null)
    .sort((a, b) => new Date(a.x) - new Date(b.x)); // ensure chronological
}

/**
 * Normalize values into percentages (for stacked charts, etc.)
 */
function normalizeToPercent(data, valueField = "value") {
  const total = data.reduce((sum, d) => sum + (d[valueField] || 0), 0);
  return data.map(d => ({
    ...d,
    percent: total > 0 ? (d[valueField] / total) * 100 : 0,
  }));
}

export { DATA_DIR, readSheet, latestByField, numberize, groupByCount, sumByField, timeSeries, normalizeToPercent };
