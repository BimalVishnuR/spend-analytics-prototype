// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home.jsx";
import Spend from "./pages/Spend.jsx";
import Benchmarks from "./pages/Benchmarks.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Indices from "./pages/Indices.jsx";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 p-4">
        {/* Sidebar / Nav */}
        <nav className="mb-6 flex space-x-4">
          <Link className="text-blue-600 hover:underline" to="/">Home</Link>
          <Link className="text-blue-600 hover:underline" to="/spend">Spend</Link>
          <Link className="text-blue-600 hover:underline" to="/benchmarks">Benchmarks</Link>
          <Link className="text-blue-600 hover:underline" to="/suppliers">Suppliers</Link>
          <Link className="text-blue-600 hover:underline" to="/indices">Indices</Link>
        </nav>

        {/* Page content */}
        <div>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/spend" element={<Spend />} />
            <Route path="/benchmarks" element={<Benchmarks />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/indices" element={<Indices />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
