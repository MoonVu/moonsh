import React from "react";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { message } from 'antd';
import { STATUS_COLORS } from './constants';

export default function ExcelExportUtils() {
  // Helper functions để làm đẹp Excel
  // kẻ viền mảnh cho một vùng ô
  const applyThinBorders = (ws, r1, r2, c1, c2, argb='FF000000') => {
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
  };

  // canh giữa cho một vùng ô
  const centerAlign = (ws, r1, r2, c1, c2) => {
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cell = ws.getCell(r, c);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: !!cell.alignment?.wrapText };
      }
    }
  };

  const handleExportToExcel = async (filteredStaffsByCa, daysInMonth, month, year, scheduleData, notesData) => {
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
          `${staff.ca}\n${staff.caTime}`,
          staff.department,
          staff.name,
          ...Array.from({ length: daysInMonth }, (_, d) => {
            const status = scheduleData[staff.id]?.[d + 1] || '';
            return status;
          })
        ]);

        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
        const c = row.getCell(2);
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        c.alignment = { vertical: 'middle', wrapText: true };
        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE1D5E7' } };
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

  return {
    handleExportToExcel,
    applyThinBorders,
    centerAlign
  };
}
