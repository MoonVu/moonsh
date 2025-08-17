/**
 * Access Control Components - Components để kiểm soát quyền truy cập UI elements
 */

import React from 'react';
import { useAuth, useRole, usePermission, useAccess } from '../../hooks/useAuth';
import './AuthComponents.css';

/**
 * Component hiển thị có điều kiện theo role
 */
export function ShowForRole({ roles, children, fallback = null, hideLoading = false }) {
  const { hasRole, isLoading } = useRole(...(Array.isArray(roles) ? roles : [roles]));

  if (isLoading && !hideLoading) {
    return <span className="role-checking">...</span>;
  }

  return hasRole ? children : fallback;
}

/**
 * Component hiển thị có điều kiện theo permission
 */
export function ShowForPermission({ resource, action, children, fallback = null, hideLoading = false }) {
  const { hasPermission, isLoading } = usePermission(resource, action);

  if (isLoading && !hideLoading) {
    return <span className="permission-checking">...</span>;
  }

  return hasPermission ? children : fallback;
}

/**
 * Component hiển thị cho admin
 */
export function ShowForAdmin({ children, fallback = null, hideLoading = false }) {
  return (
    <ShowForRole roles="ADMIN" fallback={fallback} hideLoading={hideLoading}>
      {children}
    </ShowForRole>
  );
}

/**
 * Component ẩn theo role
 */
export function HideForRole({ roles, children }) {
  const { hasRole } = useAuth();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return hasRole(...allowedRoles) ? null : children;
}

/**
 * Component ẩn theo permission  
 */
export function HideForPermission({ resource, action, children }) {
  const { hasPermission } = useAuth();
  
  return hasPermission(resource, action) ? null : children;
}

/**
 * Button với kiểm tra quyền
 */
export function SecureButton({ 
  roles, 
  resource, 
  action, 
  children, 
  onClick, 
  disabled = false,
  disabledText = "Không có quyền",
  className = "",
  ...props 
}) {
  const { hasRole, hasPermission, isAuthenticated } = useAuth();
  
  let hasAccess = isAuthenticated;
  
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    hasAccess = hasAccess && hasRole(...allowedRoles);
  }
  
  if (resource && action) {
    hasAccess = hasAccess && hasPermission(resource, action);
  }
  
  if (!hasAccess) {
    return (
      <button 
        className={`btn btn-disabled ${className}`}
        disabled 
        title={disabledText}
        {...props}
      >
        {children}
      </button>
    );
  }
  
  return (
    <button 
      className={`btn ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Link với kiểm tra quyền
 */
export function SecureLink({ 
  roles, 
  resource, 
  action, 
  children, 
  to, 
  className = "",
  disabledText = "Không có quyền",
  ...props 
}) {
  const { hasRole, hasPermission, isAuthenticated } = useAuth();
  
  let hasAccess = isAuthenticated;
  
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    hasAccess = hasAccess && hasRole(...allowedRoles);
  }
  
  if (resource && action) {
    hasAccess = hasAccess && hasPermission(resource, action);
  }
  
  if (!hasAccess) {
    return (
      <span 
        className={`link-disabled ${className}`}
        title={disabledText}
        {...props}
      >
        {children}
      </span>
    );
  }
  
  return (
    <a 
      href={to}
      className={`link ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * Menu item với kiểm tra quyền
 */
export function SecureMenuItem({ 
  roles, 
  resource, 
  action, 
  children, 
  onClick, 
  icon,
  className = ""
}) {
  const { hasRole, hasPermission, isAuthenticated } = useAuth();
  
  let hasAccess = isAuthenticated;
  
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    hasAccess = hasAccess && hasRole(...allowedRoles);
  }
  
  if (resource && action) {
    hasAccess = hasAccess && hasPermission(resource, action);
  }
  
  if (!hasAccess) {
    return null; // Ẩn menu item hoàn toàn
  }
  
  return (
    <div className={`menu-item ${className}`} onClick={onClick}>
      {icon && <span className="menu-icon">{icon}</span>}
      <span className="menu-text">{children}</span>
    </div>
  );
}

/**
 * Tab với kiểm tra quyền
 */
export function SecureTab({ 
  roles, 
  resource, 
  action, 
  children, 
  isActive = false,
  onClick,
  className = ""
}) {
  const { hasRole, hasPermission, isAuthenticated } = useAuth();
  
  let hasAccess = isAuthenticated;
  
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    hasAccess = hasAccess && hasRole(...allowedRoles);
  }
  
  if (resource && action) {
    hasAccess = hasAccess && hasPermission(resource, action);
  }
  
  if (!hasAccess) {
    return null; // Ẩn tab hoàn toàn
  }
  
  return (
    <div 
      className={`tab ${isActive ? 'active' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * Component để hiển thị thông tin user role hiện tại
 */
export function RoleBadge({ className = "" }) {
  const { role, user } = useAuth();
  
  if (!role || !user) return null;
  
  const roleDisplayNames = {
    admin: 'Quản trị viên',
    XNK: 'Xuất nhập khẩu', 
    CSKH: 'CSKH',
    FK: 'Duyệt đơn'
  };
  
  const roleColors = {
    ADMIN: 'role-admin',
    XNK: 'role-xnk',
    CSKH: 'role-cskh', 
    FK: 'role-fk'
  };
  
  return (
    <span className={`role-badge ${roleColors[role] || 'role-default'} ${className}`}>
      {roleDisplayNames[role] || role}
    </span>
  );
}

/**
 * Component để hiển thị group badge
 */
export function GroupBadge({ groupCode, className = "" }) {
  if (!groupCode) return null;
  
  const groupDisplayNames = {
    'TT': 'Tổ Trưởng',
    'PCQ': 'Phó Chủ quản',
    'CQ': 'Chủ quản',
    'XNK': 'Xuất nhập khoản',
    'CSKH': 'CSKH',
    'CSOL': 'CSKH Online',
    'CSDL': 'CS Đại lý',
    'Truyền thông': 'Truyền thông',
    'FK': 'FK',
    'FK-X': 'FK-X'
  };
  
  return (
    <span className={`group-badge ${className}`}>
      {groupDisplayNames[groupCode] || groupCode}
    </span>
  );
}

/**
 * Component wrapper chung cho conditional access
 */
export function AccessGuard({ 
  roles, 
  resource, 
  action, 
  adminOnly = false,
  children, 
  fallback = null,
  requireAuth = true,
  mode = 'any' // 'any' hoặc 'all'
}) {
  const { hasRole, hasPermission, isAuthenticated, isAdmin } = useAuth();
  
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }
  
  if (adminOnly) {
    return isAdmin() ? children : fallback;
  }
  
  let hasRoleAccess = true;
  let hasPermissionAccess = true;
  
  if (roles) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    hasRoleAccess = hasRole(...allowedRoles);
  }
  
  if (resource && action) {
    hasPermissionAccess = hasPermission(resource, action);
  }
  
  let hasAccess;
  if (mode === 'all') {
    hasAccess = hasRoleAccess && hasPermissionAccess;
  } else {
    hasAccess = hasRoleAccess || hasPermissionAccess;
  }
  
  return hasAccess ? children : fallback;
}

export default {
  ShowForRole,
  ShowForPermission,
  ShowForAdmin,
  HideForRole,
  HideForPermission,
  SecureButton,
  SecureLink,
  SecureMenuItem,
  SecureTab,
  RoleBadge,
  GroupBadge,
  AccessGuard
};
