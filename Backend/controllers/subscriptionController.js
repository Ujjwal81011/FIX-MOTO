const MechanicProfile = require('../models/MechanicProfile');
const MechanicSubscriptionPayment = require('../models/MechanicSubscriptionPayment');
const Notification = require('../models/Notification');
const PlatformSettings = require('../models/PlatformSettings');
const { expireSubscriptions } = require('../services/subscriptionExpiryService');
const {
  FREE_SERVICE_LIMIT,
  SUBSCRIPTION_PRICE,
  getSubscriptionState,
} = require('../utils/subscription');

async function getPaymentSettings() {
  const settings = await PlatformSettings.findOne({ key: 'platform' }).lean();
  return {
    amount: SUBSCRIPTION_PRICE,
    freeServiceLimit: FREE_SERVICE_LIMIT,
    adminUpiId: settings?.adminUpiId || '',
  };
}

async function getAdminSubscriptionSettings(req, res) {
  try {
    return res.json({ success: true, settings: await getPaymentSettings() });
  } catch (error) {
    console.error('getAdminSubscriptionSettings error:', error);
    return res.status(500).json({ success: false, message: 'Could not load subscription settings.' });
  }
}

async function updateAdminSubscriptionSettings(req, res) {
  try {
    const upiId = typeof req.body.adminUpiId === 'string' ? req.body.adminUpiId.trim().toLowerCase() : null;
    if (upiId === null) {
      return res.status(400).json({ success: false, message: 'Admin UPI ID is required.' });
    }
    if (upiId.length > 100 || (upiId && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/.test(upiId))) {
      return res.status(400).json({ success: false, message: 'Please enter a valid UPI ID, for example name@upi.' });
    }
    const settings = await PlatformSettings.findOneAndUpdate(
      { key: 'platform' },
      { $set: { adminUpiId: upiId, updatedBy: req.user._id }, $setOnInsert: { key: 'platform' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({
      success: true,
      message: upiId ? 'Admin UPI ID saved successfully.' : 'Admin UPI ID removed.',
      settings: { amount: SUBSCRIPTION_PRICE, freeServiceLimit: FREE_SERVICE_LIMIT, adminUpiId: settings.adminUpiId || '' },
    });
  } catch (error) {
    console.error('updateAdminSubscriptionSettings error:', error);
    return res.status(500).json({ success: false, message: 'Could not save Admin UPI ID.' });
  }
}

async function getMySubscription(req, res) {
  try {
    // Also process due expiries when a mechanic opens the subscription page.
    await expireSubscriptions(req.app.get('io'));
    const profile = await MechanicProfile.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Mechanic profile not found. Complete your profile first.' });
    }

    const now = new Date();
    let state = getSubscriptionState(profile, now);
    if (state === 'expired' && profile.isOnline) {
      // Stop appearing online immediately; the expiry service performs the
      // status transition and sends the one-time expiry notification.
      profile.isOnline = false;
      await profile.save();
    }

    const pendingPayment = await MechanicSubscriptionPayment.findOne({
      mechanic: req.user._id,
      status: 'pending',
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      subscription: {
        state,
        isVerified: profile.isVerified,
        isOnline: profile.isOnline,
        freeServicesUsed: Number(profile.freeServicesUsed || 0),
        freeServicesRemaining: Math.max(0, FREE_SERVICE_LIMIT - Number(profile.freeServicesUsed || 0)),
        startDate: profile.subscriptionStartDate,
        endDate: profile.subscriptionEndDate,
        pendingPayment,
        ...await getPaymentSettings(),
      },
    });
  } catch (error) {
    console.error('getMySubscription error:', error);
    return res.status(500).json({ success: false, message: 'Could not load subscription details.' });
  }
}

async function createSubscriptionPayment(req, res) {
  try {
    const profile = await MechanicProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: 'Mechanic profile not found.' });
    if (!profile.isVerified) {
      return res.status(403).json({ success: false, message: 'Admin verification is required before buying a subscription.' });
    }

    const now = new Date();
    const state = getSubscriptionState(profile, now);
    if (state === 'free') {
      return res.status(400).json({ success: false, message: `You still have ${Math.max(0, FREE_SERVICE_LIMIT - Number(profile.freeServicesUsed || 0))} free completed service(s).` });
    }
    if (state === 'active') {
      return res.status(400).json({ success: false, message: 'Your subscription is already active.' });
    }

    const paymentSettings = await getPaymentSettings();
    if (!paymentSettings.adminUpiId) {
      return res.status(400).json({ success: false, message: 'Admin has not configured the subscription UPI ID yet.' });
    }

    const transactionReference = typeof req.body.transactionReference === 'string'
      ? req.body.transactionReference.trim().slice(0, 120)
      : '';

    let payment = await MechanicSubscriptionPayment.findOne({ mechanic: req.user._id, status: 'pending' });
    let isNewPayment = false;
    if (payment) {
      if (transactionReference) payment.transactionReference = transactionReference;
      await payment.save();
    } else {
      try {
        payment = await MechanicSubscriptionPayment.create({
          mechanic: req.user._id,
          mechanicProfile: profile._id,
          amount: SUBSCRIPTION_PRICE,
          transactionReference,
          status: 'pending',
        });
        isNewPayment = true;
      } catch (error) {
        // Handles two rapid submissions racing to create the same pending payment.
        if (error.code !== 11000) throw error;
        payment = await MechanicSubscriptionPayment.findOne({ mechanic: req.user._id, status: 'pending' });
        if (payment && transactionReference) {
          payment.transactionReference = transactionReference;
          await payment.save();
        }
      }
    }
    if (!payment) {
      return res.status(409).json({ success: false, message: 'A pending subscription payment could not be found. Please retry.' });
    }

    profile.subscriptionStatus = 'pending';
    profile.isOnline = false;
    await profile.save();

    // Only notify on first submission; editing a pending UTR should not spam notifications.
    if (isNewPayment) {
      try {
        await Notification.create({
          user: req.user._id,
          title: 'Subscription payment awaiting approval',
          message: 'Your ₹199 subscription payment request has been submitted. New emergency requests will unlock after Admin acknowledgement.',
          type: 'payment',
          data: { subscriptionPaymentId: payment._id },
        });
      } catch (notificationError) {
        console.error('Subscription pending notification failed:', notificationError);
      }
    }


    return res.status(201).json({
      success: true,
      message: 'Payment request submitted. Your subscription will activate after Admin acknowledgement.',
      payment,
    });
  } catch (error) {
    console.error('createSubscriptionPayment error:', error);
    return res.status(500).json({ success: false, message: 'Could not submit subscription payment request.' });
  }
}

