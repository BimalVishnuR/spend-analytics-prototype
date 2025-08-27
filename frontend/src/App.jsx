// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SupplyChainMap from "./pages/SupplyChainMap";
import CostModel1 from "./pages/CostModel1";
import CostModel2 from "./pages/CostModel2";
import CategoryMI from "./pages/CategoryMI";
import CapitalEquipments from "./pages/CapitalEquipments";


export default function App() {
  return (
    <Router>
      {/* Sidebar + main layout - Full viewport height */}
      <div className="flex h-screen bg-gray-50 text-gray-900">
        {/* Sidebar (fixed width) */}
        <Navbar />

        {/* Main content area - Use full height minus footer */}
        <div className="flex-1 flex flex-col ml-24 h-screen">
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/supply-chain-map" element={<SupplyChainMap />} />
              <Route path="/cost-model-1" element={<CostModel1 />} />
              <Route path="/cost-model-2" element={<CostModel2 />} />
              <Route path="/category-mi" element={<CategoryMI />} />
              <Route path="/capital-equipments" element={<CapitalEquipments />} />
            </Routes>
          </main>

          {/* Footer - 5vh */}
          <footer className="h-[5vh] bg-white border-t flex items-center justify-center text-sm text-gray-500 flex-shrink-0">
            © 2025 PDO Intelligence
          </footer>
        </div>
      </div>
    </Router>
  );
}

