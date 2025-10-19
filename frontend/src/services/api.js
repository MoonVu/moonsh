import { API_BASE_URL } from '../config/api';

console.log("🔧 api.js using API_BASE_URL:", API_BASE_URL);

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    // Ưu tiên token mới, fallback về authToken cũ
    this.token = localStorage.getItem('token') || localStorage.getItem('authToken');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token); // Sử dụng key mới
      localStorage.setItem('authToken', token); // Giữ key cũ cho compatibility
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
    }
    console.log('🔑 API Service token updated:', token ? 'YES' : 'NO');
  }

  // Method để refresh token từ localStorage
  refreshToken() {
    const newToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (newToken !== this.token) {
      this.token = newToken;
      console.log('🔄 API Service token refreshed:', newToken ? 'YES' : 'NO');
    }
    return this.token;
  }

  // Helper method để tạo headers với token
  getHeaders() {
    // Tự động refresh token từ localStorage
    this.refreshToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };

    
    return headers;
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error text:", errorText);
      }
      
      return this.handleResponse(response);
    } catch (error) {
      console.error("❌ Request error:", error);
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
    const data = await this.request('/users-all');
    
    // Ensure we always return an array
    let result;
    if (data?.success && data?.data) {
      // Handle paginated response: {success: true, data: {users: [], pagination: {}}}
      if (Array.isArray(data.data.users)) {
        result = data.data.users;
      }
      // Handle direct array response: {success: true, data: []}
      else if (Array.isArray(data.data)) {
        result = data.data;
      } else {
        result = [];
      }
    } else if (Array.isArray(data)) {
      result = data;
    } else {
      result = [];
    }
    
    return result;
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

  // Demo Lịch Đi Ca API - Sử dụng API có sẵn
  // Không cần tạo model mới, sử dụng demo-lichdica endpoint

  // API cũ (giữ lại để tương thích)
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

  // Tạo bản sao lịch đi ca
  async createScheduleCopy(copyData) {
    return await this.request('/schedule-copy', {
      method: 'POST',
      body: JSON.stringify(copyData)
    });
  }

  // Lấy bản sao lịch đi ca theo ID
  async getScheduleCopy(copyId) {
    return await this.request(`/schedule-copy/${copyId}`);
  }

  // Tạo tab mới cho lịch đi ca (giữ lại để tương thích)
  async createScheduleTab(tabData) {
    return await this.request('/schedule-tabs', {
      method: 'POST',
      body: JSON.stringify(tabData)
    });
  }

  // Cập nhật tab lịch đi ca (giữ lại để tương thích)
  async updateScheduleTab(tabId, tabData) {
    return await this.request(`/schedule-tabs/${tabId}`, {
      method: 'PUT',
      body: JSON.stringify(tabData)
    });
  }

  // Lấy tab lịch đi ca theo tháng/năm (giữ lại để tương thích)
  async getScheduleTabByMonth(month, year) {
    try {
      const response = await this.request('/schedule-tabs');
      if (response && response.success && response.data) {
        const existingTabs = response.data.filter(tab => 
          tab.type === "month" && 
          tab.data && 
          tab.data.month === month && 
          tab.data.year === year &&
          tab.name.includes(`DEMO Lịch đi ca tháng ${month}/${year}`)
        );
        
        if (existingTabs.length > 0) {
          existingTabs.sort((a, b) => {
            const timeA = new Date(a.created_at || a.updated_at || 0);
            const timeB = new Date(b.created_at || b.updated_at || 0);
            return timeB - timeA;
          });
          return existingTabs[0];
        }
        return null;
      }
      return null;
    } catch (error) {
      console.error("❌ Lỗi khi tìm tab theo tháng:", error);
      return null;
    }
  }

  // Cập nhật bản sao lịch đi ca
  async updateScheduleCopy(copyId, copyData) {
    return await this.request(`/schedule-copy/${copyId}`, {
      method: 'PUT',
      body: JSON.stringify(copyData)
    });
  }

         // Xóa bản sao lịch đi ca
       async deleteScheduleCopy(copyId) {
         try {
           const response = await this.request(`/schedule-copy/${copyId}`, {
             method: 'DELETE'
           });
           return response;
         } catch (error) {
           console.error("❌ API Service: Lỗi khi xóa bản sao:", error);
           throw error;
         }
       }

  // Xóa tab lịch đi ca
  async deleteScheduleTab(tabId) {
    return await this.request(`/schedule-tabs/${tabId}`, {
      method: 'DELETE'
    });
  }

  // Lấy tất cả bản sao lịch đi ca
  async getAllScheduleCopies() {
    return await this.request('/schedule-copy');
  }

  // Lấy tất cả tabs lịch đi ca
  async getAllScheduleTabs() {
    return await this.request('/schedule-tabs');
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
    const data = await this.request('/users-all');
  
    
    // Handle response format consistently with getUsers()
    let result;
    if (data?.success && data?.data) {
      // Handle paginated response: {success: true, data: {users: [], pagination: {}}}
      if (Array.isArray(data.data.users)) {
        result = data.data.users;
        console.log("✅ getAllUsers found paginated users:", result.length);
      }
      // Handle direct array response: {success: true, data: []}
      else if (Array.isArray(data.data)) {
        result = data.data;
      } else {
        result = [];
      }
    } else if (Array.isArray(data)) {
      result = data;

    } else {

      result = [];
    }
    
    return result;
  }

  // Xóa user khỏi shifts của một nhóm
  async removeUserFromGroupShifts(group, userId) {
    return await this.request(`/schedules/${group}/shifts/remove-user`, {
      method: 'DELETE',
      body: JSON.stringify({ userId })
    });
  }

  // Xóa user khỏi waiting list của một nhóm
  async removeUserFromGroupWaiting(group, userId) {
    return await this.request(`/schedules/${group}/waiting/remove-user`, {
      method: 'DELETE',
      body: JSON.stringify({ userId })
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

  // ==================== SEAT API METHODS ====================

  // API calls cho Seat (vị trí chỗ ngồi)
  async getSeatData() {
    try {
      const response = await fetch(`${this.baseURL}/api/seat`);
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Lỗi khi lấy dữ liệu seat');
      }
    } catch (error) {
      console.error('Lỗi API getSeatData:', error);
      throw error;
    }
  }

  async saveSeatData(seatData) {
    try {
      const response = await fetch(`${this.baseURL}/api/seat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seatData),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Lỗi khi lưu dữ liệu seat');
      }
    } catch (error) {
      console.error('Lỗi API saveSeatData:', error);
      throw error;
    }
  }

  async getSeatVersion() {
    try {
      const response = await fetch(`${this.baseURL}/api/seat/version`);
      const data = await response.json();
      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Lỗi khi lấy version seat');
      }
    } catch (error) {
      console.error('Lỗi API getSeatVersion:', error);
      throw error;
    }
  }

  // ==================== REQUEST API METHODS ====================

  // Lấy danh sách request của user
  async getUserRequests(month, year) {
    try {
      const queryParams = new URLSearchParams();
      if (month) queryParams.append('month', month);
      if (year) queryParams.append('year', year);
      
      const endpoint = `/requests/my-requests${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await this.request(endpoint, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      console.error('Lỗi API getUserRequests:', error);
      throw error;
    }
  }

  // Lấy tất cả requests (admin only)
  async getAllRequests(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Thêm các filter nếu có
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      
      const endpoint = `/requests${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await this.request(endpoint, {
        method: 'GET'
      });
      return response;
    } catch (error) {
      console.error('Lỗi API getAllRequests:', error);
      throw error;
    }
  }

  // Gửi đăng ký OFF
  async submitOffRequest(requestData) {
    try {
      // Tạo 2 request riêng biệt cho 2 ngày
      const promises = requestData.dates.map((date, index) => {
        const reason = requestData.reasons[index] || '';
        return this.request('/requests', {
          method: 'POST',
          body: JSON.stringify({
            request_type: 'monthly_off',
            content: `Đăng ký OFF ngày ${date}`,
            description: reason || 'Không có lý do',
            metadata: {
              from_date: date,
              to_date: date,
              reason: reason,
              date_index: index + 1, // Đánh dấu ngày thứ mấy
              total_days: requestData.dates.length
            }
          })
        });
      });

      const responses = await Promise.all(promises);
      
      // Kiểm tra xem tất cả có thành công không
      const allSuccess = responses.every(res => res.success);
      if (allSuccess) {
        return {
          success: true,
          message: `Đã gửi ${requestData.dates.length} yêu cầu OFF thành công!`,
          data: responses.map(res => res.data)
        };
      } else {
        throw new Error('Có lỗi xảy ra khi gửi một số yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi API submitOffRequest:', error);
      throw error;
    }
  }

  // Gửi đăng ký OFF nửa ca
  async submitHalfDayRequest(requestData) {
    try {
      const response = await this.request('/requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'half_day_off',
          content: `Đăng ký OFF nửa ca ngày ${requestData.date}`,
          description: requestData.reason,
          metadata: {
            from_date: requestData.date,
            half_day_type: requestData.halfDayType,
            half_day_shift: requestData.halfDayShift,
            reason: requestData.reason
          }
        })
      });
      return response;
    } catch (error) {
      console.error('Lỗi API submitHalfDayRequest:', error);
      throw error;
    }
  }

  // Gửi đăng ký tăng ca
  async submitOvertimeRequest(requestData) {
    try {
      const response = await this.request('/requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'overtime_day', // Sử dụng overtime_day riêng biệt
          content: `Đăng ký tăng ca ngày ${requestData.date}`,
          description: requestData.reason,
          metadata: {
            from_date: requestData.date,
            to_date: requestData.date, // Cùng ngày
            reason: requestData.reason
          }
        })
      });
      return response;
    } catch (error) {
      console.error('Lỗi API submitOvertimeRequest:', error);
      throw error;
    }
  }

  // Gửi đăng ký nghỉ phép năm
  async submitAnnualLeaveRequest(requestData) {
    try {
      const response = await this.request('/requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'annual_leave',
          content: `Đăng ký nghỉ phép năm từ ${requestData.startDate} đến ${requestData.endDate}`,
          description: requestData.reason,
          metadata: {
            from_date: requestData.startDate,
            to_date: requestData.endDate,
            reason: requestData.reason,
            leave_type: 'annual_leave',
            leave_days: 17
          }
        })
      });
      return response;
    } catch (error) {
      console.error('Lỗi API submitAnnualLeaveRequest:', error);
      throw error;
    }
  }

  // Cập nhật request
  async updateRequest(requestId, updateData) {
    try {
      const response = await this.request(`/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      return response;
    } catch (error) {
      console.error('Lỗi API updateRequest:', error);
      throw error;
    }
  }

  // Cập nhật trạng thái request (phê duyệt/từ chối)
  async updateRequestStatus(requestId, newStatus, adminNote = '') {
    try {
      const response = await this.request(`/requests/${requestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: newStatus,
          admin_note: adminNote,
          processed_at: new Date().toISOString()
        })
      });
      return response;
    } catch (error) {
      console.error('Lỗi API updateRequestStatus:', error);
      throw error;
    }
  }

  // Xóa request
  async deleteRequest(requestId) {
    try {
      const response = await this.request(`/requests/${requestId}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Lỗi API deleteRequest:', error);
      throw error;
    }
  }

  // ==================== TELEGRAM API METHODS ====================

  // Lấy danh sách nhóm Telegram
  async getTelegramGroups() {
    return await this.request('/telegram-groups');
  }

  // Đảm bảo parent documents tồn tại
  async ensureTelegramGroups() {
    return await this.request('/telegram-groups/ensure', {
      method: 'POST'
    });
  }

  // Tạo subgroup mới
  async createSubGroup(type, subgroupData) {
    return await this.request(`/telegram-groups/${type}/sub-groups`, {
      method: 'POST',
      body: JSON.stringify(subgroupData)
    });
  }

  // Cập nhật subgroup
  async updateSubGroup(type, subId, updateData) {
    return await this.request(`/telegram-groups/${type}/sub-groups/${subId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  // Xóa subgroup
  async deleteSubGroup(type, subId) {
    return await this.request(`/telegram-groups/${type}/sub-groups/${subId}`, {
      method: 'DELETE'
    });
  }

  // Gửi bill qua Telegram
  async sendBill(formData) {
    // Tự động refresh token
    this.refreshToken();
    
    const url = `${this.baseURL}/api/sendBill`;
    const config = {
      method: 'POST',
      headers: {
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        // Không set Content-Type cho FormData, browser sẽ tự set với boundary
      },
      body: formData
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error("❌ Telegram sendBill error:", error);
      throw error;
    }
  }

  // OCR endpoint: trả về text từ ảnh
  async ocrImage(file) {
    const url = `${this.baseURL}/api/ocr`;
    const form = new FormData();
    form.append('image', file);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token || ''}`
        },
        body: form
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('OCR API error:', e);
      return { success: false, error: e?.message || 'Network error' };
    }
  }

  // Lấy phản hồi Telegram cho một bill
  async getTelegramResponses(billId) {
    return await this.request(`/telegram/responses/${billId}`);
  }

  // Lấy tất cả phản hồi Telegram (admin)
  async getAllTelegramResponses(filters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const endpoint = `/telegram/responses${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await this.request(endpoint);
  }

  // Cập nhật trạng thái phản hồi
  async updateResponseStatus(data) {
    return await this.request('/telegram/update-response-status', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // ==================== OTHER API METHODS ====================
}

// Export singleton instance
const apiService = new ApiService();

// Export authAPI for compatibility
export { authAPI } from './authAPI';
export { apiService };

export default apiService; 