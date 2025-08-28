import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import './AdminRequestManager.css';

const AdminRequestManager = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    request_type: '',
    user_id: '',
    date_from: '',
    date_to: ''
  });
  const [stats, setStats] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [users, setUsers] = useState([]);

  const requestTypes = {
    'monthly_off': 'Lịch OFF tháng',
    'half_day_off': 'Lịch OFF nửa ca',
    'annual_leave': 'Lịch nghỉ phép năm'
  };

  const statusLabels = {
    'pending': 'Chờ duyệt',
    'processing': 'Đang xử lý',
    'approved': 'Đã duyệt',
    'rejected': 'Từ chối',
    'cancelled': 'Đã hủy'
  };

  const statusColors = {
    'pending': '#f39c12',
    'processing': '#3498db',
    'approved': '#27ae60',
    'rejected': '#e74c3c',
    'cancelled': '#95a5a6'
  };

  useEffect(() => {
    fetchRequests();
    fetchStats();
    fetchUsers();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await apiService.request(`/api/requests?${params}`);
      
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách request:', error);
      alert('Có lỗi xảy ra khi lấy danh sách request');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await apiService.request(`/api/requests/stats/overview?${params}`);
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy thống kê:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiService.request('/api/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách user:', error);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus, note = '') => {
    try {
      setProcessingRequest(requestId);
      
      const response = await apiService.request(`/api/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          note
        })
      });
      
      if (response.data.success) {
        // Cập nhật request trong danh sách
        setRequests(prev => prev.map(req => 
          req._id === requestId ? response.data.data : req
        ));
        
        // Cập nhật thống kê
        fetchStats();
        
        alert(`Đã ${newStatus === 'approved' ? 'duyệt' : 'từ chối'} request thành công`);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setProcessingRequest(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMetadataDisplay = (request) => {
    const { metadata, request_type } = request;
    
    switch (request_type) {
      case 'monthly_off':
        return `${formatDate(metadata.from_date)} - ${formatDate(metadata.to_date)}`;
      case 'half_day_off':
        const shiftLabel = metadata.half_day_shift === 'morning' ? 'Ca sáng' : 'Ca chiều';
        return `${formatDate(metadata.from_date)} (${shiftLabel})`;
      case 'annual_leave':
        return `${formatDate(metadata.from_date)} - ${formatDate(metadata.to_date)} (${metadata.leave_days} ngày)`;
      default:
        return '';
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      request_type: '',
      user_id: '',
      date_from: '',
      date_to: ''
    });
  };

  const getStatusCount = (status) => {
    const statusData = stats.find(s => s._id === status);
    return statusData ? statusData.total : 0;
  };

  if (loading) {
    return (
      <div className="admin-request-container">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="admin-request-container">
      <div className="admin-request-header">
        <h2>Quản Lý Yêu Cầu</h2>
        <div className="header-actions">
          <button className="btn-refresh" onClick={fetchRequests}>
            🔄 Làm mới
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card pending">
            <div className="stat-number">{getStatusCount('pending')}</div>
            <div className="stat-label">Chờ duyệt</div>
          </div>
          <div className="stat-card processing">
            <div className="stat-number">{getStatusCount('processing')}</div>
            <div className="stat-label">Đang xử lý</div>
          </div>
          <div className="stat-card approved">
            <div className="stat-number">{getStatusCount('approved')}</div>
            <div className="stat-label">Đã duyệt</div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-number">{getStatusCount('rejected')}</div>
            <div className="stat-label">Từ chối</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>Trạng thái:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="processing">Đang xử lý</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Loại yêu cầu:</label>
            <select
              value={filters.request_type}
              onChange={(e) => setFilters(prev => ({ ...prev, request_type: e.target.value }))}
            >
              <option value="">Tất cả</option>
                             <option value="monthly_off">Lịch OFF tháng</option>
               <option value="half_day_off">Lịch OFF nửa ca</option>
               <option value="annual_leave">Lịch nghỉ phép năm</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Người dùng:</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))}
            >
              <option value="">Tất cả</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.username} ({user.group_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Từ ngày:</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Đến ngày:</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
            />
          </div>

          <button className="btn-clear-filters" onClick={clearFilters}>
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="requests-table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Loại yêu cầu</th>
              <th>Tiêu đề</th>
              <th>Thông tin</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request._id} className="request-row">
                <td>
                  <div className="user-info">
                    <div className="username">{request.user?.username}</div>
                    <div className="group-name">{request.user?.group_name}</div>
                  </div>
                </td>
                <td>
                  <span className="request-type-badge">
                    {requestTypes[request.request_type]}
                  </span>
                </td>
                <td>
                  <div className="request-title-cell">
                    {request.content}
                  </div>
                </td>
                <td>
                  <div className="metadata-cell">
                    {getMetadataDisplay(request)}
                  </div>
                </td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: statusColors[request.status] }}
                  >
                    {statusLabels[request.status]}
                  </span>
                </td>
                <td>{formatDate(request.created_at)}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-view"
                      onClick={() => setSelectedRequest(request)}
                    >
                      👁️ Xem
                    </button>
                    
                    {request.status === 'pending' && (
                      <>
                        <button
                          className="btn-approve"
                          onClick={() => handleStatusUpdate(request._id, 'approved')}
                          disabled={processingRequest === request._id}
                        >
                          {processingRequest === request._id ? '⏳' : '✅'} Duyệt
                        </button>
                        
                        <button
                          className="btn-reject"
                          onClick={() => {
                            const note = prompt('Nhập lý do từ chối (nếu có):');
                            if (note !== null) {
                              handleStatusUpdate(request._id, 'rejected', note);
                            }
                          }}
                          disabled={processingRequest === request._id}
                        >
                          {processingRequest === request._id ? '⏳' : '❌'} Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="request-detail-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="request-detail-container" onClick={(e) => e.stopPropagation()}>
            <div className="request-detail-header">
              <h3>Chi Tiết Yêu Cầu</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedRequest(null)}
              >
                ×
              </button>
            </div>
            
            <div className="request-detail-content">
              <div className="detail-row">
                <label>Người dùng:</label>
                <span>{selectedRequest.user?.username} ({selectedRequest.user?.group_name})</span>
              </div>
              
              <div className="detail-row">
                <label>Loại yêu cầu:</label>
                <span>{requestTypes[selectedRequest.request_type]}</span>
              </div>
              
              <div className="detail-row">
                <label>Tiêu đề:</label>
                <span>{selectedRequest.content}</span>
              </div>
              
              <div className="detail-row">
                <label>Mô tả:</label>
                <span>{selectedRequest.description}</span>
              </div>
              
              <div className="detail-row">
                <label>Trạng thái:</label>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: statusColors[selectedRequest.status] }}
                >
                  {statusLabels[selectedRequest.status]}
                </span>
              </div>
              
              <div className="detail-row">
                <label>Ngày tạo:</label>
                <span>{formatDate(selectedRequest.created_at)}</span>
              </div>
              
              {selectedRequest.processed_by && (
                <div className="detail-row">
                  <label>Xử lý bởi:</label>
                  <span>{selectedRequest.processed_by.username}</span>
                </div>
              )}
              
              {selectedRequest.processed_at && (
                <div className="detail-row">
                  <label>Ngày xử lý:</label>
                  <span>{formatDate(selectedRequest.processed_at)}</span>
                </div>
              )}
              
              {selectedRequest.admin_note && (
                <div className="detail-row">
                  <label>Ghi chú từ admin:</label>
                  <span>{selectedRequest.admin_note}</span>
                </div>
              )}
            </div>
            
            {selectedRequest.status === 'pending' && (
              <div className="request-detail-actions">
                <button
                  className="btn-approve-large"
                  onClick={() => handleStatusUpdate(selectedRequest._id, 'approved')}
                  disabled={processingRequest === selectedRequest._id}
                >
                  {processingRequest === selectedRequest._id ? '⏳ Đang xử lý...' : '✅ Duyệt yêu cầu'}
                </button>
                
                <button
                  className="btn-reject-large"
                  onClick={() => {
                    const note = prompt('Nhập lý do từ chối (nếu có):');
                    if (note !== null) {
                      handleStatusUpdate(selectedRequest._id, 'rejected', note);
                    }
                  }}
                  disabled={processingRequest === selectedRequest._id}
                >
                  ❌ Từ chối yêu cầu
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequestManager;
