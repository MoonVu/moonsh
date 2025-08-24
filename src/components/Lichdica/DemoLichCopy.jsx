import React, { useState, useEffect, useMemo } from "react";
import "../../BangDuLieu.css";
import apiService from "../../services/api";
import { useSchedule } from "../../contexts/ScheduleContext";
import { Select, Button, Modal, Form, Input, message, Table } from 'antd';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useAuth } from "../../hooks/useAuth";
import { ShowForPermission as AccessControl } from "../auth/AccessControl";

// CSS cho tooltip ghi chú và modal thống kê
const noteTooltipStyles = `
  .schedule-table td:hover .note-tooltip {
    opacity: 1 !important;
  }
  
  .schedule-table td .note-tooltip {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .schedule-table td:hover .note-tooltip {
    opacity: 1;
  }
  
  .note-tooltip {
    white-space: normal !important;
    max-width: 250px !important;
    word-wrap: break-word !important;
    line-height: 1.4 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
  }
  
  /* Đảm bảo tooltip không bị che khuất */
  .schedule-table td {
    overflow: visible !important;
  }

  /* CSS riêng cho modal thống kê - vượt qua login.css */
  .off-stats-modal .dept-label {
    font-size: 25px !important;
    color: #096dd9 !important;
    font-weight: 600 !important;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    line-height: 1.2 !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .off-stats-modal .date-label {
    font-size: 25px !important;
    color: #096dd9 !important;
    font-weight: 600 !important;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    line-height: 1.2 !important;
    margin: 0 !important;
    padding: 0 !important;
  }
`;

const STATUS_COLORS = {
  OFF: "#174ea6", // xanh đậm
  "1/2": "#8e24aa", // tím
  "1": "#6a8caf", // xanh nhạt cho 1 ngày
  VP: "#ffe066", // vàng
  X: "#e53935", // đỏ
  QL: "#ffd600", // vàng đậm
  KL: "#7c43bd", // tím khác
};
// Thứ tự hiển thị theo yêu cầu: OFF, 1/2, 1, VP, X, QL, KL
const STATUS_OPTIONS = ["", "OFF", "1/2", "1", "VP", "X", "QL", "KL"];

// 3 ca chính
const CA_CHINH = [
  { label: "Ca sáng", time: "07h20-18h20", keywords: ["sáng", "sang", "morning"] },
  { label: "Ca chiều", time: "17h00-04h00", keywords: ["chiều", "chieu", "afternoon"] },
  { label: "Ca đêm", time: "21h00-08h00", keywords: ["đêm", "dem", "night"] }
];

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

