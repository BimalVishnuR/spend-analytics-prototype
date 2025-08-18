// frontend/src/pages/Indices.jsx
import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import DataTable from "../components/DataTable.jsx";

export default function Indices() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch(`${API_BASE_URL}/indices/oman`);
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
      <h1 className="text-2xl font-bold mb-4">Oman Indices</h1>
      {loading ? <p>Loading...</p> : <DataTable data={rows} />}
    </div>
  );
}
