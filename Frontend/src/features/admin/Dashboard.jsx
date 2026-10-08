import { useEffect, useState } from "react";
import { CircleDollarSign, ShieldCheck, Users, Wrench, Zap } from "lucide-react";
import StatCard from "../../Components/StatCard";
import api from "../../utils/axios";

export default function Dashboard(){
  const [stats,setStats]=useState({users:0,mechanics:0,requests:0});
  useEffect(()=>{
    Promise.all([
      api.get("/users"),
      api.get("/mechanics"),
      api.get("/emergency/all")
    ]).then(([u,m,e])=>{
      setStats({
        users:(u.data.users||[]).length,
        mechanics:(m.data.mechanics||[]).length,
        requests:(e.data.requests||[]).length
      });
    }).catch(()=>{});
  },[]);

  return <div className="mx-auto max-w-7xl">
    <p className="text-sm text-slate-500">Admin control center</p>
    <h1 className="mt-1 text-3xl font-black">FIX MOTO Overview</h1>
    <p className="mt-2 text-slate-500">Monitor users, mechanics and emergency requests.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Users} label="Users" value={stats.users}/>
      <StatCard icon={Wrench} label="Mechanics" value={stats.mechanics}/>
      <StatCard icon={Zap} label="Emergency requests" value={stats.requests}/>
      <StatCard icon={CircleDollarSign} label="Payments" value="Customer side"/>
    </div>
    <div className="mt-7 grid gap-6 lg:grid-cols-2">
      <div className="card p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-green-600"/><h2 className="font-bold">Verification</h2></div><p className="mt-4 text-sm text-slate-500">The current backend exposes mechanic records but no verification update endpoint.</p></div>
      <div className="card p-6"><h2 className="font-bold">Platform health</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>API</span><span className="font-semibold text-green-600">Ready</span></div><div className="flex justify-between"><span>MongoDB</span><span className="font-semibold text-green-600">Backend connected</span></div><div className="flex justify-between"><span>Socket.IO</span><span className="font-semibold text-green-600">Enabled</span></div></div></div>
    </div>
  </div>;
}
