import React from 'react';
import './TrangChu.css';

const TrangChu = () => {
  return (
    <div className="trang-chu-container">
      <div className="trang-chu-header">
        <h1>Chào mừng đến với SHBET</h1>
        <p className="subtitle">Hệ thống quản lý lịch làm việc</p>
      </div>

      <div className="trang-chu-content">
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>Xin chào cả nhà</h2>
            <p>Mọi người có ý kiến đóng góp vui lòng gửi cho Moon nha.</p>
          </div>
        </div>

        <div className="quick-info-section">
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon">📅</div>
              <h3>Lịch làm việc</h3>
              <p>Quản lý và xem lịch làm việc của bạn</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">👥</div>
              <h3>Nhân sự</h3>
              <p>Thông tin về đội ngũ nhân viên</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">📊</div>
              <h3>Báo cáo</h3>
              <p>Xem các báo cáo và thống kê</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">⚙️</div>
              <h3>Cài đặt</h3>
              <p>Tùy chỉnh hệ thống theo nhu cầu</p>
            </div>
          </div>
        </div>

        <div className="placeholder-section">
          <div className="placeholder-card">
            <h3>Dữ liệu đang được cập nhật</h3>
            <p>Nội dung chi tiết sẽ được bổ sung trong các phiên bản tiếp theo.</p>
            <div className="loading-animation">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrangChu;
