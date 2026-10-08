const EmergencyRequest = require('../models/EmergencyRequest');
const MechanicProfile = require('../models/MechanicProfile');
const Notification = require('../models/Notification');

const EMERGENCY_RADIUS_METERS = 20000;

function emitToMechanics(io, mechanics, event, payload) {
  if (!io) return;

  mechanics.forEach((mechanic) => {
    if (mechanic?.user) {
      io.to(`user:${mechanic.user}`).emit(event, payload);
    }
  });
}

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
      message: 'vehicle, issueType and [lng, lat] coordinates are required',
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
      message: 'Invalid latitude or longitude',
    });
  }

  const request = await EmergencyRequest.create({
    customer: req.user._id,
    vehicle,
    issueType,
    description,
    location: {
      type: 'Point',
      coordinates: [lng, lat],
      address,
    },
    estimatedAmount: Number(estimatedAmount || 0),
  });

  const populated = await EmergencyRequest.findById(request._id)
    .populate('vehicle')
    .populate('customer', 'name phone');

  // Only online + verified mechanics near the customer are notified.
  const mechanics = await MechanicProfile.find({
    isOnline: true,
    isVerified: true,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: EMERGENCY_RADIUS_METERS,
      },
    },
  })
    .limit(10)
    .select('user');

  if (mechanics.length) {
    await Notification.insertMany(
      mechanics.map((mechanic) => ({
        user: mechanic.user,
        title: 'New emergency request',
        message: `New ${issueType} request nearby`,
        type: 'emergency',
        data: { requestId: request._id },
      }))
    );

    // Complete request is sent only to eligible mechanics.
    emitToMechanics(
      req.app.get('io'),
      mechanics,
      'emergency:new',
      populated
    );
  }

  return res.status(201).json({
    success: true,
    message:
      mechanics.length > 0
        ? 'Emergency request created. Nearby mechanics have been notified.'
        : 'Emergency request created. No nearby online verified mechanic was found.',
    request: populated,
    nearbyMechanicsNotified: mechanics.length,
  });
}


// ======================================================
// GET ACTIVE / AVAILABLE EMERGENCY REQUESTS
// ======================================================

