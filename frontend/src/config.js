// src/config.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const API_ENDPOINTS = {
  BASE: API_BASE_URL,

  // Supply Chain Map APIs (match your backend map.js routes)
  PORTS: `${API_BASE_URL}/api/map/ports`,
  OIL_GAS_FIELDS: `${API_BASE_URL}/api/map/fields`,
  PIPELINES: `${API_BASE_URL}/api/map/pipelines`,
  ROADS: `${API_BASE_URL}/api/map/roads`, // if implemented
  SUPPLIERS: `${API_BASE_URL}/api/map/suppliers`,
  CHOKEPOINT: `${API_BASE_URL}/api/map/chokepoints`,
};

export default API_ENDPOINTS;
