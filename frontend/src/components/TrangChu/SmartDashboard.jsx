import React, { useContext } from 'react';
import AuthContext from '../../contexts/AuthContext';
import UserDashboard from './UserDashboard';
import AdminDashboard from './AdminDashboard';

const SmartDashboard = () => {
  console.log('🚀 SmartDashboard component được render!');
  const auth = useContext(AuthContext);
  const { user, isAuthenticated, isLoading } = auth;

  // Loading state
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Đang kiểm tra quyền truy cập...</h2>
        <p>Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  // Error state
  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
        <h2>❌ Không thể xác thực</h2>
        <p>Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn</p>
        <p>Vui lòng đăng nhập lại</p>
      </div>
    );
  }

  // Kiểm tra role và hiển thị dashboard tương ứng
  console.log('🔍 SmartDashboard - User info:', { 
    user: !!user, 
    userRole: user?.role, 
    userRoleName: user?.roleName,
    userRoleType: typeof user?.role,
    userKeys: user ? Object.keys(user) : []
  });

  // Kiểm tra role ADMIN (có thể là string, object, hoặc roleName)
  const isAdmin = user && (
    user.role === 'ADMIN' || 
    user.role?.name === 'ADMIN' ||
    (typeof user.role === 'string' && user.role.toUpperCase() === 'ADMIN') ||
    user.roleName === 'ADMIN' ||
    (typeof user.roleName === 'string' && user.roleName.toUpperCase() === 'ADMIN')
  );

  console.log('🔍 SmartDashboard - Kết quả kiểm tra role:', {
    userExists: !!user,
    userRole: user?.role,
    userRoleName: user?.roleName,
    isAdmin: isAdmin,
    willShowAdminDashboard: isAdmin
  });

  if (isAdmin) {
    console.log('🔑 User có role ADMIN, hiển thị AdminDashboard');
    return <AdminDashboard />;
  } else {
    console.log('👤 User có role thường, hiển thị UserDashboard');
    return <UserDashboard />;
  }
};

export default SmartDashboard;
