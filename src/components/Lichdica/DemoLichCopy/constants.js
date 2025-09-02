// CSS cho tooltip ghi chú và modal thống kê
export const noteTooltipStyles = `
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

export const STATUS_COLORS = {
  OFF: "#174ea6", // xanh đậm
  "1/2": "#8e24aa", // tím
  "1": "#6a8caf", // xanh nhạt cho 1 ngày
  VP: "#ffe066", // vàng
  X: "#e53935", // đỏ
  QL: "#ffd600", // vàng đậm
  KL: "#7c43bd", // tím khác
};

// Thứ tự hiển thị theo yêu cầu: OFF, 1/2, 1, VP, X, QL, KL
export const STATUS_OPTIONS = ["", "OFF", "1/2", "1", "VP", "X", "QL", "KL"];

// 3 ca chính
export const CA_CHINH = [
  { label: "Ca sáng", time: "07h20-18h20", keywords: ["sáng", "sang", "morning"] },
  { label: "Ca chiều", time: "17h00-04h00", keywords: ["chiều", "chieu", "afternoon"] },
  { label: "Ca đêm", time: "21h00-08h00", keywords: ["đêm", "dem", "night"] }
];

// Cấu trúc GROUPS từ DemoNhanSu.js
export const GROUPS = [
  { label: "CSKH", value: "CSKH", subs: ["CSKH", "CSOL", "CSDL", "Truyền thông"], color: "#12B3D6" },
  { label: "FK", value: "FK", subs: ["FK", "FK-X"], color: "#f59e42" },
  { label: "XNK", value: "XNK", subs: ["XNK"], color: "#43A047" },
  { label: "Tổ trưởng", value: "TOTRUONG", subs: ["TT"], color: "#8B5CF6" }
];

export function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}
