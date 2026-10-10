import { useEffect, useRef, useState } from "react";
import {
  MapPin,
  Phone,
  Wrench,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../../utils/axios";
import { useSocket } from "../../context/SocketContext";

const nextStatus = {
  accepted: "on_the_way",
  on_the_way: "arrived",
  arrived: "repairing",
  repairing: "completed",
};

export default function ActiveJobs() {
  const [params] = useSearchParams();
  const { socket } = useSocket();

  const [job, setJob] = useState(null);
  const [message, setMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const watchIdRef = useRef(null);

  const requestId =
    params.get("requestId") ||
    localStorage.getItem("fixmoto_active_request");

  // Load the current emergency job
  const load = async () => {
    if (!requestId) {
      setJob(null);
      return;
    }

    try {
      const { data } = await api.get(`/emergency/${requestId}`);
      setJob(data.request);
      setMessage("");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not load job."
      );
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  // Listen for emergency status changes
  useEffect(() => {
    if (!socket || !requestId) return;

    socket.emit("join:request", requestId);

    const onStatus = (payload) => {
      if (String(payload?.requestId) === String(requestId)) {
        load();
      }
    };

    socket.on("emergency:status", onStatus);

    return () => {
      socket.off("emergency:status", onStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, requestId]);

  // Stop location tracking safely
  const stopLocationSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsSharing(false);
  };

  // Start or stop continuous location sharing
  const sendLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Your browser does not support location sharing.");
      return;
    }

    if (!socket || !requestId) {
      setMessage("Socket connection or request ID is missing.");
      return;
    }

    // Clicking again stops location sharing
    if (watchIdRef.current !== null) {
      stopLocationSharing();
      setMessage("Location sharing stopped.");
      return;
    }

    if (!socket.connected) {
      setMessage("Socket disconnected. Please wait and try again.");
      return;
    }

    setMessage("Getting your current location...");

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        if (!socket.connected) {
          setMessage("Socket disconnected. Waiting for reconnection.");
          return;
        }

        const mechanicId =
          job?.mechanic?._id || job?.mechanic;

        socket.emit(
          "mechanic:location",
          {
            requestId,
            mechanicId,
            coordinates: [
              coords.longitude,
              coords.latitude,
            ],
          },
          (response) => {
            if (response?.error) {
              setMessage(response.error);
            }
          }
        );

        setIsSharing(true);
        setMessage("Live location sharing is active.");
      },
      (error) => {
        stopLocationSharing();

        if (error.code === 1) {
          setMessage(
            "Location permission denied. Allow location access in your browser."
          );
        } else if (error.code === 3) {
          setMessage(
            "Location request timed out. Check your GPS and try again."
          );
        } else {
          setMessage(
            "Unable to get your location. Check GPS and try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
  };

  // Stop GPS tracking when this page unmounts
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Update emergency status
  const update = async (status) => {
    try {
      const { data } = await api.patch(
        `/emergency/${requestId}/status`,
        { status }
      );

      setJob(data.request);
      setMessage("");

      if (status === "completed") {
        localStorage.removeItem("fixmoto_active_request");
        stopLocationSharing();
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Could not update status."
      );
    }
  };

  if (!job) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-black">Active Jobs</h1>

        {message ? (
          <p className="mt-4 text-red-600">{message}</p>
        ) : (
          <div className="card mt-7 p-12 text-center">
            <Wrench className="mx-auto text-slate-300" />
            <p className="mt-4 font-semibold">No active job</p>
            <p className="mt-1 text-sm text-slate-500">
              Accept an emergency request to start a job.
            </p>
          </div>
        )}
      </div>
    );
  }

  const next = nextStatus[job.status];

  const mechanicLocation = job.location?.coordinates;

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-3xl font-black">Active Job</h1>

      <p className="mt-2 text-slate-500">
        Update the customer as you travel and repair the vehicle.
      </p>

      <div className="card mt-7 p-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold capitalize text-red-700">
              {job.issueType}
            </span>

            <h2 className="mt-3 text-xl font-black">
              {job.vehicle?.make} {job.vehicle?.model}
            </h2>

            <p className="text-sm text-slate-500">
              {job.vehicle?.registrationNumber}
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize">
            {String(job.status).replaceAll("_", " ")}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Customer</p>

            <p className="mt-1 font-bold">
              {job.customer?.name || "Customer"}
            </p>

            <p className="text-sm text-slate-500">
              {job.customer?.phone || "Phone unavailable"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Location</p>

            <p className="mt-1 font-bold">
              {job.location?.address || "GPS location"}
            </p>

            {Array.isArray(mechanicLocation) &&
              mechanicLocation.length === 2 && (
                <p className="mt-1 text-xs text-slate-500">
                  Customer GPS: {mechanicLocation[1]}, {mechanicLocation[0]}
                </p>
              )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Description</p>

            <p className="mt-1 font-bold">
              {job.description || "No description"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {next && (
            <button
              onClick={() => update(next)}
              className="btn-primary"
            >
              <CheckCircle2 size={17} />
              {next.replaceAll("_", " ")}
            </button>
          )}

          <button
            onClick={sendLocation}
            className="btn-secondary"
          >
            <Navigation size={17} />
            {isSharing
              ? "Stop Location Sharing"
              : "Start Live Location"}
          </button>

          <a
            href={
              job.customer?.phone
                ? `tel:${job.customer.phone}`
                : "#"
            }
            className="btn-secondary"
          >
            <Phone size={17} />
            Call Customer
          </a>

          <span className="flex items-center gap-1 text-sm text-slate-500">
            <MapPin size={16} />
            {socket?.connected
              ? "Socket connected"
              : "Socket disconnected"}
          </span>
        </div>

        {message && (
          <p
            role="status"
            className={`mt-4 text-sm ${
              message.includes("active")
                ? "text-green-600"
                : message.includes("stopped")
                  ? "text-slate-600"
                  : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}