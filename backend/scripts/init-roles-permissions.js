/**
 * Script khởi tạo roles và permissions vào database
 * Chạy: node scripts/init-roles-permissions.js
 */

const mongoose = require('mongoose');
const { seedRolesAndPermissions } = require('../db/seed/roles_permissions_seed');
const { migrateUsersToRoleRefs } = require('../db/migrations/002_migrate_users_to_role_refs');
require('dotenv').config({ path: '../config.env' });

async function initDatabase() {
  try {
    console.log('🚀 Bắt đầu khởi tạo database...');
    
    // Kết nối database
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/Moon';
    await mongoose.connect(mongoUrl);
    console.log('✅ Đã kết nối database');

    // Seed roles và permissions
    const result = await seedRolesAndPermissions();
    console.log(`📊 Đã tạo: ${result.roles.length} roles, ${result.permissions.length} permissions`);
    
    // Migrate users hiện tại
    console.log('\n🔄 Bắt đầu migrate users...');
    const migrationResult = await migrateUsersToRoleRefs();
    console.log(`📊 Migration users: ${migrationResult.migratedCount} thành công, ${migrationResult.errorCount} lỗi`);
    
    console.log('\n🎉 Khởi tạo hoàn thành!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khởi tạo:', error);
    process.exit(1);
  }
}

// Chạy script
initDatabase();
