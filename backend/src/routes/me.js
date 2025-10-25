/**
 * /me endpoint - Lấy thông tin user hiện tại
 */

const express = require('express');
const router = express.Router();
const { authOptimized } = require('../middleware/authOptimized');

/**
 * GET /api/me
 * Lấy thông tin user hiện tại với role và permissions từ JWT
 */
router.get('/', authOptimized, (req, res) => {
  try {
    const userInfo = {
      id: req.user.id,
      username: req.user.username,
      roleName: req.user.roleName,
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
