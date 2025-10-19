/**
 * Auth API Service - Xử lý các API calls liên quan đến authentication
 */

const API_BASE_URL = process.env.REACT_APP_API_URL;

class AuthAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method để tạo headers
  getHeaders(includeAuth = false) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Helper method để xử lý response
  async handleResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Request wrapper
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api/auth${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(options.includeAuth),
        ...options
      });
      
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`❌ Auth API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Đăng nhập
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<Object>}
   */
  async login(username, password) {
    return await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  /**
   * Xác minh token
   * @param {string} token 
   * @returns {Promise<Object>}
   */
  async verify(token) {
    return await this.request('/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  /**
   * Lấy thông tin user hiện tại
   * @returns {Promise<Object>}
   */
  async me() {
    return await this.request('/me', {
      method: 'GET',
      includeAuth: true
    });
  }

  /**
   * Đổi mật khẩu
   * @param {string} oldPassword 
   * @param {string} newPassword 
   * @param {string} confirmPassword 
   * @returns {Promise<Object>}
   */
  async changePassword(oldPassword, newPassword, confirmPassword) {
    return await this.request('/change-password', {
      method: 'POST',
      includeAuth: true,
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword })
    });
  }

  /**
   * Tạo user mới (admin only)
   * @param {Object} userData 
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    return await this.request('/create-user', {
      method: 'POST',
      includeAuth: true,
      body: JSON.stringify(userData)
    });
  }

  /**
   * Đăng xuất
   * @returns {Promise<Object>}
   */
  async logout() {
    return await this.request('/logout', {
      method: 'POST',
      includeAuth: true
    });
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
export const rolesAPI = new RolesAPIService();
export const adminAPI = new AdminAPIService();

export default authAPI;
