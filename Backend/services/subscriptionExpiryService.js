const MechanicProfile = require('../models/MechanicProfile');
const Notification = require('../models/Notification');

/**
 * Expire subscriptions atomically so multiple server instances do not send
 * duplicate expiry notifications for the same mechanic.
 */
async function expireSubscriptions(io) {
  const now = new Date();
  const dueProfiles = await MechanicProfile.find({
    subscriptionStatus: 'active',
    subscriptionEndDate: { $lte: now },
  }).select('_id user subscriptionEndDate');

  for (const due of dueProfiles) {
    const expired = await MechanicProfile.findOneAndUpdate(
      {
        _id: due._id,
        subscriptionStatus: 'active',
        subscriptionEndDate: { $lte: now },
      },
      { $set: { subscriptionStatus: 'expired', isOnline: false } },
      { new: true }
    );

    // Another server instance may already have expired this profile.
    if (!expired) continue;

    try {
      await Notification.create({
        user: expired.user,
        title: 'FIX MOTO subscription expired',
        message: 'Your one-month ₹199 subscription has expired. Renew it and wait for Admin acknowledgement to receive new emergency requests.',
        type: 'payment',
        data: {
          subscriptionStatus: 'expired',
          subscriptionEndDate: expired.subscriptionEndDate,
        },
      });
    } catch (error) {
      console.error('Could not create subscription expiry notification:', error.message);
    }

    io?.to(`user:${expired.user}`).emit('subscription:updated', {
      status: 'expired',
      endDate: expired.subscriptionEndDate,
    });
  }
}

function startSubscriptionExpiryService(io) {
  // Run once on startup, then check once per minute. Eligibility is also checked
  // synchronously by request endpoints, so expiry never depends on this timer.
  expireSubscriptions(io).catch((error) => {
    console.error('Initial subscription expiry check failed:', error.message);
  });

  const timer = setInterval(() => {
    expireSubscriptions(io).catch((error) => {
      console.error('Subscription expiry check failed:', error.message);
    });
  }, 60 * 1000);

  timer.unref?.();
  return timer;
}

module.exports = { expireSubscriptions, startSubscriptionExpiryService };
