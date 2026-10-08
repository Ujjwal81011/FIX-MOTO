import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  MapPin,
  Radio,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../utils/axios";
import { useSocket } from "../../context/SocketContext";

export default function EmergencyRequests() {
  const { socket, connected } = useSocket();

  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);


  // ======================================================
  // ADD NEW REQUEST
  // ======================================================

  const addRequest = (request) => {
    if (!request?._id) return;

    setItems((prev) => {
      if (
        prev.some(
          (item) =>
            String(item._id) === String(request._id)
        )
      ) {
        return prev;
      }

      return [request, ...prev];
    });
  };


  // ======================================================
  // LOAD ACTIVE REQUESTS
  // ======================================================

  const load = async () => {
    try {
      setLoading(true);

      const { data } = await api.get(
        "/emergency/available"
      );

      setItems(data.requests || []);

      setMessage(data.message || "");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not load emergency requests."
      );
    } finally {
      setLoading(false);
    }
  };


  // ======================================================
  // LOAD WHEN PAGE OPENS
  // ======================================================

  useEffect(() => {
    load();
  }, []);


  // ======================================================
  // SOCKET.IO
  // ======================================================

  useEffect(() => {
    if (!socket) return;


    // ----------------------------------------------------
    // NEW EMERGENCY REQUEST
    // ----------------------------------------------------

    const onNew = (request) => {
      addRequest(request);

      setMessage(
        "New emergency request received."
      );
    };


    // ----------------------------------------------------
    // SOMEONE ELSE ACCEPTED THE REQUEST
    // ----------------------------------------------------

    const onAccepted = ({ requestId }) => {
      setItems((prev) =>
        prev.filter(
          (item) =>
            String(item._id) !==
            String(requestId)
        )
      );
    };


    // ----------------------------------------------------
    // CUSTOMER CANCELLED THE REQUEST
    // ----------------------------------------------------

    const onCancelled = ({ requestId }) => {
      setItems((prev) =>
        prev.filter(
          (item) =>
            String(item._id) !==
            String(requestId)
        )
      );
    };


    socket.on(
      "emergency:new",
      onNew
    );

    socket.on(
      "emergency:accepted",
      onAccepted
    );

    socket.on(
      "emergency:cancelled",
      onCancelled
    );


    return () => {
      socket.off(
        "emergency:new",
        onNew
      );

      socket.off(
        "emergency:accepted",
        onAccepted
      );

      socket.off(
        "emergency:cancelled",
        onCancelled
      );
    };
  }, [socket]);


  // ======================================================
  // ACCEPT REQUEST
  // ======================================================

  const accept = async (id) => {
    try {
      setAcceptingId(id);

      const { data } = await api.patch(
        `/emergency/${id}/accept`
      );

      const request =
        data.request || data;

      const acceptedId =
        request?._id || id;


      // Save active request
      localStorage.setItem(
        "fixmoto_active_request",
        acceptedId
      );


      // Remove from request list
      setItems((prev) =>
        prev.filter(
          (item) =>
            String(item._id) !==
            String(id)
        )
      );


      // Open Active Job
      window.location.href =
        `/mechanic/jobs?requestId=${acceptedId}`;

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Request is no longer available."
      );

      // Another mechanic may have accepted it.
      await load();

    } finally {
      setAcceptingId(null);
    }
  };


  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="mx-auto max-w-6xl">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-black">
            Emergency Requests
          </h1>

          <p className="mt-2 text-slate-500">
            Active emergency requests available for you.
          </p>
        </div>


        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary"
        >

          <RefreshCw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh

        </button>

      </div>


      {/* SOCKET STATUS */}

      <div
        className={`mt-5 flex items-center gap-2 rounded-xl p-3 text-sm ${
          connected
            ? "bg-green-50 text-green-700"
            : "bg-amber-50 text-amber-800"
        }`}
      >

        <Radio size={17} />

        {connected
          ? "Real-time connection active"
          : "Connecting to real-time service..."}

      </div>


      {/* MESSAGE */}

      {message && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </p>
      )}


      {/* REQUEST LIST */}

      <div className="mt-7 space-y-4">

        {loading ? (

          <div className="card p-12 text-center">

            <RefreshCw
              className="mx-auto animate-spin text-slate-400"
            />

            <p className="mt-4 font-semibold">
              Loading emergency requests...
            </p>

          </div>

        ) : items.length ? (

          items.map((item) => (

            <div
              className="card p-5"
              key={item._id}
            >

              <div className="flex flex-col justify-between gap-5 md:flex-row">

                {/* REQUEST INFO */}

                <div>

                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold capitalize text-red-700">

                    {item.issueType ||
                      "Emergency"}

                  </span>


                  <h3 className="mt-3 font-bold">

                    {item.description ||
                      "Roadside assistance requested"}

                  </h3>


                  {/* VEHICLE */}

                  <p className="mt-2 text-sm text-slate-500">

                    {item.vehicle?.make || ""}
                    {" "}
                    {item.vehicle?.model || ""}

                    {item.vehicle?.registrationNumber
                      ? ` • ${item.vehicle.registrationNumber}`
                      : ""}

                  </p>


                  {/* LOCATION + TIME */}

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">

                    <span className="flex gap-1">

                      <MapPin size={15} />

                      {item.location?.address ||
                        "Customer location"}

                    </span>


                    <span className="flex gap-1">

                      <Clock3 size={15} />

                      {item.createdAt
                        ? new Date(
                            item.createdAt
                          ).toLocaleString()
                        : "Just now"}

                    </span>

                  </div>

                </div>


                {/* ACTIONS */}

                <div className="flex items-start gap-2">

                  <button
                    onClick={() =>
                      accept(item._id)
                    }
                    disabled={
                      acceptingId === item._id
                    }
                    className="btn-primary"
                  >

                    {acceptingId ===
                    item._id ? (

                      <>
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />

                        Accepting...
                      </>

                    ) : (

                      <>
                        <Check size={16} />

                        Accept
                      </>

                    )}

                  </button>


                  <Link
                    to={`/mechanic/jobs?requestId=${item._id}`}
                    className="btn-secondary"
                  >
                    Details
                  </Link>

                </div>

              </div>

            </div>

          ))

        ) : (

          <div className="card p-12 text-center">

            <AlertTriangle
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 font-bold">
              No incoming requests
            </p>

            <p className="mt-1 text-sm text-slate-500">

              Keep your mechanic online and verified.
              New emergency requests will appear here
              automatically.

            </p>

          </div>

        )}

      </div>

    </div>
  );
}