export default function DemoLichCopy({ tabId, copyData = null }) {
  const { isAdmin } = useAuth();
  
  // Thêm function refresh và switch tab để có thể gọi từ bên ngoài
  useEffect(() => {
    window.refreshCopyTab = () => {
  
      if (copyData?.copyId) {
        // Reload dữ liệu từ backend
        const loadCopyTabData = async () => {
          try {
            setLoading(true);
            const copyResponse = await apiService.getScheduleCopy(copyData.copyId);
            if (copyResponse && copyResponse.success && copyResponse.data) {
              const copyData = copyResponse.data;
              if (copyData.scheduleData) {
                setScheduleData(copyData.scheduleData);
              }
              if (copyData.phanCa) {
                setPhanCa(copyData.phanCa);
              }
            }
          } catch (err) {
            console.error("❌ Lỗi khi refresh copy tab:", err);
          } finally {
            setLoading(false);
          }
        };
        loadCopyTabData();
      }
    };

    // Function để chuyển tab
    window.switchToTab = (tabType) => {

      // Trigger event để parent component có thể xử lý
      window.dispatchEvent(new CustomEvent('switchTab', { detail: { tabType } }));
    };
    
    return () => {
      delete window.refreshCopyTab;
      delete window.switchToTab;
    };
  }, [copyData?.copyId]);
  
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const daysInMonth = getDaysInMonth(month, year);
  
  // Dữ liệu phân ca từ DemoNhanSu theo tháng
  const [phanCa, setPhanCa] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
  const [showEditShiftModal, setShowEditShiftModal] = useState(false);
  const [editShiftForm] = Form.useForm();
  const [showNewShiftFields, setShowNewShiftFields] = useState(false);
  // Ghi chú theo ô: notesData[staffId][day] = string
  const [notesData, setNotesData] = useState({});
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteForm] = Form.useForm();
  
     // State cho popup cập nhật ghi chú
   const [editNoteModalVisible, setEditNoteModalVisible] = useState(false);
   const [editingNote, setEditingNote] = useState({ staffId: '', day: '', note: '', staffName: '' });
   const [editNoteForm] = Form.useForm();
   
   // State cho bộ lọc
   const [filterCa, setFilterCa] = useState([]);
   const [filterDepartment, setFilterDepartment] = useState([]);

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

      setPhanCa(nextPhanCa);
      setShowEditShiftModal(false);
      message.success('Đã cập nhật ca cho nhân viên');
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

  // Dữ liệu users để map thông tin
  const [users, setUsers] = useState([]);

  // scheduleData[staffId][day] = trạng thái
  const [scheduleData, setScheduleData] = useState({});

  // Nếu là tab copy, load dữ liệu đầy đủ từ backend
  useEffect(() => {
    if (copyData?.copyId) {
      console.log("🔍 Debug copyData từ props:", {
        copyId: copyData.copyId,
        month: copyData.month,
        year: copyData.year,
        hasNotesData: !!copyData.notesData,
        notesDataKeys: copyData.notesData ? Object.keys(copyData.notesData) : [],
        notesDataSample: copyData.notesData ? Object.keys(copyData.notesData).slice(0, 2) : []
      });

      setMonth(copyData.month || month);
      setYear(copyData.year || year);
      
      // Load dữ liệu đầy đủ từ backend
      const loadCopyTabData = async () => {
        try {
          setLoading(true);
          
          // Load users data
          const usersRes = await apiService.getAllUsers();
          const usersArr = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
          
          // Ensure users is always an array
          const safeUsersArr = Array.isArray(usersArr) ? usersArr : [];
          setUsers(safeUsersArr);
          console.log("✅ Loaded users for copy tab:", safeUsersArr.length, "users");
          console.log("🔍 Users data type:", typeof usersRes, "Array check:", Array.isArray(usersRes));
          
          // Load dữ liệu schedule copy đầy đủ từ backend
          try {
            console.log("🔄 Đang gọi API getScheduleCopy với copyId:", copyData.copyId);
            const copyResponse = await apiService.getScheduleCopy(copyData.copyId);
            console.log("🔍 Response từ getScheduleCopy:", copyResponse);
            
            if (copyResponse && copyResponse.success && copyResponse.data) {
              const copyData = copyResponse.data;
              console.log("✅ Loaded full copy data from backend:", copyData);
              console.log("🔍 Kiểm tra notesData trong response:", {
                hasNotesData: !!copyData.notesData,
                notesDataType: typeof copyData.notesData,
                notesDataKeys: copyData.notesData ? Object.keys(copyData.notesData) : [],
                notesDataSample: copyData.notesData ? Object.keys(copyData.notesData).slice(0, 2) : []
              });
              
              // Cập nhật state với dữ liệu từ backend
              if (copyData.scheduleData) {
                // Convert Map to object nếu cần
                let scheduleDataObj = {};
                if (copyData.scheduleData instanceof Map) {
                  copyData.scheduleData.forEach((value, key) => {
                    scheduleDataObj[key] = {};
                    if (value instanceof Map) {
                      value.forEach((dayValue, dayKey) => {
                        scheduleDataObj[key][dayKey] = dayValue;
                      });
                    } else if (typeof value === 'object') {
                      scheduleDataObj[key] = value;
                    }
                  });
                } else if (typeof copyData.scheduleData === 'object') {
                  scheduleDataObj = copyData.scheduleData;
                }
                setScheduleData(scheduleDataObj);
                console.log("✅ Set scheduleData:", Object.keys(scheduleDataObj).length, "users");
              }
              
              if (copyData.phanCa) {
                // Convert Map to object nếu cần
                let phanCaObj = {};
                if (copyData.phanCa instanceof Map) {
                  copyData.phanCa.forEach((value, key) => {
                    phanCaObj[key] = value;
                  });
                } else if (typeof copyData.phanCa === 'object') {
                  phanCaObj = copyData.phanCa;
                }
                setPhanCa(phanCaObj);
                console.log("✅ Set phanCa:", Object.keys(phanCaObj).length, "departments");
              }
              if (copyData.notesData && typeof copyData.notesData === 'object') {
                console.log("🔍 Debug notesData từ backend:", {
                  notesData: copyData.notesData,
                  notesDataKeys: Object.keys(copyData.notesData),
                  hasNotes: Object.keys(copyData.notesData).length > 0,
                  notesDataString: JSON.stringify(copyData.notesData)
                });
                
                console.log("🔄 Trước khi setNotesData, state hiện tại:", notesData);
                setNotesData(copyData.notesData);
                console.log("✅ Đã gọi setNotesData với:", copyData.notesData);
                console.log("✅ Set notesData từ backend:", Object.keys(copyData.notesData).length, "staff members");
              } else {
                console.log("⚠️ Không có notesData từ backend hoặc format không đúng:", copyData.notesData);
              }
            } else {
              console.warn("⚠️ Không thể load dữ liệu copy từ backend, sử dụng fallback:", copyResponse);
              await handleLoadFallbackData();
            }
          } catch (copyErr) {
            console.warn("⚠️ Lỗi khi load dữ liệu copy từ backend, sử dụng fallback:", copyErr);
            await handleLoadFallbackData();
          }
          
        } catch (err) {
          console.error("❌ Lỗi khi load dữ liệu cho copy tab:", err);
          // Fallback: sử dụng dữ liệu từ prop nếu có
          await handleLoadFallbackData();
        } finally {
          setLoading(false);
        }
      };
      
      loadCopyTabData();
      
      // Kiểm tra bản sao zombie sau khi load xong
      setTimeout(() => {
        checkAndCleanupZombieCopy();
      }, 2000); // Delay 2 giây để tránh spam
    }
  }, [copyData?.copyId]); // Chỉ refetch khi copyId thay đổi

  // Xử lý khi tháng/năm thay đổi - cập nhật daysInMonth
  useEffect(() => {
    const newDaysInMonth = getDaysInMonth(month, year);
    console.log("🔄 Tháng/năm thay đổi:", { month, year, daysInMonth: newDaysInMonth });
  }, [month, year]);

  // Debug khi notesData thay đổi
  useEffect(() => {
    console.log("🔄 notesData state đã thay đổi:", {
      notesData: notesData,
      notesDataKeys: Object.keys(notesData),
      hasNotes: Object.keys(notesData).length > 0,
      notesDataString: JSON.stringify(notesData)
    });
  }, [notesData]);

  // Function xử lý fallback khi không thể load dữ liệu từ backend
  const handleLoadFallbackData = async () => {
    try {
      console.log("🔄 Sử dụng fallback data từ props (không dùng localStorage)...");
      // Chỉ hiển thị từ dữ liệu props nếu có, KHÔNG đọc/ghi localStorage
      if (copyData?.phanCa) {
        setPhanCa(copyData.phanCa);
        console.log("✅ Set phanCa từ prop:", Object.keys(copyData.phanCa).length, "departments");
      }
      if (copyData?.scheduleData) {
        setScheduleData(copyData.scheduleData);
        console.log("✅ Set scheduleData từ prop:", Object.keys(copyData.scheduleData).length, "users");
      }
      if (copyData?.notesData) {
        console.log("🔍 Debug notesData từ fallback:", {
          notesData: copyData.notesData,
          notesDataKeys: Object.keys(copyData.notesData),
          hasNotes: Object.keys(copyData.notesData).length > 0
        });
        setNotesData(copyData.notesData);
        console.log("✅ Set notesData từ fallback:", Object.keys(copyData.notesData).length, "staff members");
      } else {
        console.log("⚠️ Không có notesData trong fallback data");
      }
      message.error("❌ Không thể tải dữ liệu từ backend. Dữ liệu hiển thị có thể chưa cập nhật.");
    } catch (err) {
      console.error("❌ Lỗi khi xử lý fallback data:", err);
      message.error("❌ Không thể load dữ liệu. Vui lòng thử lại sau!");
    }
  };

  // Function mở popup cập nhật ghi chú
  const handleOpenEditNote = (staffId, day, currentNote, staffName) => {
    setEditingNote({ staffId, day, note: currentNote, staffName });
    editNoteForm.setFieldsValue({ note: currentNote });
    setEditNoteModalVisible(true);
  };

  // Function cập nhật ghi chú
  const handleUpdateNote = () => {
    editNoteForm.validateFields().then(values => {
      const { note } = values;
      setNotesData(prev => ({
        ...prev,
        [editingNote.staffId]: { ...(prev[editingNote.staffId] || {}), [editingNote.day]: note }
      }));
      setEditNoteModalVisible(false);
      editNoteForm.resetFields();
      // Bỏ thông báo thành công
    })
    .catch(() => {});
  };

     // Function xóa ghi chú
   const handleDeleteNote = () => {
     if (window.confirm(`Bạn có muốn xóa ghi chú ngày ${editingNote.day} của ${editingNote.staffName}?\n\nNội dung: ${editingNote.note}`)) {
       setNotesData(prev => {
         const newNotes = { ...prev };
         if (newNotes[editingNote.staffId]) {
           delete newNotes[editingNote.staffId][editingNote.day];
           // Nếu không còn ghi chú nào cho nhân viên này, xóa luôn key
           if (Object.keys(newNotes[editingNote.staffId]).length === 0) {
             delete newNotes[editingNote.staffId];
           }
         }
         return newNotes;
       });
       setEditNoteModalVisible(false);
       editNoteForm.resetFields();
     }
   };
   
   // Function xóa bộ lọc
   const clearFilters = () => {
     setFilterCa([]);
     setFilterDepartment([]);
   };

  // Function kiểm tra và dọn dẹp bản sao zombie
  const checkAndCleanupZombieCopy = async () => {
    if (!copyData?.copyId) return;
    
    try {
      console.log("🔍 Kiểm tra bản sao zombie...");
      const response = await apiService.getScheduleCopy(copyData.copyId);
      
      if (!response || !response.success) {
        console.warn("⚠️ Phát hiện bản sao zombie, hiển thị cảnh báo");
        message.warning("⚠️ Bản sao này không tồn tại trên backend. Có thể đã bị xóa hoặc có lỗi kết nối.");
        
        // Hiển thị nút xóa nhanh
        if (window.confirm("Bản sao này không tồn tại trên backend. Bạn có muốn xóa tab này không?")) {
          await handleDeleteTabOnly();
        }
      }
    } catch (err) {
      console.warn("⚠️ Không thể kiểm tra bản sao zombie:", err);
    }
  };

  // Function xóa chỉ tab local (fallback)
  const handleDeleteTabOnly = async () => {
    try {
      // Xóa dữ liệu khỏi localStorage nếu có
      if (copyData?.copyId) {
        const localKey = `copy_${copyData.copyId}_data`;
        localStorage.removeItem(localKey);
        console.log("✅ Đã xóa dữ liệu khỏi localStorage");
      }
      
      // Xóa dữ liệu khỏi state
      setScheduleData({});
      setPhanCa({});
      setUsers([]);
      
      console.log("✅ Đã xóa dữ liệu khỏi state");
      
      // Refresh tabs và chuyển về tab Demo gốc
      if (window.refreshTabs) {
        window.refreshTabs();
      }
      
      // Chuyển về tab Demo gốc
    } catch (err) {
      console.error("❌ Lỗi khi xóa tab local:", err);
      throw err;
    }
  };

  // Function xóa bản sao
  const handleDeleteCopy = async () => {
    try {
      if (!copyData || !copyData.copyId) {
        message.error("❌ Không tìm thấy ID bản sao để xóa");
        return;
      }

      // Xác nhận trước khi xóa
      if (!window.confirm("Bạn có chắc chắn muốn xóa bản sao này không? Hành động này không thể hoàn tác.")) {
        return;
      }

      // 1) Xóa bản sao khỏi backend
      const deleteCopyResponse = await apiService.deleteScheduleCopy(copyData.copyId);
      if (!deleteCopyResponse || !deleteCopyResponse.success) {
        message.error(`❌ Lỗi khi xóa bản sao: ${deleteCopyResponse?.error || "Không xác định"}`);
        return;
      }

      // 2) Xóa luôn TAB tương ứng để biến mất khỏi UI
      if (tabId) {
        try {
          const deleteTabRes = await apiService.deleteScheduleTab(tabId);
          if (!deleteTabRes || !deleteTabRes.success) {
            console.warn("⚠️ Không thể xóa tab sau khi xóa bản sao:", deleteTabRes);
          }
        } catch (e) {
          console.warn("⚠️ Lỗi khi gọi API xóa tab:", e);
        }
      }

      // Xóa dữ liệu khỏi localStorage nếu có
      if (copyData?.copyId) {
        const localKey = `copy_${copyData.copyId}_data`;
        localStorage.removeItem(localKey);
        console.log("✅ Đã xóa dữ liệu khỏi localStorage:", localKey);
        
        // Xóa tất cả các key liên quan đến copy này
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
          if (key.includes(copyData.copyId)) {
            localStorage.removeItem(key);
            console.log("✅ Đã xóa key localStorage:", key);
          }
        });
      }

      // Xóa dữ liệu khỏi state local
      setScheduleData({});
      setPhanCa({});
      setUsers([]);
      setMonth(today.getMonth() + 1);
      setYear(today.getFullYear());
      console.log("✅ Đã xóa dữ liệu khỏi state local và reset về tháng/năm hiện tại");

      message.success("✅ Đã xóa bản sao và tab tương ứng!");
      
      // 3) Refresh tabs để cập nhật danh sách và xóa tab này
      if (window.refreshTabs) {
        window.refreshTabs();
      }

      // 4) Chuyển về tab Demo gốc sau khi xóa
      setTimeout(() => {
        if (window.switchToTab) {
          window.switchToTab('demo'); // Chuyển về tab demo gốc
        }
      }, 1000); // Tăng delay để đảm bảo refreshTabs hoàn thành trước

    } catch (err) {
      console.error("❌ Lỗi khi xóa bản sao:", err);
      message.error("❌ Lỗi khi xóa bản sao: " + err.message);
    }
  };

  // Function lưu bản sao
  const handleSaveCopy = async () => {
    try {
      setSavingCopy(true);
      
      if (!copyData || !copyData.copyId) {
        message.error("❌ Không tìm thấy ID bản sao để lưu");
        return;
      }
      
      const copyName = `Bản sao tháng ${month}/${year}`;
      
      // Kiểm tra backend trước
      try {
        const healthCheck = await fetch('http://172.16.1.6:5000/api/health');
        if (!healthCheck.ok) {
          throw new Error(`Backend không khả dụng: ${healthCheck.status}`);
        }
        console.log("✅ Backend đang hoạt động");
      } catch (healthErr) {
        console.error("❌ Backend không khả dụng:", healthErr);
        message.error("❌ Backend không khả dụng. Không lưu tạm vào localStorage nữa. Vui lòng thử lại khi backend hoạt động.");
        setSavingCopy(false);
        return;
      }
      
      const response = await apiService.updateScheduleCopy(copyData.copyId, {
        month,
        year,
        name: copyName,
        scheduleData,
        phanCa,
        notesData
      });

      console.log("🔍 Debug lưu bản sao:", {
        copyId: copyData.copyId,
        notesData: notesData,
        notesDataKeys: Object.keys(notesData),
        hasNotes: Object.keys(notesData).length > 0,
        notesDataString: JSON.stringify(notesData),
        response: response
      });

      if (response && response.success) {
        message.success(`✅ Đã lưu bản sao thành công: ${copyName}`);
        
        // Cập nhật copyData local một cách an toàn
        if (copyData) {
          // Tạo object mới để tránh mutation trực tiếp
          const updatedCopyData = {
            ...copyData,
            scheduleData: { ...scheduleData },
            phanCa: { ...phanCa },
            notesData: { ...notesData },
            month: month,
            year: year
          };
          
          console.log("🔍 Debug cập nhật copyData:", {
            oldNotesData: copyData.notesData,
            newNotesData: notesData,
            updatedCopyData: updatedCopyData
          });
          
          // Cập nhật prop copyData nếu có thể
          if (typeof copyData === 'object') {
            Object.assign(copyData, updatedCopyData);
            console.log("✅ Đã cập nhật copyData với notesData mới");
          }
        }
      } else {
        message.error(`❌ Lỗi khi lưu bản sao: ${response?.error || "Không xác định"}`);
      }
    } catch (err) {
      console.error("❌ Lỗi khi lưu bản sao:", err);
      message.error("❌ Lỗi khi lưu bản sao: " + err.message);
    } finally {
      setSavingCopy(false);
    }
  };

     // Function xuất dữ liệu ra file Excel sử dụng exceljs
   const handleExportToExcel = async () => {
     try {
       if (!filteredStaffsByCa || filteredStaffsByCa.length === 0) {
         message.warning("⚠️ Không có dữ liệu để xuất Excel!");
         return;
       }

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(`Tháng ${month}-${year}`, {
        views: [{ state: 'frozen', xSplit: 4, ySplit: 3 }]
      });

      // Cột
      ws.columns = [
        { header: 'STT', key: 'stt', width: 5 },
        { header: 'Thời gian làm việc', key: 'ca', width: 20 },
        { header: 'Bộ phận', key: 'department', width: 15 },
        { header: 'Tên nhân viên', key: 'name', width: 20 },
        ...Array.from({ length: daysInMonth }, (_, i) => ({
          header: String(i + 1).padStart(2, '0'),
          key: `day${i + 1}`, width: 8
        }))
      ];

      // Tiêu đề
      ws.mergeCells(1, 1, 1, 4 + daysInMonth);
      const t = ws.getCell(1, 1);
      t.value = `LỊCH ĐI CA - THÁNG ${month}/${year}`;
      t.alignment = { horizontal: 'center', vertical: 'middle' };
      t.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
      ws.addRow([]);

      // Header
      const h = ws.addRow([
        'STT','Thời gian làm việc','Bộ phận','Tên nhân viên',
        ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'))
      ]);
      h.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      h.alignment = { horizontal: 'center', vertical: 'middle' };
      h.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      const toARGB = (hex) => 'FF' + hex.replace('#','').toUpperCase();

             // Dữ liệu
       filteredStaffsByCa.forEach((staff, idx) => {
         const row = ws.addRow([
           idx + 1,
           shouldShowCell('ca', idx) ? `${staff.ca}\n${staff.caTime}` : '',
           shouldShowCell('department', idx) ? staff.department : '',
           staff.name,
           ...Array.from({ length: daysInMonth }, (_, d) => {
             const status = scheduleData[staff.id]?.[d + 1] || '';
             return status;
           })
         ])

        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
        if (shouldShowCell('ca', idx)) {
          const c = row.getCell(2);
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
          c.alignment = { vertical: 'middle', wrapText: true };
        }
        if (shouldShowCell('department', idx)) {
          row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1D5E7' } };
        }
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5E8D4' } };

        for (let d = 1; d <= daysInMonth; d++) {
          const status = scheduleData[staff.id]?.[d] || '';
          const note = notesData[staff.id]?.[d];
          const cell = row.getCell(4 + d);
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          if (status && STATUS_COLORS[status]) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(STATUS_COLORS[status]) } };
            cell.font = { color: { argb: (status === 'VP' || status === 'QL') ? 'FF000000' : 'FFFFFFFF' }, bold: true };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            cell.font = { color: { argb: 'FF222222' } };
          }
          
          // Thêm comment cho ô nếu có ghi chú
          if (note) {
  cell.note = {
    texts: [
      { text: 'ATT: ', font: { name: 'Times New Roman', bold: true } },
      { text: String(note), font: { name: 'Times New Roman' } }
    ]
  };
}
        }
      });

      // Merge cột B (ca) & C (bộ phận)
             // Merge cột B (ca)
       let curCaKey = '', caStart = 3 + 1;
       filteredStaffsByCa.forEach((s, i) => {
         const key = `${s.ca}|${s.caTime || ''}`;
         if (key !== curCaKey) {
           if (i > 0) ws.mergeCells(caStart, 2, 3 + i, 2);
           curCaKey = key; caStart = 4 + i;
         }
       });
       if (filteredStaffsByCa.length) ws.mergeCells(caStart, 2, 3 + filteredStaffsByCa.length, 2);
 
       // Merge cột C (department)
       let curDeptKey = '', deptStart = 4;
       filteredStaffsByCa.forEach((s, i) => {
         const key = `${s.department}|${s.ca}|${s.caTime || ''}`;
         if (key !== curDeptKey) {
           if (i > 0) ws.mergeCells(deptStart, 3, 3 + i, 3);
           curDeptKey = key; deptStart = 4 + i;
         }
       });
       if (filteredStaffsByCa.length) ws.mergeCells(deptStart, 3, 3 + filteredStaffsByCa.length, 3);

             // Áp dụng viền và căn giữa cho tất cả các ô
       const headerRowIndex = 3;
       const firstDataRow = 4;
       const lastDataRow = 3 + filteredStaffsByCa.length;
       const firstCol = 1;
       const lastCol = 4 + daysInMonth;

      // 1) canh giữa TẤT CẢ các ô (header + dữ liệu)
      centerAlign(ws, headerRowIndex, lastDataRow, firstCol, lastCol);

      // 2) kẻ viền mảnh cho TẤT CẢ các ô (header + dữ liệu)
      applyThinBorders(ws, headerRowIndex, lastDataRow, firstCol, lastCol);

      // Lưu file
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `LichDiCa_Thang${month}_Nam${year}.xlsx`);
      message.success('✅ Đã xuất dữ liệu ra file Excel');
    } catch (err) {
      console.error('❌ Lỗi khi xuất Excel:', err);
      message.error('❌ Lỗi khi xuất Excel: ' + err.message);
    }
  };

  // Helper functions để làm đẹp Excel
  // kẻ viền mảnh cho một vùng ô
  function applyThinBorders(ws, r1, r2, c1, c2, argb='FF000000') {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = ws.getCell(r, c);
        cell.border = {
          top:    { style: 'thin', color: { argb } },
          left:   { style: 'thin', color: { argb } },
          bottom: { style: 'thin', color: { argb } },
          right:  { style: 'thin', color: { argb } },
        };
      }
    }
  }

  // canh giữa cho một vùng ô
  function centerAlign(ws, r1, r2, c1, c2) {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = ws.getCell(r, c);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: !!cell.alignment?.wrapText };
      }
    }
  }

  // Tạo danh sách nhân viên theo ca từ dữ liệu đã được join
  const getStaffsByCa = () => {
    const staffsByCa = [];
    
    console.log("🔄 getStaffsByCa called with:", {
      phanCaKeys: Object.keys(phanCa),
      phanCaSample: Object.keys(phanCa).slice(0, 2).map(key => ({ key, value: phanCa[key] })),
      usersCount: users.length
    });

    // Kiểm tra nếu chưa có dữ liệu
    if (Object.keys(phanCa).length === 0) {
      console.log("⚠️ phanCa is empty, returning empty array");
      return staffsByCa;
    }

    // Thu thập tất cả nhân viên
    Object.keys(phanCa).forEach(group => {
      const shifts = phanCa[group] || [];

      shifts.forEach(shift => {
        // Đảm bảo không có dấu | trong label
        const shiftLabel = (shift.label || "Ca làm việc").replace(/\|/g, '');
        const shiftTime = shift.time || "";
        const usersInShift = shift.users || [];

        console.log(`🔍 Processing shift: label="${shiftLabel}", time="${shiftTime}"`);

        usersInShift.forEach(user => {
          // Kiểm tra user có hợp lệ không trước khi xử lý
          if (!user || !user.userId) {
            console.log(`⚠️ User object không hợp lệ, bỏ qua:`, user);
            return;
          }

          // Luôn lấy từ danh sách users (DemoNhanSu) để đảm bảo đồng bộ
          let userInfo;
          if (user.userId && typeof user.userId === 'object' && user.userId._id) {
            userInfo = users.find(u => String(u._id) === String(user.userId._id));
          } else if (user.userId) {
            userInfo = users.find(u => String(u._id) === String(user.userId));
          }
          if (userInfo) {
            staffsByCa.push({
              id: String(userInfo._id),
              name: userInfo.username,
              department: userInfo.group_name,
              ca: shiftLabel,
              caTime: shiftTime,
              note: user.note || ""
            });
          } else {
            // Nếu không tìm thấy user, log để debug nhưng không thêm vào danh sách
            console.log(`⚠️ User ${user.userId} không tồn tại hoặc thiếu thông tin, bỏ qua hiển thị`);
          }
        });
      });
    });

    // Sắp xếp theo thứ tự ca: sáng → chiều → đêm → các ca khác
    staffsByCa.sort((a, b) => {
      // Sắp xếp theo thứ tự tên ca: Ca sáng → Ca chiều → Ca đêm → các ca khác
      const caOrder = {
        "Ca sáng": 1,
        "Ca chiều": 2,
        "Ca đêm": 3
      };
      const orderA = caOrder[a.ca] || 999;
      const orderB = caOrder[b.ca] || 999;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Nếu cùng tên ca, sắp xếp theo thời gian để phân biệt ca cùng tên khác thời gian
      if (a.caTime !== b.caTime) {
        return a.caTime.localeCompare(b.caTime);
      }

      // Nếu cùng tên ca và cùng thời gian, sắp xếp theo bộ phận với "Tổ trưởng" ở cuối
      if (a.department !== b.department) {
        // "Tổ trưởng" luôn ở cuối cùng
        if (a.department === "Tổ trưởng") return 1;
        if (b.department === "Tổ trưởng") return -1;
        
        // Các bộ phận khác sắp xếp theo thứ tự: CSKH, FK, XNK, ...
        const deptOrder = {
          "CSKH": 1,
          "FK": 2,
          "XNK": 3
        };
        const deptOrderA = deptOrder[a.department] || 999;
        const deptOrderB = deptOrder[b.department] || 999;
        
        if (deptOrderA !== deptOrderB) {
          return deptOrderA - deptOrderB;
        }
        
        // Nếu không có trong deptOrder, sắp xếp theo alphabet
        return a.department.localeCompare(b.department);
      }

      // Nếu cùng bộ phận, sắp xếp theo tên
      return a.name.localeCompare(b.name);
    });

    console.log("✅ getStaffsByCa result:", staffsByCa.length, "staff members");
    return staffsByCa;
  };

  // Tính toán rowspan cho các cột cần merge
  const calculateRowspans = () => {
    const rowspans = {
      ca: [],
      department: []
    };

    staffsByCa.forEach((staff, index) => {
      // rowspan cho cột ca: theo (ca + caTime)
      let caRowspan = 1;
      for (let i = index + 1; i < staffsByCa.length; i++) {
        if (
          staffsByCa[i].ca === staff.ca &&
          (staffsByCa[i].caTime || '') === (staff.caTime || '')
        ) {
          caRowspan++;
        } else break;
      }
      rowspans.ca.push(caRowspan);

      // rowspan cho department: cùng bộ phận + cùng (ca + caTime)
      let deptRowspan = 1;
      for (let i = index + 1; i < staffsByCa.length; i++) {
        if (
          staffsByCa[i].department === staff.department &&
          staffsByCa[i].ca === staff.ca &&
          (staffsByCa[i].caTime || '') === (staff.caTime || '')
        ) {
          deptRowspan++;
        } else break;
      }
      rowspans.department.push(deptRowspan);
    });

    return rowspans;
  };

  // Kiểm tra xem có nên hiển thị cell hay không
  const shouldShowCell = (type, index) => {
    if (index === 0) return true;

    if (type === 'ca') {
      return (
        staffsByCa[index].ca !== staffsByCa[index - 1].ca ||
        (staffsByCa[index].caTime || '') !== (staffsByCa[index - 1].caTime || '')
      );
    }

    if (type === 'department') {
      return (
        staffsByCa[index].department !== staffsByCa[index - 1].department ||
        staffsByCa[index].ca !== staffsByCa[index - 1].ca ||
        (staffsByCa[index].caTime || '') !== (staffsByCa[index - 1].caTime || '')
      );
    }

    return true;
  };

     // Sử dụng useMemo để tránh gọi getStaffsByCa() mỗi lần render không cần thiết
   const staffsByCa = useMemo(() => {
     // Defensive programming: ensure users is array
     const usersArray = Array.isArray(users) ? users : [];
     
     console.log("🔄 Recalculating staffsByCa with:", { 
       phanCa: Object.keys(phanCa).length, 
       users: usersArray.length,
       usersType: typeof users,
       phanCaKeys: Object.keys(phanCa),
       usersSample: usersArray.slice(0, 3).map(u => ({ id: u._id, name: u.username, dept: u.group_name }))
     });
     if (Object.keys(phanCa).length > 0) {
       return getStaffsByCa();
     }
     return [];
   }, [phanCa, users]); // Thêm users vào dependency để đảm bảo cập nhật khi users thay đổi
   
   // Dữ liệu đã được lọc theo bộ lọc
   const filteredStaffsByCa = useMemo(() => {
     if (filterCa.length === 0 && filterDepartment.length === 0) {
       return staffsByCa;
     }
     
     return staffsByCa.filter(staff => {
       const matchCa = filterCa.length === 0 || filterCa.some(ca => ca === staff.ca);
       const matchDept = filterDepartment.length === 0 || filterDepartment.some(dept => dept === staff.department);
       return matchCa && matchDept;
     });
   }, [staffsByCa, filterCa, filterDepartment]);

     // Tính toán rowspans
   const rowspans = useMemo(() => {
     if (filteredStaffsByCa.length > 0) {
       return calculateRowspans();
     }
     return { ca: [], department: [] };
   }, [filteredStaffsByCa]);

  if (loading) {
    return (
      <div className="schedule-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-container">
      {/* CSS cho tooltip ghi chú và đảm bảo thứ tự hiển thị */}
      <style>{`
        ${noteTooltipStyles}
        
        /* Đảm bảo thứ tự hiển thị đúng */
        .filter-card { 
          position: relative; 
          z-index: 1; 
        }
        .off-stats, .table-container { 
          position: relative; 
          z-index: 2; 
        }
        
        /* Ngăn chặn bộ lọc bị nhảy lên đầu */
        .filter-card {
          position: relative !important;
          top: auto !important;
          sticky: none !important;
        }
      `}</style>
      
      {/* Bỏ banner thông báo trên bản copy để gọn giao diện */}
      
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
              <span style={{ width: 16, height: 16, background: STATUS_COLORS.OFF, display: 'inline-block', borderRadius: 2 }} />
              <span>OFF = Ngày OFF</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, background: '#6a8caf', display: 'inline-block', borderRadius: 2 }} />
              <span>1 = 1 ngày</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, background: STATUS_COLORS["1/2"], display: 'inline-block', borderRadius: 2 }} />
              <span>1/2 = Nửa ngày</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, background: STATUS_COLORS.VP, display: 'inline-block', borderRadius: 2 }} />
              <span>VP = Về phép</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, background: STATUS_COLORS.X, display: 'inline-block', borderRadius: 2 }} />
              <span>X = Ngày đang về phép</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, background: STATUS_COLORS.QL, display: 'inline-block', borderRadius: 2 }} />
              <span>QL = Quay lại</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 16, background: STATUS_COLORS.KL, display: 'inline-block', borderRadius: 2 }} />
              <span>KL = OFF Không lương</span>
            </div>
          </div>
          
        </div>

        {/* Hàng dưới: các nút thao tác dành cho ADMIN */}
        <div className="action-controls" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AccessControl resource="schedules" action="edit" fallback={null}>
            <button onClick={handleSaveCopy} disabled={savingCopy} className="save-copy-button">
              {savingCopy ? "Đang lưu bản sao..." : "Lưu bản sao"}
            </button>
            <button
              onClick={handleOpenEditShift}
              className="edit-shift-button"
              style={{ backgroundColor: '#faad14', color: '#222', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
              title="Chỉnh sửa ca nhân viên"
            >
            Chỉnh sửa ca
            </button>
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
              title="Chèn ghi chú vào ô"
            >
              📝 Chèn ghi chú
              {(() => {
                const totalNotes = Object.values(notesData).reduce((total, staffNotes) => {
                  return total + Object.values(staffNotes || {}).filter(note => note).length;
                }, 0);
                return totalNotes > 0 ? (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ff4d4f',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {totalNotes}
                  </span>
                ) : null;
              })()}
            </button>
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

      {/* 1) THỐNG KÊ OFF — đặt LÊN TRÊN */}
      <OffStatisticsTable
        scheduleData={scheduleData}
        staffsByCa={filteredStaffsByCa}
        notesData={notesData}
        daysInMonth={daysInMonth}
        month={month}
        year={year}
      />

      {/* 2) BỘ LỌC — đặt SAU thống kê */}
      <div
        className="filter-card"
        style={{
          marginBottom: '20px',
          padding: '16px',
          background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <h3 style={{ 
          margin: '0 0 16px 0', 
          color: '#1890ff', 
          fontSize: '18px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔍 Bộ lọc dữ liệu
        </h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          alignItems: 'end'
        }}>
          {/* Lọc theo ca */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#495057' 
            }}>
              Thời gian làm việc:
              {filterCa.length > 0 && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#52c41a' }}>
                  ({filterCa.length} ca đã chọn)
                </span>
              )}
            </label>
            <Select
              mode="multiple"
              placeholder="Chọn ca để lọc (có thể chọn nhiều)"
              style={{ width: '100%' }}
              allowClear
              showSearch
              maxTagCount={3}
              maxTagTextLength={15}
              value={filterCa}
              onChange={setFilterCa}
              options={(() => {
                const caOptions = new Set();
                staffsByCa.forEach(staff => {
                  if (staff.ca) {
                    caOptions.add(staff.ca);
                  }
                });
                return Array.from(caOptions).map(ca => ({
                  label: ca,
                  value: ca
                }));
              })()}
            />
          </div>
          
          {/* Lọc theo bộ phận */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600', 
              color: '#495057' 
            }}>
              Bộ phận:
              {filterDepartment.length > 0 && (
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#52c41a' }}>
                  ({filterDepartment.length} bộ phận đã chọn)
                </span>
              )}
            </label>
            <Select
              mode="multiple"
              placeholder="Chọn bộ phận để lọc (có thể chọn nhiều)"
              style={{ width: '100%' }}
              allowClear
              showSearch
              maxTagCount={3}
              maxTagTextLength={15}
              value={filterDepartment}
              onChange={setFilterDepartment}
              options={(() => {
                const deptOptions = new Set();
                staffsByCa.forEach(staff => {
                  if (staff.department) {
                    deptOptions.add(staff.department);
                  }
                });
                return Array.from(deptOptions).map(dept => ({
                  label: dept,
                  value: dept
                }));
              })()}
            />
          </div>
          
          {/* Nút xóa bộ lọc */}
          <div>
            <Button
              onClick={clearFilters}
              title="Xóa tất cả bộ lọc đang áp dụng"
              style={{ 
                width: '100%',
                height: '32px',
                background: '#ff4d4f',
                borderColor: '#ff4d4f',
                color: 'white'
              }}
              icon={<span>🗑️</span>}
            >
              Xóa bộ lọc
            </Button>
          </div>
        </div>
        
        {/* Hiển thị thông tin bộ lọc đang áp dụng */}
        {(filterCa.length > 0 || filterDepartment.length > 0) && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#e6f7ff', 
            borderRadius: '6px',
            border: '1px solid #91d5ff',
            fontSize: '14px',
            color: '#1890ff'
          }}>
            <strong>Bộ lọc đang áp dụng:</strong>
            {filterCa.length > 0 && (
              <span style={{ marginLeft: '8px' }}>
                <strong>Ca:</strong> {filterCa.join(', ')}
              </span>
            )}
            {filterDepartment.length > 0 && (
              <span style={{ marginLeft: '8px' }}>
                <strong>Bộ phận:</strong> {filterDepartment.join(', ')}
              </span>
            )}
            <span style={{ marginLeft: '8px', color: '#52c41a' }}>
              (Hiển thị {filteredStaffsByCa.length}/{staffsByCa.length} nhân viên)
            </span>
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              💡 Bạn có thể chọn nhiều ca và bộ phận cùng lúc để lọc dữ liệu chính xác hơn
            </div>
          </div>
        )}
      </div>

      {/* Popup chèn ghi chú */}
      <Modal
        title="Chèn ghi chú vào ô"
        open={noteModalVisible}
        onCancel={() => setNoteModalVisible(false)}
        onOk={() => {
          noteForm
            .validateFields()
            .then(values => {
              const { staffId, day, note } = values;
              const staffName = staffsByCa.find(s => s.id === staffId)?.name || 'Nhân viên';
              setNotesData(prev => ({
                ...prev,
                [staffId]: { ...(prev[staffId] || {}), [day]: note }
              }));
              setNoteModalVisible(false);
              noteForm.resetFields();
              // Bỏ thông báo thành công
            })
            .catch(() => {});
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

      {/* Popup cập nhật ghi chú */}
      <Modal
        title={`Chỉnh sửa ghi chú - ${editingNote.staffName} ngày ${editingNote.day}`}
        open={editNoteModalVisible}
        onCancel={() => setEditNoteModalVisible(false)}
        footer={[
          <Button key="delete" danger onClick={handleDeleteNote}>
            Xóa
          </Button>,
          <Button key="cancel" onClick={() => setEditNoteModalVisible(false)}>
            Hủy
          </Button>,
          <Button key="update" type="primary" onClick={handleUpdateNote}>
            Cập nhật
          </Button>
        ]}
      >
        <Form form={editNoteForm} layout="vertical">
          <Form.Item label="Ghi chú" name="note" rules={[{ required: true, message: 'Nhập ghi chú' }]}>
            <Input.TextArea rows={4} placeholder="Nội dung ghi chú" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Popup chỉnh sửa ca nhân viên */}
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
          
          <div style={{ fontSize: 12, color: '#888', marginTop: '16px' }}>
            Lưu ý: Nếu có sự thay đổi gì đó, hãy lưu lại bản sao để cập nhật dữ liệu.
          </div>
        </Form>
      </Modal>

      {/* 3) BẢNG DỮ LIỆU */}
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
                          padding: '8px 4px'
                        }}
                        title={hasNote ? `Ghi chú: ${notesData[staff.id][i + 1]}` : undefined}
                      >
                        {hasNote && (
                          <>
                            {/* Icon ghi chú nổi bật ở góc phải */}
                            <div
                              style={{
                                position: 'absolute',
                                right: '2px',
                                top: '2px',
                                width: '12px',
                                height: '12px',
                                background: '#ff6b35',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                color: 'white',
                                fontWeight: 'bold',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                zIndex: 2,
                                cursor: 'pointer'
                              }}
                              title={`Click để chỉnh sửa ghi chú`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditNote(staff.id, i + 1, notesData[staff.id][i + 1], staff.name);
                              }}
                            >
                              ⭐️
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
                              fontSize: hasNote ? '14px' : '13px'
                            }}>
                              {value}
                            </span>
                          }
                        >
                          <select
                            value={value}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setScheduleData(prev => ({
                                ...prev,
                                [staff.id]: {
                                  ...prev[staff.id],
                                  [i + 1]: newValue
                                }
                              }));
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
                   {filterCa.length > 0 || filterDepartment.length > 0 ? (
                     <>
                       <div style={{ fontSize: '16px', marginBottom: '10px', color: '#ff4d4f' }}>
                         🔍 Không tìm thấy nhân viên nào phù hợp với bộ lọc
                       </div>
                       <div style={{ fontSize: '14px', color: '#888' }}>
                         Ca: <strong>{filterCa.length > 0 ? filterCa.join(', ') : 'Tất cả'}</strong> | Bộ phận: <strong>{filterDepartment.length > 0 ? filterDepartment.join(', ') : 'Tất cả'}</strong>
                       </div>
                       <div style={{ fontSize: '12px', color: '#52c41a', marginTop: '8px' }}>
                         Hãy thử thay đổi bộ lọc hoặc nhấn "Xóa bộ lọc" để xem tất cả
                       </div>
                     </>
                   ) : copyData?.copyId ? (
                     <>
                       <div style={{ fontSize: '16px', marginBottom: '10px' }}>
                         📋 Đây là tab bản sao: <strong>{copyData.name || `Bản sao tháng ${month}/${year}`}</strong>
                       </div>
                       <div style={{ fontSize: '14px', color: '#888' }}>
                         {isAdmin ? "Bạn có thể chỉnh sửa, lưu, xuất Excel và xóa bản sao" : "Bạn chỉ có thể xem dữ liệu (không thể chỉnh sửa)"}
                       </div>
                     </>
                   ) : (
                     "Đây là tab bản sao. Dữ liệu được hiển thị từ bản sao đã lưu."
                   )}
                 </td>
               </tr>
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Cấu trúc GROUPS từ DemoNhanSu.js
const GROUPS = [
  { label: "CSKH", value: "CSKH", subs: ["CSKH", "CSOL", "CSDL", "Truyền thông"], color: "#12B3D6" },
  { label: "FK", value: "FK", subs: ["FK", "FK-X"], color: "#f59e42" },
  { label: "XNK", value: "XNK", subs: ["XNK"], color: "#43A047" },
  { label: "Tổ trưởng", value: "TOTRUONG", subs: ["TT"], color: "#8B5CF6" }
];

// Component thống kê nhân viên OFF
const OffStatisticsTable = ({ scheduleData, staffsByCa, notesData, daysInMonth, month, year }) => {
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
         bodyStyle={{
           padding: '24px',
           background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)'
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
};
