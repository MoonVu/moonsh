const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/Moon');
    console.log('✅ Connected to MongoDB');
    
    // Find user
    const user = await User.findOne({ username: 'moon' });
    if (!user) {
      console.log('❌ User "moon" not found');
      
      // List all users
      const allUsers = await User.find({}, 'username group_name role status');
      console.log('📋 All users:');
      allUsers.forEach(u => {
        console.log(`- ${u.username} (${u.group_name}, ${u.role}, ${u.status})`);
      });
      
      return;
    }
    
    console.log('✅ User found:');
    console.log('- Username:', user.username);
    console.log('- Group:', user.group_name);
    console.log('- Role:', user.role);
    console.log('- Status:', user.status);
    console.log('- Created:', user.createdAt);
    
    // Test different passwords
    const passwords = ['123456', 'moon', 'admin', 'password'];
    
    for (let pwd of passwords) {
      const isMatch = await bcrypt.compare(pwd, user.password);
      console.log(`🔑 Password "${pwd}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    }
    
    // Also test API call
    console.log('\n🌐 Testing API call...');
    const fetch = require('node-fetch');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'moon',
        password: '123456'
      })
    });
    
    const result = await response.text();
    console.log('API Response status:', response.status);
    console.log('API Response:', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testLogin();