async function listSubscriptionPayments(req, res) {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
    const payments = await MechanicSubscriptionPayment.find({ status })
      .populate('mechanic', 'name email phone')
      .populate('mechanicProfile', 'businessName phone freeServicesUsed subscriptionStatus subscriptionStartDate subscriptionEndDate isVerified')
      .populate('acknowledgedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ success: true, count: payments.length, payments, ...await getPaymentSettings() });
  } catch (error) {
    console.error('listSubscriptionPayments error:', error);
    return res.status(500).json({ success: false, message: 'Could not load subscription payments.' });
  }
}

async function acknowledgeSubscriptionPayment(req, res) {
  try {
    const existing = await MechanicSubscriptionPayment.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Subscription payment not found.' });
    if (existing.status !== 'pending') return res.status(409).json({ success: false, message: 'This subscription payment has already been reviewed.' });

    const profile = await MechanicProfile.findById(existing.mechanicProfile);
    if (!profile) return res.status(404).json({ success: false, message: 'Mechanic profile not found.' });
    if (!profile.isVerified) return res.status(400).json({ success: false, message: 'Mechanic verification was revoked. Verify the mechanic before activating a subscription.' });

    const now = new Date();
    const endsAt = new Date(now);
    const originalDay = endsAt.getDate();
    endsAt.setDate(1);
    endsAt.setMonth(endsAt.getMonth() + 1);
    const lastDayOfTargetMonth = new Date(endsAt.getFullYear(), endsAt.getMonth() + 1, 0).getDate();
    endsAt.setDate(Math.min(originalDay, lastDayOfTargetMonth));

    const payment = await MechanicSubscriptionPayment.findOneAndUpdate(
      { _id: existing._id, status: 'pending' },
      {
        $set: {
          status: 'approved',
          acknowledgedBy: req.user._id,
          acknowledgedAt: now,
          subscriptionStartsAt: now,
          subscriptionEndsAt: endsAt,
          adminNote: typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '',
        },
      },
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(409).json({ success: false, message: 'This payment was already reviewed by another Admin action.' });

    profile.subscriptionStatus = 'active';
    profile.subscriptionStartDate = now;
    profile.subscriptionEndDate = endsAt;
    try {
      await profile.save();
    } catch (profileError) {
      // Avoid leaving a payment marked approved if activation could not be saved.
      await MechanicSubscriptionPayment.updateOne(
        { _id: payment._id, status: 'approved', acknowledgedBy: req.user._id, acknowledgedAt: now },
        { $set: { status: 'pending', acknowledgedBy: null, acknowledgedAt: null, subscriptionStartsAt: null, subscriptionEndsAt: null } }
      );
      throw profileError;
    }

    try {
      await Notification.create({
        user: payment.mechanic,
        title: 'FIX MOTO subscription activated',
        message: `Your ₹199 subscription is active until ${endsAt.toLocaleDateString('en-IN')}.`,
        type: 'payment',
        data: { subscriptionPaymentId: payment._id, subscriptionEndDate: endsAt },
      });
    } catch (notificationError) {
      console.error('Subscription activation notification failed:', notificationError);
    }

    req.app.get('io')?.to(`user:${payment.mechanic}`).emit('subscription:updated', {
      status: 'active', startDate: now, endDate: endsAt,
    });

    return res.json({ success: true, message: 'Payment acknowledged. Mechanic subscription activated for one month.', payment });
  } catch (error) {
    console.error('acknowledgeSubscriptionPayment error:', error);
    return res.status(500).json({ success: false, message: 'Could not acknowledge subscription payment.' });
  }
}

async function rejectSubscriptionPayment(req, res) {
  try {
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
    const payment = await MechanicSubscriptionPayment.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'rejected', acknowledgedBy: req.user._id, acknowledgedAt: new Date(), adminNote: note } },
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Pending subscription payment not found.' });

    const profile = await MechanicProfile.findById(payment.mechanicProfile);
    if (profile) {
      const end = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : null;
      profile.subscriptionStatus = end && end > new Date() ? 'active' : (end ? 'expired' : 'required');
      await profile.save();
    }

    try {
      await Notification.create({
        user: payment.mechanic,
        title: 'Subscription payment needs attention',
        message: note || 'Admin could not acknowledge your subscription payment. Please contact Admin and submit the correct payment reference.',
        type: 'payment',
        data: { subscriptionPaymentId: payment._id },
      });
    } catch (notificationError) {
      console.error('Subscription rejection notification failed:', notificationError);
    }
    req.app.get('io')?.to(`user:${payment.mechanic}`).emit('subscription:updated', { status: 'rejected', paymentId: payment._id });

    return res.json({ success: true, message: 'Subscription payment request rejected.', payment });
  } catch (error) {
    console.error('rejectSubscriptionPayment error:', error);
    return res.status(500).json({ success: false, message: 'Could not reject subscription payment.' });
  }
}

module.exports = {
  getAdminSubscriptionSettings,
  updateAdminSubscriptionSettings,
  getMySubscription,
  createSubscriptionPayment,
  listSubscriptionPayments,
  acknowledgeSubscriptionPayment,
  rejectSubscriptionPayment,
};
