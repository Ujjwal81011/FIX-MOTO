const EmergencyRequest = require('../models/EmergencyRequest');
const MechanicProfile = require('../models/MechanicProfile');
const Notification = require('../models/Notification');

async function createEmergency(req, res) {
  const { vehicle, issueType, description, coordinates, address, estimatedAmount } = req.body;
  if (!vehicle || !issueType || !Array.isArray(coordinates) || coordinates.length !== 2) return res.status(400).json({ success: false, message: 'vehicle, issueType and [lng, lat] coordinates are required' });

  const request = await EmergencyRequest.create({ customer: req.user._id, vehicle, issueType, description, location: { type: 'Point', coordinates, address }, estimatedAmount: Number(estimatedAmount || 0) });
  const populated = await request.populate('vehicle');

  const mechanics = await MechanicProfile.find({ isOnline: true, isVerified: true, location: { $near: { $geometry: { type: 'Point', coordinates }, $maxDistance: 20000 } } }).limit(10).select('user');
  if (mechanics.length) {
    await Notification.insertMany(mechanics.map((m) => ({ user: m.user, title: 'New emergency request', message: `New ${issueType} request nearby`, type: 'emergency', data: { requestId: request._id } })));
  }

  req.app.get('io')?.emit('emergency:new', { requestId: request._id, issueType, location: request.location });
  res.status(201).json({ success: true, message: 'Emergency request created', request: populated, nearbyMechanicsNotified: mechanics.length });
}

async function getMyRequests(req, res) {
  const requests = await EmergencyRequest.find({ customer: req.user._id }).populate('vehicle').populate('mechanic', 'name phone').sort({ createdAt: -1 });
  res.json({ success: true, count: requests.length, requests });
}

async function getRequest(req, res) {
  const request = await EmergencyRequest.findById(req.params.id).populate('vehicle').populate('customer', 'name phone').populate('mechanic', 'name phone');
  if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found' });
  const allowed = String(request.customer._id) === String(req.user._id) || (request.mechanic && String(request.mechanic._id) === String(req.user._id)) || req.user.role === 'admin';
  if (!allowed) return res.status(403).json({ success: false, message: 'Not allowed to view this request' });
  res.json({ success: true, request });
}

async function acceptRequest(req, res) {
  if (req.user.role !== 'mechanic') return res.status(403).json({ success: false, message: 'Mechanic account required' });
  const request = await EmergencyRequest.findOneAndUpdate({ _id: req.params.id, status: 'requested', mechanic: null }, { mechanic: req.user._id, status: 'accepted', acceptedAt: new Date() }, { new: true }).populate('customer', 'name phone').populate('vehicle');
  if (!request) return res.status(409).json({ success: false, message: 'Request is no longer available' });
  await Notification.create({ user: request.customer._id, title: 'Mechanic accepted', message: 'A mechanic accepted your emergency request.', type: 'emergency', data: { requestId: request._id } });
  req.app.get('io')?.to(`user:${request.customer._id}`).emit('emergency:accepted', request);
  res.json({ success: true, message: 'Emergency request accepted', request });
}

async function updateStatus(req, res) {
  const allowed = ['on_the_way', 'arrived', 'repairing', 'completed', 'cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found' });
  if (String(request.mechanic) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only assigned mechanic can update status' });

  request.status = req.body.status;
  if (req.body.finalAmount !== undefined) request.finalAmount = Number(req.body.finalAmount);
  if (req.body.beforePhotos) request.beforePhotos = req.body.beforePhotos;
  if (req.body.afterPhotos) request.afterPhotos = req.body.afterPhotos;
  if (req.body.status === 'completed') request.completedAt = new Date();
  await request.save();

  await Notification.create({ user: request.customer, title: 'Emergency status updated', message: `Your request is now ${request.status.replaceAll('_', ' ')}`, type: 'emergency', data: { requestId: request._id, status: request.status } });
  req.app.get('io')?.to(`user:${request.customer}`).emit('emergency:status', { requestId: request._id, status: request.status });
  res.json({ success: true, message: 'Status updated', request });
}

async function cancelRequest(req, res) {
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ success: false, message: 'Emergency request not found' });
  if (String(request.customer) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Not allowed' });
  if (['completed', 'cancelled'].includes(request.status)) return res.status(400).json({ success: false, message: `Cannot cancel a ${request.status} request` });
  request.status = 'cancelled';
  await request.save();
  res.json({ success: true, message: 'Emergency request cancelled', request });
}

async function listAll(req, res) {
  const requests = await EmergencyRequest.find().populate('customer', 'name phone').populate('mechanic', 'name phone').populate('vehicle').sort({ createdAt: -1 });
  res.json({ success: true, count: requests.length, requests });
}

module.exports = { createEmergency, getMyRequests, getRequest, acceptRequest, updateStatus, cancelRequest, listAll };
