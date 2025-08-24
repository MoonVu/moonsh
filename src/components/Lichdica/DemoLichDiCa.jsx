import React, { useState, useEffect, useMemo } from "react";
import "../../BangDuLieu.css";
import apiService from "../../services/api";
import { useSchedule } from "../../contexts/ScheduleContext";

import { useAuth } from "../../hooks/useAuth";
import { ShowForPermission as AccessControl } from "../auth/AccessControl";

// CSS để bỏ vạch ▼ và làm ô trống trơn
const cleanSelectStyles = `
  .status-select {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
    background-image: none !important;
    background: transparent !important;
  }
  
  .status-select::-ms-expand {
    display: none !important;
  }
  
  .col-day {
    position: relative;
    padding: 0 !important;
  }
  
  .col-day select {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }
  

`;

const STATUS_COLORS = {
  OFF: "#174ea6", // xanh đậm
  "1/2": "#8e24aa", // tím
  VP: "#ffe066", // vàng
  QL: "#ffd600", // vàng đậm
  X: "#e53935", // đỏ
  KL: "#7c43bd", // tím khác
};
const STATUS_OPTIONS = ["", "OFF", "1/2", "VP", "QL", "X", "KL"];

function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

export default function DemoLichDiCa({ tabId }) {
  const { refreshSchedulesCounter } = useSchedule();
  const { hasPermission, hasRole, isAdmin } = useAuth();
  
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const daysInMonth = getDaysInMonth(month, year);
  
  // Dữ liệu phân ca từ DemoNhanSu theo tháng
  const [phanCa, setPhanCa] = useState({});
  const [loading, setLoading] = useState(false);
  const [creatingCopy, setCreatingCopy] = useState(false);


  // Dữ liệu users để map thông tin
  const [users, setUsers] = useState([]);

  // scheduleData[staffId][day] = trạng thái
  const [scheduleData, setScheduleData] = useState({});

  // Load dữ liệu khi component mount
  useEffect(() => {
    fetchData();
  }, []); // Chỉ chạy một lần khi component mount

  // useEffect để theo dõi thay đổi tháng/năm và tự động load dữ liệu mới
  useEffect(() => {
    console.log("🔄 useEffect [month, year] triggered:", { month, year });
    fetchData();
  }, [month, year]); // Tự động refetch khi tháng hoặc năm thay đổi

  // useEffect riêng để xử lý refresh từ context
  useEffect(() => {
    console.log("🔄 useEffect [refreshSchedulesCounter] triggered:", { refreshSchedulesCounter });
    if (refreshSchedulesCounter > 0) {
      fetchData();
    }
  }, [refreshSchedulesCounter]); // Chỉ refetch khi refreshSchedulesCounter thay đổi

  // Thêm function refreshSchedules vào window để có thể gọi từ bên ngoài
  useEffect(() => {
    window.refreshSchedules = () => {
      console.log("🔄 Triggering refresh from window.refreshSchedules");
      fetchData();
    };
    
    return () => {
      delete window.refreshSchedules;
    };
  }, []);




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
        phanCa,
        notesData: {} // Thêm notesData rỗng khi tạo bản sao mới
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
              phanCa: phanCa,
              notesData: {} // Thêm notesData rỗng
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

      // Load dữ liệu đã lưu từ API demo-lichdica có sẵn
      // Tự động load dữ liệu khi chọn tháng khác
      try {
        const dailyStatusRes = await apiService.getDailyStatus(month, year);
        if (dailyStatusRes && dailyStatusRes.success && dailyStatusRes.data) {
          console.log("✅ Load dữ liệu từ API demo-lichdica:", dailyStatusRes.data);
          
          // Merge dữ liệu từ API demo-lichdica vào data hiện tại
          Object.keys(dailyStatusRes.data).forEach(userId => {
            if (data[userId]) {
              Object.assign(data[userId], dailyStatusRes.data[userId]);
            } else {
              // Nếu user chưa có trong data, tạo mới
              data[userId] = dailyStatusRes.data[userId];
            }
          });
          
          const loadedStaffCount = Object.keys(dailyStatusRes.data).length;
          const loadedDataSize = JSON.stringify(dailyStatusRes.data).length;
          
          console.log("📥 Dữ liệu đã load:", {
            staffCount: loadedStaffCount,
            dataSize: `${(loadedDataSize / 1024).toFixed(1)} KB`
          });
        }
      } catch (err) {
        console.log("ℹ️ Chưa có dữ liệu đã lưu cho tháng này");
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

      // Lưu vào backend
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
      {/* CSS để bỏ vạch ▼ và làm ô trống trơn */}
      <style>{cleanSelectStyles}</style>
      
      {/* Thông báo về quyền truy cập - Tab Demo gốc chỉ ADMIN */}
      <div style={{ 
        padding: '10px 15px', 
        marginBottom: '15px',
        backgroundColor: '#f6ffed',
        border: '1px solid #b7eb8f',
        borderRadius: '6px',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔑</span>
          <span>
          Hãy làm việc 1 cách khách quan. Không quan liêu, thiên vị bất cứ ai.
          </span>
        </div>
      </div>
      
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

          <AccessControl 
            resource="schedules" 
            action="edit"
            fallback={null}
          >
            <button
              onClick={handleCreateCopy}
              disabled={creatingCopy}
              className="create-copy-button"
              style={{ marginRight: '8px' }}
            >
              {creatingCopy ? "Đang tạo bản sao..." : "Tạo bản sao"}
            </button>
            


          </AccessControl>
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
                          style={{ 
                            background: bg, 
                            color, 
                            border: "none", 
                            width: "100%", 
                            height: "100%",
                            textAlign: "center", 
                            fontWeight: 600,
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            cursor: "pointer",
                            padding: "4px",
                            outline: "none",
                            boxShadow: "none"
                          }}
                          className="status-select"
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt} style={{ background: bg, color: color }}>
                              {opt}
                            </option>
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
                  Không có dữ liệu nhân sự được phân ca. Vui lòng kiểm tra tab "DEMO Nhân sự" để phân ca trước.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
