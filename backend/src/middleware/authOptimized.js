/**
 * Optimized Authentication Middleware - JWT với permissions embedded
 * Giảm DB queries từ 2-3 queries/request xuống 0 queries/request
 * Thay thế cả authJWT.js và attachUser (khi có permissions trong JWT)
 */

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Role = require('../../models/Role');

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
      
      // Kiểm tra xem JWT có đủ thông tin không
      const hasRoleInfo = decoded.roleName && decoded.permissions && decoded.permissions.length > 0;
      
      if (hasRoleInfo) {
        // JWT có đủ thông tin - sử dụng trực tiếp (optimized path)
        req.user = {
          id: decoded.userId,
          roleId: decoded.roleId,
          username: decoded.username,
          roleName: decoded.roleName,
          permissions: decoded.permissions,
          // Thêm role object để tương thích với requirePermission middleware
          role: {
            name: decoded.roleName,
            _id: decoded.roleId
          },
          hasPermission: (resource, action) => {
            const requiredPermission = `${resource}.${action}`;
            return decoded.permissions.includes(requiredPermission);
          }
        };
        
        console.log('✅ JWT verified (optimized):', { 
          id: req.user.id, 
          roleName: req.user.roleName,
          permissionsCount: req.user.permissions.length
        });
        
        next();
      } else {
        // JWT thiếu thông tin - query database (fallback path)
        console.log('⚠️ JWT thiếu role info, querying database...');
        
        const userId = decoded.userId || decoded._id;
        const user = await User.findById(userId).populate('role');
        
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'User không tồn tại'
          });
        }
        
        if (!user.role) {
          return res.status(403).json({
            success: false,
            error: 'User không có role'
          });
        }
        
        // Lấy permissions từ role
        const permissions = user.role.getAllPermissions ? user.role.getAllPermissions() : [];
        
        req.user = {
          id: user._id,
          roleId: user.role._id,
          username: user.username,
          roleName: user.role.name,
          permissions: permissions,
          role: {
            name: user.role.name,
            _id: user.role._id
          },
          hasPermission: (resource, action) => {
            const requiredPermission = `${resource}.${action}`;
            return permissions.includes(requiredPermission);
          }
        };
        
        console.log('✅ JWT verified (fallback):', { 
          id: req.user.id, 
          roleName: req.user.roleName,
          permissionsCount: req.user.permissions.length
        });
        
        next();
      }
      
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
