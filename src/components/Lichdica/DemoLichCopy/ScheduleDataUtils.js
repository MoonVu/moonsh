import React from "react";

export default function ScheduleDataUtils() {
  // Tạo danh sách nhân viên theo ca từ dữ liệu đã được join
  const getStaffsByCa = (phanCa, users) => {
    const staffsByCa = [];

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
  const calculateRowspans = (staffsByCa) => {
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
  const shouldShowCell = (type, index, staffsByCa) => {
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

  return {
    getStaffsByCa,
    calculateRowspans,
    shouldShowCell
  };
}
