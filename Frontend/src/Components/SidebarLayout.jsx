import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, CarFront, ChevronLeft, ChevronRight, CircleDollarSign, Gauge, History, Home, LogOut, MapPin, Menu, Search, ShieldCheck, Star, UserRound, Users, Wrench, X, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";
import { initials } from "../utils/helpers";

const customerLinks = [
  ["Dashboard","/customer",Home], ["Emergency Help","/customer/emergency",Zap],
  ["Find Mechanics","/customer/mechanics",Search], ["My Vehicles","/customer/vehicles",CarFront],
  ["My Requests","/customer/requests",History], ["Live Tracking","/customer/tracking",MapPin],
  ["Payments","/customer/payments",CircleDollarSign], ["Reviews","/customer/reviews",Star],
  ["Profile","/customer/profile",UserRound]
];
const mechanicLinks = [
  ["Dashboard","/mechanic",Home], ["Emergency Requests","/mechanic/requests",Zap],
  ["Active Jobs","/mechanic/jobs",Wrench], ["Job History","/mechanic/history",History],
  ["Earnings","/mechanic/earnings",CircleDollarSign], ["Reviews","/mechanic/reviews",Star],
  ["Profile","/mechanic/profile",UserRound]
];
const adminLinks = [
  ["Dashboard","/admin",Gauge], ["Users","/admin/users",Users], ["Mechanics","/admin/mechanics",Wrench],
  ["Verification","/admin/verification",ShieldCheck], ["Emergency Requests","/admin/requests",Zap],
  ["Payments","/admin/payments",CircleDollarSign], ["Reports","/admin/reports",History]
];

export default function SidebarLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const links = user?.role === "admin" ? adminLinks : user?.role === "mechanic" ? mechanicLinks : customerLinks;

  const signOut = () => { logout(); navigate("/"); };

  return <div className="flex min-h-screen bg-slate-50">
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-all ${collapsed ? "md:w-20" : ""} ${mobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <div className="flex h-20 items-center justify-between border-b px-4">
        {!collapsed && <Logo />}
        {collapsed && <Logo />}
        <button className="rounded-lg p-2 hover:bg-slate-100 md:hidden" onClick={() => setMobile(false)}><X/></button>
      </div>
      <div className={`m-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 ${collapsed ? "justify-center" : ""}`}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 font-bold text-red-700">{initials(user?.name)}</div>
        {!collapsed && <div className="min-w-0"><p className="truncate font-semibold">{user?.name}</p><p className="text-xs capitalize text-slate-500">{user?.role}</p></div>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {links.map(([label,path,Icon]) => <NavLink key={path} to={path} onClick={() => setMobile(false)} className={({isActive}) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${isActive ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"} ${collapsed ? "justify-center" : ""}`}><Icon size={19}/>{!collapsed && label}</NavLink>)}
      </nav>
      <div className="border-t p-3">
        <button onClick={signOut} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 ${collapsed ? "justify-center" : ""}`}><LogOut size={19}/>{!collapsed && "Logout"}</button>
      </div>
    </aside>

    <div className={`flex min-w-0 flex-1 flex-col transition-all ${collapsed ? "md:ml-20" : "md:ml-72"}`}>
      <header className="sticky top-0 z-40 flex h-20 items-center gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
        <button className="rounded-xl p-2 hover:bg-slate-100 md:hidden" onClick={() => setMobile(true)}><Menu/></button>
        <button className="hidden rounded-xl p-2 hover:bg-slate-100 md:block" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight/> : <ChevronLeft/>}</button>
        <div className="hidden max-w-xl flex-1 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 md:flex"><Search size={18} className="text-slate-400"/><input className="w-full bg-transparent text-sm outline-none" placeholder="Search FIX MOTO..." /></div>
        <div className="ml-auto flex items-center gap-3">
          <NavLink to={user?.role === "admin" ? "/admin" : user?.role === "mechanic" ? "/mechanic" : "/customer"} className="rounded-xl p-2 hover:bg-slate-100"><Bell size={20}/></NavLink>
          <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user?.name}</p><p className="text-xs capitalize text-slate-400">{user?.role}</p></div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{initials(user?.name)}</div>
        </div>
      </header>
      <main className="min-w-0 flex-1 p-4 md:p-7">{children}</main>
    </div>
  </div>;
}