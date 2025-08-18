// frontend/src/components/DataTable.jsx
import React from "react";

export default function DataTable({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-600">No data to display.</p>;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 border text-left font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2 border">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
