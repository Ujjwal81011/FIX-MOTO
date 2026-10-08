import { useEffect, useState } from "react";
import { MapPin, Navigation, Radio, Wrench, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/axios";
import { useSocket } from "../../context/SocketContext";

export default function LiveTracking() {
  const [params] = useSearchParams();
  const requestId = params.get("requestId") || localStorage.getItem("fixmoto_active_request");
  const {socket,connected} = useSocket();
  const [request,setRequest] = useState(null);
  const [mechanicCoords,setMechanicCoords] = useState(null);
  const [message,setMessage] = useState("");

  const load=()=>{
    if(!requestId)return;
    api.get(`/emergency/${requestId}`)
      .then(({data})=>{
        setRequest(data.request || data);
        const coords=data.request?.mechanic?.location?.coordinates;
        if(coords?.length===2)setMechanicCoords(coords);
      })
      .catch(e=>setMessage(e.response?.data?.message||"Could not load request."));
  };

  useEffect(()=>{load()},[requestId]);

  useEffect(()=>{
    if(!socket||!requestId)return;
    socket.emit("join:request",requestId);
    const onLocation=(payload)=>{
      if(String(payload?.requestId)===String(requestId)){
        const coords=payload.coordinates || payload.location?.coordinates;
        if(coords?.length===2)setMechanicCoords(coords);
      }
    };
    const onStatus=(payload)=>{
      if(String(payload?.requestId)===String(requestId))load();
    };
    socket.on("mechanic:location",onLocation);
    socket.on("emergency:status",onStatus);
    socket.on("emergency:accepted",onStatus);
    return()=>{
      socket.off("mechanic:location",onLocation);
      socket.off("emergency:status",onStatus);
      socket.off("emergency:accepted",onStatus);
    };
  },[socket,requestId]);

  if(!requestId) return <div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black">Live Tracking</h1><div className="card mt-7 p-10 text-center"><MapPin className="mx-auto text-slate-300"/><p className="mt-4 font-bold">No active request selected.</p><p className="mt-1 text-sm text-slate-500">Open Track from My Requests.</p></div></div>;

  return <div className="mx-auto max-w-6xl">
    <div className="flex items-center justify-between">
      <div><h1 className="text-3xl font-black">Live Tracking</h1><p className="mt-2 text-slate-500">Real-time status and mechanic location.</p></div>
      <button onClick={load} className="btn-secondary"><RefreshCw size={16}/>Refresh</button>
    </div>
    {message&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    <div className="mt-7 grid gap-6 lg:grid-cols-3">
      <div className="card min-h-[480px] bg-slate-900 p-5 lg:col-span-2">
        <div className="flex h-full min-h-[440px] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950">
          <div className="text-center text-white">
            <MapPin className="mx-auto h-12 w-12 text-red-500"/>
            <h2 className="mt-4 text-xl font-bold">{mechanicCoords?"Mechanic location received":"Waiting for mechanic location"}</h2>
            {mechanicCoords?.length===2 && <p className="mt-3 text-sm text-slate-300">{mechanicCoords[1]}, {mechanicCoords[0]}</p>}
            <p className="mt-2 max-w-sm text-sm text-slate-400">Socket.IO coordinates are connected. A map provider can be added without changing the backend.</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600"><Wrench/></div><div><p className="font-bold">Mechanic status</p><p className="text-xs capitalize text-slate-500">{String(request?.status||"requested").replaceAll("_"," ")}</p></div></div>
        </div>
        <div className="card p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Radio size={17} className={connected?"text-green-500":"text-amber-500"}/>{connected?"Socket.IO connected":"Connecting..."}</div><p className="mt-2 text-sm text-slate-500">Request room joined: {requestId}</p></div>
        <div className="card p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Navigation size={17} className="text-red-600"/>Request</div><p className="mt-2 font-bold capitalize">{request?.issueType||"Emergency"}</p><p className="mt-1 text-sm text-slate-500">{request?.location?.address||"Customer location"}</p></div>
      </div>
    </div>
  </div>;
}
