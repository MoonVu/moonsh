/**
 * Permissions Middleware - Load role và permissions từ DB
 */

const Role = require('../../models/Role');

// Cache cho roles - 60 seconds
const roleCache = new Map();
const CACHE_TTL = 60 * 1000; // 60s

/**
 * Middleware load role và permissions từ database
 * Yêu cầu: req.user đã có { id, roleId, username } từ authJWT
 * Kết quả: req.user.permissions, req.user.role
 */
const attachPermissions = async (req, res, next) => {
  try {
    console.log('🔍 attachPermissions START for user:', req.user?.id);
    console.log('🔍 req.user object:', req.user);
    console.log('🔍 req.user.roleId:', req.user?.roleId);
    
    if (!req.user || !req.user.roleId) {
      console.log('❌ attachPermissions FAILED: Missing user or roleId');
      return res.status(401).json({
        success: false,
        error: 'User hoặc roleId không tồn tại'
      });
    }

    const roleId = req.user.roleId;
    const cacheKey = roleId.toString();
    
    // Check cache first
    const cached = roleCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Role loaded from cache:', cached.role.name);
      req.user.role = cached.role;
      req.user.permissions = cached.permissions;
      req.user.hasPermission = cached.hasPermission;
      return next();
    }

    // Load từ database
    const role = await Role.findById(roleId);
    if (!role || !role.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Role không tồn tại hoặc đã bị vô hiệu hóa'
      });
    }

    // Tạo permissions array dạng "resource.action"
    const permissions = role.getAllPermissions();
    
    // Cache role data
    roleCache.set(cacheKey, {
      role: {
        id: role._id,
        name: role.name,
        displayName: role.displayName,
        permissions: role.permissions
      },
      permissions,
      hasPermission: (resource, action) => permissions.includes(`${resource}.${action}`),
      timestamp: Date.now()
    });

    // Attach to request
    req.user.role = {
      id: role._id,
      name: role.name,
      displayName: role.displayName,
      permissions: role.permissions
    };
    req.user.permissions = permissions;
    
    // Attach hasPermission method
    req.user.hasPermission = function(resource, action) {
      return this.permissions.includes(`${resource}.${action}`);
    };

    console.log('✅ Permissions attached:', { 
      role: role.name, 
      permissionsCount: permissions.length 
    });
    console.log('✅ req.user.hasPermission function:', typeof req.user.hasPermission);
    console.log('✅ attachPermissions COMPLETED successfully');
    
    next();

  } catch (error) {
    console.error('❌ attachPermissions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi load permissions'
    });
  }
};

/**
 * Helper function để clear cache (useful cho testing)
 */
const clearPermissionsCache = () => {
  roleCache.clear();
  console.log('🧹 Permissions cache cleared');
};

/**
 * Helper function để check cache stats
 */
const getCacheStats = () => {
  return {
    size: roleCache.size,
    keys: Array.from(roleCache.keys()),
    ttl: CACHE_TTL
  };
};

module.exports = { 
  attachPermissions, 
  clearPermissionsCache, 
  getCacheStats 
};











