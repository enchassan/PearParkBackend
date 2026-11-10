import Spot from '../models/Spot.js';
import Booking from '../models/Booking.js';

// 1. List All Spots (Optional: ?mine=true for Host)
export const listSpots = async (req, res) => {
  try {
    const { mine } = req.query;

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

// 2. Get Host's Own Spots
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

// 3. Create a New Parking Spot
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

    const parsedLng = Number(location.coordinates[0]);
    const parsedLat = Number(location.coordinates[1]);

    const spot = await Spot.create({
      host_id: req.user._id,
      street_address: street_address.trim(),
      hourly_rate: Number(hourly_rate),
      spot_images: spot_images || [],
      is_active: is_active !== undefined ? is_active : true,
      spot_status: spot_status || 'Approved',
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

// 4. Delete Spot
export const deleteSpot = async (req, res) => {
  try {
    const { id } = req.params;
    const spot = await Spot.findById(id);

    if (!spot) {
      return res.status(404).json({ message: 'Spot not found.' });
    }

    if (spot.host_id.toString() !== req.user._id.toString() && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'You are not authorized to delete this spot.' });
    }

    await spot.deleteOne();

    return res.status(200).json({ message: 'Spot deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete spot.', error: error.message });
  }
};

// 5. Toggle Spot Visibility (Live / Hidden)
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

// 6. Geospatial Search ($near query)
export const getNearbySpots = async (req, res) => {
  try {
    const { lat, lng, radius, maxPrice } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng query parameters are required.' });
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const parsedRadius = Number(radius || 15);
    const parsedMaxPrice = Number(maxPrice || Number.MAX_SAFE_INTEGER);

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      return res.status(400).json({ message: 'lat and lng must be valid numbers.' });
    }

    const spots = await Spot.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parsedLng, parsedLat] },
          $maxDistance: parsedRadius * 1000,
        },
      },
      hourly_rate: { $lte: parsedMaxPrice },
      is_active: true,
      spot_status: { $in: ['Approved', 'Pending'] },
    }).populate('host_id', 'full_name email phone_number');

    return res.status(200).json({ message: 'Nearby spots fetched successfully.', spots });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch nearby spots.', error: error.message });
  }
};

// 7. Get Live Spot Availability Status & Schedule
export const getSpotSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();

    // Check if any reservation is currently active, confirmed, or pending
    const activeBooking = await Booking.findOne({
      spot_id: id,
      booking_status: { $in: ['Pending', 'Confirmed', 'Active_Parking'] },
      scheduled_checkout: { $gte: now },
    }).sort({ scheduled_checkout: -1 });

    // Fetch upcoming bookings for schedule list
    const upcomingBookings = await Booking.find({
      spot_id: id,
      booking_status: { $in: ['Pending', 'Confirmed', 'Active_Parking'] },
      scheduled_checkout: { $gte: now },
    })
      .select('scheduled_checkin scheduled_checkout booking_status')
      .sort({ scheduled_checkin: 1 });

    if (!activeBooking) {
      return res.status(200).json({
        isOccupied: false,
        badgeText: '🟢 Available Now',
        nextFreeTime: null,
        bookings: upcomingBookings,
      });
    }

    // 15-minute turnaround buffer calculation
    const BUFFER_MS = 15 * 60 * 1000;
    const nextAvailableDate = new Date(activeBooking.scheduled_checkout.getTime() + BUFFER_MS);

    const untilTimeStr = activeBooking.scheduled_checkout.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const nextFreeStr = nextAvailableDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return res.status(200).json({
      isOccupied: true,
      badgeText: `⏳ Occupied until ${untilTimeStr}`,
      nextFreeTime: `Earliest slot: ${nextFreeStr}`,
      bookings: upcomingBookings,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch schedule.', error: error.message });
  }
};