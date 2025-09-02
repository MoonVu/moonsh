import React from "react";
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { ShowForPermission as AccessControl } from "../../auth/AccessControl";
import apiService from "../../../services/api";

export default function EditShiftModal({
  showEditShiftModal,
  setShowEditShiftModal,
  editShiftForm,
  showNewShiftFields,
  setShowNewShiftFields,
  staffsByCa,
  users,
  phanCa,
  setPhanCa,
  scheduleData,
  notesData,
  month,
  year,
  copyData,
  CA_CHINH
}) {
  // Lấy thời gian của ca
  const getShiftTime = (shiftLabel) => {
    // Tìm trong phanCa hiện tại
    for (const group of Object.values(phanCa || {})) {
      for (const shift of group || []) {
        if (shift.label === shiftLabel) {
          return shift.time || '';
        }
      }
    }
    // Tìm trong CA_CHINH
    const defaultShift = CA_CHINH.find(c => c.label === shiftLabel);
    return defaultShift?.time || '';
  };

  const handleOpenEditShift = () => {
    editShiftForm.resetFields();
    setShowNewShiftFields(false);
    setShowEditShiftModal(true);
  };

  const handleSubmitEditShift = async () => {
    try {
      const formData = editShiftForm.getFieldsValue();
      const { staffId, shiftLabel, newShiftLabel, newShiftTime } = formData;
      
      if (!staffId) {
        message.error('Vui lòng chọn nhân viên');
        return;
      }

      // Xác định ca cuối cùng sẽ sử dụng
      let finalShiftLabel, finalShiftTime;
      
      // Xử lý theo loại ca được chọn
      if (shiftLabel === 'new') {
        // Chọn "Thêm ca mới"
        if (!newShiftLabel) {
          message.error('Vui lòng nhập tên ca mới');
          return;
        }
        
        const { startHour, startMinute, endHour, endMinute } = formData;
        if (!startHour || !startMinute || !endHour || !endMinute) {
          message.error('Vui lòng nhập đầy đủ thời gian ca mới');
          return;
        }
        
        finalShiftLabel = newShiftLabel;
        finalShiftTime = `${startHour}H${startMinute}-${endHour}H${endMinute}`;
      } else if (shiftLabel && shiftLabel !== '') {
        // Chọn ca từ danh sách
        // Phân tích shiftLabel để lấy label và time
        // shiftLabel có dạng: "Ca sáng (07h20-18h20)" hoặc "CA ĐÊM (21h00-08h00)"
        const match = shiftLabel.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          finalShiftLabel = match[1].trim();
          finalShiftTime = match[2].trim();
        } else {
          // Fallback: tìm trong phanCa hiện tại
          finalShiftLabel = shiftLabel;
          finalShiftTime = getShiftTime(shiftLabel);
        }
      } else {
        message.error('Vui lòng chọn ca từ danh sách hoặc nhập ca mới');
        return;
      }

      // Tìm thông tin nhân viên
      let staffInfo = (Array.isArray(staffsByCa) ? staffsByCa : []).find(s => String(s.id) === String(staffId));
      
      // Nếu không tìm thấy trong staffsByCa, tìm trong users
      if (!staffInfo) {
        const userInfo = (Array.isArray(users) ? users : []).find(u => String(u._id) === String(staffId));
        if (userInfo) {
          staffInfo = {
            id: String(userInfo._id),
            name: userInfo.username,
            department: userInfo.group_name,
            ca: null, // Chưa có ca
            caTime: null
          };
        }
      }

      if (!staffInfo) {
        message.error('Không tìm thấy nhân viên');
        return;
      }

      const groupKey = staffInfo.department; // Giữ nguyên bộ phận hiện tại
      const nextPhanCa = JSON.parse(JSON.stringify(phanCa || {}));

      // 1) Gỡ nhân viên khỏi ca cũ (nếu có)
      Object.keys(nextPhanCa).forEach(gKey => {
        (nextPhanCa[gKey] || []).forEach(shift => {
          if (!Array.isArray(shift.users)) return;
          const idx = shift.users.findIndex(u => {
            if (!u) return false;
            if (typeof u.userId === 'object' && u.userId?._id) {
              return String(u.userId._id) === String(staffId);
            }
            return String(u.userId) === String(staffId);
          });
          if (idx >= 0) {
            shift.users.splice(idx, 1);
          }
        });
        
        // Xóa các ca rỗng sau khi gỡ nhân viên
        nextPhanCa[gKey] = nextPhanCa[gKey].filter(shift => 
          Array.isArray(shift.users) && shift.users.length > 0
        );
        
        // Nếu group không còn ca nào, xóa luôn group
        if (nextPhanCa[gKey].length === 0) {
          delete nextPhanCa[gKey];
          console.log(`🗑️ Đã xóa group "${gKey}" vì không còn ca nào`);
        }
      });

      // 2) Thêm vào ca mới trong cùng group
      const shiftsInGroup = nextPhanCa[groupKey] || [];
      
      // Tìm ca dựa trên label VÀ time để phân biệt ca cùng tên khác thời gian
      let targetShift = shiftsInGroup.find(s => 
        s.label === finalShiftLabel && s.time === finalShiftTime
      );
      
      if (!targetShift) {
        // Tạo ca mới nếu không tìm thấy
        targetShift = { label: finalShiftLabel, time: finalShiftTime, users: [] };
        shiftsInGroup.push(targetShift);
        nextPhanCa[groupKey] = shiftsInGroup;
      }
      
      targetShift.users = Array.isArray(targetShift.users) ? targetShift.users : [];
      targetShift.users.push({ userId: staffId });

      // Cập nhật UI ngay lập tức
      setPhanCa(nextPhanCa);
      setShowEditShiftModal(false);
      
      // Tự động gửi API về backend
      if (copyData?.copyId) {
        try {
          console.log('🔄 Tự động lưu thay đổi ca nhân viên:', {
            staffId,
            finalShiftLabel,
            finalShiftTime,
            copyId: copyData.copyId
          });
          
          const response = await apiService.updateScheduleCopy(copyData.copyId, {
            month,
            year,
            name: `Bản sao tháng ${month}/${year}`,
            scheduleData,
            phanCa: nextPhanCa,
            notesData
          });
          
          if (response && response.success) {
            console.log('✅ Đã tự động lưu thay đổi ca nhân viên thành công');
            message.success('Đã cập nhật ca cho nhân viên và lưu thành công');
          } else {
            console.error('❌ Lỗi khi tự động lưu thay đổi ca nhân viên:', response?.error);
            message.success('Đã cập nhật ca cho nhân viên (nhưng không thể lưu về backend)');
          }
        } catch (error) {
          console.error('❌ Lỗi khi tự động lưu thay đổi ca nhân viên:', error);
          message.success('Đã cập nhật ca cho nhân viên (nhưng không thể lưu về backend)');
        }
      } else {
        message.success('Đã cập nhật ca cho nhân viên');
      }
    } catch (e) {
      console.error('Lỗi khi cập nhật ca:', e);
      message.error('Có lỗi xảy ra khi cập nhật ca');
    }
  };

  // Xử lý khi chọn nhân viên
  const handleStaffChange = (staffId) => {
    // Tìm trong staffsByCa trước (nhân viên đã có trong lịch)
    let staffInfo = (Array.isArray(staffsByCa) ? staffsByCa : []).find(s => String(s.id) === String(staffId));
    
    if (staffInfo) {
      // Đảm bảo hiển thị đầy đủ ca và thời gian
      const currentShiftText = `${staffInfo.ca}${staffInfo.caTime ? ` (${staffInfo.caTime})` : ''}`;
      editShiftForm.setFieldsValue({ 
        currentShift: currentShiftText
      });
      console.log('✅ Đã set ca hiện tại:', currentShiftText, 'cho nhân viên:', staffInfo.name);
    } else {
      // Tìm trong users (nhân viên chưa có trong lịch)
      const userInfo = (Array.isArray(users) ? users : []).find(u => String(u._id) === String(staffId));
      if (userInfo) {
        editShiftForm.setFieldsValue({ 
          currentShift: "Chưa sắp xếp ca"
        });
        console.log('✅ Nhân viên chưa có trong lịch:', userInfo.username);
      }
    }
  };

  // Xử lý xóa nhân viên khỏi ca
  const handleRemoveEmployee = async () => {
    try {
      const formData = editShiftForm.getFieldsValue();
      const { staffId } = formData;
      
      if (!staffId) {
        message.error('Vui lòng chọn nhân viên cần xóa');
        return;
      }

      // Tìm thông tin nhân viên
      let staffInfo = (Array.isArray(staffsByCa) ? staffsByCa : []).find(s => String(s.id) === String(staffId));
      
      // Nếu không tìm thấy trong staffsByCa, tìm trong users
      if (!staffInfo) {
        const userInfo = (Array.isArray(users) ? users : []).find(u => String(u._id) === String(staffId));
        if (userInfo) {
          staffInfo = {
            id: String(userInfo._id),
            name: userInfo.username,
            department: userInfo.group_name,
            ca: "Chưa sắp xếp ca"
          };
        }
      }

      if (!staffInfo) {
        message.error('Không tìm thấy thông tin nhân viên');
        return;
      }

      // Xác nhận xóa
      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn xóa nhân viên "${staffInfo.name}" khỏi ca hiện tại không?\n\n` +
        `Nhân viên sẽ được chuyển về trạng thái "Chưa sắp xếp ca".`
      );

      if (!confirmed) {
        return;
      }

      // Tạo bản sao phanCa để cập nhật
      const nextPhanCa = { ...phanCa };

      // Tìm và xóa nhân viên khỏi tất cả các ca
      Object.keys(nextPhanCa).forEach(groupKey => {
        if (Array.isArray(nextPhanCa[groupKey])) {
          nextPhanCa[groupKey] = nextPhanCa[groupKey].map(shift => {
            if (Array.isArray(shift.users)) {
              return {
                ...shift,
                users: shift.users.filter(user => {
                  if (!user || !user.userId) return true; // Giữ lại nếu user không hợp lệ
                  
                  // Xử lý cả trường hợp userId là object và string
                  let userIdToCompare;
                  if (typeof user.userId === 'object' && user.userId?._id) {
                    userIdToCompare = String(user.userId._id);
                  } else {
                    userIdToCompare = String(user.userId);
                  }
                  
                  return userIdToCompare !== String(staffId);
                })
              };
            }
            return shift;
          });
          
          // Xóa các ca rỗng (không có nhân viên nào)
          nextPhanCa[groupKey] = nextPhanCa[groupKey].filter(shift => 
            Array.isArray(shift.users) && shift.users.length > 0
          );
          
          // Nếu group không còn ca nào, xóa luôn group
          if (nextPhanCa[groupKey].length === 0) {
            delete nextPhanCa[groupKey];
            console.log(`🗑️ Đã xóa group "${groupKey}" vì không còn ca nào`);
          }
        }
      });

      console.log('🔍 Debug sau khi xóa nhân viên:', {
        staffId,
        staffName: staffInfo.name,
        nextPhanCaAfter: nextPhanCa
      });

      // Cập nhật UI ngay lập tức
      setPhanCa(nextPhanCa);
      setShowEditShiftModal(false);
      
      // Tự động gửi API về backend
      if (copyData?.copyId) {
        try {
          console.log('🔄 Tự động lưu thay đổi xóa nhân viên:', {
            staffId,
            staffName: staffInfo.name,
            copyId: copyData.copyId
          });
          
          const response = await apiService.updateScheduleCopy(copyData.copyId, {
            month,
            year,
            name: `Bản sao tháng ${month}/${year}`,
            scheduleData,
            phanCa: nextPhanCa,
            notesData
          });
          
          if (response && response.success) {
            console.log('✅ Đã tự động lưu thay đổi xóa nhân viên thành công');
            message.success(`Đã xóa nhân viên "${staffInfo.name}" khỏi ca và lưu thành công`);
          } else {
            console.error('❌ Lỗi khi tự động lưu thay đổi xóa nhân viên:', response?.error);
            message.success(`Đã xóa nhân viên "${staffInfo.name}" khỏi ca (nhưng không thể lưu về backend)`);
          }
        } catch (error) {
          console.error('❌ Lỗi khi tự động lưu thay đổi xóa nhân viên:', error);
          message.success(`Đã xóa nhân viên "${staffInfo.name}" khỏi ca (nhưng không thể lưu về backend)`);
        }
      } else {
        message.success(`Đã xóa nhân viên "${staffInfo.name}" khỏi ca`);
      }
    } catch (e) {
      console.error('Lỗi khi xóa nhân viên:', e);
      message.error('Có lỗi xảy ra khi xóa nhân viên');
    }
  };

  return (
    <Modal
      title="Chỉnh sửa ca nhân viên"
      open={showEditShiftModal}
      onCancel={() => setShowEditShiftModal(false)}
      onOk={handleSubmitEditShift}
      okText="Cập nhật"
      cancelText="Hủy"
      width={600}
    >
      <Form form={editShiftForm} layout="vertical">
        <Form.Item label="Nhân viên" name="staffId" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
          <Select
            showSearch
            placeholder="Chọn nhân viên"
            options={(() => {
              // Lấy đủ danh sách users (không chỉ staffsByCa) để có thể thêm nhân viên chưa có trong lịch
              const allUsers = (Array.isArray(users) ? users : []).map(user => ({
                value: String(user._id),
                label: `${user.username} (${user.group_name})`
              }));
              
              // Thêm các nhân viên đã có trong lịch (nếu chưa có trong allUsers)
              const existingStaffIds = new Set(allUsers.map(u => u.value));
              const additionalStaffs = (Array.isArray(staffsByCa) ? staffsByCa : [])
                .filter(staff => !existingStaffIds.has(staff.id))
                .map(staff => ({
                  value: staff.id,
                  label: `${staff.name} (${staff.department})`
                }));
              
              return [...allUsers, ...additionalStaffs];
            })()}
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            onChange={handleStaffChange}
          />
        </Form.Item>
        
        <Form.Item label="Ca hiện tại" name="currentShift">
          <Input disabled />
        </Form.Item>
        
        <Form.Item label="Ca làm việc mới" name="shiftLabel" rules={[{ required: true, message: 'Chọn ca hoặc nhập ca mới' }]}>
          <Select
            showSearch
            placeholder="Chọn ca từ danh sách"
            onChange={(value) => {
              // Nếu chọn "Thêm ca mới", hiện ra 2 trường nhập liệu
              if (value === 'new') {
                setShowNewShiftFields(true);
              } else {
                setShowNewShiftFields(false);
              }
            }}
            options={(() => {
              // Lấy danh sách ca từ bảng hiện tại, phân biệt theo label + time
              const shiftsFromTable = new Map();
              Object.values(phanCa || {}).forEach(shifts => {
                (shifts || []).forEach(shift => {
                  if (shift.label && shift.time) {
                    // Sử dụng label + time làm key để phân biệt ca cùng tên khác thời gian
                    const key = `${shift.label}|${shift.time}`;
                    if (!shiftsFromTable.has(key)) {
                      shiftsFromTable.set(key, { 
                        label: shift.label, 
                        time: shift.time,
                        value: key
                      });
                    }
                  }
                });
              });
              
              const shiftsList = Array.from(shiftsFromTable.values());
              
              // Sắp xếp theo thứ tự: Ca sáng, Ca chiều, Ca đêm, các ca khác
              shiftsList.sort((a, b) => {
                const caOrder = {
                  "Ca sáng": 1,
                  "Ca chiều": 2,
                  "Ca đêm": 3
                };
                const orderA = caOrder[a.label] || 999;
                const orderB = caOrder[b.label] || 999;
                
                if (orderA !== orderB) return orderA - orderB;
                return a.label.localeCompare(b.label);
              });
              
              const options = shiftsList.map(shift => ({
                label: `${shift.label} (${shift.time})`,
                value: `${shift.label} (${shift.time})`
              }));
              
              // Thêm option "Thêm ca mới" vào cuối
              options.push({
                label: '➕ Thêm ca mới',
                value: 'new'
              });
              
              return options;
            })()}
            filterOption={(input, option) => 
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        
        {/* Phần thêm ca mới - chỉ hiện khi chọn "Thêm ca mới" */}
        {showNewShiftFields && (
          <div style={{ borderTop: '1px solid #d9d9d9', paddingTop: '16px', marginTop: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1890ff' }}>
              📝 Thêm ca mới
            </div>
            
            <Form.Item label="Tên ca mới" name="newShiftLabel" rules={[{ required: true, message: 'Nhập tên ca mới' }]}>
              <Input placeholder="Ví dụ: Ca sáng, Ca chiều, Ca đêm" />
            </Form.Item>
            
            <Form.Item label="Thời gian ca mới" required>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Form.Item name="startHour" noStyle rules={[{ required: true, message: 'Nhập giờ bắt đầu' }]}>
                  <Input 
                    placeholder="07" 
                    style={{ width: '60px', textAlign: 'center', fontFamily: 'monospace' }}
                    maxLength={2}
                  />
                </Form.Item>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>H</span>
                <Form.Item name="startMinute" noStyle rules={[{ required: true, message: 'Nhập phút bắt đầu' }]}>
                  <Input 
                    placeholder="20" 
                    style={{ width: '60px', textAlign: 'center', fontFamily: 'monospace' }}
                    maxLength={2}
                  />
                </Form.Item>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>-</span>
                <Form.Item name="endHour" noStyle rules={[{ required: true, message: 'Nhập giờ kết thúc' }]}>
                  <Input 
                    placeholder="18" 
                    style={{ width: '60px', textAlign: 'center', fontFamily: 'monospace' }}
                    maxLength={2}
                  />
                </Form.Item>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>H</span>
                <Form.Item name="endMinute" noStyle rules={[{ required: true, message: 'Nhập phút kết thúc' }]}>
                  <Input 
                    placeholder="20" 
                    style={{ width: '60px', textAlign: 'center', fontFamily: 'monospace' }}
                    maxLength={2}
                  />
                </Form.Item>
              </div>
            </Form.Item>
          </div>
        )}     
        
        {/* Nút Xóa nhân viên */}
        <div style={{ 
          borderTop: '1px solid #d9d9d9', 
          paddingTop: '16px', 
          marginTop: '16px',
          textAlign: 'center'
        }}>
          <AccessControl permission="schedule:edit">
            <Button 
              type="default" 
              danger 
              icon={<DeleteOutlined />}
              onClick={handleRemoveEmployee}
              style={{ 
                width: '100%',
                height: '40px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🗑️ Xóa nhân viên khỏi ca
            </Button>
          </AccessControl>
        </div>
      </Form>
    </Modal>
  );
}
