import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Modal, Form, Input, Select, message, Space, Typography, Badge, Collapse, Row, Col, Divider, DatePicker } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, LoadingOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import apiService from '../../services/api';
import CustomTabs from '../CustomTabs';
import './AdminDashboard.css';

const { TextArea } = Input;
const { Text, Title } = Typography;

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' hoặc 'reject'
  const [actionForm] = Form.useForm();
  const [processing, setProcessing] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchDate, setSearchDate] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const systemStats = {
    totalUsers: 3,
    activeUsers: 0,
    pendingTasks: requests.filter(req => req.status === 'pending').length,
    completedTasks: requests.filter(req => req.status === 'approved' || req.status === 'rejected').length
  };

  // Load danh sách tất cả requests
  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllRequests();
      
      if (response.data && Array.isArray(response.data)) {
        setRequests(response.data);
        if (response.data.length > 0) {
        }
      } else {
        console.warn('⚠️ Response data không phải array:', response.data);
        setRequests([]);
      }
    } catch (error) {
      console.error('Lỗi khi load requests:', error);
      message.error('Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý phê duyệt request
  const handleApprove = async (requestId, adminNote) => {
    try {
      setProcessing(true);
      const response = await apiService.updateRequestStatus(requestId, 'approved', adminNote);
      if (response.success) {
        message.success('Đã phê duyệt yêu cầu thành công!');
        setShowActionModal(false);
        setSelectedRequest(null);
        actionForm.resetFields();
        loadRequests(); // Reload danh sách
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi phê duyệt');
      }
    } catch (error) {
      console.error('Lỗi khi phê duyệt:', error);
      message.error('Có lỗi xảy ra khi phê duyệt');
    } finally {
      setProcessing(false);
    }
  };

  // Xử lý từ chối request
  const handleReject = async (requestId, adminNote) => {
    try {
      setProcessing(true);
      const response = await apiService.updateRequestStatus(requestId, 'rejected', adminNote);
      if (response.success) {
        message.success('Đã từ chối yêu cầu thành công!');
        setShowActionModal(false);
        setSelectedRequest(null);
        actionForm.resetFields();
        loadRequests(); // Reload danh sách
      } else {
        message.error(response.error || 'Có lỗi xảy ra khi từ chối');
      }
    } catch (error) {
      console.error('Lỗi khi từ chối:', error);
      message.error('Có lỗi xảy ra khi từ chối');
    } finally {
      setProcessing(false);
    }
  };

  // Xử lý submit form action
  const handleActionSubmit = async (values) => {
    if (!selectedRequest) return;
    
    if (actionType === 'approve') {
      await handleApprove(selectedRequest._id, values.adminNote);
    } else if (actionType === 'reject') {
      await handleReject(selectedRequest._id, values.adminNote);
    }
  };

  // Mở modal action
  const openActionModal = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setShowActionModal(true);
    actionForm.resetFields();
  };

  // Mở modal xem chi tiết
  const openDetailModal = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  // Cột cho bảng requests
  const columns = [
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'metadata',
      key: 'date',
      width: 120,
      render: (metadata, record) => {
        if (metadata?.from_date) {
          const date = new Date(metadata.from_date);
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: '#1890ff',
                marginBottom: '4px'
              }}>
                {date.getDate()}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666'
              }}>
                {date.getMonth() + 1}/{date.getFullYear()}
              </div>
            </div>
          );
        }
        return <Text type="secondary">Không có ngày</Text>;
      }
    },
    {
      title: 'Loại yêu cầu',
      dataIndex: 'request_type',
      key: 'request_type',
      width: 120,
      render: (type, record) => {
        // Logic phân loại request type chính xác hơn
        let displayType = type;
        let displayColor = '#666';
        
        if (type === 'monthly_off') {
          displayType = 'OFF';
          displayColor = '#1890ff'; // Xanh dương
        } else if (type === 'overtime_day') {
          displayType = 'Tăng ca';
          displayColor = '#52c41a'; // Xanh lá
        } else if (type === 'half_day_off') {
          displayType = 'OFF nửa ca';
          displayColor = '#fa8c16'; // Cam
        } else if (type === 'annual_leave') {
          displayType = 'Nghỉ phép năm';
          displayColor = '#722ed1'; // Tím
        } else if (type === 'overtime_day') {
          displayType = 'Tăng ca 1 ngày';
          displayColor = '#52c41a'; // Xanh lá
        } else if (type === 'overtime_hours') {
          displayType = 'Tăng ca theo giờ';
          displayColor = '#52c41a'; // Xanh lá
        }
        
                 return (
           <div style={{ textAlign: 'center' }}>
             <Tag color={displayColor}>
               {displayType}
             </Tag>
             {/* Hiển thị thông tin nửa ca nếu có */}
             {type === 'half_day_off' && record.metadata?.half_day_shift && (
               <div style={{ 
                 marginTop: '4px',
                 fontSize: '11px',
                 padding: '2px 6px',
                 borderRadius: '8px',
                 backgroundColor: record.metadata.half_day_shift === 'morning' ? '#fff3e0' : '#e3f2fd',
                 color: record.metadata.half_day_shift === 'morning' ? '#ff9500' : '#4a90e2',
                 border: `1px solid ${record.metadata.half_day_shift === 'morning' ? '#ffcc80' : '#90caf9'}`
               }}>
                 {record.metadata.half_day_shift === 'morning' ? '☀️ Nửa ca đầu' : '🌙 Nửa ca sau'}
               </div>
             )}
           </div>
         );
      }
    },
    {
      title: 'Nhân viên',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user, record) => {
        if (user) {
          return (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'bold' }}>{user.username}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{user.group_name}</div>
            </div>
          );
        }
        return <div style={{ textAlign: 'center' }}><Text type="secondary">Không có thông tin</Text></div>;
      }
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      key: 'content',
      width: 200,
      render: (content) => (
        <div style={{ 
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.4',
          maxHeight: '80px',
          overflow: 'auto'
        }}>
          {content}
        </div>
      )
    },
    {
      title: 'Ghi chú n.viên',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      render: (description) => (
        <div style={{ 
          fontSize: '12px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.4',
          maxHeight: '60px',
          overflow: 'auto'
        }}>
          {description || 'Không có'}
        </div>
      )
    },

    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        const statusConfig = {
          'pending': { color: 'processing', text: 'Chờ duyệt', icon: <LoadingOutlined /> },
          'approved': { color: 'success', text: 'Đã duyệt', icon: <CheckCircleOutlined /> },
          'rejected': { color: 'error', text: 'Từ chối', icon: <CloseCircleOutlined /> },
          'processing': { color: 'warning', text: 'Đang xử lý', icon: <LoadingOutlined /> },
          'cancelled': { color: 'default', text: 'Đã hủy', icon: <CloseCircleOutlined /> }
        };
        
        const config = statusConfig[status] || { color: 'default', text: status, icon: null };
        
        return (
          <div style={{ textAlign: 'center' }}>
            {record.processed_by && (status === 'approved' || status === 'rejected') && (
              <Tag color="blue" style={{ marginBottom: '4px', fontSize: '11px' }}>
                {record.processed_by.username || 'Admin'}
              </Tag>
            )}
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <Button 
                type="primary" 
                size="small" 
                icon={<CheckCircleOutlined />}
                onClick={() => openActionModal(record, 'approve')}
              >
                Duyệt
              </Button>
              <Button 
                danger 
                size="small" 
                icon={<CloseCircleOutlined />}
                onClick={() => openActionModal(record, 'reject')}
              >
                Từ chối
              </Button>
              <Button 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => openDetailModal(record)}
              >
                Chi tiết
              </Button>
            </Space>
          );
        }
        
        return (
          <div style={{ textAlign: 'center' }}>
            {record.admin_note ? (
              <div style={{ 
                fontSize: '13px',
                padding: '8px 12px',
                backgroundColor: record.status === 'rejected' ? '#fff2f0' : '#f6ffed',
                borderRadius: '6px',
                border: `1px solid ${record.status === 'rejected' ? '#ffccc7' : '#b7eb8f'}`,
                color: record.status === 'rejected' ? '#ff4d4f' : '#52c41a',
                maxWidth: '150px',
                wordBreak: 'break-word',
                lineHeight: '1.4'
              }}>
                {record.admin_note}
              </div>
            ) : (
              <Button 
                size="small" 
                icon={<EyeOutlined />}
                onClick={() => openDetailModal(record)}
              >
                Chi tiết
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  // Filter và sắp xếp requests
  const getFilteredAndSortedRequests = () => {
    let filtered = [...requests];
    
    // Filter theo nhân viên
    if (searchEmployee) {
      filtered = filtered.filter(req => 
        req.user?.username?.toLowerCase().includes(searchEmployee.toLowerCase())
      );
    }
    
    // Filter theo ngày
    if (searchDate) {
      const searchDateStr = searchDate.format('YYYY-MM-DD');
      filtered = filtered.filter(req => {
        const reqDate = req.metadata?.from_date;
        if (reqDate) {
          const reqDateStr = new Date(reqDate).toISOString().split('T')[0];
          return reqDateStr === searchDateStr;
        }
        return false;
      });
    }
    
    // Sắp xếp theo thứ tự mới nhất trước
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateB - dateA;
    });
    
    return filtered;
  };

  // Load data khi component mount
  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🎛️ Bảng điều khiển Quản trị viên</h1>
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
              <h3>
                <Badge count={systemStats.pendingTasks} size="small">
                  {systemStats.pendingTasks}
                </Badge>
              </h3>
              <p>Chờ phê duyệt</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <h3>{systemStats.completedTasks}</h3>
              <p>Đã xử lý</p>
            </div>
          </div>
        </div>

        {/* Phần chính: Quản lý yêu cầu */}
        <Collapse 
          defaultActiveKey={[]} 
          style={{ marginBottom: '16px' }}
          expandIconPosition="end"
        >
          <Collapse.Panel 
            header={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>📋 Quản lý yêu cầu từ nhân viên ({requests.filter(req => req.status === 'pending').length} đơn chờ duyệt)</span>
                <Tag color="processing">Quản lý yêu cầu</Tag>
              </div>
            } 
            key="requests"
          >
            <div className="main-approval-section">
              <div className="section-header">
                <h2>📋 Quản lý yêu cầu từ nhân viên ({requests.filter(req => req.status === 'pending').length} đơn chờ duyệt)</h2>
                <p>Phê duyệt các yêu cầu OFF, OFF nửa ca, tăng ca từ nhân viên</p>
              </div>
              
              {/* Filter và Search */}
              <Card style={{ marginBottom: '16px' }}>
                <Row gutter={16} align="middle">
                  <Col span={6}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Tìm nhân viên:</strong>
                    </div>
                    <Input
                      placeholder="Nhập tên nhân viên..."
                      value={searchEmployee}
                      onChange={(e) => setSearchEmployee(e.target.value)}
                      prefix={<SearchOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Ngày yêu cầu:</strong>
                    </div>
                    <DatePicker
                      placeholder="Chọn ngày..."
                      value={searchDate}
                      onChange={setSearchDate}
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY"
                    />
                  </Col>
                  <Col span={6}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Kết quả:</strong>
                    </div>
                    <div style={{ 
                      padding: '8px', 
                      backgroundColor: '#f0f0f0', 
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontWeight: 'bold'
                    }}>
                      {getFilteredAndSortedRequests().length} yêu cầu
                    </div>
                  </Col>
                </Row>
              </Card>
              
              {/* Tabs cho từng trạng thái */}
              <CustomTabs
                tabs={[
                  {
                    id: 'all',
                    name: `Tất cả (${getFilteredAndSortedRequests().length})`,
                    content: (
                      <Table 
                        dataSource={getFilteredAndSortedRequests()} 
                        columns={columns} 
                        rowKey="_id"
                        loading={loading}
                        pagination={{ 
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} yêu cầu`
                        }}
                        size="small"
                      />
                    )
                  },
                  {
                    id: 'pending',
                    name: `Chờ duyệt (${getFilteredAndSortedRequests().filter(req => req.status === 'pending').length})`,
                    content: (
                      <Table 
                        dataSource={getFilteredAndSortedRequests().filter(req => req.status === 'pending')} 
                        columns={columns} 
                        rowKey="_id"
                        loading={loading}
                        pagination={{ 
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} yêu cầu`
                        }}
                        size="small"
                      />
                    )
                  },
                  {
                    id: 'approved',
                    name: `Đã duyệt (${getFilteredAndSortedRequests().filter(req => req.status === 'approved').length})`,
                    content: (
                      <Table 
                        dataSource={getFilteredAndSortedRequests().filter(req => req.status === 'approved')} 
                        columns={columns} 
                        rowKey="_id"
                        loading={loading}
                        pagination={{ 
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} yêu cầu`
                        }}
                        size="small"
                      />
                    )
                  },
                  {
                    id: 'rejected',
                    name: `Từ chối (${getFilteredAndSortedRequests().filter(req => req.status === 'rejected').length})`,
                    content: (
                      <Table 
                        dataSource={getFilteredAndSortedRequests().filter(req => req.status === 'rejected')} 
                        columns={columns} 
                        rowKey="_id"
                        loading={loading}
                        pagination={{ 
                          pageSize: 10,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} yêu cầu`
                        }}
                        size="small"
                      />
                    )
                  }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showEditIcon={false}
              />
            </div>
          </Collapse.Panel>
        </Collapse>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>⚡ Thao tác nhanh</h2>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={loadRequests}>
              🔄 Làm mới danh sách
            </button>
            <button className="action-btn warning">
              ⏳ Chờ phê duyệt ({systemStats.pendingTasks})
            </button>
            <button className="action-btn">📊 Xem báo cáo tổng hợp</button>
            <button className="action-btn">👥 Quản lý nhân viên</button>
          </div>
        </div>
      </div>

      {/* Modal xem chi tiết */}
      <Modal
        title="Chi tiết yêu cầu"
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={null}
        width={600}
      >
        {selectedRequest && (
          <div>
                         <p><strong>Loại yêu cầu:</strong> 
               {selectedRequest.request_type === 'half_day_off' ? (
                 <span>
                   OFF nửa ca
                   {selectedRequest.metadata?.half_day_shift && (
                     <span style={{ 
                       marginLeft: '8px',
                       padding: '4px 8px',
                       borderRadius: '12px',
                       backgroundColor: selectedRequest.metadata.half_day_shift === 'morning' ? '#fff3e0' : '#e3f2fd',
                       color: selectedRequest.metadata.half_day_shift === 'morning' ? '#ff9500' : '#4a90e2',
                       border: `1px solid ${selectedRequest.metadata.half_day_shift === 'morning' ? '#ffcc80' : '#90caf9'}`
                     }}>
                       {selectedRequest.metadata.half_day_shift === 'morning' ? '☀️ Nửa ca đầu' : '🌙 Nửa ca sau'}
                     </span>
                   )}
                 </span>
               ) : (
                 selectedRequest.request_type
               )}
             </p>
            <p><strong>Nội dung:</strong> {selectedRequest.content}</p>
            <p><strong>Ghi chú:</strong> {selectedRequest.description || 'Không có'}</p>
            <p><strong>Trạng thái:</strong> {selectedRequest.status}</p>
            <p><strong>Ngày tạo:</strong> {new Date(selectedRequest.createdAt).toLocaleString('vi-VN')}</p>
            {selectedRequest.metadata && (
              <div>
                <p><strong>Ngày yêu cầu:</strong> {selectedRequest.metadata.from_date}</p>
                                 {selectedRequest.metadata.reason && (
                   <p><strong>Lý do:</strong> {selectedRequest.metadata.reason}</p>
                 )}
                 {/* Hiển thị thông tin nửa ca nếu có */}
                 {selectedRequest.metadata.half_day_shift && (
                   <p><strong>Thời gian:</strong> 
                     <span style={{ 
                       marginLeft: '8px',
                       padding: '4px 8px',
                       borderRadius: '12px',
                       backgroundColor: selectedRequest.metadata.half_day_shift === 'morning' ? '#fff3e0' : '#e3f2fd',
                       color: selectedRequest.metadata.half_day_shift === 'morning' ? '#ff9500' : '#4a90e2',
                       border: `1px solid ${selectedRequest.metadata.half_day_shift === 'morning' ? '#ffcc80' : '#90caf9'}`
                     }}>
                       {selectedRequest.metadata.half_day_shift === 'morning' ? '☀️ Nửa ca đầu' : '🌙 Nửa ca sau'}
                     </span>
                   </p>
                 )}
               </div>
             )}
          </div>
        )}
      </Modal>

      {/* Modal phê duyệt/từ chối */}
      <Modal
        title={actionType === 'approve' ? 'Phê duyệt yêu cầu' : 'Từ chối yêu cầu'}
        open={showActionModal}
        onCancel={() => setShowActionModal(false)}
        footer={null}
        width={500}
      >
        <Form
          form={actionForm}
          layout="vertical"
          onFinish={handleActionSubmit}
        >
          <Form.Item
            label="Ghi chú của admin"
            name="adminNote"
            rules={[{ required: true, message: 'Vui lòng nhập ghi chú!' }]}
          >
            <TextArea 
              rows={4} 
              placeholder={
                actionType === 'approve' 
                  ? 'Nhập ghi chú khi phê duyệt (bắt buộc)...'
                  : 'Nhập lý do từ chối (bắt buộc)...'
              }
            />
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setShowActionModal(false)}>
                Hủy
              </Button>
              <Button 
                type={actionType === 'approve' ? 'primary' : 'danger'} 
                htmlType="submit" 
                loading={processing}
                danger={actionType === 'reject'}
              >
                {actionType === 'approve' ? 'Phê duyệt' : 'Từ chối'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
