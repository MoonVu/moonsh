/**
 * Roles Routes - Quản lý roles và permissions
 */

const express = require('express');
const router = express.Router();
const { attachUser, requireRole, optionalAuth } = require('../middleware/auth');
const { ROLES, ROLE_PERMISSIONS, getAllPermissions, getRolePermissions } = require('../config/permissions');
const { GROUP_TO_ROLE_MAP, getRoleToGroupsMap } = require('../config/role-map');

/**
 * GET /api/roles
 * Lấy danh sách roles (public - không cần auth)
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const roles = Object.values(ROLES).map(role => ({
      value: role,
      label: getRoleDisplayName(role),
      description: getRoleDescription(role),
      permissions: getRolePermissions(role)
    }));

    res.json({
      success: true,
      data: {
        roles,
        total: roles.length
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
 * Lấy thông tin chi tiết của một role
 */
router.get('/:role', optionalAuth, (req, res) => {
  try {
    const { role } = req.params;

    if (!Object.values(ROLES).includes(role)) {
      return res.status(404).json({
        success: false,
        error: 'Role không tồn tại'
      });
    }

    const roleInfo = {
      value: role,
      label: getRoleDisplayName(role),
      description: getRoleDescription(role),
      permissions: getRolePermissions(role),
      groupCodes: getGroupCodesByRole(role),
      resources: ROLE_PERMISSIONS[role] || {}
    };

    res.json({
      success: true,
      data: roleInfo
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
 * GET /api/roles/groups/mapping
 * Lấy mapping giữa groups và roles
 */
router.get('/groups/mapping', optionalAuth, (req, res) => {
  try {
    const groupToRole = GROUP_TO_ROLE_MAP;
    const roleToGroups = getRoleToGroupsMap();

    res.json({
      success: true,
      data: {
        groupToRole,
        roleToGroups,
        summary: {
          totalGroups: Object.keys(groupToRole).length,
          totalRoles: Object.keys(roleToGroups).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Lỗi roles mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy mapping roles'
    });
  }
});

/**
 * GET /api/roles/permissions/matrix
 * Lấy ma trận permissions (chỉ admin mới thấy chi tiết)
 */
router.get('/permissions/matrix', attachUser, (req, res) => {
  try {
    const isAdmin = req.user.role === ROLES.ADMIN;
    
    let permissionsMatrix;
    
    if (isAdmin) {
      // Admin thấy full matrix
      permissionsMatrix = ROLE_PERMISSIONS;
    } else {
      // User thường chỉ thấy permissions của role mình
      permissionsMatrix = {
        [req.user.role]: ROLE_PERMISSIONS[req.user.role] || {}
      };
    }

    // Tạo summary matrix cho UI
    const summaryMatrix = {};
    Object.keys(permissionsMatrix).forEach(role => {
      summaryMatrix[role] = {};
      const rolePerms = permissionsMatrix[role];
      
      Object.keys(rolePerms).forEach(resource => {
        summaryMatrix[role][resource] = {
          view: rolePerms[resource].includes('view'),
          edit: rolePerms[resource].includes('edit'), 
          delete: rolePerms[resource].includes('delete')
        };
      });
    });

    res.json({
      success: true,
      data: {
        matrix: permissionsMatrix,
        summary: summaryMatrix,
        userRole: req.user.role,
        isAdmin
      }
    });

  } catch (error) {
    console.error('❌ Lỗi permissions matrix:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy ma trận permissions'
    });
  }
});

/**
 * GET /api/roles/groups/list
 * Lấy danh sách groups với thông tin display
 */
router.get('/groups/list', optionalAuth, (req, res) => {
  try {
    const groups = Object.keys(GROUP_TO_ROLE_MAP).map(groupCode => ({
      code: groupCode,
      label: getGroupDisplayName(groupCode),
      role: GROUP_TO_ROLE_MAP[groupCode],
      roleLabel: getRoleDisplayName(GROUP_TO_ROLE_MAP[groupCode])
    }));

    // Nhóm theo role
    const groupsByRole = {};
    groups.forEach(group => {
      if (!groupsByRole[group.role]) {
        groupsByRole[group.role] = [];
      }
      groupsByRole[group.role].push(group);
    });

    res.json({
      success: true,
      data: {
        groups,
        groupsByRole,
        total: groups.length
      }
    });

  } catch (error) {
    console.error('❌ Lỗi groups list:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy danh sách groups'
    });
  }
});

// Helper functions
function getRoleDisplayName(role) {
  const displayNames = {
    [ROLES.ADMIN]: 'Quản trị viên',
    [ROLES.XNK]: 'Xuất nhập khẩu',
    [ROLES.CSKH]: 'Chăm sóc khách hàng',
    [ROLES.FK]: 'Duyệt đơn'
  };
  return displayNames[role] || role;
}

function getRoleDescription(role) {
  const descriptions = {
    [ROLES.ADMIN]: 'Quyền cao nhất, quản lý toàn hệ thống',
    [ROLES.XNK]: 'Quản lý lịch trình và nhiệm vụ xuất nhập khẩu',
    [ROLES.CSKH]: 'Xử lý thông báo và hỗ trợ khách hàng',
    [ROLES.FK]: 'Xem thông tin cơ bản và duyệt đơn'
  };
  return descriptions[role] || '';
}

function getGroupCodesByRole(role) {
  return Object.keys(GROUP_TO_ROLE_MAP).filter(
    groupCode => GROUP_TO_ROLE_MAP[groupCode] === role
  );
}

function getGroupDisplayName(groupCode) {
  const displayNames = {
    'TT': 'Tổ trưởng',
    'PCQ': 'Phó Chủ quản',
    'CQ': 'Chủ quản',
    'XNK': 'Xuất nhập khoản',
    'CSKH': 'CSKH',
    'CSOL': 'CSKH Online',
    'CSDL': 'CS Đại Lý',
    'Truyền thông': 'Truyền thông',
    'FK': 'FK',
    'FK-X': 'FK-X'
  };
  return displayNames[groupCode] || groupCode;
}

module.exports = router;
