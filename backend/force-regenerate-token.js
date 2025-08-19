/**
 * Force regenerate token for Moon with correct roleId
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const authService = require('./src/auth/authService');
const jwt = require('jsonwebtoken');

async function forceRegenToken() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/Moon');
    console.log('📦 Connected to MongoDB');

    // Find Moon user with role populated
    const user = await User.findOne({username: 'Moon'}).populate('role');
    console.log('👤 Found user:', {
      username: user.username,
      roleId: user.role?._id,
      roleName: user.role?.name
    });

    if (!user.role || !user.role._id) {
      console.log('❌ User has no valid role reference!');
      return;
    }

    // Generate new token manually
    const payload = {
      userId: user._id,
      roleId: user.role._id,  // ← CRITICAL: Must have roleId
      username: user.username,
      iat: Math.floor(Date.now() / 1000)
    };

    const newToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'Moon-secret-key',
      { 
        expiresIn: '24h',
        issuer: 'moonne-backend'
      }
    );

    console.log('\n🔑 New token payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    console.log('\n📋 Token to use in browser:');
    console.log(newToken);
    
    console.log('\n🛠️ Manual steps:');
    console.log('1. Copy the token above');
    console.log('2. Open browser DevTools (F12) → Console');
    console.log('3. Run: localStorage.setItem("token", "PASTE_TOKEN_HERE")');
    console.log('4. Refresh page');
    console.log('5. AdminPage dropdown should work!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

forceRegenToken();
