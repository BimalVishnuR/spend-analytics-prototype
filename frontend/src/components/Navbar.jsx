// frontend/src/components/Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Map,
  Calculator,
  BarChart3,
} from "lucide-react";

export default function Navbar() {
  const location = useLocation();

  const linkClasses = (path) =>
    `flex flex-col items-center text-sm ${
      location.pathname === path
        ? "text-blue-600 font-semibold"
        : "text-gray-600 hover:text-blue-600"
    }`;

  return (
    <nav className="h-screen w-24 bg-white shadow-md flex flex-col items-center py-6 space-y-6">
      <Link to="/" className={linkClasses("/")}>
        <Home className="h-6 w-6 mb-1" />
        Home
      </Link>

      {/* Combined Category link with 3 tabs inside */}
      <Link to="/category" className={linkClasses("/category")}>
        <BarChart3 className="h-6 w-6 mb-1" />
        Category
      </Link>

      {/* Supply Chain Map */}
      <Link to="/supply-chain-map" className={linkClasses("/supply-chain-map")}>
        <Map className="h-6 w-6 mb-1" />
        Map
      </Link>

    </nav>
  );
}
