/**
 * Auth API Service với RBAC chuẩn và Axios interceptor
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Tạo axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Axios interceptor để tự động gắn Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔒 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor để handle 401/403
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401) {
      console.warn('🔒 Token expired or invalid, clearing auth data...');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      
      // Redirect to login if not already there
      if (window.location && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

class AuthAPIService {
  /**
   * Đăng nhập
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<Object>}
   */
  async login(username, password) {
    try {
      const response = await apiClient.post('/api/auth/login', {
        username,
        password
      });
      
      console.log('✅ Login successful:', response.data.success);
      return response.data;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * Lấy thông tin user hiện tại với permissions
   * @returns {Promise<Object>}
   */
  async me() {
    try {
      const response = await apiClient.get('/api/me');
      console.log('✅ /me successful:', response.data.data?.username);
      return response.data;
    } catch (error) {
      console.error('❌ /me failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * Xác minh token
   * @param {string} token 
   * @returns {Promise<Object>}
   */
  async verify(token) {
    try {
      const response = await apiClient.post('/api/auth/verify', { token });
      return response.data;
    } catch (error) {
      console.error('❌ Token verify failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * Đăng xuất
   * @returns {Promise<Object>}
   */
  async logout() {
    try {
      const response = await apiClient.post('/api/auth/logout');
      
      // Clear tokens
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      
      console.log('✅ Logout successful');
      return response.data;
    } catch (error) {
      // Even if logout fails, clear local tokens
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      console.warn('⚠️ Logout API failed, but tokens cleared locally');
      throw error;
    }
  }

  /**
   * Đổi mật khẩu
   * @param {string} oldPassword 
   * @param {string} newPassword 
   * @param {string} confirmPassword 
   * @returns {Promise<Object>}
   */
  async changePassword(oldPassword, newPassword, confirmPassword) {
    try {
      const response = await apiClient.post('/api/auth/change-password', {
        oldPassword,
        newPassword,
        confirmPassword
      });
      
      console.log('✅ Password changed successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Change password failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * Tạo user mới (admin only)
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    try {
      const response = await apiClient.post('/api/users-rbac', userData);
      console.log('✅ User created successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Create user failed:', error.response?.data);
      throw error;
    }
  }
}

// Users API với RBAC
class UsersAPIService {
  /**
   * Lấy danh sách users (cần users:view)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>}
   */
  async getUsers(params = {}) {
    try {
      const response = await apiClient.get('/api/users-rbac', { params });
      console.log('✅ Users fetched:', response.data.data?.users?.length);
      return response.data;
    } catch (error) {
      console.error('❌ Get users failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * Lấy thông tin user cụ thể (cần users:view)
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async getUser(userId) {
    try {
      const response = await apiClient.get(`/api/users-rbac/${userId}`);
      console.log('✅ User fetched:', response.data.data?.username);
      return response.data;
    } catch (error) {
      console.error('❌ Get user failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * Cập nhật user (cần users:edit)
   * @param {string} userId 
   * @param {Object} updateData 
   * @returns {Promise<Object>}
   */
  async updateUser(userId, updateData) {
    try {
      const response = await apiClient.put(`/api/users-rbac/${userId}`, updateData);
      console.log('✅ User updated:', response.data.data?.username);
      return response.data;
    } catch (error) {
      console.error('❌ Update user failed:', error.response?.data);
      throw error;
    }
  }

  /**
   * Xóa user (cần users:delete)
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async deleteUser(userId) {
    try {
      const response = await apiClient.delete(`/api/users-rbac/${userId}`);
      console.log('✅ User deleted');
      return response.data;
    } catch (error) {
      console.error('❌ Delete user failed:', error.response?.data);
      throw error;
    }
  }
}

// Roles API Service
class RolesAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

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

  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api/roles${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        ...options
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`❌ Roles API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Lấy danh sách roles
   * @returns {Promise<Object>}
   */
  async getRoles() {
    return await this.request('');
  }

  /**
   * Lấy thông tin chi tiết role
   * @param {string} role 
   * @returns {Promise<Object>}
   */
  async getRole(role) {
    return await this.request(`/${role}`);
  }

  /**
   * Lấy mapping groups và roles
   * @returns {Promise<Object>}
   */
  async getGroupsMapping() {
    return await this.request('/groups/mapping');
  }

  /**
   * Lấy ma trận permissions
   * @returns {Promise<Object>}
   */
  async getPermissionsMatrix() {
    return await this.request('/permissions/matrix');
  }

  /**
   * Lấy danh sách groups
   * @returns {Promise<Object>}
   */
  async getGroups() {
    return await this.request('/groups/list');
  }
}

// Admin API Service
class AdminAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

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

  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api/admin${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        ...options
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`❌ Admin API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Lấy danh sách users (admin view)
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>}
   */
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    return await this.request(endpoint);
  }

  /**
   * Cập nhật role của user
   * @param {string} userId 
   * @param {string} role 
   * @param {string} groupCode 
   * @returns {Promise<Object>}
   */
  async updateUserRole(userId, role, groupCode = null) {
    return await this.request(`/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role, groupCode })
    });
  }

  /**
   * Xóa user
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async deleteUser(userId) {
    return await this.request(`/users/${userId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Lấy thống kê hệ thống
   * @returns {Promise<Object>}
   */
  async getStats() {
    return await this.request('/stats');
  }

  /**
   * Cập nhật role hàng loạt
   * @param {Array} updates - Array of {userId, role, groupCode}
   * @returns {Promise<Object>}
   */
  async bulkUpdateRoles(updates) {
    return await this.request('/users/bulk-update-roles', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });
  }
}

// Export instances
export const authAPI = new AuthAPIService();
export const usersAPI = new UsersAPIService();
export const rolesAPI = new RolesAPIService();
export const adminAPI = new AdminAPIService();
export { apiClient };

export default authAPI;


