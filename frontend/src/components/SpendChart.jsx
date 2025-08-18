import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function SpendChart({ data, title }) {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 m-4 w-full">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="spend" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
