/**
 * Authorization Middleware Factory - Kiểm tra permissions
 */

/**
 * Factory middleware tạo authorization check
 * @param {string} resource - Resource name (users, schedules, etc.)
 * @param {string} action - Action name (view, edit, delete)
 * @returns {Function} Express middleware
 */
const authorize = (resource, action) => {
  return (req, res, next) => {
    try {
      // Kiểm tra user đã được authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Chưa xác thực'
        });
      }

      // Kiểm tra permissions đã được load
      if (!req.user.permissions) {
        return res.status(500).json({
          success: false,
          error: 'Permissions chưa được load'
        });
      }

      // Check permission
      const requiredPermission = `${resource}.${action}`;
      const hasPermission = req.user.permissions.includes(requiredPermission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Không có quyền ${action} trên ${resource}`,
          required: requiredPermission,
          userRole: req.user.role?.name
        });
      }

      next();

    } catch (error) {
      console.error('❌ authorize error:', error);
      return res.status(500).json({
        success: false,
        error: 'Lỗi kiểm tra quyền'
      });
    }
  };
};

/**
 * Helper middleware: Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role?.name !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Yêu cầu quyền admin',
      userRole: req.user?.role?.name
    });
  }
  next();
};

/**
 * Helper function: Check if user has permission (for use in route handlers)
 * @param {Object} user - req.user object
 * @param {string} resource 
 * @param {string} action 
 * @returns {boolean}
 */
const can = (user, resource, action) => {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(`${resource}.${action}`);
};

module.exports = { 
  authorize, 
  requireAdmin, 
  can 
};









