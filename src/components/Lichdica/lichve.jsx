import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCan } from '../../hooks/useCan';
import apiService from '../../services/api';
import './LichVe.css';

const LichVe = () => {
  const { user } = useAuth();
  
  // State cho dữ liệu
  const [leaveData, setLeaveData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    employeeName: '',
    nextLeaveDate: '',
    leaveStartDate: '',
    leaveEndDate: '',
    returnDate: '',
    leaveType: 'Việc riêng',
    arrangementType: 'Tổ trưởng xếp',
    notes: ''
  });

  // Kiểm tra quyền - tạm thời để true để test
  const canEdit = true; // useCan('leave-schedule', 'edit');
  const canView = true; // useCan('leave-schedule', 'view');

  useEffect(() => {
    // Tạm thời bỏ qua kiểm tra quyền để test
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const response = await apiService.get('/leave-schedule');
      if (response.data.success) {
        setLeaveData(response.data.data);
      } else {
        setError('Không thể tải dữ liệu lịch về phép');
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
      setError('Không thể tải dữ liệu lịch về phép');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await apiService.post('/leave-schedule', formData);
      if (response.data.success) {
        // Đóng form và reset dữ liệu
        setShowAddForm(false);
        setFormData({
          department: '',
          employeeName: '',
          nextLeaveDate: '',
          leaveStartDate: '',
          leaveEndDate: '',
          returnDate: '',
          leaveType: 'Việc riêng',
          arrangementType: 'Tổ trưởng xếp',
          notes: ''
        });
        
        // Tải lại dữ liệu
        await fetchLeaveData();
        
        // Hiển thị thông báo thành công
        alert('Thêm lịch về phép thành công!');
      } else {
        alert('Có lỗi xảy ra: ' + response.data.message);
      }
    } catch (err) {
      console.error('Error creating leave schedule:', err);
      alert('Có lỗi xảy ra khi tạo lịch về phép');
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="lichve-container">
        <div className="access-denied">
          <h2>Không có quyền truy cập</h2>
          <p>Bạn không có quyền xem lịch về phép.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lichve-container">
      <h1 className="lichve-title">Lịch Về Phép</h1>
      
      {/* Div thống kê cảnh báo - để trống theo yêu cầu */}
      <div className="warning-stats">
        {/* Nội dung sẽ được thêm sau */}
      </div>

      {/* Bảng thống kê lịch về phép */}
      <div className="table-container">
        <table className="lichve-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Bộ phận</th>
              <th>Tên nhân viên</th>
              <th>Ngày đủ phép tiếp theo</th>
              <th>Ngày nghỉ phép</th>
              <th>Ngày quay lại làm việc</th>
              <th>Số ngày nghỉ phép</th>
              <th>Loại phép</th>
              <th>Trạng thái</th>
              <th>Loại hình sắp xếp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="loading-row">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="10" className="error-row">
                  {error}
                </td>
              </tr>
            ) : leaveData.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-row">
                  Chưa có dữ liệu lịch về phép
                </td>
              </tr>
            ) : (
              leaveData.map((item, index) => (
                <tr key={item._id || index}>
                  <td>{index + 1}</td>
                  <td>{item.department}</td>
                  <td>{item.employeeName}</td>
                  <td>{item.formattedNextLeaveDate || new Date(item.nextLeaveDate).toLocaleDateString('vi-VN')}</td>
                  <td>{item.leavePeriod || `${new Date(item.leaveStartDate).toLocaleDateString('vi-VN')} - ${new Date(item.leaveEndDate).toLocaleDateString('vi-VN')}`}</td>
                  <td>{item.formattedReturnDate || new Date(item.returnDate).toLocaleDateString('vi-VN')}</td>
                  <td>{item.leaveDays}</td>
                  <td>{item.leaveType}</td>
                  <td>{item.status}</td>
                  <td>{item.arrangementType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Nút thêm mới - chỉ admin, nằm dưới bảng */}
        {canEdit && (
          <div className="table-actions">
            <button 
              className="btn-add-small"
              onClick={() => setShowAddForm(true)}
            >
              + Thêm mới
            </button>
          </div>
        )}
      </div>

      {/* Form thêm mới */}
      {showAddForm && (
        <div className="add-form-overlay">
          <div className="add-form">
            <h3>Thêm mới lịch về phép</h3>
            <form onSubmit={handleSubmitForm}>
              <div className="form-row">
                <div className="form-group">
                  <label>Bộ phận:</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tên nhân viên:</label>
                  <input
                    type="text"
                    value={formData.employeeName}
                    onChange={(e) => setFormData({...formData, employeeName: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày đủ phép tiếp theo:</label>
                  <input
                    type="date"
                    value={formData.nextLeaveDate}
                    onChange={(e) => setFormData({...formData, nextLeaveDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Loại phép:</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
                    required
                  >
                    <option value="Việc riêng">Việc riêng</option>
                    <option value="Phép 6 tháng">Phép 6 tháng</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày bắt đầu nghỉ phép:</label>
                  <input
                    type="date"
                    value={formData.leaveStartDate}
                    onChange={(e) => setFormData({...formData, leaveStartDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc nghỉ phép:</label>
                  <input
                    type="date"
                    value={formData.leaveEndDate}
                    onChange={(e) => setFormData({...formData, leaveEndDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày quay lại làm việc:</label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Loại hình sắp xếp:</label>
                  <select
                    value={formData.arrangementType}
                    onChange={(e) => setFormData({...formData, arrangementType: e.target.value})}
                    required
                  >
                    <option value="Tổ trưởng xếp">Tổ trưởng xếp</option>
                    <option value="Theo lịch OA">Theo lịch OA</option>
                    <option value="Nhân viên rời ngày">Nhân viên rời ngày</option>
                    <option value="Nhân viên xin lịch">Nhân viên xin lịch</option>
                    <option value="Trợ lý xếp">Trợ lý xếp</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Ghi chú:</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-submit">Lưu</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default LichVe;
