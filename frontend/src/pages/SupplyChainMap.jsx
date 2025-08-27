// frontend/src/pages/SupplyChainMap.jsx
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  ScaleControl,
  useMap,
  LayersControl,
  LayerGroup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import API from "../config";

// Fix Leaflet icon issue in Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = new L.Icon({
  iconUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowUrl: iconShadowUrl,
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const makeIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: iconShadowUrl,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });

const chokepointIcon = makeIcon("red");
const supplierBlueIcon = makeIcon("blue");
const freezoneGreenIcon = makeIcon("green");

const iconByCategory = (category = "") => {
  const key = category.toLowerCase();
  if (key.includes("valve")) return makeIcon("orange");
  if (key.includes("compressor")) return makeIcon("violet");
  if (key.includes("e&i") || key.includes("elect")) return makeIcon("darkgreen");
  if (key.includes("civil")) return makeIcon("cadetblue");
  return supplierBlueIcon;
};

const OMAN_BOUNDS = L.latLngBounds([16.0, 52.0], [26.6, 60.0]);
const OMAN_CENTER = [21.0, 57.0];

function FitBoundsOnce({ bounds }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);
  return null;
}

function Legend() {
  const map = useMap();
  useEffect(() => {
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend bg-white p-2 rounded shadow");
      div.style.lineHeight = "1.1";
      div.innerHTML = `
        <div style="font-size:13px; font-weight:600; margin-bottom:4px;">Legend</div>
        <div style="display:flex; align-items:center; gap:6px;"><svg width="14" height="14"><circle cx="7" cy="7" r="6" stroke="black" fill="black" /></svg><span>Port</span></div>
        <div style="display:flex; align-items:center; gap:6px;"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" width="14" /><span>Free Zone</span></div>
        <div style="display:flex; align-items:center; gap:6px;"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png" width="14" /><span>Supplier</span></div>
        <div style="display:flex; align-items:center; gap:6px;"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" width="14" /><span>Chokepoint</span></div>
      `;
      return div;
    };
    legend.addTo(map);
    return () => map.removeControl(legend);
  }, [map]);
  return null;
}

