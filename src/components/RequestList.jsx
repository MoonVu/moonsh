import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import RequestForm from './RequestForm';
import './RequestList.css';

const RequestList = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    request_type: '',
    date_from: '',
    date_to: ''
  });
  const [selectedRequest, setSelectedRequest] = useState(null);

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
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await apiService.request(`/api/requests/my-requests?${params}`);
      
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

  const handleRequestSubmitted = (newRequest) => {
    setRequests(prev => [newRequest, ...prev]);
    setShowForm(false);
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa request này?')) {
      return;
    }

    try {
      const response = await apiService.request(`/api/requests/${requestId}`, {
        method: 'DELETE'
      });
      
      if (response.data.success) {
        setRequests(prev => prev.filter(req => req._id !== requestId));
        alert('Đã xóa request thành công');
      }
    } catch (error) {
      console.error('Lỗi xóa request:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi xóa request');
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
      date_from: '',
      date_to: ''
    });
  };

  if (loading) {
    return (
      <div className="request-list-container">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="request-list-container">
      <div className="request-list-header">
        <h2>Danh Sách Yêu Cầu Của Tôi</h2>
        <button 
          className="btn-new-request"
          onClick={() => setShowForm(true)}
        >
          + Tạo Yêu Cầu Mới
        </button>
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

      {/* Request List */}
      <div className="requests-container">
        {requests.length === 0 ? (
          <div className="no-requests">
            <p>Bạn chưa có yêu cầu nào.</p>
            <button 
              className="btn-create-first"
              onClick={() => setShowForm(true)}
            >
              Tạo yêu cầu đầu tiên
            </button>
          </div>
        ) : (
          <div className="requests-grid">
            {requests.map((request) => (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <div className="request-type">
                    {requestTypes[request.request_type] || request.request_type}
                  </div>
                  <div 
                    className="request-status"
                    style={{ backgroundColor: statusColors[request.status] }}
                  >
                    {statusLabels[request.status] || request.status}
                  </div>
                </div>

                <div className="request-content">
                  <h3 className="request-title">{request.content}</h3>
                  <p className="request-description">{request.description}</p>
                  
                  {request.metadata && (
                    <div className="request-metadata">
                      {getMetadataDisplay(request)}
                    </div>
                  )}
                </div>

                <div className="request-footer">
                  <div className="request-date">
                    Tạo lúc: {formatDate(request.created_at)}
                  </div>
                  
                  <div className="request-actions">
                    <button
                      className="btn-view"
                      onClick={() => setSelectedRequest(request)}
                    >
                      Xem chi tiết
                    </button>
                    
                    {request.status === 'pending' && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteRequest(request._id)}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Form Modal */}
      {showForm && (
        <RequestForm
          onRequestSubmitted={handleRequestSubmitted}
          onClose={() => setShowForm(false)}
        />
      )}

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
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestList;
