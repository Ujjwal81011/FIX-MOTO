import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import api from "../../utils/axios";

export default function Reports(){
  const [requests,setRequests]=useState([]);
  const [message,setMessage]=useState("");

  const load=async()=>{
    try{
      const {data}=await api.get("/emergency/all");
      setRequests(data.requests||[]);
      setMessage("");
    }catch(e){
      setMessage(e.response?.data?.message||"Could not load reports.");
    }
  };

  useEffect(()=>{load()},[]);

  const completed=requests.filter(x=>x.status==="completed").length;
  const active=requests.filter(x=>!["completed","cancelled"].includes(x.status)).length;
  const rate=requests.length?Math.round(completed/requests.length*100):0;

  return <div className="mx-auto max-w-6xl">
    <div className="flex justify-between">
      <div><h1 className="text-3xl font-black">Reports</h1><p className="mt-2 text-slate-500">Operational reports from supported admin APIs.</p></div>
      <button onClick={load} className="btn-secondary"><RefreshCw size={16}/>Refresh</button>
    </div>
    {message&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    <div className="mt-7 grid gap-5 md:grid-cols-3">
      <div className="card p-6"><BarChart3 className="text-red-600"/><p className="mt-5 text-sm text-slate-500">Requests</p><p className="text-3xl font-black">{requests.length}</p></div>
      <div className="card p-6"><p className="text-sm text-slate-500">Completed</p><p className="mt-5 text-3xl font-black">{completed}</p><p className="mt-1 text-xs text-slate-400">{rate}% completion rate</p></div>
      <div className="card p-6"><p className="text-sm text-slate-500">Active / pending</p><p className="mt-5 text-3xl font-black">{active}</p></div>
    </div>
  </div>;
}
