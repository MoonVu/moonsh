const mongoose = require('mongoose');
const User = require('./models/User');
const Role = require('./models/Role');
require('dotenv').config();

async function checkAdminUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Moon');
    
    const admin = await User.findOne({username: 'admin'}).populate('role');
    console.log('Admin user check:');
    console.log('- Found:', !!admin);
    console.log('- Username:', admin?.username);
    console.log('- Role ID:', admin?.role?._id);
    console.log('- Role name:', admin?.role?.name);
    console.log('- Role permissions count:', admin?.role?.permissions?.length);
    
    if (admin?.role) {
      console.log('- Has admin access:', admin.hasPermission('administrator_access', 'view'));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAdminUser();
