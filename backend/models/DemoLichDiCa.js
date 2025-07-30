const mongoose = require('mongoose');

const DemoLichDiCaSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // ID của nhân viên
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  dailyStatus: { 
    type: Map, 
    of: String, // OFF, 1/2, VP, QL, X, KL, hoặc rỗng
    default: new Map()
  }
}, { 
  timestamps: true,
  // Tạo compound index để đảm bảo unique cho mỗi user trong mỗi tháng/năm
  indexes: [
    { userId: 1, month: 1, year: 1, unique: true }
  ]
});

module.exports = mongoose.model('DemoLichDiCa', DemoLichDiCaSchema); 