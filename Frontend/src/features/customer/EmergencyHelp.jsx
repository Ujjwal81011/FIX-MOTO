import { useEffect, useState } from "react";
import { MapPin, Siren, Wrench, Zap, CarFront, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../utils/axios";

const problems = [["battery","Battery"],["puncture","Puncture"],["fuel","Fuel"],["lockout","Lockout"],["engine","Engine"],["electrical","Electrical"],["accident","Accident"],["general","General Breakdown"]];

export default function EmergencyHelp() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [vehicle, setVehicle] = useState("");
  const [problem, setProblem] = useState("battery");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/vehicles").then(({ data }) => {
      const list = data.vehicles || [];
      setVehicles(list);
      if (list[0]) setVehicle(list[0]._id);
    }).catch(() => setStatus("Could not load vehicles."));
  }, []);

  const getLocation = () => {
    setStatus("Getting your location...");
    if (!navigator.geolocation) { setStatus("Geolocation is not supported by this browser."); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates([coords.longitude, coords.latitude]);
        setAddress(`GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
        setStatus("Location captured successfully.");
      },
      (error) => setStatus(error.code === 1 ? "Please allow location access." : "Could not get your location.")
    );
  };

  const submit = async () => {
    if (!vehicle) { setStatus("Please add/select a vehicle first."); return; }
    if (!coordinates) { setStatus("Please share your current location first."); return; }
    setLoading(true); setStatus("");
    try {
      const { data } = await api.post("/emergency", { vehicle, issueType: problem, description, coordinates, address });
      setStatus(data.message || "Emergency request created successfully.");
      if (data.request?._id) localStorage.setItem("fixmoto_active_request", data.request._id);
      setTimeout(() => navigate("/customer/requests"), 700);
    } catch (e) { setStatus(e.response?.data?.message || "Could not create emergency request."); }
    finally { setLoading(false); }
  };

  return <div className="mx-auto max-w-5xl">
    <p className="font-semibold text-red-600">EMERGENCY HELP</p><h1 className="mt-1 text-3xl font-black">Tell us what happened.</h1>
    <p className="mt-2 text-slate-500">Share your vehicle, problem and location. Nearby verified mechanics can respond.</p>
    <div className="mt-7 grid gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2">
        <label className="label">Select vehicle</label>
        {vehicles.length ? <select className="input" value={vehicle} onChange={e=>setVehicle(e.target.value)}>{vehicles.map(v=><option key={v._id} value={v._id}>{v.make} {v.model} • {v.registrationNumber}</option>)}</select> : <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No vehicle found. <Link className="font-bold text-red-600" to="/customer/vehicles">Add a vehicle</Link> first.</div>}
        <h2 className="mt-6 font-bold">Select your problem</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{problems.map(([value,label])=><button type="button" key={value} onClick={()=>setProblem(value)} className={`rounded-xl border p-4 text-left ${problem===value?"border-red-400 bg-red-50 text-red-700":"border-slate-200 hover:bg-slate-50"}`}><Wrench size={20}/><p className="mt-2 font-semibold">{label}</p></button>)}</div>
        <div className="mt-6"><label className="label">Describe the issue</label><textarea className="input min-h-28" placeholder="Example: Car won't start..." value={description} onChange={e=>setDescription(e.target.value)}/></div>
        <button onClick={submit} disabled={loading || !vehicles.length} className="btn-primary mt-5 w-full md:w-auto"><Siren size={18}/>{loading?"Sending...":"Send Emergency Request"}</button>
        {status && <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm"><CheckCircle2 size={18} className="mt-0.5 text-green-600"/><span>{status}</span></div>}
      </div>
      <div className="card h-fit p-6"><div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600"><MapPin/></div><h2 className="mt-5 font-bold">Your location</h2><p className="mt-2 text-sm leading-6 text-slate-500">GPS is used to find nearby verified mechanics within the service radius.</p><button onClick={getLocation} className="btn-secondary mt-5 w-full"><MapPin size={17}/>{coordinates?"Update Location":"Share Current Location"}</button><div className="mt-4 rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-600"><Zap className="mx-auto mb-2"/>{address || "Location not captured yet"}</div><div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><CarFront size={15}/>Vehicle + GPS are required for emergency matching.</div></div>
    </div>
  </div>;
}
