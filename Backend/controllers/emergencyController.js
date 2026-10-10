const EmergencyRequest = require("../models/EmergencyRequest");
const MechanicProfile = require("../models/MechanicProfile");
const Notification = require("../models/Notification");

const EMERGENCY_RADIUS_METERS = 20000;

// ======================================================
// SOCKET HELPER
// ======================================================

function emitToMechanics(io, mechanics, event, payload) {
  if (!io) return;

  mechanics.forEach((mechanic) => {
    if (mechanic?.user) {
      io.to(`user:${mechanic.user}`).emit(event, payload);
    }
  });
}

// ======================================================
// CREATE EMERGENCY REQUEST
// ======================================================

async function createEmergency(req, res) {
  const {
    vehicle,
    issueType,
    description,
    coordinates,
    address,
    estimatedAmount,
  } = req.body;

  if (
    !vehicle ||
    !issueType ||
    !Array.isArray(coordinates) ||
    coordinates.length !== 2
  ) {
    return res.status(400).json({
      success: false,
      message:
        "vehicle, issueType and [lng, lat] coordinates are required",
    });
  }

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid latitude or longitude",
    });
  }

  const initialEstimate = Number(estimatedAmount || 0);

  if (!Number.isFinite(initialEstimate) || initialEstimate < 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid estimated amount",
    });
  }

  const request = await EmergencyRequest.create({
    customer: req.user._id,
    vehicle,
    issueType,
    description,
    location: {
      type: "Point",
      coordinates: [lng, lat],
      address,
    },
    estimatedAmount: initialEstimate,
  });

  const populated = await EmergencyRequest.findById(request._id)
    .populate("vehicle")
    .populate("customer", "name phone");

  // Find nearby online and verified mechanics.
  const mechanics = await MechanicProfile.find({
    isOnline: true,
    isVerified: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat],
        },
        $maxDistance: EMERGENCY_RADIUS_METERS,
      },
    },
  })
    .limit(10)
    .select("user");

  if (mechanics.length) {
    await Notification.insertMany(
      mechanics.map((mechanic) => ({
        user: mechanic.user,
        title: "New emergency request",
        message: `New ${issueType} request nearby`,
        type: "emergency",
        data: { requestId: request._id },
      }))
    );

    emitToMechanics(
      req.app.get("io"),
      mechanics,
      "emergency:new",
      populated
    );
  }

  return res.status(201).json({
    success: true,
    message:
      mechanics.length > 0
        ? "Emergency request created. Nearby mechanics have been notified."
        : "Emergency request created. No nearby online verified mechanic was found.",
    request: populated,
    nearbyMechanicsNotified: mechanics.length,
  });
}

// ======================================================
// GET AVAILABLE EMERGENCY REQUESTS
// ======================================================

async function getAvailableRequests(req, res) {
  if (req.user.role !== "mechanic") {
    return res.status(403).json({
      success: false,
      message: "Mechanic account required",
    });
  }

  const profile = await MechanicProfile.findOne({
    user: req.user._id,
  }).select("isOnline isVerified location");

  if (!profile) {
    return res.status(404).json({
      success: false,
      message:
        "Mechanic profile not found. Complete your mechanic profile first.",
    });
  }

  if (!profile.isOnline) {
    return res.json({
      success: true,
      count: 0,
      requests: [],
      message:
        "Go Online from your mechanic profile to receive emergency requests.",
    });
  }

  if (!profile.isVerified) {
    return res.json({
      success: true,
      count: 0,
      requests: [],
      message:
        "Your mechanic profile must be verified by an admin to receive emergency requests.",
    });
  }

  const coordinates = profile.location?.coordinates || [];

  const hasValidLocation =
    coordinates.length === 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1])) &&
    !(Number(coordinates[0]) === 0 && Number(coordinates[1]) === 0);

  const query = {
    status: "requested",
    mechanic: null,
  };

  if (hasValidLocation) {
    query.location = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [
            Number(coordinates[0]),
            Number(coordinates[1]),
          ],
        },
        $maxDistance: EMERGENCY_RADIUS_METERS,
      },
    };
  }

  let requestsQuery = EmergencyRequest.find(query)
    .populate("customer", "name phone")
    .populate("vehicle")
    .limit(50);

  if (!hasValidLocation) {
    requestsQuery = requestsQuery.sort({ createdAt: -1 });
  }

  const requests = await requestsQuery;

  return res.json({
    success: true,
    count: requests.length,
    requests,
    message: hasValidLocation
      ? undefined
      : "No mechanic location is saved. Showing active requests; update your location for nearby matching.",
  });
}

// ======================================================
// CUSTOMER REQUESTS
// ======================================================

async function getMyRequests(req, res) {
  const requests = await EmergencyRequest.find({
    customer: req.user._id,
  })
    .populate("vehicle")
    .populate("mechanic", "name phone")
    .sort({ createdAt: -1 });

  return res.json({
    success: true,
    count: requests.length,
    requests,
  });
}

// ======================================================
// MECHANIC - COMPLETED JOB HISTORY
// ======================================================

async function getMyCompletedJobs(req, res) {
  if (req.user.role !== "mechanic") {
    return res.status(403).json({
      success: false,
      message: "Mechanic account required",
    });
  }

  const requests = await EmergencyRequest.find({
    mechanic: req.user._id,
    status: "completed",
  })
    .populate("customer", "name phone")
    .populate("vehicle")
    .sort({ completedAt: -1, updatedAt: -1 });

  return res.json({
    success: true,
    count: requests.length,
    requests,
  });
}

// ======================================================
// GET SINGLE REQUEST
// ======================================================

