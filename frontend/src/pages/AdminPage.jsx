import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI, adminAPI } from '../services/authAPI';
import { permissionsAPI } from '../services/permissionsAPI';
import './AdminPage.css';

// Resource definitions matching backend
const RESOURCES = {
  ADMIN_ACCESS: { key: 'administrator_access', label: 'Administrator Access' },
  USER_MANAGEMENT: { key: 'user_management', label: 'User Management' },
  CONTENT_MANAGEMENT: { key: 'content_management', label: 'Content Management' },
  FINANCIAL_MANAGEMENT: { key: 'financial_management', label: 'Financial Management' },
  REPORTING: { key: 'reporting', label: 'Reporting' },
  PAYROLL: { key: 'payroll', label: 'Payroll' },
  DISPUTES_MANAGEMENT: { key: 'disputes_management', label: 'Disputes Management' },
  API_CONTROLS: { key: 'api_controls', label: 'API Controls' },
  DATABASE_MANAGEMENT: { key: 'database_management', label: 'Database Management' },
  REPOSITORY_MANAGEMENT: { key: 'repository_management', label: 'Repository Management' },
  SCHEDULES: { key: 'schedules', label: 'Schedules' },
  USERS: { key: 'users', label: 'Users' },
  TASKS: { key: 'tasks', label: 'Tasks' },
  SEATS: { key: 'seats', label: 'Seats' },
  NOTIFICATIONS: { key: 'notifications', label: 'Notifications' },
  REPORTS: { key: 'reports', label: 'Reports' },
  SYSTEM: { key: 'system', label: 'System' }
};

const PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit', 
  DELETE: 'delete'
};

const ROLES = {
  ADMIN: 'ADMIN',
  XNK: 'XNK',
  CSKH: 'CSKH', 
  FK: 'FK'
};

// Resource display names (Vietnamese)
const RESOURCE_DISPLAY_NAMES = {
  [RESOURCES.ADMIN_ACCESS.key]: 'Quyền quản trị',
  [RESOURCES.USER_MANAGEMENT.key]: 'Quản lý người dùng',
  [RESOURCES.CONTENT_MANAGEMENT.key]: 'Quản lý nội dung',
  [RESOURCES.FINANCIAL_MANAGEMENT.key]: 'Quản lý tài chính',
  [RESOURCES.REPORTING.key]: 'Báo cáo',
  [RESOURCES.PAYROLL.key]: 'Bảng lương',
  [RESOURCES.DISPUTES_MANAGEMENT.key]: 'Xử lý khiếu nại',
  [RESOURCES.API_CONTROLS.key]: 'Điều khiển API',
  [RESOURCES.DATABASE_MANAGEMENT.key]: 'Quản lý cơ sở dữ liệu',
  [RESOURCES.REPOSITORY_MANAGEMENT.key]: 'Quản lý kho dữ liệu',
  [RESOURCES.SCHEDULES.key]: 'Lịch trình',
  [RESOURCES.USERS.key]: 'Người dùng',
  [RESOURCES.TASKS.key]: 'Nhiệm vụ',
  [RESOURCES.SEATS.key]: 'Chỗ ngồi',
  [RESOURCES.NOTIFICATIONS.key]: 'Thông báo',
  [RESOURCES.REPORTS.key]: 'Báo cáo chi tiết',
  [RESOURCES.SYSTEM.key]: 'Hệ thống'
};

// Permission display names (Vietnamese) 
const PERMISSION_DISPLAY_NAMES = {
  [PERMISSIONS.VIEW]: 'Xem',
  [PERMISSIONS.EDIT]: 'Chỉnh sửa', 
  [PERMISSIONS.DELETE]: 'Xóa'
};

// Role display names (Vietnamese)
const ROLE_DISPLAY_NAMES = {
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.XNK]: 'XNK',
  [ROLES.CSKH]: 'CSKH',
  [ROLES.FK]: 'Duyệt đơn'
};

