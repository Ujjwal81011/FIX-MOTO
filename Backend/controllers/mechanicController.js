const MechanicProfile = require('../models/MechanicProfile');

// Fields a mechanic is allowed to edit through their own profile.
const EDITABLE_PROFILE_FIELDS = [
  'businessName',
  'phone',
  'experienceYears',
  'expertise',
  'serviceArea',
  'upiId',
];

const UPI_ID_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;

// Create or update the logged-in mechanic's profile.
async function createOrUpdateProfile(req, res) {
  try {
    if (req.user.role !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Mechanic account required.',
      });
    }

    const updates = {};

    // Only accept explicitly permitted profile fields.
    for (const field of EDITABLE_PROFILE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    // Validate and normalize the UPI ID.
    if (Object.prototype.hasOwnProperty.call(updates, 'upiId')) {
      if (typeof updates.upiId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'UPI ID must be a string.',
        });
      }

      updates.upiId = updates.upiId.trim().toLowerCase();

      // An empty value lets the mechanic remove their saved UPI ID.
      if (updates.upiId && !UPI_ID_REGEX.test(updates.upiId)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid UPI ID, for example name@upi.',
        });
      }

      if (updates.upiId.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'UPI ID cannot exceed 100 characters.',
        });
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, 'businessName') &&
      typeof updates.businessName !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Business name must be a string.',
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, 'phone') &&
      typeof updates.phone !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be a string.',
      });
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, 'serviceArea') &&
      typeof updates.serviceArea !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Service area must be a string.',
      });
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'experienceYears')) {
      const years = Number(updates.experienceYears);

      if (!Number.isFinite(years) || years < 0) {
        return res.status(400).json({
          success: false,
          message: 'Experience years must be a valid non-negative number.',
        });
      }

      updates.experienceYears = years;
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'expertise')) {
      const allowedExpertise = [
        'battery',
        'puncture',
        'fuel',
        'lockout',
        'engine',
        'electrical',
        'accident',
        'general',
      ];

      if (
        !Array.isArray(updates.expertise) ||
        !updates.expertise.every((item) => allowedExpertise.includes(item))
      ) {
        return res.status(400).json({
          success: false,
          message: 'One or more expertise values are invalid.',
        });
      }
    }

    const profile = await MechanicProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: updates,
        $setOnInsert: { user: req.user._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).populate('user', 'name email phone role');

    return res.status(200).json({
      success: true,
      message: 'Mechanic profile saved successfully.',
      profile,
    });
  } catch (error) {
    console.error('createOrUpdateProfile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save mechanic profile.',
    });
  }
}

// Fetch the logged-in mechanic's profile, including saved UPI ID.
async function getMyProfile(req, res) {
  try {
    if (req.user.role !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Mechanic account required.',
      });
    }

    const profile = await MechanicProfile.findOne({
      user: req.user._id,
    }).populate('user', 'name email phone role');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('getMyProfile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch mechanic profile.',
    });
  }
}

// Find online, verified mechanics near a customer.
async function getNearbyMechanics(req, res) {
  try {
    const lng = Number(req.query.lng);
    const lat = Number(req.query.lat);
    const maxDistance = Number(req.query.maxDistance || 10000);

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
        message: 'Valid lng and lat query parameters are required.',
      });
    }

    if (!Number.isFinite(maxDistance) || maxDistance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'maxDistance must be a positive number.',
      });
    }

    const mechanics = await MechanicProfile.find({
      isOnline: true,
      isVerified: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: maxDistance,
        },
      },
    })
      .populate('user', 'name email phone')
      .sort({ rating: -1 });

    return res.status(200).json({
      success: true,
      count: mechanics.length,
      mechanics,
    });
  } catch (error) {
    console.error('getNearbyMechanics error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to find nearby mechanics.',
    });
  }
}

// Update online/offline status through its existing protected route.
async function updateStatus(req, res) {
  try {
    if (typeof req.body.isOnline !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isOnline must be true or false.',
      });
    }

    const profile = await MechanicProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: { isOnline: req.body.isOnline },
        $setOnInsert: { user: req.user._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Mechanic status updated.',
      isOnline: profile.isOnline,
      profile,
    });
  } catch (error) {
    console.error('updateStatus error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update mechanic status.',
    });
  }
}

// Update the logged-in mechanic's location.
async function updateLocation(req, res) {
  try {
    const longitude = Number(req.body.lng);
    const latitude = Number(req.body.lat);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid longitude and latitude are required.',
      });
    }

    const profile = await MechanicProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
        },
        $setOnInsert: { user: req.user._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Mechanic location updated.',
      location: profile.location,
    });
  } catch (error) {
    console.error('updateLocation error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update mechanic location.',
    });
  }
}

// Admin: list mechanic profiles.
async function listMechanics(req, res) {
  try {
    const mechanics = await MechanicProfile.find()
      .populate('user', 'name email phone role')
      .sort({ rating: -1 });

    return res.status(200).json({
      success: true,
      count: mechanics.length,
      mechanics,
    });
  } catch (error) {
    console.error('listMechanics error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch mechanics.',
    });
  }
}

// Admin: verify or revoke mechanic verification.
async function verifyMechanic(req, res) {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isVerified must be true or false.',
      });
    }

    const profile = await MechanicProfile.findByIdAndUpdate(
      id,
      { $set: { isVerified } },
      { new: true, runValidators: true }
    ).populate('user', 'name email phone role');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: isVerified
        ? 'Mechanic verified successfully.'
        : 'Mechanic verification revoked successfully.',
      profile,
    });
  } catch (error) {
    console.error('verifyMechanic error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update verification status.',
    });
  }
}

module.exports = {
  createOrUpdateProfile,
  getMyProfile,
  getNearbyMechanics,
  updateStatus,
  updateLocation,
  listMechanics,
  verifyMechanic,
};