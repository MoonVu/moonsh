#!/usr/bin/env node

/**
 * Script để sửa lỗi user roles bị null
 * Gắn lại role ObjectId cho users dựa trên roleString hoặc groupCode
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const User = require('../models/User');
const Role = require('../models/Role');

async function fixUserRoles() {
  try {
    console.log('🔧 Bắt đầu sửa user roles...');
    
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối database');

    // Lấy tất cả roles hiện có
    const roles = await Role.find({});
    console.log('📋 Roles hiện có:', roles.map(r => ({ _id: r._id, name: r.name })));

    if (roles.length === 0) {
      console.log('❌ Không có role nào trong database! Cần chạy seed roles trước.');
      return;
    }

    // Tạo mapping role name -> ObjectId
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role._id;
    });

    console.log('🗺️  Role mapping:', roleMap);

    // Lấy tất cả users có role null hoặc không hợp lệ
    const usersToFix = await User.find({
      $or: [
        { role: null },
        { role: { $exists: false } }
      ]
    });

    console.log(`🔍 Tìm thấy ${usersToFix.length} users cần sửa role`);

    if (usersToFix.length === 0) {
      console.log('✅ Tất cả users đã có role hợp lệ');
      return;
    }

    // Group to role mapping
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

    let fixedCount = 0;
    let errorCount = 0;

    for (const user of usersToFix) {
      try {
        let targetRole = 'FK'; // Default role

        // Ưu tiên roleString nếu có
        if (user.roleString && roleMap[user.roleString]) {
          targetRole = user.roleString;
        }
        // Fallback sang groupCode mapping
        else if (user.groupCode && groupToRoleMap[user.groupCode]) {
          targetRole = groupToRoleMap[user.groupCode];
        }
        // Fallback sang group_name mapping
        else if (user.group_name && groupToRoleMap[user.group_name]) {
          targetRole = groupToRoleMap[user.group_name];
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

    // Kiểm tra lại
    console.log('\n🔍 Kiểm tra lại...');
    const usersWithNullRole = await User.find({ role: null });
    console.log(`Users còn role null: ${usersWithNullRole.length}`);

    if (usersWithNullRole.length > 0) {
      console.log('❌ Còn users chưa được sửa:');
      usersWithNullRole.forEach(u => {
        console.log(`  - ${u.username}: roleString=${u.roleString}, groupCode=${u.groupCode}, group_name=${u.group_name}`);
      });
    } else {
      console.log('✅ Tất cả users đã có role hợp lệ!');
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Đã ngắt kết nối database');
  }
}

if (require.main === module) {
  fixUserRoles();
}

module.exports = { fixUserRoles };
