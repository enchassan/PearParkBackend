import Spot from '../models/Spot.js';

export const listSpots = async (req, res) => {
  try {
    const spots = await Spot.find().populate('host_id', 'full_name email phone_number');

    return res.status(200).json({ message: 'Spots fetched successfully.', spots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch spots.', error: error.message });
  }
};

export const createSpot = async (req, res) => {
  try {
    const { street_address, hourly_rate, spot_images, is_active, spot_status, location } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required to create a spot.' });
    }

    if (!street_address || !hourly_rate || !location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'street_address, hourly_rate, and valid location coordinates are required.' });
    }

    const spot = await Spot.create({
      host_id: req.user._id,
      street_address,
      hourly_rate,
      spot_images: spot_images || [],
      is_active: is_active !== undefined ? is_active : true,
      spot_status: spot_status || 'Pending',
      location: {
        type: 'Point',
        coordinates: location.coordinates,
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

    return res.status(200).json({ message: 'Spot visibility toggled successfully.', spot });
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
    const parsedRadius = Number(radius || 5);
    const parsedMaxPrice = Number(maxPrice || Number.MAX_SAFE_INTEGER);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      return res.status(400).json({ message: 'lat and lng must be valid numbers.' });
    }

    const spots = await Spot.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parsedLng, parsedLat],
          },
          $maxDistance: parsedRadius * 1000,
        },
      },
      hourly_rate: { $lte: parsedMaxPrice },
      is_active: true,
      spot_status: 'Approved',
    }).populate('host_id', 'full_name email phone_number');

    return res.status(200).json({ message: 'Nearby spots fetched successfully.', spots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch nearby spots.', error: error.message });
  }
};
