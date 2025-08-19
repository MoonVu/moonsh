/**
 * Component thông báo token expired và cần login lại
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { debugToken, debugUser, compareTokenAndUser } from '../utils/debugAuth';

function TokenExpiredNotice() {
  const [showNotice, setShowNotice] = useState(false);
  const { logout, user, isAuthenticated } = useAuth();
  
  // DEBUG: Log state changes
  useEffect(() => {
    console.log('TokenExpiredNotice state:', { isAuthenticated, hasUser: !!user, showNotice });
    if (user) {
      debugUser(user);
    }
    debugToken();
  }, [isAuthenticated, user, showNotice]);

  useEffect(() => {
    // Chỉ check một lần khi component mount
    if (isAuthenticated && user && !showNotice) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔍 No token found');
        return;
      }

      try {
        // Validate token format first
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.warn('🔍 Invalid token format');
          setShowNotice(true);
          return;
        }

        // Decode payload
        const payload = JSON.parse(atob(parts[1]));
        const tokenRole = payload.role?.name || payload.role;
        const currentRole = user.role?.name || user.role;
        
        console.log('🔍 Token check:', { 
          tokenRole, 
          currentRole, 
          tokenExp: payload.exp ? new Date(payload.exp * 1000) : 'No expiry',
          now: new Date()
        });

        // Check expiry first
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          console.log('🔍 Token expired');
          setShowNotice(true);
          return;
        }
        
        // Check role mismatch (only if both roles exist and are different)
        if (tokenRole && currentRole && tokenRole !== currentRole) {
          console.log('🔍 Role mismatch detected:', { tokenRole, currentRole });
          setShowNotice(true);
          return;
        }

        console.log('✅ Token is valid');

      } catch (error) {
        console.error('Error checking token:', error);
        // Only show notice for critical errors, not every decode issue
        if (error.name === 'InvalidCharacterError') {
          console.warn('🔍 Token decode error - probably corrupted token');
          setShowNotice(true);
        }
      }
    }
  }, [isAuthenticated, user, showNotice]); // Add showNotice to deps to prevent loop

  const handleForceLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      // Force redirect even if logout fails
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  // TEMPORARILY DISABLED - causing logout loop
  // if (!showNotice) return null;
  return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#ff6b6b',
      color: 'white',
      padding: '12px',
      textAlign: 'center',
      zIndex: 9999,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <strong>⚠️ Phiên đăng nhập đã hết hạn</strong>
        <p style={{ margin: '4px 0' }}>
          Vui lòng đăng nhập lại để tiếp tục.
        </p>
        <button
          onClick={handleForceLogout}
          style={{
            backgroundColor: 'white',
            color: '#ff6b6b',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Đăng nhập lại
        </button>
      </div>
    </div>
  );
}

export default TokenExpiredNotice;
