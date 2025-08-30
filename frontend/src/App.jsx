// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SupplyChainMap from "./pages/SupplyChainMap";
import CostModel1 from "./pages/CostModel1";
import CategoryAnalysis from "./pages/CategoryAnalysis";
import MarketIntelligencepage from "./pages/MarketIntelligencepage"; // FIXED CASING

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50 text-gray-900">
        <Navbar />

        <div className="flex-1 flex flex-col ml-24 h-screen">
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/supply-chain-map" element={<SupplyChainMap />} />
              <Route path="/cost-model-1" element={<CostModel1 />} />
              <Route path="/category" element={<CategoryAnalysis />} />
              {/* FIXED: Use correct component name with lowercase 'p' */}
              <Route path="/market-intelligence" element={<MarketIntelligencepage />} />
            </Routes>
          </main>

          <footer className="h-[5vh] bg-white border-t flex items-center justify-center text-sm text-gray-500 flex-shrink-0">
            © 2025 PDO Intelligence
          </footer>
        </div>
      </div>
    </Router>
  );
}
