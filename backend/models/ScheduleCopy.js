const mongoose = require('mongoose');

const scheduleCopySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2000,
    max: 2100
  },
  scheduleData: {
    type: Map,
    of: Map,
    default: new Map()
  },
  phanCa: {
    type: Object,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh theo tháng/năm
scheduleCopySchema.index({ month: 1, year: 1 });
scheduleCopySchema.index({ createdBy: 1 });
scheduleCopySchema.index({ createdAt: -1 });

// Virtual field để lấy thông tin tháng/năm dễ đọc
scheduleCopySchema.virtual('monthYear').get(function() {
  return `${this.month}/${this.year}`;
});

// Method để lấy thông tin cơ bản
scheduleCopySchema.methods.getBasicInfo = function() {
  return {
    id: this._id,
    name: this.name,
    month: this.month,
    year: this.year,
    monthYear: this.monthYear,
    createdAt: this.createdAt,
    description: this.description,
    tags: this.tags
  };
};

module.exports = mongoose.model('ScheduleCopy', scheduleCopySchema);
