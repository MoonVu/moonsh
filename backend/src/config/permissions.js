/**
 * Constants cơ bản cho hệ thống phân quyền
 * Chỉ chứa constants, logic phân quyền được chuyển sang database
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

// Định nghĩa các resources trong hệ thống
const RESOURCES = {
  ADMINISTRATOR_ACCESS: 'administrator_access',
  USER_MANAGEMENT: 'user_management',
  CONTENT_MANAGEMENT: 'content_management',
  FINANCIAL_MANAGEMENT: 'financial_management',
  REPORTING: 'reporting',
  PAYROLL: 'payroll',
  DISPUTES_MANAGEMENT: 'disputes_management',
  API_CONTROLS: 'api_controls',
  DATABASE_MANAGEMENT: 'database_management',
  REPOSITORY_MANAGEMENT: 'repository_management',
  SCHEDULES: 'schedules',
  USERS: 'users',
  TASKS: 'tasks',
  SEATS: 'seats',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  SYSTEM: 'system'
};

// Định nghĩa quyền cho từng role
const ROLE_PERMISSIONS = {
  ADMIN: {
    [RESOURCES.ADMINISTRATOR_ACCESS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.USER_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.CONTENT_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.FINANCIAL_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.REPORTING]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.PAYROLL]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.DISPUTES_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.API_CONTROLS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.DATABASE_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.REPOSITORY_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.SCHEDULES]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.USERS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.TASKS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.SEATS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.NOTIFICATIONS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.REPORTS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.SYSTEM]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE]
  },
  XNK: {
    [RESOURCES.USER_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.CONTENT_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.FINANCIAL_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.REPORTING]: [PERMISSIONS.VIEW],
    [RESOURCES.SCHEDULES]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.TASKS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.SEATS]: [PERMISSIONS.VIEW],
    [RESOURCES.NOTIFICATIONS]: [PERMISSIONS.VIEW],
    [RESOURCES.REPORTS]: [PERMISSIONS.VIEW]
  },
  CSKH: {
    [RESOURCES.USER_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.CONTENT_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.DISPUTES_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.REPORTING]: [PERMISSIONS.VIEW],
    [RESOURCES.SCHEDULES]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.TASKS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.SEATS]: [PERMISSIONS.VIEW],
    [RESOURCES.NOTIFICATIONS]: [PERMISSIONS.VIEW],
    [RESOURCES.REPORTS]: [PERMISSIONS.VIEW]
  },
  FK: {
    [RESOURCES.FINANCIAL_MANAGEMENT]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.PAYROLL]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE],
    [RESOURCES.REPORTING]: [PERMISSIONS.VIEW],
    [RESOURCES.SCHEDULES]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.TASKS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT],
    [RESOURCES.SEATS]: [PERMISSIONS.VIEW],
    [RESOURCES.NOTIFICATIONS]: [PERMISSIONS.VIEW],
    [RESOURCES.REPORTS]: [PERMISSIONS.VIEW]
  }
};

/**
 * Kiểm tra role có hợp lệ hay không (chỉ check format)
 * @param {string} role - Role cần kiểm tra
 * @returns {boolean}
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Lấy tất cả permissions của một role (dạng object - dùng cho API roles)
 * @param {string} role - Role cần lấy permissions
 * @returns {Object} Object chứa tất cả permissions của role
 */
function getRolePermissions(role) {
  if (!isValidRole(role)) {
    return {};
  }
  return ROLE_PERMISSIONS[role] || {};
}

/**
 * Lấy tất cả permissions của một role dạng array (dùng cho user permissions)
 * @param {string} role - Role cần lấy permissions
 * @returns {Array} Array chứa tất cả permissions của role dạng "resource.action"
 */
function getRolePermissionsArray(role) {
  if (!isValidRole(role)) {
    return [];
  }
  
  const rolePerms = ROLE_PERMISSIONS[role] || {};
  const permissions = [];
  
  // Chuyển đổi từ object sang array dạng "resource.action"
  Object.entries(rolePerms).forEach(([resource, actions]) => {
    if (Array.isArray(actions)) {
      actions.forEach(action => {
        permissions.push(`${resource}.${action}`);
      });
    }
  });
  
  return permissions;
}

/**
 * Kiểm tra role có permission cho resource và action cụ thể không
 * @param {string} role - Role cần kiểm tra
 * @param {string} resource - Resource cần kiểm tra
 * @param {string} action - Action cần kiểm tra
 * @returns {boolean}
 */
function hasPermission(role, resource, action) {
  if (!isValidRole(role)) {
    return false;
  }
  
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms || !rolePerms[resource]) {
    return false;
  }
  
  return rolePerms[resource].includes(action);
}

/**
 * Kiểm tra role có permission cho scope cụ thể không (dạng "resource.action")
 * @param {string} role - Role cần kiểm tra
 * @param {string} scope - Permission scope (vd: "users.edit", "schedules.view")
 * @returns {boolean}
 */
function hasScope(role, scope) {
  if (!isValidRole(role) || !scope) {
    return false;
  }
  
  const [resource, action] = scope.split('.');
  if (!resource || !action) {
    return false;
  }
  
  return hasPermission(role, resource, action);
}

/**
 * Lấy tất cả permissions có sẵn trong hệ thống
 * @returns {Array} Array chứa tất cả permissions
 */
function getAllPermissions() {
  return Object.values(PERMISSIONS);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  RESOURCES,
  ROLE_PERMISSIONS,
  isValidRole,
  getRolePermissions,
  getRolePermissionsArray,
  hasPermission,
  hasScope,
  getAllPermissions
};
