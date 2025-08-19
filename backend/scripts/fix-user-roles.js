/**
 * Script sửa role cho users dựa trên groupCode
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Role = require('../models/Role');
const { getRoleFromGroupCode } = require('../src/config/role-map');
require('dotenv').config({ path: '../config.env' });

async function fixUserRoles() {
  try {
    console.log('🔧 Sửa role cho users dựa trên groupCode...');
    
    // Kết nối database
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/Moon';
    await mongoose.connect(mongoUrl);
    console.log('✅ Đã kết nối database');

    // Lấy tất cả roles
    const roles = await Role.find();
    const roleMap = new Map();
    roles.forEach(role => {
      roleMap.set(role.name, role._id);
    });

    console.log('📋 Available roles:', Array.from(roleMap.keys()));

    // Lấy tất cả users có groupCode
    const users = await User.find({ groupCode: { $exists: true, $ne: null } });
    console.log(`🔍 Tìm thấy ${users.length} users có groupCode`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Lấy role từ groupCode
        const expectedRole = getRoleFromGroupCode(user.groupCode);
        const expectedRoleId = roleMap.get(expectedRole);
        
        console.log(`👤 User ${user.username}:`);
        console.log(`   - GroupCode: ${user.groupCode}`);
        console.log(`   - Expected role: ${expectedRole}`);
        console.log(`   - Current role: ${user.roleString}`);
        
        if (expectedRole && expectedRoleId) {
          // Cập nhật role nếu khác
          if (user.roleString !== expectedRole) {
            user.role = expectedRoleId;
            user.roleString = expectedRole;
            await user.save();
            console.log(`   ✅ Updated: ${user.roleString} -> ${expectedRole}`);
            updatedCount++;
          } else {
            console.log(`   ⏭️ Already correct`);
          }
        } else {
          console.log(`   ⚠️ No role mapping for groupCode: ${user.groupCode}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error updating user ${user.username}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n🎉 Hoàn thành: ${updatedCount} users được cập nhật, ${errorCount} lỗi`);
    
    // Kiểm tra user Moon cụ thể
    const moon = await User.findOne({ username: 'Moon' }).populate('role');
    if (moon) {
      console.log('\n👤 User Moon sau khi fix:');
      console.log('- Username:', moon.username);
      console.log('- GroupCode:', moon.groupCode);
      console.log('- Role Name:', moon.role?.name);
      console.log('- Role String:', moon.roleString);
      console.log('- Permissions count:', moon.role?.permissions?.length);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi fix roles:', error);
    process.exit(1);
  }
}

fixUserRoles();
