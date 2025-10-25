/**
 * Users Routes - Quản lý users với phân quyền
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authOptimized, authorize } = require('../middleware/authOptimized');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { ROLES } = require('../config/permissions');
const { getRoleFromGroupCode } = require('../config/role-map');
const mongoose = require('mongoose'); // Added for debug route

// Middleware: Sử dụng authOptimized thay vì attachUser + attachPermissions
router.use(authOptimized);

/**
 * GET /api/users/debug
 * Debug route để kiểm tra database và users
 */


/**
 * GET /api/users
 * Lấy danh sách users (tất cả user đều có thể xem)
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, role, groupCode, status, search } = req.query;
    
    // Xây dựng query filter
    const filter = {};
    
    // Chỉ admin mới được filter theo role/status nhạy cảm
    if (req.user.role.name === ROLES.ADMIN) {
      if (role) filter.role = role;
      if (status) filter.status = status;
    } else {
      // User thường chỉ thấy user active
      filter.status = 'Hoạt động';
    }
    
    if (groupCode) filter.groupCode = groupCode;
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { group_name: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Select fields dựa trên role
    let selectFields = '-password'; // Luôn ẩn password
    if (req.user.role.name !== ROLES.ADMIN) {
      // User thường không thấy một số field nhạy cảm
      selectFields += ' -role';
    }
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .select(selectFields)
        .sort({ username: 1 })
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
    console.error('❌ Lỗi users list:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy danh sách users'
    });
  }
});

/**
 * GET /api/users/:id
 * Lấy thông tin user theo ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Select fields dựa trên quyền
    let selectFields = '-password';
    if (req.user.role.name !== ROLES.ADMIN && req.user.id !== id) {
      selectFields += ' -role';
    }
    
    const user = await User.findById(id).select(selectFields);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User không tồn tại'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ Lỗi users/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy thông tin user'
    });
  }
});

/**
 * POST /api/users
 * Tạo user mới (chỉ admin hoặc user có quyền create)
 */
router.post('/', 
  requirePermission('users', 'edit'),
  logUserActivity('tạo user mới'),
  async (req, res) => {
    try {
      const { username, password, group_name, groupCode, role, status } = req.body;

      // Validate input
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username và password là bắt buộc'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Mật khẩu phải có ít nhất 6 ký tự'
        });
      }

      // Kiểm tra username đã tồn tại
      const existingUser = await User.findOne({ 
        username: { $regex: `^${username}$`, $options: 'i' }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username đã tồn tại'
        });
      }

      // Xác định role name
      let roleName = 'FK'; // Default role
      if (req.user.role.name === ROLES.ADMIN && role) {
        // Admin có thể set role trực tiếp
        roleName = role;
      } else if (groupCode) {
        // Mapping từ groupCode
        roleName = getRoleFromGroupCode(groupCode) || 'FK';
      }

      // Tìm Role object từ database
      const roleObject = await Role.findOne({ name: roleName });
      if (!roleObject) {
        return res.status(400).json({
          success: false,
          error: `Role ${roleName} không tồn tại`
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Tạo user mới
      const newUser = new User({
        username,
        password: hashedPassword,
        group_name: group_name || '',
        groupCode: groupCode || 'FK',
        role: roleObject._id,
        roleString: roleName,
        status: status || 'Hoạt động',
        start_date: new Date()
      });

      await newUser.save();

      // Trả về user không có password
      const userResponse = await User.findById(newUser._id).select('-password');

      console.log(`✅ User ${req.user.username} đã tạo user mới: ${username} (${roleName})`);

      res.status(201).json({
        success: true,
        data: userResponse,
        message: 'Tạo user thành công'
      });

    } catch (error) {
      console.error('❌ Lỗi tạo user:', error);
      res.status(500).json({
        success: false,
        error: 'Lỗi tạo user'
      });
    }
  }
);

/**
 * PUT /api/users/:id
 * Cập nhật thông tin user
 */
