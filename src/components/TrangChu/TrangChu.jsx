import React, { useContext } from 'react';
import AuthContext from '../../contexts/AuthContext';
import './TrangChu.css';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

const TrangChu = () => {
  const { role } = useContext(AuthContext);

  // Render dashboard theo role
  if (role === 'ADMIN') {
    return <AdminDashboard />;
  }

  // Tất cả role khác (XNK, CSKH, FK) đều dùng chung UserDashboard
  return <UserDashboard userRole={role} />;
};

export default TrangChu;