export default function SupplyChainMap() {
  const [ports, setPorts] = useState(null);
  const [freezones, setFreezones] = useState(null);
  const [fields, setFields] = useState(null);
  const [pipelines, setPipelines] = useState(null);
  const [admins, setAdmins] = useState(null);
  const [suppliers, setSuppliers] = useState(null);
  const [chokepoints, setChokepoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enabledCats, setEnabledCats] = useState({});

  useEffect(() => {
    let active = true;
    const fetchJSON = async (url) => {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Failed fetch: ${url}`);
      return res.json();
    };
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          portsData,
          suppliersData,
          chokepointData,
          freezonesData,
          fieldsData,
          pipelinesData,
          adminsData,
        ] = await Promise.all([
          fetchJSON(API.PORTS),
          fetchJSON(API.SUPPLIERS),
          fetchJSON(API.CHOKEPOINT),
          fetchJSON(API.BASE + "/api/map/freezones"),
          fetchJSON(API.OIL_GAS_FIELDS),
          fetchJSON(API.PIPELINES),
          fetchJSON(API.BASE + "/api/map/admins"),
        ]);
        if (!active) return;
        setPorts(portsData);
        setSuppliers(suppliersData);
        setChokepoints(chokepointData);
        setFreezones(freezonesData);
        setFields(fieldsData);
        setPipelines(pipelinesData);
        setAdmins(adminsData);
      } catch (err) {
        console.error(err);
        setError("Failed to load map data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const supplierFeatures = useMemo(() => {
    if (!suppliers) return [];
    if (suppliers.type === "FeatureCollection") return suppliers.features;
    return suppliers.map((s) => {
      const lat = Number(s.lat ?? s.latitude ?? s.geometry?.coordinates?.[1]);
      const lng = Number(s.lng ?? s.longitude ?? s.geometry?.coordinates?.[0]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          supplier_name: s.supplier_name ?? s.name,
          category: s.category ?? "Unknown",
          city: s.city,
          governorate: s.governorate,
        },
      };
    }).filter(Boolean);
  }, [suppliers]);

  const allCategories = useMemo(() => {
    const s = new Set();
    supplierFeatures.forEach((f) => s.add(f.properties?.category ?? "Unknown"));
    return Array.from(s).sort();
  }, [supplierFeatures]);

  useEffect(() => {
    if (allCategories.length && Object.keys(enabledCats).length === 0) {
      const init = {};
      allCategories.forEach((c) => (init[c] = true));
      setEnabledCats(init);
    }
  }, [allCategories, enabledCats]);

  const filteredSupplierFeatures = useMemo(() => {
    return supplierFeatures.filter((f) => enabledCats[f.properties?.category ?? "Unknown"] !== false);
  }, [supplierFeatures, enabledCats]);

  const chokepointMarkers = useMemo(() => {
    if (!chokepoints) return [];
    return chokepoints.map((cp) => {
      const lat = Number(cp.lat ?? cp.latitude ?? cp.coordinates?.[1]);
      const lng = Number(cp.lng ?? cp.longitude ?? cp.coordinates?.[0]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng, name: cp.name ?? "Chokepoint", status: cp.status ?? cp.risk_level ?? "—" };
    }).filter(Boolean);
  }, [chokepoints]);

  const portsFC = useMemo(() => ports?.type === "FeatureCollection" ? ports : null, [ports]);
  const portStyle = (_feature, latlng) =>
    L.circleMarker(latlng, { radius: 7, color: "black", weight: 1, fillColor: "black", fillOpacity: 0.9 });
  const portPopup = (feature, layer) => {
    const p = feature.properties || {};
    layer.bindPopup(`<div style="font-size:12px;"><div style="font-weight:600">${p.name ?? "Port"}</div><div>CPPI rank: ${p.cppi_rank ?? "—"}</div><div>Type: ${p.type ?? "—"}</div></div>`);
  };

  return (
    <div className="flex w-full h-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Map */}
      <div className="flex-[2] h-full relative">
        {loading && <div className="absolute top-3 left-3 z-[1000] p-2 bg-white rounded shadow">Loading map…</div>}
        {error && <div className="absolute top-3 left-3 z-[1000] p-2 bg-red-200 rounded shadow">{error}</div>}

        {allCategories.length > 0 && (
          <div className="absolute z-[1000] top-20 left-3 bg-white/95 backdrop-blur rounded shadow p-3 text-sm max-w-[240px]">
            <div className="font-semibold mb-2">Supplier Filters</div>
            <div className="space-y-1 max-h-48 overflow-auto pr-1">
              {allCategories.map((c) => (
                <label key={c} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabledCats[c] ?? true}
                    onChange={(e) => setEnabledCats((prev) => ({ ...prev, [c]: e.target.checked }))}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <MapContainer center={OMAN_CENTER} zoom={6} minZoom={4} maxZoom={12} style={{ height: "100%", width: "100%" }}>
          <FitBoundsOnce bounds={OMAN_BOUNDS} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <ScaleControl position="bottomleft" />
          <Legend />
          <LayersControl position="topright">
            {admins && <LayersControl.Overlay name="Admin Boundaries" checked><GeoJSON data={admins} style={() => ({ color: "#4b5563", weight: 1, fillColor: "#9ca3af", fillOpacity: 0.05 })} /></LayersControl.Overlay>}
            {portsFC && <LayersControl.Overlay name="Ports" checked><GeoJSON data={portsFC} pointToLayer={portStyle} onEachFeature={portPopup} /></LayersControl.Overlay>}
            {freezones && freezones.features?.length > 0 && (
              <LayersControl.Overlay name="Free Zones" checked>
                <LayerGroup>
                  {freezones.features.map((f, i) => {
                    const [lng, lat] = f.geometry.coordinates;
                    return <Marker key={i} position={[lat, lng]} icon={freezoneGreenIcon}><Popup>{f.properties?.name}</Popup></Marker>;
                  })}
                </LayerGroup>
              </LayersControl.Overlay>
            )}
            {filteredSupplierFeatures.length > 0 && (
              <LayersControl.Overlay name="Suppliers" checked>
                <MarkerClusterGroup>
                  {filteredSupplierFeatures.map((f, i) => {
                    const [lng, lat] = f.geometry.coordinates;
                    return <Marker key={i} position={[lat, lng]} icon={iconByCategory(f.properties?.category)}>
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{f.properties?.supplier_name}</div>
                          <div>Category: {f.properties?.category}</div>
                        </div>
                      </Popup>
                    </Marker>;
                  })}
                </MarkerClusterGroup>
              </LayersControl.Overlay>
            )}
            {chokepointMarkers.length > 0 && (
              <LayersControl.Overlay name="Chokepoints" checked>
                <LayerGroup>
                  {chokepointMarkers.map((cp, i) => (
                    <Marker key={i} position={[cp.lat, cp.lng]} icon={chokepointIcon}>
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{cp.name}</div>
                          <div>Status: {cp.status}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </LayerGroup>
              </LayersControl.Overlay>
            )}
          </LayersControl>
        </MapContainer>
      </div>

      {/* Right Panel */}
      <div className="flex-[1] h-full p-6 bg-gray-50 border-l border-gray-300 overflow-auto">
        <div className="bg-white rounded shadow p-6 h-full flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-700">Dashboard Panel</h2>
          <p className="text-gray-500 text-center">This panel can later include KPIs, charts, or reports.</p>
        </div>
      </div>
    </div>
  );
}
