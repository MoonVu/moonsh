/**
 * Authorization Service - Service phân quyền tập trung
 * Xử lý logic phân quyền phức tạp và kiểm tra permissions
 */

const { ROLES, ROLE_PERMISSIONS, hasPermission, getRolePermissions, isValidRole } = require('../config/permissions');
const { getRoleFromGroupCode, isValidGroupCode } = require('../config/role-map');
const User = require('../../models/User');

class AuthorizationService {
  /**
   * Suy ra effective role từ user.role hoặc groupCode
   * @param {Object} user - User object hoặc user data
   * @returns {string} - Effective role
   */
  getEffectiveRole(user) {
    if (!user) return ROLES.FK; // Default role

    // Ưu tiên role trực tiếp nếu có và hợp lệ
    if (user.role && isValidRole(user.role)) {
      return user.role;
    }

    // Fallback sang groupCode mapping
    if (user.groupCode && isValidGroupCode(user.groupCode)) {
      const mappedRole = getRoleFromGroupCode(user.groupCode);
      if (mappedRole) return mappedRole;
    }

    // Fallback sang group_name (legacy)
    if (user.group_name) {
      const mappedRole = getRoleFromGroupCode(user.group_name);
      if (mappedRole) return mappedRole;
    }

    // Default role
    return ROLES.FK;
  }

  /**
   * Kiểm tra user có quyền trên resource không
   * @param {Object} user - User object
   * @param {string} resource - Tài nguyên (schedules, users, etc.)
   * @param {string} action - Hành động (view, edit, delete)
   * @returns {boolean}
   */
  canAccess(user, resource, action) {
    if (!user || !resource || !action) return false;

    const effectiveRole = this.getEffectiveRole(user);
    return hasPermission(effectiveRole, resource, action);
  }

  /**
   * Kiểm tra user có một trong các roles không
   * @param {Object} user - User object
   * @param {...string} allowedRoles - Danh sách roles được phép
   * @returns {boolean}
   */
  hasRole(user, ...allowedRoles) {
    if (!user || !allowedRoles.length) return false;

    const effectiveRole = this.getEffectiveRole(user);
    return allowedRoles.includes(effectiveRole);
  }

  /**
   * Kiểm tra user có phải admin không
   * @param {Object} user - User object
   * @returns {boolean}
   */
  isAdmin(user) {
    return this.hasRole(user, ROLES.ADMIN);
  }

  /**
   * Lấy tất cả permissions của user
   * @param {Object} user - User object
   * @returns {Array} - Danh sách permissions
   */
  getUserPermissions(user) {
    if (!user) return [];

    const effectiveRole = this.getEffectiveRole(user);
    return getRolePermissions(effectiveRole);
  }

  /**
   * Kiểm tra user có permission cụ thể không (dạng scope)
   * @param {Object} user - User object
   * @param {string} scope - Permission scope (vd: "schedules.edit", "users.delete")
   * @returns {boolean}
   */
  hasScope(user, scope) {
    if (!user || !scope) return false;

    const [resource, action] = scope.split('.');
    if (!resource || !action) return false;

    return this.canAccess(user, resource, action);
  }

  /**
   * Kiểm tra user có nhiều scopes không
   * @param {Object} user - User object
   * @param {Array} scopes - Danh sách scopes
   * @param {boolean} requireAll - Yêu cầu tất cả scopes (AND) hay chỉ một (OR)
   * @returns {boolean}
   */
  hasScopes(user, scopes, requireAll = true) {
    if (!user || !Array.isArray(scopes)) return false;

    if (requireAll) {
      // AND logic - cần tất cả scopes
      return scopes.every(scope => this.hasScope(user, scope));
    } else {
      // OR logic - chỉ cần một scope
      return scopes.some(scope => this.hasScope(user, scope));
    }
  }

