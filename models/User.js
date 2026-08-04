import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    phone_number: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['Driver', 'Host', 'SuperAdmin'],
      default: 'Driver',
    },
    is_profile_verified: {
      type: Boolean,
      default: false,
    },
    cnic_matrix: {
      cnic_number: {
        type: String,
        default: '',
      },
      cnic_front_url: {
        type: String,
        default: '',
      },
      cnic_back_url: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('User', userSchema);
