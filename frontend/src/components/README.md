# Components Documentation

## DemoLichDiCa

Component chính để hiển thị và quản lý lịch đi ca. Chỉ ADMIN mới có thể thao tác.

**Props:**
- `tabId`: ID của tab

**Chức năng:**
- Hiển thị lịch đi ca theo tháng/năm
- Cho phép chỉnh sửa trạng thái từng ngày
- Tạo bản sao lịch đi ca
- Chỉ ADMIN mới thấy nút "Tạo bản sao"

## DemoLichCopy

Component để hiển thị bản sao lịch đi ca. Nhân viên chỉ có thể xem, không thể chỉnh sửa.

**Props:**
- `tabId`: ID của tab
- `copyData`: Dữ liệu bản sao

**Chức năng:**
- Hiển thị bản sao lịch đi ca (chỉ đọc)
- Xuất Excel (nếu có quyền)
- Lưu bản sao (chỉ ADMIN)

## Cách sử dụng

```jsx
// Tab gốc (chỉ ADMIN thao tác)
<DemoLichDiCa tabId="demo-tab" />

// Tab bản sao (nhân viên chỉ xem)
<DemoLichCopy 
  tabId="copy-tab" 
  copyData={{ copyId: "123", month: 8, year: 2025 }} 
/>

// Hoặc sử dụng wrapper component
<DemoLichDiCaWrapper 
  tabId="tab-id"
  isCopyTab={true}
  copyData={{ copyId: "123" }}
/>
```

## Phân quyền

- **ADMIN**: Có thể thao tác tất cả chức năng
- **Nhân viên**: Chỉ có thể xem bản sao, không thể chỉnh sửa
- **DemoLichDiCa**: Chỉ ADMIN thấy và thao tác
- **DemoLichCopy**: Nhân viên chỉ xem, ADMIN có thể lưu/xuất Excel

