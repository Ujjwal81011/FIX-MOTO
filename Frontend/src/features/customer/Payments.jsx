
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  ReceiptIndianRupee,
  RefreshCw,
  Upload,
  QrCode,
} from "lucide-react";
import api from "../../utils/axios";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const statusLabel = {
  pending: "Pending",
  awaiting_confirmation: "Awaiting mechanic confirmation",
  proof_rejected: "Proof rejected — upload again",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export default function Payments() {
  const [items, setItems] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [methods, setMethods] = useState({});
  const [files, setFiles] = useState({});
  const [transactions, setTransactions] = useState({});
  const [busy, setBusy] = useState({});
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setMessage("");

      const [paymentsResponse, requestsResponse] = await Promise.all([
        api.get("/payments/mine"),
        api.get("/emergency/mine"),
      ]);

      setItems(paymentsResponse.data.payments || []);

      setCompleted(
        (requestsResponse.data.requests || []).filter(
          (request) => request.status === "completed" && request.mechanic
        )
      );
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Could not load payment information."
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const paid = useMemo(
    () =>
      items
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [items]
  );

  const pending = useMemo(
    () =>
      items
        .filter((payment) =>
          ["pending", "awaiting_confirmation", "proof_rejected"].includes(
            payment.status
          )
        )
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [items]
  );

  const getPayment = (requestId) =>
    items.find(
      (payment) =>
        String(payment.request?._id || payment.request) === String(requestId)
    );

  const createOrGetPayment = async (request, method) => {
    const existing = getPayment(request._id);

    if (existing) {
      if (existing.method !== method && existing.status !== "proof_rejected") {
        throw new Error(
          "A payment record already exists. Continue with its current payment method."
        );
      }

      return existing;
    }

    const { data } = await api.post("/payments", {
      requestId: request._id,
      method,
    });

    return data.payment;
  };

  const startPayment = async (request, method) => {
    setBusy((old) => ({ ...old, [request._id]: true }));
    setMessage("");

    try {
      const payment = await createOrGetPayment(request, method);

      if (!payment?._id) {
        throw new Error("The server did not return a payment record.");
      }

      setMethods((old) => ({ ...old, [request._id]: method }));

      if (method === "cash") {
        setMessage(
          "Cash payment selected. Ask the mechanic to confirm after receiving the cash."
        );
      } else {
        setMessage(
          "UPI selected. Complete the payment and upload its screenshot below."
        );
      }

      await load();
    } catch (e) {
      setMessage(
        e.response?.data?.message || e.message || "Could not start payment."
      );
    } finally {
      setBusy((old) => ({ ...old, [request._id]: false }));
    }
  };

  const uploadProof = async (request) => {
    const payment = getPayment(request._id);
    const file = files[request._id];

    if (!payment?._id) {
      setMessage("Please select UPI and create the payment record first.");
      return;
    }

    if (!file) {
      setMessage("Please select your payment screenshot.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Upload a JPG, PNG or WebP screenshot.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Screenshot must be 5 MB or smaller.");
      return;
    }

    setBusy((old) => ({ ...old, [request._id]: true }));
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("proof", file);

      const transactionId = (transactions[request._id] || "").trim();
      if (transactionId) {
        formData.append("transactionId", transactionId);
      }

      const { data } = await api.post(
        `/payments/${payment._id}/proof`,
        formData
      );

      setMessage(data.message || "Screenshot uploaded successfully.");
      setFiles((old) => ({ ...old, [request._id]: null }));

      await load();
    } catch (e) {
      setMessage(
        e.response?.data?.message || "Could not upload payment screenshot."
      );
    } finally {
      setBusy((old) => ({ ...old, [request._id]: false }));
    }
  };

  const qrImage = (upiId, amount, requestId) => {
    const upiLink = `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(
      "FIX MOTO Mechanic"
    )}&am=${encodeURIComponent(
      Number(amount).toFixed(2)
    )}&cu=INR&tn=${encodeURIComponent(`FIX MOTO ${requestId}`)}`;

    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      upiLink
    )}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Payments</h1>
          <p className="mt-2 text-slate-500">
            Pay for completed services and submit payment proof.
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

      <div className="mt-7 grid gap-5 md:grid-cols-3">
        <div className="card p-6">
          <ReceiptIndianRupee className="text-red-600" />
          <p className="mt-5 text-sm text-slate-500">Total paid</p>
          <p className="mt-1 text-3xl font-black">{money(paid)}</p>
        </div>

        <div className="card p-6">
          <CreditCard />
          <p className="mt-5 text-sm text-slate-500">Awaiting payment/confirmation</p>
          <p className="mt-1 text-3xl font-black">{money(pending)}</p>
        </div>

        <div className="card p-6">
          <p className="text-sm text-slate-500">Payment records</p>
          <p className="mt-3 text-3xl font-black">{items.length}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Completed services</h2>

        <div className="mt-4 space-y-4">
          {completed.map((request) => {
            const payment = getPayment(request._id);
            const method = methods[request._id] || payment?.method || "upi";
            const amount = payment?.amount ?? request.finalAmount;
            const upiId =
              payment?.mechanicUpiId ||
              payment?.mechanicProfile?.upiId ||
              "";

            const canUpload =
              method === "upi" &&
              payment &&
              ["pending", "proof_rejected"].includes(payment.status);

            return (
              <div className="card p-5" key={request._id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-bold capitalize">
                      {request.issueType} · {request.vehicle?.make}{" "}
                      {request.vehicle?.model}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Final amount: {money(amount)}
                    </p>
                    {payment && (
                      <p className="mt-2 text-sm font-semibold">
                        Status: {statusLabel[payment.status] || payment.status}
                      </p>
                    )}
                    {payment?.rejectionReason && (
                      <p className="mt-1 text-sm text-red-600">
                        Reason: {payment.rejectionReason}
                      </p>
                    )}
                  </div>

                  {payment?.status === "paid" && (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Paid
                    </span>
                  )}
                </div>

                {!payment && (
                  <div className="mt-4">
                    <label className="label">Payment method</label>
                    <select
                      className="input"
                      value={method}
                      onChange={(e) =>
                        setMethods((old) => ({
                          ...old,
                          [request._id]: e.target.value,
                        }))
                      }
                    >
                      <option value="upi">UPI QR</option>
                      <option value="cash">Cash</option>
                    </select>

                    <button
                      disabled={busy[request._id]}
                      onClick={() => startPayment(request, method)}
                      className="btn-primary mt-3"
                    >
                      {busy[request._id] ? "Please wait..." : "Continue"}
                    </button>
                  </div>
                )}

                {payment?.status !== "paid" &&
                  payment?.method === "upi" &&
                  ["pending", "proof_rejected", "awaiting_confirmation"].includes(
                    payment.status
                  ) && (
                    <div className="mt-5 rounded-xl border p-4">
                      <div className="flex items-center gap-2 font-bold">
                        <QrCode size={20} />
                        Pay using UPI
                      </div>

                      {upiId ? (
                        <>
                          <p className="mt-2 text-sm">
                            UPI ID: <strong>{upiId}</strong>
                          </p>
                          <img
                            className="mt-3 h-56 w-56 rounded-lg border bg-white p-2"
                            src={qrImage(upiId, amount, request._id)}
                            alt="UPI payment QR code"
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            Check the recipient name and amount in your UPI app
                            before paying.
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-amber-700">
                          The mechanic's UPI ID has not been returned by the
                          backend yet. Please contact the mechanic before paying.
                        </p>
                      )}

                      {canUpload && (
                        <div className="mt-5 space-y-3">
                          <div>
                            <label className="label">
                              UPI transaction ID / UTR (optional)
                            </label>
                            <input
                              className="input"
                              value={transactions[request._id] || ""}
                              onChange={(e) =>
                                setTransactions((old) => ({
                                  ...old,
                                  [request._id]: e.target.value,
                                }))
                              }
                              placeholder="Enter UTR"
                              maxLength={150}
                            />
                          </div>

                          <div>
                            <label className="label">
                              Payment screenshot (JPG, PNG or WebP)
                            </label>
                            <input
                              className="input"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) =>
                                setFiles((old) => ({
                                  ...old,
                                  [request._id]: e.target.files?.[0] || null,
                                }))
                              }
                            />
                          </div>

                          <button
                            disabled={busy[request._id]}
                            onClick={() => uploadProof(request)}
                            className="btn-primary"
                          >
                            <Upload size={16} />
                            {busy[request._id]
                              ? "Uploading..."
                              : "Upload payment proof"}
                          </button>
                        </div>
                      )}

                      {payment.status === "awaiting_confirmation" && (
                        <p className="mt-3 text-sm text-amber-700">
                          Proof submitted. Wait for the mechanic to verify the
                          transaction.
                        </p>
                      )}
                    </div>
                  )}

                {payment?.method === "cash" &&
                  payment.status === "pending" && (
                    <p className="mt-3 text-sm text-slate-600">
                      Pay the mechanic in cash. The mechanic must confirm
                      receipt before this payment is marked Paid.
                    </p>
                  )}
              </div>
            );
          })}

          {completed.length === 0 && (
            <div className="card p-6 text-sm text-slate-500">
              No completed services are awaiting payment.
            </div>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Payment history</h2>
        <div className="mt-4 space-y-3">
          {items.map((payment) => (
            <div className="card flex flex-wrap justify-between gap-3 p-5" key={payment._id}>
              <div>
                <p className="font-bold">
                  {money(payment.amount)} · {payment.method}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {statusLabel[payment.status] || payment.status} ·{" "}
                  {new Date(payment.createdAt).toLocaleString()}
                </p>
              </div>
              {payment.transactionId && (
                <p className="text-sm text-slate-500">
                  UTR: {payment.transactionId}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
