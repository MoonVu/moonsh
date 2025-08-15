import React, { useState, useEffect, useMemo } from "react";
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

// LocalStorage key cho việc lưu trạng thái openKeys
const LS_OPEN_KEYS = "antd_open_keys_v2";

// Hàm tìm đường dẫn key từ target key
function findKeyPath(nodes, target) {
  for (const node of nodes) {
    if (node.key === target) return [node.key];
    if (node.children) {
      const childPath = findKeyPath(node.children, target);
      if (childPath) return [node.key, ...childPath];
    }
  }
  return null;
}

// Hàm tìm đường dẫn tốt nhất dựa trên pathname
function findBestPrefixPath(nodes, pathname) {
  let best = null;
  
  const dfs = (arr, stack) => {
    for (const node of arr) {
      const nextStack = [...stack, node.key];
      if (node.key.startsWith("/") && pathname.startsWith(node.key)) {
        if (!best || node.key.length > best.leafKey.length) {
          best = { path: nextStack, leafKey: node.key };
        }
      }
      if (node.children) {
        dfs(node.children, nextStack);
      }
    }
  };
  
  dfs(nodes, []);
  return best?.path ?? null;
}

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

// Chuyển cấu trúc menu sang dạng items với route paths làm keys
const allMenuItems = [
  {
    key: 'quantri',
    icon: <SettingOutlined />,
    label: createLabelWithTooltip('QUẢN TRỊ'),
    children: [
      { key: '/taikhoan', icon: <UserOutlined />, label: createLabelWithTooltip('Tài khoản') },
      {
        key: 'lichlamviec',
        icon: <CalendarOutlined />,
        label: createLabelWithTooltip('Lịch làm việc'),
        children: [
          { key: '/lichdica', label: createLabelWithTooltip('Lịch đi ca'), icon: <TableOutlined /> },
          {
            key: 'lichvephep',
            label: createLabelWithTooltip('Lịch về phép'),
            icon: <SolutionOutlined />,
            children: [
              { key: '/lichve', label: createLabelWithTooltip('Lịch về'), icon: <SolutionOutlined /> },
              { key: '/chitiet', label: createLabelWithTooltip('Chi tiết'), icon: <IdcardOutlined /> },
            ],
          },
          { key: '/vitri', label: createLabelWithTooltip('Vị trí chỗ ngồi'), icon: <EnvironmentOutlined /> },
        ],
      },
    ],
  },
  {
    key: 'bank',
    icon: <HomeOutlined />,
    label: createLabelWithTooltip('BANK'),
    children: [
      { key: '/thongke', label: createLabelWithTooltip('Thống kê (số liệu chung)'), icon: <TableOutlined /> },
      { key: '/chuthe', label: createLabelWithTooltip('Danh sách chủ thẻ ngoại bộ'), icon: <UsergroupAddOutlined /> },
      { key: '/bankvqm', label: createLabelWithTooltip('Danh sách bank VQM'), icon: <TableOutlined /> },
      { key: '/luutru', label: createLabelWithTooltip('Lưu trữ bank khóa'), icon: <ContainerOutlined /> },
    ],
  },
  {
    key: 'xnk',
    icon: <AppstoreOutlined />,
    label: createLabelWithTooltip('XNK'),
    children: [
      { key: '/task', label: createLabelWithTooltip('Task yêu cầu'), icon: <MailOutlined /> },
      { key: '/nhanvien', label: createLabelWithTooltip('Danh sách nhân viên'), icon: <TeamOutlined /> },
      { key: '/thongkeloi', label: createLabelWithTooltip('Thống kê lỗi sai trong tháng'), icon: <TableOutlined /> },
      { key: '/donchuyenloi', label: createLabelWithTooltip('Các đơn chuyển lỗi'), icon: <ContainerOutlined /> },
    ],
  },
  {
    key: 'cskh',
    icon: <DesktopOutlined />,
    label: createLabelWithTooltip('CSKH'),
    children: [
      { key: '/taskcskh', label: createLabelWithTooltip('Task yêu cầu'), icon: <MailOutlined /> },
      { key: '/rut', label: createLabelWithTooltip('Đơn rút tiền'), icon: <ContainerOutlined /> },
      { key: '/nap', label: createLabelWithTooltip('Đơn nạp tiền'), icon: <ContainerOutlined /> },
    ],
  },
];

export default function SidebarMenu({ currentMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State cho openKeys với localStorage persistence
  const [openKeys, setOpenKeys] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_OPEN_KEYS) || "[]");
    } catch {
      return [];
    }
  });

  // Tính selectedKeys dựa trên pathname hiện tại
  const selectedKeys = useMemo(() => [location.pathname], [location.pathname]);

  // Effect để tự động mở các parent menu khi navigate
  useEffect(() => {
    let path = findKeyPath(allMenuItems, location.pathname) 
            || findBestPrefixPath(allMenuItems, location.pathname);
    
    if (!path) return;

    const ancestorKeys = path.slice(0, -1);
    if (ancestorKeys.some(k => !openKeys.includes(k))) {
      const nextOpenKeys = Array.from(new Set([...openKeys, ...ancestorKeys]));
      setOpenKeys(nextOpenKeys);
      localStorage.setItem(LS_OPEN_KEYS, JSON.stringify(nextOpenKeys));
    }
  }, [location.pathname, openKeys]);

  // Xử lý thay đổi openKeys
  const handleOpenChange = (keys) => {
    setOpenKeys(keys);
    localStorage.setItem(LS_OPEN_KEYS, JSON.stringify(keys));
  };

  // Xử lý click menu
  const handleMenuClick = ({ key }) => {
    if (String(key).startsWith("/")) {
      navigate(String(key));
    }
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
        openKeys={openKeys}
        selectedKeys={selectedKeys}
        onOpenChange={handleOpenChange}
        onClick={handleMenuClick}
        style={{ 
          background: '#e6f0fa', 
          color: '#29547A', 
          fontWeight: 600, 
          fontSize: 15, 
          border: 'none',
          fontFamily: 'Segoe UI, sans-serif',
          width: 240
        }}
        className="sidebar-menu-override"
      />
    </div>
  );
}