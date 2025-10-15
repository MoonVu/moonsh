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
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [users, setUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [formData, setFormData] = useState({
    department: '',
    employeeName: '',
    nextLeaveDate: '',
    leaveStartDate: '',
    leaveEndDate: '',
    returnDate: '',
    leaveDays: 0,
    leaveType: 'Việc riêng',
    arrangementType: 'Tổ trưởng xếp',
    notes: ''
  });

  // Kiểm tra quyền - tạm thời để true để test
  const canEdit = true; // useCan('leave-schedule', 'edit');
  const canView = true; // useCan('leave-schedule', 'view');

  // Hàm tính số ngày nghỉ phép và các ngày liên quan
  const calculateLeaveDays = (startDate, endDate, leaveType) => {
    if (!startDate) return 0;
    
    if (leaveType === 'Phép 6 tháng') {
      return 17; // Phép 6 tháng luôn là 17 ngày
    }
    
    if (!endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Hàm tính trạng thái dựa trên ngày hiện tại
  const calculateStatus = (leaveStartDate, leaveEndDate, returnDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time để so sánh chỉ ngày
    
    const leaveStart = new Date(leaveStartDate);
    leaveStart.setHours(0, 0, 0, 0);
    
    const leaveEnd = new Date(leaveEndDate);
    leaveEnd.setHours(0, 0, 0, 0);
    
    const returnDateObj = new Date(returnDate);
    returnDateObj.setHours(0, 0, 0, 0);
    
    // Nếu hôm nay sau ngày quay lại làm việc
    if (today.getTime() > returnDateObj.getTime()) {
      return { text: "Hoàn thành nghỉ phép", class: "completed" };
    }
    
    // Nếu hôm nay trong khoảng thời gian nghỉ phép (từ ngày bắt đầu đến ngày kết thúc)
    if (today.getTime() >= leaveStart.getTime() && today.getTime() <= leaveEnd.getTime()) {
      const diffTime = leaveEnd.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return { text: `Trong kì nghỉ phép - Còn ${diffDays} ngày`, class: "in-leave" };
    }
    
    // Nếu hôm nay trước ngày bắt đầu nghỉ phép
    if (today.getTime() < leaveStart.getTime()) {
      const diffTime = leaveStart.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { text: `Đợi ngày về phép - Còn ${diffDays} ngày`, class: "waiting" };
    }
    
    // Fallback
    return { text: "Đợi ngày về phép", class: "waiting" };
  };

  // Hàm tính ngày kết thúc và ngày quay lại cho phép 6 tháng
  const calculate6MonthLeaveDates = (startDate) => {
    if (!startDate) return { endDate: '', returnDate: '' };
    
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 16); // 16 ngày sau (tổng 17 ngày)
    
    const returnDate = new Date(end);
    returnDate.setDate(end.getDate() + 1); // Ngày quay lại = ngày kết thúc + 1
    
    return {
      endDate: end.toISOString().split('T')[0],
      returnDate: returnDate.toISOString().split('T')[0]
    };
  };

  // Hàm lấy danh sách users từ backend
  const fetchUsers = async () => {
    try {
      const response = await apiService.getUsers();
      console.log('🔍 fetchUsers response:', response);
      const usersArray = Array.isArray(response) ? response : (response?.data || []);
      console.log('🔍 usersArray:', usersArray);
      if (usersArray.length > 0) {
        console.log('🔍 First user structure:', usersArray[0]);
      }
      setUsers(usersArray);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Hàm cập nhật form data và tính toán số ngày
  const updateFormData = (updates) => {
    const newFormData = { ...formData, ...updates };
    
    // Xử lý phép 6 tháng - chỉ chọn ngày bắt đầu
    if (updates.leaveType === 'Phép 6 tháng' || (updates.leaveStartDate && newFormData.leaveType === 'Phép 6 tháng')) {
      const dates = calculate6MonthLeaveDates(updates.leaveStartDate || newFormData.leaveStartDate);
      newFormData.leaveEndDate = dates.endDate;
      newFormData.returnDate = dates.returnDate;
      newFormData.leaveDays = 17;
    }
    // Xử lý việc riêng - chọn cả ngày bắt đầu và kết thúc
    else if (updates.leaveType === 'Việc riêng' || (updates.leaveStartDate && newFormData.leaveType === 'Việc riêng') || (updates.leaveEndDate && newFormData.leaveType === 'Việc riêng')) {
      // Tính ngày quay lại = ngày kết thúc + 1
      if (updates.leaveEndDate || newFormData.leaveEndDate) {
        const endDate = new Date(updates.leaveEndDate || newFormData.leaveEndDate);
        const returnDate = new Date(endDate);
        returnDate.setDate(endDate.getDate() + 1);
        newFormData.returnDate = returnDate.toISOString().split('T')[0];
      }
      
      // Tính số ngày nghỉ phép
      newFormData.leaveDays = calculateLeaveDays(
        updates.leaveStartDate || newFormData.leaveStartDate,
        updates.leaveEndDate || newFormData.leaveEndDate,
        'Việc riêng'
      );
    }
    
    setFormData(newFormData);
  };

  // Hàm filter users khi gõ
  const filterUsers = (searchTerm) => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  };

  useEffect(() => {
    // Tạm thời bỏ qua kiểm tra quyền để test
    fetchLeaveData();
    fetchUsers();
  }, []);

  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const response = await apiService.request('/leave-schedule');
      if (response.success) {
        setLeaveData(response.data);
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

  // Hàm mở form chỉnh sửa
  const handleEditItem = (item) => {
    setEditingItem(item);
    setFormData({
      department: item.department || '',
      employeeName: item.employeeName || '',
      nextLeaveDate: item.nextLeaveDate ? new Date(item.nextLeaveDate).toISOString().split('T')[0] : '',
      leaveStartDate: item.leaveStartDate ? new Date(item.leaveStartDate).toISOString().split('T')[0] : '',
      leaveEndDate: item.leaveEndDate ? new Date(item.leaveEndDate).toISOString().split('T')[0] : '',
      returnDate: item.returnDate ? new Date(item.returnDate).toISOString().split('T')[0] : '',
      leaveDays: item.leaveDays || 0,
      leaveType: item.leaveType || 'Việc riêng',
      arrangementType: item.arrangementType || 'Tổ trưởng xếp',
      notes: item.notes || ''
    });
    setShowEditForm(true);
  };

  // Hàm đóng form chỉnh sửa
  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setEditingItem(null);
    setFormData({
      department: '',
      employeeName: '',
      nextLeaveDate: '',
      leaveStartDate: '',
      leaveEndDate: '',
      returnDate: '',
      leaveDays: 0,
      leaveType: 'Việc riêng',
      arrangementType: 'Tổ trưởng xếp',
      notes: ''
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Đảm bảo leaveDays được tính toán trước khi gửi
      const calculatedLeaveDays = calculateLeaveDays(
        formData.leaveStartDate,
        formData.leaveEndDate,
        formData.leaveType
      );
      
      const submitData = {
        ...formData,
        leaveDays: calculatedLeaveDays, // Đảm bảo có leaveDays
        status: 'Đợi ngày về phép'
      };
      
      console.log('📤 Submitting leave schedule data:', submitData);
      
      const response = await apiService.request('/leave-schedule', {
        method: 'POST',
        body: JSON.stringify(submitData)
      });
      if (response.success) {
        // Đóng form và reset dữ liệu
        setShowAddForm(false);
        setFormData({
          department: '',
          employeeName: '',
          nextLeaveDate: '',
          leaveStartDate: '',
          leaveEndDate: '',
          returnDate: '',
          leaveDays: 0,
          leaveType: 'Việc riêng',
          arrangementType: 'Tổ trưởng xếp',
          notes: ''
        });
        
        // Tải lại dữ liệu
        await fetchLeaveData();
        
        // Hiển thị thông báo thành công
        alert('Thêm lịch về phép thành công!');
      } else {
        alert('Có lỗi xảy ra: ' + response.message);
      }
    } catch (err) {
      console.error('Error creating leave schedule:', err);
      alert('Có lỗi xảy ra khi tạo lịch về phép');
    } finally {
      setLoading(false);
    }
  };

  // Hàm cập nhật lịch về phép
  const handleUpdateForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Đảm bảo leaveDays được tính toán trước khi gửi
      const calculatedLeaveDays = calculateLeaveDays(
        formData.leaveStartDate,
        formData.leaveEndDate,
        formData.leaveType
      );
      
      const updateData = {
        ...formData,
        leaveDays: calculatedLeaveDays
      };
      
      console.log('📤 Updating leave schedule data:', updateData);
      
      const response = await apiService.request(`/leave-schedule/${editingItem._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      if (response.success) {
        // Đóng form và reset dữ liệu
        handleCloseEditForm();
        
        // Tải lại dữ liệu
        await fetchLeaveData();
        
        // Hiển thị thông báo thành công
        alert('Cập nhật lịch về phép thành công!');
      } else {
        alert('Có lỗi xảy ra: ' + response.message);
      }
    } catch (err) {
      console.error('Error updating leave schedule:', err);
      alert('Có lỗi xảy ra khi cập nhật lịch về phép');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xóa lịch về phép
  const handleDeleteItem = async (item) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa lịch về phép của ${item.employeeName}?\n\n` +
      `Ngày nghỉ: ${new Date(item.leaveStartDate).toLocaleDateString('vi-VN')} - ${new Date(item.leaveEndDate).toLocaleDateString('vi-VN')}\n` +
      `Loại phép: ${item.leaveType}\n\n` +
      `Hành động này không thể hoàn tác!`
    );
    
    if (!confirmDelete) return;
    
    setLoading(true);
    
    try {
      console.log('🗑️ Deleting leave schedule:', item._id);
      
      const response = await apiService.request(`/leave-schedule/${item._id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Đóng dropdown nếu đang mở
        setActiveDropdown(null);
        
        // Tải lại dữ liệu
        await fetchLeaveData();
        
        // Hiển thị thông báo thành công
        alert('Xóa lịch về phép thành công!');
      } else {
        alert('Có lỗi xảy ra: ' + response.message);
      }
    } catch (err) {
      console.error('Error deleting leave schedule:', err);
      alert('Có lỗi xảy ra khi xóa lịch về phép');
    } finally {
      setLoading(false);
    }
  };

  // Hàm toggle dropdown
  const toggleDropdown = (itemId) => {
    setActiveDropdown(activeDropdown === itemId ? null : itemId);
  };

  // Hàm đóng dropdown khi click outside
  const handleClickOutside = (e) => {
    if (!e.target.closest('.action-buttons')) {
      setActiveDropdown(null);
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
        {/* Nút thêm mới - chỉ admin, nằm trên bảng */}
        {canEdit && (
          <div className="table-actions-top">
            <button 
              className="btn-add-small"
              onClick={() => setShowAddForm(true)}
            >
              + Thêm mới
            </button>
          </div>
        )}
        
        <table className="lichve-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Bộ phận</th>
              <th>Tên nhân viên</th>
              <th>Ngày đủ phép theo OA</th>
              <th>Ngày nghỉ phép</th>
              <th>Ngày quay lại làm việc</th>
              <th>Số ngày nghỉ phép</th>
              <th>Loại phép</th>
              <th>Trạng thái</th>
              <th>Loại hình sắp xếp</th>
              <th>Ghi chú</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="12" className="loading-row">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="12" className="error-row">
                  {error}
                </td>
              </tr>
            ) : leaveData.length === 0 ? (
              <tr>
                <td colSpan="12" className="empty-row">
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
                  <td>
                    {(() => {
                      const status = calculateStatus(item.leaveStartDate, item.leaveEndDate, item.returnDate);
                      return (
                        <span className={`status-badge status-${status.class}`}>
                          {status.text}
                        </span>
                      );
                    })()}
                  </td>
                  <td>{item.arrangementType}</td>
                  <td>{item.notes || '-'}</td>
                  <td>
                    {canEdit && (
                      <div className="action-buttons">
                        <button 
                          className="action-menu-trigger"
                          onClick={() => toggleDropdown(item._id)}
                          title="Thao tác"
                        >
                          ⋮
                        </button>
                        {activeDropdown === item._id && (
                          <div className="action-dropdown">
                            <div 
                              className="action-dropdown-item edit"
                              onClick={() => {
                                handleEditItem(item);
                                setActiveDropdown(null);
                              }}
                            >
                              ✏️ Chỉnh sửa
                            </div>
                            <div 
                              className="action-dropdown-item delete"
                              onClick={() => {
                                handleDeleteItem(item);
                                setActiveDropdown(null);
                              }}
                            >
                              🗑️ Xóa
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form thêm mới */}
      {showAddForm && (
        <div className="add-form-overlay">
          <div className="add-form">
            <h3>Thêm mới lịch về phép</h3>
            <form onSubmit={handleSubmitForm}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên nhân viên:</label>
                  <div style={{position: 'relative'}}>
                    <input
                      type="text"
                      value={formData.employeeName}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateFormData({employeeName: value});
                        filterUsers(value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => {
                        setShowUserDropdown(true);
                        filterUsers(formData.employeeName);
                      }}
                      onBlur={() => {
                        // Delay để cho phép click vào dropdown
                        setTimeout(() => setShowUserDropdown(false), 200);
                      }}
                      placeholder="Gõ tên nhân viên..."
                      required
                      style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000
                      }}>
                        {filteredUsers.map(user => (
                          <div
                            key={user._id}
                            onClick={() => {
                              updateFormData({
                                employeeName: user.username,
                                department: user.group_name || ''
                              });
                              setShowUserDropdown(false);
                            }}
                            style={{
                              padding: '8px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #eee'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f5f5f5';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'white';
                            }}
                          >
                            {user.username}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Có thể gõ để tìm kiếm nhanh)
                  </small>
                </div>
                <div className="form-group">
                  <label>Bộ phận:</label>
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    className="readonly-field"
                    style={{backgroundColor: '#f5f5f5', color: '#666'}}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Tự động lấy từ nhân viên đã chọn)
                  </small>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày đủ phép:</label>
                  <input
                    type="date"
                    value={formData.nextLeaveDate}
                    onChange={(e) => updateFormData({nextLeaveDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Loại phép:</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => updateFormData({leaveType: e.target.value})}
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
                    onChange={(e) => updateFormData({leaveStartDate: e.target.value})}
                    required
                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                  />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc nghỉ phép:</label>
                  <input
                    type="date"
                    value={formData.leaveEndDate}
                    onChange={(e) => updateFormData({leaveEndDate: e.target.value})}
                    required={formData.leaveType === 'Việc riêng'}
                    disabled={formData.leaveType === 'Phép 6 tháng'}
                    style={{
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ccc',
                      backgroundColor: formData.leaveType === 'Phép 6 tháng' ? '#f5f5f5' : 'white',
                      color: formData.leaveType === 'Phép 6 tháng' ? '#666' : 'black'
                    }}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    {formData.leaveType === 'Phép 6 tháng' 
                      ? '(Tự động tính: 16 ngày sau ngày bắt đầu)' 
                      : '(Chọn ngày kết thúc cho phép việc riêng)'}
                  </small>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày quay lại làm việc:</label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    readOnly
                    className="readonly-field"
                    style={{backgroundColor: '#f5f5f5', color: '#666'}}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Tự động tính: ngày kết thúc + 1 ngày)
                  </small>
                </div>
                <div className="form-group">
                  <label>Số ngày nghỉ phép:</label>
                  <input
                    type="number"
                    value={formData.leaveDays}
                    readOnly
                    className="readonly-field"
                    style={{backgroundColor: '#f5f5f5', color: '#666'}}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Tự động tính toán dựa trên ngày bắt đầu và kết thúc)
                  </small>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Loại hình sắp xếp:</label>
                  <select
                    value={formData.arrangementType}
                    onChange={(e) => updateFormData({arrangementType: e.target.value})}
                    required
                  >
                    <option value="Tổ trưởng xếp">Tổ trưởng xếp</option>
                    <option value="Theo lịch OA">Theo lịch OA</option>
                    <option value="Nhân viên dời ngày">Nhân viên dời ngày</option>
                    <option value="Nhân viên xin lịch">Nhân viên xin lịch</option>
                    <option value="Trợ lý xếp">Trợ lý xếp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Trạng thái:</label>
                  <select
                    value="Đợi ngày về phép"
                    disabled
                    className="readonly-field"
                    style={{backgroundColor: '#f5f5f5', color: '#666'}}
                  >
                    <option value="Đợi ngày về phép">Đợi ngày về phép</option>
                  </select>
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Mặc định khi tạo mới)
                  </small>
                </div>
              </div>
              
              <div className="form-group">
                <label>Ghi chú:</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData({notes: e.target.value})}
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

      {/* Form chỉnh sửa */}
      {showEditForm && (
        <div className="add-form-overlay">
          <div className="add-form">
            <h3>Chỉnh sửa lịch về phép</h3>
            <form onSubmit={handleUpdateForm}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên nhân viên:</label>
                  <div style={{position: 'relative'}}>
                    <input
                      type="text"
                      value={formData.employeeName}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateFormData({employeeName: value});
                        filterUsers(value);
                        setShowUserDropdown(true);
                      }}
                      onFocus={() => {
                        setShowUserDropdown(true);
                        filterUsers(formData.employeeName);
                      }}
                      onBlur={() => {
                        // Delay để cho phép click vào dropdown
                        setTimeout(() => setShowUserDropdown(false), 200);
                      }}
                      placeholder="Gõ tên nhân viên..."
                      required
                      style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                    />
                    {showUserDropdown && filteredUsers.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderTop: 'none',
                        borderRadius: '0 0 4px 4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000
                      }}>
                        {filteredUsers.map(user => (
                          <div
                            key={user._id}
                            onClick={() => {
                              updateFormData({
                                employeeName: user.username,
                                department: user.group_name || ''
                              });
                              setShowUserDropdown(false);
                            }}
                            style={{
                              padding: '8px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #eee'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f5f5f5';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'white';
                            }}
                          >
                            {user.username}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Có thể gõ để tìm kiếm nhanh)
                  </small>
                </div>
                <div className="form-group">
                  <label>Bộ phận:</label>
                  <input
                    type="text"
                    value={formData.department}
                    readOnly
                    className="readonly-field"
                    style={{backgroundColor: '#f5f5f5', color: '#666'}}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Tự động lấy từ nhân viên đã chọn)
                  </small>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày đủ phép:</label>
                  <input
                    type="date"
                    value={formData.nextLeaveDate}
                    onChange={(e) => updateFormData({nextLeaveDate: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Loại phép:</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => updateFormData({leaveType: e.target.value})}
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
                    onChange={(e) => updateFormData({leaveStartDate: e.target.value})}
                    required
                    style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                  />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc nghỉ phép:</label>
                  <input
                    type="date"
                    value={formData.leaveEndDate}
                    onChange={(e) => updateFormData({leaveEndDate: e.target.value})}
                    required={formData.leaveType === 'Việc riêng'}
                    disabled={formData.leaveType === 'Phép 6 tháng'}
                    style={{
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ccc',
                      backgroundColor: formData.leaveType === 'Phép 6 tháng' ? '#f5f5f5' : 'white',
                      color: formData.leaveType === 'Phép 6 tháng' ? '#666' : 'black'
                    }}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    {formData.leaveType === 'Phép 6 tháng' 
                      ? '(Tự động tính: 16 ngày sau ngày bắt đầu)' 
                      : '(Chọn ngày kết thúc cho phép việc riêng)'}
                  </small>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ngày quay lại làm việc:</label>
                  <input
                    type="date"
                    value={formData.returnDate}
                    readOnly
                    className="readonly-field"
                    style={{backgroundColor: '#f5f5f5', color: '#666'}}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Tự động tính: ngày kết thúc + 1 ngày)
                  </small>
                </div>
                <div className="form-group">
                  <label>Số ngày nghỉ phép:</label>
                  <input
                    type="number"
                    value={formData.leaveDays}
                    readOnly
                    className="readonly-field"
                    style={{backgroundColor: '#f5f5f5', color: '#666'}}
                  />
                  <small style={{color: '#666', fontSize: '12px'}}>
                    (Tự động tính toán dựa trên ngày bắt đầu và kết thúc)
                  </small>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Loại hình sắp xếp:</label>
                  <select
                    value={formData.arrangementType}
                    onChange={(e) => updateFormData({arrangementType: e.target.value})}
                    required
                  >
                    <option value="Tổ trưởng xếp">Tổ trưởng xếp</option>
                    <option value="Theo lịch OA">Theo lịch OA</option>
                    <option value="Nhân viên dời ngày">Nhân viên dời ngày</option>
                    <option value="Nhân viên xin lịch">Nhân viên xin lịch</option>
                    <option value="Trợ lý xếp">Trợ lý xếp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Trạng thái:</label>
                  <select
                    value={formData.status || 'Đợi ngày về phép'}
                    onChange={(e) => updateFormData({status: e.target.value})}
                    required
                  >
                    <option value="Đợi ngày về phép">Đợi ngày về phép</option>
                    <option value="Đang về phép">Đang về phép</option>
                    <option value="Hoàn thành phép">Hoàn thành phép</option>
                    <option value="Hủy phép">Hủy phép</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Ghi chú:</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateFormData({notes: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-submit">Cập nhật</button>
                <button type="button" className="btn-cancel" onClick={handleCloseEditForm}>
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
