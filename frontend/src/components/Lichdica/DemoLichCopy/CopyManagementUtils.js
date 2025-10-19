import React from "react";
import apiService from "../../../services/api";
import { message } from 'antd';

export default function CopyManagementUtils() {
  // Function lưu bản sao
  const handleSaveCopy = async (copyData, month, year, scheduleData, phanCa, notesData, setSavingCopy) => {
    try {
      setSavingCopy(true);
      
      if (!copyData || !copyData.copyId) {
        message.error("❌ Không tìm thấy ID bản sao để lưu");
        return;
      }
      
      const copyName = `Bản sao tháng ${month}/${year}`;
      
      // Kiểm tra backend trước
      try {
        const healthCheck = await fetch(process.env.REACT_APP_API_URL+'/api/health');
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

  // Function xóa bản sao
  const handleDeleteCopy = async (copyData, tabId, setScheduleData, setPhanCa, setUsers, setMonth, setYear, today) => {
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

  // Function kiểm tra và dọn dẹp bản sao zombie
  const checkAndCleanupZombieCopy = async (copyData) => {
    if (!copyData?.copyId) return;
    
    try {
      console.log("🔍 Kiểm tra bản sao zombie...");
      const response = await apiService.getScheduleCopy(copyData.copyId);
      
      if (!response || !response.success) {
        console.warn("⚠️ Phát hiện bản sao zombie, hiển thị cảnh báo");
        message.warning("⚠️ Bản sao này không tồn tại trên backend. Có thể đã bị xóa hoặc có lỗi kết nối.");
        
        // Hiển thị nút xóa nhanh
        if (window.confirm("Bản sao này không tồn tại trên backend. Bạn có muốn xóa tab này không?")) {
          await handleDeleteTabOnly(copyData);
        }
      }
    } catch (err) {
      console.warn("⚠️ Không thể kiểm tra bản sao zombie:", err);
    }
  };

  // Function xóa chỉ tab local (fallback)
  const handleDeleteTabOnly = async (copyData) => {
    try {
      // Xóa dữ liệu khỏi localStorage nếu có
      if (copyData?.copyId) {
        const localKey = `copy_${copyData.copyId}_data`;
        localStorage.removeItem(localKey);
        console.log("✅ Đã xóa dữ liệu khỏi localStorage");
      }
      
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

  return {
    handleSaveCopy,
    handleDeleteCopy,
    checkAndCleanupZombieCopy,
    handleDeleteTabOnly
  };
}
