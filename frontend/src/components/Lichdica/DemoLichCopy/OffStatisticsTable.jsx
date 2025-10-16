import React, { useState, useMemo } from "react";
import { Modal, Table, Button } from 'antd';
import { GROUPS } from './constants';

export default function OffStatisticsTable({ scheduleData, staffsByCa, notesData, daysInMonth, month, year }) {
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Tính toán thống kê OFF theo bộ phận
  const getOffStatistics = useMemo(() => {
    // Tạo stats object động từ GROUPS
    const stats = {};
    GROUPS.forEach(group => {
      stats[group.label] = { 
        today: 0, 
        tomorrow: 0, 
        details: { today: [], tomorrow: [] },
        color: group.color,
        subs: group.subs
      };
    });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayDay = today.getDate();
    const tomorrowDay = tomorrow.getDate();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Chỉ tính thống kê nếu đang xem tháng hiện tại
    if (month === currentMonth && year === currentYear) {
      staffsByCa.forEach(staff => {
        const staffDept = staff.department;
        
        // Tìm bộ phận chính dựa trên subs array
        let mainDept = null;
        for (const group of GROUPS) {
          if (group.subs.includes(staffDept)) {
            mainDept = group.label;
            break;
          }
        }
        
        if (mainDept && stats[mainDept]) {
          // Kiểm tra ngày hôm nay
          const todayStatus = scheduleData[staff.id]?.[todayDay];
          if (todayStatus === 'OFF') {
            stats[mainDept].today++;
            stats[mainDept].details.today.push({
              name: staff.name,
              ca: staff.ca,
              caTime: staff.caTime,
              day: todayDay,
              originalDept: staffDept // Lưu bộ phận gốc để hiển thị
            });
          }

          // Kiểm tra ngày mai
          const tomorrowStatus = scheduleData[staff.id]?.[tomorrowDay];
          if (tomorrowStatus === 'OFF') {
            stats[mainDept].tomorrow++;
            stats[mainDept].details.tomorrow.push({
              name: staff.name,
              ca: staff.ca,
              caTime: staff.caTime,
              day: tomorrowDay,
              originalDept: staffDept // Lưu bộ phận gốc để hiển thị
            });
          }
        }
      });
    }

    return stats;
  }, [scheduleData, staffsByCa, month, year]);

  const handleShowDetails = (dept, dateType) => {
    setSelectedDepartment(dept);
    setSelectedDate(dateType);
    setShowDetailModal(true);
  };

  const getDateLabel = (dateType) => {
    return dateType === 'today' ? 'Hôm nay' : 'Ngày mai';
  };

  const getDateNumber = (dateType) => {
    const today = new Date();
    if (dateType === 'today') return today.getDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.getDate();
  };

  return (
    <>
      <div style={{ 
        marginBottom: '20px', 
        padding: '16px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#495057', 
          fontSize: '18px',
          fontWeight: '600'
        }}>
          📊 Thống kê nhân viên OFF trong ngày - Bấm vào số để hiển thị chi tiết người OFF - Tháng {month}/{year}
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '16px'
        }}>
          {Object.entries(getOffStatistics).map(([dept, data]) => (
            <div key={dept} style={{ 
              background: 'white', 
              padding: '16px', 
              borderRadius: '8px',
              border: `2px solid ${data.color}`,
              textAlign: 'center',
              boxShadow: `0 2px 8px ${data.color}20`
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: data.color,
                marginBottom: '12px'
              }}>
                {dept}
              </div>
             
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#dc3545',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  onClick={() => handleShowDetails(dept, 'today')}
                  title={`Click để xem chi tiết nhân viên OFF ngày ${getDateNumber('today')}`}
                  >
                    {data.today}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Ngày {getDateNumber('today')}
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#fd7e14',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  onClick={() => handleShowDetails(dept, 'tomorrow')}
                  title={`Click để xem chi tiết nhân viên OFF ngày ${getDateNumber('tomorrow')}`}
                  >
                    {data.tomorrow}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Ngày {getDateNumber('tomorrow')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal hiển thị chi tiết */}
      <Modal
        title={
          <div style={{ 
            textAlign: 'center', 
            color: '#1890ff',
            fontSize: '16px',
            fontWeight: '570'
          }}>
            📊 Chi tiết OFF bộ phận
          </div>
        }
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
        ]}
        width={700}
        style={{
          borderRadius: '12px',
          overflow: 'hidden'
        }}
        styles={{
          body: {
            padding: '24px',
            background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)'
          }
        }}
        className="off-stats-modal"
      >
        {selectedDepartment && selectedDate && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <strong className="dept-label">Bộ phận:</strong> 
              <span style={{ 
                fontSize: '25px', 
                color: getOffStatistics[selectedDepartment]?.color || '#dc3545', 
                fontWeight: '570',
                marginLeft: '8px'
              }}>
                {selectedDepartment}
              </span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <span className="date-label">
                {getDateLabel(selectedDate)} ({getDateNumber(selectedDate)}/{month}/{year})
              </span>
            </div>
            
            <Table
              dataSource={getOffStatistics[selectedDepartment]?.details[selectedDate] || []}
              columns={[
                {
                  title: 'STT',
                  key: 'index',
                  render: (_, __, index) => index + 1,
                  width: 60
                },
                {
                  title: 'Tên nhân viên',
                  dataIndex: 'name',
                  key: 'name'
                },
                {
                  title: 'Bộ phận gốc',
                  dataIndex: 'originalDept',
                  key: 'originalDept',
                  render: (dept) => (
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: '#f0f0f0',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {dept}
                    </span>
                  )
                },
                {
                  title: 'Ca làm việc',
                  dataIndex: 'ca',
                  key: 'ca',
                  render: (ca, record) => (
                    <span>
                      {ca}
                      {record.caTime && (
                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                          ({record.caTime})
                        </span>
                      )}
                    </span>
                  )
                }
              ]}
              pagination={false}
              size="small"
            />
            
            {/* Thông báo khi không có dữ liệu */}
            {getOffStatistics[selectedDepartment]?.details[selectedDate]?.length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '32px 20px',
                background: 'linear-gradient(135deg, #f6ffed 0%, #ffffff 100%)',
                borderRadius: '12px',
                border: '2px dashed #b7eb8f',
                marginTop: '16px'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                  opacity: 0.6
                }}>
                  😴
                </div>
                <div style={{ 
                  fontSize: '16px',
                  color: '#52c41a',
                  fontWeight: '500',
                  fontStyle: 'italic'
                }}>
                  Không có nhân viên nào OFF trong ngày này
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#8c8c8c',
                  marginTop: '8px'
                }}>
                  Tất cả nhân viên đều đang làm việc đầy đủ.
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
