const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['view', 'edit', 'delete']
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Composite index để đảm bảo unique combination
permissionSchema.index({ resource: 1, action: 1 }, { unique: true });
permissionSchema.index({ category: 1 });
permissionSchema.index({ isActive: 1 });

// Virtual để lấy permission key dạng "resource.action"
permissionSchema.virtual('key').get(function() {
  return `${this.resource}.${this.action}`;
});

module.exports = mongoose.model('Permission', permissionSchema);
