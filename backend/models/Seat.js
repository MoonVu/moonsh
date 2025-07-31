const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  grid: { type: [[mongoose.Schema.Types.Mixed]], required: true },
  tagList: { type: [String], default: [] },
  walkwayColIndexes: { type: [Number], default: [] },
  walkwayRowIndexes: { type: [Number], default: [] },
  lastModifiedBy: { type: String, default: '' },
  lastModifiedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
}, { timestamps: true });

// Middleware để tự động cập nhật lastModifiedAt và version
seatSchema.pre('save', function(next) {
  this.lastModifiedAt = new Date();
  this.version += 1;
  next();
});

module.exports = mongoose.model('Seat', seatSchema); 