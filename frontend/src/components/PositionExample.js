import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Table, Space, message } from 'antd';
import { usePosition } from '../hooks/usePosition';

const { Option } = Select;

const PositionExample = () => {
  const { 
    position, 
    loading, 
    saveSelectedTab, 
    saveGridState, 
    saveFormData, 
    saveComponentState,
    deletePosition 
  } = usePosition();

  const [selectedTab, setSelectedTab] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [gridState, setGridState] = useState({
    selectedItems: [],
    expandedRows: [],
    filters: {}
  });

  // Restore state từ position khi load
  useEffect(() => {
    if (position) {
      if (position.selectedTab) {
        setSelectedTab(position.selectedTab);
      }
      if (position.formData) {
        setFormData(position.formData);
      }
      if (position.gridState) {
        setGridState(position.gridState);
      }
    }
  }, [position]);

  // Auto-save khi state thay đổi
  useEffect(() => {
    if (selectedTab) {
      saveSelectedTab(selectedTab);
    }
  }, [selectedTab, saveSelectedTab]);

  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      saveFormData(formData);
    }
  }, [formData, saveFormData]);

  useEffect(() => {
    if (Object.keys(gridState).length > 0) {
      saveGridState(gridState);
    }
  }, [gridState, saveGridState]);

  const handleTabChange = (value) => {
    setSelectedTab(value);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGridSelection = (selectedRowKeys) => {
    setGridState(prev => ({ ...prev, selectedItems: selectedRowKeys }));
  };

  const handleClearPosition = async () => {
    try {
      await deletePosition();
      message.success('Đã xóa vị trí làm việc');
    } catch (error) {
      message.error('Lỗi khi xóa vị trí');
    }
  };

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  const dataSource = [
    { key: '1', name: 'Nguyễn Văn A', email: 'a@example.com', status: 'Active' },
    { key: '2', name: 'Trần Thị B', email: 'b@example.com', status: 'Inactive' },
    { key: '3', name: 'Lê Văn C', email: 'c@example.com', status: 'Active' },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card title="Demo Lưu Trữ Vị Trí Làm Việc" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <h4>Trạng thái hiện tại:</h4>
            <pre>{JSON.stringify(position, null, 2)}</pre>
          </div>

          <div>
            <h4>Chọn Tab:</h4>
            <Select 
              value={selectedTab} 
              onChange={handleTabChange}
              style={{ width: 200 }}
              placeholder="Chọn tab"
            >
              <Option value="tab1">Tab 1</Option>
              <Option value="tab2">Tab 2</Option>
              <Option value="tab3">Tab 3</Option>
            </Select>
          </div>

          <div>
            <h4>Form Data:</h4>
            <Space>
              <Input
                placeholder="Tên"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                style={{ width: 200 }}
              />
              <Input
                placeholder="Email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                style={{ width: 200 }}
              />
            </Space>
          </div>

          <div>
            <h4>Grid State:</h4>
            <Table
              columns={columns}
              dataSource={dataSource}
              rowSelection={{
                selectedRowKeys: gridState.selectedItems,
                onChange: handleGridSelection,
              }}
              pagination={false}
              size="small"
            />
          </div>

          <div>
            <Button type="primary" onClick={handleClearPosition}>
              Xóa Vị Trí Làm Việc
            </Button>
          </div>
        </Space>
      </Card>

      <Card title="Hướng Dẫn Sử Dụng">
        <div>
          <h4>API Endpoints:</h4>
          <ul>
            <li><strong>POST /api/user-position</strong> - Lưu vị trí</li>
            <li><strong>GET /api/user-position</strong> - Lấy vị trí</li>
            <li><strong>PUT /api/user-position</strong> - Cập nhật vị trí</li>
            <li><strong>DELETE /api/user-position</strong> - Xóa vị trí</li>
          </ul>

          <h4>Dữ liệu được lưu:</h4>
          <ul>
            <li><strong>page</strong> - Trang hiện tại</li>
            <li><strong>scrollPosition</strong> - Vị trí scroll (x, y)</li>
            <li><strong>selectedTab</strong> - Tab đang chọn</li>
            <li><strong>gridState</strong> - Trạng thái grid (selectedItems, filters, etc.)</li>
            <li><strong>formData</strong> - Dữ liệu form</li>
            <li><strong>componentState</strong> - Trạng thái component</li>
          </ul>

          <h4>Cách sử dụng:</h4>
          <ol>
            <li>Import hook: <code>import { usePosition } from '../hooks/usePosition'</code></li>
            <li>Sử dụng trong component: <code>const { saveSelectedTab, saveGridState } = usePosition()</code></li>
            <li>Auto-save khi state thay đổi</li>
            <li>Restore state khi load page</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

export default PositionExample; 