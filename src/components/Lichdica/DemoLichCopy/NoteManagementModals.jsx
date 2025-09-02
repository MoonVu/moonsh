import React, { useState, useEffect, useMemo } from "react";
import { Modal, Form, Input, message, Select } from 'antd';
import { useAuth } from "../../../hooks/useAuth";
import { ShowForPermission as AccessControl } from "../../auth/AccessControl";
import apiService from "../../../services/api";

export default function NoteManagementModals({
  noteModalVisible,
  setNoteModalVisible,
  editNoteModalVisible,
  setEditNoteModalVisible,
  editingNote,
  setEditingNote,
  noteForm,
  editNoteForm,
  filteredStaffsByCa,
  daysInMonth,
  notesData,
  setNotesData,
  scheduleData,
  phanCa,
  month,
  year,
  copyData,
  handleOpenEditNote,
  handleUpdateNote,
  handleDeleteNote
}) {
  const { isAdmin } = useAuth();

  return (
    <>
      {/* Popup chèn ghi chú - chỉ admin mới có thể sử dụng */}
      <AccessControl resource="schedules" action="edit" fallback={null}>
        <Modal
          title="Chèn ghi chú vào ô"
          open={noteModalVisible}
          onCancel={() => setNoteModalVisible(false)}
          onOk={async () => {
            try {
              const values = await noteForm.validateFields();
              const { staffId, day, note } = values;
              const staffName = filteredStaffsByCa.find(s => s.id === staffId)?.name || 'Nhân viên';
              
              // Tạo notesData mới
              const newNotesData = {
                ...notesData,
                [staffId]: { ...(notesData[staffId] || {}), [day]: note }
              };
              
              // Cập nhật UI ngay lập tức
              setNotesData(newNotesData);
              
              // Tự động lưu vào backend
              if (copyData?.copyId) {
                try {
                  console.log('🔄 Tự động lưu ghi chú mới:', {
                    staffId,
                    day,
                    note,
                    copyId: copyData.copyId,
                    newNotesData
                  });
                  
                  const response = await apiService.updateScheduleCopy(copyData.copyId, {
                    month,
                    year,
                    name: `Bản sao tháng ${month}/${year}`,
                    scheduleData,
                    phanCa,
                    notesData: newNotesData
                  });
                  
                  if (response && response.success) {
                    console.log('✅ Đã tự động lưu ghi chú mới thành công');
                    message.success('✅ Đã thêm ghi chú thành công');
                  } else {
                    console.error('❌ Lỗi khi tự động lưu ghi chú mới:', response?.error);
                    message.error('❌ Không thể lưu ghi chú: ' + (response?.error || 'Lỗi không xác định'));
                  }
                } catch (error) {
                  console.error('❌ Lỗi khi gọi API lưu ghi chú mới:', error);
                  message.error('❌ Lỗi khi lưu ghi chú: ' + error.message);
                }
              } else {
                console.warn('⚠️ Không có copyId, không thể lưu ghi chú mới');
                message.warning('⚠️ Không thể lưu ghi chú (thiếu thông tin bản sao)');
              }
              
              setNoteModalVisible(false);
              noteForm.resetFields();
            } catch (error) {
              console.error('❌ Lỗi khi thêm ghi chú:', error);
            }
          }}
        >
          <Form form={noteForm} layout="vertical">
            <Form.Item label="Tên nhân viên" name="staffId" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
              <Select
                showSearch
                options={filteredStaffsByCa.map(s => ({ value: s.id, label: `${s.name} (${s.department})` }))}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>
            <Form.Item label="Ngày" name="day" rules={[{ required: true, message: 'Chọn ngày' }]}>
              <Select options={Array.from({ length: daysInMonth }, (_, i) => ({ value: i + 1, label: String(i + 1).padStart(2, '0') }))} />
            </Form.Item>
            <Form.Item label="Ghi chú" name="note" rules={[{ required: true, message: 'Nhập ghi chú' }]}>
              <Input.TextArea rows={3} placeholder="Nội dung ghi chú" />
            </Form.Item>
          </Form>
        </Modal>
      </AccessControl>

      {/* Popup cập nhật ghi chú */}
      <Modal
        title={`${isAdmin ? 'Chỉnh sửa' : 'Xem'} ghi chú - ${editingNote.staffName} ngày ${editingNote.day}`}
        open={editNoteModalVisible}
        onCancel={() => setEditNoteModalVisible(false)}
        footer={[
          isAdmin && (
            <button key="delete" onClick={handleDeleteNote} style={{
              background: '#ff4d4f',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '8px'
            }}>
              Xóa
            </button>
          ),
          <button key="cancel" onClick={() => setEditNoteModalVisible(false)} style={{
            background: '#f0f0f0',
            color: '#333',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}>
            {isAdmin ? 'Hủy' : 'Đóng'}
          </button>,
          isAdmin && (
            <button key="update" onClick={handleUpdateNote} style={{
              background: '#1890ff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Cập nhật
            </button>
          )
        ].filter(Boolean)}
      >
        <Form form={editNoteForm} layout="vertical">
          <Form.Item label="Ghi chú" name="note" rules={isAdmin ? [{ required: true, message: 'Nhập ghi chú' }] : []}>
            <Input.TextArea 
              rows={4} 
              placeholder={isAdmin ? "Nội dung ghi chú" : "Chỉ admin mới có thể chỉnh sửa"}
              disabled={!isAdmin}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
