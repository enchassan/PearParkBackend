const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  hostName: {
    type: String,
    required: true,
    trim: true
  },
  spaceType: {
    type: String,
    required: true // e.g., "DHA Phase 5 Driveway", "Gulberg Covered Garage"
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  // CRITICAL FOR THE ADMIN PANEL PIPELINE
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt tracking fields

module.exports = mongoose.model('Listing', ListingSchema);