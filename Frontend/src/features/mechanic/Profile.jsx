import { useEffect, useState } from "react";
import { Save, ShieldCheck, Wrench, Radio, MapPin } from "lucide-react";
import api from "../../utils/axios";

export default function Profile() {
  const [form,setForm]=useState({businessName:"",phone:"",experienceYears:0,serviceArea:"",expertise:[]});
  const [profile,setProfile]=useState(null);
  const [msg,setMsg]=useState("");
  const [online,setOnline]=useState(false);
  const [location,setLocation]=useState(null);

  const load = async () => {
    try {
      const {data} = await api.get("/mechanics/profile");
      setProfile(data.profile);
      setForm({
        businessName:data.profile?.businessName || "",
        phone:data.profile?.phone || "",
        experienceYears:data.profile?.experienceYears ?? 0,
        serviceArea:data.profile?.serviceArea || "",
        expertise:data.profile?.expertise || []
      });
      setOnline(Boolean(data.profile?.isOnline));
      setLocation(data.profile?.location?.coordinates || null);
    } catch (e) {
      setMsg(e.response?.data?.message || "Could not load mechanic profile.");
    }
  };

  useEffect(()=>{load()},[]);

  const save=async(e)=>{
    e.preventDefault();
    try {
      const {data}=await api.put("/mechanics/profile",{
        ...form,
        experienceYears:Number(form.experienceYears || 0)
      });
      setProfile(data.profile || profile);
      setMsg("Mechanic profile saved.");
    } catch(e) {
      setMsg(e.response?.data?.message||"Could not save profile.");
    }
  };

  const toggle=async()=>{
    try {
      const {data}=await api.patch("/mechanics/status",{isOnline:!online});
      setOnline(Boolean(data.profile?.isOnline ?? !online));
      setMsg((data.profile?.isOnline ?? !online) ? "You are now online." : "You are now offline.");
    } catch(e) {
      setMsg(e.response?.data?.message||"Could not update online status.");
    }
  };

  const sendLocation = () => {
  if (!navigator.geolocation) {
    setMsg("Geolocation is not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const lng = coords.longitude;
      const lat = coords.latitude;

      try {
        const { data } = await api.patch("/mechanics/location", {
          lng,
          lat,
        });

        setLocation(data.location?.coordinates || [lng, lat]);
        setMsg("Current location updated.");
      } catch (e) {
        setMsg(
          e.response?.data?.message ||
          "Could not update location."
        );
      }
    },
    () => setMsg("Please allow location access.")
  );
};

  const skills=["battery","puncture","fuel","lockout","engine","electrical","accident","general"];

  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="text-3xl font-black">Mechanic Profile</h1>
        <p className="mt-2 text-slate-500">Build trust by completing your provider profile.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={toggle} className={online ? "btn-primary" : "btn-secondary"}><Radio size={17}/>{online?"Go Offline":"Go Online"}</button>
        <button onClick={sendLocation} className="btn-secondary"><MapPin size={17}/>Update Location</button>
      </div>
    </div>

    <form onSubmit={save} className="card mt-7 p-6 md:p-8">
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-red-50 text-red-600"><Wrench/></div>
        <div>
          <h2 className="font-bold">Provider details</h2>
          <p className="text-sm text-slate-500">
            {profile?.isVerified ? "Verified mechanic" : "Verification is managed by admin."}
          </p>
        </div>
        <ShieldCheck className={`ml-auto ${profile?.isVerified?"text-green-500":"text-slate-300"}`}/>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div><label className="label">Business name</label><input className="input" value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})}/></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div><label className="label">Experience (years)</label><input className="input" type="number" min="0" value={form.experienceYears} onChange={e=>setForm({...form,experienceYears:e.target.value})}/></div>
        <div><label className="label">Service area</label><input className="input" value={form.serviceArea} onChange={e=>setForm({...form,serviceArea:e.target.value})}/></div>
      </div>

      <div className="mt-6">
        <label className="label">Expertise</label>
        <div className="flex flex-wrap gap-2">
          {skills.map(s=><button type="button" key={s} onClick={()=>setForm(f=>({...f,expertise:f.expertise.includes(s)?f.expertise.filter(i=>i!==s):[...f.expertise,s]}))}
            className={`rounded-full border px-3 py-2 text-sm capitalize ${form.expertise.includes(s)?"border-red-300 bg-red-50 text-red-700":"border-slate-200"}`}>{s}</button>)}
        </div>
      </div>

      {location?.length===2 && <p className="mt-5 text-xs text-slate-500">Location: {location[1].toFixed?.(5) ?? location[1]}, {location[0].toFixed?.(5) ?? location[0]}</p>}
      <button className="btn-primary mt-6"><Save size={17}/>Save Profile</button>
      {msg&&<p className="mt-4 text-sm text-slate-500">{msg}</p>}
    </form>
  </div>;
}
