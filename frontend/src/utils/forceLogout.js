/**
 * Utility để force logout khi có update roles/permissions
 */

export function forceLogoutAllUsers() {
  try {
    console.log('🔄 Forcing logout for all users due to role updates...');
    
    // Clear all authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.clear(); // Clear everything to be safe
    
    // Clear session storage as well
    sessionStorage.clear();
    
    // Show notification
    if (window.alert) {
      alert('Phiên đăng nhập hết hạn vui lòng đăng nhập lại.');
    }
    
    // Redirect to login
    if (window.location) {
      window.location.href = '/login';
    }
    
    return true;
  } catch (error) {
    console.error('Error during force logout:', error);
    return false;
  }
}

export function checkTokenValidity() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Simple token expiry check
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    
    if (now >= exp) {
      console.log('🕒 Token expired, triggering logout...');
      forceLogoutAllUsers();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking token validity:', error);
    forceLogoutAllUsers();
    return false;
  }
}

// Auto-check token validity when module loads
if (typeof window !== 'undefined') {
  // Check immediately
  checkTokenValidity();
  
  // Check every 5 minutes
  setInterval(checkTokenValidity, 5 * 60 * 1000);
}
