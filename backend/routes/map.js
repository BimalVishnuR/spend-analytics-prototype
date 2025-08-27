// routes/map.js

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory setup
const DATA_DIR = path.join(__dirname, "../data/geo");
const NOTES_FILE = path.join(__dirname, "../data/port_notes.json");

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const notesDir = path.dirname(NOTES_FILE);
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify({}), "utf-8");
  }
}

function readNotes() {
  try {
    ensureDirectories();
    return JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8") || "{}");
  } catch {
    return {};
  }
}

function writeNotes(obj) {
  ensureDirectories();
  fs.writeFileSync(NOTES_FILE, JSON.stringify(obj, null, 2), "utf-8");
}

// Map endpoints (only map-related routes here)
router.get("/ports", (req, res) => {
  try {
    const notes = readNotes();
    const fallbackPorts = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [56.65, 24.5] },
          properties: { 
            name: "Port of Sohar", 
            cppi_rank: 40, 
            type: "container",
            throughput_mteu: 1.8
          }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [54.1, 17.0] },
          properties: { 
            name: "Port of Salalah", 
            cppi_rank: 15, 
            type: "container",
            throughput_mteu: 4.2
          }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [57.72, 19.67] },
          properties: { 
            name: "Port of Duqm", 
            cppi_rank: 60, 
            type: "multi-purpose",
            throughput_mteu: 0.8
          }
        }
      ]
    };

    // Merge with notes
    fallbackPorts.features = fallbackPorts.features.map(feature => {
      const portName = feature.properties?.name;
      const note = notes[portName] || {};
      return {
        ...feature,
        properties: {
          ...feature.properties,
          congestion_note: note.congestion_note || null,
          dwell_time_days: note.dwell_time_days || null
        }
      };
    });

    res.json(fallbackPorts);
  } catch (error) {
    console.error("Error in ports API:", error);
    res.status(500).json({ error: "Failed to fetch ports" });
  }
});

router.get("/suppliers", (req, res) => {
  try {
    const fallbackSuppliers = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [58.5, 23.6] },
          properties: { 
            supplier_name: "Oman Valves Co", 
            category: "Valves", 
            city: "Muscat", 
            governorate: "Muscat" 
          }
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [58.42, 23.58] },
          properties: { 
            supplier_name: "Muscat Compressors", 
            category: "Compressors", 
            city: "Muscat", 
            governorate: "Muscat" 
          }
        }
      ]
    };

    res.json(fallbackSuppliers);
  } catch (error) {
    console.error("Error in suppliers API:", error);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

router.get("/chokepoints", (req, res) => {
  try {
    const fallbackChokepoints = [
      {
        name: "Strait of Hormuz",
        status: "Moderate Risk",
        coordinates: [56.25, 26.566],
        risk_level: "YELLOW",
        last_update: new Date().toISOString().split('T')[0],
        advisory: "UKMTO: Transit with caution"
      }
    ];

    res.json(fallbackChokepoints);
  } catch (error) {
    console.error("Error in chokepoints API:", error);
    res.status(500).json({ error: "Failed to fetch chokepoints" });
  }
});

router.get("/freezones", (req, res) => {
  try {
    const fallbackFreeZones = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [56.65, 24.5] },
          properties: { 
            name: "Sohar Free Zone", 
            type: "Industrial", 
            port: "Sohar"
          }
        }
      ]
    };

    res.json(fallbackFreeZones);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch free zones" });
  }
});

router.get("/fields", (req, res) => {
  try {
    const fallbackFields = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [58.5, 22.5] },
          properties: { 
            name: "Fahud Field", 
            operator: "PDO", 
            type: "Oil"
          }
        }
      ]
    };

    res.json(fallbackFields);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch O&G fields" });
  }
});

router.get("/pipelines", (req, res) => {
  try {
    const fallbackPipelines = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [[58.5, 22.5], [56.65, 24.5]]
          },
          properties: { 
            name: "Fahud-Sohar Pipeline", 
            type: "Oil"
          }
        }
      ]
    };

    res.json(fallbackPipelines);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pipelines" });
  }
});

router.get("/admins", (req, res) => {
  try {
    const fallbackAdmins = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[[58.0, 23.0], [59.0, 23.0], [59.0, 24.0], [58.0, 24.0], [58.0, 23.0]]]
          },
          properties: { 
            name: "Muscat", 
            name_ar: "مسقط"
          }
        }
      ]
    };

    res.json(fallbackAdmins);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin boundaries" });
  }
});

router.post("/ports/notes", (req, res) => {
  try {
    const { portName, congestion_note, dwell_time_days } = req.body || {};
    if (!portName) {
      return res.status(400).json({ error: "portName is required" });
    }

    const notes = readNotes();
    notes[portName] = {
      congestion_note: congestion_note || null,
      dwell_time_days: dwell_time_days || null,
      updated_at: new Date().toISOString(),
    };
    writeNotes(notes);

    return res.json({ 
      ok: true, 
      note: { name: portName, ...notes[portName] } 
    });
  } catch (e) {
    console.error("Error saving port note:", e);
    return res.status(500).json({ error: "Failed to save note" });
  }
});

export default router;