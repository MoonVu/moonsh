const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  group: {
    type: String,
    required: true,
    enum: ['CSKH', 'FK', 'XNK', 'TOTRUONG']
  },
  month: {
    type: Number,
    required: false, // Tạm thời bỏ required để xử lý xóa user
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: false, // Tạm thời bỏ required để xử lý xóa user
    min: 2020,
    max: 2030
  },
  shifts: [{
    label: { type: String, required: true },
    key: { type: String, default: null }, // ca1,ca2, ...
    time: { type: String, default: '' },
    users: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: { type: String },
      group_name: { type: String },
      note: { type: String, default: '' }
    }]
  }],
  waiting: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true,
  // Đảm bảo mỗi group + tháng + năm chỉ có 1 document (nếu có month và year)
  indexes: [{ group: 1, month: 1, year: 1 }, { unique: true, sparse: true }]
});

module.exports = mongoose.model('Schedule', scheduleSchema); 