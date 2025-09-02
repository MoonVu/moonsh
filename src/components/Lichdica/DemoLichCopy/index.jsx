import React, { useState, useEffect, useMemo } from "react";
import "../../../BangDuLieu.css";
import apiService from "../../../services/api";
import { Form, message } from 'antd';
import { useAuth } from "../../../hooks/useAuth";

// Import các component đã tách
import { noteTooltipStyles, getDaysInMonth, CA_CHINH } from "./constants";
import HeaderControls from "./HeaderControls";
import OffStatisticsTable from "./OffStatisticsTable";
import FilterPanel from "./FilterPanel";
import ScheduleTable from "./ScheduleTable";
import NoteManagementModals from "./NoteManagementModals";
import EditShiftModal from "./EditShiftModal";

// Import các utility functions
import ScheduleDataUtils from "./ScheduleDataUtils";
import ExcelExportUtils from "./ExcelExportUtils";
import CopyManagementUtils from "./CopyManagementUtils";

export default function DemoLichCopy({ tabId, copyData = null }) {
  const { isAdmin } = useAuth();
  
  // Khởi tạo utility functions
  const scheduleDataUtils = ScheduleDataUtils();
  const excelExportUtils = ExcelExportUtils();
  const copyManagementUtils = CopyManagementUtils();
  
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
                
                // Đảm bảo notesData được load đúng cách
                const cleanNotesData = {};
                Object.keys(copyData.notesData).forEach(staffId => {
                  if (copyData.notesData[staffId] && typeof copyData.notesData[staffId] === 'object') {
                    cleanNotesData[staffId] = { ...copyData.notesData[staffId] };
                  }
                });
                
                setNotesData(cleanNotesData);
                console.log("✅ Đã gọi setNotesData với:", cleanNotesData);
                console.log("✅ Set notesData từ backend:", Object.keys(cleanNotesData).length, "staff members");
              } else {
                console.log("⚠️ Không có notesData từ backend hoặc format không đúng:", copyData.notesData);
                // Khởi tạo notesData rỗng nếu không có từ backend
                setNotesData({});
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
        copyManagementUtils.checkAndCleanupZombieCopy(copyData);
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
  const handleUpdateNote = async () => {
    try {
      const values = await editNoteForm.validateFields();
      const { note } = values;
      
      // Tạo notesData mới với ghi chú đã cập nhật
      const newNotesData = {
        ...notesData,
        [editingNote.staffId]: { ...(notesData[editingNote.staffId] || {}), [editingNote.day]: note }
      };
      
      console.log('🔍 Debug notesData update:', {
        oldNotesData: notesData,
        newNotesData,
        staffId: editingNote.staffId,
        day: editingNote.day,
        note
      });
      
      // Cập nhật UI ngay lập tức
      setNotesData(newNotesData);
      
      // Tự động gửi API về backend
      if (copyData?.copyId) {
        try {
          console.log('🔄 Tự động lưu thay đổi ghi chú:', {
            staffId: editingNote.staffId,
            day: editingNote.day,
            note,
            copyId: copyData.copyId,
            newNotesData
          });
          
          console.log('🔍 Debug API call:', {
            copyId: copyData.copyId,
            month,
            year,
            scheduleDataKeys: Object.keys(scheduleData),
            phanCaKeys: Object.keys(phanCa),
            notesDataKeys: Object.keys(newNotesData),
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
            console.log('✅ Đã tự động lưu thay đổi ghi chú thành công');
            console.log('🔍 Response data:', response.data);
            message.success('✅ Đã lưu ghi chú thành công');
          } else {
            console.error('❌ Lỗi khi tự động lưu thay đổi ghi chú:', response?.error);
            message.error('❌ Không thể lưu ghi chú: ' + (response?.error || 'Lỗi không xác định'));
          }
        } catch (error) {
          console.error('❌ Lỗi khi gọi API lưu ghi chú:', error);
          message.error('❌ Lỗi khi lưu ghi chú: ' + error.message);
        }
      } else {
        console.warn('⚠️ Không có copyId, không thể lưu ghi chú');
        message.warning('⚠️ Không thể lưu ghi chú (thiếu thông tin bản sao)');
      }
      
      setEditNoteModalVisible(false);
      editNoteForm.resetFields();
      
    } catch (error) {
      console.error('❌ Lỗi khi cập nhật ghi chú:', error);
    }
  };

  // Function xóa ghi chú
  const handleDeleteNote = async () => {
    if (window.confirm(`Bạn có muốn xóa ghi chú ngày ${editingNote.day} của ${editingNote.staffName}?\n\nNội dung: ${editingNote.note}`)) {
      try {
        // Cập nhật UI ngay lập tức
        const newNotesData = { ...notesData };
        if (newNotesData[editingNote.staffId]) {
          delete newNotesData[editingNote.staffId][editingNote.day];
          // Nếu không còn ghi chú nào cho nhân viên này, xóa luôn key
          if (Object.keys(newNotesData[editingNote.staffId]).length === 0) {
            delete newNotesData[editingNote.staffId];
          }
        }
        
        // Cập nhật state
        setNotesData(newNotesData);
        
        // Tự động gửi API về backend
        if (copyData?.copyId) {
          try {
            console.log('🔄 Tự động lưu xóa ghi chú:', {
              staffId: editingNote.staffId,
              day: editingNote.day,
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
              console.log('✅ Đã tự động lưu xóa ghi chú thành công');
              message.success('✅ Đã xóa ghi chú thành công');
            } else {
              console.error('❌ Lỗi khi tự động lưu xóa ghi chú:', response?.error);
              message.error('❌ Không thể xóa ghi chú: ' + (response?.error || 'Lỗi không xác định'));
            }
          } catch (error) {
            console.error('❌ Lỗi khi gọi API xóa ghi chú:', error);
            message.error('❌ Lỗi khi xóa ghi chú: ' + error.message);
          }
        } else {
          console.warn('⚠️ Không có copyId, không thể lưu xóa ghi chú');
          message.warning('⚠️ Không thể xóa ghi chú (thiếu thông tin bản sao)');
        }
        
        setEditNoteModalVisible(false);
        editNoteForm.resetFields();
        
      } catch (error) {
        console.error('❌ Lỗi khi xóa ghi chú:', error);
        message.error('❌ Lỗi khi xóa ghi chú: ' + error.message);
      }
    }
  };
  
  // Function xóa bộ lọc
  const clearFilters = () => {
    setFilterCa([]);
    setFilterDepartment([]);
  };

  // Function mở modal chỉnh sửa ca
  const handleOpenEditShift = () => {
    editShiftForm.resetFields();
    setShowNewShiftFields(false);
    setShowEditShiftModal(true);
  };

  // Sử dụng useMemo để tránh gọi getStaffsByCa() mỗi lần render không cần thiết
  const staffsByCa = useMemo(() => {
    // Defensive programming: ensure users is array
    const usersArray = Array.isArray(users) ? users : [];
    
    if (Object.keys(phanCa).length > 0) {
      return scheduleDataUtils.getStaffsByCa(phanCa, usersArray);
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
      return scheduleDataUtils.calculateRowspans(filteredStaffsByCa);
    }
    return { ca: [], department: [] };
  }, [filteredStaffsByCa]);

  // Function xuất Excel
  const handleExportToExcel = () => {
    excelExportUtils.handleExportToExcel(filteredStaffsByCa, daysInMonth, month, year, scheduleData, notesData);
  };

  // Function xóa bản sao
  const handleDeleteCopy = () => {
    copyManagementUtils.handleDeleteCopy(copyData, tabId, setScheduleData, setPhanCa, setUsers, setMonth, setYear, today);
  };

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
      
      {/* Header Controls */}
      <HeaderControls
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        daysInMonth={daysInMonth}
        notesData={notesData}
        handleOpenEditShift={handleOpenEditShift}
        setNoteModalVisible={setNoteModalVisible}
        handleDeleteCopy={handleDeleteCopy}
        handleExportToExcel={handleExportToExcel}
      />

      {/* Thống kê OFF */}
      <OffStatisticsTable
        scheduleData={scheduleData}
        staffsByCa={filteredStaffsByCa}
        notesData={notesData}
        daysInMonth={daysInMonth}
        month={month}
        year={year}
      />

      {/* Bộ lọc */}
      <FilterPanel
        filterCa={filterCa}
        setFilterCa={setFilterCa}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        staffsByCa={staffsByCa}
        clearFilters={clearFilters}
      />

      {/* Bảng dữ liệu */}
      <ScheduleTable
        filteredStaffsByCa={filteredStaffsByCa}
        daysInMonth={daysInMonth}
        scheduleData={scheduleData}
        setScheduleData={setScheduleData}
        notesData={notesData}
        rowspans={rowspans}
        shouldShowCell={(type, index) => scheduleDataUtils.shouldShowCell(type, index, filteredStaffsByCa)}
        handleOpenEditNote={handleOpenEditNote}
        copyData={copyData}
        month={month}
        year={year}
        phanCa={phanCa}
      />

      {/* Modals */}
      <NoteManagementModals
        noteModalVisible={noteModalVisible}
        setNoteModalVisible={setNoteModalVisible}
        editNoteModalVisible={editNoteModalVisible}
        setEditNoteModalVisible={setEditNoteModalVisible}
        editingNote={editingNote}
        setEditingNote={setEditingNote}
        noteForm={noteForm}
        editNoteForm={editNoteForm}
        filteredStaffsByCa={filteredStaffsByCa}
        daysInMonth={daysInMonth}
        notesData={notesData}
        setNotesData={setNotesData}
        scheduleData={scheduleData}
        phanCa={phanCa}
        month={month}
        year={year}
        copyData={copyData}
        handleOpenEditNote={handleOpenEditNote}
        handleUpdateNote={handleUpdateNote}
        handleDeleteNote={handleDeleteNote}
      />

      <EditShiftModal
        showEditShiftModal={showEditShiftModal}
        setShowEditShiftModal={setShowEditShiftModal}
        editShiftForm={editShiftForm}
        showNewShiftFields={showNewShiftFields}
        setShowNewShiftFields={setShowNewShiftFields}
        staffsByCa={staffsByCa}
        users={users}
        phanCa={phanCa}
        setPhanCa={setPhanCa}
        scheduleData={scheduleData}
        notesData={notesData}
        month={month}
        year={year}
        copyData={copyData}
        CA_CHINH={CA_CHINH}
      />
    </div>
  );
}
