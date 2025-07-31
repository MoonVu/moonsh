import React from 'react';
import { useLocation } from 'react-router-dom';

const BreadcrumbDemo = () => {
  const location = useLocation();
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '10px 0' }}>
      <h3>Breadcrumb Demo</h3>
      <p><strong>Current Path:</strong> {location.pathname}</p>
      <p><strong>Search:</strong> {location.search}</p>
      <p><strong>Hash:</strong> {location.hash}</p>
    </div>
  );
};

export default BreadcrumbDemo; 