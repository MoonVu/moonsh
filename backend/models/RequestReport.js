const mongoose = require("mongoose");

const requestReportSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  request_type: {
    type: String,
    required: true,
    enum: ['monthly_off', 'half_day_off', 'annual_leave', 'overtime_day', 'overtime_hours'],
    default: 'monthly_off'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  content: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  metadata: {
    from_date: Date,
    to_date: Date,
    reason: String,
    // Các trường bổ sung cho từng loại request
    half_day_shift: {
      type: String,
      enum: ['morning', 'afternoon']
    },
    leave_days: Number,
    emergency_contact: String,
    // Trường mới cho tăng ca
    overtime_hours: {
      type: Number,
      min: 1,
      max: 8
    }
  },
  result_link: String,
  admin_note: String, // Ghi chú từ admin khi duyệt/từ chối
  processed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processed_at: Date
}, {
  timestamps: true
});

// Indexes để tối ưu truy vấn
requestReportSchema.index({ user_id: 1, created_at: -1 });
requestReportSchema.index({ status: 1, created_at: -1 });
requestReportSchema.index({ request_type: 1, status: 1 });
requestReportSchema.index({ 'metadata.date': 1 });

// Virtual để lấy thông tin user
requestReportSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

// Virtual để lấy thông tin admin xử lý
requestReportSchema.virtual('admin', {
  ref: 'User',
  localField: 'processed_by',
  foreignField: '_id',
  justOne: true
});

// Setup virtual fields để serialize trong JSON
requestReportSchema.set('toJSON', { virtuals: true });
requestReportSchema.set('toObject', { virtuals: true });

// Method để cập nhật trạng thái
requestReportSchema.methods.updateStatus = function(newStatus, adminId, note = '') {
  this.status = newStatus;
  this.processed_by = adminId;
  this.processed_at = new Date();
  if (note) {
    this.admin_note = note;
  }
  return this.save();
};

// Method để kiểm tra quyền chỉnh sửa
requestReportSchema.methods.canEdit = function(userId, userRole) {
  // User chỉ có thể chỉnh sửa request của chính mình khi còn pending
  if (this.user_id.toString() === userId.toString() && this.status === 'pending') {
    return true;
  }
  
  // Admin có thể chỉnh sửa tất cả
  if (userRole === 'ADMIN') {
    return true;
  }
  
  return false;
};

// Pre-save middleware để validate metadata theo request_type
requestReportSchema.pre('save', function(next) {
  if (this.request_type === 'monthly_off') {
    if (!this.metadata.from_date || !this.metadata.to_date) {
      return next(new Error('Monthly off request requires from_date and to_date'));
    }
  }
  
  if (this.request_type === 'half_day_off') {
    if (!this.metadata.from_date) {
      return next(new Error('Half day off request requires from_date'));
    }
  }
  
  if (this.request_type === 'annual_leave') {
    if (!this.metadata.from_date || !this.metadata.to_date || !this.metadata.leave_days) {
      return next(new Error('Annual leave request requires from_date, to_date and leave_days'));
    }
  }
  
  // Validate cho tăng ca
  if (this.request_type === 'overtime_day') {
    if (!this.metadata.from_date) {
      return next(new Error('Overtime day request requires from_date'));
    }
  }
  
  if (this.request_type === 'overtime_hours') {
    if (!this.metadata.from_date || !this.metadata.overtime_hours) {
      return next(new Error('Overtime hours request requires from_date and overtime_hours'));
    }
    if (this.metadata.overtime_hours < 1 || this.metadata.overtime_hours > 8) {
      return next(new Error('Overtime hours must be between 1 and 8'));
    }
  }
  
  next();
});

module.exports = mongoose.model('RequestReport', requestReportSchema);
