const mongoose = require('mongoose');

const userPositionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  page: {
    type: String,
    required: true,
    default: '/'
  },
  scrollPosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  selectedTab: {
    type: String,
    default: ''
  },
  gridState: {
    selectedItems: [String],
    expandedRows: [String],
    filters: mongoose.Schema.Types.Mixed,
    sortBy: String,
    sortOrder: String
  },
  formData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  componentState: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware để tự động cập nhật updatedAt
userPositionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserPosition', userPositionSchema); 