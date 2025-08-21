#!/usr/bin/env node

/**
 * Script để kiểm tra role existence
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const User = require('../models/User');
const Role = require('../models/Role');

async function checkRoleExistence() {
  try {
    console.log('🔍 Kiểm tra role existence...');
    
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối database');

    // Lấy tất cả roles
    const roles = await Role.find({});
    console.log('📋 Roles hiện có:');
    roles.forEach(role => {
      console.log(`- ${role._id} (${role.name}): ${role.displayName}`);
    });

    // Tìm user Moon
    const user = await User.findOne({ username: 'Moon' });
    if (!user) {
      console.log('❌ Không tìm thấy user Moon');
      return;
    }

    console.log('\n👤 User Moon details:');
    console.log('- Role ID in DB:', user.role);
    console.log('- Role String:', user.roleString);
    console.log('- Group Code:', user.groupCode);

    // Kiểm tra xem role ID có tồn tại không
    if (user.role) {
      const roleExists = await Role.findById(user.role);
      console.log('- Role exists in DB:', !!roleExists);
      
      if (roleExists) {
        console.log('- Role details:', {
          id: roleExists._id,
          name: roleExists.name,
          displayName: roleExists.displayName
        });
      } else {
        console.log('❌ Role ID tồn tại nhưng không tìm thấy Role object!');
        
        // Tìm role dựa trên roleString
        const roleByName = await Role.findOne({ name: user.roleString });
        if (roleByName) {
          console.log('✅ Tìm thấy role theo name:', roleByName.name);
          console.log('🔧 Cần update user.role =', roleByName._id);
        } else {
          console.log('❌ Không tìm thấy role theo name:', user.roleString);
        }
      }
    } else {
      console.log('❌ User không có role field!');
    }

    // Kiểm tra tất cả users có role không hợp lệ
    console.log('\n🔍 Kiểm tra tất cả users...');
    const allUsers = await User.find({});
    let validRoleCount = 0;
    let invalidRoleCount = 0;

    for (const u of allUsers) {
      if (u.role) {
        const roleExists = await Role.findById(u.role);
        if (roleExists) {
          validRoleCount++;
        } else {
          invalidRoleCount++;
          console.log(`❌ User ${u.username} có role ID không hợp lệ: ${u.role}`);
        }
      } else {
        invalidRoleCount++;
        console.log(`❌ User ${u.username} không có role field`);
      }
    }

    console.log('\n📊 Tổng kết:');
    console.log(`✅ Users có role hợp lệ: ${validRoleCount}`);
    console.log(`❌ Users có role không hợp lệ: ${invalidRoleCount}`);

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Đã ngắt kết nối database');
  }
}

if (require.main === module) {
  checkRoleExistence();
}

module.exports = { checkRoleExistence };
