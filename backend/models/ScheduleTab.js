const mongoose = require('mongoose');

const scheduleTabSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Tên tab ("DEMO", "Tháng 7/2025", ...)
  type: { type: String, enum: ['demo', 'month'], default: 'demo' },
  visible: { type: Boolean, default: false }, // Switch hiển thị/ẩn
  data: { type: mongoose.Schema.Types.Mixed, default: {} }, // Dữ liệu lịch đi ca
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScheduleTab', scheduleTabSchema); 