import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import Logo from "../../Components/Logo";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"", role:"customer" });
  const [error, setError] = useState("");
  const update = (key, value) => setForm((f)=>({...f,[key]:value}));

  const submit = async (e) => {
    e.preventDefault(); setError("");
    try { const data = await register(form); navigate(data.user.role === "mechanic" ? "/mechanic" : "/customer", { replace:true }); }
    catch (err) { setError(err.response?.data?.message || "Registration failed."); }
  };

  return <div className="min-h-screen bg-slate-950 px-5 py-10"><div className="mx-auto max-w-xl"><Logo dark/><form onSubmit={submit} className="mt-10 rounded-3xl bg-white p-7 shadow-2xl md:p-9"><h1 className="text-3xl font-black">Create your account</h1><p className="mt-2 text-sm text-slate-500">Join FIX MOTO as a customer or mechanic.</p>{error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="mt-7 grid gap-4 md:grid-cols-2"><div><label className="label">Full name</label><input className="input" required value={form.name} onChange={e=>update("name",e.target.value)}/></div><div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>update("phone",e.target.value)}/></div><div className="md:col-span-2"><label className="label">Email</label><input className="input" type="email" required value={form.email} onChange={e=>update("email",e.target.value)}/></div><div className="md:col-span-2"><label className="label">Password</label><input className="input" type="password" required minLength={6} value={form.password} onChange={e=>update("password",e.target.value)}/></div><div className="md:col-span-2"><label className="label">Register as</label><select className="input" value={form.role} onChange={e=>update("role",e.target.value)}><option value="customer">Customer</option><option value="mechanic">Mechanic</option></select></div></div><button disabled={loading} className="btn-primary mt-6 w-full">{loading ? "Creating..." : "Create Account"} <UserPlus size={18}/></button><p className="mt-5 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-bold text-red-600">Login</Link></p></form></div></div>;
}