/**
 * Seed script: Tạo dữ liệu mẫu cho roles và permissions
 * Chạy: node db/seed/roles_permissions_seed.js
 */

const mongoose = require('mongoose');
const { ROLES, ALL_PERMISSIONS, ROLE_PERMISSIONS } = require('../../src/config/permissions');
const { GROUP_TO_ROLE_MAP } = require('../../src/config/role-map');

// Load environment variables  
require('dotenv').config({ path: '../../config.env' });

// Schema cho Role collection (nếu muốn tách riêng)
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: String,
  description: String,
  permissions: [String],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Schema cho Permission collection (nếu muốn tách riêng)
const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  resource: String,  // schedules, users, tasks, etc.
  action: String,    // view, edit, delete
  description: String
}, { timestamps: true });

async function seedRolesAndPermissions() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moonne');
    console.log('✅ Đã kết nối MongoDB');

    const Role = mongoose.model('Role', roleSchema);
    const Permission = mongoose.model('Permission', permissionSchema);

    // 1. Seed Permissions
    console.log('\n📝 Seeding permissions...');
    await Permission.deleteMany({}); // Xóa dữ liệu cũ

    const permissionsData = [];
    ALL_PERMISSIONS.forEach(perm => {
      const [resource, action] = perm.split('.');
      permissionsData.push({
        name: perm,
        resource,
        action,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`
      });
    });

    await Permission.insertMany(permissionsData);
    console.log(`✅ Đã tạo ${permissionsData.length} permissions`);

    // 2. Seed Roles
    console.log('\n👥 Seeding roles...');
    await Role.deleteMany({}); // Xóa dữ liệu cũ

    const rolesData = [
      {
        name: ROLES.ADMIN,
        displayName: 'Quản trị viên',
        description: 'Quyền cao nhất, quản lý toàn hệ thống',
        permissions: Object.keys(ROLE_PERMISSIONS[ROLES.ADMIN]).flatMap(resource => 
          ROLE_PERMISSIONS[ROLES.ADMIN][resource].map(action => `${resource}.${action}`)
        )
      },
      {
        name: ROLES.XNK,
        displayName: 'Xuất nhập khoản',
        description: 'XNK',
        permissions: Object.keys(ROLE_PERMISSIONS[ROLES.XNK]).flatMap(resource => 
          ROLE_PERMISSIONS[ROLES.XNK][resource].map(action => `${resource}.${action}`)
        )
      },
      {
        name: ROLES.CSKH,
        displayName: 'Chăm sóc khách hàng',
        description: 'CSKH',
        permissions: Object.keys(ROLE_PERMISSIONS[ROLES.CSKH]).flatMap(resource => 
          ROLE_PERMISSIONS[ROLES.CSKH][resource].map(action => `${resource}.${action}`)
        )
      },
      {
        name: ROLES.FK,
        displayName: 'Duyệt đơn',
        description: 'FK',
        permissions: Object.keys(ROLE_PERMISSIONS[ROLES.FK]).flatMap(resource => 
          ROLE_PERMISSIONS[ROLES.FK][resource].map(action => `${resource}.${action}`)
        )
      }
    ];

    await Role.insertMany(rolesData);
    console.log(`✅ Đã tạo ${rolesData.length} roles`);

    // 3. Hiển thị thống kê
    console.log('\n📊 Thống kê sau khi seed:');
    
    const roleStats = await Role.find({}).select('name displayName permissions');
    roleStats.forEach(role => {
      console.log(`  ${role.displayName} (${role.name}): ${role.permissions.length} permissions`);
    });

    console.log('\n🗂️ Mapping GroupCode → Role:');
    Object.entries(GROUP_TO_ROLE_MAP).forEach(([groupCode, role]) => {
      console.log(`  ${groupCode} → ${role}`);
    });

    // 4. Tạo admin user mẫu (nếu chưa có)
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const adminExists = await User.findOne({ role: ROLES.ADMIN });
    
    if (!adminExists) {
      console.log('\n👤 Tạo admin user mẫu...');
      const bcrypt = require('bcryptjs');
      
      const adminUser = new User({
        username: 'admin',
        password: await bcrypt.hash('admin123', 10),
        group_name: 'Quản trị viên',
        groupCode: 'TT',
        role: ROLES.ADMIN,
        status: 'Hoạt động',
        start_date: new Date()
      });
      
      await adminUser.save();
      console.log('✅ Đã tạo admin user: admin/admin123');
    }

  } catch (error) {
    console.error('❌ Lỗi seed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Đã ngắt kết nối MongoDB');
  }
}

// Chạy seed nếu file được gọi trực tiếp
if (require.main === module) {
  seedRolesAndPermissions()
    .then(() => {
      console.log('🎉 Seed hoàn tất!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seed thất bại:', error);
      process.exit(1);
    });
}

module.exports = seedRolesAndPermissions;
