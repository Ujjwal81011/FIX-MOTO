import { useState } from "react";
import { Save, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";

export default function Profile() {
  const { user } = useAuth();
  const [form,setForm]=useState({name:user?.name||"",phone:user?.phone||""}); const [msg,setMsg]=useState("");
  const save=async(e)=>{e.preventDefault();try{await api.put("/users/profile",form);setMsg("Profile updated successfully.")}catch(e){setMsg(e.response?.data?.message||"Could not update profile.")}};
  return <div className="mx-auto max-w-3xl"><h1 className="text-3xl font-black">Profile</h1><p className="mt-2 text-slate-500">Manage your FIX MOTO account.</p><form onSubmit={save} className="card mt-7 p-6 md:p-8"><div className="flex items-center gap-4 border-b pb-6"><div className="grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600"><UserRound/></div><div><h2 className="font-bold">{user?.name}</h2><p className="text-sm capitalize text-slate-500">{user?.role}</p></div></div><div className="mt-6 grid gap-4 md:grid-cols-2"><div><label className="label">Name</label><input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div><div><label className="label">Phone</label><input className="input" value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></div><div className="md:col-span-2"><label className="label">Email</label><input className="input bg-slate-50" value={user?.email||""} readOnly/></div></div><button className="btn-primary mt-6"><Save size={17}/>Save changes</button>{msg&&<p className="mt-4 text-sm text-slate-500">{msg}</p>}</form></div>;
}