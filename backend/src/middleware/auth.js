/**
 * Authentication & Authorization Middleware - Chỉ sử dụng Database
 */

const authService = require('../auth/authService');
const User = require('../../models/User');

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
    
    // Xác minh token và lấy user với role populated
    const result = await authService.getUserFromToken(token);
    console.log('🔒 Token verification result:', { 
      success: result.success, 
      error: result.error,
      hasData: !!result.data,
      userId: result.data?.id
    });
    
    if (!result.success) {
      console.log('❌ Token verification failed:', result.error);
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    // Populate role để có đầy đủ thông tin permissions
    const user = await User.findById(result.data.id).populate('role');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    // Debug: Kiểm tra role được populate
    console.log('🔒 Role population result:', {
      userId: user.id,
      username: user.username,
      roleId: user.role?._id,
      roleName: user.role?.name,
      roleString: user.roleString,
      hasRoleObject: !!user.role,
      roleType: typeof user.role,
      roleKeys: user.role ? Object.keys(user.role) : 'NO_ROLE',
      rolePermissions: user.role?.permissions || 'NO_PERMISSIONS'
    });

    // Đảm bảo user có role object
    if (!user.role) {
      console.warn(`⚠️ User ${user.username} không có role object, ID: ${user.id}`);
      return res.status(403).json({
        success: false,
        error: 'User không có role hợp lệ'
      });
    }

    console.log('✅ User attached:', { 
      id: user.id, 
      username: user.username, 
      roleId: user.role?._id,
      roleName: user.role?.name,
      permissionsCount: user.role?.permissions?.length || 0
    });
    
    // Đính kèm user vào request với roleId để attachPermissions sử dụng
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      groupCode: user.groupCode,
      group_name: user.group_name,
      roleString: user.roleString,
      roleId: user.role._id, // Cần thiết cho attachPermissions
      role: user.role
    };
    next();

  } catch (error) {
    console.error('❌ attachUser error:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực: ' + error.message
    });
  }
};

/**
 * Middleware kiểm tra role name
 * @param {...string} allowedRoleNames - Danh sách role names được phép
 * @returns {Function} Middleware function
 */
const requireRole = (...allowedRoleNames) => {
  return (req, res, next) => {
    try {
      // Kiểm tra user đã được attach chưa
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Chưa xác thực'
        });
      }

      // Kiểm tra user có role không
      if (!req.user.role || !req.user.role.name) {
        return res.status(403).json({
          success: false,
          error: 'User không có role hợp lệ'
        });
      }

      // Kiểm tra role có trong danh sách cho phép không
      if (!allowedRoleNames.includes(req.user.role.name)) {
        return res.status(403).json({
          success: false,
          error: 'Không có quyền truy cập',
          requiredRoles: allowedRoleNames,
          userRole: req.user.role.name
        });
      }

      console.log(`✅ Role check passed: ${req.user.role.name} in [${allowedRoleNames.join(', ')}]`);
      next();

    } catch (error) {
      console.error('❌ requireRole error:', error);
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
 * @param {string} action - Quyền (view, edit, delete)
 * @returns {Function} Middleware function
 */
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    try {
      // Kiểm tra user đã được attach chưa
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Chưa xác thực'
        });
      }

      // Kiểm tra user có role không
      if (!req.user.role) {
        return res.status(403).json({
          success: false,
          error: 'User không có role'
        });
      }

      // Kiểm tra permission
      const hasAccess = req.user.hasPermission(resource, action);
      
      // Debug: Log permission check details
      console.log('🔒 Permission check details:', {
        username: req.user.username,
        roleName: req.user.role?.name,
        roleString: req.user.roleString,
        resource,
        action,
        hasAccess,
        roleObject: req.user.role ? {
          id: req.user.role._id,
          name: req.user.role.name,
          hasPermissionMethod: typeof req.user.role.hasPermission
        } : 'NO_ROLE_OBJECT',
        userHasPermissionMethod: typeof req.user.hasPermission
      });
      
      if (!hasAccess) {
        console.log(`❌ Permission denied: ${req.user.username} (${req.user.role.name}) tried ${resource}.${action}`);
        return res.status(403).json({
          success: false,
          error: `Không có quyền ${action} trên ${resource}`,
          requiredPermission: `${resource}.${action}`,
          userRole: req.user.role.name
        });
      }

      console.log(`✅ Permission granted: ${req.user.username} can ${resource}.${action}`);
      next();

    } catch (error) {
      console.error('❌ requirePermission error:', error);
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
const requireAdmin = requireRole('ADMIN');

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
        const user = await User.findById(result.data.id).populate('role');
        if (user) {
          req.user = user;
        }
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
      console.log(`📝 [${new Date().toISOString()}] User ${req.user.username} (${req.user.role?.name || 'no-role'}): ${action}`);
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
