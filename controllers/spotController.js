import Spot from '../models/Spot.js';

export const listSpots = async (req, res) => {
  try {
    const { mine } = req.query;

    // If host requests their own spots, filter by host_id
    const filter = {};
    if (mine === 'true' && req.user?._id) {
      filter.host_id = req.user._id;
    }

    const spots = await Spot.find(filter)
      .populate('host_id', 'full_name email phone_number')
      .sort({ createdAt: -1 });

    return res.status(200).json({ message: 'Spots fetched successfully.', spots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch spots.', error: error.message });
  }
};

export const getMySpots = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const spots = await Spot.find({ host_id: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ message: 'Host spots fetched successfully.', spots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch host spots.', error: error.message });
  }
};

export const createSpot = async (req, res) => {
  try {
    const { street_address, hourly_rate, spot_images, is_active, spot_status, location } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required to create a spot.' });
    }

    if (
      !street_address ||
      hourly_rate === undefined ||
      !location ||
      !Array.isArray(location.coordinates) ||
      location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        message: 'street_address, hourly_rate, and valid location coordinates [lng, lat] are required.',
      });
    }

    // Ensure numeric parsing for rates and coordinates
    const parsedLng = Number(location.coordinates[0]);
    const parsedLat = Number(location.coordinates[1]);

    const spot = await Spot.create({
      host_id: req.user._id,
      street_address: street_address.trim(),
      hourly_rate: Number(hourly_rate),
      spot_images: spot_images || [],
      is_active: is_active !== undefined ? is_active : true,
      spot_status: spot_status || 'Approved', // Auto-approved for rapid testing, or set to 'Pending'
      location: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      },
    });

    return res.status(201).json({ message: 'Spot created successfully.', spot });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create spot.', error: error.message });
  }
};

export const deleteSpot = async (req, res) => {
  try {
    const { id } = req.params;
    const spot = await Spot.findById(id);

    if (!spot) {
      return res.status(404).json({ message: 'Spot not found.' });
    }

    // Allow the host who owns the spot or a SuperAdmin to delete
    if (spot.host_id.toString() !== req.user._id.toString() && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'You are not authorized to delete this spot.' });
    }

    await spot.deleteOne();

    return res.status(200).json({ message: 'Spot deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete spot.', error: error.message });
  }
};

export const toggleSpot = async (req, res) => {
  try {
    const { id } = req.params;
    const spot = await Spot.findById(id);

    if (!spot) {
      return res.status(404).json({ message: 'Spot not found.' });
    }

    if (spot.host_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to toggle this spot.' });
    }

    spot.is_active = !spot.is_active;
    await spot.save();

    return res.status(200).json({
      message: `Spot is now ${spot.is_active ? 'Active' : 'Inactive'}.`,
      spot,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to toggle spot.', error: error.message });
  }
};

export const getNearbySpots = async (req, res) => {
  try {
    const { lat, lng, radius, maxPrice } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng query parameters are required.' });
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const parsedRadius = Number(radius || 10);
    const parsedMaxPrice = Number(maxPrice || Number.MAX_SAFE_INTEGER);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      return res.status(400).json({ message: 'lat and lng must be valid numbers.' });
    }

    const spots = await Spot.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat], },$maxDistance: parsedRadius * 1000, // convert km to meters
        },
      },
      hourly_rate: { $lte: parsedMaxPrice },
      is_active: true,
      spot_status: { $in: ['Approved', 'Pending'] }, // Excludes 'Suspended' spots
    }).populate('host_id', 'full_name email phone_number');

    return res.status(200).json({ message: 'Nearby spots fetched successfully.', spots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch nearby spots.', error: error.message });
  }
};