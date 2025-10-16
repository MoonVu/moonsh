import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import './RequestForm.css';

const RequestForm = ({ onRequestSubmitted, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    request_type: 'monthly_off',
    content: '',
    description: '',
    metadata: {
      from_date: '',
      to_date: '',
      reason: '',
      half_day_shift: 'morning',
      leave_days: '',
      emergency_contact: ''
    }
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestTypes = [
    { value: 'monthly_off', label: 'Lịch OFF tháng' },
    { value: 'half_day_off', label: 'Lịch OFF nửa ca' },
    { value: 'annual_leave', label: 'Lịch nghỉ phép năm' }
  ];

  const halfDayShifts = [
    { value: 'morning', label: 'Ca sáng (8h-12h)' },
    { value: 'afternoon', label: 'Ca chiều (13h-17h)' }
  ];

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Tiêu đề request là bắt buộc';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Mô tả chi tiết là bắt buộc';
    }

    // Validate based on request type
    if (formData.request_type === 'monthly_off') {
      if (!formData.metadata.from_date) {
        newErrors['metadata.from_date'] = 'Ngày bắt đầu nghỉ là bắt buộc';
      }
      if (!formData.metadata.to_date) {
        newErrors['metadata.to_date'] = 'Ngày kết thúc nghỉ là bắt buộc';
      }
      if (!formData.metadata.reason) {
        newErrors['metadata.reason'] = 'Lý do nghỉ là bắt buộc';
      }
    }

    if (formData.request_type === 'half_day_off') {
      if (!formData.metadata.from_date) {
        newErrors['metadata.from_date'] = 'Ngày nghỉ nửa ca là bắt buộc';
      }
      if (!formData.metadata.reason) {
        newErrors['metadata.reason'] = 'Lý do nghỉ là bắt buộc';
      }
    }

    if (formData.request_type === 'annual_leave') {
      if (!formData.metadata.from_date) {
        newErrors['metadata.from_date'] = 'Ngày bắt đầu nghỉ phép là bắt buộc';
      }
      if (!formData.metadata.to_date) {
        newErrors['metadata.to_date'] = 'Ngày kết thúc nghỉ phép là bắt buộc';
      }
      if (!formData.metadata.leave_days) {
        newErrors['metadata.leave_days'] = 'Số ngày nghỉ phép là bắt buộc';
      }
      if (!formData.metadata.reason) {
        newErrors['metadata.reason'] = 'Lý do nghỉ phép là bắt buộc';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await apiService.request('/api/requests', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (response.data.success) {
        alert('Gửi request thành công!');
        if (onRequestSubmitted) {
          onRequestSubmitted(response.data.data);
        }
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      console.error('Lỗi gửi request:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi gửi request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMetadataFields = () => {
    switch (formData.request_type) {
      case 'monthly_off':
        return (
          <>
            <div className="form-group">
              <label>Khoảng thời gian nghỉ *</label>
              <div className="date-range-group">
                <div className="date-input">
                  <label>Từ ngày</label>
                  <input
                    type="date"
                    value={formData.metadata.from_date}
                    onChange={(e) => handleInputChange('metadata.from_date', e.target.value)}
                    className={errors['metadata.from_date'] ? 'error' : ''}
                  />
                  {errors['metadata.from_date'] && (
                    <span className="error-message">{errors['metadata.from_date']}</span>
                  )}
                </div>
                
                <div className="date-input">
                  <label>Đến ngày</label>
                  <input
                    type="date"
                    value={formData.metadata.to_date}
                    onChange={(e) => handleInputChange('metadata.to_date', e.target.value)}
                    className={errors['metadata.to_date'] ? 'error' : ''}
                  />
                  {errors['metadata.to_date'] && (
                    <span className="error-message">{errors['metadata.to_date']}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Lý do nghỉ *</label>
              <textarea
                value={formData.metadata.reason}
                onChange={(e) => handleInputChange('metadata.reason', e.target.value)}
                placeholder="Nhập lý do nghỉ..."
                className={errors['metadata.reason'] ? 'error' : ''}
              />
              {errors['metadata.reason'] && (
                <span className="error-message">{errors['metadata.reason']}</span>
              )}
            </div>
            
            <div className="form-group">
              <label>Liên hệ khẩn cấp</label>
              <input
                type="text"
                value={formData.metadata.emergency_contact}
                onChange={(e) => handleInputChange('metadata.emergency_contact', e.target.value)}
                placeholder="Số điện thoại liên hệ khẩn cấp"
              />
            </div>
          </>
        );
        
      case 'half_day_off':
        return (
          <>
            <div className="form-group">
              <label>Ngày nghỉ nửa ca *</label>
              <input
                type="date"
                value={formData.metadata.from_date}
                onChange={(e) => handleInputChange('metadata.from_date', e.target.value)}
                className={errors['metadata.from_date'] ? 'error' : ''}
              />
              {errors['metadata.from_date'] && (
                <span className="error-message">{errors['metadata.from_date']}</span>
              )}
            </div>
            
            <div className="form-group">
              <label>Khoảng thời gian</label>
              <div className="time-range-info">
                <span className="info-text">Nửa ca: {formData.metadata.half_day_shift === 'morning' ? 'Sáng (8h-12h)' : 'Chiều (13h-17h)'}</span>
              </div>
            </div>
            
            <div className="form-group">
              <label>Ca nghỉ *</label>
              <select
                value={formData.metadata.half_day_shift}
                onChange={(e) => handleInputChange('metadata.half_day_shift', e.target.value)}
              >
                {halfDayShifts.map(shift => (
                  <option key={shift.value} value={shift.value}>
                    {shift.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Lý do nghỉ *</label>
              <textarea
                value={formData.metadata.reason}
                onChange={(e) => handleInputChange('metadata.reason', e.target.value)}
                placeholder="Nhập lý do nghỉ..."
                className={errors['metadata.reason'] ? 'error' : ''}
              />
              {errors['metadata.reason'] && (
                <span className="error-message">{errors['metadata.reason']}</span>
              )}
            </div>
          </>
        );
        
      case 'annual_leave':
        return (
          <>
            <div className="form-group">
              <label>Khoảng thời gian nghỉ phép *</label>
              <div className="date-range-group">
                <div className="date-input">
                  <label>Từ ngày</label>
                  <input
                    type="date"
                    value={formData.metadata.from_date}
                    onChange={(e) => handleInputChange('metadata.from_date', e.target.value)}
                    className={errors['metadata.from_date'] ? 'error' : ''}
                  />
                  {errors['metadata.from_date'] && (
                    <span className="error-message">{errors['metadata.from_date']}</span>
                  )}
                </div>
                
                <div className="date-input">
                  <label>Đến ngày</label>
                  <input
                    type="date"
                    value={formData.metadata.to_date}
                    onChange={(e) => handleInputChange('metadata.to_date', e.target.value)}
                    className={errors['metadata.to_date'] ? 'error' : ''}
                  />
                  {errors['metadata.to_date'] && (
                    <span className="error-message">{errors['metadata.to_date']}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Số ngày nghỉ phép *</label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.metadata.leave_days}
                onChange={(e) => handleInputChange('metadata.leave_days', e.target.value)}
                placeholder="Nhập số ngày nghỉ phép"
                className={errors['metadata.leave_days'] ? 'error' : ''}
              />
              {errors['metadata.leave_days'] && (
                <span className="error-message">{errors['metadata.leave_days']}</span>
              )}
            </div>
            
            <div className="form-group">
              <label>Lý do nghỉ phép *</label>
              <textarea
                value={formData.metadata.reason}
                onChange={(e) => handleInputChange('metadata.reason', e.target.value)}
                placeholder="Nhập lý do nghỉ phép..."
                className={errors['metadata.reason'] ? 'error' : ''}
              />
              {errors['metadata.reason'] && (
                <span className="error-message">{errors['metadata.reason']}</span>
              )}
            </div>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="request-form-overlay">
      <div className="request-form-container">
        <div className="request-form-header">
          <h2>Gửi Yêu Cầu Mới</h2>
          {onClose && (
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="request-form">
          <div className="form-group">
            <label>Loại yêu cầu *</label>
            <select
              value={formData.request_type}
              onChange={(e) => handleInputChange('request_type', e.target.value)}
            >
              {requestTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Tiêu đề yêu cầu *</label>
            <input
              type="text"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Nhập tiêu đề ngắn gọn cho yêu cầu"
              maxLength={200}
              className={errors.content ? 'error' : ''}
            />
            {errors.content && (
              <span className="error-message">{errors.content}</span>
            )}
          </div>
          
          <div className="form-group">
            <label>Mô tả chi tiết *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Mô tả chi tiết về yêu cầu của bạn..."
              rows={4}
              maxLength={1000}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && (
              <span className="error-message">{errors.description}</span>
            )}
          </div>
          
          <div className="metadata-section">
            <h3>Thông tin chi tiết</h3>
            <p className="section-description">
              Vui lòng điền đầy đủ thông tin theo loại yêu cầu bạn chọn
            </p>
            {renderMetadataFields()}
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;
