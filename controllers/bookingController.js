import Booking from '../models/Booking.js';
import Spot from '../models/Spot.js';

export const listBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('driver_id', 'full_name email phone_number')
      .populate('host_id', 'full_name email phone_number')
      .populate('spot_id', 'street_address hourly_rate');

    return res.status(200).json({ message: 'Bookings fetched successfully.', bookings });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch bookings.', error: error.message });
  }
};

export const requestBooking = async (req, res) => {
  try {
    const { spot_id, scheduled_checkin, scheduled_checkout } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required to request a booking.' });
    }

    if (!spot_id || !scheduled_checkin || !scheduled_checkout) {
      return res.status(400).json({ message: 'spot_id, scheduled_checkin, and scheduled_checkout are required.' });
    }

    const spot = await Spot.findById(spot_id);
    if (!spot) {
      return res.status(404).json({ message: 'Spot not found.' });
    }

    const durationHours = Math.max(
      1,
      Math.ceil((new Date(scheduled_checkout) - new Date(scheduled_checkin)) / (1000 * 60 * 60))
    );

    const total_fee = durationHours * Number(spot.hourly_rate);

    const booking = await Booking.create({
      spot_id,
      driver_id: req.user._id,
      host_id: spot.host_id,
      scheduled_checkin: new Date(scheduled_checkin),
      scheduled_checkout: new Date(scheduled_checkout),
      total_fee,
      booking_status: 'Pending',
    });

    return res.status(201).json({ message: 'Booking request submitted successfully.', booking });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to request booking.', error: error.message });
  }
};

export const respondToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!['Accept', 'Decline'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be either Accept or Decline.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.host_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to respond to this booking.' });
    }

    booking.booking_status = decision === 'Accept' ? 'Confirmed' : 'Declined';
    await booking.save();

    return res.status(200).json({ message: `Booking ${decision.toLowerCase()}ed successfully.`, booking });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to respond to booking.', error: error.message });
  }
};

export const checkInBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.driver_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to check in this booking.' });
    }

    booking.actual_checkin = new Date();
    booking.booking_status = 'Active_Parking';
    await booking.save();

    return res.status(200).json({ message: 'Driver checked in successfully.', booking });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to check in booking.', error: error.message });
  }
};

export const checkOutBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.driver_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to check out this booking.' });
    }

    booking.actual_checkout = new Date();
    booking.booking_status = 'Completed';
    await booking.save();

    return res.status(200).json({ message: 'Driver checked out successfully.', booking });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to check out booking.', error: error.message });
  }
};
