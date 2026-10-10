const MechanicProfile = require('../models/MechanicProfile');
async function createOrUpdateProfile(req, res) {
  try {
    if (req.user.role !== 'mechanic') {
      return res.status(403).json({
        success: false,
        message: 'Mechanic account required',
      });
    }
    // Security:
    const {
      isVerified,
      user,
      ...profileData
    } = req.body;
    const profile = await MechanicProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        ...profileData,
        user: req.user._id,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      message: 'Mechanic profile saved',
      profile,
    });
  } catch (error) {
    console.error('createOrUpdateProfile error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save mechanic profile',
    });
  }
}

async function getMyProfile(req, res) {
  try {
    const profile = await MechanicProfile.findOne({
      user: req.user._id,
    }).populate('user', 'name email phone role');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Mechanic profile not found',
      });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('getMyProfile error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch mechanic profile',
    });
  }
}

async function getNearbyMechanics(req, res) {
  try {
    const lng = Number(req.query.lng);
    const lat = Number(req.query.lat);
    const maxDistance = Number(req.query.maxDistance || 10000);

    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return res.status(400).json({
        success: false,
        message: 'lng and lat query parameters are required',
      });
    }

    if (
      lng < -180 ||
      lng > 180 ||
      lat < -90 ||
      lat > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude',
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

    res.json({
      success: true,
      count: mechanics.length,
      mechanics,
    });
  } catch (error) {
    console.error('getNearbyMechanics error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to find nearby mechanics',
    });
  }
}

async function updateStatus(req, res) {
  try {
    const isOnline = Boolean(req.body.isOnline);

    const profile = await MechanicProfile.findOneAndUpdate(
      {
        user: req.user._id,
      },
      {
        isOnline,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      isOnline: profile.isOnline,
    });
  } catch (error) {
    console.error('updateStatus error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update mechanic status',
    });
  }
}

async function updateLocation(req, res) {
  try {
    const { lng, lat } = req.body;

    const longitude = Number(lng);
    const latitude = Number(lat);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
      return res.status(400).json({
        success: false,
        message: 'lng and lat are required',
      });
    }

    if (
      longitude < -180 ||
      longitude > 180 ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude',
      });
    }

    const profile = await MechanicProfile.findOneAndUpdate(
      {
        user: req.user._id,
      },
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      success: true,
      location: profile.location,
    });
  } catch (error) {
    console.error('updateLocation error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update mechanic location',
    });
  }
}

async function listMechanics(req, res) {
  try {
    const mechanics = await MechanicProfile.find()
      .populate('user', 'name email phone role')
      .sort({ rating: -1 });

    res.json({
      success: true,
      count: mechanics.length,
      mechanics,
    });
  } catch (error) {
    console.error('listMechanics error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch mechanics',
    });
  }
}

async function verifyMechanic(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const { id } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isVerified must be true or false",
      });
    }

    const profile = await MechanicProfile.findByIdAndUpdate(
      id,
      { $set: { isVerified } },
      { new: true, runValidators: true }
    ).populate("user", "name email phone role");

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Mechanic profile not found",
      });
    }

    return res.json({
      success: true,
      message: isVerified
        ? "Mechanic verified successfully"
        : "Mechanic verification revoked successfully",
      profile,
    });
  } catch (error) {
    console.error("verifyMechanic error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update verification status",
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