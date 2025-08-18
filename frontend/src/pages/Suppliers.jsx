// frontend/src/pages/Suppliers.jsx
import React, { useEffect, useState } from "react";
import API_BASE_URL from "../config";
import DataTable from "../components/DataTable.jsx";

export default function Suppliers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try{
        const r = await fetch(`${API_BASE_URL}/suppliers`);
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
      <h1 className="text-2xl font-bold mb-4">Suppliers (Oman)</h1>
      {loading ? <p>Loading...</p> : <DataTable data={rows} />}
    </div>
  );
}
