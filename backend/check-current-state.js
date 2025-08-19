/**
 * Check current database state
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Role = require('./models/Role');

async function checkState() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/Moon');
    
    console.log('📊 CURRENT DATABASE STATE:\n');

    // Check roles
    const roles = await Role.find();
    console.log('🎭 Available Roles:');
    roles.forEach(role => {
      console.log(`  - ${role.name} (${role._id})`);
    });

    // Check users
    console.log('\n👥 Users and their roles:');
    const users = await User.find().populate('role');
    users.forEach(user => {
      console.log(`  - ${user.username}:`);
      console.log(`    Role field: ${user.role}`);
      console.log(`    Role name: ${user.role?.name || 'NONE'}`);
      console.log(`    RoleString: ${user.roleString}`);
      console.log(`    GroupCode: ${user.groupCode}`);
      console.log('');
    });

    // Focus on Moon user
    const moon = await User.findOne({ username: 'Moon' });
    console.log('🌙 Moon user detail:');
    console.log('Raw role field:', moon.role);
    console.log('Role type:', typeof moon.role);
    console.log('Is ObjectId?', mongoose.Types.ObjectId.isValid(moon.role));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkState();
