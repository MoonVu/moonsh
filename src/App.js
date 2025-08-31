import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

function App() {
  return (
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
  );
}

export default App;