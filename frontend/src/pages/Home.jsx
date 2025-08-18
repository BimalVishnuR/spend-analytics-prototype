// frontend/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config";

function StatCard({ title, value, subtitle }) {
  return (
    <div className="p-4 rounded border bg-white shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

export default function Home() {
  const [brent, setBrent] = useState(null);
  const [lng, setLng] = useState(null);
  const [bench, setBench] = useState([]);
  const [suppliersCount, setSuppliersCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const m = await fetch(`${API_BASE_URL}/market/brent-lng`).then(r=>r.json());
        if (m && m.length) {
          const last = m[m.length - 1];
          setBrent(last.brent);
          setLng(last.lng);
        }
      } catch {}

      try {
        const b = await fetch(`${API_BASE_URL}/benchmarks`).then(r=>r.json());
        setBench(b || []);
      } catch {}

      try {
        const s = await fetch(`${API_BASE_URL}/suppliers`).then(r=>r.json());
        setSuppliersCount(s?.length || 0);
      } catch {}
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Oman Snapshot</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Brent (latest)" value={brent ?? "—"} subtitle="USD/bbl" />
        <StatCard title="LNG (latest)" value={lng ?? "—"} subtitle="USD/MMBtu" />
        <StatCard title="Benchmarks loaded" value={bench.length} />
        <StatCard title="Oman suppliers" value={suppliersCount} />
      </div>

      <div className="p-4 rounded border bg-white">
        <h2 className="text-lg font-semibold mb-2">What you can do next</h2>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>Open <strong>Market</strong> to see Brent/LNG table.</li>
          <li>Open <strong>Benchmarks</strong> for Oman vs GCC vs India.</li>
          <li>Open <strong>Suppliers</strong> to see Oman supplier list.</li>
          <li>Open <strong>Spend</strong> to view demo spend breakdown.</li>
        </ul>
      </div>
    </div>
  );
}
