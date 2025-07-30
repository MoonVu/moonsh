const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  group_name: String,
  status: { type: String, enum: ['Hoạt động', 'Tạm khóa', 'Ngưng sử dụng'], default: 'Hoạt động' },
  start_date: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);