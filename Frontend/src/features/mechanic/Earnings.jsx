
import { useEffect, useState } from "react";
import {
  CircleDollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import api from "../../utils/axios";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export default function Earnings() {
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/payments/mechanic");
      setPayments(data.payments || []);
      setMessage("");
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Could not load payment information."
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmPayment = async (payment) => {
    const text =
      payment.method === "cash"
        ? "Confirm that you have received this cash payment?"
        : "Confirm only after checking the actual UPI transaction in your payment app or bank account. Have you received it?";

    if (!window.confirm(text)) return;

    setBusyId(payment._id);
    setMessage("");

    try {
      const { data } = await api.patch(
        `/payments/${payment._id}/confirm`
      );

      setMessage(data.message || "Payment confirmed.");
      await load();
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Could not confirm payment."
      );
    } finally {
      setBusyId("");
    }
  };

  const rejectProof = async (payment) => {
    const reason = window.prompt(
      "Enter the reason for rejecting this payment proof:"
    );

    if (!reason?.trim()) return;

    setBusyId(payment._id);
    setMessage("");

    try {
      const { data } = await api.patch(
        `/payments/${payment._id}/reject`,
        { reason: reason.trim() }
      );

      setMessage(data.message || "Payment proof rejected.");
      await load();
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Could not reject payment proof."
      );
    } finally {
      setBusyId("");
    }
  };

  const paidTotal = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const awaiting = payments.filter((p) =>
    ["pending", "awaiting_confirmation", "proof_rejected"].includes(p.status)
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Earnings & Payments</h1>
          <p className="mt-2 text-slate-500">
            Review payment proofs and confirm money received.
          </p>
        </div>

        <button onClick={load} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{message}</p>
      )}

      <div className="card mt-7 p-6">
        <CircleDollarSign className="text-red-600" />
        <p className="mt-4 text-sm text-slate-500">Confirmed payments</p>
        <p className="mt-1 text-3xl font-black">{money(paidTotal)}</p>
        <p className="mt-2 text-xs text-slate-500">
          This is the total of payments returned by the current mechanic
          payments endpoint.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Payments requiring attention</h2>

        <div className="mt-4 space-y-4">
          {awaiting.map((payment) => (
            <div className="card p-5" key={payment._id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-black">{money(payment.amount)}</p>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    Method: {payment.method}
                  </p>
                  <p className="mt-1 text-sm">
                    Status: {payment.status.replaceAll("_", " ")}
                  </p>
                  {payment.transactionId && (
                    <p className="mt-1 text-sm text-slate-500">
                      UTR: {payment.transactionId}
                    </p>
                  )}
                  {payment.customer?.name && (
                    <p className="mt-1 text-sm text-slate-500">
                      Customer: {payment.customer.name}
                    </p>
                  )}
                </div>
              </div>

              {payment.method === "upi" && payment.proofUrl && (
                <div className="mt-4 rounded-xl border p-4">
                  <p className="mb-3 flex items-center gap-2 font-semibold">
                    <ImageIcon size={18} />
                    Customer payment screenshot
                  </p>

                  <a
                    href={payment.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block"
                  >
                    <img
                      src={payment.proofUrl}
                      alt="Customer payment proof"
                      className="max-h-80 max-w-full rounded-lg border object-contain"
                    />
                  </a>

                  <p className="mt-2 text-xs text-slate-500">
                    Open the image for a larger view. Verify the actual
                    transaction before confirming.
                  </p>
                </div>
              )}

              {payment.method === "upi" &&
                payment.status === "awaiting_confirmation" && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      disabled={busyId === payment._id}
                      onClick={() => confirmPayment(payment)}
                      className="btn-primary"
                    >
                      <CheckCircle size={16} />
                      Confirm Payment Received
                    </button>

                    <button
                      disabled={busyId === payment._id}
                      onClick={() => rejectProof(payment)}
                      className="btn-secondary"
                    >
                      <XCircle size={16} />
                      Reject Proof
                    </button>
                  </div>
                )}

              {payment.method === "cash" && payment.status === "pending" && (
                <button
                  disabled={busyId === payment._id}
                  onClick={() => confirmPayment(payment)}
                  className="btn-primary mt-4"
                >
                  <CheckCircle size={16} />
                  Confirm Cash Received
                </button>
              )}

              {payment.status === "proof_rejected" && (
                <p className="mt-3 text-sm text-amber-700">
                  Proof rejected. The customer can upload a corrected screenshot.
                </p>
              )}
            </div>
          ))}

          {awaiting.length === 0 && (
            <div className="card p-6 text-sm text-slate-500">
              No pending payment confirmations.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
