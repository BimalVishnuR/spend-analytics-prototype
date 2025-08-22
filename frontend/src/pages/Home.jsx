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

// -------------------------
// Home Component
// -------------------------
export default function Home() {
  const [today, setToday] = useState(null);
  const [macro, setMacro] = useState(null);
  const [commodities, setCommodities] = useState(null);
  const [costModels, setCostModels] = useState(null);
  const [insights, setInsights] = useState(null);
  const [trade, setTrade] = useState(null);
  const [news, setNews] = useState(null);
  const [error, setError] = useState("");



  // Fetch Macro
  useEffect(() => {
    getJSON("/home/macro")
      .then(setMacro)
      .catch((e) => {
        console.error(e);
        setError(
          "⚠️ Failed to load macro data. Is the backend running on http://localhost:5001?"
        );
      });
  }, []);

  // Fetch other home data
  useEffect(() => {
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
      } catch (e) {
        console.error(e);
        setError(
          "⚠️ Failed to load additional home sections. Is the backend running?"
        );
      }
    })();
  }, []);

  return (
    <div className="w-full">
      {/* Hero */}
<section className="relative w-full h-[80vh] flex items-center justify-center text-white">
  {/* Background Image */}
  <div
    className="absolute inset-0 bg-cover bg-center"
    style={{
      backgroundImage: `url("https://images.unsplash.com/photo-1724235858460-25d5504d952a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")`,
    }}
  />

  {/* Dark overlay for readability */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Text Content */}
  <div className="relative z-10 px-8 text-center max-w-5xl mx-auto">
    <motion.h1
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg"
    >
      Turning Market Data into{" "}
      <span className="bg-gradient-to-r from-yellow-300 to-orange-500 bg-clip-text text-transparent animate-pulse">
        Actionable Intelligence
      </span>
    </motion.h1>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.7 }}
      className="text-lg md:text-xl opacity-90 drop-shadow-md"
    >
      Desktop-first, curated landing page for Oman PDO.
    </motion.p>

    <div className="mt-12 flex gap-6 justify-center">
      <a
        href="#macro"
        className="bg-white text-blue-700 px-8 py-4 rounded-2xl shadow-lg hover:scale-105 hover:shadow-xl transition-transform font-medium"
      >
        Explore Snapshot
      </a>
      <a
        href="#commodities"
        className="bg-blue-500 px-8 py-4 rounded-2xl shadow-lg hover:bg-blue-400 hover:scale-105 transition-transform font-medium"
      >
        Commodities Dashboard
      </a>
    </div>
  </div>
