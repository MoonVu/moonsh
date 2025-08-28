import React, { useState } from 'react';
import CustomTabs from './CustomTabs';

const CustomTabsDemo = () => {
  const [activeTab, setActiveTab] = useState('tab1');

  const tabs = [
    {
      id: 'tab1',
      name: 'DEMO Lịch',
      content: (
        <div>
          <h3>Nội dung tab DEMO Lịch</h3>
          <p>Đây là nội dung của tab đầu tiên</p>
        </div>
      )
    },
    {
      id: 'tab2',
      name: 'DEMO Nhân sự',
      content: (
        <div>
          <h3>Nội dung tab DEMO Nhân sự</h3>
          <p>Đây là nội dung của tab thứ hai</p>
        </div>
      )
    },
    {
      id: 'tab3',
      name: 'Bản sao tháng 8/2025',
      content: (
        <div>
          <h3>Nội dung tab Bản sao</h3>
          <p>Đây là nội dung của tab thứ ba</p>
        </div>
      )
    }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    console.log('Chuyển sang tab:', tabId);
  };

  const handleEditTab = (tabId, newName) => {
    console.log('Đổi tên tab:', tabId, 'thành:', newName);
    // Ở đây bạn có thể gọi API để cập nhật tên tab
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Demo CustomTabs Component</h2>
      
      <CustomTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onEditTab={handleEditTab}
        showEditIcon={true}
      />
      
      <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h4>Hướng dẫn sử dụng:</h4>
        <ul>
          <li>Click vào tab để chuyển đổi</li>
          <li>Click vào icon bút để chỉnh sửa tên tab</li>
          <li>Nhấn Enter để lưu, Escape để hủy</li>
          <li>Click ra ngoài để lưu thay đổi</li>
        </ul>
      </div>
    </div>
  );
};

export default CustomTabsDemo;
