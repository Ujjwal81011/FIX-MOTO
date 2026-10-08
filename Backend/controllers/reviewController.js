const Review = require('../models/Review');
const EmergencyRequest = require('../models/EmergencyRequest');
const MechanicProfile = require('../models/MechanicProfile');

async function createReview(req, res) {
  const { requestId, rating, comment } = req.body;
  const request = await EmergencyRequest.findById(requestId);
  if (!request || String(request.customer) !== String(req.user._id)) return res.status(404).json({ success: false, message: 'Completed request not found' });
  if (request.status !== 'completed') return res.status(400).json({ success: false, message: 'Review is allowed after completion' });
  if (!request.mechanic) return res.status(400).json({ success: false, message: 'No mechanic assigned' });
  const exists = await Review.findOne({ request: requestId });
  if (exists) return res.status(409).json({ success: false, message: 'Review already submitted' });

  const review = await Review.create({ request: requestId, customer: req.user._id, mechanic: request.mechanic, rating, comment });
  const reviews = await Review.find({ mechanic: request.mechanic });
  const avg = reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
  await MechanicProfile.findOneAndUpdate({ user: request.mechanic }, { rating: Number(avg.toFixed(2)), totalReviews: reviews.length });
  res.status(201).json({ success: true, message: 'Review submitted', review });
}

async function listMechanicReviews(req, res) {
  const reviews = await Review.find({ mechanic: req.params.mechanicId }).populate('customer', 'name').sort({ createdAt: -1 });
  res.json({ success: true, count: reviews.length, reviews });
}

module.exports = { createReview, listMechanicReviews };
