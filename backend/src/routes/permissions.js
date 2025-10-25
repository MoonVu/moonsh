const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authOptimized, requireAdmin } = require('../middleware/authOptimized');
const Role = require('../../models/Role');
const Permission = require('../../models/Permission');

// Use optimized auth middleware for all routes
router.use(authOptimized);

// Chỉ giữ lại constants cần thiết
const PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit', 
  DELETE: 'delete'
};

// Get all available roles and resources
router.get('/roles', requireAdmin, async (req, res) => {
  try {
    // Lấy roles từ database
    const roles = await Role.find({ isActive: true }).select('name displayName description');
    const rolesList = roles.map(role => ({
      key: role.name,
      label: role.displayName,
      description: role.description,
      id: role._id
    }));

    // Lấy unique resources từ permissions
    const permissions = await Permission.find({ isActive: true }).select('resource action displayName category');
    const resourcesMap = new Map();
    
    permissions.forEach(perm => {
      if (!resourcesMap.has(perm.resource)) {
        resourcesMap.set(perm.resource, {
          key: perm.resource,
          label: getResourceLabel(perm.resource),
          category: perm.category
        });
      }
    });

    const resourcesList = Array.from(resourcesMap.values());

    res.json({
      success: true,
      data: {
        roles: rolesList,
        resources: resourcesList,
        permissions: Object.values(PERMISSIONS),
        allPermissions: permissions
      }
    });
  } catch (error) {
    console.error('Error getting roles and resources:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách roles và resources'
    });
  }
});

// Get permissions for a specific role
router.get('/roles/:role/permissions', requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    
    // Tìm role trong database
    const roleDoc = await Role.findOne({ 
      $or: [
        { name: role },
        { _id: mongoose.Types.ObjectId.isValid(role) ? role : null }
      ],
      isActive: true 
    });

    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'Role không tồn tại'
      });
    }

    // Lấy tất cả resources có thể có
    const allPermissions = await Permission.find({ isActive: true });
    const resourcesMap = new Map();
    
    allPermissions.forEach(perm => {
      if (!resourcesMap.has(perm.resource)) {
        resourcesMap.set(perm.resource, {
          [PERMISSIONS.VIEW]: false,
          [PERMISSIONS.EDIT]: false,
          [PERMISSIONS.DELETE]: false
        });
      }
    });
    
    // Override với permissions thực tế của role
    roleDoc.permissions.forEach(rolePerm => {
      if (resourcesMap.has(rolePerm.resource)) {
        const resourcePerms = resourcesMap.get(rolePerm.resource);
        rolePerm.actions.forEach(action => {
          if (Object.values(PERMISSIONS).includes(action)) {
            resourcePerms[action] = true;
          }
        });
      }
    });

    // Convert Map thành object
    const convertedPermissions = {};
    resourcesMap.forEach((perms, resource) => {
      convertedPermissions[resource] = perms;
    });
    
    console.log(`🔍 Converted permissions for ${roleDoc.name}:`, convertedPermissions);
    
    res.json({
      success: true,
      data: convertedPermissions
    });
  } catch (error) {
    console.error('Error getting role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy quyền của role'
    });
  }
});

// Update permissions for a specific role
router.put('/roles/:role/permissions', requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    // Tìm role trong database
    const roleDoc = await Role.findOne({ 
      $or: [
        { name: role },
        { _id: mongoose.Types.ObjectId.isValid(role) ? role : null }
      ],
      isActive: true 
    });

    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'Role không tồn tại'
      });
    }

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu permissions không hợp lệ'
      });
    }

    // Validate permissions structure
    for (const [resourceKey, resourcePerms] of Object.entries(permissions)) {
      if (typeof resourcePerms !== 'object') {
        return res.status(400).json({
          success: false,
          message: `Permissions cho resource ${resourceKey} không hợp lệ`
        });
      }

      for (const [permission, value] of Object.entries(resourcePerms)) {
        if (!Object.values(PERMISSIONS).includes(permission)) {
          return res.status(400).json({
            success: false,
            message: `Permission ${permission} không hợp lệ`
          });
        }
        
        if (typeof value !== 'boolean') {
          return res.status(400).json({
            success: false,
            message: `Giá trị permission ${permission} phải là boolean`
          });
        }
      }
    }

    // Convert frontend format {resource: {view: true, edit: false}} to database format
    const newPermissions = [];
    for (const [resourceKey, resourcePerms] of Object.entries(permissions)) {
      const enabledActions = [];
      for (const [permission, enabled] of Object.entries(resourcePerms)) {
        if (enabled === true) {
          enabledActions.push(permission);
        }
      }
      
      if (enabledActions.length > 0) {
        newPermissions.push({
          resource: resourceKey,
          actions: enabledActions
        });
      }
    }

    // Cập nhật permissions cho role trong database
    roleDoc.permissions = newPermissions;
    await roleDoc.save();

    console.log(`✅ Updated permissions for role ${roleDoc.name}:`, newPermissions);

    res.json({
      success: true,
      message: `Cập nhật quyền cho role ${roleDoc.displayName} thành công!`,
      data: roleDoc.permissions
    });

  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật quyền'
    });
  }
});

// Helper functions for labels
function getRoleLabel(role) {
  const labels = {
    [ROLES.ADMIN]: 'Quản trị viên',
    [ROLES.XNK]: 'XNK', 
    [ROLES.CSKH]: 'CSKH',
    [ROLES.FK]: 'Duyệt đơn'
  };
  return labels[role] || role;
}

function getResourceLabel(resourceKey) {
  const labels = {
    'administrator_access': 'Quyền quản trị',
    'user_management': 'Quản lý người dùng',
    'content_management': 'Quản lý nội dung',
    'financial_management': 'Quản lý tài chính', 
    'reporting': 'Báo cáo',
    'payroll': 'Bảng lương',
    'disputes_management': 'Xử lý khiếu nại',
    'api_controls': 'Điều khiển API',
    'database_management': 'Quản lý cơ sở dữ liệu',
    'repository_management': 'Quản lý kho dữ liệu'
  };
  return labels[resourceKey] || resourceKey;
}

module.exports = router;
