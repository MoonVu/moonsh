import React, { useState, useEffect, useContext } from 'react';
import { Card, Modal, Tabs, Button, DatePicker, Select, Input, message, Table, Tag, Form, Space, Typography } from 'antd';
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
  BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiService from '../../services/api';
import AuthContext from '../../contexts/AuthContext';



const { TabPane } = Tabs;
const { TextArea } = Input;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function UserDashboard() {
  const auth = useContext(AuthContext);
  const { user, isAuthenticated, isLoading } = auth;
  
  // Debug logs
  console.log('🔍 UserDashboard - Auth state:', { 
    user: !!user, 
    user_id: user?._id, 
    isAuthenticated, 
    isLoading 
  });
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeTab, setActiveTab] = useState('off');
  const [loading, setLoading] = useState(false);
  const [showOffForm, setShowOffForm] = useState(false);
  
  // State cho form đăng ký
  const [offForm] = Form.useForm();
  const [halfDayForm] = Form.useForm();
  const [overtimeForm] = Form.useForm();
  
  // State cho danh sách đăng ký
  const [offRequests, setOffRequests] = useState([]);
  const [halfDayRequests, setHalfDayRequests] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);

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
      user_id: user?._id, 
      user_id_type: typeof user?._id,
      user_id_length: user?._id?.length,
      user_keys: user ? Object.keys(user) : [],
      isAuthenticated, 
      isLoading 
    });
    
    if (user && user._id) {
      console.log('✅ User ready, loading requests...');
      loadRequests();
    } else {
      console.log('⏳ User not ready yet...');
      if (user) {
        console.log('🔍 User object exists but no _id. Keys:', Object.keys(user));
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
        user_id: user?._id, 
        user_id_type: typeof user?._id,
        user_id_length: user?._id?.length,
        user_keys: user ? Object.keys(user) : [],
        isAuthenticated, 
        isLoading 
      });
      
      // Kiểm tra user có tồn tại không
      if (!user) {
        console.log('❌ User object không tồn tại, bỏ qua loadRequests');
        return;
      }
      
      if (!user._id) {
        console.log('❌ User._id không tồn tại, bỏ qua loadRequests');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        return;
      }

      setLoading(true);
      const response = await apiService.getUserRequests(nextMonth, nextYear);
      if (response.success) {
        setOffRequests(response.data.offRequests || []);
        setHalfDayRequests(response.data.halfDayRequests || []);
        setOvertimeRequests(response.data.overtimeRequests || []);
      }
    } catch (error) {
      console.error('Lỗi khi load danh sách đăng ký:', error);
      message.error('Không thể tải danh sách đăng ký');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý đăng ký OFF
  const handleOffSubmit = async (values) => {
    try {
      // Debug logs chi tiết
      console.log('🔍 handleOffSubmit - Auth state:', { 
        user: !!user, 
        user_id: user?._id, 
        user_id_type: typeof user?._id,
        user_id_length: user?._id?.length,
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
      
      if (!user._id) {
        console.log('❌ User._id không tồn tại');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }

      const { date1, date2, reason1, reason2 } = values;
      
      // Tạo mảng dates và reasons từ 2 ngày riêng biệt
      const dates = [date1];
      const reasons = [reason1 || ''];
      
      if (date2) {
        dates.push(date2);
        reasons.push(reason2 || '');
      }

      if (dates.length > 2) {
        message.error('Chỉ được chọn tối đa 2 ngày OFF');
        return;
      }

      console.log('🔍 Debug userId:', { 
        userId: user._id, 
        userObject: user,
        hasUserId: !!user._id,
        userIdType: typeof user._id
      });
      
      const requestData = {
        userId: user._id,
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
        message.error(response.error || 'Có lỗi xảy ra khi gửi đăng ký');
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
        user_id: user?._id, 
        user_id_type: typeof user?._id,
        user_id_length: user?._id?.length,
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
      
      if (!user._id) {
        console.log('❌ User._id không tồn tại');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }

      const { date, type, note } = values;
      
      const requestData = {
        userId: user._id,
        date: date.format('YYYY-MM-DD'),
        halfDayType: type,
        reason: note, // Sửa từ note thành reason để khớp với backend
        month: nextMonth,
        year: nextYear
      };

      const response = await apiService.submitHalfDayRequest(requestData);
      
      if (response.success) {
        message.success('Đã gửi đăng ký OFF nửa ca thành công!');
        halfDayForm.resetFields();
        loadRequests();
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi gửi đăng ký');
      }
    } catch (error) {
      console.error('Lỗi khi gửi đăng ký OFF nửa ca:', error);
      message.error('Có lỗi xảy ra khi gửi đăng ký');
    }
  };

  // Xử lý đăng ký tăng ca
  const handleOvertimeSubmit = async (values) => {
    try {
      // Debug logs chi tiết
      console.log('🔍 handleOvertimeSubmit - Auth state:', { 
        user: !!user, 
        user_id: user?._id, 
        user_id_type: typeof user?._id,
        user_id_length: user?._id?.length,
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
      
      if (!user._id) {
        console.log('❌ User._id không tồn tại');
        console.log('🔍 User object keys:', Object.keys(user));
        console.log('🔍 User object values:', Object.values(user));
        message.error('Không thể xác định thông tin user. Vui lòng đăng nhập lại.');
        return;
      }

      const { date, hours, note } = values;
      
      const requestData = {
        userId: user._id,
        date: date.format('YYYY-MM-DD'),
        hours,
        reason: note,
        month: nextMonth,
        year: nextYear
      };

      const response = await apiService.submitOvertimeRequest(requestData);
      
      if (response.success) {
        message.success('Đã gửi đăng ký tăng ca thành công!');
        overtimeForm.resetFields();
        loadRequests();
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi gửi đăng ký');
      }
    } catch (error) {
      console.error('Lỗi khi gửi đăng ký tăng ca:', error);
      message.error('Có lỗi xảy ra khi gửi đăng ký');
    }
  };

  // Cột cho bảng OFF
  const offColumns = [
    {
      title: 'Ngày',
      dataIndex: 'dates',
      key: 'dates',
      render: (dates, record) => (
        <div>
          {dates.map((date, index) => (
            <div key={index} style={{ marginBottom: '8px' }}>
              <Tag color="blue">{date}</Tag>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Lý do',
      dataIndex: 'reasons',
      key: 'reasons',
      render: (reasons, record) => (
        <div>
          {reasons && reasons.map((reason, index) => (
            <div key={index} style={{ marginBottom: '8px' }}>
              <Text>{reason || 'Không có lý do'}</Text>
            </div>
          ))}
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        if (status === 'approved') {
          return <Tag icon={<CheckCircleOutlined />} color="success">Đồng ý</Tag>;
        } else if (status === 'rejected') {
          return <Tag icon={<CloseCircleOutlined />} color="error">Từ chối</Tag>;
        } else {
          return <Tag color="processing">Chờ duyệt</Tag>;
        }
      }
    },
    {
      title: 'Ghi chú Admin',
      dataIndex: 'adminNote',
      key: 'adminNote',
      render: (note, record) => {
        if (record.status === 'rejected' && note) {
          return <Text type="danger">{note}</Text>;
        }
        return note || '-';
      }
    }
  ];

  // Cột cho bảng OFF nửa ca
  const halfDayColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <Tag color="orange">{date}</Tag>
    },
    {
      title: 'Loại',
      dataIndex: 'halfDayType',
      key: 'halfDayType',
      render: (type) => {
        if (type === 'no_salary') {
          return <Tag color="red">Nửa ca không lương</Tag>;
        } else {
          return <Tag color="purple">Nửa ca đặc biệt</Tag>;
        }
      }
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        if (status === 'approved') {
          return <Tag icon={<CheckCircleOutlined />} color="success">Đồng ý</Tag>;
        } else if (status === 'rejected') {
          return <Tag icon={<CloseCircleOutlined />} color="error">Từ chối</Tag>;
        } else {
          return <Tag color="processing">Chờ duyệt</Tag>;
        }
      }
    }
  ];

  // Cột cho bảng tăng ca
  const overtimeColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (date) => <Tag color="green">{date}</Tag>
    },
    {
      title: 'Số giờ',
      dataIndex: 'hours',
      key: 'hours',
      render: (hours) => <Text strong>{hours}h</Text>
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        if (status === 'approved') {
          return <Tag icon={<CheckCircleOutlined />} color="success">Đồng ý</Tag>;
        } else if (status === 'rejected') {
          return <Tag icon={<CloseCircleOutlined />} color="error">Từ chối</Tag>;
        } else {
          return <Tag color="processing">Chờ duyệt</Tag>;
        }
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
        <p>Chọn tính năng bạn muốn sử dụng</p>
      </div>

      {/* Feature Grid */}
      <div className="user-content">
        <div className="feature-grid">
          {/* Ô Thông tin cá nhân */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#1890ff' }}>
              <UserOutlined />
            </div>
            <h3>Thông tin cá nhân</h3>
            <p>Xem và cập nhật thông tin cá nhân của bạn</p>
          </div>

          {/* Ô Đăng ký lịch - MỚI */}
          <div className="feature-card" onClick={() => setShowScheduleModal(true)}>
            <div className="feature-icon" style={{ color: '#52c41a' }}>
              <CalendarOutlined />
            </div>
            <h3>Đăng ký lịch</h3>
            <p>Đăng ký ngày OFF, nửa ca, tăng ca</p>
          </div>

          {/* Ô Báo cáo */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#722ed1' }}>
              <BarChartOutlined />
            </div>
            <h3>Báo cáo</h3>
            <p>Xem báo cáo công việc và thống kê</p>
          </div>

          {/* Ô Tài liệu */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#fa8c16' }}>
              <FileTextOutlined />
            </div>
            <h3>Tài liệu</h3>
            <p>Truy cập tài liệu và hướng dẫn</p>
          </div>

          {/* Ô Cài đặt */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#eb2f96' }}>
              <SettingOutlined />
            </div>
            <h3>Cài đặt</h3>
            <p>Tùy chỉnh cài đặt tài khoản</p>
          </div>

          {/* Ô Thông báo */}
          <div className="feature-card">
            <div className="feature-icon" style={{ color: '#13c2c2' }}>
              <ClockCircleOutlined />
            </div>
            <h3>Thông báo</h3>
            <p>Xem thông báo và tin tức mới</p>
          </div>
        </div>

        {/* Quick Info Section */}
        <div className="quick-info">
          <div className="info-card">
            <h3>Thông tin nhanh</h3>
            <p>Chào mừng bạn đến với hệ thống quản lý SHBET!</p>
            <p>Mọi người có ý kiến đóng góp vui lòng gửi cho Moon nha.</p>
          </div>
        </div>
      </div>

      {/* Modal Đăng ký lịch */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <CalendarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
            Đăng ký lịch làm việc
          </div>
        }
        open={showScheduleModal}
        onCancel={() => setShowScheduleModal(false)}
        footer={null}
        width={1000}
        style={{ top: 20 }}
      >
        <div style={{ padding: '20px 0' }}>
          <Text type="secondary" style={{ fontSize: '16px', marginBottom: '24px', display: 'block', textAlign: 'center' }}>
            Tháng {nextMonth}/{nextYear} - Chọn loại đăng ký phù hợp với nhu cầu của bạn
          </Text>

          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
                         {/* Tab Ngày OFF */}
             <TabPane 
               tab={
                 <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                   Ngày OFF
                 </span>
               } 
               key="off"
             >
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    Đăng ký ngày OFF tháng {nextMonth}/{nextYear}
                  </Title>
                                     <Button 
                     type="primary" 
                     icon={<PlusOutlined />}
                     onClick={() => {
                       offForm.resetFields();
                       setShowOffForm(true);
                     }}
                   >
                     Đăng ký OFF
                   </Button>
                </div>
                
                <Table
                  columns={offColumns}
                  dataSource={offRequests}
                  rowKey="id"
                  loading={loading}
                  pagination={false}
                  locale={{
                    emptyText: 'Chưa có đăng ký OFF nào'
                  }}
                />
              </Card>
            </TabPane>

                         {/* Tab OFF nửa ca */}
             <TabPane 
               tab={
                 <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>
                   OFF nửa ca
                 </span>
               } 
               key="halfday"
             >
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    Đăng ký OFF nửa ca tháng {nextMonth}/{nextYear}
                  </Title>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      halfDayForm.resetFields();
                      // Hiện form đăng ký OFF nửa ca
                    }}
                  >
                    Đăng ký nửa ca
                  </Button>
                </div>
                
                <Table
                  columns={halfDayColumns}
                  dataSource={halfDayRequests}
                  rowKey="id"
                  loading={loading}
                  pagination={false}
                  locale={{
                    emptyText: 'Chưa có đăng ký OFF nửa ca nào'
                  }}
                />
              </Card>
            </TabPane>

                         {/* Tab Tăng ca */}
             <TabPane 
               tab={
                 <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                   Tăng ca
                 </span>
               } 
               key="overtime"
             >
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    Đăng ký tăng ca tháng {nextMonth}/{nextYear}
                  </Title>
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => {
                      overtimeForm.resetFields();
                      // Hiện form đăng ký tăng ca
                    }}
                  >
                    Đăng ký tăng ca
                  </Button>
                </div>
                
                                 <Table
                   columns={overtimeColumns}
                   dataSource={overtimeRequests}
                   rowKey="id"
                   loading={loading}
                   pagination={false}
                   locale={{
                     emptyText: 'Chưa có đăng ký tăng ca nào'
                   }}
                 />
              </Card>
            </TabPane>

                         {/* Tab Về phép năm - để sau */}
             <TabPane 
               tab={
                 <span style={{ color: '#722ed1', fontWeight: 'bold' }}>
                   Về phép năm
                 </span>
               } 
               key="annual"
               disabled
             >
              <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Title level={4} type="secondary">
                    Tính năng đang được phát triển
                  </Title>
                  <Text type="secondary">
                    Về phép năm sẽ được cập nhật trong phiên bản tiếp theo
                  </Text>
                </div>
              </Card>
            </TabPane>
                     </Tabs>
         </div>
       </Modal>

       {/* Modal Form đăng ký OFF */}
       <Modal
         title="Đăng ký ngày OFF"
         open={showOffForm}
         onCancel={() => setShowOffForm(false)}
         footer={null}
         width={600}
       >
         <Form form={offForm} onFinish={handleOffSubmit} layout="vertical">
                       <Form.Item
              label="Chọn ngày OFF thứ nhất"
              name="date1"
              rules={[{ required: true, message: 'Vui lòng chọn ngày OFF thứ nhất' }]}
            >
                             <DatePicker
                 style={{ width: '100%' }}
                 placeholder="Chọn ngày OFF thứ nhất"
                 defaultPickerValue={dayjs(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)}
                 disabledDate={(current) => {
                   // Chỉ cho phép chọn ngày trong tháng tiếp theo
                   const nextMonthStart = dayjs(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`);
                   const nextMonthEnd = dayjs(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`).endOf('month');
                   return current && (current.isBefore(nextMonthStart) || current.isAfter(nextMonthEnd));
                 }}
               />
            </Form.Item>
           
           <Form.Item
             label="Lý do cho ngày thứ nhất (tùy chọn)"
             name="reason1"
           >
             <TextArea rows={3} placeholder="Nhập lý do..." />
           </Form.Item>
           
                       <Form.Item
              label="Chọn ngày OFF thứ hai (tùy chọn)"
              name="date2"
            >
                             <DatePicker
                 style={{ width: '100%' }}
                 placeholder="Chọn ngày OFF thứ hai (không bắt buộc)"
                 defaultPickerValue={dayjs(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)}
                 disabledDate={(current) => {
                   // Chỉ cho phép chọn ngày trong tháng tiếp theo
                   const nextMonthStart = dayjs(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`);
                   const nextMonthEnd = dayjs(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`).endOf('month');
                   return current && (current.isBefore(nextMonthStart) || current.isAfter(nextMonthEnd));
                 }}
               />
            </Form.Item>
           
           <Form.Item
             label="Lý do cho ngày thứ hai (tùy chọn)"
             name="reason2"
           >
             <TextArea rows={3} placeholder="Nhập lý do..." />
           </Form.Item>
           
           <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
             <Space>
               <Button onClick={() => setShowOffForm(false)}>
                 Hủy
               </Button>
               <Button type="primary" htmlType="submit">
                 Gửi đăng ký
               </Button>
             </Space>
           </Form.Item>
         </Form>
       </Modal>
     </div>
   );
 }