</section>



      {/* Main Content */}
      <main className="w-full px-8 py-16 space-y-20">
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Macroeconomic Snapshot */}
        <SectionWrapper id="macro" bg="white">
          <SectionHeader
            title={`Macroeconomic Snapshot${
              macro?.year ? ` (${macro.year})` : ""
            }`}
            gradient="from-blue-600 to-indigo-600"
          />
          {!macro ? (
            <LoadingText text="Loading macro data…" />
          ) : (
            <div className="grid grid-cols-5 gap-6">
              <StatCard
                icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                label="GDP Growth (%)"
                value={nfc(macro.gdpGrowth)}
              />
              <StatCard
                icon={<Activity className="w-5 h-5 text-pink-600" />}
                label="Inflation (%)"
                value={nfc(macro.inflation)}
              />
              <StatCard
                icon={<Droplet className="w-5 h-5 text-amber-600" />}
                label="Oil Production (kbpd)"
                value={
                  macro.oilProductionKbpd
                    ? nf0.format(macro.oilProductionKbpd)
                    : "—"
                }
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                label="OMR / USD"
                value={macro.omrUsd ?? "—"}
              />
              <StatCard
                icon={<Info className="w-5 h-5 text-gray-500" />}
                label="Note"
                value={macro.brentOmanNote ?? "—"}
              />
            </div>
          )}
        </SectionWrapper>

        {/* Commodities */}
        <SectionWrapper id="commodities" bg="gray-50">
          <SectionHeader
            title={`Key Commodities${
              commodities?.year ? ` (${commodities.year})` : ""
            }`}
            gradient="from-amber-500 to-red-500"
          />
          {!commodities ? (
            <LoadingText text="Loading commodities…" />
          ) : (
            <div className="grid grid-cols-4 gap-6">
              {commodities.items?.map((it, i) => (
                <Card key={i}>
                  <p className="text-sm text-gray-500">{it.name}</p>
                  <p className="mt-3 text-3xl font-bold text-blue-700">
                    {typeof it.value === "number" ? nfc(it.value) : "—"}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </SectionWrapper>

        {/* Cost Model Highlights */}
        <SectionWrapper bg="white">
          <SectionHeader
            title="Cost Model Highlights"
            gradient="from-green-500 to-emerald-600"
          />
          {!costModels ? (
            <LoadingText text="Loading cost models…" />
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <CostCard title="Valves" data={costModels.valves} />
              <CostCard title="Compressors" data={costModels.compressors} />
            </div>
          )}
        </SectionWrapper>

        {/* AI Insights */}
        <SectionWrapper bg="gray-50">
          <SectionHeader
            title="AI Insights"
            gradient="from-purple-500 to-pink-600"
          />
          {!insights ? (
            <LoadingText text="Loading insights…" />
          ) : (
            <Card className="border-l-4 border-blue-600">
              <p className="text-sm text-blue-800 mb-2">
                {insights.date ? `As of ${insights.date}` : "Latest"}
              </p>
              <ul className="space-y-3">
                {insights.insights?.map((s, idx) => (
                  <li key={idx} className="text-blue-900">
                    • {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </SectionWrapper>

        {/* Trade Partners */}
        <SectionWrapper bg="white">
          <SectionHeader
            title={`Top Trade Partners by Exports${
              trade?.year ? ` (${trade.year})` : ""
            }`}
            gradient="from-cyan-500 to-blue-500"
          />
          {!trade ? (
            <LoadingText text="Loading trade partners…" />
          ) : (
            <Card className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trade.partners?.map((p) => ({
                    name: p.partner,
                    exports: p.exports ?? 0,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="exports"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </SectionWrapper>

        {/* News */}
        <SectionWrapper bg="gray-50">
          <SectionHeader
            title="News & Trends"
            gradient="from-red-500 to-orange-500"
          />
          {!news ? (
            <LoadingText text="Loading news…" />
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {news.headlines?.map((h, idx) => (
                <Card key={idx}>{h}</Card>
              ))}
            </div>
          )}
        </SectionWrapper>
      </main>
    </div>
  );
}

// -------------------------
// Reusable Components
// -------------------------
function SectionWrapper({ children, id, bg }) {
  return (
    <FadeInSection
      id={id}
      className={`py-12 px-2 sm:px-4 lg:px-8 rounded-xl bg-${bg}`}
    >
      {children}
    </FadeInSection>
  );
}

function SectionHeader({ title, gradient }) {
  return (
    <h2
      className={`text-3xl font-bold mb-8 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
    >
      {title}
    </h2>
  );
}

function LoadingText({ text }) {
  return <div className="text-gray-500 italic">{text}</div>;
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 shadow hover:shadow-lg hover:scale-[1.01] transition-transform bg-white/80 ${className}`}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <Card>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-blue-700">{value}</p>
    </Card>
  );
}

function CostCard({ title, data }) {
  if (!data) return <Card>No data</Card>;
  const { year, total, topDriver } = data;
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-semibold">{title}</h3>
        <span className="text-sm text-gray-500">{year ?? ""}</span>
      </div>
      <p className="mt-2 text-gray-600">
        Total cost:{" "}
        <span className="font-semibold">
          {typeof total === "number" ? nfc(total) : "—"}
        </span>
      </p>
      {topDriver && (
        <div className="mt-4 rounded-lg bg-gray-50/70 p-3">
          <p className="text-sm text-gray-500">Top driver</p>
          <p className="text-lg font-semibold">
            {topDriver.name ?? "—"}: {nfc(topDriver.value)}{" "}
            <span className="text-sm text-gray-500">
              {topDriver.arrow}{" "}
              {typeof topDriver.change === "number"
                ? nfc(topDriver.change)
                : "—"}
            </span>
          </p>
        </div>
      )}
    </Card>
  );
}

function PulseStat({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 text-center hover:scale-[1.02] transition-transform">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-blue-700 animate-pulse">{value}</p>
    </div>
  );
}

function FadeInSection({ children, ...props }) {
  return (
    <motion.section
      {...props}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      {children}
    </motion.section>
  );
}
