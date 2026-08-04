import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    gateway_provider: {
      type: String,
      enum: ['JazzCash', 'EasyPaisa'],
      required: true,
    },
    transaction_id: {
      type: String,
      required: true,
      trim: true,
    },
    amount_pkr: {
      type: Number,
      required: true,
      min: 0,
    },
    escrow_status: {
      type: String,
      enum: ['Escrow_Locked', 'Settled', 'Refunded'],
      default: 'Escrow_Locked',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Payment', paymentSchema);
