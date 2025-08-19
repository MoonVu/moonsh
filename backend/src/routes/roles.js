/**
 * Roles Routes - Quản lý roles và permissions (chỉ dùng database)
 */

const express = require('express');
const router = express.Router();
const { attachUser, requireRole, optionalAuth } = require('../middleware/auth');
const Role = require('../../models/Role');

/**
 * GET /api/roles
 * Lấy danh sách roles từ database
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true }).select('name displayName description permissions');
    
    const rolesData = roles.map(role => ({
      value: role.name,
      label: role.displayName,
      description: role.description,
      permissions: role.getAllPermissions()
    }));

    res.json({
      success: true,
      data: {
        roles: rolesData,
        total: rolesData.length
      }
    });

  } catch (error) {
    console.error('❌ Lỗi roles list:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy danh sách roles'
    });
  }
});

/**
 * GET /api/roles/:role
 * Lấy thông tin chi tiết của một role từ database
 */
router.get('/:role', optionalAuth, async (req, res) => {
  try {
    const { role } = req.params;

    const roleDoc = await Role.findOne({ 
      name: role, 
      isActive: true 
    });

    if (!roleDoc) {
      return res.status(404).json({
        success: false,
        error: 'Role không tồn tại'
      });
    }

    res.json({
      success: true,
      data: {
        name: roleDoc.name,
        displayName: roleDoc.displayName,
        description: roleDoc.description,
        permissions: roleDoc.getAllPermissions(),
        permissionsCount: roleDoc.permissions.length
      }
    });

  } catch (error) {
    console.error('❌ Lỗi role detail:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy thông tin role'
    });
  }
});

/**
 * GET /api/roles/:role/permissions
 * Lấy permissions của role (chi tiết)
 */
router.get('/:role/permissions', optionalAuth, async (req, res) => {
  try {
    const { role } = req.params;

    const roleDoc = await Role.findOne({ 
      name: role, 
      isActive: true 
    });

    if (!roleDoc) {
      return res.status(404).json({
        success: false,
        error: 'Role không tồn tại'
      });
    }

    res.json({
      success: true,
      data: {
        role: roleDoc.name,
        displayName: roleDoc.displayName,
        permissions: roleDoc.permissions,
        flatPermissions: roleDoc.getAllPermissions()
      }
    });

  } catch (error) {
    console.error('❌ Lỗi role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy permissions của role'
    });
  }
});

module.exports = router;