import React, { useState, useEffect, useContext } from 'react';
import { Card, Modal, Tabs, Button, DatePicker, Select, Input, message, Table, Tag, Form, Space, Typography } from 'antd';
import './UserDashboard.css';
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  PlusOutlined, 
  MinusOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  SettingOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import AuthContext from '../../contexts/AuthContext';
import RequestList from '../RequestList';
import RequestForm from '../RequestForm';



const { TabPane } = Tabs;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function UserDashboard() {
  const auth = useContext(AuthContext);
  const { user, isAuthenticated, isLoading } = auth;

  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeTab, setActiveTab] = useState('off');
  const [loading, setLoading] = useState(false);
  const [showOffForm, setShowOffForm] = useState(false);
  const [showHalfDayForm, setShowHalfDayForm] = useState(false);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [showAnnualLeaveForm, setShowAnnualLeaveForm] = useState(false);
  
  // State cho form đăng ký
  const [offForm] = Form.useForm();
  const [halfDayForm] = Form.useForm();
  const [overtimeForm] = Form.useForm();
  const [annualLeaveForm] = Form.useForm();
  
  // State cho danh sách đăng ký
  const [offRequests, setOffRequests] = useState([]);
  const [halfDayRequests, setHalfDayRequests] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [annualLeaveRequests, setAnnualLeaveRequests] = useState([]);

  // State cho edit request
  const [editingRequest, setEditingRequest] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  // Lấy tháng tiếp theo
  const getNextMonth = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    return {
      month: nextMonth.getMonth() + 1,
      year: nextMonth.getFullYear()
    };
  };

  const { month: nextMonth, year: nextYear } = getNextMonth();

  // Load danh sách đăng ký khi component mount hoặc user thay đổi
  useEffect(() => {
    console.log('🔍 useEffect - User changed:', { 
      user: !!user, 
      user_id: user?.id, 
      user_id_type: typeof user?.id,
      user_id_length: user?.id?.length,
      user_keys: user ? Object.keys(user) : [],
      isAuthenticated, 
      isLoading 
    });
    
    if (user && user.id) {
      console.log('✅ User ready, loading requests...');
      loadRequests();
    } else {
      console.log('⏳ User not ready yet...');
      if (user) {
        console.log('🔍 User object exists but no id. Keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
      }
    }
  }, [user, isAuthenticated, isLoading]);

  // Load danh sách đăng ký
  const loadRequests = async () => {
    try {
      // Debug logs chi tiết
      console.log('🔍 loadRequests - Auth state:', { 
        user: !!user, 
        user_id: user?.id, 
        user_id_type: typeof user?.id,
        user_id_length: user?.id?.length,
        user_keys: user ? Object.keys(user) : [],
        isAuthenticated, 
        isLoading 
      });
      
      // Kiểm tra user có tồn tại không
      if (!user) {
        console.log('❌ User object không tồn tại, bỏ qua loadRequests');
        return;
      }
      
      if (!user.id) {
        console.log('❌ User.id không tồn tại, bỏ qua loadRequests');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        return;
      }

      setLoading(true);
      const response = await apiService.getUserRequests(nextMonth, nextYear);
      if (response.success) {
        // Phân loại requests theo type
        const allRequests = response.data || [];
        
        // Tách biệt OFF và tăng ca
        const allMonthlyOffRequests = allRequests.filter(req => req.request_type === 'monthly_off');
        
        // Tăng ca: những request có is_overtime = true hoặc có hours hoặc reason chứa "Tăng ca"
        const overtimeRequests = allMonthlyOffRequests.filter(req => 
          req.metadata?.is_overtime === true ||
          (req.metadata?.hours && req.metadata.hours > 0) ||
          (req.metadata?.reason && req.metadata.reason.includes('Tăng ca'))
        );
        
        // OFF: những request monthly_off không phải tăng ca
        const offRequests = allMonthlyOffRequests.filter(req => 
          !overtimeRequests.includes(req)
        );
        
        const halfDayRequests = allRequests.filter(req => req.request_type === 'half_day_off');
        
        // Nghỉ phép năm: những request có request_type là annual_leave hoặc có metadata chứa "nghỉ phép năm"
        const annualLeaveRequests = allRequests.filter(req => 
          req.request_type === 'annual_leave' ||
          (req.metadata?.reason && req.metadata.reason.includes('Nghỉ phép năm'))
        );
        

        
        // Sắp xếp request theo thứ tự: chờ duyệt (mới nhất trước) -> đã duyệt -> từ chối
        const sortRequests = (requests) => {
          return requests.sort((a, b) => {
            // Ưu tiên status: pending -> approved -> rejected
            const statusOrder = { 'pending': 0, 'approved': 1, 'rejected': 2 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            
            if (statusDiff !== 0) return statusDiff;
            
            // Nếu cùng status, sắp xếp theo thời gian tạo (mới nhất trước)
            const dateA = new Date(a.created_at || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.createdAt || 0);
            return dateB - dateA;
          });
        };
        
        setOffRequests(sortRequests(offRequests));
        setHalfDayRequests(sortRequests(halfDayRequests));
        setOvertimeRequests(sortRequests(overtimeRequests));
        setAnnualLeaveRequests(sortRequests(annualLeaveRequests));
      }
    } catch (error) {
      console.error('Lỗi khi load danh sách đăng ký:', error);
      message.error('Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra giới hạn request chờ duyệt
  const checkPendingLimit = (requestType) => {
    let currentRequests;
    switch (requestType) {
      case 'monthly_off':
        currentRequests = offRequests;
        break;
      case 'half_day_off':
        currentRequests = halfDayRequests;
        break;
      case 'overtime':
        currentRequests = overtimeRequests;
        break;
      case 'annual_leave':
        currentRequests = annualLeaveRequests;
        break;
      default:
        return false;
    }
    
    const pendingCount = currentRequests.filter(req => req.status === 'pending').length;
    return pendingCount >= 2;
  };

  // Kiểm tra ngày đã được đăng ký OFF chưa (frontend only)
  const checkOffDateConflict = (targetDates, excludeRequestId = null) => {
    // Kiểm tra trong danh sách requests hiện tại
    for (const date of targetDates) {
      // Kiểm tra trong offRequests
      const existingOffRequest = offRequests.find(req => {
        // Bỏ qua request đang được edit
        if (excludeRequestId && req._id === excludeRequestId) {
          return false;
        }
        
        // Chỉ kiểm tra OFF và OFF nửa ca
        if (req.request_type !== 'monthly_off' && req.request_type !== 'half_day_off') {
          return false;
        }
        
        // Chỉ kiểm tra request chưa bị từ chối/hủy
        if (req.status === 'rejected' || req.status === 'cancelled') {
          return false;
        }
        
        // Kiểm tra cùng ngày
        const reqDate = req.metadata?.from_date;
        if (reqDate) {
          const existingDate = new Date(reqDate).toISOString().split('T')[0];
          return existingDate === date;
        }
        
        return false;
      });
      
      if (existingOffRequest) {
        let message = '';
        if (existingOffRequest.status === 'pending') {
          message = `Bạn đã đăng ký OFF ngày ${date} rồi và đang chờ duyệt`;
        } else if (existingOffRequest.status === 'approved') {
          message = `Bạn đã được duyệt OFF ngày ${date} rồi`;
        } else {
          message = `Ngày ${date} không khả dụng`;
        }
        return { hasConflict: true, message, conflictingDate: date };
      }
      
      // Kiểm tra trong overtimeRequests
      const existingOvertimeRequest = overtimeRequests.find(req => {
        // Bỏ qua request đang được edit
        if (excludeRequestId && req._id === excludeRequestId) {
          return false;
        }
        
        // Chỉ kiểm tra request chưa bị từ chối/hủy
        if (req.status === 'rejected' || req.status === 'cancelled') {
          return false;
        }
        
        // Kiểm tra cùng ngày
        const reqDate = req.metadata?.from_date;
        if (reqDate) {
          const existingDate = new Date(reqDate).toISOString().split('T')[0];
          return existingDate === date;
        }
        
        return false;
      });
      
      if (existingOvertimeRequest) {
        let message = '';
        if (existingOvertimeRequest.status === 'pending') {
          message = `Bạn đã đăng ký tăng ca ngày ${date} rồi và đang chờ duyệt`;
        } else if (existingOvertimeRequest.status === 'approved') {
          message = `Bạn đã được duyệt tăng ca ngày ${date} rồi`;
        } else {
          message = `Ngày ${date} không khả dụng`;
        }
        return { hasConflict: true, message, conflictingDate: date };
      }
      

    }
    
    return { hasConflict: false };
  };

  // Xử lý đăng ký OFF
  const handleOffSubmit = async (values) => {
    try {
      // Debug logs chi tiết
      console.log('🔍 handleOffSubmit - Auth state:', { 
        user: !!user, 
        user_id: user?.id, 
        user_id_type: typeof user?.id,
        user_id_length: user?.id?.length,
        user_keys: user ? Object.keys(user) : [],
        isAuthenticated, 
        isLoading 
      });
      
      // Kiểm tra user có tồn tại không
      if (!user) {
        console.log('❌ User object không tồn tại');
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }
      
      if (!user.id) {
        console.log('❌ User.id không tồn tại');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }

      // Kiểm tra giới hạn request chờ duyệt
      if (checkPendingLimit('monthly_off')) {
        message.warning('Đã có lịch chờ duyệt! Bạn chỉ được tạo tối đa 2 yêu cầu OFF đang chờ duyệt. Vui lòng hủy yêu cầu cũ hoặc chờ duyệt xong.');
        return;
      }

      const { date1, date2, reason1, reason2 } = values;
      
      // Tạo mảng dates và reasons từ 2 ngày riêng biệt
      const dates = [date1];
      const reasons = [reason1 || 'Ngày bình thường'];
      
      if (date2) {
        dates.push(date2);
        reasons.push(reason2 || 'Ngày bình thường');
      }

      if (dates.length > 2) {
        message.error('Chỉ được chọn tối đa 2 ngày OFF');
        return;
      }

      // Kiểm tra trùng ngày trước khi gửi
      const targetDates = dates.map(date => date.format('YYYY-MM-DD'));
      const conflictCheck = checkOffDateConflict(targetDates);
      if (conflictCheck.hasConflict) {
        message.error(conflictCheck.message);
        return;
      }

      console.log('🔍 Debug userId:', { 
        userId: user.id, 
        userObject: user,
        hasUserId: !!user.id,
        userIdType: typeof user.id
      });
      
      const requestData = {
        userId: user.id,
        dates: dates.map(date => date.format('YYYY-MM-DD')),
        reasons: reasons,
        month: nextMonth,
        year: nextYear
      };

      const response = await apiService.submitOffRequest(requestData);
      
      if (response.success) {
        message.success('Đã gửi đăng ký OFF thành công!');
        offForm.resetFields();
        setShowOffForm(false);
        loadRequests();
      } else {
        // Hiển thị thông báo lỗi chi tiết
        if (response.message) {
          message.error(response.message);
        } else if (response.error) {
          message.error(response.error);
        } else {
          message.error('Có lỗi xảy ra khi gửi đăng ký');
        }
      }
    } catch (error) {
      console.error('Lỗi khi gửi đăng ký OFF:', error);
      message.error('Có lỗi xảy ra khi gửi đăng ký');
    }
  };

  // Xử lý đăng ký OFF nửa ca
  const handleHalfDaySubmit = async (values) => {
    try {
      // Debug logs chi tiết
      console.log('🔍 handleHalfDaySubmit - Auth state:', { 
        user: !!user, 
        user_id: user?.id, 
        user_id_type: typeof user?.id,
        user_id_length: user?.id?.length,
        user_keys: user ? Object.keys(user) : [],
        isAuthenticated, 
        isLoading 
      });
      
      // Kiểm tra user có tồn tại không
      if (!user) {
        console.log('❌ User object không tồn tại');
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }
      
      if (!user.id) {
        console.log('❌ User.id không tồn tại');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }

      // Kiểm tra giới hạn request chờ duyệt
      if (checkPendingLimit('half_day_off')) {
        message.warning('Đã có lịch chờ duyệt! Bạn chỉ được tạo tối đa 2 yêu cầu OFF nửa ca đang chờ duyệt. Vui lòng hủy yêu cầu cũ hoặc chờ duyệt xong.');
        return;
      }

      const { date, shift, note } = values;
      
      // Kiểm tra trùng ngày trước khi gửi
      const targetDate = date.format('YYYY-MM-DD');
      const conflictCheck = checkOffDateConflict([targetDate]);
      if (conflictCheck.hasConflict) {
        message.error(conflictCheck.message);
        return;
      }
      
      const requestData = {
        userId: user.id,
        date: date.format('YYYY-MM-DD'),
        halfDayShift: shift,
        reason: note || 'Ngày bình thường', // Sử dụng giá trị mặc định nếu không có ghi chú
        month: nextMonth,
        year: nextYear
      };

      const response = await apiService.submitHalfDayRequest(requestData);
      
      if (response.success) {
        message.success('Đã gửi đăng ký OFF nửa ca thành công!');
        halfDayForm.resetFields();
        setShowHalfDayForm(false);
        loadRequests();
      } else {
        // Hiển thị thông báo lỗi chi tiết
        if (response.message) {
          message.error(response.message);
        } else if (response.error) {
          message.error(response.error);
        } else {
          message.error('Có lỗi xảy ra khi gửi đăng ký');
        }
      }
    } catch (error) {
      console.error('Lỗi khi gửi đăng ký OFF nửa ca:', error);
      message.error('Có lỗi xảy ra khi gửi đăng ký');
    }
  };

  // Xử lý đăng ký nghỉ phép năm
  const handleAnnualLeaveSubmit = async (values) => {
    try {
      // Debug logs chi tiết
      console.log('🔍 handleAnnualLeaveSubmit - Auth state:', { 
        user: !!user, 
        user_id: user?.id, 
        user_id_type: typeof user?.id,
        user_id_length: user?.id?.length,
        user_keys: user ? Object.keys(user) : [],
        isAuthenticated, 
        isLoading 
      });
      
      // Kiểm tra user có tồn tại không
      if (!user) {
        console.log('❌ User object không tồn tại');
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }
      
      if (!user.id) {
        console.log('❌ User.id không tồn tại');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }

      // Kiểm tra giới hạn request chờ duyệt
      if (checkPendingLimit('annual_leave')) {
        message.warning('Đã có lịch chờ duyệt! Bạn chỉ được tạo tối đa 2 yêu cầu nghỉ phép năm đang chờ duyệt. Vui lòng hủy yêu cầu cũ hoặc chờ duyệt xong.');
        return;
      }

      const { leaveDate, reason } = values;
      
      // Tính toán 17 ngày nghỉ phép từ ngày user chọn
      const startDate = leaveDate.format('YYYY-MM-DD');
      const endDate = leaveDate.add(16, 'day').format('YYYY-MM-DD'); // 17 ngày nghỉ phép
      
      const requestData = {
        userId: user.id,
        startDate: startDate,
        endDate: endDate,
        reason: reason || 'Nghỉ phép năm',
        month: nextMonth,
        year: nextYear
      };

      const response = await apiService.submitAnnualLeaveRequest(requestData);
      
      if (response.success) {
        message.success('Đã gửi đăng ký nghỉ phép năm thành công!');
        annualLeaveForm.resetFields();
        setShowAnnualLeaveForm(false);
        loadRequests();
      } else {
        // Hiển thị thông báo lỗi chi tiết
        if (response.message) {
          message.error(response.message);
        } else if (response.error) {
          message.error(response.error);
        } else {
          message.error('Có lỗi xảy ra khi gửi đăng ký');
        }
      }
    } catch (error) {
      console.error('Lỗi khi gửi đăng ký nghỉ phép năm:', error);
      message.error('Có lỗi xảy ra khi gửi đăng ký');
    }
  };

  // Xử lý đăng ký tăng ca
  const handleOvertimeSubmit = async (values) => {
    try {
      // Debug logs chi tiết
      console.log('🔍 handleOvertimeSubmit - Auth state:', { 
        user: !!user, 
        user_id: user?.id, 
        user_id_type: typeof user?.id,
        user_id_length: user?.id?.length,
        user_keys: user ? Object.keys(user) : [],
        isAuthenticated, 
        isLoading 
      });
      
      // Kiểm tra user có tồn tại không
      if (!user) {
        console.log('❌ User object không tồn tại');
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }
      
      if (!user.id) {
        console.log('❌ User.id không tồn tại');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }

      // Kiểm tra giới hạn request chờ duyệt
      if (checkPendingLimit('overtime')) {
        message.warning('Đã có lịch chờ duyệt! Bạn chỉ được tạo tối đa 2 yêu cầu tăng ca đang chờ duyệt. Vui lòng hủy yêu cầu cũ hoặc chờ duyệt xong.');
        return;
      }

      const { date, note } = values;
      
      // Kiểm tra trùng ngày trước khi gửi
      const targetDate = date.format('YYYY-MM-DD');
      const conflictCheck = checkOffDateConflict([targetDate]);
      if (conflictCheck.hasConflict) {
        message.error(conflictCheck.message);
        return;
      }
      
      const requestData = {
        userId: user.id,
        date: date.format('YYYY-MM-DD'),
        reason: note || 'Tăng ca', // Sử dụng giá trị mặc định nếu không có ghi chú
        month: nextMonth,
        year: nextYear
      };

      const response = await apiService.submitOvertimeRequest(requestData);
      
      if (response.success) {
        message.success('Đã gửi đăng ký tăng ca thành công!');
        overtimeForm.resetFields();
        setShowOvertimeForm(false);
        loadRequests();
      } else {
        // Hiển thị thông báo lỗi chi tiết
        if (response.message) {
          message.error(response.message);
        } else if (response.error) {
          message.error(response.error);
        } else {
          message.error('Có lỗi xảy ra khi gửi đăng ký');
        }
      }
    } catch (error) {
      console.error('Lỗi khi gửi đăng ký tăng ca:', error);
      message.error('Có lỗi xảy ra khi gửi đăng ký');
    }
  };

  // Xử lý edit request OFF
  const handleEditOff = (record) => {
    // Chỉ cho phép edit khi status là pending
    if (record.status !== 'pending') {
      message.warning('Chỉ có thể chỉnh sửa yêu cầu đang chờ duyệt');
      return;
    }
    
    // Mở modal edit
    setEditingRequest(record);
    setShowEditModal(true);
    
    // Set giá trị mặc định cho form
    editForm.setFieldsValue({
      date: record.metadata?.from_date ? dayjs(record.metadata.from_date) : null,
      reason: record.description || ''
    });
  };

  // Xử lý delete request OFF
  const handleDeleteOff = async (record) => {
    try {
      // Chỉ cho phép delete khi status là pending
      if (record.status !== 'pending') {
        message.warning('Chỉ có thể hủy yêu cầu đang chờ duyệt');
        return;
      }

      // Xác nhận trước khi xóa
      const confirmed = window.confirm('Bạn có chắc chắn muốn hủy yêu cầu này?');
      if (!confirmed) return;

      // Gọi API xóa request
      const response = await apiService.deleteRequest(record._id);
      
      if (response.success) {
        message.success('Đã hủy yêu cầu thành công!');
        // Reload danh sách request
        loadRequests();
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi hủy yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi khi hủy yêu cầu:', error);
      message.error('Có lỗi xảy ra khi hủy yêu cầu');
    }
  };

  // Xử lý edit request OFF nửa ca
  const handleEditHalfDay = (record) => {
    // Chỉ cho phép edit khi status là pending
    if (record.status !== 'pending') {
      message.warning('Chỉ có thể chỉnh sửa yêu cầu đang chờ duyệt');
      return;
    }
    
    // Mở modal edit
    setEditingRequest(record);
    setShowEditModal(true);
    
    // Set giá trị mặc định cho form
    editForm.setFieldsValue({
      date: record.metadata?.from_date ? dayjs(record.metadata.from_date) : null,
      reason: record.description || '',
      shift: record.metadata?.half_day_shift || 'morning'
    });
  };

  // Xử lý delete request OFF nửa ca
  const handleDeleteHalfDay = async (record) => {
    try {
      // Chỉ cho phép delete khi status là pending
      if (record.status !== 'pending') {
        message.warning('Chỉ có thể hủy yêu cầu đang chờ duyệt');
        return;
      }

      // Xác nhận trước khi xóa
      const confirmed = window.confirm('Bạn có chắc chắn muốn hủy yêu cầu này?');
      if (!confirmed) return;

      // Gọi API xóa request
      const response = await apiService.deleteRequest(record._id);
      
      if (response.success) {
        message.success('Đã hủy yêu cầu thành công!');
        // Reload danh sách request
        loadRequests();
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi hủy yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi khi hủy yêu cầu:', error);
      message.error('Có lỗi xảy ra khi hủy yêu cầu');
    }
  };

  // Xử lý edit request tăng ca
  const handleEditOvertime = (record) => {
    // Chỉ cho phép edit khi status là pending
    if (record.status !== 'pending') {
      message.warning('Chỉ có thể chỉnh sửa yêu cầu đang chờ duyệt');
      return;
    }
    
    // Mở modal edit
    setEditingRequest(record);
    setShowEditModal(true);
    
    // Set giá trị mặc định cho form
    editForm.setFieldsValue({
      date: record.metadata?.from_date ? dayjs(record.metadata.from_date) : null,
      reason: record.description || ''
    });
  };

  // Xử lý delete request tăng ca
  const handleDeleteOvertime = async (record) => {
    try {
      // Chỉ cho phép delete khi status là pending
      if (record.status !== 'pending') {
        message.warning('Chỉ có thể hủy yêu cầu đang chờ duyệt');
        return;
      }

      // Xác nhận trước khi xóa
      const confirmed = window.confirm('Bạn có chắc chắn muốn hủy yêu cầu này?');
      if (!confirmed) return;

      // Gọi API xóa request
      const response = await apiService.deleteRequest(record._id);
      
      if (response.success) {
        message.success('Đã hủy yêu cầu thành công!');
        // Reload danh sách request
        loadRequests();
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi hủy yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi khi hủy yêu cầu:', error);
      message.error('Có lỗi xảy ra khi hủy yêu cầu');
    }
  };

  // Xử lý submit form edit
  const handleEditSubmit = async (values) => {
    if (!editingRequest) return;
    
    try {
      setEditLoading(true);
      
      // Kiểm tra trùng ngày trước khi cập nhật
      const newDate = values.date.format('YYYY-MM-DD');
      const oldDate = editingRequest.metadata?.from_date;
      
      // Chỉ kiểm tra nếu ngày thay đổi
      if (newDate !== oldDate) {
        const requestId = editingRequest._id || editingRequest.id;
        const conflictCheck = checkOffDateConflict([newDate], requestId);
        if (conflictCheck.hasConflict) {
          message.error(conflictCheck.message);
          setEditLoading(false);
          return;
        }
      }
      
      let updateData = {};
      
      // Xác định loại request và cập nhật dữ liệu tương ứng
      if (editingRequest.request_type === 'monthly_off') {
        updateData = {
          description: values.reason || 'Ngày bình thường',
          metadata: {
            ...editingRequest.metadata,
            from_date: values.date.format('YYYY-MM-DD'),
            to_date: values.date.format('YYYY-MM-DD'),
            reason: values.reason || 'Ngày bình thường'
          }
        };
      } else if (editingRequest.request_type === 'half_day_off') {
        updateData = {
          description: values.reason || 'Ngày bình thường',
          metadata: {
            ...editingRequest.metadata,
            from_date: values.date.format('YYYY-MM-DD'),
            half_day_shift: values.shift,
            reason: values.reason || 'Ngày bình thường'
          }
        };
      } else if (editingRequest.request_type === 'monthly_off' && 
                 (editingRequest.metadata?.is_overtime || 
                  editingRequest.metadata?.reason?.includes('Tăng ca') ||
                  editingRequest.content?.includes('tăng ca'))) {
        // Tăng ca - đảm bảo giữ nguyên trạng thái tăng ca
        updateData = {
          description: values.reason || 'Tăng ca',
          metadata: {
            ...editingRequest.metadata,
            from_date: values.date.format('YYYY-MM-DD'),
            to_date: values.date.format('YYYY-MM-DD'),
            reason: values.reason || 'Tăng ca',
            is_overtime: true // Đảm bảo vẫn là tăng ca
          }
        };
      }
      
      // Gọi API cập nhật - sử dụng cả _id và id để đảm bảo tương thích
      const requestId = editingRequest._id || editingRequest.id;
      console.log('🔍 Debug edit request:', { 
        requestId, 
        editingRequest, 
        updateData 
      });
      
      const response = await apiService.updateRequest(requestId, updateData);
      
      if (response.success) {
        message.success('Đã cập nhật yêu cầu thành công!');
        setShowEditModal(false);
        setEditingRequest(null);
        editForm.resetFields();
        loadRequests(); // Reload danh sách
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi cập nhật');
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật yêu cầu:', error);
      message.error('Có lỗi xảy ra khi cập nhật yêu cầu');
    } finally {
      setEditLoading(false);
    }
  };

  // Xử lý edit request nghỉ phép năm
  const handleEditAnnualLeave = (record) => {
    // Chỉ cho phép edit khi status là pending
    if (record.status !== 'pending') {
      message.warning('Chỉ có thể chỉnh sửa yêu cầu đang chờ duyệt');
      return;
    }
    
    // Mở modal edit
    setEditingRequest(record);
    setShowEditModal(true);
    
    // Set giá trị mặc định cho form
    editForm.setFieldsValue({
      date: record.metadata?.from_date ? dayjs(record.metadata.from_date) : null,
      reason: record.description || ''
    });
  };

  // Xử lý delete request nghỉ phép năm
  const handleDeleteAnnualLeave = async (record) => {
    try {
      // Chỉ cho phép delete khi status là pending
      if (record.status !== 'pending') {
        message.warning('Chỉ có thể hủy yêu cầu đang chờ duyệt');
        return;
      }

      // Xác nhận trước khi xóa
      const confirmed = window.confirm('Bạn có chắc chắn muốn hủy yêu cầu này?');
      if (!confirmed) return;

      // Gọi API xóa request
      const response = await apiService.deleteRequest(record._id);
      
      if (response.success) {
        message.success('Đã hủy yêu cầu thành công!');
        // Reload danh sách request
        loadRequests();
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi hủy yêu cầu');
      }
    } catch (error) {
      console.error('Lỗi khi hủy yêu cầu:', error);
      message.error('Có lỗi xảy ra khi hủy yêu cầu');
    }
  };

  // Cột cho bảng OFF
  const offColumns = [
    {
      title: 'Ngày OFF',
      dataIndex: 'metadata',
      key: 'date',
      width: 120,
      render: (metadata, record) => {
        if (metadata?.from_date) {
          const date = new Date(metadata.from_date);
          const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
          const dateStr = date.toLocaleDateString('vi-VN');
          
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1890ff',
                marginBottom: '4px'
              }}>
                {date.getDate()}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginBottom: '2px'
              }}>
                {date.getMonth() + 1}/{date.getFullYear()}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#999',
                textTransform: 'capitalize'
              }}>
                {dayOfWeek}
              </div>
              {metadata?.date_index && metadata?.total_days > 1 && (
                <Tag size="small" color="blue" style={{ marginTop: '4px' }}>
                  Ngày {metadata.date_index}/{metadata.total_days}
                </Tag>
              )}
            </div>
          );
        }
        return <Text type="secondary">Không có ngày</Text>;
      }
    },
    {
      title: 'Lý do OFF',
      dataIndex: 'description',
      key: 'reason',
      width: 200,
      render: (reason, record) => {
        return (
          <div style={{ padding: '8px' }}>
            <Text style={{ fontSize: '14px' }}>
              {reason || 'Không có lý do'}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        if (status === 'approved') {
          return (
            <Tag 
              icon={<CheckCircleOutlined />} 
              color="success"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Đồng ý
            </Tag>
          );
        } else if (status === 'rejected') {
          return (
            <Tag 
              icon={<CloseCircleOutlined />} 
              color="error"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Từ chối
            </Tag>
          );
        } else {
          return (
            <Tag 
              color="processing"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Chờ duyệt
            </Tag>
          );
        }
      }
    },
    {
      title: 'Ghi chú Admin',
      dataIndex: 'admin_note',
      key: 'adminNote',
      width: 150,
      render: (note, record) => {
        if (record.status === 'rejected' && note) {
          return (
            <div style={{ padding: '8px' }}>
              <Text type="danger" style={{ fontSize: '12px' }}>
                {note}
              </Text>
            </div>
          );
        }
        return (
          <div style={{ padding: '8px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {note || '-'}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => {
        const canEdit = record.status === 'pending';
        const canDelete = record.status === 'pending';
        
        return (
          <Space size="small">
            {canEdit && (
              <Button
                type="primary"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleEditOff(record)}
                title="Chỉnh sửa"
              >
                Sửa
              </Button>
            )}
            {canDelete && (
              <Button
                type="default"
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleDeleteOff(record)}
                title="Hủy yêu cầu"
                danger
              >
                Hủy
              </Button>
            )}
            {!canEdit && !canDelete && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Không thể thay đổi
              </Text>
            )}
          </Space>
        );
      }
    }
  ];

  // Cột cho bảng OFF nửa ca
  const halfDayColumns = [
    {
      title: 'Ngày OFF',
      dataIndex: 'metadata',
      key: 'date',
      width: 120,
      render: (metadata, record) => {
        if (metadata?.from_date) {
          const date = new Date(metadata.from_date);
          const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
          
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#fa8c16',
                marginBottom: '4px'
              }}>
                {date.getDate()}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginBottom: '2px'
              }}>
                {date.getMonth() + 1}/{date.getFullYear()}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#999',
                textTransform: 'capitalize'
              }}>
                {dayOfWeek}
              </div>
            </div>
          );
        }
        return <Text type="secondary">Không có ngày</Text>;
      }
    },
    {
      title: 'Thời gian',
      dataIndex: 'metadata',
      key: 'halfDayType',
      width: 180,
      render: (metadata, record) => {
        const shift = metadata?.half_day_shift;
        const requestType = record.request_type;
        
        // Xác định loại OFF nửa ca
        let typeText = '';
        let typeColor = '';
        let typeIcon = '';
        
        if (requestType === 'half_day_off') {
          // Kiểm tra metadata để xác định loại
          if (metadata?.half_day_type === 'no_salary') {
            typeText = 'Không lương';
            typeColor = 'red';
            typeIcon = '💸';
          } else if (metadata?.half_day_type === 'special') {
            typeText = 'Đặc biệt';
            typeColor = 'blue';
            typeIcon = '⭐';
          } else {
            typeText = 'Nửa ca';
            typeColor = 'default';
            typeIcon = '⏰';
          }
        }
        
        // Xác định thời gian
        let shiftText = '';
        let shiftIcon = '';
        let shiftColor = '';
        
        if (shift === 'morning') {
          shiftText = 'Nửa ca đầu';
          shiftIcon = '☀️';
          shiftColor = 'orange';
        } else if (shift === 'afternoon') {
          shiftText = 'Nửa ca sau';
          shiftIcon = '🌙';
          shiftColor = 'purple';
        }
        
        return (
          <div style={{ textAlign: 'center' }}>
            <Tag 
              color={shiftColor}
              style={{ 
                fontSize: '12px', 
                padding: '6px 12px',
                borderRadius: '12px',
                fontWeight: '600',
                border: `2px solid ${shiftColor === 'orange' ? '#fa8c16' : '#722ed1'}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {shiftIcon} {shiftText}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'description',
      key: 'note',
      width: 200,
      ellipsis: true,
      render: (note, record) => {
        return (
          <div style={{ padding: '8px' }}>
            <Text style={{ fontSize: '14px' }}>
              {note || 'Không có ghi chú'}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        if (status === 'approved') {
          return (
            <Tag 
              icon={<CheckCircleOutlined />} 
              color="success"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Đồng ý
            </Tag>
          );
        } else if (status === 'rejected') {
          return (
            <Tag 
              icon={<CloseCircleOutlined />} 
              color="error"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Từ chối
            </Tag>
          );
        } else {
          return (
            <Tag 
              color="processing"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Chờ duyệt
            </Tag>
          );
        }
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => {
        const canEdit = record.status === 'pending';
        const canDelete = record.status === 'pending';
        
        return (
          <Space size="small">
            {canEdit && (
              <Button
                type="primary"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleEditHalfDay(record)}
                title="Chỉnh sửa"
              >
                Sửa
              </Button>
            )}
            {canDelete && (
              <Button
                type="default"
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleDeleteHalfDay(record)}
                title="Hủy yêu cầu"
                danger
              >
                Hủy
              </Button>
            )}
            {!canEdit && !canDelete && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Không thể thay đổi
              </Text>
            )}
          </Space>
        );
      }
    }
  ];

  // Cột cho bảng nghỉ phép năm
  const annualLeaveColumns = [
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'metadata',
      key: 'startDate',
      width: 120,
      render: (metadata, record) => {
        if (metadata?.from_date) {
          const date = new Date(metadata.from_date);
          const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
          
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#722ed1',
                marginBottom: '4px'
              }}>
                {date.getDate()}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginBottom: '2px'
              }}>
                {date.getMonth() + 1}/{date.getFullYear()}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#999',
                textTransform: 'capitalize'
              }}>
                {dayOfWeek}
              </div>
            </div>
          );
        }
        return <Text type="secondary">Không có ngày</Text>;
      }
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'metadata',
      key: 'endDate',
      width: 120,
      render: (metadata, record) => {
        if (metadata?.to_date) {
          const date = new Date(metadata.to_date);
          const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
          
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#722ed1',
                marginBottom: '4px'
              }}>
                {date.getDate()}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginBottom: '2px'
              }}>
                {date.getMonth() + 1}/{date.getFullYear()}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#999',
                textTransform: 'capitalize'
              }}>
                {dayOfWeek}
              </div>
            </div>
          );
        }
        return <Text type="secondary">Không có ngày</Text>;
      }
    },
    {
      title: 'Số ngày',
      dataIndex: 'metadata',
      key: 'duration',
      width: 80,
      render: (metadata, record) => {
        if (metadata?.leave_days) {
          return (
            <Tag color="purple" style={{ fontSize: '12px', padding: '4px 8px' }}>
              {metadata.leave_days} ngày
            </Tag>
          );
        } else if (metadata?.from_date && metadata?.to_date) {
          const startDate = new Date(metadata.from_date);
          const endDate = new Date(metadata.to_date);
          const diffTime = Math.abs(endDate - startDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          return (
            <Tag color="purple" style={{ fontSize: '12px', padding: '4px 8px' }}>
              {diffDays} ngày
            </Tag>
          );
        }
        return <Text type="secondary">-</Text>;
      }
    },
    {
      title: 'Lý do',
      dataIndex: 'description',
      key: 'reason',
      width: 200,
      ellipsis: true,
      render: (reason, record) => {
        return (
          <div style={{ padding: '8px' }}>
            <Text style={{ fontSize: '14px' }}>
              {reason || 'Không có lý do'}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        if (status === 'approved') {
          return (
            <Tag 
              icon={<CheckCircleOutlined />} 
              color="success"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Đồng ý
            </Tag>
          );
        } else if (status === 'rejected') {
          return (
            <Tag 
              icon={<CloseCircleOutlined />} 
              color="error"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Từ chối
            </Tag>
          );
        } else {
          return (
            <Tag 
              icon={<ClockCircleOutlined />} 
              color="processing"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Chờ duyệt
            </Tag>
          );
        }
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditAnnualLeave(record)}
                style={{ padding: '0', height: 'auto' }}
              >
                Sửa
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteAnnualLeave(record)}
                style={{ padding: '0', height: 'auto' }}
              >
                Hủy
              </Button>
            </Space>
          );
        }
        return <Text type="secondary">-</Text>;
      }
    }
  ];

  // Cột cho bảng tăng ca
  const overtimeColumns = [
    {
      title: 'Ngày Tăng ca',
      dataIndex: 'metadata',
      key: 'date',
      width: 120,
      render: (metadata, record) => {
        if (metadata?.from_date) {
          const date = new Date(metadata.from_date);
          const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });
          
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#52c41a',
                marginBottom: '4px'
              }}>
                {date.getDate()}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginBottom: '2px'
              }}>
                {date.getMonth() + 1}/{date.getFullYear()}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#999',
                textTransform: 'capitalize'
              }}>
                {dayOfWeek}
              </div>
            </div>
          );
        }
        return <Text type="secondary">Không có ngày</Text>;
      }
    },

    {
      title: 'Ghi chú',
      dataIndex: 'description',
      key: 'note',
      width: 200,
      ellipsis: true,
      render: (note, record) => {
        return (
          <div style={{ padding: '8px' }}>
            <Text style={{ fontSize: '14px' }}>
              {note || 'Không có ghi chú'}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        if (status === 'approved') {
          return (
            <Tag 
              icon={<CheckCircleOutlined />} 
              color="success"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Đồng ý
            </Tag>
          );
        } else if (status === 'rejected') {
          return (
            <Tag 
              icon={<CloseCircleOutlined />} 
              color="error"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Từ chối
            </Tag>
          );
        } else {
          return (
            <Tag 
              color="processing"
              style={{ 
                fontSize: '12px', 
                padding: '4px 8px',
                borderRadius: '12px'
              }}
            >
              Chờ duyệt
            </Tag>
          );
        }
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => {
        const canEdit = record.status === 'pending';
        const canDelete = record.status === 'pending';
        
        return (
          <Space size="small">
            {canEdit && (
              <Button
                type="primary"
                size="small"
                icon={<SettingOutlined />}
                onClick={() => handleEditOvertime(record)}
                title="Chỉnh sửa"
              >
                Sửa
              </Button>
            )}
            {canDelete && (
              <Button
                type="default"
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={() => handleDeleteOvertime(record)}
                title="Hủy yêu cầu"
                danger
              >
                Hủy
              </Button>
            )}
            {!canEdit && !canDelete && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Không thể thay đổi
              </Text>
            )}
          </Space>
        );
      }
    }
  ];

  // Loading state cho auth
  if (isLoading) {
    return (
      <div className="user-dashboard">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Đang kiểm tra quyền truy cập...</h2>
          <p>Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  // Error state cho auth
  if (!isAuthenticated) {
    return (
      <div className="user-dashboard">
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <h2>❌ Không thể xác thực</h2>
          <p>Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn</p>
          <p>Vui lòng đăng nhập lại</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">

      
      {/* Header */}
      <div className="user-header">
        <h1>Chào mừng bạn trở lại!</h1>
        <p>Quản lý lịch làm việc cá nhân của bạn</p>
      </div>

      {/* Feature Grid */}
      <div className="user-content">
        <div className="feature-grid">
          {/* Ô Đăng ký lịch - Chính */}
          <div className="feature-card main-feature" onClick={() => setShowScheduleModal(true)}>
            <div className="feature-icon" style={{ color: '#52c41a' }}>
              <CalendarOutlined />
            </div>
            <h3>Đăng ký lịch</h3>
            <p>Gửi yêu cầu nghỉ OFF tháng, OFF nửa ca, nghỉ phép năm...</p>
          </div>

          {/* Ô Xem lịch cá nhân */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#1890ff' }}>
              <UserOutlined />
            </div>
            <h3>Lịch cá nhân</h3>
            <p>Xem lịch làm việc và yêu cầu đã gửi</p>
          </div>

          {/* Ô Thông báo */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#13c2c2' }}>
              <ClockCircleOutlined />
            </div>
            <h3>Thông báo</h3>
            <p>Xem thông báo về yêu cầu của bạn</p>
          </div>

          {/* Ô Hỗ trợ */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#fa8c16' }}>
              <FileTextOutlined />
            </div>
            <h3>Hỗ trợ</h3>
            <p>Hướng dẫn sử dụng và liên hệ hỗ trợ</p>
          </div>
        </div>

        {/* Quick Info Section */}
        <div className="quick-info">
          <div className="info-card">
            <h3>Hướng dẫn sử dụng</h3>
            <p>🎯 <strong>Đăng ký lịch:</strong> Click vào ô "Đăng ký lịch làm việc" để gửi yêu cầu</p>
            <p>📋 <strong>Xem trạng thái:</strong> Kiểm tra yêu cầu đã gửi trong tab tương ứng</p>
            <p>⏰ <strong>Thời gian xử lý:</strong> Yêu cầu sẽ được xử lý trong vòng 24-48 giờ</p>
          </div>
        </div>
      </div>

      {/* Modal Đăng ký lịch - Hệ thống Request mới */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <CalendarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
            Quản lý yêu cầu lịch làm việc
          </div>
        }
        open={showScheduleModal}
        onCancel={() => setShowScheduleModal(false)}
        footer={null}
        width={1400}
        style={{ top: 20 }}
      >
        <div style={{ padding: '20px 0' }}>
          <Tabs defaultActiveKey="off" onChange={setActiveTab}>
            {/* Tab Đăng ký OFF */}
            <TabPane 
              tab={
                <span>
                  <MinusOutlined />
                  Đăng ký OFF
                </span>
              } 
              key="off"
            >
              <div style={{ marginBottom: '20px' }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setShowOffForm(true)}
                  style={{ marginBottom: '16px' }}
                >
                  Thêm yêu cầu OFF mới
                </Button>
                
                <Table 
                  dataSource={offRequests} 
                  columns={offColumns} 
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </div>
            </TabPane>

            {/* Tab Đăng ký OFF nửa ca */}
            <TabPane 
              tab={
                <span>
                  <ClockCircleOutlined />
                  OFF nửa ca
                </span>
              } 
              key="halfday"
            >
              <div style={{ marginBottom: '20px' }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setShowHalfDayForm(true)}
                  style={{ marginBottom: '16px' }}
                >
                  Thêm yêu cầu OFF nửa ca mới
                </Button>
                
                <Table 
                  dataSource={halfDayRequests} 
                  columns={halfDayColumns} 
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </div>
            </TabPane>

            {/* Tab Đăng ký tăng ca */}
            <TabPane 
              tab={
                <span>
                  <PlusOutlined />
                  Tăng ca
                </span>
              } 
              key="overtime"
            >
              <div style={{ marginBottom: '20px' }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setShowOvertimeForm(true)}
                  style={{ marginBottom: '16px' }}
                >
                  Thêm yêu cầu tăng ca mới
                </Button>
                
                <Table 
                  dataSource={overtimeRequests} 
                  columns={overtimeColumns} 
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </div>
            </TabPane>

            {/* Tab Đăng ký nghỉ phép năm */}
            <TabPane 
              tab={
                <span>
                  <CalendarOutlined />
                  Nghỉ phép năm
                </span>
              } 
              key="annualleave"
            >
              <div style={{ marginBottom: '20px' }}>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => setShowAnnualLeaveForm(true)}
                  style={{ marginBottom: '16px' }}
                >
                  Thêm yêu cầu nghỉ phép năm mới
                </Button>
                
                <Table 
                  dataSource={annualLeaveRequests} 
                  columns={annualLeaveColumns} 
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </div>
            </TabPane>
          </Tabs>
        </div>
      </Modal>

      {/* Modal Form đăng ký OFF */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <MinusOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
            Đăng ký OFF
          </div>
        }
        open={showOffForm}
        onCancel={() => setShowOffForm(false)}
        footer={null}
        width={600}
      >
        <Form
          form={offForm}
          layout="vertical"
          onFinish={handleOffSubmit}
          style={{ padding: '20px 0' }}
        >
          <Form.Item
            label="Ngày OFF thứ nhất"
            name="date1"
            rules={[{ required: true, message: 'Vui lòng chọn ngày OFF thứ nhất!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Chọn ngày OFF thứ nhất"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            label="Lý do OFF thứ nhất"
            name="reason1"
          >
            <TextArea 
              rows={3} 
              placeholder="Nhập lý do OFF thứ nhất (không bắt buộc)..."
            />
          </Form.Item>

          <Form.Item
            label="Ngày OFF thứ hai (nếu có)"
            name="date2"
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Chọn ngày OFF thứ hai (không bắt buộc)"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            label="Lý do OFF thứ hai"
            name="reason2"
          >
            <TextArea 
              rows={3} 
              placeholder="Nhập lý do OFF thứ hai (không bắt buộc)..."
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setShowOffForm(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Gửi yêu cầu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Form đăng ký nghỉ phép năm */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <CalendarOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
            Đăng ký nghỉ phép năm
          </div>
        }
        open={showAnnualLeaveForm}
        onCancel={() => setShowAnnualLeaveForm(false)}
        footer={null}
        width={700}
      >
        <Form
          form={annualLeaveForm}
          layout="vertical"
          onFinish={handleAnnualLeaveSubmit}
          style={{ padding: '20px 0' }}
        >
          <Form.Item
            label="Ngày bắt đầu nghỉ phép"
            name="leaveDate"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu nghỉ phép!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Chọn ngày bắt đầu nghỉ phép"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            label="Thông tin nghỉ phép"
            style={{ marginBottom: '16px' }}
          >
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f6f8fa', 
              borderRadius: '6px',
              border: '1px solid #e1e4e8'
            }}>
              <Text style={{ fontSize: '14px', color: '#586069' }}>
                <InfoCircleOutlined style={{ marginRight: '8px' }} />
                Tự động tính toán: 17 ngày nghỉ phép từ ngày bắt đầu
              </Text>
            </div>
          </Form.Item>

          <Form.Item
            label="Lý do nghỉ phép"
            name="reason"
          >
            <TextArea 
              rows={3} 
              placeholder="Nếu có yêu cầu gì khác vui lòng điền vào (không bắt buộc điền lý do)..."
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setShowAnnualLeaveForm(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Gửi yêu cầu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Form đăng ký OFF nửa ca */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <ClockCircleOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
            Đăng ký OFF nửa ca
          </div>
        }
        open={showHalfDayForm}
        onCancel={() => setShowHalfDayForm(false)}
        footer={null}
        width={600}
      >
        <Form
          form={halfDayForm}
          layout="vertical"
          onFinish={handleHalfDaySubmit}
          style={{ padding: '20px 0' }}
        >
          <Form.Item
            label="Ngày OFF nửa ca"
            name="date"
            rules={[{ required: true, message: 'Vui lòng chọn ngày OFF nửa ca!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Chọn ngày OFF nửa ca"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            label="Thời gian OFF nửa ca"
            name="shift"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian OFF nửa ca!' }]}
          >
            <Select placeholder="Chọn thời gian OFF nửa ca">
              <Select.Option value="morning">Nửa ca đầu</Select.Option>
              <Select.Option value="afternoon">Nửa ca sau</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Ghi chú"
            name="note"
            rules={[{ required: true, message: 'Vui lòng nhập ghi chú!' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="OFF ĐẶC BIỆT HAY OFF KHÔNG LƯƠNG PHẢI GHI CHÚ RÕ..."
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setShowHalfDayForm(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Gửi yêu cầu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Form đăng ký tăng ca */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <PlusOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
            Đăng ký tăng ca
          </div>
        }
        open={showOvertimeForm}
        onCancel={() => setShowOvertimeForm(false)}
        footer={null}
        width={600}
      >
        <Form
          form={overtimeForm}
          layout="vertical"
          onFinish={handleOvertimeSubmit}
          style={{ padding: '20px 0' }}
        >
          <Form.Item
            label="Ngày tăng ca"
            name="date"
            rules={[{ required: true, message: 'Vui lòng chọn ngày tăng ca!' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              placeholder="Chọn ngày tăng ca"
              format="DD/MM/YYYY"
            />
          </Form.Item>



          <Form.Item
            label="Ghi chú"
            name="note"
          >
            <TextArea 
              rows={3} 
              placeholder="Nhập ghi chú về lý do tăng ca (không bắt buộc)..."
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setShowOvertimeForm(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Gửi yêu cầu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Edit Request */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <SettingOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Chỉnh sửa yêu cầu
          </div>
        }
        open={showEditModal}
        onCancel={() => {
          setShowEditModal(false);
          setEditingRequest(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
          style={{ padding: '20px 0' }}
        >
          {/* Form fields sẽ thay đổi theo loại request */}
          {editingRequest && (
            <>
              {/* Ngày */}
              <Form.Item
                label="Ngày"
                name="date"
                rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  placeholder="Chọn ngày"
                  format="DD/MM/YYYY"
                />
              </Form.Item>

              {/* Lý do */}
              <Form.Item
                label="Lý do"
                name="reason"
                rules={[{ required: true, message: 'Vui lòng nhập lý do!' }]}
              >
                <TextArea 
                  rows={3} 
                  placeholder="Nhập lý do OFF nửa ca (bắt buộc): OFF đặc biệt hay OFF không lương..."
                />
              </Form.Item>

              {/* Thời gian OFF nửa ca (chỉ hiển thị cho half day) */}
              {editingRequest.request_type === 'half_day_off' && (
                <Form.Item
                  label="Thời gian OFF nửa ca"
                  name="shift"
                  rules={[{ required: true, message: 'Vui lòng chọn thời gian OFF nửa ca!' }]}
                >
                  <Select placeholder="Chọn thời gian OFF nửa ca">
                    <Select.Option value="morning">Nửa ca đầu</Select.Option>
                    <Select.Option value="afternoon">Nửa ca sau</Select.Option>
                  </Select>
                </Form.Item>
              )}


            </>
          )}

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setShowEditModal(false);
                setEditingRequest(null);
                editForm.resetFields();
              }}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={editLoading}>
                Cập nhật
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>


     </div>
   );
 }
