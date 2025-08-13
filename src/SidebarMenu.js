import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppstoreOutlined,
  ContainerOutlined,
  DesktopOutlined,
  MailOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  SolutionOutlined,
  HomeOutlined,
  UsergroupAddOutlined,
  IdcardOutlined,
  SettingOutlined,
  TableOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { Menu, Tooltip } from 'antd';
import './SidebarMenu.css';

// Hàm tạo label với tooltip cho tên dài
const createLabelWithTooltip = (label) => {
  return (
    <Tooltip title={label} placement="right">
      <span style={{ 
        display: 'block', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis', 
        whiteSpace: 'nowrap',
        maxWidth: '180px'
      }}>
        {label}
      </span>
    </Tooltip>
  );
};

// Chuyển cấu trúc menu cũ sang dạng items cho Ant Design
const allMenuItems = [
  {
    key: 'quantri',
    icon: <SettingOutlined />,
    label: createLabelWithTooltip('QUẢN TRỊ'),
    children: [
      { key: 'taikhoan', icon: <UserOutlined />, label: createLabelWithTooltip('Tài khoản') },
      {
        key: 'lichlamviec',
        icon: <CalendarOutlined />,
        label: createLabelWithTooltip('Lịch làm việc'),
        children: [
          { key: 'lichdica', label: createLabelWithTooltip('Lịch đi ca'), icon: <TableOutlined /> },
          {
            key: 'lichvephep',
            label: createLabelWithTooltip('Lịch về phép'),
            icon: <SolutionOutlined />,
            children: [
              { key: 'lichve', label: createLabelWithTooltip('Lịch về'), icon: <SolutionOutlined /> },
              { key: 'chitiet', label: createLabelWithTooltip('Chi tiết'), icon: <IdcardOutlined /> },
            ],
          },
          { key: 'vitri', label: createLabelWithTooltip('Vị trí chỗ ngồi'), icon: <EnvironmentOutlined /> },
        ],
      },
    ],
  },
  {
    key: 'bank',
    icon: <HomeOutlined />,
    label: createLabelWithTooltip('BANK'),
    children: [
      { key: 'thongke', label: createLabelWithTooltip('Thống kê (số liệu chung)'), icon: <TableOutlined /> },
      { key: 'chuthe', label: createLabelWithTooltip('Danh sách chủ thẻ ngoại bộ'), icon: <UsergroupAddOutlined /> },
      { key: 'bankvqm', label: createLabelWithTooltip('Danh sách bank VQM'), icon: <TableOutlined /> },
      { key: 'luutru', label: createLabelWithTooltip('Lưu trữ bank khóa'), icon: <ContainerOutlined /> },
    ],
  },
  {
    key: 'xnk',
    icon: <AppstoreOutlined />,
    label: createLabelWithTooltip('XNK'),
    children: [
      { key: 'task', label: createLabelWithTooltip('Task yêu cầu'), icon: <MailOutlined /> },
      { key: 'nhanvien', label: createLabelWithTooltip('Danh sách nhân viên'), icon: <TeamOutlined /> },
      { key: 'thongkeloi', label: createLabelWithTooltip('Thống kê lỗi sai trong tháng'), icon: <TableOutlined /> },
      { key: 'donchuyenloi', label: createLabelWithTooltip('Các đơn chuyển lỗi'), icon: <ContainerOutlined /> },
    ],
  },
  {
    key: 'cskh',
    icon: <DesktopOutlined />,
    label: createLabelWithTooltip('CSKH'),
    children: [
      { key: 'taskcskh', label: createLabelWithTooltip('Task yêu cầu'), icon: <MailOutlined /> },
      { key: 'rut', label: createLabelWithTooltip('Đơn rút tiền'), icon: <ContainerOutlined /> },
      { key: 'nap', label: createLabelWithTooltip('Đơn nạp tiền'), icon: <ContainerOutlined /> },
    ],
  },
];

export default function SidebarMenu({ currentMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Xử lý click menu
  const handleMenuClick = ({ key }) => {
    // Map menu key sang route path
    const routeMap = {
      'taikhoan': '/taikhoan',
      'lichdica': '/lichdica',
      'vitri': '/vitri',
      'task': '/task',
      // Thêm các route khác khi cần
    };
    
    const route = routeMap[key];
    if (route) {
      navigate(route);
    }
  };

  // Lấy selected keys từ URL hiện tại
  const getSelectedKeys = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) return [];
    
    // Map path segments sang menu keys
    const pathToKeyMap = {
      'taikhoan': 'taikhoan',
      'lichdica': 'lichdica',
      'vitri': 'vitri',
      'task': 'task',
    };
    
    const keys = [];
    let currentPath = '';
    
    segments.forEach(segment => {
      currentPath += `/${segment}`;
      const key = pathToKeyMap[segment];
      if (key) {
        keys.push(key);
      }
    });
    
    return keys;
  };

  return (
    <div className="sidebar" style={{ background: '#e6f0fa', minHeight: '100vh', padding: 0 }}>
      <div className="logo" style={{ textAlign: "center", marginBottom: 20, paddingTop: 16 }}>
        <img src="/logo.png" alt="Logo" style={{ width: 180, marginBottom: 8 }} />
      </div>
      <Menu
        mode="inline"
        theme="light"
        items={allMenuItems}
        selectedKeys={getSelectedKeys()}
        style={{ 
          background: '#e6f0fa', 
          color: '#29547A', 
          fontWeight: 600, 
          fontSize: 15, 
          border: 'none',
          fontFamily: 'Segoe UI, sans-serif',
          width: 240
        }}
        onClick={handleMenuClick}
        className="sidebar-menu-override"
      />
    </div>
  );
}