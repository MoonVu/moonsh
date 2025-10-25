/**
 * Users Routes với RBAC chuẩn
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authJWT } = require('../middleware/authOptimized'); // Import từ authOptimized
const { attachPermissions } = require('../middleware/attachPermissions');
const { authorize, can } = require('../middleware/authorize');
const User = require('../../models/User');

// Middleware: Tất cả routes cần authentication và permissions
router.use(authJWT);
router.use(attachPermissions);

/**
 * GET /api/users
 * Yêu cầu: users:view
 */
router.get('/', authorize('users', 'view'), async (req, res) => {
  try {
    console.log('📋 GET /api/users by:', req.user.username);
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .populate('role')
      .select('-password') // Không trả password
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    // Filter based on permissions
    const filteredUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      roleName: user.role?.name,
      status: user.status,
      createdAt: user.createdAt,
      // Chỉ show sensitive info nếu có quyền edit
      ...(can(req.user, 'users', 'edit') && {
        groupCode: user.groupCode,
        group_name: user.group_name
      })
    }));

    res.json({
      success: true,
      data: {
        users: filteredUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ GET users error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy danh sách users'
    });
  }
});

/**
 * POST /api/users-rbac
 * Tạo user mới - Yêu cầu: users:edit
 */
router.post('/', authorize('users', 'edit'), async (req, res) => {
  try {
    const { username, password, group_name, groupCode, status, start_date } = req.body;
    console.log('📝 POST /api/users-rbac - Creating user:', { username, group_name, groupCode });
    
    // Validation
    if (!username || !password || !group_name || !groupCode) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin bắt buộc: username, password, group_name, groupCode'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username đã tồn tại'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      password: hashedPassword,
      group_name,
      groupCode,
      status: status || 'Hoạt động',
      start_date: start_date || null
    });

    await newUser.save();

    console.log('✅ User created:', newUser.username);
    res.status(201).json({
      success: true,
      data: {
        id: newUser._id,
        username: newUser.username,
        group_name: newUser.group_name,
        groupCode: newUser.groupCode,
        status: newUser.status,
        start_date: newUser.start_date
      }
    });

  } catch (error) {
    console.error('❌ POST /api/users-rbac error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi tạo user'
    });
  }
});

/**
 * GET /api/users/:id
 * Yêu cầu: users:view
 */
router.get('/:id', authorize('users', 'view'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 GET /api/users/${id} by:`, req.user.username);
    
    const user = await User.findById(id)
      .populate('role')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    const userInfo = {
      id: user._id,
      username: user.username,
      roleName: user.role?.name,
      roleDisplayName: user.role?.displayName,
      status: user.status,
      createdAt: user.createdAt,
      // Sensitive info chỉ với quyền edit
      ...(can(req.user, 'users', 'edit') && {
        groupCode: user.groupCode,
        group_name: user.group_name,
        start_date: user.start_date
      })
    };

    res.json({
      success: true,
      data: userInfo
    });

  } catch (error) {
    console.error('❌ GET user error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy thông tin user'
    });
  }
});

/**
 * PUT /api/users/:id
 * Yêu cầu: users:edit
 */
router.put('/:id', authorize('users', 'edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`✏️ PUT /api/users/${id} by:`, req.user.username);

    // Validate updates
    const allowedFields = ['group_name', 'groupCode', 'status'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('role').select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật user thành công',
      data: {
        id: user._id,
        username: user.username,
        roleName: user.role?.name,
        status: user.status,
        groupCode: user.groupCode,
        group_name: user.group_name
      }
    });

  } catch (error) {
    console.error('❌ PUT user error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi cập nhật user'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Yêu cầu: users:delete
 */
router.delete('/:id', authorize('users', 'delete'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/users/${id} by:`, req.user.username);

    // Không cho phép xóa chính mình
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Không thể xóa chính mình'
      });
    }

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    res.json({
      success: true,
      message: `Đã xóa user ${user.username}`
    });

  } catch (error) {
    console.error('❌ DELETE user error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi xóa user'
    });
  }
});

module.exports = router;