export default function AdminPage() {
  const { isAdmin, hasPermission } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Initialize permissions for selected role
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
  }, [selectedRole]);

  const loadRolePermissions = async (role) => {
    try {
      setLoading(true);
      console.log('🔍 Loading permissions for role:', role);
      
      const response = await permissionsAPI.getRolePermissions(role);
      console.log('✅ Loaded permissions from backend:', response.data);
      setPermissions(response.data || {});
    } catch (error) {
      console.error('Error loading permissions:', error);
      setMessage('Lỗi khi tải quyền');
    } finally {
      setLoading(false);
    }
  };



  const handlePermissionChange = (resourceKey, permission, checked) => {
    setPermissions(prev => ({
      ...prev,
      [resourceKey]: {
        ...prev[resourceKey],
        [permission]: checked
      }
    }));
  };

  const handleSelectAll = (checked) => {
    const newPermissions = {};
    Object.values(RESOURCES).forEach(resource => {
      newPermissions[resource.key] = {
        [PERMISSIONS.VIEW]: checked,
        [PERMISSIONS.EDIT]: checked,
        [PERMISSIONS.DELETE]: checked
      };
    });
    setPermissions(newPermissions);
  };

  const handleSubmit = async () => {
    if (!selectedRole) {
      setMessage('Vui lòng chọn role trước');
      return;
    }

    try {
      setLoading(true);
      console.log('💾 Saving permissions for role:', selectedRole, permissions);
      
      const response = await permissionsAPI.updateRolePermissions(selectedRole, permissions);
      
      if (response.success) {
        setMessage(`✅ ${response.message}`);
        console.log('✅ Permissions saved successfully:', response.data);
      } else {
        throw new Error(response.message || 'Lỗi không xác định');
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating permissions:', error);
      setMessage(`❌ Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
    setMessage('');
  };

  if (!isAdmin()) {
    return (
      <div className="admin-page-error">
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-container">
        <h1 className="admin-page-title">Cập nhật nhóm quyền</h1>
        
        {message && (
          <div className={`admin-message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="role-selection">
          <label htmlFor="role-select" className="role-label">
            Bộ phận <span className="required">*</span>
          </label>
          <select
            id="role-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="role-select"
          >
            <option value="">Chọn role...</option>
            <option value={ROLES.ADMIN}>{ROLE_DISPLAY_NAMES[ROLES.ADMIN]}</option>
            <option value={ROLES.XNK}>{ROLE_DISPLAY_NAMES[ROLES.XNK]}</option>
            <option value={ROLES.CSKH}>{ROLE_DISPLAY_NAMES[ROLES.CSKH]}</option>
            <option value={ROLES.FK}>{ROLE_DISPLAY_NAMES[ROLES.FK]}</option>
          </select>
        </div>

        {selectedRole && (
          <div className="permissions-section">
            <h2 className="permissions-title">Chức năng</h2>
            
            <div className="permissions-header">
              <div className="resource-column">
                <div className="select-all-container">
                  <label className="permission-label">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="permission-checkbox"
                    />
                    Quyền quản trị
                  </label>
                  <button 
                    type="button"
                    className="select-all-btn"
                    onClick={() => handleSelectAll(true)}
                  >
                    Chọn tất cả
                  </button>
                </div>
              </div>
              <div className="actions-header">
                <span className="action-header">Xem</span>
                <span className="action-header">Chỉnh sửa</span>
                <span className="action-header">Xóa</span>
              </div>
            </div>

            <div className="permissions-matrix">
              {/* Admin & System Resources */}
              <div className="permission-category">
                <h3 className="category-title">Quản trị & Hệ thống</h3>
                {[RESOURCES.ADMIN_ACCESS, RESOURCES.API_CONTROLS, RESOURCES.DATABASE_MANAGEMENT, RESOURCES.REPOSITORY_MANAGEMENT, RESOURCES.SYSTEM].map(resource => (
                  <div key={resource.key} className="permission-row">
                    <div className="resource-name">
                      {RESOURCE_DISPLAY_NAMES[resource.key]}
                    </div>
                    <div className="permission-actions">
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.VIEW] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.VIEW, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xem</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.EDIT] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.EDIT, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Chỉnh sửa</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.DELETE] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.DELETE, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xóa</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* User & Content Management */}
              <div className="permission-category">
                <h3 className="category-title">Quản lý người dùng & Nội dung</h3>
                {[RESOURCES.USER_MANAGEMENT, RESOURCES.USERS, RESOURCES.CONTENT_MANAGEMENT, RESOURCES.DISPUTES_MANAGEMENT].map(resource => (
                  <div key={resource.key} className="permission-row">
                    <div className="resource-name">
                      {RESOURCE_DISPLAY_NAMES[resource.key]}
                    </div>
                    <div className="permission-actions">
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.VIEW] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.VIEW, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xem</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.EDIT] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.EDIT, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Chỉnh sửa</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.DELETE] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.DELETE, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xóa</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Operations */}
              <div className="permission-category">
                <h3 className="category-title">Vận hành</h3>
                {[RESOURCES.SCHEDULES, RESOURCES.TASKS, RESOURCES.SEATS, RESOURCES.NOTIFICATIONS].map(resource => (
                  <div key={resource.key} className="permission-row">
                    <div className="resource-name">
                      {RESOURCE_DISPLAY_NAMES[resource.key]}
                    </div>
                    <div className="permission-actions">
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.VIEW] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.VIEW, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xem</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.EDIT] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.EDIT, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Chỉnh sửa</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.DELETE] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.DELETE, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xóa</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Finance & Reporting */}
              <div className="permission-category">
                <h3 className="category-title">Tài chính & Báo cáo</h3>
                {[RESOURCES.FINANCIAL_MANAGEMENT, RESOURCES.PAYROLL, RESOURCES.REPORTING, RESOURCES.REPORTS].map(resource => (
                  <div key={resource.key} className="permission-row">
                    <div className="resource-name">
                      {RESOURCE_DISPLAY_NAMES[resource.key]}
                    </div>
                    <div className="permission-actions">
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.VIEW] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.VIEW, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xem</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.EDIT] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.EDIT, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Chỉnh sửa</span>
                      </label>
                      <label className="permission-checkbox-container">
                        <input
                          type="checkbox"
                          checked={permissions[resource.key]?.[PERMISSIONS.DELETE] || false}
                          onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.DELETE, e.target.checked)}
                          className="permission-checkbox"
                        />
                        <span className="permission-label-text">Xóa</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleDiscard}
                className="btn-discard"
                disabled={loading}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-submit"
                disabled={loading || !selectedRole}
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}