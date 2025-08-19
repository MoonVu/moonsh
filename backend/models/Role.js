const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['ADMIN', 'XNK', 'CSKH', 'FK']
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  permissions: [{
    resource: {
      type: String,
      required: true
    },
    actions: [{
      type: String,
      enum: ['view', 'edit', 'delete'],
      required: true
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Index để tìm kiếm nhanh
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });

// Method để kiểm tra permission
roleSchema.methods.hasPermission = function(resource, action) {
  const resourcePermission = this.permissions.find(p => p.resource === resource);
  return resourcePermission ? resourcePermission.actions.includes(action) : false;
};

// Method để lấy tất cả permissions dạng flat array
roleSchema.methods.getAllPermissions = function() {
  const permissions = [];
  this.permissions.forEach(perm => {
    perm.actions.forEach(action => {
      permissions.push(`${perm.resource}.${action}`);
    });
  });
  return permissions;
};

module.exports = mongoose.model('Role', roleSchema);
