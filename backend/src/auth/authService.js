/**
 * Auth Service - Xử lý xác thực và JWT
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { getRoleFromGroupCode } = require('../config/role-map');
const { isValidRole } = require('../config/permissions');

class AuthService {
  /**
   * Đăng nhập user
   * @param {string} username 
   * @param {string} password 
   * @returns {Object} { success, data?, error? }
   */
  async login(username, password) {
    try {
      console.log('🔍 AuthService.login called with:', { 
        username: `"${username}"`, 
        usernameLength: username?.length,
        usernameTrimmed: `"${username?.trim()}"`,
        password: password ? `${password.length} chars` : 'undefined'
      });

      // Tìm user với trim và case insensitive
      const trimmedUsername = username?.trim();
      console.log('🔍 Searching for user with query:', { username: trimmedUsername });
      
      const user = await User.findOne({ 
        username: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
      }).select('+password');
      
      console.log('🔍 User found:', user ? {
        id: user._id,
        username: user.username,
        status: user.status,
        role: user.role,
        groupCode: user.groupCode
      } : 'null');
      
      if (!user) {
        return {
          success: false,
          error: 'Tên đăng nhập không tồn tại'
        };
      }

      // Kiểm tra password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Mật khẩu không đúng'
        };
      }

      // Kiểm tra trạng thái user
      if (user.status !== 'Hoạt động') {
        return {
          success: false,
          error: 'Tài khoản đã bị khóa hoặc ngưng sử dụng'
        };
      }

      // Tạo JWT token
      const token = this.generateToken(user);
      
      // Trả về thông tin user (không bao gồm password)
      const userInfo = {
        id: user._id,
        username: user.username,
        group_name: user.group_name,
        groupCode: user.groupCode,
        role: user.role,
        status: user.status,
        start_date: user.start_date,
        permissions: user.permissions // Virtual field
      };

      return {
        success: true,
        data: {
          user: userInfo,
          token,
          expiresIn: process.env.JWT_EXPIRE || '24h'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Lỗi hệ thống: ' + error.message
      };
    }
  }

  /**
   * Tạo JWT token
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user._id,
      username: user.username,
      role: user.role,
      groupCode: user.groupCode,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'Moon-secret-key',
      { 
        expiresIn: process.env.JWT_EXPIRE || '24h',
        issuer: 'moonne-backend'
      }
    );
  }

  /**
   * Xác minh JWT token
   * @param {string} token 
   * @returns {Object} { success, data?, error? }
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'Moon-secret-key'
      );
      
      return {
        success: true,
        data: decoded
      };
    } catch (error) {
      let errorMessage = 'Token không hợp lệ';
      
      if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token đã hết hạn';
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Token không đúng định dạng';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Lấy thông tin user từ token
   * @param {string} token 
   * @returns {Object} { success, data?, error? }
   */
  async getUserFromToken(token) {
    try {
      // Xác minh token
      const tokenResult = this.verifyToken(token);
      if (!tokenResult.success) {
        return tokenResult;
      }

      const { userId } = tokenResult.data;
      
      // Lấy user từ database  
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User không tồn tại'
        };
      }

      // Kiểm tra trạng thái
      if (user.status !== 'Hoạt động') {
        return {
          success: false,
          error: 'Tài khoản đã bị khóa'
        };
      }

      return {
        success: true,
        data: {
          id: user._id,
          username: user.username,
          group_name: user.group_name,
          groupCode: user.groupCode,
          role: user.role,
          status: user.status,
          start_date: user.start_date,
          permissions: user.permissions
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Lỗi xác thực: ' + error.message
      };
    }
  }

  /**
   * Tạo user mới
   * @param {Object} userData - Dữ liệu user
   * @returns {Object} { success, data?, error? }
   */
  async createUser(userData) {
    try {
      const { username, password, group_name, groupCode } = userData;

      // Kiểm tra user đã tồn tại
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return {
          success: false,
          error: 'Tên đăng nhập đã tồn tại'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Xác định role từ groupCode
      const role = getRoleFromGroupCode(groupCode) || 'FK';

      // Tạo user mới
      const newUser = new User({
        username,
        password: hashedPassword,
        group_name,
        groupCode,
        role,
        status: 'Hoạt động',
        start_date: new Date()
      });

      await newUser.save();

      return {
        success: true,
        data: {
          id: newUser._id,
          username: newUser.username,
          group_name: newUser.group_name,
          groupCode: newUser.groupCode,
          role: newUser.role,
          status: newUser.status
        }
      };

    } catch (error) {
      return {
        success: false,
        error: 'Lỗi tạo user: ' + error.message
      };
    }
  }

  /**
   * Đổi mật khẩu
   * @param {string} userId 
   * @param {string} oldPassword 
   * @param {string} newPassword 
   * @returns {Object} { success, error? }
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        return {
          success: false,
          error: 'User không tồn tại'
        };
      }

      // Kiểm tra mật khẩu cũ
      const isValidOldPassword = await bcrypt.compare(oldPassword, user.password);
      if (!isValidOldPassword) {
        return {
          success: false,
          error: 'Mật khẩu cũ không đúng'
        };
      }

      // Hash mật khẩu mới
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // Cập nhật
      await User.findByIdAndUpdate(userId, {
        password: hashedNewPassword
      });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: 'Lỗi đổi mật khẩu: ' + error.message
      };
    }
  }
}

module.exports = new AuthService();
