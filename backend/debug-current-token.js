/**
 * Script để debug token hiện tại và tạo token mới
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Lấy token từ command line argument
const currentToken = process.argv[2];
const JWT_SECRET = process.env.JWT_SECRET || 'Moon-secret-key';

async function debugCurrentToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/Moon');
    console.log('✅ Connected to database\n');

    if (!currentToken) {
      console.log('💡 Usage: node debug-current-token.js "your-current-token"');
      console.log('💡 You can get the token from browser localStorage');
      process.exit(0);
    }

    console.log('🔍 Analyzing current token...');
    console.log('Token length:', currentToken.length);
    console.log('Token preview:', currentToken.substring(0, 50) + '...\n');

    try {
      // 1. Decode without verification first
      const decoded = jwt.decode(currentToken);
      console.log('📋 Token payload (decoded):');
      console.log('- User ID:', decoded.userId);
      console.log('- Username:', decoded.username);
      console.log('- Role in token:', decoded.role?.name || decoded.role);
      console.log('- Issued at:', new Date(decoded.iat * 1000));
      console.log('- Expires at:', new Date(decoded.exp * 1000));
      console.log('- Is expired:', Date.now() >= decoded.exp * 1000);
      console.log('');

      // 2. Verify token
      try {
        const verified = jwt.verify(currentToken, JWT_SECRET);
        console.log('✅ Token verification: VALID');
      } catch (verifyError) {
        console.log('❌ Token verification: INVALID');
        console.log('Error:', verifyError.message);
      }

      // 3. Check user in database
      const user = await User.findById(decoded.userId).populate('role');
      if (user) {
        console.log('\n👤 User in database:');
        console.log('- Username:', user.username);
        console.log('- Role in DB:', user.role?.name);
        console.log('- Role String:', user.roleString);
        console.log('- Permissions count:', user.role?.permissions?.length);
        
        // 4. Compare token vs database
        const tokenRole = decoded.role?.name || decoded.role;
        const dbRole = user.role?.name;
        
        console.log('\n🔄 Comparison:');
        console.log('- Token role:', tokenRole);
        console.log('- Database role:', dbRole);
        console.log('- Match:', tokenRole === dbRole ? '✅ YES' : '❌ NO');
        
        if (tokenRole !== dbRole) {
          console.log('\n⚠️ ROLE MISMATCH DETECTED!');
          console.log('This explains why you\'re getting permission errors.');
          console.log('');
          
          // 5. Generate new token with correct role
          console.log('🔧 Generating new token with correct role...');
          const newToken = jwt.sign(
            {
              userId: user._id,
              username: user.username,
              role: user.role
            },
            JWT_SECRET,
            { 
              expiresIn: '24h',
              issuer: 'moonne-backend'
            }
          );
          
          console.log('✅ New token generated:');
          console.log(newToken);
          console.log('');
          console.log('💡 Copy this token and replace in browser localStorage.setItem("token", "new-token")');
        } else {
          console.log('\n✅ Token and database are in sync');
        }
        
      } else {
        console.log('\n❌ User not found in database');
      }

    } catch (decodeError) {
      console.log('❌ Token decode error:', decodeError.message);
      console.log('The token might be corrupted or malformed');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Debug error:', error);
    process.exit(1);
  }
}

debugCurrentToken();
