/**
 * Optimized Authentication Middleware - JWT với permissions embedded
 * Giảm DB queries từ 2-3 queries/request xuống 0 queries/request
 * Thay thế cả authJWT.js và attachUser (khi có permissions trong JWT)
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware tối ưu: Chỉ verify JWT và extract permissions
 * Không query database, sử dụng permissions từ JWT
 * Tương thích với cả JWT có permissions và JWT cũ không có permissions
 */
const authOptimized = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token không được cung cấp'
      });
    }

    const token = authHeader.substring(7);
    const JWT_SECRET = process.env.JWT_SECRET || 'Moon-secret-key';
    
    try {
      // Verify JWT và lấy permissions từ token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Attach user info từ JWT (không cần query DB)
      // Tương thích với cả JWT có permissions và JWT cũ
      req.user = {
        id: decoded.userId,
        roleId: decoded.roleId,
        username: decoded.username,
        roleName: decoded.roleName || 'USER', // Fallback cho JWT cũ
        permissions: decoded.permissions || [], // Permissions từ JWT (có thể empty)
        hasPermission: (resource, action) => {
          const requiredPermission = `${resource}.${action}`;
          return decoded.permissions && decoded.permissions.includes(requiredPermission);
        }
      };
      
      console.log('✅ JWT verified (optimized):', { 
        id: req.user.id, 
        roleName: req.user.roleName,
        permissionsCount: req.user.permissions.length,
        hasPermissions: req.user.permissions.length > 0
      });
      
      next();
      
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

  } catch (error) {
    console.error('❌ authOptimized error:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực'
    });
  }
};

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

      // Kiểm tra permissions từ JWT
      if (!req.user.permissions) {
        return res.status(500).json({
          success: false,
          error: 'Permissions không có trong token'
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
          userRole: req.user.roleName
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
  if (!req.user || req.user.roleName !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Chỉ admin mới được phép truy cập'
    });
  }
  next();
};

// Alias để backward compatibility với authJWT
const authJWT = authOptimized;

module.exports = { 
  authOptimized, 
  authJWT, // Alias cho backward compatibility
  authorize, 
  requireAdmin 
};
