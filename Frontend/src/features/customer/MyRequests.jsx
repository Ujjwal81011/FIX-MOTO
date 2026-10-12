import { useEffect, useState } from "react";
import { History, RefreshCw, MapPin, XCircle, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/axios";
import { useSocket } from "../../context/SocketContext";

export default function MyRequests() {
  const { socket } = useSocket();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  const load = () =>
    api.get("/emergency/mine")
      .then(r => setItems(r.data.requests || []))
      .catch(e => setMessage(e.response?.data?.message || "Could not load requests."));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("emergency:accepted", refresh);
    socket.on("emergency:status", refresh);
    socket.on("emergency:bill", refresh);
    return () => {
      socket.off("emergency:accepted", refresh);
      socket.off("emergency:status", refresh);
      socket.off("emergency:bill", refresh);
    };
  }, [socket]);

  const approveBill = async (id) => {
    try { const { data } = await api.patch(`/emergency/${id}/bill/approve`); setMessage(data.message || "Bill approved."); await load(); }
    catch (e) { setMessage(e.response?.data?.message || "Could not approve bill."); }
  };

  const requestRevision = async (id) => {
    const reason = window.prompt("What needs to be corrected in the bill?");
    if (!reason?.trim()) return;
    try { const { data } = await api.patch(`/emergency/${id}/bill/revision`, { reason: reason.trim() }); setMessage(data.message || "Revision requested."); await load(); }
    catch (e) { setMessage(e.response?.data?.message || "Could not request bill revision."); }
  };

  const cancel = async (id) => {
    try {
      await api.patch(`/emergency/${id}/cancel`);
      load();
    } catch (e) {
      setMessage(e.response?.data?.message || "Could not cancel request.");
    }
  };

  return <div className="mx-auto max-w-6xl">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-black">My Requests</h1>
        <p className="mt-2 text-slate-500">Track your emergency service requests.</p>
      </div>
      <button onClick={load} className="btn-secondary"><RefreshCw size={17}/>Refresh</button>
    </div>
    {message && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    <div className="mt-7 space-y-4">
      {items.length ? items.map(x => {
        const trackable = x.mechanic && ["requested","on_the_way","arrived","repairing"].includes(x.status);
        return <div className="card p-5" key={x._id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold capitalize">{x.issueType || "Emergency request"}</h3>
              <p className="mt-1 text-sm text-slate-500">{x.description || "No description"}</p>
              <p className="mt-2 text-xs text-slate-400">{x.vehicle?.make} {x.vehicle?.model} • {x.vehicle?.registrationNumber}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">
              {String(x.status || "requested").replaceAll("_"," ")}
            </span>
          </div>
          {x.billItems?.length > 0 && <div className="mt-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">Repair bill</h4><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{String(x.billStatus || "none").replaceAll("_", " ")}</span></div>
            <div className="mt-3 space-y-2">{x.billItems.map((item, i) => <div key={`${x._id}-${i}`} className="flex justify-between gap-3 text-sm"><span>{item.name} × {item.quantity}</span><span>₹{Number(item.total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span></div>)}</div>
            {x.billNotes && <p className="mt-3 text-sm text-slate-500">Notes: {x.billNotes}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><p className="text-lg font-black">Total: ₹{Number(x.finalAmount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
              {x.billStatus === "submitted" && <div className="flex flex-wrap gap-2"><button onClick={() => approveBill(x._id)} className="btn-primary">Approve bill</button><button onClick={() => requestRevision(x._id)} className="btn-secondary">Request revision</button></div>}
              {x.billStatus === "revision_requested" && <p className="text-sm text-amber-700">Revision requested: {x.billRevisionReason}</p>}
              {x.billStatus === "approved" && <p className="text-sm font-semibold text-green-700">Bill approved</p>}
            </div>
          </div>}
          <div className="mt-4 flex flex-wrap gap-2">
            {trackable && <Link to={`/customer/tracking?requestId=${x._id}`} className="btn-secondary"><MapPin size={16}/>Track</Link>}
            <Link to={`/customer/tracking?requestId=${x._id}`} className="btn-secondary"><Eye size={16}/>Details</Link>
            {!["completed","cancelled"].includes(x.status) &&
              <button onClick={() => cancel(x._id)} className="btn-secondary text-red-600"><XCircle size={16}/>Cancel</button>}
          </div>
        </div>;
      }) : <div className="card p-12 text-center">
        <History className="mx-auto text-slate-300"/>
        <p className="mt-4 font-semibold">No requests yet</p>
        <p className="mt-1 text-sm text-slate-500">Your emergency requests will appear here.</p>
      </div>}
    </div>
  </div>;
}
