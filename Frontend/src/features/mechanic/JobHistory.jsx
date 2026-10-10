import { useEffect, useState } from "react";
import { History, RefreshCw, Wrench } from "lucide-react";
import api from "../../utils/axios";

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function JobHistory() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/emergency/history");
      setJobs(data.requests || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load completed jobs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Job History</h1>
          <p className="mt-2 text-slate-500">
            All your completed service requests.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="btn-secondary"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card mt-6 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card mt-7 p-8 text-center text-slate-500">
          Loading completed jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="card mt-7 p-10 text-center">
          <History className="mx-auto text-slate-400" size={36} />
          <h2 className="mt-4 font-bold">No completed jobs yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Jobs will appear here after you mark them as completed.
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {jobs.map((job) => (
            <div className="card p-6" key={job._id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-green-50 p-3 text-green-600">
                    <Wrench size={22} />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold">
                      {job.vehicle?.make || "Vehicle"}{" "}
                      {job.vehicle?.model || ""}
                    </h2>

                    <p className="text-sm text-slate-500">
                      {job.vehicle?.registrationNumber || "Registration unavailable"}
                    </p>

                    <p className="mt-2 text-sm capitalize">
                      Service: {job.issueType?.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                  Completed
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-slate-500">Customer</p>
                  <p className="mt-1 font-semibold">
                    {job.customer?.name || "Customer"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Final Amount</p>
                  <p className="mt-1 font-semibold">
                    {money(job.finalAmount)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Completed On</p>
                  <p className="mt-1 font-semibold">
                    {job.completedAt
                      ? new Date(job.completedAt).toLocaleString("en-IN")
                      : "Date unavailable"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Request ID</p>
                  <p className="mt-1 break-all text-sm font-semibold">
                    {job._id}
                  </p>
                </div>
              </div>

              {job.description && (
                <p className="mt-4 text-sm text-slate-600">
                  <span className="font-semibold">Description:</span>{" "}
                  {job.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}