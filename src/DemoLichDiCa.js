import React, { useState, useEffect, useMemo } from "react";
import "./BangDuLieu.css";
import apiService from "./services/api";
import { useSchedule } from "./contexts/ScheduleContext";
import { Select, DatePicker, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const STATUS_COLORS = {
  OFF: "#174ea6", // xanh đậm
  "1/2": "#8e24aa", // tím
  VP: "#ffe066", // vàng
  QL: "#ffd600", // vàng đậm
  X: "#e53935", // đỏ
  KL: "#7c43bd", // tím khác
};
const STATUS_OPTIONS = ["", "OFF", "1/2", "VP", "QL", "X", "KL"];

// 3 ca chính
const CA_CHINH = [
  { label: "CA SÁNG", time: "07h20-18h20", keywords: ["sáng", "sang", "morning"] },
  { label: "CA CHIỀU", time: "17h00-04h00", keywords: ["chiều", "chieu", "afternoon"] },
  { label: "CA ĐÊM", time: "21h00-08h00", keywords: ["đêm", "dem", "night"] }
];

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

export default function DemoLichDiCa({ tabId, isCopyTab = false, copyData = null }) {
  const { refreshSchedulesCounter } = useSchedule();
  
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const daysInMonth = getDaysInMonth(month, year);
  
  // Dữ liệu phân ca từ DemoNhanSu theo tháng
  const [phanCa, setPhanCa] = useState({});
  const [loading, setLoading] = useState(false);
  const [creatingCopy, setCreatingCopy] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
     const [showEditShiftModal, setShowEditShiftModal] = useState(false);
   const [editShiftForm] = Form.useForm();

  // Dữ liệu users để map thông tin
  const [users, setUsers] = useState([]);

  // scheduleData[staffId][day] = trạng thái
  const [scheduleData, setScheduleData] = useState({});

  // Nếu là tab copy, load dữ liệu đầy đủ từ backend
  useEffect(() => {
    if (isCopyTab && copyData?.copyId) {
      console.log("🔄 Loading copy tab data from backend:", copyData);
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
             const copyResponse = await apiService.getScheduleCopy(copyData.copyId);
             if (copyResponse && copyResponse.success && copyResponse.data) {
               const copyData = copyResponse.data;
               console.log("✅ Loaded full copy data from backend:", copyData);
               
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
     } else if (!isCopyTab) {
       fetchData();
     }
   }, [isCopyTab, copyData?.copyId]); // Chỉ refetch khi copyId thay đổi

   // Function xử lý fallback khi không thể load dữ liệu từ backend
   const handleLoadFallbackData = async () => {
     try {
       console.log("🔄 Sử dụng fallback data...");
       
       // Thử load từ localStorage trước
       if (copyData?.copyId) {
         const localKey = `copy_${copyData.copyId}_data`;
         const localData = localStorage.getItem(localKey);
         if (localData) {
           try {
             const parsedData = JSON.parse(localData);
             console.log("✅ Loaded fallback data from localStorage:", parsedData);
             
             if (parsedData.scheduleData) {
               setScheduleData(parsedData.scheduleData);
             }
             if (parsedData.phanCa) {
               setPhanCa(parsedData.phanCa);
             }
             
             // Hiển thị thông báo cho user
             message.warning("⚠️ Đang sử dụng dữ liệu backup từ localStorage. Một số tính năng có thể bị hạn chế.");
             return;
           } catch (parseErr) {
             console.warn("⚠️ Không thể parse localStorage data:", parseErr);
           }
         }
       }
       
       // Fallback cuối cùng: sử dụng dữ liệu từ prop
       console.log("🔄 Sử dụng fallback data từ prop...");
       if (copyData?.phanCa) {
         setPhanCa(copyData.phanCa);
         console.log("✅ Set phanCa từ prop:", Object.keys(copyData.phanCa).length, "departments");
       }
       if (copyData?.scheduleData) {
         setScheduleData(copyData.scheduleData);
         console.log("✅ Set scheduleData từ prop:", Object.keys(copyData.scheduleData).length, "users");
       }
       
       message.info("ℹ️ Đang sử dụng dữ liệu từ bộ nhớ local. Vui lòng kiểm tra kết nối backend.");
     } catch (err) {
       console.error("❌ Lỗi khi xử lý fallback data:", err);
       message.error("❌ Không thể load dữ liệu. Vui lòng thử lại sau!");
     }
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

    // Function xóa bản sao orphan (bản sao không có tab tương ứng)
    const cleanupOrphanCopies = async () => {
      try {
        console.log("🧹 Đang dọn dẹp các bản sao orphan...");
        
        // Lấy danh sách tất cả bản sao
        const copiesResponse = await apiService.getAllScheduleCopies();
        if (!copiesResponse || !copiesResponse.success) {
          console.warn("⚠️ Không thể lấy danh sách bản sao để dọn dẹp");
          return;
        }
        
        const copies = copiesResponse.data || [];
        console.log(`🔍 Tìm thấy ${copies.length} bản sao trong database`);
        
        // Lấy danh sách tất cả tabs
        const tabsResponse = await apiService.getAllScheduleTabs();
        if (!tabsResponse || !tabsResponse.success) {
          console.warn("⚠️ Không thể lấy danh sách tabs để dọn dẹp");
          return;
        }
        
        const tabs = tabsResponse.data || [];
        console.log(`🔍 Tìm thấy ${tabs.length} tabs trong database`);
        
        // Tìm các bản sao orphan (không có tab tương ứng)
        const orphanCopies = copies.filter(copy => {
          return !tabs.some(tab => 
            tab.data && tab.data.copyId === copy._id
          );
        });
        
        if (orphanCopies.length === 0) {
          console.log("✅ Không có bản sao orphan nào cần dọn dẹp");
          return;
        }
        
        console.log(`⚠️ Tìm thấy ${orphanCopies.length} bản sao orphan:`, orphanCopies.map(c => c.name));
        
        // Hỏi user có muốn xóa không
        if (window.confirm(`Tìm thấy ${orphanCopies.length} bản sao orphan (không có tab tương ứng).\n\nBạn có muốn xóa chúng khỏi database không?\n\nDanh sách:\n${orphanCopies.map(c => `- ${c.name} (ID: ${c._id})`).join('\n')}`)) {
          
          let deletedCount = 0;
          for (const orphanCopy of orphanCopies) {
            try {
              console.log(`🗑️ Đang xóa bản sao orphan: ${orphanCopy.name} (${orphanCopy._id})`);
              const deleteResponse = await apiService.deleteScheduleCopy(orphanCopy._id);
              
              if (deleteResponse && deleteResponse.success) {
                console.log(`✅ Đã xóa bản sao orphan: ${orphanCopy.name}`);
                deletedCount++;
              } else {
                console.error(`❌ Không thể xóa bản sao orphan: ${orphanCopy.name}`, deleteResponse);
              }
            } catch (err) {
              console.error(`❌ Lỗi khi xóa bản sao orphan: ${orphanCopy.name}`, err);
            }
          }
          
          alert(`✅ Đã dọn dẹp ${deletedCount}/${orphanCopies.length} bản sao orphan khỏi database!`);
          
          // Refresh trang để cập nhật dữ liệu
          if (deletedCount > 0) {
            window.location.reload();
          }
        }
        
      } catch (err) {
        console.error("❌ Lỗi khi dọn dẹp bản sao orphan:", err);
      }
    };

  // useEffect để theo dõi thay đổi tháng/năm và tự động load dữ liệu mới
  useEffect(() => {
    if (!isCopyTab) {
      console.log("🔄 useEffect [month, year] triggered:", { month, year });
      fetchData();
    }
  }, [month, year, isCopyTab]); // Tự động refetch khi tháng hoặc năm thay đổi

  // useEffect riêng để xử lý refresh từ context
  useEffect(() => {
    console.log("🔄 useEffect [refreshSchedulesCounter] triggered:", { refreshSchedulesCounter });
    if (refreshSchedulesCounter > 0 && !isCopyTab) {
      fetchData();
    }
  }, [refreshSchedulesCounter, isCopyTab]); // Chỉ refetch khi refreshSchedulesCounter thay đổi và không phải copy tab

  // Thêm function refreshSchedules vào window để có thể gọi từ bên ngoài
  useEffect(() => {
    window.refreshSchedules = () => {
      console.log("🔄 Triggering refresh from window.refreshSchedules");
      if (!isCopyTab) {
        fetchData();
      } else {
        console.log("🔄 Copy tab detected, skipping fetchData");
      }
    };
    
    // Thêm function refresh copy tab
    if (isCopyTab && copyData?.copyId) {
      window.refreshCopyTab = async () => {
        console.log("🔄 Triggering refresh from window.refreshCopyTab");
        try {
          setLoading(true);
          
          // Load dữ liệu schedule copy đầy đủ từ backend
          const copyResponse = await apiService.getScheduleCopy(copyData.copyId);
          if (copyResponse && copyResponse.success && copyResponse.data) {
            const copyData = copyResponse.data;
            console.log("✅ Refreshed copy data from backend:", copyData);
            
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
              console.log("✅ Refreshed scheduleData:", Object.keys(scheduleDataObj).length, "users");
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
              console.log("✅ Refreshed phanCa:", Object.keys(phanCaObj).length, "departments");
            }
                     } else {
             console.warn("⚠️ Không thể refresh dữ liệu copy từ backend, sử dụng fallback:", copyResponse);
             await handleLoadFallbackData();
           }
         } catch (err) {
           console.warn("⚠️ Lỗi khi refresh dữ liệu copy, sử dụng fallback:", err);
           await handleLoadFallbackData();
         } finally {
           setLoading(false);
         }
      };
    }
    
    return () => {
      delete window.refreshSchedules;
      delete window.refreshCopyTab;
    };
  }, [isCopyTab, copyData?.copyId]);

  // Function tạo bản sao
  const handleCreateCopy = async () => {
    try {
      setCreatingCopy(true);
      
      // Tạo bản sao với tên mặc định
      const copyName = `Bản sao tháng ${month}/${year}`;
      
      const response = await apiService.createScheduleCopy({
        month,
        year,
        name: copyName,
        scheduleData,
        phanCa
      });
      
      if (response && response.success) {
        console.log("✅ Bản sao đã được tạo:", response.data);
        
        // Tạo tab mới cho bản sao
        try {
          const tabResponse = await apiService.createScheduleTab({
            name: copyName,
            type: "month",
            visible: true,
            data: {
              copyId: response.data.id,
              month: month,
              year: year,
              scheduleData: scheduleData,
              phanCa: phanCa
            }
          });
          
          if (tabResponse && tabResponse.success) {
            alert(`✅ Đã tạo ${copyName}`);
            // Trigger refresh để hiển thị tab mới
            if (window.refreshTabs) {
              window.refreshTabs();
            }
            // Hoặc có thể gọi callback nếu cần
            if (window.onTabCreated) {
              window.onTabCreated();
            }
          } else {
            alert(`✅ Đã tạo bản sao thành công: ${copyName}\n⚠️ Nhưng không thể tạo tab mới`);
          }
        } catch (tabErr) {
          console.error("❌ Lỗi khi tạo tab mới:", tabErr);
          alert(`✅ Đã tạo bản sao thành công: ${copyName}\n⚠️ Nhưng không thể tạo tab mới`);
        }
      } else {
        alert("❌ Lỗi khi tạo bản sao: " + (response?.error || "Không xác định"));
      }
    } catch (err) {
      console.error("❌ Lỗi khi tạo bản sao:", err);
      alert("❌ Lỗi khi tạo bản sao: " + err.message);
    } finally {
      setCreatingCopy(false);
    }
  };

         // Function xóa bản sao
    const handleDeleteCopy = async () => {
      try {
        // Kiểm tra token xác thực
        const token = localStorage.getItem('authToken');
        if (!token) {
          alert("❌ Không tìm thấy token xác thực. Vui lòng đăng nhập lại!");
          return;
        }
        
        if (!copyData || !copyData.copyId) {
          alert("❌ Không tìm thấy ID bản sao để xóa");
          return;
        }

        console.log("🔄 Bắt đầu xóa bản sao với ID:", copyData.copyId);
        
        // Bước 1: Xóa bản sao khỏi MongoDB trước
        let copyDeleted = false;
        try {
          const deleteCopyResponse = await apiService.deleteScheduleCopy(copyData.copyId);
          if (deleteCopyResponse && deleteCopyResponse.success) {
            console.log("✅ Đã xóa bản sao khỏi MongoDB thành công");
            copyDeleted = true;
          } else {
            console.error("❌ Không thể xóa bản sao khỏi MongoDB:", deleteCopyResponse);
            // Nếu không xóa được bản sao, dừng lại và báo lỗi
            alert("❌ Không thể xóa bản sao khỏi database!\n\nLỗi: " + (deleteCopyResponse?.error || "Không xác định"));
            return;
          }
        } catch (deleteErr) {
          console.error("❌ Lỗi khi xóa bản sao khỏi MongoDB:", deleteErr);
          alert("❌ Lỗi kết nối khi xóa bản sao!\n\nVui lòng kiểm tra kết nối mạng và thử lại!");
          return;
        }
        
        // Bước 2: Xóa tab khỏi MongoDB
        let tabDeleted = false;
        if (tabId) {
          try {
            console.log("🗑️ Đang xóa tab khỏi MongoDB...");
            const deleteTabResponse = await apiService.deleteScheduleTab(tabId);
            
            if (deleteTabResponse && deleteTabResponse.success) {
              console.log("✅ Đã xóa tab khỏi MongoDB thành công");
              tabDeleted = true;
            } else {
              console.warn("⚠️ Không thể xóa tab khỏi MongoDB:", deleteTabResponse);
              // Tiếp tục xóa local dù tab có xóa được hay không
            }
          } catch (tabErr) {
            console.warn("⚠️ Lỗi khi xóa tab khỏi MongoDB:", tabErr);
            // Tiếp tục xóa local dù tab có xóa được hay không
          }
        }
        
        // Bước 3: Xóa dữ liệu local
        console.log("🗑️ Đang xóa dữ liệu local...");
        await handleDeleteTabOnly();
        
        // Hiển thị thông báo thành công
        if (copyDeleted && tabDeleted) {
          alert("✅ Đã xóa hoàn toàn bản sao và tab khỏi database!");
        } else if (copyDeleted) {
          alert("✅ Đã xóa thành công!");
        } else {
          alert("❌ Có lỗi xảy ra khi xóa dữ liệu!");
        }
        
      } catch (err) {
        console.error("❌ Lỗi nghiêm trọng khi xóa bản sao:", err);
        alert("❌ Lỗi nghiêm trọng khi xóa bản sao!\n\nVui lòng thử lại hoặc liên hệ admin!");
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

   // Function lưu bản sao
   const handleSaveCopy = async () => {
    try {
      setSavingCopy(true);
      
      if (!copyData || !copyData.copyId) {
        alert("❌ Không tìm thấy ID bản sao để lưu");
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
        alert("⚠️ Backend không khả dụng. Dữ liệu sẽ được lưu vào localStorage.");
        
        // Lưu vào localStorage
        const localKey = `copy_${copyData.copyId}_data`;
        localStorage.setItem(localKey, JSON.stringify({
          scheduleData,
          phanCa,
          lastUpdated: new Date().toISOString()
        }));
        
        alert("✅ Đã lưu dữ liệu vào localStorage làm backup");
        setSavingCopy(false);
        return;
      }
      
      const response = await apiService.updateScheduleCopy(copyData.copyId, {
        month,
        year,
        name: copyName,
        scheduleData,
        phanCa
      });

      if (response && response.success) {
        alert(`✅ Đã lưu bản sao thành công: ${copyName}`);
        // Cập nhật copyData local
        if (copyData) {
          copyData.scheduleData = scheduleData;
          copyData.phanCa = phanCa;
        }
      } else {
        alert(`❌ Lỗi khi lưu bản sao: ${response?.error || "Không xác định"}`);
      }
    } catch (err) {
      console.error("❌ Lỗi khi lưu bản sao:", err);
      alert("❌ Lỗi khi lưu bản sao: " + err.message);
    } finally {
      setSavingCopy(false);
    }
  };



     const handleEditShift = async (values) => {
     try {
              const { staffId, newShift } = values;
        
        // Xử lý trường hợp xóa nhân viên khỏi danh sách
        if (newShift === 'remove') {
          await handleRemoveStaff(staffId);
          return;
        }
        
        const shiftName = newShift === 'custom' ? values.customNewShift : newShift;
        const shiftTime = newShift === 'custom' ? values.customNewShiftTime : '';
        
        if (!shiftName) {
          message.error("❌ Vui lòng nhập tên ca mới!");
          return;
        }
        
        if (newShift === 'custom' && !shiftTime) {
          message.error("❌ Vui lòng nhập thời gian ca mới!");
          return;
        }

      const selectedUser = users.find(u => String(u._id) === String(staffId));
      if (!selectedUser) {
        message.error("❌ Không tìm thấy nhân viên được chọn!");
        return;
      }
      
             // Chuẩn hóa nhãn ca
       const toLabel = (name) => {
         if (name === 'Sáng') return 'Ca sáng';
         if (name === 'Chiều') return 'Ca chiều';
         if (name === 'Đêm') return 'Ca đêm';
         return name;
       };
       
       // Lấy thời gian ca tương ứng
       const getShiftTime = (name) => {
         if (name === 'Sáng') return '6h00-14h00';
         if (name === 'Chiều') return '14h00-22h00';
         if (name === 'Đêm') return '22h00-6h00';
         return shiftTime; // Sử dụng thời gian custom nếu có
       };
       
       const targetLabel = toLabel(shiftName);
       const shiftTimeValue = getShiftTime(shiftName);
       const deptName = selectedUser.group_name || 'Khác';

      // Cập nhật phanCa local
      const updatedPhanCa = { ...phanCa };
      
      // Xóa khỏi mọi ca hiện có
      Object.keys(updatedPhanCa).forEach(dept => {
        if (Array.isArray(updatedPhanCa[dept])) {
          updatedPhanCa[dept] = updatedPhanCa[dept].map(shift => ({
            ...shift,
            users: Array.isArray(shift.users) ? shift.users.filter(u => 
              String(u.userId?._id || u.userId) !== String(staffId)
            ) : []
          }));
        }
      });

      // Thêm vào ca mới của bộ phận hiện tại
      if (!updatedPhanCa[deptName]) {
        updatedPhanCa[deptName] = [];
      }
             let shiftObj = updatedPhanCa[deptName].find(s => s.label === targetLabel);
       if (!shiftObj) {
         shiftObj = { label: targetLabel, time: shiftTimeValue, users: [] };
         updatedPhanCa[deptName].push(shiftObj);
       } else {
         // Cập nhật thời gian nếu ca đã tồn tại
         shiftObj.time = shiftTimeValue;
       }
      if (!shiftObj.users.some(u => String(u.userId?._id || u.userId) === String(staffId))) {
        shiftObj.users.push({ userId: String(staffId) });
      }
      
      setPhanCa(updatedPhanCa);

      // Lưu vào backend nếu là tab bản sao
      if (isCopyTab && copyData?.copyId) {
        try {
          console.log("🔄 Đang gọi API để lưu thay đổi ca làm việc...");
          console.log("📤 Request data:", {
            copyId: copyData.copyId,
            month,
            year,
            scheduleData,
            phanCa: updatedPhanCa
          });
          
          const response = await apiService.updateScheduleCopy(copyData.copyId, {
            month,
            year,
            name: `Bản sao tháng ${month}/${year}`,
            scheduleData,
            phanCa: updatedPhanCa
          });
          
          console.log("📥 Response từ backend:", response);
          
          if (response && response.success) {
            console.log("✅ Đã lưu thay đổi ca làm việc vào backend");
            
            // Kiểm tra xem dữ liệu có thực sự được lưu không
            try {
              console.log("🔍 Đang kiểm tra dữ liệu đã lưu...");
              const verifyResponse = await apiService.getScheduleCopy(copyData.copyId);
              console.log("🔍 Dữ liệu đã lưu:", verifyResponse);
              
              if (verifyResponse && verifyResponse.success) {
                const savedData = verifyResponse.data;
                console.log("🔍 So sánh dữ liệu:");
                console.log("  - Dữ liệu gửi đi (scheduleData):", Object.keys(scheduleData).length, "users");
                console.log("  - Dữ liệu đã lưu (scheduleData):", savedData.scheduleData ? Object.keys(savedData.scheduleData).length : 0, "users");
                console.log("  - Dữ liệu gửi đi (phanCa):", Object.keys(updatedPhanCa).length, "departments");
                console.log("  - Dữ liệu đã lưu (phanCa):", savedData.phanCa ? Object.keys(savedData.phanCa).length : 0, "departments");
              }
            } catch (verifyErr) {
              console.error("❌ Không thể kiểm tra dữ liệu đã lưu:", verifyErr);
            }
          } else {
            console.error("❌ Lỗi khi lưu thay đổi ca làm việc vào backend:", response);
            // Fallback: Lưu vào localStorage để không mất dữ liệu
            const localKey = `copy_${copyData.copyId}_data`;
            localStorage.setItem(localKey, JSON.stringify({
              scheduleData,
              phanCa: updatedPhanCa,
              lastUpdated: new Date().toISOString()
            }));
            console.log("💾 Đã lưu dữ liệu vào localStorage làm backup");
          }
        } catch (err) {
          console.error("❌ Lỗi khi lưu thay đổi ca làm việc vào backend:", err);
          // Fallback: Lưu vào localStorage để không mất dữ liệu
          const localKey = `copy_${copyData.copyId}_data`;
          localStorage.setItem(localKey, JSON.stringify({
            scheduleData,
            phanCa: updatedPhanCa,
            lastUpdated: new Date().toISOString()
          }));
          console.log("💾 Đã lưu dữ liệu vào localStorage làm backup");
        }
      }

      message.success("✅ Đã cập nhật ca làm việc thành công!");
      setShowEditShiftModal(false);
      editShiftForm.resetFields();
    } catch (err) {
      console.error("❌ Lỗi khi cập nhật ca:", err);
      message.error("❌ Lỗi khi cập nhật ca: " + err.message);
    }
     };

   // Function xóa nhân viên khỏi danh sách
   const handleRemoveStaff = async (staffId) => {
     try {
       const selectedUser = users.find(u => String(u._id) === String(staffId));
       if (!selectedUser) {
         message.error("❌ Không tìm thấy nhân viên được chọn!");
         return;
       }

       console.log("🗑️ Bắt đầu xóa nhân viên:", selectedUser.username, "ID:", staffId);

       // Bước 1: Xóa nhân viên khỏi mọi ca hiện có
       const updatedPhanCa = { ...phanCa };
       let removedFromShifts = [];

       Object.keys(updatedPhanCa).forEach(dept => {
         if (Array.isArray(updatedPhanCa[dept])) {
           updatedPhanCa[dept] = updatedPhanCa[dept].map(shift => {
             // Kiểm tra xem nhân viên có trong ca này không
             const hasUser = shift.users && shift.users.some(u => 
               String(u.userId?._id || u.userId) === String(staffId)
             );

             if (hasUser) {
               // Xóa nhân viên khỏi ca
               const updatedUsers = shift.users.filter(u => 
                 String(u.userId?._id || u.userId) !== String(staffId)
               );
               
               removedFromShifts.push({
                 dept,
                 shiftLabel: shift.label,
                 shiftTime: shift.time
               });

               return {
                 ...shift,
                 users: updatedUsers
               };
             }
             return shift;
           });

           // Bước 2: Xóa các ca không còn nhân viên nào
           updatedPhanCa[dept] = updatedPhanCa[dept].filter(shift => 
             shift.users && shift.users.length > 0
           );
         }
       });

       // Bước 3: Xóa các bộ phận không còn ca nào
       Object.keys(updatedPhanCa).forEach(dept => {
         if (updatedPhanCa[dept].length === 0) {
           delete updatedPhanCa[dept];
         }
       });

       // Bước 4: Xóa dữ liệu schedule của nhân viên
       const updatedScheduleData = { ...scheduleData };
       delete updatedScheduleData[staffId];

       // Bước 5: Cập nhật state
       setPhanCa(updatedPhanCa);
       setScheduleData(updatedScheduleData);

       console.log("✅ Đã xóa nhân viên khỏi danh sách:", {
         removedFromShifts,
         remainingDepts: Object.keys(updatedPhanCa),
         remainingUsers: Object.keys(updatedScheduleData).length
       });

       // Bước 6: Lưu vào backend nếu là tab bản sao
       if (isCopyTab && copyData?.copyId) {
         try {
           console.log("🔄 Đang lưu thay đổi xóa nhân viên vào backend...");
           
           const response = await apiService.updateScheduleCopy(copyData.copyId, {
             month,
             year,
             name: `Bản sao tháng ${month}/${year}`,
             scheduleData: updatedScheduleData,
             phanCa: updatedPhanCa
           });
           
           if (response && response.success) {
             console.log("✅ Đã lưu thay đổi xóa nhân viên vào backend");
             message.success(`✅ Đã xóa nhân viên "${selectedUser.username}" khỏi danh sách thành công!`);
           } else {
             console.error("❌ Lỗi khi lưu thay đổi xóa nhân viên vào backend:", response);
             message.warning("⚠️ Đã xóa nhân viên khỏi danh sách nhưng không thể lưu vào backend. Dữ liệu sẽ được lưu vào localStorage.");
             
             // Fallback: Lưu vào localStorage
             const localKey = `copy_${copyData.copyId}_data`;
             localStorage.setItem(localKey, JSON.stringify({
               scheduleData: updatedScheduleData,
               phanCa: updatedPhanCa,
               lastUpdated: new Date().toISOString()
             }));
           }
         } catch (err) {
           console.error("❌ Lỗi khi lưu thay đổi xóa nhân viên vào backend:", err);
           message.warning("⚠️ Đã xóa nhân viên khỏi danh sách nhưng không thể lưu vào backend. Dữ liệu sẽ được lưu vào localStorage.");
           
           // Fallback: Lưu vào localStorage
           const localKey = `copy_${copyData.copyId}_data`;
           localStorage.setItem(localKey, JSON.stringify({
             scheduleData: updatedScheduleData,
             phanCa: updatedPhanCa,
             lastUpdated: new Date().toISOString()
           }));
         }
       } else {
         message.success(`✅ Đã xóa nhân viên "${selectedUser.username}" khỏi danh sách thành công!`);
       }

       // Đóng modal và reset form
       setShowEditShiftModal(false);
       editShiftForm.resetFields();

     } catch (err) {
       console.error("❌ Lỗi khi xóa nhân viên:", err);
       message.error("❌ Lỗi khi xóa nhân viên: " + err.message);
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

                        // Function xuất dữ liệu ra file Excel sử dụng exceljs
       const handleExportToExcel = async () => {
         try {
           if (!staffsByCa || staffsByCa.length === 0) {
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
           staffsByCa.forEach((staff, idx) => {
             const row = ws.addRow([
               idx + 1,
               shouldShowCell('ca', idx) ? `${staff.ca}\n${staff.caTime}` : '',
               shouldShowCell('department', idx) ? staff.department : '',
               staff.name,
               ...Array.from({ length: daysInMonth }, (_, d) => (scheduleData[staff.id]?.[d + 1] || ''))
             ]);

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
               const cell = row.getCell(4 + d);
               cell.alignment = { horizontal: 'center', vertical: 'middle' };
               if (status && STATUS_COLORS[status]) {
                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(STATUS_COLORS[status]) } };
                 cell.font = { color: { argb: (status === 'VP' || status === 'QL') ? 'FF000000' : 'FFFFFFFF' }, bold: true };
               } else {
                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                 cell.font = { color: { argb: 'FF222222' } };
               }
             }
           });

           // Merge cột B (ca) & C (bộ phận)
           let curCa = '', caStart = 3 + 1; // data bắt đầu ở hàng 4
           staffsByCa.forEach((s, i) => {
             if (s.ca !== curCa) {
               if (i > 0) ws.mergeCells(caStart, 2, 3 + i, 2);
               curCa = s.ca; caStart = 4 + i;
             }
           });
           if (staffsByCa.length) ws.mergeCells(caStart, 2, 3 + staffsByCa.length, 2);

           let curDept = '', curDeptCa = '', deptStart = 4;
           staffsByCa.forEach((s, i) => {
             const key = `${s.department}-${s.ca}`;
             if (key !== `${curDept}-${curDeptCa}`) {
               if (i > 0) ws.mergeCells(deptStart, 3, 3 + i, 3);
               curDept = s.department; curDeptCa = s.ca; deptStart = 4 + i;
             }
           });
           if (staffsByCa.length) ws.mergeCells(deptStart, 3, 3 + staffsByCa.length, 3);

           // Áp dụng viền và căn giữa cho tất cả các ô
           const headerRowIndex = 3;
           const firstDataRow = 4;
           const lastDataRow = 3 + staffsByCa.length;
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



   const fetchData = async () => {
    try {
      setLoading(true);

      console.log("=== FETCHING DATA FOR MONTH", month, "YEAR", year, "===", new Date().toLocaleTimeString());

      // Gọi song song 2 API để tăng tốc độ
      const [usersRes, monthlySchedulesRes] = await Promise.all([
        apiService.getAllUsers(),
        apiService.getSchedulesByMonth(month, year)
      ]);
      const usersArr = Array.isArray(usersRes) ? usersRes : (usersRes?.data || []);
      
      // Ensure users is always an array
      const safeUsersArr = Array.isArray(usersArr) ? usersArr : [];
      console.log("users count:", safeUsersArr.length);
      console.log("🔍 Users API response type:", typeof usersRes, "Final array:", Array.isArray(safeUsersArr));

      // Xử lý users data
      setUsers(safeUsersArr);
      if (safeUsersArr.length === 0) {
        console.log("❌ Users API returned empty or invalid:", usersRes);
      } else {
        console.log("✅ Loaded users data:", usersArr.length, "users");
      }

      console.log("Raw monthly schedules response:", monthlySchedulesRes);

      if (monthlySchedulesRes && monthlySchedulesRes.success && monthlySchedulesRes.data) {
        const scheduleData = {};
        monthlySchedulesRes.data.forEach(schedule => {
          scheduleData[schedule.group] = schedule.shifts || [];
        });
        console.log("✅ Processed monthly schedule data:", Object.keys(scheduleData).length, "groups");
        setPhanCa(scheduleData);
      } else {
        console.log("❌ Monthly schedules response is invalid or empty:", monthlySchedulesRes);
        setPhanCa({});
      }

      // Khởi tạo scheduleData chỉ cho users hợp lệ trong shifts
      const data = {};
      if (monthlySchedulesRes && monthlySchedulesRes.success && monthlySchedulesRes.data) {
        monthlySchedulesRes.data.forEach(schedule => {
          schedule.shifts?.forEach(shift => {
            shift.users?.forEach(user => {
              // Kiểm tra user có hợp lệ không
              if (!user || !user.userId) {
                console.log(`⚠️ User object không hợp lệ trong scheduleData, bỏ qua:`, user);
                return;
              }

              const userId = user.userId;
              const hasPopulatedData = userId && typeof userId === 'object' && userId.username;
              const existsInUsers = usersRes.find(u => String(u._id) === String(userId));
              
              if (hasPopulatedData || existsInUsers) {
                data[userId] = {};
              }
            });
          });
        });
      }

      // Load trạng thái đã lưu từ backend
      try {
        const dailyStatusRes = await apiService.getDailyStatus(month, year);
        if (dailyStatusRes && dailyStatusRes.success && dailyStatusRes.data) {
          // Merge dữ liệu đã lưu vào data
          Object.keys(dailyStatusRes.data).forEach(userId => {
            if (data[userId]) {
              // Convert Map to object
              const dailyStatus = dailyStatusRes.data[userId];
              if (dailyStatus instanceof Map) {
                dailyStatus.forEach((value, key) => {
                  data[userId][key] = value;
                });
              } else if (typeof dailyStatus === 'object') {
                Object.assign(data[userId], dailyStatus);
              }
            }
          });
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải trạng thái đã lưu:", err);
      }

      setScheduleData(data);

    } catch (err) {
      console.error("❌ Lỗi khi tải dữ liệu:", err);
      setPhanCa({});
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (staffId, day, value) => {
    try {
      // Cập nhật UI ngay lập tức
      setScheduleData(prev => ({
        ...prev,
        [staffId]: { ...prev[staffId], [day]: value }
      }));

      // Nếu là tab bản sao, lưu vào copyData local (không gọi API)
      if (isCopyTab) {
        console.log(`✅ Đã cập nhật trạng thái cho tab bản sao: ${staffId} - ngày ${day} - ${value}`);
        // Có thể lưu vào localStorage hoặc state để giữ dữ liệu khi chuyển tab
        return;
      }

      // Nếu là tab Demo gốc, lưu vào backend như cũ
      const response = await apiService.updateSingleDayStatus(staffId, day, month, year, value);
      if (response && response.success) {
        console.log(`✅ Đã lưu trạng thái: ${staffId} - ngày ${day} - ${value}`);
      } else {
        console.error(`❌ Lỗi khi lưu trạng thái:`, response);
      }
    } catch (err) {
      console.error(`❌ Lỗi khi lưu trạng thái:`, err);
      // Revert UI nếu lưu thất bại
      setScheduleData(prev => ({
        ...prev,
        [staffId]: { ...prev[staffId], [day]: prev[staffId]?.[day] || "" }
      }));
    }
  };

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
        const shiftLabel = shift.label || "Ca làm việc";
        const shiftTime = shift.time || "";
        const usersInShift = shift.users || [];

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

      // Nếu cùng tên ca, sắp xếp theo bộ phận với "Tổ trưởng" ở cuối
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
      // Tính rowspan cho cột ca - merge theo tên ca (Ca sáng, Ca chiều, Ca đêm)
      let caRowspan = 1;
      for (let i = index + 1; i < staffsByCa.length; i++) {
        if (staffsByCa[i].ca === staff.ca) {
          caRowspan++;
        } else {
          break;
        }
      }
      rowspans.ca.push(caRowspan);

      // Tính rowspan cho cột department - merge khi cùng bộ phận + cùng tên ca
      let deptRowspan = 1;
      for (let i = index + 1; i < staffsByCa.length; i++) {
        if (staffsByCa[i].department === staff.department &&
          staffsByCa[i].ca === staff.ca) {
          deptRowspan++;
        } else {
          break;
        }
      }
      rowspans.department.push(deptRowspan);
    });

    return rowspans;
  };

  // Kiểm tra xem có nên hiển thị cell hay không
  const shouldShowCell = (type, index) => {
    if (index === 0) return true;

    if (type === 'ca') {
      return staffsByCa[index].ca !== staffsByCa[index - 1].ca;
    }

    if (type === 'department') {
      return staffsByCa[index].department !== staffsByCa[index - 1].department ||
        staffsByCa[index].ca !== staffsByCa[index - 1].ca;
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

  // Tính toán rowspans
  const rowspans = useMemo(() => {
    if (staffsByCa.length > 0) {
      return calculateRowspans();
    }
    return { ca: [], department: [] };
  }, [staffsByCa]);

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
      <div className="header-controls">
        <div className="date-controls">
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
          <span className="days-count">
            Số ngày: {daysInMonth}
          </span>
          {!isCopyTab && (
            <button
              onClick={handleCreateCopy}
              disabled={creatingCopy}
              className="create-copy-button"
            >
              {creatingCopy ? "Đang tạo bản sao..." : "Tạo bản sao"}
            </button>
          )}
                     {isCopyTab && (
             <button
               onClick={() => setShowEditShiftModal(true)}
               className="edit-shift-button"
               style={{ marginRight: '8px' }}
             >
               ✏️ Chỉnh sửa ca
             </button>
           )}
                       {isCopyTab && (
              <button
                onClick={handleSaveCopy}
                disabled={savingCopy}
                className="save-copy-button"
                style={{ marginRight: '8px' }}
              >
                {savingCopy ? "Đang lưu bản sao..." : "Lưu bản sao"}
              </button>
            )}
            {isCopyTab && (
              <button
                onClick={handleExportToExcel}
                className="export-excel-button"
                style={{ 
                  marginRight: '8px',
                  backgroundColor: '#52c41a',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                                 title="Xuất dữ liệu ra file Excel (.xlsx)"
               >
                ┌( ಠ_ಠ)┘ Xuất Excel
               </button>
            )}
           {isCopyTab && (
             <button
               onClick={() => {
                 if (window.confirm("Bạn có chắc chắn muốn xóa tất cả không? Dữ liệu sẽ không thể khôi phục")) {
                   handleDeleteCopy();
                 }
               }}
               className="delete-copy-button"
               title="Xóa bản sao"
             >
               🗑️ Xóa bản sao
             </button>
           )}
        </div>
      </div>

             

      

      

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
            {staffsByCa.length > 0 ? (
              staffsByCa.map((staff, idx) => (
                <tr key={staff.id}>
                  <td className="col-stt">{idx + 1}</td>
                  {shouldShowCell('ca', idx) && (
                    <td className="col-time" rowSpan={rowspans.ca[idx]}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1976d2' }}>{staff.ca}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{staff.caTime}</div>
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
                    return (
                      <td key={i + 1} className="col-day" style={{ background: bg, color }}>
                                                         <select
                                   value={value}
                                   onChange={e => handleStatusChange(staff.id, i + 1, e.target.value)}
                                   style={{ background: bg, color, border: "none", width: "100%", textAlign: "center", fontWeight: 600 }}
                                   className="status-select"
                                 >
                                   {STATUS_OPTIONS.map(opt => (
                                     <option key={opt} value={opt}>{opt}</option>
                                   ))}
                                 </select>
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4 + daysInMonth} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  {isCopyTab ? (
                    "Đây là tab bản sao. Dữ liệu được hiển thị từ bản sao đã lưu."
                  ) : (
                    "Không có dữ liệu nhân sự được phân ca. Vui lòng kiểm tra tab \"DEMO Nhân sự\" để phân ca trước."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>


        

      {/* Modal chỉnh sửa ca */}
      <Modal
        title="Chỉnh sửa ca làm việc"
        open={showEditShiftModal}
        onCancel={() => setShowEditShiftModal(false)}
        footer={null}
        width={500}
      >
        <Form form={editShiftForm} layout="vertical" onFinish={handleEditShift}>
                     <Form.Item name="staffId" label="Chọn nhân viên" rules={[{ required: true, message: 'Vui lòng chọn nhân viên!' }]}>
             <Select 
               placeholder="Chọn nhân viên"
               optionFilterProp="label"
               showSearch
               onChange={(value) => {
                 const selectedUser = users.find(u => String(u._id) === String(value));
                 if (selectedUser) {
                   // Tìm ca hiện tại của nhân viên này
                   let currentShift = '';
                   Object.keys(phanCa).forEach(dept => {
                     if (Array.isArray(phanCa[dept])) {
                       phanCa[dept].forEach(shift => {
                         if (Array.isArray(shift.users) && shift.users.some(u => 
                           String(u.userId?._id || u.userId) === String(value)
                         )) {
                           currentShift = shift.label;
                         }
                       });
                     }
                   });
                   
                   // Hiển thị ca hiện tại
                   if (currentShift) {
                     editShiftForm.setFieldsValue({
                       currentShiftDisplay: `${selectedUser.username}: ${currentShift}`
                     });
                   } else {
                     editShiftForm.setFieldsValue({
                       currentShiftDisplay: `${selectedUser.username} chưa được phân ca`
                     });
                   }
                 }
               }}
             >
               {users.map(user => (
                 <Select.Option 
                   key={String(user._id)} 
                   value={String(user._id)}
                   label={`${user.username} - ${user.group_name || 'Chưa có bộ phận'}`}
                 >
                   {user.username} - {user.group_name || 'Chưa có bộ phận'}
                 </Select.Option>
               ))}
             </Select>
           </Form.Item>
                     <Form.Item name="currentShiftDisplay" label="Ca hiện tại">
             <Input 
               placeholder="Ca hiện tại sẽ hiển thị sau khi chọn nhân viên" 
               disabled 
               style={{ backgroundColor: '#f5f5f5' }}
             />
           </Form.Item>
                                           <Form.Item name="newShift" label="Ca mới" rules={[{ required: true, message: 'Vui lòng chọn ca mới!' }]}>
              <Select placeholder="Chọn ca mới">
                <Select.Option value="Sáng">Sáng (6h-14h)</Select.Option>
                <Select.Option value="Chiều">Chiều (14h-22h)</Select.Option>
                <Select.Option value="Đêm">Đêm (22h-6h)</Select.Option>
                <Select.Option value="custom">+ Thêm ca mới</Select.Option>
                <Select.Option value="remove">🗑️ Xóa khỏi danh sách</Select.Option>
              </Select>
            </Form.Item>
                       <Form.Item 
              noStyle 
              shouldUpdate={(prevValues, currentValues) => prevValues.newShift !== currentValues.newShift}
            >
              {({ getFieldValue }) => {
                const newShift = getFieldValue('newShift');
                if (newShift === 'custom') {
                  return (
                    <>
                      <Form.Item name="customNewShift" label="Tên ca mới" rules={[{ required: true, message: 'Vui lòng nhập tên ca mới!' }]}>
                        <Input placeholder="Nhập tên ca mới (VD: Ca đặc biệt)" />
                      </Form.Item>
                      <Form.Item name="customNewShiftTime" label="Thời gian ca mới" rules={[{ required: true, message: 'Vui lòng nhập thời gian ca mới!' }]}>
                        <Input placeholder="VD: 8h00-17h00" />
                      </Form.Item>
                    </>
                  );
                } else if (newShift === 'remove') {
                  return (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#fff2e8', 
                      border: '1px solid #ffbb96', 
                      borderRadius: '6px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ color: '#d4380d', fontWeight: 600, marginBottom: '8px' }}>
                        ⚠️ Cảnh báo: Xóa nhân viên
                      </div>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        Khi bạn chọn "Xóa khỏi danh sách", nhân viên sẽ bị xóa khỏi ca hiện tại. 
                        Nếu ca đó không còn ai, nó sẽ tự động bị xóa luôn.
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            </Form.Item>
                     <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
             <Button type="default" onClick={() => setShowEditShiftModal(false)} style={{ marginRight: 8 }}>Hủy</Button>
             <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.newShift !== currentValues.newShift}>
               {({ getFieldValue }) => {
                 const newShift = getFieldValue('newShift');
                 if (newShift === 'remove') {
                   return (
                     <Button 
                       type="primary" 
                       htmlType="submit" 
                       danger
                       style={{ backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }}
                     >
                       🗑️ Xóa nhân viên
                     </Button>
                   );
                 }
                 return (
                   <Button 
                     type="primary" 
                     htmlType="submit" 
                     style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                   >
                     Cập nhật ca
                   </Button>
                 );
               }}
             </Form.Item>
           </Form.Item>
        </Form>
      </Modal>
    </div>
  );
} 