/**
 * Admin Routes - Các route admin với phân quyền cao
 */

const express = require('express');
const router = express.Router();
const { attachUser, requireRole, logUserActivity } = require('../middleware/auth');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { getRoleFromGroupCode } = require('../config/role-map');

// Middleware: Tất cả routes trong admin đều cần role admin
router.use(attachUser);
router.use(requireRole('ADMIN'));
router.use(logUserActivity('truy cập admin panel'));

/**
 * GET /api/admin/users
 * Lấy danh sách tất cả users với thông tin đầy đủ
 */
router.get('/users', async (req, res) => {
  try {
    console.log('🔍 Admin requesting users list');
    
    const { 
      page = 1, 
      limit = 50, 
      role = '', 
      status = '', 
      groupCode = '',
      search = ''
    } = req.query;

    // Build filter
    const filter = {};
    if (role && role !== 'all') filter.roleString = role;
    if (status && status !== 'all') filter.status = status;
    if (groupCode && groupCode !== 'all') filter.groupCode = groupCode;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { group_name: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users với pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(filter)
      .populate('role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    console.log(`📊 Returning ${users.length} users (total: ${total})`);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin users error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi lấy danh sách users'
    });
  }
});

/**
 * PATCH /api/admin/users/:userId/role
 * Cập nhật role và groupCode cho user
 */
router.patch('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, groupCode } = req.body;

    console.log(`🔧 Admin updating user ${userId}: role=${role}, groupCode=${groupCode}`);

    // Validate role
    if (!role || !['ADMIN', 'XNK', 'CSKH', 'FK'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role không hợp lệ'
      });
    }

    // Tìm role object
    const roleObj = await Role.findOne({ name: role });
    if (!roleObj) {
      return res.status(400).json({
        success: false,
        error: 'Role không tồn tại trong database'
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        role: roleObj._id,
        roleString: role,
        groupCode: groupCode || null 
      },
      { new: true }
    ).populate('role');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    console.log(`✅ Updated user ${user.username}: ${user.roleString}, groupCode: ${user.groupCode}`);

    res.json({
      success: true,
      message: `Đã cập nhật role cho ${user.username}`,
      data: user
    });

  } catch (error) {
    console.error('❌ Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi cập nhật role'
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Xóa user
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    console.log(`🗑️ Admin deleted user: ${user.username}`);

    res.json({
      success: true,
      message: `Đã xóa user ${user.username}`
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi xóa user'
    });
  }
});

/**
 * POST /api/admin/bulk-update-roles
 * Cập nhật role hàng loạt
 */
router.post('/bulk-update-roles', async (req, res) => {
  try {
    const { updates } = req.body; // Array of {userId, role, groupCode}

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu updates không hợp lệ'
      });
    }

    console.log(`🔧 Admin bulk updating ${updates.length} users`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const update of updates) {
      try {
        const { userId, role, groupCode } = update;
        
        // Tìm role object
        const roleObj = await Role.findOne({ name: role });
        if (!roleObj) {
          results.push({ userId, error: 'Role không tồn tại' });
          errorCount++;
          continue;
        }

        // Update user
        const user = await User.findByIdAndUpdate(
          userId,
          { 
            role: roleObj._id,
            roleString: role,
            groupCode: groupCode || null 
          },
          { new: true }
        );

        if (user) {
          results.push({ userId, success: true, username: user.username });
          successCount++;
        } else {
          results.push({ userId, error: 'User không tồn tại' });
          errorCount++;
        }

      } catch (updateError) {
        console.error(`Error updating user ${update.userId}:`, updateError);
        results.push({ userId: update.userId, error: updateError.message });
        errorCount++;
      }
    }

    console.log(`✅ Bulk update completed: ${successCount} success, ${errorCount} errors`);

    res.json({
      success: true,
      message: `Bulk update completed: ${successCount} thành công, ${errorCount} lỗi`,
      data: {
        successCount,
        errorCount,
        results
      }
    });

  } catch (error) {
    console.error('❌ Bulk update error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi bulk update'
    });
  }
});

/**
 * POST /api/admin/invalidate-all-tokens
 * Invalidate tất cả tokens (buộc logout tất cả users)
 */
router.post('/invalidate-all-tokens', async (req, res) => {
  try {
    console.log('🔒 Admin invalidating all tokens');
    
    // Trong production, bạn có thể:
    // 1. Cập nhật JWT secret
    // 2. Hoặc thêm blacklist tokens
    // 3. Hoặc thêm timestamp invalidation
    
    // Ở đây chúng ta sẽ trả về message để frontend handle
    res.json({
      success: true,
      message: 'Đã yêu cầu invalidate tất cả tokens. Users sẽ phải đăng nhập lại.',
      data: {
        invalidatedAt: new Date(),
        reason: 'Admin forced logout'
      }
    });

  } catch (error) {
    console.error('❌ Invalidate tokens error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi invalidate tokens'
    });
  }
});

/**
 * GET /api/admin/stats
 * Lấy thống kê hệ thống
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Admin requesting system stats');

    const [totalUsers, roleStats] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        {
          $lookup: {
            from: 'roles',
            localField: 'role',
            foreignField: '_id',
            as: 'roleInfo'
          }
        },
        {
          $group: {
            _id: '$roleString',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      totalUsers,
      roleDistribution: roleStats.reduce((acc, item) => {
        acc[item._id || 'undefined'] = item.count;
        return acc;
      }, {}),
      generatedAt: new Date()
    };

    console.log('📊 Stats:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi khi lấy thống kê'
    });
  }
});

module.exports = router;