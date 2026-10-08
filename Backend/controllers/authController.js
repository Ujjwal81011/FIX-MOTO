const bcrypt = require('bcryptjs');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar };
}

async function register(req, res) {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  if (role && !['customer', 'mechanic'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ success: false, message: 'Email is already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), password: hashed, phone, role: role || 'customer' });

  res.status(201).json({ success: true, message: 'Registration successful', token: generateToken(user), user: publicUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid email or password' });

  res.json({ success: true, message: 'Login successful', token: generateToken(user), user: publicUser(user) });
}

async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) });
}

module.exports = { register, login, me };