router.put('/:id',
  requirePermission('users', 'edit'),
  logUserActivity('cập nhật user'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, group_name, groupCode, status, start_date } = req.body;
      
      console.log('🔧 PUT /api/users/:id - Request body:', { username, password: password ? '[HIDDEN]' : undefined, group_name, groupCode, status, start_date });
      console.log('🔧 PUT /api/users/:id - Request params:', { id, idType: typeof id, idLength: id?.length });
      console.log('🔧 PUT /api/users/:id - req.user info:', {
        userId: req.user?.id,
        username: req.user?.username,
        roleName: req.user?.role?.name,
        hasRole: !!req.user?.role
      });

      // Tìm user
      const user = await User.findById(id);
      
      // Debug: Kiểm tra kết quả tìm user
      console.log('🔧 PUT /api/users/:id - User.findById result:', {
        found: !!user,
        searchId: id,
        searchIdType: typeof id,
        searchIdLength: id?.length,
        searchIdIsObjectId: /^[0-9a-fA-F]{24}$/.test(id),
        foundUser: user ? {
          id: user._id,
          username: user.username,
          status: user.status,
          group_name: user.group_name,
          groupCode: user.groupCode,
          role_key: user.role_key,
          roleString: user.roleString,
          role: user.role
        } : null
      });
      
      // Debug: Thử tìm user bằng các cách khác
      if (!user) {

      }
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User không tồn tại'
        });
      }

      // Kiểm tra quyền: chỉ admin hoặc chính user đó mới được sửa
      if (req.user.role.name !== ROLES.ADMIN && req.user.id !== id) {
        return res.status(403).json({
          success: false,
          error: 'Không có quyền sửa user này'
        });
      }

      // Chuẩn bị data cập nhật
      const updateData = {};
      
      if (username) {
        // Kiểm tra username mới có trùng không
        const existingUser = await User.findOne({ 
          username: { $regex: `^${username}$`, $options: 'i' },
          _id: { $ne: id }
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'Username đã tồn tại'
          });
        }
        updateData.username = username;
      }

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            error: 'Mật khẩu phải có ít nhất 6 ký tự'
          });
        }
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (group_name !== undefined) updateData.group_name = group_name;
      if (groupCode !== undefined) {
        updateData.groupCode = groupCode;
        

        
        // Cập nhật roleString theo groupCode mới (role_key không cần thiết)
        const newRoleString = getRoleFromGroupCode(groupCode);
        

        
        // Chỉ cập nhật roleString, không cập nhật role_key
        updateData.roleString = newRoleString;
        
        // Cập nhật role ObjectId từ database
        if (newRoleString) {
          const newRole = await Role.findOne({ name: newRoleString });
          if (newRole) {
            updateData.role = newRole._id;

          } else {
            console.warn('⚠️ Role not found for:', newRoleString);
          }
        }
      }
      
      // Chỉ admin mới được thay đổi status
      if (status !== undefined && req.user.role.name === ROLES.ADMIN) {
        updateData.status = status;
      }

      // Xử lý start_date
      if (start_date !== undefined) {
        updateData.start_date = start_date;

      }



      // Cập nhật user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      console.log(`✅ User ${req.user.username} đã cập nhật user: ${updatedUser.username}`);

      res.json({
        success: true,
        data: updatedUser,
        message: 'Cập nhật user thành công'
      });

    } catch (error) {
      console.error('❌ Lỗi cập nhật user:', error);
      res.status(500).json({
        success: false,
        error: 'Lỗi cập nhật user'
      });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Xóa user (chỉ admin)
 */
router.delete('/:id',
  requirePermission('users', 'delete'),
  logUserActivity('xóa user'),
  async (req, res) => {
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

      await User.findByIdAndDelete(id);

      console.log(`✅ User ${req.user.username} đã xóa user: ${user.username}`);

      res.json({
        success: true,
        message: `Đã xóa user ${user.username}`
      });

    } catch (error) {
      console.error('❌ Lỗi xóa user:', error);
      res.status(500).json({
        success: false,
        error: 'Lỗi xóa user'
      });
    }
  }
);

/**
 * POST /api/users/:id/change-password
 * Đổi mật khẩu user khác (admin) hoặc chính mình
 */
router.post('/:id/change-password',
  logUserActivity('đổi mật khẩu'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword, oldPassword } = req.body;

      // Validate
      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Mật khẩu mới là bắt buộc'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Mật khẩu phải có ít nhất 6 ký tự'
        });
      }

      // Tìm user
      const user = await User.findById(id).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User không tồn tại'
        });
      }

      // Kiểm tra quyền
      const isSelf = user._id.toString() === req.user.id;
      const isAdmin = req.user.role.name === ROLES.ADMIN;

      if (!isSelf && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Không có quyền đổi mật khẩu user này'
        });
      }

      // Nếu là đổi mật khẩu của chính mình, cần mật khẩu cũ
      if (isSelf && !isAdmin) {
        if (!oldPassword) {
          return res.status(400).json({
            success: false,
            error: 'Mật khẩu cũ là bắt buộc'
          });
        }

        const isValidOldPassword = await bcrypt.compare(oldPassword, user.password);
        if (!isValidOldPassword) {
          return res.status(400).json({
            success: false,
            error: 'Mật khẩu cũ không đúng'
          });
        }
      }

      // Hash mật khẩu mới và cập nhật
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.findByIdAndUpdate(id, { password: hashedPassword });

      console.log(`✅ ${isSelf ? 'Tự' : 'Admin'} đổi mật khẩu user: ${user.username}`);

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });

    } catch (error) {
      console.error('❌ Lỗi đổi mật khẩu:', error);
      res.status(500).json({
        success: false,
        error: 'Lỗi đổi mật khẩu'
      });
    }
  }
);

module.exports = router;
