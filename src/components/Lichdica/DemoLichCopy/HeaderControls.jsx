import React from "react";
import { ShowForPermission as AccessControl } from "../../auth/AccessControl";
import { useAuth } from "../../../hooks/useAuth";

export default function HeaderControls({
  month,
  setMonth,
  year,
  setYear,
  daysInMonth,
  notesData,
  handleOpenEditShift,
  setNoteModalVisible,
  handleDeleteCopy,
  handleExportToExcel
}) {
  const { isAdmin } = useAuth();

  return (
    <div className="header-controls">
      <div className="date-controls" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}>
        <AccessControl 
          resource="schedules" 
          action="edit"
          fallback={
            <>
              <span className="date-label">Tháng: {month}</span>
              <span className="date-label">Năm: {year}</span>
            </>
          }
        >
          <label className="date-input-group">
            <span className="date-label">Tháng:</span>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="date-input"
            />
          </label>
          <label className="date-input-group">
            <span className="date-label">Năm:</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="date-input"
            />
          </label>
        </AccessControl>
        <span className="days-count">
          Số ngày: {daysInMonth}
        </span>
        {/* Chú giải trạng thái - nằm cùng hàng, gọn một dòng */}
        <div
          className="status-legend"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginLeft: 16,
            flexWrap: 'nowrap',
            fontSize: 13
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, background: '#174ea6', display: 'inline-block', borderRadius: 2 }} />
            <span>OFF = Ngày OFF</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, background: '#6a8caf', display: 'inline-block', borderRadius: 2 }} />
            <span>1 = 1 ngày</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, background: '#8e24aa', display: 'inline-block', borderRadius: 2 }} />
            <span>1/2 = Nửa ngày</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, background: '#ffe066', display: 'inline-block', borderRadius: 2 }} />
            <span>VP = Về phép</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, background: '#e53935', display: 'inline-block', borderRadius: 2 }} />
            <span>X = Ngày đang về phép</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, background: '#ffd600', display: 'inline-block', borderRadius: 2 }} />
            <span>QL = Quay lại</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, background: '#7c43bd', display: 'inline-block', borderRadius: 2 }} />
            <span>KL = OFF Không lương</span>
          </div>
        </div>
        
      </div>

      {/* Hàng dưới: các nút thao tác dành cho ADMIN */}
      <div className="action-controls" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <AccessControl resource="schedules" action="edit" fallback={null}>
          <button
            onClick={handleOpenEditShift}
            className="edit-shift-button"
            style={{ backgroundColor: '#faad14', color: '#222', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            title="Chỉnh sửa ca nhân viên"
          >
            Chỉnh sửa ca
          </button>
          {/* Hiển thị số lượng ghi chú cho tất cả users */}
          {(() => {
            const totalNotes = Object.values(notesData).reduce((total, staffNotes) => {
              return total + Object.values(staffNotes || {}).filter(note => note).length;
            }, 0);
            return totalNotes > 0 ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                border: '1px solid #d9d9d9',
                fontSize: '14px',
                color: '#666'
              }}>
                <span>{isAdmin ? '📝' : '👁️'} Tổng số ghi chú: {totalNotes}</span>
                {!isAdmin && (
                  <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                    (Chỉ xem, không thể chỉnh sửa)
                  </span>
                )}
              </div>
            ) : null;
          })()}
          
          <AccessControl resource="schedules" action="edit" fallback={null}>
            <button
              onClick={() => setNoteModalVisible(true)}
              className="note-button"
              style={{ 
                backgroundColor: '#722ed1', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '4px', 
                cursor: 'pointer',
                position: 'relative'
              }}
              title="Chèn ghi chú vào ô (chỉ ADMIN)"
            >
              📝 Chèn ghi chú
            </button>
          </AccessControl>
          <button
            onClick={() => window.refreshCopyTab && window.refreshCopyTab()}
            className="refresh-button"
            style={{ backgroundColor: '#1890ff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            title="Làm mới dữ liệu từ backend"
          >
            🔄 Làm mới
          </button>
          <AccessControl resource="schedules" action="delete" fallback={null}>
            <button
              onClick={handleDeleteCopy}
              className="delete-copy-button"
              style={{ backgroundColor: '#ff4d4f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
              title="Xóa bản sao này (chỉ ADMIN)"
            >
              🗑️ Xóa bản sao
            </button>
          </AccessControl>
        </AccessControl>

        <AccessControl permission="reports" action="view" fallback={null}>
          <button
            onClick={handleExportToExcel}
            className="export-excel-button"
            style={{ backgroundColor: '#52c41a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            title="Xuất dữ liệu ra file Excel (.xlsx)"
          >
            ┌( ಠ_ಠ)┘ Xuất Excel
          </button>
        </AccessControl>
      </div>
    </div>
  );
}
