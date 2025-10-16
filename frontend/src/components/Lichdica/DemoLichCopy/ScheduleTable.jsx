import React from "react";
import { ShowForPermission as AccessControl } from "../../auth/AccessControl";
import { useAuth } from "../../../hooks/useAuth";
import { STATUS_COLORS, STATUS_OPTIONS } from "./constants";
import apiService from "../../../services/api";

export default function ScheduleTable({
  filteredStaffsByCa,
  daysInMonth,
  scheduleData,
  setScheduleData,
  notesData,
  rowspans,
  shouldShowCell,
  handleOpenEditNote,
  copyData,
  month,
  year,
  phanCa,
  notesData: notesDataProp
}) {
  const { isAdmin } = useAuth();

  return (
    <div className="table-container">
      <table className="schedule-table">
        <thead>
          <tr>
            <th className="col-stt">STT</th>
            <th className="col-time">Thời gian làm việc</th>
            <th className="col-dept">Bộ phận</th>
            <th className="col-name">Tên nhân viên</th>
            {Array.from({ length: daysInMonth }, (_, i) => (
              <th key={i + 1} className="col-day">{String(i + 1).padStart(2, '0')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredStaffsByCa.length > 0 ? (
            filteredStaffsByCa.map((staff, idx) => (
              <tr key={staff.id}>
                <td className="col-stt">{idx + 1}</td>
                {shouldShowCell('ca', idx) && (
                  <td className="col-time" rowSpan={rowspans.ca[idx]}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1976d2' }}>
                        {staff.ca}
                        {staff.caTime && (
                          <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                            ({staff.caTime})
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                )}
                {shouldShowCell('department', idx) && (
                  <td className="col-dept" rowSpan={rowspans.department[idx]}>
                    {staff.department}
                  </td>
                )}
                <td className="col-name">{staff.name}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const value = scheduleData[staff.id]?.[i + 1] || "";
                  let bg = "";
                  if (value && STATUS_COLORS[value]) bg = STATUS_COLORS[value];
                  let color = value === "VP" || value === "QL" ? "#000" : "#fff";
                  if (!value) color = "#222";
                  const hasNote = !!(notesData[staff.id]?.[i + 1]);
                  return (
                    <td
                      key={i + 1}
                      className="col-day"
                      style={{
                        background: bg,
                        color,
                        position: 'relative',
                        minHeight: '40px',
                        padding: '8px 4px',
                        cursor: hasNote && !isAdmin ? 'help' : 'default',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={hasNote && !isAdmin ? (e) => {
                        e.target.style.backgroundColor = '#f0f8ff';
                      } : undefined}
                      onMouseLeave={hasNote && !isAdmin ? (e) => {
                        e.target.style.backgroundColor = bg;
                      } : undefined}
                      title={hasNote ? `${isAdmin ? 'Click để chỉnh sửa' : 'Xem'} ghi chú: ${notesData[staff.id][i + 1]}` : undefined}
                    >
                      {hasNote && (
                        <>
                          {/* Icon ghi chú nổi bật ở góc phải - chỉ admin mới có thể click */}
                          <div
                            style={{
                              position: 'absolute',
                              right: '2px',
                              top: '2px',
                              width: '12px',
                              height: '12px',
                              background: isAdmin ? '#ff6b35' : '#999',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: 'white',
                              fontWeight: 'bold',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                              zIndex: 2,
                              cursor: isAdmin ? 'pointer' : 'default',
                              border: '2px solid white'
                            }}
                            title={isAdmin ? `Click để chỉnh sửa ghi chú: ${notesData[staff.id][i + 1]}` : `Ghi chú: ${notesData[staff.id][i + 1]}`}
                            onClick={isAdmin ? (e) => {
                              e.stopPropagation();
                              handleOpenEditNote(staff.id, i + 1, notesData[staff.id][i + 1], staff.name);
                            } : undefined}
                          >
                            {isAdmin ? '⭐️' : '📝'}
                          </div>
                          {/* Hiển thị ghi chú khi hover - bên phải ô */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '100%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: '#333',
                              color: 'white',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              maxWidth: '250px',
                              whiteSpace: 'normal',
                              overflow: 'hidden',
                              wordWrap: 'break-word',
                              lineHeight: '1.4',
                              opacity: 0,
                              transition: 'opacity 0.3s ease',
                              pointerEvents: 'none',
                              zIndex: 10,
                              marginLeft: '8px'
                            }}
                            className="note-tooltip"
                            onMouseEnter={(e) => {
                              e.target.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.opacity = '0';
                            }}
                          >
                            {notesData[staff.id][i + 1]}
                          </div>
                        </>
                      )}
                      {/* Nhân viên chỉ xem được, ADMIN mới có thể chỉnh sửa */}
                      <AccessControl 
                        resource="schedules" 
                        action="edit"
                        fallback={
                          <span style={{ 
                            display: 'block', 
                            textAlign: 'center', 
                            fontWeight: 600,
                            padding: '4px',
                            fontSize: hasNote ? '14px' : '13px',
                            color: hasNote ? '#d63384' : 'inherit'
                          }}>
                            {value}
                          </span>
                        }
                      >
                        <select
                          value={value}
                          onChange={async (e) => {
                            const newValue = e.target.value;
                            
                            // Cập nhật UI ngay lập tức
                            setScheduleData(prev => ({
                              ...prev,
                              [staff.id]: {
                                ...prev[staff.id],
                                [i + 1]: newValue
                              }
                            }));
                            
                            // Tự động gửi API về backend
                            try {
                              console.log('🔄 Tự động lưu thay đổi trạng thái:', {
                                staffId: staff.id,
                                day: i + 1,
                                newValue,
                                copyId: copyData?.copyId
                              });
                              
                              if (copyData?.copyId) {
                                const response = await apiService.updateScheduleCopy(copyData.copyId, {
                                  month,
                                  year,
                                  name: `Bản sao tháng ${month}/${year}`,
                                  scheduleData: {
                                    ...scheduleData,
                                    [staff.id]: {
                                      ...scheduleData[staff.id],
                                      [i + 1]: newValue
                                    }
                                  },
                                  phanCa,
                                  notesData: notesDataProp
                                });
                                
                                if (response && response.success) {
                                  console.log('✅ Đã tự động lưu thay đổi trạng thái thành công');
                                } else {
                                  console.error('❌ Lỗi khi tự động lưu thay đổi trạng thái:', response?.error);
                                }
                              }
                            } catch (error) {
                              console.error('❌ Lỗi khi tự động lưu thay đổi trạng thái:', error);
                              // Không hiển thị error message để tránh làm phiền user
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: 'transparent',
                            color: color,
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            fontWeight: 600,
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontSize: hasNote ? '14px' : '13px'
                          }}
                        >
                          {STATUS_OPTIONS.map(option => (
                            <option key={option} value={option} style={{ background: bg }}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </AccessControl>
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4 + daysInMonth} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                <div style={{ fontSize: '16px', marginBottom: '10px', color: '#ff4d4f' }}>
                  🔍 Không tìm thấy nhân viên nào phù hợp với bộ lọc
                </div>
                <div style={{ fontSize: '14px', color: '#888' }}>
                  Hãy thử thay đổi bộ lọc hoặc nhấn "Xóa bộ lọc" để xem tất cả
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
