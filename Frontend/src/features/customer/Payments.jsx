import { useEffect, useMemo, useState } from "react";
import { CreditCard, ReceiptIndianRupee, RefreshCw, QrCode, CheckCircle2 } from "lucide-react";
import api from "../../utils/axios";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const statusLabel = { pending: "Awaiting payment", awaiting_confirmation: "Waiting for mechanic confirmation", proof_rejected: "Confirmation needs attention", paid: "Paid", failed: "Failed", refunded: "Refunded" };

export default function Payments() {
  const [items, setItems] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [methods, setMethods] = useState({});
  const [transactions, setTransactions] = useState({});
  const [busy, setBusy] = useState({});
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setMessage("");
      const [paymentsResponse, requestsResponse] = await Promise.all([api.get("/payments/mine"), api.get("/emergency/mine")]);
      setItems(paymentsResponse.data.payments || []);
      setCompleted((requestsResponse.data.requests || []).filter((request) => request.status === "completed" && request.mechanic && request.billStatus === "approved"));
    } catch (e) { setMessage(e.response?.data?.message || "Could not load payment information."); }
  };
  useEffect(() => { load(); }, []);

  const paid = useMemo(() => items.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0), [items]);
  const pending = useMemo(() => items.filter((p) => p.status !== "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0), [items]);
  const getPayment = (requestId) => items.find((p) => String(p.request?._id || p.request) === String(requestId));
  const qrImage = (upiId, amount, requestId) => {
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("FIX MOTO Mechanic")}&am=${encodeURIComponent(Number(amount).toFixed(2))}&cu=INR&tn=${encodeURIComponent(`FIX MOTO ${requestId}`)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
  };

  const startPayment = async (request) => {
    const method = methods[request._id] || "upi";
    setBusy((old) => ({ ...old, [request._id]: true })); setMessage("");
    try {
      const { data } = await api.post("/payments", { requestId: request._id, method });
      setItems((old) => {
        const without = old.filter((p) => String(p.request?._id || p.request) !== String(request._id));
        return [{ ...data.payment, mechanicUpiId: data.mechanicUpiId || "" }, ...without];
      });
      setMessage(method === "upi" ? "Use the mechanic's UPI ID/QR to pay, then click Payment Done. The mechanic must verify the actual credit." : "Hand the cash to the mechanic, then click Payment Done. The mechanic must confirm receipt.");
    } catch (e) { setMessage(e.response?.data?.message || "Could not start payment."); }
    finally { setBusy((old) => ({ ...old, [request._id]: false })); }
  };

  const paymentDone = async (request) => {
    const payment = getPayment(request._id);
    if (!payment?._id) return setMessage("Select a payment method and continue first.");
    if (payment.method === "upi" && !window.confirm("Have you completed the UPI transfer to the mechanic? The mechanic will verify receipt before marking it paid.")) return;
    if (payment.method === "cash" && !window.confirm("Have you handed the cash to the mechanic? The mechanic will verify receipt before marking it paid.")) return;
    setBusy((old) => ({ ...old, [request._id]: true })); setMessage("");
    try {
      const { data } = await api.patch(`/payments/${payment._id}/pay`, { transactionId: (transactions[request._id] || "").trim() });
      setMessage(data.message || "Confirmation request sent to mechanic."); await load();
    } catch (e) { setMessage(e.response?.data?.message || "Could not submit payment confirmation request."); }
    finally { setBusy((old) => ({ ...old, [request._id]: false })); }
  };

  return <div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-black">Payments</h1><p className="mt-2 text-slate-500">Pay the mechanic directly. The mechanic confirms after verifying receipt.</p></div><button onClick={load} className="btn-secondary"><RefreshCw size={16}/>Refresh</button></div>
    {message && <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{message}</p>}
    <div className="mt-7 grid gap-5 md:grid-cols-3"><div className="card p-6"><ReceiptIndianRupee className="text-red-600"/><p className="mt-5 text-sm text-slate-500">Confirmed paid</p><p className="mt-1 text-3xl font-black">{money(paid)}</p></div><div className="card p-6"><CreditCard/><p className="mt-5 text-sm text-slate-500">Unconfirmed payments</p><p className="mt-1 text-3xl font-black">{money(pending)}</p></div><div className="card p-6"><p className="text-sm text-slate-500">Payment records</p><p className="mt-3 text-3xl font-black">{items.length}</p></div></div>
    <section className="mt-8"><h2 className="text-xl font-bold">Completed services</h2><div className="mt-4 space-y-4">
      {completed.map((request) => { const payment = getPayment(request._id); const method = payment?.method || methods[request._id] || "upi"; const amount = payment?.amount ?? request.finalAmount; const upiId = payment?.mechanicUpiId || ""; const canRequest = payment && ["pending", "proof_rejected"].includes(payment.status);
        return <div className="card p-5" key={request._id}><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold capitalize">{request.issueType} · {request.vehicle?.make} {request.vehicle?.model}</p><p className="mt-1 text-sm text-slate-500">Approved bill: {money(amount)}</p>{payment && <p className="mt-2 text-sm font-semibold">Status: {statusLabel[payment.status] || payment.status}</p>}{payment?.transactionId && <p className="mt-1 text-xs text-slate-500">UTR: {payment.transactionId}</p>}</div>{payment?.status === "paid" && <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"><CheckCircle2 className="mr-1 inline" size={14}/>Paid</span>}</div>
          {!payment && <div className="mt-4"><label className="label">Payment method</label><select className="input" value={method} onChange={(e) => setMethods((old) => ({ ...old, [request._id]: e.target.value }))}><option value="upi">UPI</option><option value="cash">Cash</option></select><button disabled={busy[request._id]} onClick={() => startPayment(request)} className="btn-primary mt-3">{busy[request._id] ? "Please wait..." : "Continue"}</button></div>}
          {payment?.status !== "paid" && payment?.method === "upi" && payment && <div className="mt-5 rounded-xl border p-4"><div className="flex items-center gap-2 font-bold"><QrCode size={20}/>Pay using UPI</div>{upiId ? <><p className="mt-2 text-sm">Mechanic UPI ID: <strong>{upiId}</strong></p><button className="btn-secondary mt-2" onClick={() => navigator.clipboard?.writeText(upiId)}>Copy UPI ID</button><img className="mt-3 h-56 w-56 rounded-lg border bg-white p-2" src={qrImage(upiId, amount, request._id)} alt="UPI payment QR code"/><a className="btn-primary mt-3 inline-flex" href={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("FIX MOTO Mechanic")}&am=${encodeURIComponent(Number(amount).toFixed(2))}&cu=INR&tn=${encodeURIComponent(`FIX MOTO ${request._id}`)}`}>Open UPI app</a></> : <p className="mt-2 text-sm text-amber-700">Mechanic UPI ID is not available. Ask the mechanic to add it in their profile before paying by UPI.</p>}
            {canRequest && <div className="mt-4"><label className="label">UTR / transaction ID (optional)</label><input className="input" maxLength={150} value={transactions[request._id] || ""} onChange={(e) => setTransactions((old) => ({ ...old, [request._id]: e.target.value }))} placeholder="Enter UTR if available"/><button disabled={busy[request._id]} onClick={() => paymentDone(request)} className="btn-primary mt-3">{busy[request._id] ? "Sending..." : "Payment Done"}</button></div>}
            {payment.status === "awaiting_confirmation" && <p className="mt-3 text-sm text-amber-700">Confirmation request sent. Payment will show as Paid only after the mechanic verifies the actual transaction.</p>}</div>}
          {payment?.method === "cash" && payment.status !== "paid" && <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-sm">Hand over the cash directly to the mechanic. Click below after handing it over.</p>{canRequest && <button disabled={busy[request._id]} onClick={() => paymentDone(request)} className="btn-primary mt-3">{busy[request._id] ? "Sending..." : "Payment Done"}</button>}{payment.status === "awaiting_confirmation" && <p className="mt-2 text-sm text-amber-700">Waiting for mechanic to confirm cash received.</p>}</div>}
        </div>;
      })}
      {completed.length === 0 && <div className="card p-6 text-sm text-slate-500">No completed, approved services awaiting payment.</div>}
    </div></section>
    <section className="mt-8"><h2 className="text-xl font-bold">Payment history</h2><div className="mt-4 space-y-3">{items.map((p) => <div className="card flex flex-wrap justify-between gap-3 p-5" key={p._id}><div><p className="font-bold">{money(p.amount)} · {p.method}</p><p className="mt-1 text-sm text-slate-500">{statusLabel[p.status] || p.status} · {new Date(p.createdAt).toLocaleString()}</p>{p.paidAt && <p className="mt-1 text-xs text-slate-500">Confirmed: {new Date(p.paidAt).toLocaleString()}</p>}</div>{p.transactionId && <p className="text-sm text-slate-500">UTR: {p.transactionId}</p>}</div>)}</div></section>
  </div>;
}
