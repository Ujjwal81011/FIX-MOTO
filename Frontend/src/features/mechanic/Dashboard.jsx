import { useEffect, useState } from "react";
import { CircleDollarSign, Clock3, CreditCard, Star, Wrench, Zap, ShieldCheck } from "lucide-react";
import StatCard from "../../Components/StatCard";
import { Link } from "react-router-dom";
import api from "../../utils/axios";

const statusText = {
  unverified: "Waiting for Admin verification",
  free: "Free trial active",
  required: "Subscription required",
  pending: "Payment awaiting Admin acknowledgement",
  active: "Subscription active",
  expired: "Subscription expired",
};

export default function Dashboard() {
  const [subscription, setSubscription] = useState(null);
  useEffect(() => {
    api.get("/subscriptions/mine").then(({ data }) => setSubscription(data.subscription)).catch(() => {});
  }, []);

  const state = subscription?.state;
  const blocked = ["required", "pending", "expired", "unverified"].includes(state);

  return <div className="mx-auto max-w-7xl">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm text-slate-500">Mechanic dashboard</p><h1 className="mt-1 text-3xl font-black">Ready to help?</h1><p className="mt-2 text-slate-500">Manage requests, active jobs, earnings and your subscription.</p></div><Link to={blocked ? "/mechanic/subscription" : "/mechanic/requests"} className="btn-primary"><Zap size={18}/>{blocked ? "View Subscription" : "View Emergency Requests"}</Link></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard icon={Zap} label="New requests" value="0"/><StatCard icon={Clock3} label="Active jobs" value="0"/><StatCard icon={CircleDollarSign} label="This month" value="₹0"/><StatCard icon={Star} label="Rating" value="0.0"/></div>
    {subscription && <div className={`mt-7 rounded-2xl border p-5 ${blocked ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${blocked ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{blocked ? <CreditCard/> : <ShieldCheck/>}</div><div className="flex-1"><h2 className="font-bold">{statusText[state] || "Mechanic subscription"}</h2><p className="mt-1 text-sm text-slate-600">{state === "free" ? `${subscription.freeServicesRemaining} of 5 free completed services remaining.` : state === "active" ? `Active until ${new Date(subscription.endDate).toLocaleDateString("en-IN")}.` : state === "pending" ? "New requests unlock after Admin confirms the payment has been received." : "After 5 free completed services, ₹199/month is required to receive new requests."}</p></div><Link to="/mechanic/subscription" className="btn-secondary shrink-0">Manage subscription</Link></div></div>}
    <div className="mt-7 card p-7"><div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600"><Wrench/></div><div><h2 className="font-bold">Complete your mechanic profile</h2><p className="mt-1 text-sm text-slate-500">Add expertise, service area and verification documents to receive eligible jobs.</p></div><Link to="/mechanic/profile" className="btn-secondary ml-auto hidden sm:inline-flex">Open profile</Link></div></div>
  </div>;
}
