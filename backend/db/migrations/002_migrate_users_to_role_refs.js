/**
 * Migration: Chuyển đổi user.role từ string sang ObjectId reference
 */

const mongoose = require('mongoose');
const User = require('../../models/User');
const Role = require('../../models/Role');

async function migrateUsersToRoleRefs() {
  try {
    console.log('🔄 Bắt đầu migrate users sang role references...');

    // Lấy tất cả roles
    const roles = await Role.find();
    const roleMap = new Map();
    roles.forEach(role => {
      roleMap.set(role.name, role._id);
    });

    console.log('📋 Role mapping:', Object.fromEntries(roleMap));

    // Lấy tất cả users cần migrate
    const users = await User.find({ role: { $type: 'string' } });
    console.log(`🔍 Tìm thấy ${users.length} users cần migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Backup role string vào roleString
        user.roleString = user.role;
        
        // Convert role string sang ObjectId
        const roleId = roleMap.get(user.role);
        if (roleId) {
          user.role = roleId;
          await user.save();
          console.log(`✅ Migrated user ${user.username}: ${user.roleString} -> ${roleId}`);
          migratedCount++;
        } else {
          console.warn(`⚠️ Không tìm thấy role ${user.role} cho user ${user.username}`);
          // Set default role là FK
          const defaultRoleId = roleMap.get('FK');
          if (defaultRoleId) {
            user.role = defaultRoleId;
            user.roleString = 'FK';
            await user.save();
            console.log(`✅ Set default role FK cho user ${user.username}`);
            migratedCount++;
          }
        }
      } catch (error) {
        console.error(`❌ Lỗi migrate user ${user.username}:`, error);
        errorCount++;
      }
    }

    console.log(`🎉 Migration hoàn thành: ${migratedCount} thành công, ${errorCount} lỗi`);
    return { migratedCount, errorCount };

  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    throw error;
  }
}

module.exports = { migrateUsersToRoleRefs };