async function getRequest(req, res) {
  const request = await EmergencyRequest.findById(req.params.id)
    .populate("vehicle")
    .populate("customer", "name phone")
    .populate("mechanic", "name phone");

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Emergency request not found",
    });
  }

  const allowed =
    String(request.customer._id) === String(req.user._id) ||
    (request.mechanic &&
      String(request.mechanic._id) === String(req.user._id)) ||
    req.user.role === "admin";

  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: "Not allowed to view this request",
    });
  }

  return res.json({
    success: true,
    request,
  });
}

// ======================================================
// ACCEPT REQUEST
// ======================================================

async function acceptRequest(req, res) {
  if (req.user.role !== "mechanic") {
    return res.status(403).json({
      success: false,
      message: "Mechanic account required",
    });
  }

  const profile = await MechanicProfile.findOne({
    user: req.user._id,
  }).select("isOnline isVerified");

  if (!profile?.isOnline) {
    return res.status(403).json({
      success: false,
      message: "Go Online before accepting an emergency request.",
    });
  }

  if (!profile?.isVerified) {
    return res.status(403).json({
      success: false,
      message:
        "Your mechanic profile must be verified before accepting requests.",
    });
  }

  // Atomic update prevents two mechanics accepting the same request.
  const request = await EmergencyRequest.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "requested",
      mechanic: null,
    },
    {
      mechanic: req.user._id,
      status: "accepted",
      acceptedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("customer", "name phone")
    .populate("vehicle");

  if (!request) {
    return res.status(409).json({
      success: false,
      message:
        "Request is no longer available. Another mechanic may have accepted it.",
    });
  }

  await Notification.create({
    user: request.customer._id,
    title: "Mechanic accepted",
    message: "A mechanic accepted your emergency request.",
    type: "emergency",
    data: {
      requestId: request._id,
    },
  });

  const io = req.app.get("io");

  io?.emit("emergency:accepted", {
    requestId: request._id,
  });

  io
    ?.to(`user:${request.customer._id}`)
    .emit("emergency:accepted:customer", request);

  return res.json({
    success: true,
    message: "Emergency request accepted",
    request,
  });
}

// ======================================================
// UPDATE REQUEST STATUS
// ======================================================

async function updateStatus(req, res) {
  const allowedStatuses = [
    "on_the_way",
    "arrived",
    "repairing",
    "completed",
    "cancelled",
  ];

  const newStatus = req.body.status;

  if (!allowedStatuses.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status",
    });
  }

  const request = await EmergencyRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Emergency request not found",
    });
  }

  if (
    String(request.mechanic) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Only assigned mechanic can update status",
    });
  }

  // Record the completion timestamp for job history.
  if (newStatus === "completed") {
    if (request.status === "completed") {
      return res.json({
        success: true,
        message: "Job is already completed",
        request,
      });
    }

    if (request.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "A cancelled request cannot be completed",
      });
    }
  }

  request.status = newStatus;

  // Never trust an arbitrary final amount from the client.
  // This controller version does not calculate a bill from line items.
  if (req.body.finalAmount !== undefined) {
    const finalAmount = Number(req.body.finalAmount);

    if (!Number.isFinite(finalAmount) || finalAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid final amount",
      });
    }

    request.finalAmount = finalAmount;
  }

  if (req.body.beforePhotos !== undefined) {
    if (!Array.isArray(req.body.beforePhotos)) {
      return res.status(400).json({
        success: false,
        message: "beforePhotos must be an array",
      });
    }

    request.beforePhotos = req.body.beforePhotos;
  }

  if (req.body.afterPhotos !== undefined) {
    if (!Array.isArray(req.body.afterPhotos)) {
      return res.status(400).json({
        success: false,
        message: "afterPhotos must be an array",
      });
    }

    request.afterPhotos = req.body.afterPhotos;
  }

  if (newStatus === "completed") {
    request.completedAt = new Date();
  }

  await request.save();

  await Notification.create({
    user: request.customer,
    title: "Emergency status updated",
    message: `Your request is now ${request.status.replaceAll("_", " ")}`,
    type: "emergency",
    data: {
      requestId: request._id,
      status: request.status,
    },
  });

  const io = req.app.get("io");

  const statusPayload = {
    requestId: request._id,
    status: request.status,
  };

  io?.to(`request:${request._id}`).emit(
    "emergency:status",
    statusPayload
  );

  io?.to(`user:${request.customer}`).emit(
    "emergency:status",
    statusPayload
  );

  // Notify the assigned mechanic too, including completion.
  if (request.mechanic) {
    io?.to(`user:${request.mechanic}`).emit(
      "emergency:status",
      statusPayload
    );
  }

  return res.json({
    success: true,
    message: "Status updated successfully",
    request,
  });
}

// ======================================================
// CANCEL REQUEST
// ======================================================

async function cancelRequest(req, res) {
  const request = await EmergencyRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: "Emergency request not found",
    });
  }

  if (
    String(request.customer) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not allowed",
    });
  }

  if (["completed", "cancelled"].includes(request.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel a ${request.status} request`,
    });
  }

  request.status = "cancelled";

  await request.save();

  req.app.get("io")?.emit("emergency:cancelled", {
    requestId: request._id,
  });

  return res.json({
    success: true,
    message: "Emergency request cancelled",
    request,
  });
}

// ======================================================
// ADMIN - ALL REQUESTS
// ======================================================

async function listAll(req, res) {
  const requests = await EmergencyRequest.find()
    .populate("customer", "name phone")
    .populate("mechanic", "name phone")
    .populate("vehicle")
    .sort({ createdAt: -1 });

  return res.json({
    success: true,
    count: requests.length,
    requests,
  });
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createEmergency,
  getAvailableRequests,
  getMyRequests,
  getMyCompletedJobs,
  getRequest,
  acceptRequest,
  updateStatus,
  cancelRequest,
  listAll,
};