import React from 'react';

const StatusBar = ({
  syncStatus,
  lastModifiedBy,
  lastModifiedAt,
  setShowActionPanel
}) => {
  return (
    <div style={{ 
      marginBottom: 16, 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      fontSize: '14px'
    }}>
      <div>
        <button className="btn-edit" style={{minWidth:120, fontWeight:700, fontSize:17}} onClick={() => setShowActionPanel(true)}>
          Thao tác
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: syncStatus.includes('Lỗi') ? '#ff4d4f' : '#52c41a' }}>
          {syncStatus}
        </span>
        {lastModifiedBy && (
          <span style={{ color: 'red', fontWeight: 600 }}>
            Sửa đổi lần cuối bởi: {lastModifiedBy}
          </span>
        )}
        {lastModifiedAt && (
          <span style={{ color: '#666' }}>
            {new Date(lastModifiedAt).toLocaleString('vi-VN')}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatusBar; 