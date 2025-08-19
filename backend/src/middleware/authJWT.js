/**
 * JWT Authentication Middleware - Chỉ verify JWT
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware chỉ xác thực JWT
 * Kết quả: req.user = { id, roleId, username }
 */
const authJWT = async (req, res, next) => {
  try {
    console.log('🔒 authJWT middleware for:', req.method, req.path);
    
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
      // Verify JWT
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Chỉ lấy thông tin cơ bản từ JWT
      req.user = {
        id: decoded.userId,
        roleId: decoded.roleId,
        username: decoded.username
      };
      
      console.log('✅ JWT verified:', { id: req.user.id, roleId: req.user.roleId });
      next();
      
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Token không hợp lệ'
      });
    }

  } catch (error) {
    console.error('❌ authJWT error:', error);
    return res.status(500).json({
      success: false,
      error: 'Lỗi xác thực'
    });
  }
};

module.exports = { authJWT };
