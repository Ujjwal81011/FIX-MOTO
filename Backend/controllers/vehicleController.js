const Vehicle = require('../models/Vehicle');

async function createVehicle(req, res) {
  const vehicle = await Vehicle.create({ ...req.body, owner: req.user._id });
  res.status(201).json({ success: true, message: 'Vehicle added', vehicle });
}

async function getMyVehicles(req, res) {
  const vehicles = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: vehicles.length, vehicles });
}

async function getVehicle(req, res) {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id });
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  res.json({ success: true, vehicle });
}

async function updateVehicle(req, res) {
  const vehicle = await Vehicle.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body, { new: true, runValidators: true });
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  res.json({ success: true, message: 'Vehicle updated', vehicle });
}

async function deleteVehicle(req, res) {
  const vehicle = await Vehicle.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
  res.json({ success: true, message: 'Vehicle deleted' });
}

module.exports = { createVehicle, getMyVehicles, getVehicle, updateVehicle, deleteVehicle };
