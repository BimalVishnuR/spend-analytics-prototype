import React from "react";

export default function DashboardCard({ title, value }) {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 m-4 w-60">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-2xl">{value}</p>
    </div>
  );
}
