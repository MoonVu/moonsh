/**
 * Migration: Thêm field role vào User collection và gán role theo groupCode
 * Chạy: node db/migrations/001_add_role_to_users.js
 */

const mongoose = require('mongoose');
const { getRoleFromGroupCode } = require('../../src/config/role-map');
const { ROLES } = require('../../src/config/permissions');

// Load environment variables
require('dotenv').config({ path: '../../config.env' });

async function migrateUsersRole() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:moon2201@localhost:27017/admin');
    console.log('✅ Đã kết nối MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Lấy tất cả users
    const users = await User.find({});
    console.log(`📊 Tìm thấy ${users.length} users cần migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let role = null;
        
        // Thử mapping từ groupCode trước
        if (user.groupCode) {
          role = getRoleFromGroupCode(user.groupCode);
        }
        
        // Nếu chưa có role, thử mapping từ group_name  
        if (!role && user.group_name) {
          role = getRoleFromGroupCode(user.group_name);
        }
        
        // Nếu vẫn chưa có, gán role mặc định
        if (!role) {
          role = ROLES.FK;  // Role thấp nhất
        }

        // Cập nhật user
        await User.updateOne(
          { _id: user._id },
          { 
            $set: { 
              role: role,
              groupCode: user.groupCode || user.group_name || 'FK'
            }
          }
        );

        console.log(`✅ User ${user.username}: groupCode=${user.groupCode || user.group_name} → role=${role}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Lỗi migrate user ${user.username}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Kết quả migration:');
    console.log(`✅ Thành công: ${migratedCount} users`);
    console.log(`❌ Lỗi: ${errorCount} users`);

    // Kiểm tra kết quả
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 Thống kê role sau migration:');
    roleStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} users`);
    });

  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Đã ngắt kết nối MongoDB');
  }
}

// Chạy migration nếu file được gọi trực tiếp
if (require.main === module) {
  migrateUsersRole()
    .then(() => {
      console.log('🎉 Migration hoàn tất!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration thất bại:', error);
      process.exit(1);
    });
}

module.exports = migrateUsersRole;
