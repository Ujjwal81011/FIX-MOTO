import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

import api from "../../utils/axios";

export default function Verification() {
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/mechanics");
      setMechanics(response.data.mechanics || []);
    } catch (err) {
      console.error("Failed to load mechanics:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load mechanics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  const handleVerification = async (
    mechanicId,
    isVerified
  ) => {
    try {
      setActionId(mechanicId);
      setError("");

      const response = await api.patch(
        `/mechanics/${mechanicId}/verify`,
        {
          isVerified,
        }
      );

      const updatedMechanic = response.data.profile;

      setMechanics((prev) =>
        prev.map((mechanic) =>
          mechanic._id === mechanicId
            ? updatedMechanic
            : mechanic
        )
      );
    } catch (err) {
      console.error("Verification update failed:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to update verification status."
      );
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">

        <h1 className="text-3xl font-black">
          Mechanic Verification
        </h1>

        <p className="mt-2 text-slate-500">
          Review and approve mechanic accounts.
        </p>

        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />

          <span className="ml-3 text-slate-500">
            Loading mechanics...
          </span>
        </div>

      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">

      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black">
          Mechanic Verification
        </h1>

        <p className="mt-2 text-slate-500">
          Review mechanic profiles and approve them for
          emergency service matching.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* MECHANICS */}
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {mechanics.length > 0 ? (
          mechanics.map((mechanic) => {
            const isProcessing =
              actionId === mechanic._id;
            return (
              <div
                key={mechanic._id}
                className="card p-5"
              >
                {/* TOP */}
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                    <Wrench />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg">
                      {mechanic.businessName ||
                        mechanic.user?.name ||
                        "Unnamed Mechanic"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {mechanic.user?.email ||
                        "No email"}
                    </p>
                    {mechanic.phone && (
                      <p className="mt-1 text-sm text-slate-500">
                        {mechanic.phone}
                      </p>
                    )}
                  </div>
                  {/* STATUS ICON */}
                  {mechanic.isVerified && (
                    <ShieldCheck
                      className="h-6 w-6 shrink-0 text-green-600"
                    />
                  )}
                </div>
                {/* DETAILS */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Experience
                    </p>

                    <p className="mt-1 font-semibold">
                      {mechanic.experienceYears || 0} years
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Rating
                    </p>
                    <p className="mt-1 font-semibold">
                      ⭐ {mechanic.rating || 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Service Area
                    </p>
                    <p className="mt-1 font-semibold">
                      {mechanic.serviceArea || "Not provided"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Status
                    </p>
                    <p
                      className={`mt-1 font-semibold ${
                        mechanic.isVerified
                          ? "text-green-600"
                          : "text-orange-500"
                      }`}
                    >
                      {mechanic.isVerified
                        ? "Verified"
                        : "Pending"}
                    </p>
                  </div>

                </div>
                {/* EXPERTISE */}
                {mechanic.expertise?.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold text-slate-400">
                      EXPERTISE
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {mechanic.expertise.map(
                        (skill, index) => (
                          <span
                            key={`${skill}-${index}`}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600"
                          >
                            {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
                {/* ACTION */}
                <div className="mt-5">
                  {mechanic.isVerified ? (
                    <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        Mechanic Verified
                      </div>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          handleVerification(
                            mechanic._id,
                            false
                          )
                        }
                        className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Revoke
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 p-3">
                      <div>
                        <p className="text-sm font-semibold text-orange-700">
                          Verification Pending
                        </p>
                        <p className="mt-1 text-xs text-orange-600">
                          Admin approval required
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() =>
                          handleVerification(
                            mechanic._id,
                            true
                          )
                        }
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="card col-span-full p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 font-semibold">
              No mechanics found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Registered mechanics will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}