const mongoose = require('mongoose');

const ActivityDataSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  timeSpent: {
    type: Number,  // Time in seconds
    required: true
  },
  category: {
    type: String,
    enum: ['productive', 'distraction', 'neutral'],
    default: 'neutral'
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
ActivityDataSchema.index({ user: 1, date: 1 });
ActivityDataSchema.index({ user: 1, domain: 1, date: 1 });

module.exports = mongoose.model('ActivityData', ActivityDataSchema);