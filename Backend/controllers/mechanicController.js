const MechanicProfile = require('../models/MechanicProfile');

async function createOrUpdateProfile(req, res) {
  if (req.user.role !== 'mechanic') return res.status(403).json({ success: false, message: 'Mechanic account required' });
  const profile = await MechanicProfile.findOneAndUpdate({ user: req.user._id }, { ...req.body, user: req.user._id }, { new: true, upsert: true, runValidators: true });
  res.json({ success: true, message: 'Mechanic profile saved', profile });
}

async function getMyProfile(req, res) {
  const profile = await MechanicProfile.findOne({ user: req.user._id }).populate('user', 'name email phone role');
  if (!profile) return res.status(404).json({ success: false, message: 'Mechanic profile not found' });
  res.json({ success: true, profile });
}

async function getNearbyMechanics(req, res) {
  const lng = Number(req.query.lng);
  const lat = Number(req.query.lat);
  const maxDistance = Number(req.query.maxDistance || 10000);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return res.status(400).json({ success: false, message: 'lng and lat query parameters are required' });

  const mechanics = await MechanicProfile.find({ isOnline: true, isVerified: true, location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: maxDistance } } }).populate('user', 'name email phone');
  res.json({ success: true, count: mechanics.length, mechanics });
}

async function updateStatus(req, res) {
  const profile = await MechanicProfile.findOneAndUpdate({ user: req.user._id }, { isOnline: Boolean(req.body.isOnline) }, { new: true, upsert: true, setDefaultsOnInsert: true });
  res.json({ success: true, isOnline: profile.isOnline });
}

async function updateLocation(req, res) {
  const { lng, lat } = req.body;
  if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) return res.status(400).json({ success: false, message: 'lng and lat are required' });
  const profile = await MechanicProfile.findOneAndUpdate({ user: req.user._id }, { location: { type: 'Point', coordinates: [Number(lng), Number(lat)] } }, { new: true, upsert: true });
  res.json({ success: true, location: profile.location });
}

async function listMechanics(req, res) {
  const mechanics = await MechanicProfile.find().populate('user', 'name email phone').sort({ rating: -1 });
  res.json({ success: true, count: mechanics.length, mechanics });
}

module.exports = { createOrUpdateProfile, getMyProfile, getNearbyMechanics, updateStatus, updateLocation, listMechanics };
