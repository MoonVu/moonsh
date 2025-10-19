/**
 * Permissions API Service - Xử lý API calls cho permissions
 */

import { API_BASE_URL } from '../config/api';

console.log("🔧 permissionsAPI.js using API_BASE_URL:", API_BASE_URL);

class PermissionsAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method để tạo headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Helper method để xử lý response
  async handleResponse(response) {
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      console.warn('🔒 Token expired or invalid, redirecting to login...');
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      // Redirect to login or trigger logout
      if (window.location && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Request wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api/permissions${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        ...options
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`❌ Permissions API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả roles và resources
   * @returns {Promise<Object>}
   */
  async getRoles() {
    return await this.request('/roles');
  }

  /**
   * Lấy permissions của một role cụ thể
   * @param {string} role - Tên role (ADMIN, XNK, CSKH, FK)
   * @returns {Promise<Object>}
   */
  async getRolePermissions(role) {
    return await this.request(`/roles/${role}/permissions`);
  }

  /**
   * Cập nhật permissions cho một role
   * @param {string} role - Tên role
   * @param {Object} permissions - Object permissions dạng {resource: {view: true, edit: false, delete: false}}
   * @returns {Promise<Object>}
   */
  async updateRolePermissions(role, permissions) {
    return await this.request(`/roles/${role}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions })
    });
  }

  /**
   * Lấy permissions từ user object (từ role.permissions)
   * @param {Object} user - User object với role đã populate
   * @returns {Array<string>} - Array permissions dạng "resource.action"
   */
  extractUserPermissions(user) {
    if (!user || !user.role || !user.role.permissions) {
      return [];
    }

    const permissions = [];
    user.role.permissions.forEach(perm => {
      perm.actions.forEach(action => {
        permissions.push(`${perm.resource}.${action}`);
      });
    });

    return permissions;
  }

  /**
   * Kiểm tra user có permission cụ thể không
   * @param {Object} user - User object với role đã populate
   * @param {string} resource - Resource name
   * @param {string} action - Action name (view, edit, delete)
   * @returns {boolean}
   */
  userHasPermission(user, resource, action) {
    // Admin có tất cả permissions
    if (user?.role?.name === 'ADMIN') {
      return true;
    }

    const permissions = this.extractUserPermissions(user);
    return permissions.includes(`${resource}.${action}`);
  }

  /**
   * Kiểm tra user có role cụ thể không
   * @param {Object} user - User object
   * @param {...string} roles - Danh sách roles cần kiểm tra
   * @returns {boolean}
   */
  userHasRole(user, ...roles) {
    // Admin có tất cả roles
    if (user?.role?.name === 'ADMIN') {
      return true;
    }

    return user?.role?.name && roles.includes(user.role.name);
  }

  /**
   * Convert permissions từ backend format sang frontend format
   * @param {Array} backendPermissions - Array từ role.permissions
   * @returns {Array<string>} - Array permissions dạng "resource.action"
   */
  convertBackendPermissions(backendPermissions) {
    if (!Array.isArray(backendPermissions)) {
      return [];
    }

    const permissions = [];
    backendPermissions.forEach(perm => {
      if (perm.resource && Array.isArray(perm.actions)) {
        perm.actions.forEach(action => {
          permissions.push(`${perm.resource}.${action}`);
        });
      }
    });

    return permissions;
  }

  /**
   * Tạo ma trận permissions để hiển thị trong admin panel
   * @param {Array} roles - Danh sách roles
   * @param {Array} resources - Danh sách resources
   * @returns {Object} - Ma trận permissions
   */
  createPermissionsMatrix(roles, resources) {
    const matrix = {};
    
    roles.forEach(role => {
      matrix[role.key] = {};
      resources.forEach(resource => {
        matrix[role.key][resource.key] = {
          view: false,
          edit: false,
          delete: false
        };
      });
    });

    return matrix;
  }
}

// Export instance
export const permissionsAPI = new PermissionsAPIService();

export default permissionsAPI;
