const mongoose = require('mongoose');

const leaveScheduleSchema = new mongoose.Schema({
  // Thông tin nhân viên (không bắt buộc, có thể để trống)
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Bộ phận
  department: {
    type: String,
    required: true
  },
  
  // Tên nhân viên
  employeeName: {
    type: String,
    required: true
  },
  
  // Ngày đủ phép tiếp theo
  nextLeaveDate: {
    type: Date,
    required: true
  },
  
  // Ngày nghỉ phép (bắt đầu)
  leaveStartDate: {
    type: Date,
    required: true
  },
  
  // Ngày nghỉ phép (kết thúc)
  leaveEndDate: {
    type: Date,
    required: true
  },
  
  // Ngày quay lại làm việc
  returnDate: {
    type: Date,
    required: true
  },
  
  // Số ngày nghỉ phép
  leaveDays: {
    type: Number,
    required: true,
    min: 1,
    max: 17
  },
  
  // Loại phép
  leaveType: {
    type: String,
    enum: ['Việc riêng', 'Phép 6 tháng'],
    required: true
  },
  
  // Trạng thái
  status: {
    type: String,
    enum: ['Đợi ngày về phép', 'Đang về phép', 'Hoàn thành phép', 'Hủy phép'],
    default: 'Đợi ngày về phép'
  },
  
  // Loại hình sắp xếp
  arrangementType: {
    type: String,
    enum: ['Tổ trưởng xếp', 'Theo lịch OA', 'Nhân viên rời ngày', 'Nhân viên xin lịch', 'Trợ lý xếp'],
    required: true
  },
  
  // Ghi chú
  notes: {
    type: String,
    default: ''
  },
  
  // Người tạo
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Người cập nhật cuối
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index để tối ưu truy vấn
leaveScheduleSchema.index({ employeeId: 1, status: 1 });
leaveScheduleSchema.index({ department: 1 });
leaveScheduleSchema.index({ leaveStartDate: 1, leaveEndDate: 1 });

// Virtual field để tính ngày nghỉ phép dạng chuỗi
leaveScheduleSchema.virtual('leavePeriod').get(function() {
  if (this.leaveStartDate && this.leaveEndDate) {
    const start = this.leaveStartDate.toLocaleDateString('vi-VN');
    const end = this.leaveEndDate.toLocaleDateString('vi-VN');
    return `${start} - ${end}`;
  }
  return '';
});

// Virtual field để format ngày
leaveScheduleSchema.virtual('formattedNextLeaveDate').get(function() {
  return this.nextLeaveDate ? this.nextLeaveDate.toLocaleDateString('vi-VN') : '';
});

leaveScheduleSchema.virtual('formattedReturnDate').get(function() {
  return this.returnDate ? this.returnDate.toLocaleDateString('vi-VN') : '';
});

// Middleware để tự động tính số ngày nghỉ phép
leaveScheduleSchema.pre('save', function(next) {
  if (this.leaveStartDate && this.leaveEndDate) {
    const start = new Date(this.leaveStartDate);
    const end = new Date(this.leaveEndDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    this.leaveDays = diffDays;
  }
  
  // Nếu là phép 6 tháng thì mặc định 17 ngày
  if (this.leaveType === 'Phép 6 tháng') {
    this.leaveDays = 17;
  }
  
  next();
});

module.exports = mongoose.model('LeaveSchedule', leaveScheduleSchema);
