import Booking from '../models/Booking.js';
import Spot from '../models/Spot.js';
import Payment from '../models/Payment.js';

// 1. List Bookings (Scoped by User Role)
export const listBookings = async (req, res) => {
  try {
    let filter = {};

    // Scope queries: Drivers see theirs, Hosts see theirs, Admin sees all
    if (req.user) {
      if (req.user.role === 'Driver') {
        filter = { driver_id: req.user._id };
      } else if (req.user.role === 'Host') {
        filter = { host_id: req.user._id };
      }
    }

    const bookings = await Booking.find(filter)
      .populate('driver_id', 'full_name email phone_number')
      .populate('host_id', 'full_name email phone_number')
      .populate('spot_id', 'street_address hourly_rate')
      .sort({ createdAt: -1 });

    return res.status(200).json({ message: 'Bookings fetched successfully.', bookings });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch bookings.', error: error.message });
  }
};

// 2. Request Booking with Double-Booking Collision Prevention & 15-min Buffer (FR-09)
export const requestBooking = async (req, res) => {
  try {
    const { spot_id, scheduled_checkin, scheduled_checkout } = req.body;

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required to request a booking.' });
    }

    if (!spot_id || !scheduled_checkin || !scheduled_checkout) {
      return res.status(400).json({
        message: 'spot_id, scheduled_checkin, and scheduled_checkout are required.',
      });
    }

    const checkinDate = new Date(scheduled_checkin);
    const checkoutDate = new Date(scheduled_checkout);

    if (checkoutDate <= checkinDate) {
      return res.status(400).json({ message: 'Checkout time must be after checkin time.' });
    }

    const spot = await Spot.findById(spot_id);
    if (!spot) {
      return res.status(404).json({ message: 'Spot not found.' });
    }

    // Host cannot book their own spot
    if (spot.host_id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Hosts cannot reserve their own parking space.' });
    }

    // 15-minute turnaround safety buffer (in milliseconds)
    const BUFFER_MS = 15 * 60 * 1000;

    // Fetch existing active or pending reservations for this parking space
    const existingBookings = await Booking.find({
      spot_id,
      booking_status: { $in: ['Pending', 'Confirmed', 'Active_Parking'] },
    });

    const hasCollision = existingBookings.some((b) => {
      const existingStart = new Date(b.scheduled_checkin).getTime();
      // Add 15 min buffer to the existing checkout
      const existingEndWithBuffer = new Date(b.scheduled_checkout).getTime() + BUFFER_MS;

      const reqStart = checkinDate.getTime();
      const reqEnd = checkoutDate.getTime();

      // Check overlap between [reqStart, reqEnd] and [existingStart, existingEndWithBuffer]
      return reqStart < existingEndWithBuffer && reqEnd > existingStart;
    });

    if (hasCollision) {
      return res.status(409).json({
        message: 'Slot collision: This spot is occupied or within the 15-minute turnaround buffer. Please choose a later arrival window.',
      });
    }

    const durationHours = Math.max(
      1,
      Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60))
    );

    const total_fee = durationHours * Number(spot.hourly_rate);

    const booking = await Booking.create({
      spot_id,
      driver_id: req.user._id,
      host_id: spot.host_id,
      scheduled_checkin: checkinDate,
      scheduled_checkout: checkoutDate,
      total_fee,
      booking_status: 'Pending',
    });

    return res.status(201).json({ message: 'Booking request submitted successfully.', booking });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to request booking.', error: error.message });
  }
};

// 3. Respond to Booking (Host Accept / Decline)
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

// 4. Driver Check-In (FR-12) - Enforcing Single Active Parking Session
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

    // Guardrail: A driver cannot have more than ONE active parking session at a time
    const existingActive = await Booking.findOne({
      driver_id: req.user._id,
      booking_status: 'Active_Parking',
      _id: { $ne: booking._id },
    }).populate('spot_id', 'street_address');

    if (existingActive) {
      return res.status(400).json({
        message: `Active parking in progress: You are currently parked at "${existingActive.spot_id?.street_address || 'another spot'}". You must check out and pay before checking into another space.`,
      });
    }

    booking.actual_checkin = new Date();
    booking.booking_status = 'Active_Parking';
    await booking.save();

    return res.status(200).json({ message: 'Driver checked in successfully.', booking });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to check in booking.', error: error.message });
  }
};

// 5. Driver Check-Out & Overstay Penalty Settlement (FR-13, FR-14, FR-16)
export const checkOutBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, payment_gateway } = req.body;

    const booking = await Booking.findById(id).populate('spot_id', 'street_address hourly_rate');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.driver_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to check out this booking.' });
    }

    const now = new Date();
    booking.actual_checkout = now;
    booking.booking_status = 'Completed';

    // OVERSTAY PENALTY ALGORITHM (Rs. 100/hr)
    const scheduledEnd = new Date(booking.scheduled_checkout).getTime();
    const actualEnd = now.getTime();
    const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5-minute courtesy grace period
    const PENALTY_RATE_PER_HOUR = 100;     // Rs. 100/hr flat overstay penalty

    let overstayHours = 0;
    let overstayFee = 0;

    if (actualEnd > scheduledEnd + GRACE_PERIOD_MS) {
      const overstayDurationMs = actualEnd - scheduledEnd;
      overstayHours = Math.ceil(overstayDurationMs / (1000 * 60 * 60)); // rounded up to next hour
      overstayFee = overstayHours * PENALTY_RATE_PER_HOUR;
    }

    booking.overstay_hours = overstayHours;
    booking.overstay_fee = overstayFee;
    booking.total_fee = Number(booking.total_fee || 0) + overstayFee;

    if (rating) booking.rating = Number(rating);
    if (payment_gateway) booking.payment_gateway = payment_gateway;
    await booking.save();

    // Settle in Payment ledger with updated total fee
    await Payment.create({
      booking_id: booking._id,
      gateway_provider: payment_gateway || 'EasyPaisa',
      transaction_id: `TXN-${Date.now().toString().slice(-6)}`,
      amount_pkr: booking.total_fee,
      escrow_status: 'Settled',
    });

    return res.status(200).json({
      message: 'Driver checked out successfully.',
      booking,
      overstay: {
        hours: overstayHours,
        fee: overstayFee,
        isPenalized: overstayFee > 0,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to check out booking.', error: error.message });
  }
};