// frontend/src/pages/home.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Activity, Droplet, DollarSign, Info } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5001";
const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const nfc = (v) =>
  typeof v === "number" && !Number.isNaN(v) ? nf1.format(v) : "—";
async function getJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

export default function Home() {
  const [macro, setMacro] = useState(null);
  const [commodities, setCommodities] = useState(null);
  const [costModels, setCostModels] = useState(null);
  const [insights, setInsights] = useState(null);
  const [trade, setTrade] = useState(null);
  const [news, setNews] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getJSON("/home/macro")
      .then(setMacro)
      .catch(() => setError("⚠️ Failed to load macro data."));
    (async () => {
      try {
        const [c, cm, ai, t, n] = await Promise.all([
          getJSON("/home/commodities"),
          getJSON("/home/cost-models"),
          getJSON("/home/ai-insights"),
          getJSON("/home/trade"),
          getJSON("/home/news"),
        ]);
        setCommodities(c);
        setCostModels(cm);
        setInsights(ai);
        setTrade(t);
        setNews(n);
      } catch {
        setError("⚠️ Failed to load additional home sections.");
      }
    })();
  }, []);

  return (
    <div className="w-full flex flex-col flex-1">
      {/* Compact Hero */}
      <section className="h-[15vh] relative flex items-center justify-center text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1724235858460-25d5504d952a?q=80&w=2070&auto=format&fit=crop")`,
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-3xl md:text-4xl font-extrabold mb-2 drop-shadow-lg"
          >
            Market Intelligence Dashboard
          </motion.h1>
          <p className="text-sm opacity-90">Curated for Oman PDO</p>
        </div>
      </section>

      {/* Dashboard Grid */}
      <main className="grid grid-cols-12 gap-4 p-4 bg-gray-50" style={{ height: "74vh" }}>
        {error && (
          <div className="col-span-12 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Macro Snapshot */}
        <DashboardCard title="Macro Snapshot" className="col-span-4">
          {!macro ? (
            <LoadingText text="Loading…" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
                label="GDP Growth"
                value={nfc(macro.gdpGrowth)}
              />
              <StatCard
                icon={<Activity className="w-4 h-4 text-pink-600" />}
                label="Inflation"
                value={nfc(macro.inflation)}
              />
              <StatCard
                icon={<Droplet className="w-4 h-4 text-amber-600" />}
                label="Oil (kbpd)"
                value={macro.oilProductionKbpd ? nf0.format(macro.oilProductionKbpd) : "—"}
              />
              <StatCard
                icon={<DollarSign className="w-4 h-4 text-green-600" />}
                label="OMR/USD"
                value={macro.omrUsd ?? "—"}
              />
            </div>
          )}
        </DashboardCard>

        {/* Commodities */}
        <DashboardCard title="Commodities" className="col-span-4">
          {!commodities ? (
            <LoadingText text="Loading…" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {commodities.items?.slice(0, 4).map((it, i) => (
                <Card key={i}>
                  <p className="text-xs text-gray-500">{it.name}</p>
                  <p className="mt-1 text-lg font-bold text-blue-700">
                    {typeof it.value === "number" ? nfc(it.value) : "—"}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </DashboardCard>

        {/* Cost Models */}
        <DashboardCard title="Cost Models" className="col-span-4">
          {!costModels ? (
            <LoadingText text="Loading…" />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <CostCard title="Valves" data={costModels.valves} />
              <CostCard title="Compressors" data={costModels.compressors} />
            </div>
          )}
        </DashboardCard>

        {/* AI Insights */}
        <DashboardCard title="AI Insights" className="col-span-4">
          {!insights ? (
            <LoadingText text="Loading…" />
          ) : (
            <ul className="text-sm space-y-2">
              {insights.insights?.slice(0, 3).map((s, idx) => (
                <li key={idx}>• {s}</li>
              ))}
            </ul>
          )}
        </DashboardCard>

        {/* Trade */}
        <DashboardCard title="Trade Partners" className="col-span-4">
          {!trade ? (
            <LoadingText text="Loading…" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={trade.partners?.slice(0, 5).map((p) => ({
                  name: p.partner,
                  exports: p.exports ?? 0,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="exports" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </DashboardCard>

        {/* News */}
        <DashboardCard title="News" className="col-span-4">
          {!news ? (
            <LoadingText text="Loading…" />
          ) : (
            <ul className="text-xs space-y-1">
              {news.headlines?.slice(0, 4).map((h, i) => (
                <li key={i} className="truncate">• {h}</li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </main>

    </div>
  );
}

/* --- Reusable --- */
function DashboardCard({ title, children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl shadow p-3 flex flex-col overflow-hidden ${className}`}
    >
      <h3 className="text-sm font-semibold mb-2 text-gray-700 truncate">{title}</h3>
      <div className="flex-1 overflow-auto text-sm">{children}</div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <Card>
      <div className="flex items-center gap-1">
        {icon}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="mt-1 text-lg font-bold text-blue-700">{value}</p>
    </Card>
  );
}

function CostCard({ title, data }) {
  if (!data) return <Card>No data</Card>;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-gray-400">{data.year ?? ""}</span>
      </div>
      <p className="text-sm text-gray-600">
        Total:{" "}
        <span className="font-semibold">
          {typeof data.total === "number" ? nfc(data.total) : "—"}
        </span>
      </p>
    </Card>
  );
}

function LoadingText({ text }) {
  return <p className="text-gray-400 italic text-sm">{text}</p>;
}
