const mongoose = require("mongoose");
const { ROLES } = require('../src/config/permissions');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  group_name: String, // Giữ nguyên để hiển thị/lọc
  groupCode: String,  // Mã nhóm để mapping
  role: { 
    type: String, 
    enum: Object.values(ROLES),
    required: true,
    default: ROLES.FK  // Mặc định là role thấp nhất
  },
  status: { type: String, enum: ['Hoạt động', 'Tạm khóa', 'Ngưng sử dụng'], default: 'Hoạt động' },
  start_date: Date
}, { timestamps: true });

// Index cho role để truy vấn nhanh hơn
userSchema.index({ role: 1 });
userSchema.index({ groupCode: 1 });

// Virtual để lấy thông tin quyền
userSchema.virtual('permissions').get(function() {
  const { getRolePermissions } = require('../src/config/permissions');
  return getRolePermissions(this.role);
});

module.exports = mongoose.model('User', userSchema);