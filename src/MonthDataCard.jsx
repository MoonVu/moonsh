import React, { memo } from "react";
import { Card, Input } from "antd";

const MonthDataCard = memo(({ 
  currentMonth, 
  currentYear, 
  handleMonthChange, 
  GROUPS, 
  phanCa, 
  waiting 
}) => {
  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 20 }}>Dữ liệu theo tháng</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Tháng:</span>
            <Input
              type="number"
              min="1"
              max="12"
              value={currentMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value), currentYear)}
              style={{ width: 60 }}
            />
            <span>Năm:</span>
            <Input
              type="number"
              min="2020"
              max="2030"
              value={currentYear}
              onChange={(e) => handleMonthChange(currentMonth, parseInt(e.target.value))}
              style={{ width: 80 }}
            />
          </div>
        </div>
      }
      style={{ marginBottom: 24, borderRadius: 12 }}
    >
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {GROUPS.map(group => {
          const groupData = phanCa[group.value] || [];
          const totalUsers = groupData.reduce((sum, ca) => sum + (ca.users?.length || 0), 0);
          const waitingCount = waiting[group.value]?.length || 0;
          const hasData = totalUsers > 0 || waitingCount > 0;
          
          return (
            <div
              key={group.value}
              style={{
                flex: '1',
                minWidth: 200,
                padding: 12,
                border: `2px solid ${hasData ? group.color : group.color + '55'}`,
                borderRadius: 8,
                background: hasData ? group.color + '15' : group.color + '08',
                position: 'relative'
              }}
            >
              {hasData && (
                <div style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: group.color,
                  color: '#fff',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700
                }}>
                  ✓
                </div>
              )}
              <div style={{ 
                color: group.color, 
                fontWeight: 800, 
                fontSize: 18, 
                marginBottom: 8 
              }}>
                {group.label}
              </div>
              <div style={{ fontSize: 15, color: '#333', fontWeight: 600 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Số ca:</span>
                  <span style={{ fontWeight: 600, fontSize: 18, color: group.color }}>{groupData.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Nhân sự trong ca:</span>
                  <span style={{ fontWeight: 600, fontSize: 18, color: totalUsers > 0 ? '#52c41a' : '#666' }}>
                    {totalUsers}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>Hàng chờ:</span>
                  <span style={{ fontWeight: 600, fontSize: 18, color: waitingCount > 0 ? '#faad14' : '#666' }}>
                    {waitingCount}
                  </span>
                </div>
                <div style={{ 
                  marginTop: 8, 
                  padding: 8, 
                  background: '#fff', 
                  borderRadius: 6,
                  fontSize: 14,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  {groupData.length > 0 ? (
                    groupData.map((ca, idx) => (
                      <div key={idx} style={{ 
                        marginBottom: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 600, color: group.color, fontSize: 15 }}>{ca.label}:</span>
                                                  <span style={{ 
                            background: ca.users?.length > 0 ? '#52c41a' : '#f5f5f5',
                            color: ca.users?.length > 0 ? '#fff' : '#666',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 13,
                            fontWeight: 600,
                            minWidth: 20,
                            textAlign: 'center'
                          }}>
                            {ca.users?.length || 0}
                          </span>
                      </div>
                    ))
                  ) : (
                    <span style={{ color: '#bbb', fontStyle: 'italic', fontSize: 14 }}>Chưa có dữ liệu</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});

MonthDataCard.displayName = 'MonthDataCard';

export default MonthDataCard; 