  /**
   * Kiểm tra user có thể truy cập resource cụ thể không
   * @param {Object} user - User object
   * @param {string} resourceType - Loại resource
   * @param {string} resourceId - ID của resource (optional)
   * @param {string} action - Hành động
   * @returns {Promise<boolean>}
   */
  async canAccessResource(user, resourceType, resourceId, action) {
    if (!this.canAccess(user, resourceType, action)) {
      return false;
    }

    // Logic kiểm tra ownership hoặc rule đặc biệt
    switch (resourceType) {
      case 'users':
        return this._canAccessUser(user, resourceId, action);
      
      case 'schedules':
        return this._canAccessSchedule(user, resourceId, action);
      
      default:
        return true; // Default cho phép nếu có permission cơ bản
    }
  }

  /**
   * Tạo context object cho frontend
   * @param {Object} user - User object
   * @returns {Object} - Auth context
   */
  createAuthContext(user) {
    if (!user) {
      return {
        isAuthenticated: false,
        user: null,
        role: null,
        permissions: [],
        canAccess: () => false,
        hasRole: () => false,
        hasScope: () => false
      };
    }

    const effectiveRole = this.getEffectiveRole(user);
    const permissions = this.getUserPermissions(user);

    return {
      isAuthenticated: true,
      user: {
        id: user._id || user.id,
        username: user.username,
        group_name: user.group_name,
        groupCode: user.groupCode,
        role: effectiveRole,
        status: user.status
      },
      role: effectiveRole,
      permissions,
      canAccess: (resource, action) => this.canAccess(user, resource, action),
      hasRole: (...roles) => this.hasRole(user, ...roles),
      hasScope: (scope) => this.hasScope(user, scope),
      isAdmin: this.isAdmin(user)
    };
  }

  /**
   * Middleware factory để tạo middleware kiểm tra resource access
   * @param {string} resourceType - Loại resource
   * @param {string} action - Hành động
   * @param {Function} getResourceId - Function để lấy resourceId từ req
   * @returns {Function} - Express middleware
   */
  createResourceMiddleware(resourceType, action, getResourceId = null) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'Chưa xác thực'
          });
        }

        const resourceId = getResourceId ? getResourceId(req) : req.params.id;
        const canAccess = await this.canAccessResource(req.user, resourceType, resourceId, action);

        if (!canAccess) {
          return res.status(403).json({
            success: false,
            error: `Không có quyền ${action} trên ${resourceType}`,
            userRole: req.user.role,
            requiredPermission: `${resourceType}.${action}`
          });
        }

        next();
      } catch (error) {
        console.error('❌ Lỗi resource middleware:', error);
        res.status(500).json({
          success: false,
          error: 'Lỗi kiểm tra quyền'
        });
      }
    };
  }

  // Private methods

  /**
   * Kiểm tra quyền truy cập user
   * @param {Object} currentUser - User hiện tại
   * @param {string} targetUserId - ID user muốn truy cập
   * @param {string} action - Hành động
   * @returns {Promise<boolean>}
   */
  async _canAccessUser(currentUser, targetUserId, action) {
    // Admin có thể làm gì cũng được
    if (this.isAdmin(currentUser)) return true;

    // User chỉ có thể view/edit chính mình
    if (action === 'view' || action === 'edit') {
      return currentUser.id === targetUserId || currentUser._id.toString() === targetUserId;
    }

    // Delete cần quyền admin
    if (action === 'delete') {
      return false;
    }

    return false;
  }

  /**
   * Kiểm tra quyền truy cập schedule
   * @param {Object} user - User hiện tại
   * @param {string} scheduleId - ID schedule
   * @param {string} action - Hành động
   * @returns {Promise<boolean>}
   */
  async _canAccessSchedule(user, scheduleId, action) {
    // Logic có thể mở rộng để kiểm tra ownership, department, etc.
    return true; // Hiện tại cho phép nếu có permission cơ bản
  }
}

// Export singleton instance
module.exports = new AuthorizationService();
