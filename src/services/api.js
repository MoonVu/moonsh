// Cấu hình API URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://172.16.1.6:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }

  // Helper method để tạo headers với token
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  // Helper method để xử lý response
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async request(endpoint, options = {}) {
    // Đảm bảo endpoint luôn có /api phía trước
    let url = endpoint.startsWith('/api/') ? `${this.baseURL}${endpoint}` : `${this.baseURL}/api${endpoint}`;
    const config = {
      headers: {
        ...this.getHeaders(),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      return this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  // Authentication
  async login(username, password) {
    const response = await fetch(`${this.baseURL}/api/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, password })
    });
    const data = await this.handleResponse(response);
    const token = data.data?.token || data.token;
    if (token) {
      this.setToken(token);
    }
    return data.data || data;
  }

  async logout() {
    try {
      // Gọi API logout từ backend
      await fetch(`${this.baseURL}/api/logout`, { 
        method: "POST", 
        headers: this.getHeaders(),
        credentials: "include" 
      });
    } catch (error) {
      console.log("Logout API call failed (this is normal):", error.message);
    }
    // Luôn xóa token ở client
    this.setToken(null);
  }

  async getProfile() {
    const response = await fetch(`${this.baseURL}/api/user/profile`, {
      headers: this.getHeaders()
    });
    const data = await this.handleResponse(response);
    return data.data || data;
  }

  // Tasks
  async getTasks() {
    return await this.request('/tasks');
  }

  async createTask(taskData) {
    return await this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async updateTask(id, taskData) {
    return await this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  }

  async deleteTask(id) {
    return await this.request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  // Notifications
  async getNotifications() {
    return await this.request('/notifications');
  }

  async markNotificationAsRead(id) {
    return await this.request(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  // System
  async healthCheck() {
    const response = await fetch(`${this.baseURL}/api/health`);
    return this.handleResponse(response);
  }

  async initDemo() {
    const response = await fetch(`${this.baseURL}/api/init-demo`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // Users (Tài khoản)
  async getUsers() {
    const data = await this.request('/users');
    return data.data || data;
  }

  async createUser(userData) {
    return await this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id, userData) {
    return await this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(id) {
    return await this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  }

  async changePassword({ oldPassword, newPassword }) {
    return await this.request('/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  async adminChangePassword({ userId, newPassword }) {
    return await this.request(`/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });
  }

  // Seats (Chỗ ngồi)
  async getSeats() {
    return await this.request('/seats');
  }

  async createSeat(seatData) {
    return await this.request('/seats', {
      method: 'POST',
      body: JSON.stringify(seatData)
    });
  }

  async updateSeat(id, seatData) {
    return await this.request(`/seats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(seatData)
    });
  }

  async deleteSeat(id) {
    return await this.request(`/seats/${id}`, {
      method: 'DELETE'
    });
  }

  // ==================== SCHEDULE API METHODS ====================

  // Lấy tất cả schedule
  async getSchedules() {
    return await this.request('/schedules');
  }

  // Lấy schedule đã join thông tin user
  async fetchSchedulesFull() {
    return await this.request('/schedules/full');
  }

  // Demo Lịch Đi Ca API
  async getDailyStatus(month, year, userId = null) {
    const params = new URLSearchParams({ month, year });
    if (userId) params.append('userId', userId);
    return await this.request(`/demo-lichdica?${params}`);
  }

  async updateDailyStatus(userId, month, year, dailyStatus) {
    return await this.request('/demo-lichdica', {
      method: 'POST',
      body: JSON.stringify({ userId, month, year, dailyStatus })
    });
  }

  async updateSingleDayStatus(userId, day, month, year, status) {
    return await this.request(`/demo-lichdica/${userId}/${day}`, {
      method: 'PUT',
      body: JSON.stringify({ month, year, status })
    });
  }

  // Lấy schedule theo group
  async getScheduleByGroup(group) {
    return await this.request(`/schedules/${group}`);
  }

  // Tạo hoặc cập nhật schedule cho group
  async updateSchedule(group, data) {
    return await this.request(`/schedules/${group}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Cập nhật shifts cho group
  async updateShifts(group, shifts) {
    return await this.request(`/schedules/${group}/shifts`, {
      method: 'PUT',
      body: JSON.stringify({ shifts })
    });
  }

  // Cập nhật waiting list cho group
  async updateWaiting(group, waiting) {
    return await this.request(`/schedules/${group}/waiting`, {
      method: 'PUT',
      body: JSON.stringify({ waiting })
    });
  }

  // Xóa schedule
  async deleteSchedule(group) {
    return await this.request(`/schedules/${group}`, {
      method: 'DELETE'
    });
  }

  // ==================== SCHEDULES THEO THÁNG ====================

  // Lấy tất cả schedules theo tháng/năm
  async getSchedulesByMonth(month, year) {
    return await this.request(`/schedules-monthly/monthly/${month}/${year}`);
  }

  // Lấy schedule theo group và tháng/năm
  async getScheduleByGroupAndMonth(group, month, year) {
    return await this.request(`/schedules-monthly/group/${group}/${month}/${year}`);
  }

  // Tạo hoặc cập nhật schedule theo tháng/năm
  async saveScheduleByMonth(group, month, year, shifts, waiting) {
    return await this.request('/schedules-monthly/monthly', {
      method: 'POST',
      body: JSON.stringify({ group, month, year, shifts, waiting })
    });
  }

  // Cập nhật shifts theo tháng/năm
  async updateShiftsByMonth(group, month, year, shifts) {
    return await this.request(`/schedules-monthly/shifts/${group}/${month}/${year}`, {
      method: 'PUT',
      body: JSON.stringify({ shifts })
    });
  }

  // Cập nhật waiting theo tháng/năm
  async updateWaitingByMonth(group, month, year, waiting) {
    return await this.request(`/schedules-monthly/waiting/${group}/${month}/${year}`, {
      method: 'PUT',
      body: JSON.stringify({ waiting })
    });
  }

  // Xóa schedule theo tháng/năm
  async deleteScheduleByMonth(group, month, year) {
    return await this.request(`/schedules-monthly/${group}/${month}/${year}`, {
      method: 'DELETE'
    });
  }

  // Lấy thông tin user theo userId
  async getUserById(userId) {
    return await this.request(`/users/${userId}`);
  }

  // Lấy danh sách tất cả users để map thông tin
  async getAllUsers() {
    return await this.request('/users');
  }

  // Xóa user khỏi shifts của một nhóm
  async removeUserFromGroupShifts(group, userId) {
    return await this.request(`/schedules/${group}/shifts/${userId}`, {
      method: 'DELETE'
    });
  }

  // Xóa user khỏi waiting list của một nhóm
  async removeUserFromGroupWaiting(group, userId) {
    return await this.request(`/schedules/${group}/waiting/${userId}`, {
      method: 'DELETE'
    });
  }

  // Cleanup orphaned users trong schedules
  async cleanupOrphanedUsers(month = null, year = null) {
    return await this.request('/cleanup-orphaned-users', {
      method: 'POST',
      body: JSON.stringify({ month, year })
    });
  }

  // Force refresh và cleanup dữ liệu theo tháng/năm
  async forceRefreshSchedules(month, year) {
    return await this.request('/force-refresh-schedules', {
      method: 'POST',
      body: JSON.stringify({ month, year })
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService; 