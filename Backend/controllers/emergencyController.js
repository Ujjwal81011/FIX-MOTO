const EmergencyRequest = require("../models/EmergencyRequest");
const MechanicProfile = require("../models/MechanicProfile");
const Notification = require("../models/Notification");
const { FREE_SERVICE_LIMIT, canReceiveNewJobs, eligibleMechanicQuery, getSubscriptionState } = require("../utils/subscription");

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

  // Use $geoNear so the 10 mechanics notified are the nearest eligible ones.
  // Subscription eligibility is included in the geospatial query itself.
  const mechanics = await MechanicProfile.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distanceMeters',
        maxDistance: EMERGENCY_RADIUS_METERS,
        spherical: true,
        query: {
          isOnline: true,
          isVerified: true,
          ...eligibleMechanicQuery(),
        },
      },
    },
    { $limit: 10 },
    { $project: { user: 1, distanceMeters: 1 } },
  ]);

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
  }).select("isOnline isVerified location freeServicesUsed subscriptionStatus subscriptionEndDate");

  if (!profile) {
    return res.status(404).json({
      success: false,
      message:
        "Mechanic profile not found. Complete your mechanic profile first.",
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

  const subscriptionState = getSubscriptionState(profile);
  if (!canReceiveNewJobs(profile)) {
    return res.json({
      success: true,
      count: 0,
      requests: [],
      subscriptionRequired: true,
      subscriptionStatus: subscriptionState,
      message: subscriptionState === 'pending'
        ? 'Your ₹199 subscription payment is awaiting Admin acknowledgement.'
        : 'Your 5 free completed services are used. Subscribe for ₹199/month to receive new emergency requests.',
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
  }).select("isOnline isVerified freeServicesUsed subscriptionStatus subscriptionEndDate");

  if (!profile?.isVerified) {
    return res.status(403).json({
      success: false,
      message:
        "Your mechanic profile must be verified before accepting requests.",
    });
  }

  if (!canReceiveNewJobs(profile)) {
    return res.status(403).json({
      success: false,
      subscriptionRequired: true,
      message: 'Your free services are used or your subscription has expired. Activate a ₹199/month subscription to accept new requests.',
    });
  }

  if (!profile?.isOnline) {
    return res.status(403).json({
      success: false,
      message: "Go Online before accepting an emergency request.",
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

  // A mechanic cannot complete a job until the customer approves the itemized bill.
  if (newStatus === "completed" && request.billStatus !== "approved") {
    return res.status(400).json({ success: false, message: "Submit the itemized bill and wait for customer approval before completing this job." });
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

  // Count a completed job exactly once. Existing accepted jobs can still finish
  // even if the subscription expires while the mechanic is working.
  if (newStatus === "completed") {
    const completionClaim = await EmergencyRequest.updateOne(
      {
        _id: request._id,
        $or: [
          { freeServiceCountedAt: { $exists: false } },
          { freeServiceCountedAt: null },
        ],
      },
      { $set: { freeServiceCountedAt: request.completedAt || new Date() } }
    );

    if (completionClaim.modifiedCount === 1 && request.mechanic) {
      const profile = await MechanicProfile.findOneAndUpdate(
        { user: request.mechanic, $or: [{ freeServicesUsed: { $lt: FREE_SERVICE_LIMIT } }, { freeServicesUsed: { $exists: false } }] },
        { $inc: { freeServicesUsed: 1 } },
        { new: true }
      );

      if (profile && Number(profile.freeServicesUsed || 0) >= FREE_SERVICE_LIMIT) {
        if (profile.subscriptionStatus !== 'active' || !profile.subscriptionEndDate || new Date(profile.subscriptionEndDate) <= new Date()) {
          profile.subscriptionStatus = profile.subscriptionStatus === 'pending' ? 'pending' : 'required';
          profile.isOnline = false;
          await profile.save();
        }
        try {
          await Notification.create({
            user: request.mechanic,
            title: 'Free services completed',
            message: `You have completed all ${FREE_SERVICE_LIMIT} free services. Subscribe for ₹199/month to receive new emergency requests.`,
            type: 'payment',
            data: { freeServicesUsed: profile.freeServicesUsed, subscriptionRequired: true },
          });
        } catch (notificationError) {
          // A notification failure must not make a successfully completed repair look failed.
          console.error('Free-service limit notification failed:', notificationError.message);
        }
        req.app.get('io')?.to(`user:${request.mechanic}`).emit('subscription:updated', {
          status: profile.subscriptionStatus,
          freeServicesUsed: profile.freeServicesUsed,
          freeServicesRemaining: 0,
        });
      }
    }
  }

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
// MECHANIC SUBMITS AN ITEMIZED BILL
// ======================================================
async function submitBill(req, res) {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found.' });
  if (String(request.mechanic) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only the assigned mechanic can submit this bill.' });
  if (!['arrived', 'repairing'].includes(request.status)) return res.status(400).json({ success: false, message: 'A bill can only be submitted after the mechanic arrives and while the job is being repaired.' });
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) return res.status(400).json({ success: false, message: 'Add at least one bill item.' });
  if (req.body.items.length > 50) return res.status(400).json({ success: false, message: 'A bill can contain at most 50 items.' });

  let grandTotal = 0;
  const items = [];
  for (const item of req.body.items) {
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!name || name.length > 120 || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ success: false, message: 'Each item needs a name, quantity above zero, and a non-negative unit price.' });
    }
    const total = Math.round(quantity * unitPrice * 100) / 100;
    grandTotal += total;
    items.push({ name, quantity, unitPrice, total });
  }
  grandTotal = Math.round(grandTotal * 100) / 100;
  if (grandTotal <= 0) return res.status(400).json({ success: false, message: 'Bill total must be greater than zero.' });

  request.billItems = items;
  request.finalAmount = grandTotal;
  request.billNotes = typeof req.body.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : '';
  request.billStatus = 'submitted';
  request.billVersion = Number(request.billVersion || 0) + 1;
  request.billSubmittedAt = new Date();
  request.billApprovedAt = null;
  request.billApprovedBy = null;
  request.billRevisionReason = '';
  await request.save();

  await Notification.create({ user: request.customer, title: 'Repair bill ready', message: `Your mechanic submitted a bill of ₹${grandTotal.toFixed(2)}. Review it before the job is completed.`, type: 'emergency', data: { requestId: request._id } });
  const io = req.app.get('io');
  const payload = { requestId: request._id, billStatus: request.billStatus, finalAmount: grandTotal };
  io?.to(`user:${request.customer}`).emit('emergency:bill', payload);
  io?.to(`request:${request._id}`).emit('emergency:bill', payload);
  return res.json({ success: true, message: 'Bill submitted for customer approval.', request });
}

// ======================================================
// CUSTOMER APPROVES THE BILL
// ======================================================
async function approveBill(req, res) {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found.' });
  if (String(request.customer) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only the customer who created this request can approve the bill.' });
  if (request.billStatus !== 'submitted' || !request.billItems?.length || Number(request.finalAmount) <= 0) return res.status(400).json({ success: false, message: 'There is no submitted bill to approve.' });
  request.billStatus = 'approved';
  request.billApprovedAt = new Date();
  request.billApprovedBy = req.user._id;
  request.billRevisionReason = '';
  await request.save();
  await Notification.create({ user: request.mechanic, title: 'Repair bill approved', message: 'The customer approved your bill. You can complete the job when the repair is finished.', type: 'emergency', data: { requestId: request._id } });
  const io = req.app.get('io');
  const payload = { requestId: request._id, billStatus: request.billStatus, finalAmount: request.finalAmount };
  io?.to(`user:${request.mechanic}`).emit('emergency:bill', payload);
  io?.to(`request:${request._id}`).emit('emergency:bill', payload);
  return res.json({ success: true, message: 'Bill approved. The mechanic can now complete the job.', request });
}

// ======================================================
// CUSTOMER REQUESTS A BILL REVISION
// ======================================================
async function requestBillRevision(req, res) {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found.' });
  if (String(request.customer) !== String(req.user._id)) return res.status(403).json({ success: false, message: 'Only the customer who created this request can request a revision.' });
  if (request.billStatus !== 'submitted') return res.status(400).json({ success: false, message: 'Only a submitted bill can be sent back for revision.' });
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!reason) return res.status(400).json({ success: false, message: 'Please explain what needs to be corrected.' });
  request.billStatus = 'revision_requested';
  request.billRevisionReason = reason.slice(0, 500);
  await request.save();
  await Notification.create({ user: request.mechanic, title: 'Bill revision requested', message: `Customer requested a bill revision: ${request.billRevisionReason}`, type: 'emergency', data: { requestId: request._id } });
  req.app.get('io')?.to(`user:${request.mechanic}`).emit('emergency:bill', { requestId: request._id, billStatus: request.billStatus, reason: request.billRevisionReason });
  return res.json({ success: true, message: 'Revision request sent to the mechanic.', request });
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
  submitBill,
  approveBill,
  requestBillRevision,
  cancelRequest,
  listAll,
};