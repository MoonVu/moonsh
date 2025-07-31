import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";
import BangDuLieu from "./BangDuLieu";
import ClockGMT7 from "./ClockGMT7";
import UserMenu from "./UserMenu";
import PhanQuyen from "./PhanQuyen";
import TaskYeuCau from "./TaskYeuCau";
import Login from "./Login";
import ViTriChoNgoi from "./ViTriChoNgoi";
import ApiTest from "./ApiTest";
import LichDiCaTabs from "./LichDiCaTabs";
import Breadcrumb from "./components/Breadcrumb";
import apiService from "./services/api";
import { ScheduleProvider } from "./contexts/ScheduleContext";
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

// Hàm kiểm tra quyền quản lý toàn hệ thống
const isFullManager = (groupValue) => {
  return ['CQ', 'PCQ', 'TT'].includes(groupValue);
};

// Component chính cho layout đã đăng nhập
const MainLayout = ({ currentUser, onLogout, onChangePwd }) => {
  const location = useLocation();
  
  // Lấy menu hiện tại từ URL
  const getCurrentMenu = () => {
    const path = location.pathname;
    if (path === '/') return '';
    return path.split('/')[1] || '';
  };

  return (
    <div style={{ display: "flex" }}>
      <SidebarMenu 
        onMenuClick={(menu) => {}} 
        userGroup={currentUser?.group_name}
        currentMenu={getCurrentMenu()}
      />

      <div style={{ flex: 1, padding: 20, marginLeft: 240 }}>
        <UserMenu 
          user={currentUser || { tenTaiKhoan: "", group: "", avatar: "" }} 
          onChangePwd={onChangePwd} 
          onLogout={onLogout} 
        />

        <Breadcrumb />

        <div className="content-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/taikhoan" 
              element={
                <ProtectedRoute 
                  component={BangDuLieu} 
                  user={currentUser} 
                  requiredRole="admin"
                />
              } 
            />
            <Route 
              path="/phanquyen" 
              element={
                <ProtectedRoute 
                  component={PhanQuyen} 
                  user={currentUser} 
                  requiredRole="admin"
                />
              } 
            />
            <Route path="/task" element={<TaskYeuCau user={currentUser} />} />
            <Route path="/vitri" element={<ViTriChoNgoi />} />
            <Route 
              path="/apitest" 
              element={
                <ProtectedRoute 
                  component={ApiTest} 
                  user={currentUser} 
                  requiredRole="admin"
                />
              } 
            />
            <Route path="/lichdica" element={<LichDiCaTabs currentUser={currentUser} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

// Component bảo vệ route
const ProtectedRoute = ({ component: Component, user, requiredRole }) => {
  if (requiredRole === "admin" && !isFullManager(user?.group_name)) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Chỉ Chủ Quản, Phó Chủ Quản hoặc Tổ Trưởng mới được phép truy cập.
      </div>
    );
  }
  return <Component />;
};

// Trang chủ
const HomePage = () => {
  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>Chào mừng đến với hệ thống Moon</h2>
      <p>Vui lòng chọn một mục từ menu để bắt đầu.</p>
    </div>
  );
};

function App() {
  // Trạng thái đăng nhập dựa vào authToken
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      apiService.getProfile()
        .then(setCurrentUser)
        .catch(() => {
          setCurrentUser(null);
          setIsLoggedIn(false);
        });
    } else {
      setCurrentUser(null);
    }
  }, [isLoggedIn]);

  const handleChangePwd = () => {
    alert("Chức năng đổi mật khẩu!");
  };

  const handleLogout = () => {
    apiService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <ScheduleProvider>
          <MainLayout 
            currentUser={currentUser}
            onLogout={handleLogout}
            onChangePwd={handleChangePwd}
          />
        </ScheduleProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;