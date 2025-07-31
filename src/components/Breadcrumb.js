import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import './Breadcrumb.css';

const Breadcrumb = () => {
  const location = useLocation();
  
  // Tạo breadcrumb items từ pathname
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Thêm Home
    breadcrumbs.push({
      name: 'Trang chủ',
      path: '/',
      isActive: pathSegments.length === 0
    });
    
    // Thêm các segment
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Map tên hiển thị cho các route
      const displayName = getDisplayName(segment);
      
      breadcrumbs.push({
        name: displayName,
        path: currentPath,
        isActive: index === pathSegments.length - 1
      });
    });
    
    return breadcrumbs;
  };
  
  // Map route names sang tên hiển thị tiếng Việt
  const getDisplayName = (segment) => {
    const nameMap = {
      'taikhoan': 'Quản lý tài khoản',
      'phanquyen': 'Phân quyền',
      'task': 'Yêu cầu công việc',
      'vitri': 'Vị trí chỗ ngồi',
      'apitest': 'API Test',
      'lichdica': 'Lịch đi ca',
      'schedules': 'Lịch phân ca',
      'users': 'Người dùng',
      'settings': 'Cài đặt'
    };
    
    return nameMap[segment] || segment;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  return (
    <nav className="breadcrumb-nav">
      <div className="breadcrumb-container">
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="breadcrumb-separator">/</span>}
            {breadcrumb.isActive ? (
              <span className="breadcrumb-item active">
                {breadcrumb.name}
              </span>
            ) : (
              <Link to={breadcrumb.path} className="breadcrumb-item">
                {breadcrumb.name}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
};

export default Breadcrumb; 