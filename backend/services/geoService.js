const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");

/**
 * Converts suppliers_oman.csv into GeoJSON.
 * Expected CSV headers: supplier_name,category,lat,lon,city,governorate
 */
function suppliersCsvToGeoJSON(csvPath) {
  return new Promise((resolve, reject) => {
    const features = [];
    fs.createReadStream(csvPath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on("data", (row) => {
        const lat = parseFloat(row.lat ?? row.latitude);
        const lon = parseFloat(row.lon ?? row.longitude ?? row.lng);
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          features.push({
            type: "Feature",
            properties: {
              supplier_name: row.supplier_name || row.name || "Unknown",
              category: row.category || "Uncategorised",
              city: row.city || "",
              governorate: row.governorate || "",
            },
            geometry: { type: "Point", coordinates: [lon, lat] },
          });
        }
      })
      .on("end", () => {
        resolve({ type: "FeatureCollection", features });
      })
      .on("error", reject);
  });
}

function readJsonFile(relPath) {
  const abs = path.join(__dirname, "..", relPath);
  return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

module.exports = { suppliersCsvToGeoJSON, readJsonFile };
