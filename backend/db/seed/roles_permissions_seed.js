const mongoose = require('mongoose');
const Role = require('../../models/Role');
const Permission = require('../../models/Permission');
const { ROLE_PERMISSIONS, RESOURCES, PERMISSIONS } = require('../../src/config/permissions');

/**
 * Seed roles và permissions vào database
 */
async function seedRolesAndPermissions() {
  try {
    console.log('🌱 Bắt đầu seed roles và permissions...');

    // Kiểm tra có users nào đang sử dụng roles không
    const User = require('../../models/User');
    const userCount = await User.countDocuments({ role: { $exists: true, $ne: null } });
    
    if (userCount > 0) {
      console.log(`⚠️ Có ${userCount} users đang sử dụng roles. Chỉ cập nhật permissions, không xóa roles.`);
      
      // Chỉ xóa permissions, giữ roles
      await Permission.deleteMany({});
      console.log('🗑️ Đã xóa permissions cũ, giữ nguyên roles');
    } else {
      // Xóa dữ liệu cũ nếu không có users
      await Role.deleteMany({});
      await Permission.deleteMany({});
      console.log('🗑️ Đã xóa dữ liệu cũ');
    }

    // Tạo permissions từ RESOURCES và PERMISSIONS
    const permissionsToCreate = [];
    
    Object.values(RESOURCES).forEach(resource => {
      Object.values(PERMISSIONS).forEach(action => {
        permissionsToCreate.push({
          resource: resource,
          action: action,
          displayName: `${getResourceLabel(resource)} - ${getActionLabel(action)}`,
          description: `Quyền ${getActionLabel(action)} cho ${getResourceLabel(resource)}`,
          category: getResourceCategory(resource),
          isActive: true
        });
      });
    });

    const createdPermissions = await Permission.insertMany(permissionsToCreate);
    console.log(`✅ Đã tạo ${createdPermissions.length} permissions`);

    // Tạo roles với permissions từ config
    const rolesToCreate = [
      {
        name: 'ADMIN',
        displayName: 'Quản trị viên',
        description: 'Có toàn quyền truy cập hệ thống',
        permissions: convertRolePermissions('ADMIN'),
        isActive: true
      },
      {
        name: 'XNK',
        displayName: 'XNK', 
        description: 'Xuất Nhập Khoản',
        permissions: convertRolePermissions('XNK'),
        isActive: true
      },
      {
        name: 'CSKH',
        displayName: 'CSKH',
        description: 'CSKH',
        permissions: convertRolePermissions('CSKH'),
        isActive: true
      },
      {
        name: 'FK',
        displayName: 'Duyệt đơn',
        description: 'Duyệt đơn',
        permissions: convertRolePermissions('FK'),
        isActive: true
      }
    ];

    const createdRoles = await Role.insertMany(rolesToCreate);
    console.log(`✅ Đã tạo ${createdRoles.length} roles`);

    console.log('🎉 Seed hoàn thành!');
    return { permissions: createdPermissions, roles: createdRoles };

  } catch (error) {
    console.error('❌ Lỗi khi seed:', error);
    throw error;
  }
}

/**
 * Convert role permissions từ config sang format database
 */
function convertRolePermissions(roleName) {
  const rolePerms = ROLE_PERMISSIONS[roleName] || {};
  const permissions = [];

  Object.entries(rolePerms).forEach(([resource, actions]) => {
    if (Array.isArray(actions)) {
      permissions.push({
        resource: resource,
        actions: actions
      });
    }
  });

  return permissions;
}

/**
 * Lấy label cho resource
 */
function getResourceLabel(resource) {
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
    'repository_management': 'Quản lý kho dữ liệu',
    'schedules': 'Lịch trình',
    'users': 'Người dùng',
    'tasks': 'Nhiệm vụ',
    'seats': 'Chỗ ngồi',
    'notifications': 'Thông báo',
    'reports': 'Báo cáo',
    'system': 'Hệ thống'
  };
  return labels[resource] || resource;
}

/**
 * Lấy label cho action
 */
function getActionLabel(action) {
  const labels = {
    'view': 'Xem',
    'edit': 'Sửa',
    'delete': 'Xóa'
  };
  return labels[action] || action;
}

/**
 * Lấy category cho resource
 */
function getResourceCategory(resource) {
  const categories = {
    'administrator_access': 'admin',
    'user_management': 'management',
    'content_management': 'management', 
    'financial_management': 'finance',
    'reporting': 'reports',
    'payroll': 'finance',
    'disputes_management': 'support',
    'api_controls': 'system',
    'database_management': 'system',
    'repository_management': 'system',
    'schedules': 'operations',
    'users': 'management',
    'tasks': 'operations',
    'seats': 'operations',
    'notifications': 'system',
    'reports': 'reports',
    'system': 'system'
  };
  return categories[resource] || 'general';
}

module.exports = { seedRolesAndPermissions };