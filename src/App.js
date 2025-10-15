import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ConfigProvider, App as AntdApp } from 'antd';
import SidebarMenu from "./SidebarMenu";
import BangDuLieu from "./BangDuLieu";
import ClockGMT7 from "./ClockGMT7";
import UserMenu from "./UserMenu";
import TaskYeuCau from "./TaskYeuCau";
import Login from "./Login";
import ViTriChoNgoi from "./ViTriChoNgoi";

import LichDiCaTabs from "./LichDiCaTabs";
import LichVe from "./components/Lichdica/lichve";
import Breadcrumb from "./components/Breadcrumb";
import apiService from "./services/api";
import { ScheduleProvider } from "./contexts/ScheduleContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { RequireAdmin } from "./components/auth/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import TokenExpiredNotice from "./components/TokenExpiredNotice";
import TrangChu from "./components/TrangChu";
import TelegramBillSender from "./components/TelegramBillSender";
import './App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ App Error:', error);
    console.error('❌ Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>❌ Lỗi ứng dụng:</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Tải lại trang</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Component chính cho layout đã đăng nhập
const MainLayout = () => {
  const location = useLocation();
  
  // Lấy menu hiện tại từ URL
  const getCurrentMenu = () => {
    const path = location.pathname;
    if (path === '/') return '';
    return path.split('/')[1] || '';
  };

  return (
    <ProtectedRoute>
      <div style={{ display: "flex" }}>
        <SidebarMenu 
          onMenuClick={(menu) => {}} 
          currentMenu={getCurrentMenu()}
        />

        <div style={{ flex: 1, padding: 20, marginLeft: 240 }}>
          <UserMenu />
          <Breadcrumb />

          <div className="content-container">
            <Routes>
              <Route path="/" element={<TrangChu />} />
              <Route path="/trangchu" element={<TrangChu />} />
              <Route path="/taikhoan" element={<BangDuLieu />} />
              <Route path="/task" element={<TaskYeuCau />} />
              <Route path="/vitri" element={<ViTriChoNgoi />} />
              <Route path="/lichdica" element={<LichDiCaTabs />} />
              <Route path="/lichve" element={<LichVe />} />
              <Route path="/nap" element={<TelegramBillSender />} />
              <Route 
                path="/admin" 
                element={
                  <RequireAdmin>
                    <AdminPage />
                  </RequireAdmin>
                } 
              />
              <Route path="*" element={<Navigate to="/trangchu" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};



// AdminPage đã được import từ file riêng

// Ant Design Theme Configuration
const theme = {
  token: {
    // Primary Colors
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',
    
    // Link Colors
    colorLink: '#1890ff',
    colorLinkHover: '#40a9ff',
    colorLinkActive: '#096dd9',
    
    // Background Colors
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgSpotlight: '#ffffff',
    
    // Border Colors
    colorBorder: '#f0f0f0',
    colorBorderSecondary: '#f0f0f0',
    
    // Text Colors
    colorText: '#262626',
    colorTextSecondary: '#8c8c8c',
    colorTextTertiary: '#bfbfbf',
    colorTextQuaternary: '#d9d9d9',
    
    // Button
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // Shadow
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    boxShadowSecondary: '0 2px 8px rgba(0, 0, 0, 0.1)',
    
    // Font
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontWeightStrong: 600,
    
    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    margin: 16,
    marginLG: 24,
    marginSM: 12,
    
    // Height
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
  },
  components: {
    Button: {
      borderRadius: 8,
      fontWeight: 600,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      controlHeight: 36,
      paddingInline: 16,
    },
    Modal: {
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      paddingLG: 32,
    },
    Table: {
      borderRadius: 12,
      headerBg: '#fafafa',
      headerColor: '#1890ff',
      rowHoverBg: '#f0f9ff',
      borderColor: '#f0f0f0',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      headerBg: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
      paddingInline: 12,
      borderColor: '#f0f0f0',
      hoverBorderColor: '#40a9ff',
      activeBorderColor: '#1890ff',
    },
    Form: {
      labelColor: '#262626',
      labelFontSize: 14,
      labelFontWeight: 600,
    },
    Alert: {
      borderRadius: 8,
      fontSize: 14,
    },
    Tabs: {
      cardBg: '#fafafa',
      horizontalItemPadding: '12px 20px',
      borderRadius: 8,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 8,
      controlHeight: 36,
    },
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp>
        <ErrorBoundary>
          <Router>
            <AuthProvider>
              <TokenExpiredNotice />
              <ScheduleProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/*" element={<MainLayout />} />
                </Routes>
              </ScheduleProvider>
            </AuthProvider>
          </Router>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;