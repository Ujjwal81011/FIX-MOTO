import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, QrCode, RefreshCw, Save, XCircle } from "lucide-react";
import api from "../../utils/axios";

const dateLabel = (value) => value ? new Date(value).toLocaleString("en-IN") : "—";
const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

function makeQrUrl(upiId) {
  if (!upiId) return "";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("FIX MOTO")}&am=199.00&cu=INR&tn=${encodeURIComponent("FIX MOTO Mechanic Subscription")}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiLink)}`;
}

export default function SubscriptionPayments() {
  const [payments, setPayments] = useState([]);
  const [adminUpiId, setAdminUpiId] = useState("");
  const [savedUpiId, setSavedUpiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsResponse, settingsResponse] = await Promise.all([
        api.get("/subscriptions/admin/payments?status=pending"),
        api.get("/subscriptions/admin/settings"),
      ]);
      setPayments(paymentsResponse.data.payments || []);
      const saved = settingsResponse.data.settings?.adminUpiId || "";
      setAdminUpiId(saved);
      setSavedUpiId(saved);
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Could not load subscription settings/payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveUpiId = async (e) => {
    e.preventDefault();
    const value = adminUpiId.trim().toLowerCase();
    if (value && !UPI_ID_REGEX.test(value)) {
      setError("Please enter a valid UPI ID, for example yourname@upi.");
      setMessage("");
      return;
    }
    setSavingSettings(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.put("/subscriptions/admin/settings", { adminUpiId: value });
      const saved = data.settings?.adminUpiId || "";
      setAdminUpiId(saved);
      setSavedUpiId(saved);
      setMessage(data.message || "Admin UPI ID saved successfully.");
    } catch (e) {
      setError(e.response?.data?.message || "Could not save Admin UPI ID.");
    } finally {
      setSavingSettings(false);
    }
  };

  const review = async (payment, action) => {
    const note = action === "reject"
      ? window.prompt("Reason for rejecting this payment (optional):", "")
      : window.prompt("Admin note (optional):", "");
    if (note === null) return;
    setWorkingId(payment._id);
    setMessage("");
    setError("");
    try {
      const endpoint = action === "approve" ? "acknowledge" : "reject";
      const { data } = await api.patch(`/subscriptions/admin/payments/${payment._id}/${endpoint}`, { note });
      setMessage(data.message || "Subscription payment reviewed.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Could not review this payment.");
    } finally {
      setWorkingId("");
    }
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-sm text-slate-500">Admin control center</p><h1 className="mt-1 text-3xl font-black">Subscription Payments</h1><p className="mt-2 text-slate-500">Set your UPI ID once, then review ₹199/month mechanic subscription payments.</p></div>
      <button onClick={load} className="btn-secondary" disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </div>

    {message && <div role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</div>}
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

    <section className="card p-5 md:p-6">
      <div className="grid gap-6 md:grid-cols-[1fr_260px] md:items-center">
        <div>
          <h2 className="text-xl font-bold">Admin UPI settings</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your UPI ID once and save it. It is stored in the database, not in your .env file. Mechanics will automatically see a ₹199 payment QR generated from this UPI ID.</p>
          <form onSubmit={saveUpiId} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1"><label htmlFor="admin-upi-id" className="label">Your UPI ID</label><input id="admin-upi-id" className="input" value={adminUpiId} onChange={(e) => setAdminUpiId(e.target.value)} maxLength={100} placeholder="yourname@upi" autoComplete="off" /></div>
            <button type="submit" disabled={savingSettings || adminUpiId.trim().toLowerCase() === savedUpiId} className="btn-primary self-end"><Save size={16}/>{savingSettings ? "Saving..." : "Save UPI ID"}</button>
          </form>
          {savedUpiId && <p className="mt-2 break-all text-sm text-green-700">Saved UPI ID: <strong>{savedUpiId}</strong></p>}
          {!savedUpiId && <p className="mt-2 text-xs text-amber-700">Add your UPI ID to enable mechanic subscription payments.</p>}
        </div>
        <div className="rounded-xl border border-slate-200 p-4 text-center">
          {savedUpiId ? <img src={makeQrUrl(savedUpiId)} alt="Admin ₹199 subscription UPI QR" className="mx-auto h-52 w-52 rounded-lg bg-white p-1" /> : <div className="mx-auto grid h-52 w-52 place-items-center rounded-lg bg-slate-50 text-slate-400"><QrCode size={54}/></div>}
          <p className="mt-2 font-bold">₹199 · Mechanic subscription</p>
          <p className="mt-1 text-xs text-slate-500">{savedUpiId ? "QR generated from saved UPI ID" : "QR appears after saving your UPI ID"}</p>
        </div>
      </div>
    </section>

    <section>
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Pending subscription payments</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{payments.length} pending</span></div>
      {loading ? <div className="card p-10 text-center"><RefreshCw className="mx-auto animate-spin"/><p className="mt-3">Loading pending payments...</p></div> : payments.length === 0 ? <div className="card p-12 text-center"><CheckCircle2 className="mx-auto text-green-500" size={36}/><h2 className="mt-3 font-bold">No pending subscription payments</h2><p className="mt-1 text-sm text-slate-500">New payment requests will appear here.</p></div> : <div className="space-y-4">{payments.map((payment) => <article key={payment._id} className="card p-5 md:p-6"><div className="flex flex-col justify-between gap-4 md:flex-row"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{payment.mechanic?.name || "Mechanic"}</h3><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"><Clock3 className="mr-1 inline" size={13}/>Pending</span></div><p className="text-sm text-slate-500">{payment.mechanic?.email || ""}{payment.mechanic?.phone ? ` · ${payment.mechanic.phone}` : ""}</p><p className="text-sm">Business: <span className="font-medium">{payment.mechanicProfile?.businessName || "—"}</span></p><p className="text-sm">Free services completed: <span className="font-medium">{payment.mechanicProfile?.freeServicesUsed ?? 0} / 5</span></p><p className="text-sm">Amount: <strong>₹{payment.amount}</strong></p><p className="text-sm">Transaction reference: <strong>{payment.transactionReference || "Not provided"}</strong></p><p className="text-xs text-slate-400">Submitted: {dateLabel(payment.createdAt)}</p></div><div className="flex flex-col gap-2 sm:min-w-48"><button onClick={() => review(payment, "approve")} disabled={workingId === payment._id} className="btn-primary justify-center">{workingId === payment._id ? <RefreshCw className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Acknowledge payment</button><button onClick={() => review(payment, "reject")} disabled={workingId === payment._id} className="btn-secondary justify-center"><XCircle size={16}/> Reject / needs review</button><p className="text-xs text-slate-400">Acknowledge only after confirming the money arrived in your account.</p></div></div></article>)}</div>}
    </section>
  </div>;
}
