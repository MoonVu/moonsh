/**
 * Debug utilities for authentication issues
 */

export function debugToken() {
  const token = localStorage.getItem('token');
  
  console.group('🔍 Auth Debug');
  
  console.log('Token exists:', !!token);
  console.log('Token length:', token?.length);
  
  if (token) {
    try {
      const parts = token.split('.');
      console.log('Token parts:', parts.length);
      
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('Token payload:', {
          userId: payload.userId,
          username: payload.username,
          role: payload.role,
          exp: payload.exp ? new Date(payload.exp * 1000) : 'No expiry',
          iat: payload.iat ? new Date(payload.iat * 1000) : 'No issued time',
          issuer: payload.iss
        });
        
        const isExpired = payload.exp && Date.now() >= payload.exp * 1000;
        console.log('Token expired:', isExpired);
        
        if (isExpired) {
          console.warn('⚠️ Token is expired!');
        }
      }
    } catch (error) {
      console.error('Token decode error:', error);
    }
  }
  
  console.groupEnd();
}

export function debugUser(user) {
  console.group('👤 User Debug');
  
  console.log('User exists:', !!user);
  
  if (user) {
    console.log('User info:', {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions?.slice(0, 5) + (user.permissions?.length > 5 ? '...' : ''),
      permissionsCount: user.permissions?.length
    });
  }
  
  console.groupEnd();
}

export function compareTokenAndUser(user) {
  const token = localStorage.getItem('token');
  
  console.group('🔄 Token vs User Comparison');
  
  if (!token || !user) {
    console.log('Missing token or user');
    console.groupEnd();
    return { valid: false, reason: 'Missing data' };
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tokenRole = payload.role?.name || payload.role;
    const userRole = user.role?.name || user.role;
    
    console.log('Comparison:', {
      tokenRole,
      userRole,
      match: tokenRole === userRole,
      tokenUserId: payload.userId,
      userUserId: user.id
    });
    
    const result = {
      valid: tokenRole === userRole && payload.userId === user.id,
      reason: tokenRole !== userRole ? 'Role mismatch' : 
              payload.userId !== user.id ? 'User ID mismatch' : 'Valid'
    };
    
    console.log('Result:', result);
    console.groupEnd();
    
    return result;
    
  } catch (error) {
    console.error('Comparison error:', error);
    console.groupEnd();
    return { valid: false, reason: 'Token decode error' };
  }
}

export function clearAllAuth() {
  console.log('🧹 Clearing all auth data');
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  sessionStorage.clear();
  console.log('✅ Auth data cleared');
}

// Auto-attach to window for console debugging
if (typeof window !== 'undefined') {
  window.debugAuth = {
    debugToken,
    debugUser,
    compareTokenAndUser,
    clearAllAuth
  };
  
  console.log('🔧 Debug tools available: window.debugAuth');
}
