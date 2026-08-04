import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    spot_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Spot',
      required: true,
    },
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    host_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduled_checkin: {
      type: Date,
      required: true,
    },
    scheduled_checkout: {
      type: Date,
      required: true,
    },
    actual_checkin: {
      type: Date,
      default: null,
    },
    actual_checkout: {
      type: Date,
      default: null,
    },
    total_fee: {
      type: Number,
      default: 0,
    },
    booking_status: {
      type: String,
      enum: ['Pending', 'Awaiting_Payment', 'Confirmed', 'Active_Parking', 'Completed', 'Declined', 'Expired'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Booking', bookingSchema);
