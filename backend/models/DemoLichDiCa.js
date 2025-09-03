const mongoose = require('mongoose');

const DemoLichDiCaSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // ID của nhân viên
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  dailyStatus: { 
    type: Object, 
    default: {} // Sử dụng Object thay vì Map để dễ dùng hơn
  }
}, { 
  timestamps: true,
  // Tạo compound index để đảm bảo unique cho mỗi user trong mỗi tháng/năm
  indexes: [
    { userId: 1, month: 1, year: 1, unique: true }
  ]
});

module.exports = mongoose.model('DemoLichDiCa', DemoLichDiCaSchema); 