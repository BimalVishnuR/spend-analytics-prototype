// backend/services/dataService.js
import fs from "fs";
import path from "path";
import csv from "csv-parser";

const csvRoot = path.resolve(process.cwd(), "data", "csv");

export function loadCSV(filename) {
  return new Promise((resolve, reject) => {
    const results = [];
    const fullPath = path.join(csvRoot, filename);
    fs.createReadStream(fullPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

// helper: numbers
export const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
