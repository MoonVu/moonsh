const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  grid: { type: [[mongoose.Schema.Types.Mixed]], required: true }, // mảng 2 chiều lưu trạng thái lưới
  tagList: { type: [String], default: [] }, // key của acc trong tag
  walkwayColIndexes: { type: [Number], default: [] },
  // Có thể bổ sung thêm các trường khác nếu cần
}, { timestamps: true });

module.exports = mongoose.model('Seat', seatSchema); 