// frontend/src/components/Navbar.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm mb-4">
      <div className="max-w-6xl mx-auto px-4 py-3 flex space-x-6">
        <Link to="/" className="font-semibold text-blue-600">Home</Link>
        <Link to="/market" className="text-gray-700 hover:text-blue-600">Market</Link>
        <Link to="/benchmarks" className="text-gray-700 hover:text-blue-600">Benchmarks</Link>
        <Link to="/suppliers" className="text-gray-700 hover:text-blue-600">Suppliers</Link>
        <Link to="/indices" className="text-gray-700 hover:text-blue-600">Indices</Link>
        <Link to="/spend" className="text-gray-700 hover:text-blue-600">Spend</Link>
      </div>
    </nav>
  );
}