async function getAvailableRequests(req, res) {
  if (req.user.role !== 'mechanic') {
    return res.status(403).json({
      success: false,
      message: 'Mechanic account required',
    });
  }

  const profile = await MechanicProfile.findOne({
    user: req.user._id,
  }).select('isOnline isVerified location');

  if (!profile) {
    return res.status(404).json({
      success: false,
      message:
        'Mechanic profile not found. Complete your mechanic profile first.',
    });
  }

  // Offline mechanic should not receive active emergency jobs.
  if (!profile.isOnline) {
    return res.json({
      success: true,
      count: 0,
      requests: [],
      message:
        'Go Online from your mechanic profile to receive emergency requests.',
    });
  }

  // Only verified mechanics can receive requests.
  if (!profile.isVerified) {
    return res.json({
      success: true,
      count: 0,
      requests: [],
      message:
        'Your mechanic profile must be verified by an admin to receive emergency requests.',
    });
  }

  const coordinates = profile.location?.coordinates || [];

  const hasValidLocation =
    coordinates.length === 2 &&
    Number.isFinite(Number(coordinates[0])) &&
    Number.isFinite(Number(coordinates[1])) &&
    !(Number(coordinates[0]) === 0 && Number(coordinates[1]) === 0);

  const query = {
    status: 'requested',
    mechanic: null,
  };

  // If mechanic has a valid location, only show nearby requests.
  if (hasValidLocation) {
    query.location = {
      $near: {
        $geometry: {
          type: 'Point',
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
    .populate('customer', 'name phone')
    .populate('vehicle')
    .limit(50);

  // $near already sorts by distance.
  // Only sort by creation time when location matching is not used.
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
      : 'No mechanic location is saved. Showing active requests; update your location for nearby matching.',
  });
}


// ======================================================
// CUSTOMER REQUESTS
// ======================================================

async function getMyRequests(req, res) {
  const requests = await EmergencyRequest.find({
    customer: req.user._id,
  })
    .populate('vehicle')
    .populate('mechanic', 'name phone')
    .sort({ createdAt: -1 });

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
    .populate('vehicle')
    .populate('customer', 'name phone')
    .populate('mechanic', 'name phone');

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Emergency request not found',
    });
  }

  const allowed =
    String(request.customer._id) === String(req.user._id) ||
    (request.mechanic &&
      String(request.mechanic._id) === String(req.user._id)) ||
    req.user.role === 'admin';

  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: 'Not allowed to view this request',
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
  if (req.user.role !== 'mechanic') {
    return res.status(403).json({
      success: false,
      message: 'Mechanic account required',
    });
  }

  // Mechanic must be online.
  const profile = await MechanicProfile.findOne({
    user: req.user._id,
  }).select('isOnline isVerified');

  if (!profile?.isOnline) {
    return res.status(403).json({
      success: false,
      message: 'Go Online before accepting an emergency request.',
    });
  }

  // Mechanic must be verified.
  if (!profile?.isVerified) {
    return res.status(403).json({
      success: false,
      message:
        'Your mechanic profile must be verified before accepting requests.',
    });
  }

  // IMPORTANT:
  // Atomic update ensures only ONE mechanic can accept the request.
  const request = await EmergencyRequest.findOneAndUpdate(
    {
      _id: req.params.id,
      status: 'requested',
      mechanic: null,
    },
    {
      mechanic: req.user._id,
      status: 'accepted',
      acceptedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('customer', 'name phone')
    .populate('vehicle');

  // Someone else already accepted it.
  if (!request) {
    return res.status(409).json({
      success: false,
      message:
        'Request is no longer available. Another mechanic may have accepted it.',
    });
  }

  // Notify customer.
  await Notification.create({
    user: request.customer._id,
    title: 'Mechanic accepted',
    message: 'A mechanic accepted your emergency request.',
    type: 'emergency',
    data: {
      requestId: request._id,
    },
  });

  const io = req.app.get('io');

  // Tell all connected clients that this request is no longer available.
  // Mechanic pages remove it from their available request list.
  io?.emit('emergency:accepted', {
    requestId: request._id,
  });

  // Full accepted request for the customer if needed later.
  io
    ?.to(`user:${request.customer._id}`)
    .emit('emergency:accepted:customer', request);

  return res.json({
    success: true,
    message: 'Emergency request accepted',
    request,
  });
}


// ======================================================
// UPDATE REQUEST STATUS
// ======================================================

async function updateStatus(req, res) {
  const allowed = [
    'on_the_way',
    'arrived',
    'repairing',
    'completed',
    'cancelled',
  ];

  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status',
    });
  }

  const request = await EmergencyRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Emergency request not found',
    });
  }

  if (
    String(request.mechanic) !== String(req.user._id) &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Only assigned mechanic can update status',
    });
  }

  request.status = req.body.status;

  if (req.body.finalAmount !== undefined) {
    request.finalAmount = Number(req.body.finalAmount);
  }

  if (req.body.beforePhotos) {
    request.beforePhotos = req.body.beforePhotos;
  }

  if (req.body.afterPhotos) {
    request.afterPhotos = req.body.afterPhotos;
  }

  if (req.body.status === 'completed') {
    request.completedAt = new Date();
  }

  await request.save();

  await Notification.create({
    user: request.customer,
    title: 'Emergency status updated',
    message: `Your request is now ${request.status.replaceAll(
      '_',
      ' '
    )}`,
    type: 'emergency',
    data: {
      requestId: request._id,
      status: request.status,
    },
  });

  // Notify customer request room.
  req
    .app
    .get('io')
    ?.to(`request:${request._id}`)
    .emit('emergency:status', {
      requestId: request._id,
      status: request.status,
    });

  // Also notify customer's user room.
  req
    .app
    .get('io')
    ?.to(`user:${request.customer}`)
    .emit('emergency:status', {
      requestId: request._id,
      status: request.status,
    });

  return res.json({
    success: true,
    message: 'Status updated',
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
      message: 'Emergency request not found',
    });
  }

  if (
    String(request.customer) !== String(req.user._id) &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not allowed',
    });
  }

  if (['completed', 'cancelled'].includes(request.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel a ${request.status} request`,
    });
  }

  request.status = 'cancelled';

  await request.save();

  // Remove cancelled request from mechanics' screens.
  req
    .app
    .get('io')
    ?.emit('emergency:cancelled', {
      requestId: request._id,
    });

  return res.json({
    success: true,
    message: 'Emergency request cancelled',
    request,
  });
}


// ======================================================
// ADMIN - ALL REQUESTS
// ======================================================

async function listAll(req, res) {
  const requests = await EmergencyRequest.find()
    .populate('customer', 'name phone')
    .populate('mechanic', 'name phone')
    .populate('vehicle')
    .sort({ createdAt: -1 });

  return res.json({
    success: true,
    count: requests.length,
    requests,
  });
}


module.exports = {
  createEmergency,
  getAvailableRequests,
  getMyRequests,
  getRequest,
  acceptRequest,
  updateStatus,
  cancelRequest,
  listAll,
};