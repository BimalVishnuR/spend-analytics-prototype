import React, { useState } from "react";
import API_BASE_URL from "../config";

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  // File selection + type check
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type !== "text/csv") {
      setMessage("Only CSV files are allowed!");
      setFile(null);
    } else {
      setFile(selected);
      setMessage("");
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a CSV file first!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setMessage(data.message);
      setPreview(data.preview || []);
      setFile(null); // reset file after upload
    } catch (err) {
      console.error(err);
      setMessage("Upload failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      {/* File input */}
      <input type="file" accept=".csv" onChange={handleFileChange} />

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={loading}
        className={`ml-2 px-4 py-2 rounded text-white ${
          loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {/* Status message */}
      {message && <p className="mt-2 text-green-600">{message}</p>}

      {/* Table Preview */}
      {preview.length > 0 && (
        <div className="mt-4 overflow-x-auto max-h-96 overflow-y-auto border rounded">
          <table className="min-w-full border border-gray-300 text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {Object.keys(preview[0]).map((col) => (
                  <th
                    key={col}
                    className="px-2 py-1 border border-gray-300 text-left font-semibold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-2 py-1 border border-gray-300">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
