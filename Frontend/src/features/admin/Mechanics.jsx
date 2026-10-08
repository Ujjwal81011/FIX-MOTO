import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Wrench,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

import api from "../../utils/axios";
export default function Mechanics() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [error, setError] = useState("");

  const fetchMechanics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/mechanics");

      setItems(response.data.mechanics || []);
    } catch (err) {
      console.error("Failed to fetch mechanics:", err);

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

  const handleVerification = async (mechanicId, isVerified) => {
    try {
      setVerifyingId(mechanicId);
      setError("");

      const response = await api.patch(
        `/mechanics/${mechanicId}/verify`,
        {
          isVerified,
        }
      );

      const updatedMechanic = response.data.profile;

      // Update mechanic in current list
      setItems((prevItems) =>
        prevItems.map((mechanic) =>
          mechanic._id === mechanicId
            ? updatedMechanic
            : mechanic
        )
      );
    } catch (err) {
      console.error("Verification failed:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to update verification status."
      );
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black">
          Mechanics
        </h1>

        <div className="mt-10 flex items-center justify-center py-16">
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

      <div>
        <h1 className="text-3xl font-black">
          Mechanics
        </h1>

        <p className="mt-2 text-slate-500">
          Manage mechanics and verification status.
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-7 grid gap-4 md:grid-cols-2">

        {items.length > 0 ? (
          items.map((mechanic) => {

            const isVerifying =
              verifyingId === mechanic._id;

            return (
              <div
                className="card p-5"
                key={mechanic._id}
              >

                {/* TOP SECTION */}
                <div className="flex gap-3">

                  {/* ICON */}
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                    <Wrench />
                  </div>

                  <div className="min-w-0 flex-1">

                    <h3 className="truncate font-bold">
                      {mechanic.businessName ||
                        mechanic.user?.name ||
                        "Unnamed Mechanic"}
                    </h3>

                    <p className="truncate text-sm text-slate-500">
                      {mechanic.user?.email ||
                        "No email available"}
                    </p>

                    {mechanic.user?.phone && (
                      <p className="mt-1 text-sm text-slate-500">
                        {mechanic.user.phone}
                      </p>
                    )}

                  </div>

                  {mechanic.isVerified && (
                    <ShieldCheck
                      className="shrink-0 text-green-600"
                      title="Verified Mechanic"
                    />
                  )}

                </div>

                {/* MECHANIC DETAILS */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">

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
                      Status
                    </p>

                    <p
                      className={`mt-1 font-semibold ${
                        mechanic.isOnline
                          ? "text-green-600"
                          : "text-slate-500"
                      }`}
                    >
                      {mechanic.isOnline
                        ? "Online"
                        : "Offline"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">
                      Verification
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
                  <div className="mt-4">

                    <p className="mb-2 text-xs font-semibold text-slate-400">
                      EXPERTISE
                    </p>

                    <div className="flex flex-wrap gap-2">

                      {mechanic.expertise.map(
                        (skill, index) => (
                          <span
                            key={`${skill}-${index}`}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                          >
                            {skill}
                          </span>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* VERIFICATION STATUS */}
                <div className="mt-5">
                  {mechanic.isVerified ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        Mechanic is verified
                      </div>
                      {/* UNVERIFY BUTTON */}
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() =>
                          handleVerification(
                            mechanic._id,
                            false
                          )
                        }
                        className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {isVerifying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Unverify
                          </>
                        )}

                      </button>

                    </div>

                  ) : (

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">

                      <div className="text-sm font-medium text-orange-700">
                        Verification pending
                      </div>

                      {/* APPROVE BUTTON */}
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() =>
                          handleVerification(
                            mechanic._id,
                            true
                          )
                        }
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >

                        {isVerifying ? (
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

          /* NO MECHANICS */
          <div className="card col-span-full p-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">
              No mechanics found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}