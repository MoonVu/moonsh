/**
 * Admin Routes - Các route chỉ dành cho admin
 * Tất cả routes trong file này đều yêu cầu role admin
 */

const express = require('express');
const router = express.Router();
const { attachUser, requireRole, logUserActivity } = require('../middleware/auth');
const User = require('../../models/User');
const { ROLES } = require('../config/permissions');
const { getRoleFromGroupCode } = require('../config/role-map');

// Middleware: Tất cả routes trong admin đều cần role admin
router.use(attachUser);
router.use(requireRole(ROLES.ADMIN));
router.use(logUserActivity('truy cập admin panel'));

/**
 * GET /api/admin/users
 * Lấy danh sách tất cả users với thông tin đầy đủ
 */
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, groupCode, status, search } = req.query;
    
    // Xây dựng query filter
    const filter = {};
    if (role) filter.role = role;
    if (groupCode) filter.groupCode = groupCode;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { group_name: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Lấy users và tổng số
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password') // Không trả về password
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Lỗi admin/users:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy danh sách users'
    });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Cập nhật role của user
 */
router.patch('/users/:id/role', logUserActivity('thay đổi role user'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, groupCode } = req.body;

    // Validate input
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role là bắt buộc'
      });
    }

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role không hợp lệ'
      });
    }

    // Tìm user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    // Không cho phép tự thay đổi role của chính mình
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Không thể thay đổi role của chính mình'
      });
    }

    // Cập nhật role
    const updateData = { role };
    if (groupCode) {
      updateData.groupCode = groupCode;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    console.log(`✅ Admin ${req.user.username} đã thay đổi role của ${user.username}: ${user.role} → ${role}`);

    res.json({
      success: true,
      data: updatedUser,
      message: `Đã cập nhật role thành ${role}`
    });

  } catch (error) {
    console.error('❌ Lỗi admin/users/role:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi cập nhật role'
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Xóa user (chỉ admin)
 */
router.delete('/users/:id', logUserActivity('xóa user'), async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    // Không cho phép xóa chính mình
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Không thể xóa chính mình'
      });
    }

    // Không cho phép xóa admin khác nếu không phải super admin
    if (user.role === ROLES.ADMIN && user.username !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Không thể xóa admin khác'
      });
    }

    await User.findByIdAndDelete(id);

    console.log(`✅ Admin ${req.user.username} đã xóa user ${user.username}`);

    res.json({
      success: true,
      message: `Đã xóa user ${user.username}`
    });

  } catch (error) {
    console.error('❌ Lỗi admin/delete-user:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi xóa user'
    });
  }
});

/**
 * GET /api/admin/stats
 * Thống kê hệ thống
 */
router.get('/stats', async (req, res) => {
  try {
    // Thống kê users theo role
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Thống kê users theo groupCode
    const groupStats = await User.aggregate([
      { $group: { _id: '$groupCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Thống kê users theo status
    const statusStats = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Tổng số users
    const totalUsers = await User.countDocuments();

    // Users tạo gần đây (7 ngày)
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        recentUsers,
        roleStats: roleStats.map(stat => ({
          role: stat._id || 'undefined',
          count: stat.count
        })),
        groupStats: groupStats.map(stat => ({
          groupCode: stat._id || 'undefined',
          count: stat.count
        })),
        statusStats: statusStats.map(stat => ({
          status: stat._id || 'undefined',
          count: stat.count
        }))
      }
    });

  } catch (error) {
    console.error('❌ Lỗi admin/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy thống kê'
    });
  }
});

/**
 * POST /api/admin/users/bulk-update-roles
 * Cập nhật role hàng loạt cho users
 */
router.post('/users/bulk-update-roles', logUserActivity('cập nhật role hàng loạt'), async (req, res) => {
  try {
    const { updates } = req.body; // [{ userId, role, groupCode }]

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Danh sách cập nhật không hợp lệ'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { userId, role, groupCode } = update;

        // Validate
        if (!userId || !role) {
          errors.push({ userId, error: 'Thiếu userId hoặc role' });
          continue;
        }

        if (!Object.values(ROLES).includes(role)) {
          errors.push({ userId, error: 'Role không hợp lệ' });
          continue;
        }

        // Không cho phép thay đổi role của chính mình
        if (userId === req.user.id) {
          errors.push({ userId, error: 'Không thể thay đổi role của chính mình' });
          continue;
        }

        // Cập nhật
        const updateData = { role };
        if (groupCode) updateData.groupCode = groupCode;

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          updateData,
          { new: true, runValidators: true }
        ).select('username role groupCode');

        if (updatedUser) {
          results.push({
            userId,
            username: updatedUser.username,
            role: updatedUser.role,
            groupCode: updatedUser.groupCode
          });
        } else {
          errors.push({ userId, error: 'User không tồn tại' });
        }

      } catch (error) {
        errors.push({ userId: update.userId, error: error.message });
      }
    }

    console.log(`✅ Admin ${req.user.username} đã cập nhật role cho ${results.length} users`);

    res.json({
      success: true,
      data: {
        updated: results,
        errors,
        summary: {
          total: updates.length,
          success: results.length,
          failed: errors.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Lỗi admin/bulk-update-roles:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi cập nhật hàng loạt'
    });
  }
});

module.exports = router;
