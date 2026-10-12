const FREE_SERVICE_LIMIT = 5;
const SUBSCRIPTION_PRICE = 199;

function getSubscriptionState(profile, now = new Date()) {
  if (!profile) return 'unverified';
  if (!profile.isVerified) return 'unverified';

  const used = Number(profile.freeServicesUsed || 0);
  if (used < FREE_SERVICE_LIMIT) return 'free';

  if (profile.subscriptionStatus === 'pending') return 'pending';

  const end = profile.subscriptionEndDate ? new Date(profile.subscriptionEndDate) : null;
  if (
    profile.subscriptionStatus === 'active' &&
    end &&
    Number.isFinite(end.getTime()) &&
    end > now
  ) {
    return 'active';
  }

  if (end && Number.isFinite(end.getTime()) && end <= now) return 'expired';
  if (profile.subscriptionStatus === 'expired') return 'expired';
  return 'required';
}

function canReceiveNewJobs(profile, now = new Date()) {
  if (!profile || !profile.isVerified) return false;
  const used = Number(profile.freeServicesUsed || 0);
  if (used < FREE_SERVICE_LIMIT) return true;
  return (
    profile.subscriptionStatus === 'active' &&
    profile.subscriptionEndDate &&
    new Date(profile.subscriptionEndDate) > now
  );
}

function eligibleMechanicQuery(now = new Date()) {
  return {
    $or: [
      { freeServicesUsed: { $lt: FREE_SERVICE_LIMIT } },
      { freeServicesUsed: { $exists: false } },
      {
        subscriptionStatus: 'active',
        subscriptionEndDate: { $gt: now },
      },
    ],
  };
}

module.exports = {
  FREE_SERVICE_LIMIT,
  SUBSCRIPTION_PRICE,
  getSubscriptionState,
  canReceiveNewJobs,
  eligibleMechanicQuery,
};
