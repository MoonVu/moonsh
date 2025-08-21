#!/usr/bin/env node

/**
 * Script để debug user cụ thể 
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const User = require('../models/User');
const Role = require('../models/Role');

async function debugUser() {
  try {
    console.log('🔍 Debug user cụ thể...');
    
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối database');

    // Tìm user "Moon"
    const user = await User.findOne({ username: 'Moon' }).populate('role');
    
    if (!user) {
      console.log('❌ Không tìm thấy user "Moon"');
      return;
    }

    console.log('👤 User "Moon" details:');
    console.log('Raw user object:', JSON.stringify(user.toObject(), null, 2));
    
    console.log('\n📊 User info:');
    console.log('- ID:', user._id);
    console.log('- Username:', user.username);
    console.log('- Group name:', user.group_name);
    console.log('- Group code:', user.groupCode);
    console.log('- Role ID:', user.role);
    console.log('- Role String:', user.roleString);
    console.log('- Status:', user.status);
    
    console.log('\n🎭 Role details:');
    if (user.role) {
      console.log('- Role populated:', !!user.role.name);
      if (user.role.name) {
        console.log('- Role name:', user.role.name);
        console.log('- Role display name:', user.role.displayName);
        console.log('- Role permissions count:', user.role.permissions?.length || 0);
      }
    } else {
      console.log('- Role is NULL!');
    }

    console.log('\n🔑 Virtual permissions:');
    try {
      const permissions = user.permissions;
      console.log('- Permissions type:', typeof permissions);
      console.log('- Permissions length:', permissions?.length || 'N/A');
      console.log('- First 5 permissions:', permissions?.slice(0, 5) || 'N/A');
    } catch (error) {
      console.log('- Error getting permissions:', error.message);
    }

    // Kiểm tra tất cả users có role null
    console.log('\n🔍 Tất cả users có role null:');
    const nullRoleUsers = await User.find({ role: null });
    console.log(`Found ${nullRoleUsers.length} users with null role:`);
    nullRoleUsers.forEach(u => {
      console.log(`- ${u.username}: roleString=${u.roleString}, groupCode=${u.groupCode}`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Đã ngắt kết nối database');
  }
}

if (require.main === module) {
  debugUser();
}

module.exports = { debugUser };
