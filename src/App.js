import React, { useState, useEffect } from "react";
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
import apiService from "./services/api";
import { ScheduleProvider } from "./contexts/ScheduleContext";
import './App.css';

// Hàm kiểm tra quyền quản lý toàn hệ thống
const isFullManager = (groupValue) => {
  return ['CQ', 'PCQ', 'TT'].includes(groupValue);
};

function App() {
  // Trạng thái đăng nhập dựa vào authToken
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("authToken"));

  // Trạng thái lưu mục menu đang chọn
  const [selectedMenu, setSelectedMenu] = useState("");

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
    // Gọi popup đổi mật khẩu hoặc chuyển tab tương ứng
    alert("Chức năng đổi mật khẩu!");
  };
  const handleLogout = () => {
    apiService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  // Hàm render nội dung theo menu
  const renderContent = () => {
    // Kiểm tra quyền truy cập - các tài khoản quản lý đều có toàn quyền
    const isAdmin = isFullManager(currentUser?.group_name);
    
    if (selectedMenu === "taikhoan") {
      // Chỉ các tài khoản quản lý mới được truy cập Tài khoản
      if (!isAdmin) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Chỉ Chủ Quản, Phó Chủ Quản hoặc Tổ Trưởng mới được phép truy cập.
        </div>;
      }
      return <BangDuLieu />;
    }
    if (selectedMenu === "phanquyen") {
      // Chỉ các tài khoản quản lý mới được truy cập Phân quyền
      if (!isAdmin) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Chỉ Chủ Quản, Phó Chủ Quản hoặc Tổ Trưởng mới được phép truy cập.
        </div>;
      }
      return <PhanQuyen />;
    }
    if (selectedMenu === "task") {
      return <TaskYeuCau user={currentUser} />;
    }
    if (selectedMenu === "vitri") {
      return <ViTriChoNgoi />;
    }
    if (selectedMenu === "apitest") {
      // Chỉ các tài khoản quản lý mới được truy cập API Test
      if (!isAdmin) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Chỉ Chủ Quản, Phó Chủ Quản hoặc Tổ Trưởng mới được phép truy cập.
        </div>;
      }
      return <ApiTest />;
    }
    if (selectedMenu === "lichdica") {
      return <LichDiCaTabs currentUser={currentUser} />;
    }
    // Thêm các mục khác ở đây nếu muốn
    return <div>Chọn một mục ở menu để xem nội dung</div>;
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => {
      setIsLoggedIn(true);
    }} />;
  }

  return (
    <ScheduleProvider>
      <div style={{ display: "flex" }}>
        <SidebarMenu onMenuClick={setSelectedMenu} userGroup={currentUser?.group_name} />


        <div style={{ flex: 1, padding: 20, marginLeft: 240}}>
          <UserMenu user={currentUser || { tenTaiKhoan: "", group: "", avatar: "" }} onChangePwd={handleChangePwd} onLogout={handleLogout} />

          <div className="content-container">
            {renderContent()}
          </div>
        </div>
      </div>
    </ScheduleProvider>
  );
}

export default App;