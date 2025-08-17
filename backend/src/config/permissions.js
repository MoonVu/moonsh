/**
 * Cấu hình quyền hệ thống Moonne
 * Ma trận quyền: ADMIN | XNK | CSKH | FK
 */

// Định nghĩa các roles trong hệ thống
const ROLES = {
  ADMIN: 'ADMIN',
  XNK: 'XNK', 
  CSKH: 'CSKH',
  FK: 'FK'
};

// Định nghĩa các permissions cơ bản
const PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit', 
  DELETE: 'delete'
};

// Ma trận quyền - định nghĩa quyền cho từng role
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    schedules: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    users: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    tasks: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    seats: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    notifications: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    reports: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    system: [PERMISSIONS.VIEW, PERMISSIONS.EDIT]
  },
  
  [ROLES.XNK]: {
    schedules: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    tasks: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    seats: [PERMISSIONS.VIEW],
    notifications: [PERMISSIONS.VIEW],
    reports: [PERMISSIONS.VIEW]
  },
  
  [ROLES.CSKH]: {
    schedules: [PERMISSIONS.VIEW],
    tasks: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    seats: [PERMISSIONS.VIEW],
    notifications: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    reports: [PERMISSIONS.VIEW]
  },
  
  [ROLES.FK]: {
    schedules: [PERMISSIONS.VIEW],
    tasks: [PERMISSIONS.VIEW],
    seats: [PERMISSIONS.VIEW],
    notifications: [PERMISSIONS.VIEW],
    reports: [PERMISSIONS.VIEW]
  }
};

// Danh sách tất cả permissions trong hệ thống
const ALL_PERMISSIONS = [
  // Schedule permissions
  'schedules.view', 'schedules.edit', 'schedules.delete',
  
  // User permissions  
  'users.view', 'users.edit', 'users.delete',
  
  // Task permissions
  'tasks.view', 'tasks.edit', 'tasks.delete',
  
  // Seat permissions
  'seats.view', 'seats.edit', 'seats.delete',
  
  // Notification permissions
  'notifications.view', 'notifications.edit', 'notifications.delete',
  
  // Report permissions
  'reports.view', 'reports.edit',
  
  // System permissions
  'system.view', 'system.edit'
];

/**
 * Kiểm tra user có permission hay không
 * @param {string} userRole - Role của user
 * @param {string} resource - Tài nguyên cần kiểm tra (schedules, users, etc.)
 * @param {string} permission - Permission cần kiểm tra (view, edit, delete)
 * @returns {boolean}
 */
function hasPermission(userRole, resource, permission) {
  if (!userRole || !resource || !permission) {
    return false;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    return false;
  }
  
  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) {
    return false;
  }
  
  return resourcePermissions.includes(permission);
}

/**
 * Lấy tất cả permissions của một role
 * @param {string} userRole - Role của user
 * @returns {Array} - Danh sách permissions
 */
function getRolePermissions(userRole) {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    return [];
  }
  
  const permissions = [];
  Object.keys(rolePermissions).forEach(resource => {
    rolePermissions[resource].forEach(permission => {
      permissions.push(`${resource}.${permission}`);
    });
  });
  
  return permissions;
}

/**
 * Kiểm tra role có hợp lệ hay không
 * @param {string} role - Role cần kiểm tra
 * @returns {boolean}
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  isValidRole
};
