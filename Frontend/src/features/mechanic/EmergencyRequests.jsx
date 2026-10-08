import { useEffect, useState } from "react";
import { Check, Clock3, MapPin, RefreshCw, Radio, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/axios";
import { useSocket } from "../../context/SocketContext";

export default function EmergencyRequests(){
  const {socket,connected}=useSocket();
  const [items,setItems]=useState([]);
  const [message,setMessage]=useState("");

  const addRequest=(request)=>{
    if(!request?._id)return;
    setItems(prev=>prev.some(x=>x._id===request._id)?prev: [request,...prev]);
  };

  useEffect(()=>{
    if(!socket)return;
    const onNew=(payload)=>{
      // The original backend emits emergency:new. Payload may be the request
      // itself or an object containing { request }.
      addRequest(payload?.request || payload);
      setMessage("New emergency request received.");
    };
    socket.on("emergency:new",onNew);
    return()=>socket.off("emergency:new",onNew);
  },[socket]);

  const refresh=()=>{
    setMessage(
      "Waiting for live emergency requests. The original backend does not expose an /emergency/available REST endpoint; new jobs are received through Socket.IO."
    );
  };

  const accept=async(id)=>{
    try{
      const {data}=await api.patch(`/emergency/${id}/accept`);
      const request=data.request || data;
      localStorage.setItem("fixmoto_active_request",request?._id||id);
      setItems(prev=>prev.filter(x=>x._id!==id));
      window.location.href=`/mechanic/jobs?requestId=${request?._id||id}`;
    }catch(e){
      setMessage(e.response?.data?.message||"Request is no longer available.");
    }
  };

  return <div className="mx-auto max-w-6xl">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-black">Emergency Requests</h1>
        <p className="mt-2 text-slate-500">New requests arrive through the backend Socket.IO emergency event.</p>
      </div>
      <button onClick={refresh} className="btn-secondary"><RefreshCw size={16}/>Refresh</button>
    </div>

    <div className={`mt-5 flex items-center gap-2 rounded-xl p-3 text-sm ${connected?"bg-green-50 text-green-700":"bg-amber-50 text-amber-800"}`}>
      <Radio size={17}/>{connected?"Real-time connection active":"Connecting to real-time service..."}
    </div>

    {message&&<p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}

    <div className="mt-7 space-y-4">
      {items.length?items.map(x=><div className="card p-5" key={x._id}>
        <div className="flex flex-col justify-between gap-5 md:flex-row">
          <div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold capitalize text-red-700">{x.issueType||"Emergency"}</span>
            <h3 className="mt-3 font-bold">{x.description||"Roadside assistance requested"}</h3>
            <p className="mt-2 text-sm text-slate-500">{x.vehicle?.make} {x.vehicle?.model} • {x.vehicle?.registrationNumber}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex gap-1"><MapPin size={15}/>{x.location?.address||"Customer location"}</span>
              <span className="flex gap-1"><Clock3 size={15}/>{x.createdAt?new Date(x.createdAt).toLocaleString():"Just now"}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <button onClick={()=>accept(x._id)} className="btn-primary"><Check size={16}/>Accept</button>
            <Link to={`/mechanic/jobs?requestId=${x._id}`} className="btn-secondary">Details</Link>
          </div>
        </div>
      </div>):<div className="card p-12 text-center">
        <AlertTriangle className="mx-auto text-slate-300"/>
        <p className="mt-4 font-bold">No incoming requests</p>
        <p className="mt-1 text-sm text-slate-500">Keep your mechanic status online. New emergency jobs will appear when the backend emits them.</p>
      </div>}
    </div>
  </div>;
}
