/**
 * /me endpoint - Lấy thông tin user hiện tại
 */

const express = require('express');
const router = express.Router();
const { authJWT } = require('../middleware/authJWT');
const { attachPermissions } = require('../middleware/attachPermissions');

/**
 * GET /api/me
 * Lấy thông tin user hiện tại với role và permissions
 */
router.get('/', authJWT, attachPermissions, (req, res) => {
  try {
    console.log('📋 /me endpoint for user:', req.user.username);
    
    const userInfo = {
      id: req.user.id,
      username: req.user.username,
      roleName: req.user.role.name,
      roleDisplayName: req.user.role.displayName,
      permissions: req.user.permissions
    };

    res.json({
      success: true,
      data: userInfo
    });

  } catch (error) {
    console.error('❌ /me error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy thông tin user'
    });
  }
});

module.exports = router;
