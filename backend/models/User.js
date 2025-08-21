const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  group_name: String, // Giữ nguyên để hiển thị/lọc
  groupCode: String,  // Mã nhóm để mapping
  role: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  // Giữ lại role string để backward compatibility
  roleString: { 
    type: String, 
    enum: ['ADMIN', 'XNK', 'CSKH', 'FK'],
    default: 'FK'
  },
  status: { type: String, enum: ['Hoạt động', 'Tạm khóa', 'Ngưng sử dụng'], default: 'Hoạt động' },
  start_date: Date
}, { timestamps: true });

// Index cho role để truy vấn nhanh hơn
userSchema.index({ role: 1 });
userSchema.index({ roleString: 1 });
userSchema.index({ groupCode: 1 });

// Populate role khi query
userSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function() {
  this.populate('role');
});

// Virtual để lấy thông tin quyền từ role
userSchema.virtual('permissions').get(function() {
  if (this.role && this.role.getAllPermissions) {
    return this.role.getAllPermissions();
  }
  // Fallback to config file nếu chưa có role object
  const { getRolePermissionsArray } = require('../src/config/permissions');
  return getRolePermissionsArray(this.roleString);
});

// Method để kiểm tra permission
userSchema.methods.hasPermission = function(resource, action) {
  if (this.role && this.role.hasPermission) {
    return this.role.hasPermission(resource, action);
  }
  // Fallback to config file
  const { hasPermission } = require('../src/config/permissions');
  return hasPermission(this.roleString, resource, action);
};

module.exports = mongoose.model('User', userSchema);