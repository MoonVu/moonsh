/**
 * ProtectedRoute - Component để bảo vệ routes theo quyền
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './AuthComponents.css';

/**
 * Route guard cơ bản - chỉ cần đăng nhập
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check:', { isAuthenticated, isLoading, pathname: location.pathname });

  if (isLoading) {
    console.log('⏳ Đang loading auth state...');
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🚫 Chưa đăng nhập, redirect về login');
    // Lưu location để redirect về sau khi login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ Đã đăng nhập, cho phép truy cập');
  return children;
}

/**
 * Route guard theo role
 */
export function RequireRole({ roles, children, fallback = null }) {
  const { hasRole, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!hasRole(...allowedRoles)) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>🚫 Không có quyền truy cập</h2>
          <p>Bạn không có quyền truy cập trang này.</p>
          <p>Yêu cầu role: <strong>{allowedRoles.join(', ')}</strong></p>
          <button onClick={() => window.history.back()}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  return children;
}

/**
 * Route guard theo permission
 */
export function RequirePermission({ resource, action, children, fallback = null }) {
  const { hasPermission, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasPermission(resource, action)) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>🚫 Không có quyền truy cập</h2>
          <p>Bạn không có quyền thực hiện hành động này.</p>
          <p>Yêu cầu quyền: <strong>{resource}.{action}</strong></p>
          <button onClick={() => window.history.back()}>
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  return children;
}

/**
 * Route guard cho admin
 */
export function RequireAdmin({ children, fallback = null }) {
  return (
    <RequireRole roles={['admin']} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

/**
 * Component wrapper để hiển thị có điều kiện
 */
export function ConditionalRender({ 
  roles, 
  resource, 
  action, 
  children, 
  fallback = null,
  requireAll = false 
}) {
  const { hasRole, hasPermission, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Hoặc loading placeholder nhỏ
  }

  if (!isAuthenticated) {
    return fallback;
  }

  let hasAccess = true;

  // Kiểm tra roles
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const roleCheck = hasRole(...allowedRoles);
    hasAccess = hasAccess && roleCheck;
  }

  // Kiểm tra permissions
  if (resource && action) {
    const permissionCheck = hasPermission(resource, action);
    if (requireAll) {
      hasAccess = hasAccess && permissionCheck;
    } else {
      hasAccess = hasAccess || permissionCheck;
    }
  }

  return hasAccess ? children : fallback;
}

/**
 * HOC để wrap component với auth guards
 */
export function withAuthGuard(Component, guards = {}) {
  return function GuardedComponent(props) {
    const { roles, permissions, adminOnly, fallback } = guards;

    let GuardComponent = React.Fragment;

    if (adminOnly) {
      GuardComponent = RequireAdmin;
    } else if (roles) {
      GuardComponent = (props) => <RequireRole roles={roles} {...props} />;
    } else if (permissions) {
      GuardComponent = (props) => (
        <RequirePermission 
          resource={permissions.resource} 
          action={permissions.action} 
          {...props} 
        />
      );
    } else {
      GuardComponent = ProtectedRoute;
    }

    return (
      <GuardComponent fallback={fallback}>
        <Component {...props} />
      </GuardComponent>
    );
  };
}

export default ProtectedRoute;
