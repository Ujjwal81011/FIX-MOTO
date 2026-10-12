import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, CreditCard, QrCode, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/axios";

const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function makeQrUrl(upiId) {
  if (!upiId) return "";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("FIX MOTO")}&am=199.00&cu=INR&tn=${encodeURIComponent("FIX MOTO Mechanic Subscription")}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;
}
const statusLabels = {
  unverified: "Admin verification required",
  free: "Free trial active",
  required: "Subscription required",
  pending: "Awaiting Admin acknowledgement",
  active: "Subscription active",
  expired: "Subscription expired",
};

export default function Subscription() {
  const [data, setData] = useState(null);
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/subscriptions/mine");
      setData(response.data.subscription);
      setReference(response.data.subscription?.pendingPayment?.transactionReference || "");
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load subscription details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true); setMessage(""); setError("");
    try {
      const response = await api.post("/subscriptions/mine/payment", { transactionReference: reference.trim() });
      setMessage(response.data.message || "Payment request submitted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not submit payment request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) return <div className="card p-10 text-center"><RefreshCw className="mx-auto animate-spin"/><p className="mt-3">Loading subscription...</p></div>;

  const state = data?.state || "unverified";
  const needsPayment = ["required", "expired", "pending"].includes(state);

  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-sm text-slate-500">Mechanic membership</p><h1 className="mt-1 text-3xl font-black">Subscription</h1><p className="mt-2 text-slate-500">Your first five completed jobs are free. After that, subscribe to keep receiving new requests.</p></div>
      <button type="button" onClick={load} className="btn-secondary"><RefreshCw size={16}/> Refresh status</button>
    </div>

    {message && <div className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</div>}
    {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="card p-5"><p className="text-sm text-slate-500">Monthly price</p><p className="mt-2 text-3xl font-black">₹{data?.amount ?? 199}</p><p className="mt-1 text-xs text-slate-400">One month after Admin acknowledgement</p></div>
      <div className="card p-5"><p className="text-sm text-slate-500">Free services used</p><p className="mt-2 text-3xl font-black">{Math.min(data?.freeServicesUsed || 0, data?.freeServiceLimit || 5)} / {data?.freeServiceLimit || 5}</p><p className="mt-1 text-xs text-slate-400">Only completed jobs count</p></div>
      <div className="card p-5"><p className="text-sm text-slate-500">Status</p><p className="mt-2 text-lg font-bold">{statusLabels[state] || state}</p><p className="mt-1 text-xs text-slate-400">{state === "active" ? `Expires ${dateLabel(data?.endDate)}` : state === "free" ? `${data?.freeServicesRemaining ?? 5} free job(s) remaining` : "New requests require an active subscription"}</p></div>
    </div>

    {state === "active" && <div className="card flex items-start gap-3 border border-green-200 p-5"><CheckCircle2 className="mt-0.5 text-green-600"/><div><h2 className="font-bold text-green-800">Your subscription is active</h2><p className="mt-1 text-sm text-slate-600">Active from {dateLabel(data?.startDate)} until {dateLabel(data?.endDate)}. Keep your mechanic profile verified to receive new requests.</p><Link to="/mechanic/requests" className="btn-primary mt-4 inline-flex">View emergency requests</Link></div></div>}

    {state === "free" && <div className="card flex items-start gap-3 p-5"><ShieldCheck className="mt-0.5 text-green-600"/><div><h2 className="font-bold">Your free trial is available</h2><p className="mt-1 text-sm text-slate-600">You can receive new requests while your profile is Admin-verified and you have free services remaining.</p><Link to="/mechanic/requests" className="btn-primary mt-4 inline-flex">View emergency requests</Link></div></div>}

    {state === "unverified" && <div className="card flex items-start gap-3 p-5"><ShieldCheck className="mt-0.5 text-amber-600"/><div><h2 className="font-bold">Admin verification required</h2><p className="mt-1 text-sm text-slate-600">Subscription does not replace mechanic verification. Ask Admin to verify your mechanic profile first.</p></div></div>}

    {needsPayment && <div className="card p-6 md:p-8">
      <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600"><Wallet/></div><div><h2 className="text-xl font-black">Pay ₹199 to Admin</h2><p className="text-sm text-slate-500">Scan the official QR, make the payment, then submit the UTR/reference if available.</p></div></div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4 text-center">
          {data?.adminUpiId ? <img src={makeQrUrl(data.adminUpiId)} alt="FIX MOTO Admin ₹199 subscription payment QR" className="mx-auto max-h-64 w-full max-w-64 rounded-lg object-contain"/> : <div className="mx-auto grid h-48 w-48 place-items-center rounded-xl bg-slate-100 text-slate-400"><QrCode size={64}/></div>}
          <p className="mt-3 font-semibold">FIX MOTO Admin</p>
          {data?.adminUpiId ? <><p className="mt-1 break-all text-sm text-slate-600">UPI ID: <strong>{data.adminUpiId}</strong></p><a className="btn-secondary mt-3 inline-flex" href={`upi://pay?pa=${encodeURIComponent(data.adminUpiId)}&pn=${encodeURIComponent("FIX MOTO")}&am=199.00&cu=INR&tn=${encodeURIComponent("FIX MOTO Mechanic Subscription")}`}>Open UPI app</a></> : <p className="mt-1 text-xs text-amber-700">Admin has not added a UPI ID yet. Please try again later.</p>}
        </div>
        <div>
          {state === "pending" ? <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Clock3 className="mr-2 inline" size={16}/>Payment request submitted. New requests unlock after Admin verifies receipt.</div> : <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><CalendarClock className="mr-2 inline" size={16}/>Subscription begins only after Admin acknowledgement and lasts one calendar month.</div>}
          <form onSubmit={submitPayment} className="space-y-4">
            <div><label className="label">UPI transaction reference / UTR (optional)</label><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder="Enter UTR or transaction reference"/><p className="mt-1 text-xs text-slate-400">No screenshot is required. Admin will verify the payment manually.</p></div>
            <button className="btn-primary w-full" disabled={submitting || state === "unverified" || !data?.adminUpiId}>{submitting ? "Submitting..." : state === "pending" ? "Update payment reference" : "I have paid — submit for Admin approval"}</button>
          </form>
        </div>
      </div>
    </div>}
  </div>;
}
