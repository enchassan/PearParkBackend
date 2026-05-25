const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema({
  raisedBy: {
    type: String, // User name or ID filing the issue
    required: true
  },
  reason: {
    type: String,
    required: true // e.g., "Spot was blocked by another car"
  },
  details: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'Resolved'],
    default: 'Open'
  }
}, { timestamps: true });

module.exports = mongoose.model('Dispute', DisputeSchema);