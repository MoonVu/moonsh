/**
 * Authentication & Authorization Middleware
 */

const authService = require('../auth/authService');
const { hasPermission, isValidRole } = require('../config/permissions');

/**
 * Middleware để đính kèm user vào request
 * Sử dụng cho các route cần xác thực
 */
const attachUser = async (req, res, next) => {
  try {
    console.log('🔒 attachUser middleware called for:', req.method, req.path);
    
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    console.log('🔒 Auth header:', authHeader ? `Bearer ${authHeader.substring(7, 20)}...` : 'missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token không được cung cấp');
      return res.status(401).json({
        success: false,
        error: 'Token không được cung cấp'
      });
    }

    const token = authHeader.substring(7); // Bỏ "Bearer "
    console.log('🔒 Token length:', token.length);
    
    // Xác minh token và lấy user
    const result = await authService.getUserFromToken(token);
    console.log('🔒 Token verification result:', { success: result.success, error: result.error });
    
    if (!result.success) {
      console.log('❌ Token verification failed:', result.error);
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    console.log('✅ User attached:', { id: result.data.id, username: result.data.username, role: result.data.role });
    
    // Đính kèm user vào request
    req.user = result.data;
    next();

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực: ' + error.message
    });
  }
};

/**
 * Middleware kiểm tra role
 * @param {...string} allowedRoles - Danh sách roles được phép
 * @returns {Function} Middleware function
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Kiểm tra user đã được attach chưa
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Chưa xác thực'
        });
      }

      // Kiểm tra role có hợp lệ không
      if (!isValidRole(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Role không hợp lệ'
        });
      }

      // Kiểm tra role có trong danh sách cho phép không
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Không có quyền truy cập',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Lỗi kiểm tra quyền: ' + error.message
      });
    }
  };
};

/**
 * Middleware kiểm tra permission cụ thể
 * @param {string} resource - Tài nguyên (schedules, users, etc.)
 * @param {string} permission - Quyền (view, edit, delete)
 * @returns {Function} Middleware function
 */
const requirePermission = (resource, permission) => {
  return (req, res, next) => {
    try {
      // Kiểm tra user đã được attach chưa
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Chưa xác thực'
        });
      }

      // Kiểm tra permission
      const hasAccess = hasPermission(req.user.role, resource, permission);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: `Không có quyền ${permission} trên ${resource}`,
          requiredPermission: `${resource}.${permission}`,
          userRole: req.user.role
        });
      }

      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Lỗi kiểm tra permission: ' + error.message
      });
    }
  };
};

/**
 * Middleware kiểm tra admin
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware tùy chọn - không bắt buộc đăng nhập
 * Nếu có token thì attach user, không có thì vẫn cho qua
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await authService.getUserFromToken(token);
      
      if (result.success) {
        req.user = result.data;
      }
      // Nếu token không hợp lệ, vẫn cho qua nhưng không attach user
    }

    next();

  } catch (error) {
    // Nếu có lỗi, vẫn cho qua nhưng không attach user
    next();
  }
};

/**
 * Middleware log hoạt động của user
 */
const logUserActivity = (action) => {
  return (req, res, next) => {
    if (req.user) {
      console.log(`📝 [${new Date().toISOString()}] User ${req.user.username} (${req.user.role}): ${action}`);
    }
    next();
  };
};

/**
 * Helper function tạo error response
 */
const createAuthError = (message, statusCode = 401) => {
  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  attachUser,
  requireRole,
  requirePermission, 
  requireAdmin,
  optionalAuth,
  logUserActivity,
  createAuthError
};
