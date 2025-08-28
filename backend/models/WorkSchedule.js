const mongoose = require("mongoose");

const workScheduleSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  shift: {
    type: String,
    required: true,
    enum: ['morning', 'afternoon', 'full_day'],
    default: 'full_day'
  },
  status: {
    type: String,
    required: true,
    enum: ['working', 'off', 'half_day_off', 'annual_leave'],
    default: 'working'
  },
  note: {
    type: String,
    maxlength: 500
  },
  request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RequestReport'
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: Date,
  // Thông tin bổ sung cho từng loại status
  metadata: {
    half_day_shift: {
      type: String,
      enum: ['morning', 'afternoon']
    },
    leave_days: Number,
    leave_type: {
      type: String,
      enum: ['sick', 'annual', 'personal', 'maternity', 'other']
    },
    emergency_contact: String
  }
}, {
  timestamps: true
});

// Indexes để tối ưu truy vấn
workScheduleSchema.index({ user_id: 1, date: 1 }, { unique: true });
workScheduleSchema.index({ date: 1, status: 1 });
workScheduleSchema.index({ user_id: 1, status: 1 });
workScheduleSchema.index({ 'metadata.leave_type': 1 });

// Virtual để lấy thông tin user
workScheduleSchema.virtual('user', {
  ref: 'User',
  localField: 'user_id',
  foreignField: '_id',
  justOne: true
});

// Virtual để lấy thông tin request gốc
workScheduleSchema.virtual('request', {
  ref: 'RequestReport',
  localField: 'request_id',
  foreignField: '_id',
  justOne: true
});

// Virtual để lấy thông tin admin duyệt
workScheduleSchema.virtual('admin', {
  ref: 'User',
  localField: 'approved_by',
  foreignField: '_id',
  justOne: true
});

// Method để tạo work schedule từ request
workScheduleSchema.statics.createFromRequest = function(requestData) {
  const workSchedule = new this({
    user_id: requestData.user_id,
    date: requestData.metadata.from_date,
    shift: this.mapRequestTypeToShift(requestData.request_type, requestData.metadata),
    status: this.mapRequestTypeToStatus(requestData.request_type),
    note: requestData.description,
    request_id: requestData._id,
    approved_by: requestData.processed_by,
    approved_at: requestData.processed_at,
    metadata: this.extractMetadata(requestData)
  });
  
  return workSchedule.save();
};

// Static method để map request type sang status
workScheduleSchema.statics.mapRequestTypeToStatus = function(requestType) {
  const statusMap = {
    'monthly_off': 'off',
    'half_day_off': 'half_day_off',
    'annual_leave': 'annual_leave'
  };
  return statusMap[requestType] || 'working';
};

// Static method để map request type sang shift
workScheduleSchema.statics.mapRequestTypeToShift = function(requestType, metadata) {
  if (requestType === 'half_day_off') {
    return metadata.half_day_shift === 'morning' ? 'morning' : 'afternoon';
  }
  return 'full_day';
};

// Static method để extract metadata từ request
workScheduleSchema.statics.extractMetadata = function(requestData) {
  const metadata = {};
  
  if (requestData.request_type === 'monthly_off') {
    metadata.leave_type = requestData.metadata.reason?.includes('ốm') ? 'sick' : 'personal';
    metadata.emergency_contact = requestData.metadata.emergency_contact;
  }
  
  if (requestData.request_type === 'half_day_off') {
    metadata.half_day_shift = requestData.metadata.half_day_shift;
    metadata.leave_type = requestData.metadata.reason?.includes('ốm') ? 'sick' : 'personal';
  }
  
  if (requestData.request_type === 'annual_leave') {
    metadata.leave_days = requestData.metadata.leave_days;
    metadata.leave_type = 'annual';
    metadata.emergency_contact = requestData.metadata.emergency_contact;
  }
  
  return metadata;
};

// Method để cập nhật trạng thái
workScheduleSchema.methods.updateStatus = function(newStatus, note = '') {
  this.status = newStatus;
  if (note) {
    this.note = note;
  }
  return this.save();
};

module.exports = mongoose.model('WorkSchedule', workScheduleSchema);
