const mongoose = require('mongoose');

const spotSchema = new mongoose.Schema(
  {
    host_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    street_address: {
      type: String,
      required: true,
      trim: true,
    },
    hourly_rate: {
      type: Number,
      required: true,
      min: 0,
    },
    spot_images: {
      type: [String],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    spot_status: {
      type: String,
      enum: ['Approved', 'Pending', 'Suspended'],
      default: 'Pending',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

spotSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Spot', spotSchema);
