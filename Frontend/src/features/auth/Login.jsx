import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import Logo from "../../Components/Logo";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setError("");
    try {
      const data = await login(form);
      const from = location.state?.from;
      const target = from || (data.user.role === "admin" ? "/admin" : data.user.role === "mechanic" ? "/mechanic" : "/customer");
      navigate(target, { replace: true });
    } catch (err) { setError(err.response?.data?.message || "Login failed. Check your backend."); }
  };

  return <div className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
    <div className="hidden items-center justify-center p-10 text-white lg:flex"><div className="max-w-lg"><Logo dark/><h1 className="mt-14 text-5xl font-black leading-tight">Help is closer than you think.</h1><p className="mt-5 text-lg leading-8 text-slate-300">FIX MOTO brings trusted roadside help to your location, whenever you need it.</p><div className="mt-8 flex gap-5 text-sm text-slate-300"><span><ShieldCheck className="mr-2 inline text-green-400" size={18}/>Verified</span><span>24/7 Support</span></div></div></div>
    <div className="flex items-center justify-center bg-slate-50 p-5 md:p-10"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl md:p-9"><div className="lg:hidden"><Logo/></div><h2 className="mt-7 text-3xl font-black">Welcome back</h2><p className="mt-2 text-sm text-slate-500">Login to continue to FIX MOTO.</p>{error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="mt-7"><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div className="mt-4"><label className="label">Password</label><input className="input" type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div><button disabled={loading} className="btn-primary mt-6 w-full">{loading ? "Logging in..." : "Login"} <LogIn size={18}/></button><p className="mt-6 text-center text-sm text-slate-500">Don't have an account? <Link to="/register" className="font-bold text-red-600">Create one</Link></p></form></div>
  </div>;
}