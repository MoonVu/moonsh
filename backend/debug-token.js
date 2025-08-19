/**
 * Debug script kiểm tra token và user info
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Role = require('./models/Role');
require('dotenv').config();

async function debugToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Moon');
    
    // 1. Kiểm tra user Moon trong DB
    const moonUser = await User.findOne({ username: 'Moon' }).populate('role');
    console.log('👤 User Moon in database:');
    console.log('- Username:', moonUser.username);
    console.log('- Role Name:', moonUser.role?.name);
    console.log('- Role String:', moonUser.roleString);
    console.log('- Permissions count:', moonUser.role?.permissions?.length);
    
    // 2. Decode token từ localStorage (giả lập)
    const sampleToken = process.argv[2]; // Nhận token từ command line
    if (sampleToken) {
      console.log('\n🔍 Decoding token...');
      try {
        const decoded = jwt.decode(sampleToken);
        console.log('- User ID:', decoded.userId);
        console.log('- Username:', decoded.username);
        console.log('- Role in token:', decoded.role?.name || decoded.role);
        console.log('- Token issued at:', new Date(decoded.iat * 1000));
        console.log('- Token expires at:', new Date(decoded.exp * 1000));
        
        if (decoded.role?.name !== moonUser.role?.name) {
          console.log('\n⚠️ TOKEN MISMATCH DETECTED!');
          console.log('- Token role:', decoded.role?.name || decoded.role);
          console.log('- DB role:', moonUser.role?.name);
          console.log('💡 Solution: User needs to logout and login again');
        }
      } catch (error) {
        console.log('❌ Token decode error:', error.message);
      }
    } else {
      console.log('\n💡 To check token: node debug-token.js "your-token-here"');
    }
    
    // 3. Tạo token mới cho user Moon
    console.log('\n🔄 Creating fresh token for Moon...');
    const JWT_SECRET = process.env.JWT_SECRET || 'Moon-secret-key';
    const newToken = jwt.sign(
      {
        userId: moonUser._id,
        username: moonUser.username,
        role: moonUser.role
      },
      JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'moonne-backend'
      }
    );
    
    console.log('✅ New token created (first 50 chars):', newToken.substring(0, 50) + '...');
    console.log('💡 Use this token for testing');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Debug error:', error);
    process.exit(1);
  }
}

debugToken();
