/**
 * Auth Routes - Các route xử lý xác thực
 */

const express = require('express');
const router = express.Router();
const authService = require('../auth/authService');
const { attachUser, requireAdmin, logUserActivity } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Đăng nhập
 */
router.post('/login', async (req, res) => {
  try {
    console.log('🔍 Login request body:', req.body);
    const { username, password } = req.body;

    console.log('🔍 Extracted credentials:', { 
      username: `"${username}"`, 
      password: password ? `${password.length} chars` : 'undefined',
      usernameType: typeof username,
      passwordType: typeof password
    });

    // Validate input
    if (!username || !password) {
      console.log('❌ Missing credentials validation failed');
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu'
      });
    }

    // Đăng nhập
    const result = await authService.login(username, password);
    
    if (result.success) {
      console.log(`✅ Login thành công: ${username} (${result.data.user.role})`);
      res.json(result);
    } else {
      console.log(`❌ Login thất bại: ${username} - ${result.error}`);
      res.status(401).json(result);
    }

  } catch (error) {
    console.error('❌ Lỗi login route:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống'
    });
  }
});

/**
 * POST /api/auth/verify
 * Xác minh token
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token không được cung cấp'
      });
    }

    const result = await authService.getUserFromToken(token);
    
    if (result.success) {
      res.json({
        success: true,
        data: { user: result.data }
      });
    } else {
      res.status(401).json(result);
    }

  } catch (error) {
    console.error('❌ Lỗi verify route:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống'
    });
  }
});

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại
 */
router.get('/me', attachUser, (req, res) => {
  try {
    res.json({
      success: true,
      data: { user: req.user }
    });
  } catch (error) {
    console.error('❌ Lỗi me route:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Đổi mật khẩu
 */
router.post('/change-password', attachUser, logUserActivity('đổi mật khẩu'), async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu xác nhận không khớp'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    // Đổi mật khẩu
    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    
    if (result.success) {
      console.log(`✅ Đổi mật khẩu thành công: ${req.user.username}`);
      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Lỗi change-password route:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống'
    });
  }
});

/**
 * POST /api/auth/create-user
 * Tạo user mới (chỉ admin)
 */
router.post('/create-user', attachUser, requireAdmin, logUserActivity('tạo user mới'), async (req, res) => {
  try {
    const { username, password, group_name, groupCode } = req.body;

    // Validate input
    if (!username || !password || !groupCode) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng nhập đầy đủ thông tin bắt buộc'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu phải có ít nhất 6 ký tự'
      });
    }

    // Tạo user
    const result = await authService.createUser({
      username,
      password,
      group_name,
      groupCode
    });

    if (result.success) {
      console.log(`✅ Tạo user thành công: ${username} bởi ${req.user.username}`);
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Lỗi create-user route:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống'
    });
  }
});

/**
 * POST /api/auth/logout
 * Đăng xuất (client-side chỉ cần xóa token)
 */
router.post('/logout', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    console.error('❌ Lỗi logout route:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi hệ thống'
    });
  }
});

module.exports = router;
