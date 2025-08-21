#!/usr/bin/env node

/**
 * Script comprehensive để sửa toàn bộ vấn đề user roles
 * 1. Tạo lại role FK nếu thiếu
 * 2. Gắn lại role ObjectId cho tất cả users
 * 3. Đảm bảo sync giữa role và roleString
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const User = require('../models/User');
const Role = require('../models/Role');

async function fixAllUserRoles() {
  try {
    console.log('🔧 Bắt đầu sửa toàn bộ user roles...');
    
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối database');

    // Bước 1: Kiểm tra và tạo lại roles nếu thiếu
    console.log('\n📋 Bước 1: Kiểm tra roles...');
    const existingRoles = await Role.find({});
    console.log('Roles hiện có:', existingRoles.map(r => r.name));

    const requiredRoles = ['ADMIN', 'XNK', 'CSKH', 'FK'];
    const missingRoles = requiredRoles.filter(name => 
      !existingRoles.find(r => r.name === name)
    );

    if (missingRoles.length > 0) {
      console.log('❌ Thiếu roles:', missingRoles);
      console.log('🔧 Tạo lại roles thiếu...');
      
      for (const roleName of missingRoles) {
        const roleData = {
          name: roleName,
          displayName: getRoleDisplayName(roleName),
          description: getRoleDescription(roleName),
          permissions: getDefaultPermissions(roleName),
          isActive: true
        };
        
        const newRole = new Role(roleData);
        await newRole.save();
        console.log(`✅ Đã tạo role: ${roleName}`);
      }
    } else {
      console.log('✅ Tất cả roles cần thiết đã có');
    }

    // Bước 2: Lấy lại tất cả roles (bao gồm mới tạo)
    const allRoles = await Role.find({});
    console.log('\n📋 Roles sau khi kiểm tra:', allRoles.map(r => ({ _id: r._id, name: r.name })));

    // Tạo mapping role name -> ObjectId
    const roleMap = {};
    allRoles.forEach(role => {
      roleMap[role.name] = role._id;
    });

    // Bước 3: Sửa tất cả users
    console.log('\n🔧 Bước 3: Sửa tất cả users...');
    const allUsers = await User.find({});
    console.log(`Tìm thấy ${allUsers.length} users cần sửa`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        let targetRole = 'FK'; // Default role

        // Ưu tiên roleString nếu có và hợp lệ
        if (user.roleString && roleMap[user.roleString]) {
          targetRole = user.roleString;
        }
        // Fallback sang groupCode mapping
        else if (user.groupCode && getRoleFromGroupCode(user.groupCode)) {
          targetRole = getRoleFromGroupCode(user.groupCode);
        }
        // Fallback sang group_name mapping
        else if (user.group_name && getRoleFromGroupCode(user.group_name)) {
          targetRole = getRoleFromGroupCode(user.group_name);
        }

        const roleObjectId = roleMap[targetRole];
        
        console.log(`👤 User: ${user.username}`);
        console.log(`   - roleString: ${user.roleString}`);
        console.log(`   - groupCode: ${user.groupCode}`);
        console.log(`   - group_name: ${user.group_name}`);
        console.log(`   - Gắn role: ${targetRole} (${roleObjectId})`);

        // Update user
        await User.findByIdAndUpdate(user._id, {
          role: roleObjectId,
          roleString: targetRole // Đảm bảo roleString cũng đúng
        });

        fixedCount++;
        console.log(`   ✅ Đã sửa`);

      } catch (error) {
        errorCount++;
        console.error(`   ❌ Lỗi khi sửa user ${user.username}:`, error.message);
      }
    }

    console.log('\n📊 Kết quả:');
    console.log(`✅ Đã sửa: ${fixedCount} users`);
    console.log(`❌ Lỗi: ${errorCount} users`);

    // Bước 4: Kiểm tra lại
    console.log('\n🔍 Bước 4: Kiểm tra lại...');
    const usersWithNullRole = await User.find({ role: null });
    console.log(`Users còn role null: ${usersWithNullRole.length}`);

    if (usersWithNullRole.length > 0) {
      console.log('❌ Còn users chưa được sửa:');
      usersWithNullRole.forEach(u => {
        console.log(`  - ${u.username}: roleString=${u.roleString}, groupCode=${u.groupCode}`);
      });
    } else {
      console.log('✅ Tất cả users đã có role hợp lệ!');
    }

    // Bước 5: Test populate
    console.log('\n🧪 Bước 5: Test populate...');
    const testUser = await User.findOne({ username: 'Moon' }).populate('role');
    if (testUser && testUser.role) {
      console.log(`✅ User Moon có role: ${testUser.role.name} (${testUser.role._id})`);
    } else {
      console.log('❌ User Moon vẫn không có role!');
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Đã ngắt kết nối database');
  }
}

// Helper functions
function getRoleDisplayName(roleName) {
  const displayNames = {
    'ADMIN': 'Quản trị viên',
    'XNK': 'Xuất nhập khẩu',
    'CSKH': 'Chăm sóc khách hàng',
    'FK': 'Tài chính kế toán'
  };
  return displayNames[roleName] || roleName;
}

function getRoleDescription(roleName) {
  const descriptions = {
    'ADMIN': 'Quản trị viên hệ thống với quyền cao nhất',
    'XNK': 'Nhân viên xuất nhập khẩu',
    'CSKH': 'Nhân viên chăm sóc khách hàng',
    'FK': 'Nhân viên tài chính kế toán'
  };
  return descriptions[roleName] || '';
}

function getRoleFromGroupCode(groupCode) {
  const groupToRoleMap = {
    'CQ': 'ADMIN',
    'PCQ': 'ADMIN', 
    'TT': 'XNK',
    'XNK': 'XNK',
    'FK': 'FK',
    'FK-X': 'FK',
    'CSKH': 'CSKH',
    'CSOL': 'CSKH',
    'CSDL': 'CSKH',
    'Truyền thông': 'CSKH'
  };
  return groupToRoleMap[groupCode] || 'FK';
}

function getDefaultPermissions(roleName) {
  const { RESOURCES, PERMISSIONS } = require('../src/config/permissions');
  
  const rolePermissions = {
    'ADMIN': [
      { resource: RESOURCES.ADMINISTRATOR_ACCESS, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE] },
      { resource: RESOURCES.USER_MANAGEMENT, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE] },
      { resource: RESOURCES.SCHEDULES, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE] },
      { resource: RESOURCES.USERS, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE] }
    ],
    'XNK': [
      { resource: RESOURCES.USER_MANAGEMENT, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] },
      { resource: RESOURCES.SCHEDULES, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] },
      { resource: RESOURCES.USERS, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] }
    ],
    'CSKH': [
      { resource: RESOURCES.USER_MANAGEMENT, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] },
      { resource: RESOURCES.SCHEDULES, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] },
      { resource: RESOURCES.USERS, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] }
    ],
    'FK': [
      { resource: RESOURCES.FINANCIAL_MANAGEMENT, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] },
      { resource: RESOURCES.SCHEDULES, actions: [PERMISSIONS.VIEW, PERMISSIONS.EDIT] },
      { resource: RESOURCES.USERS, actions: [PERMISSIONS.VIEW] }
    ]
  };
  
  return rolePermissions[roleName] || [];
}

if (require.main === module) {
  fixAllUserRoles();
}

module.exports = { fixAllUserRoles };
