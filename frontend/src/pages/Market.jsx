// frontend/src/pages/Market.jsx
import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import DataTable from "../components/DataTable.jsx";

export default function Market() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch(`${API_BASE_URL}/market/brent-lng`);
        const json = await r.json();
        setRows(json);
      }catch(e){
        console.error(e);
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Market: Brent & LNG (30 days)</h1>
      {loading ? <p>Loading...</p> : <DataTable data={rows} />}
    </div>
  );
}
