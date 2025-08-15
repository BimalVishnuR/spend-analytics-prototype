export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-blue-600">Spend Analytics Prototype</h1>
        <p className="mt-3 text-gray-600">
          You’re live on React + Vite + Tailwind. Next: upload CSVs and map headers with AI.
        </p>
        <a
          className="inline-block mt-6 text-center rounded-xl px-4 py-2 border hover:bg-gray-50"
          href="#"
          onClick={(e) => e.preventDefault()}
        >
          Dummy Button
        </a>
      </div>
    </div>
  );
}
