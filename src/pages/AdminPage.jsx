/**
 * Admin Page - Trang quản lý quyền với matrix UI gọn nhẹ
 */

import React, { useState, useEffect } from 'react';
import { useAdminUsers, useRoles, usePermissionsMatrix } from '../hooks/useAuth';
import { ALL_ROLES, ALL_GROUPS, getGroupLabel, getRoleLabel } from '../constants/groups';
import './AdminPage.css';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    groupCode: '',
    status: ''
  });

  const { 
    users, 
    loading: usersLoading, 
    fetchUsers, 
    updateUserRole, 
    bulkUpdateRoles 
  } = useAdminUsers();

  const { 
    roles, 
    loading: rolesLoading 
  } = useRoles();

  const { 
    matrix, 
    summary, 
    loading: matrixLoading 
  } = usePermissionsMatrix();

  useEffect(() => {
    fetchUsers(filters);
  }, [fetchUsers, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkRoleUpdate = async (role) => {
    if (selectedUsers.length === 0) {
      alert('Vui lòng chọn ít nhất một user');
      return;
    }

    try {
      const updates = selectedUsers.map(userId => ({ userId, role }));
      await bulkUpdateRoles(updates);
      setSelectedUsers([]);
      alert(`Đã cập nhật role ${getRoleLabel(role)} cho ${selectedUsers.length} users`);
    } catch (error) {
      alert('Lỗi cập nhật: ' + error.message);
    }
  };

  const handleSingleRoleUpdate = async (userId, role, groupCode) => {
    try {
      await updateUserRole(userId, role, groupCode);
      alert('Cập nhật thành công');
    } catch (error) {
      alert('Lỗi cập nhật: ' + error.message);
    }
  };

  if (usersLoading && users.length === 0) {
    return <div className="admin-loading">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>🛡️ Quản lý Quyền</h2>
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button 
            className={`tab ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            🔐 Permissions
          </button>
        </div>
      </div>

      {activeTab === 'users' && (
        <UsersManagement 
          users={users}
          loading={usersLoading}
          filters={filters}
          selectedUsers={selectedUsers}
          onFilterChange={handleFilterChange}
          onUserSelect={handleUserSelect}
          onBulkRoleUpdate={handleBulkRoleUpdate}
          onSingleRoleUpdate={handleSingleRoleUpdate}
        />
      )}

      {activeTab === 'permissions' && (
        <PermissionsMatrix 
          matrix={matrix}
          summary={summary}
          loading={matrixLoading}
        />
      )}
    </div>
  );
};

// Component quản lý users
const UsersManagement = ({ 
  users, 
  loading, 
  filters, 
  selectedUsers, 
  onFilterChange, 
  onUserSelect, 
  onBulkRoleUpdate,
  onSingleRoleUpdate 
}) => {
  return (
    <div className="users-management">
      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          placeholder="🔍 Tìm kiếm user..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="filter-input"
        />
        
        <select
          value={filters.role}
          onChange={(e) => onFilterChange('role', e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả roles</option>
          {ALL_ROLES.map(role => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <select
          value={filters.groupCode}
          onChange={(e) => onFilterChange('groupCode', e.target.value)}
          className="filter-select"
        >
          <option value="">Tất cả groups</option>
          {ALL_GROUPS.map(group => (
            <option key={group.code} value={group.code}>
              {group.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selectedUsers.length > 0 && (
        <div className="bulk-actions">
          <span>Đã chọn {selectedUsers.length} users:</span>
          {ALL_ROLES.map(role => (
            <button
              key={role.value}
              onClick={() => onBulkRoleUpdate(role.value)}
              className={`bulk-btn role-${role.value}`}
            >
              → {role.label}
            </button>
          ))}
        </div>
      )}

      {/* Users table */}
      <div className="users-table">
        <div className="table-header">
          <div className="col-check">
            <input
              type="checkbox"
              checked={selectedUsers.length === users.length && users.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  const allIds = users.map(u => u._id);
                  selectedUsers.length === 0 && onUserSelect(allIds[0]);
                } else {
                  selectedUsers.forEach(id => onUserSelect(id));
                }
              }}
            />
          </div>
          <div className="col-username">Username</div>
          <div className="col-group">Group</div>
          <div className="col-role">Role</div>
          <div className="col-actions">Actions</div>
        </div>

        <div className="table-body">
          {users.map(user => (
            <UserRow 
              key={user._id}
              user={user}
              isSelected={selectedUsers.includes(user._id)}
              onSelect={() => onUserSelect(user._id)}
              onRoleUpdate={onSingleRoleUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Component row user
const UserRow = ({ user, isSelected, onSelect, onRoleUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState(user.role);
  const [editGroupCode, setEditGroupCode] = useState(user.groupCode);

  const handleSave = () => {
    onRoleUpdate(user._id, editRole, editGroupCode);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditRole(user.role);
    setEditGroupCode(user.groupCode);
    setIsEditing(false);
  };

  return (
    <div className={`table-row ${isSelected ? 'selected' : ''}`}>
      <div className="col-check">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
        />
      </div>
      
      <div className="col-username">
        <span className="username">{user.username}</span>
        <span className={`status ${user.status}`}>{user.status}</span>
      </div>
      
      <div className="col-group">
        {isEditing ? (
          <select
            value={editGroupCode}
            onChange={(e) => setEditGroupCode(e.target.value)}
            className="edit-select"
          >
            {ALL_GROUPS.map(group => (
              <option key={group.code} value={group.code}>
                {group.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={`group-badge ${user.groupCode}`}>
            {getGroupLabel(user.groupCode)}
          </span>
        )}
      </div>
      
      <div className="col-role">
        {isEditing ? (
          <select
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            className="edit-select"
          >
            {ALL_ROLES.map(role => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={`role-badge ${user.role}`}>
            {getRoleLabel(user.role)}
          </span>
        )}
      </div>
      
      <div className="col-actions">
        {isEditing ? (
          <div className="edit-actions">
            <button onClick={handleSave} className="btn-save">✓</button>
            <button onClick={handleCancel} className="btn-cancel">✕</button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn-edit"
          >
            ✏️
          </button>
        )}
      </div>
    </div>
  );
};

// Component matrix permissions
const PermissionsMatrix = ({ matrix, summary, loading }) => {
  if (loading) {
    return <div className="matrix-loading">Đang tải permissions matrix...</div>;
  }

  if (!summary || Object.keys(summary).length === 0) {
    return <div className="matrix-empty">Không có dữ liệu permissions</div>;
  }

  const resources = ['schedules', 'users', 'tasks', 'seats', 'notifications', 'reports'];
  const actions = ['view', 'edit', 'delete'];
  const roles = Object.keys(summary);

  return (
    <div className="permissions-matrix">
      <div className="matrix-header">
        <h3>Ma trận Quyền</h3>
        <p>Xem quyền của từng role trên các resources</p>
      </div>

      <div className="matrix-table">
        <table>
          <thead>
            <tr>
              <th className="resource-header">Resource</th>
              {roles.map(role => (
                <th key={role} className={`role-header role-${role}`}>
                  {getRoleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map(resource => (
              <React.Fragment key={resource}>
                {actions.map((action, actionIndex) => (
                  <tr key={`${resource}-${action}`} className="matrix-row">
                    <td className="resource-cell">
                      {actionIndex === 0 && (
                        <span className="resource-name">{resource}</span>
                      )}
                      <span className="action-name">{action}</span>
                    </td>
                    {roles.map(role => {
                      const hasPermission = summary[role]?.[resource]?.[action] || false;
                      return (
                        <td key={`${role}-${resource}-${action}`} className="permission-cell">
                          <div className={`permission-box ${hasPermission ? 'granted' : 'denied'}`}>
                            {hasPermission ? '✓' : '✕'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="matrix-legend">
        <div className="legend-item">
          <div className="permission-box granted">✓</div>
          <span>Có quyền</span>
        </div>
        <div className="legend-item">
          <div className="permission-box denied">✕</div>
          <span>Không có quyền</span>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
