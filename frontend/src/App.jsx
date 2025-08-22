import Home from "./pages/Home";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-20 bg-white/90 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-7xl px-8 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-blue-700">
            PDO Market Intelligence
          </div>
          <ul className="hidden md:flex gap-8 text-sm">
            <li className="hover:text-blue-700 cursor-pointer">Home</li>
            <li className="hover:text-blue-700 cursor-pointer">Commodities</li>
            <li className="hover:text-blue-700 cursor-pointer">Insights</li>
            <li className="hover:text-blue-700 cursor-pointer">News</li>
          </ul>
        </div>
      </nav>

      {/* Main page content */}
      <Home />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 text-center py-6">
        PDO Market Intelligence © 2025 • Desktop experience
      </footer>
    </div>
  );
}
