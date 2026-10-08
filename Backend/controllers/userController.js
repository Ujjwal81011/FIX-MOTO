const User = require('../models/User');

async function getProfile(req, res) {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, user });
}

async function updateProfile(req, res) {
  const allowed = ['name', 'phone', 'avatar'];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
  res.json({ success: true, message: 'Profile updated', user });
}

async function listUsers(req, res) {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
}

module.exports = { getProfile, updateProfile, listUsers };
