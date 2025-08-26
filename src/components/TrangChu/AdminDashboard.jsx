import React, { useState, useEffect } from 'react';
import GenericApprovalPanel from '../GenericApprovalPanel';
import { scheduleRequestConfig } from '../../config/approvalConfigs';
import apiService from '../../services/api';
import { message } from 'antd';

const AdminDashboard = () => {
  const [scheduleRequests, setScheduleRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const systemStats = {
    totalUsers: 45,
    activeUsers: 38,
    pendingTasks: scheduleRequests.length,
    completedTasks: 156
  };

  // Load danh sách yêu cầu đăng ký lịch
  const loadScheduleRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingRequests();
      if (response.success) {
        setScheduleRequests(response.data || []);
      } else {
        message.error('Không thể tải danh sách yêu cầu đăng ký lịch');
      }
    } catch (error) {
      console.error('Lỗi khi load schedule requests:', error);
      message.error('Không thể tải danh sách yêu cầu đăng ký lịch');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý duyệt yêu cầu đăng ký lịch
  const handleScheduleApprove = async (request, adminNote) => {
    try {
      const response = await apiService.approveRequest(request.id, adminNote);
      if (response.success) {
        return response;
      } else {
        throw new Error(response.error || 'Có lỗi xảy ra khi duyệt yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi khi duyệt schedule request:', error);
      throw error;
    }
  };

  // Xử lý từ chối yêu cầu đăng ký lịch
  const handleScheduleReject = async (request, adminNote) => {
    try {
      const response = await apiService.rejectRequest(request.id, adminNote);
      if (response.success) {
        return response;
      } else {
        throw new Error(response.error || 'Có lỗi xảy ra khi từ chối yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi khi từ chối schedule request:', error);
      throw error;
    }
  };

  // Xử lý xóa yêu cầu đăng ký lịch
  const handleScheduleDelete = async (request) => {
    try {
      const response = await apiService.deleteRequest(request.id);
      if (response.success) {
        return response;
      } else {
        throw new Error(response.error || 'Có lỗi xảy ra khi xóa yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi khi xóa schedule request:', error);
      throw error;
    }
  };

  // Load data khi component mount
  useEffect(() => {
    loadScheduleRequests();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Bảng điều khiển Quản trị viên</h1>
        <p>Quản lý và phê duyệt các yêu cầu từ nhân viên</p>
      </div>

      <div className="admin-content">
        {/* Thống kê tổng quan */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{systemStats.totalUsers}</h3>
              <p>Tổng nhân viên</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{systemStats.activeUsers}</h3>
              <p>Đang hoạt động</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <h3>{systemStats.pendingTasks}</h3>
              <p>Chờ phê duyệt</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <h3>{systemStats.completedTasks}</h3>
              <p>Đã hoàn thành</p>
            </div>
          </div>
        </div>

        {/* Quản lý yêu cầu đăng ký lịch */}
        <GenericApprovalPanel
          {...scheduleRequestConfig}
          dataSource={scheduleRequests}
          loading={loading}
          onApprove={handleScheduleApprove}
          onReject={handleScheduleReject}
          onDelete={handleScheduleDelete}
          onView={true} // Enable view modal
          onRefresh={loadScheduleRequests}
        />

        {/* TODO: Thêm các loại yêu cầu khác sau này */}
        {/* 
        <GenericApprovalPanel
          {...leaveRequestConfig}
          dataSource={leaveRequests}
          loading={leaveLoading}
          onApprove={handleLeaveApprove}
          onReject={handleLeaveReject}
          onRefresh={loadLeaveRequests}
        />
        
        <GenericApprovalPanel
          {...overtimeRequestConfig}
          dataSource={overtimeRequests}
          loading={overtimeLoading}
          onApprove={handleOvertimeApprove}
          onReject={handleOvertimeReject}
          onRefresh={loadOvertimeRequests}
        />
        */}

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Thao tác nhanh</h2>
          <div className="action-buttons">
            <button className="action-btn">📊 Xem báo cáo</button>
            <button className="action-btn">👥 Quản lý nhân viên</button>
            <button className="action-btn">⚙️ Cài đặt hệ thống</button>
            <button className="action-btn">📅 Quản lý lịch</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
