# Chức Năng Phê Duyệt Request và Cập Nhật Lịch Đi Ca

## Tổng Quan

Khi admin phê duyệt một request từ trạng thái "Chờ duyệt" (pending) sang "Duyệt" (approved), hệ thống sẽ tự động cập nhật dữ liệu vào collection `schedulecopies` theo đúng ID và ngày/tháng của request đó.

**🔄 Tự động lưu:** DemoLichCopy giờ hoạt động giống DemoLichDiCa - tự động gửi API về backend mỗi khi có thay đổi, không cần bấm nút "Lưu bản sao".

**✅ Hỗ trợ đầy đủ:** Hiện tại hỗ trợ 3 loại request chính: `monthly_off`, `half_day_off`, và `annual_leave` với logic xử lý đặc biệt.

## Cách Hoạt Động

### 1. Luồng Xử Lý

```
User tạo request → Admin phê duyệt → Hệ thống tự động cập nhật DemoLichDiCa
```

### 2. Mapping Request Type sang Status

| Loại Request | Status trong DemoLichDiCa | Mô tả | Trạng thái |
|--------------|---------------------------|-------|------------|
| `monthly_off` | `OFF` | Nghỉ OFF | ✅ Đã hỗ trợ |
| `half_day_off` | `1/2` | Nghỉ nửa ngày | ✅ Đã hỗ trợ |
| `annual_leave` | `VP` + `X` + `QL` | Về phép (logic đặc biệt) | ✅ Đã hỗ trợ |
| `overtime_day` | `QL` | Tăng ca | ⏳ Sẽ thêm sau |
| `overtime_hours` | `QL` | Tăng ca theo giờ | ⏳ Sẽ thêm sau |

### 3. Cập Nhật Dữ Liệu

- **Tìm tất cả bản sao**: Hệ thống sẽ tìm tất cả document `ScheduleCopy` theo `month`, `year`
- **Cập nhật scheduleData**: Cập nhật trạng thái cho từng ngày trong khoảng thời gian của request
- **Xử lý nhiều ngày**: Nếu request có `from_date` và `to_date` khác nhau, sẽ cập nhật tất cả các ngày trong khoảng
- **Cập nhật tất cả bản sao**: Mỗi khi phê duyệt request, tất cả bản sao trong tháng/năm đó sẽ được cập nhật

### 4. Logic Xử Lý Đặc Biệt cho Annual Leave

**`annual_leave`** có logic xử lý đặc biệt:
- **Ngày đầu tiên**: `VP` (Về phép)
- **17 ngày tiếp theo**: `X` (Nghỉ)
- **Từ ngày thứ 18 trở đi**: `QL` (Tăng ca)

**Ví dụ**: Nghỉ phép từ 1/8 đến 20/8 (20 ngày)
- Ngày 1/8: `VP`
- Ngày 2/8 đến 17/8: `X` (16 ngày)
- Ngày 18/8 đến 20/8: `QL` (3 ngày)

### 5. Tính Năng Tự Động Lưu

**DemoLichCopy** giờ hoạt động giống **DemoLichDiCa**:

- **Thay đổi trạng thái**: Tự động gửi API `updateScheduleCopy` mỗi khi thay đổi `OFF`, `1/2`, `VP`, `X`, `QL`
- **Thay đổi ghi chú**: Tự động lưu khi thêm/sửa/xóa ghi chú
- **Thay đổi ca nhân viên**: Tự động lưu khi thay đổi ca làm việc
- **Không cần nút "Lưu bản sao"**: Tất cả thay đổi được lưu tự động

**Console Log sẽ hiển thị:**
```
🔄 Tự động lưu thay đổi trạng thái: { staffId: "123", day: 15, newValue: "OFF" }
✅ Đã tự động lưu thay đổi trạng thái thành công
```

## Cấu Trúc Code

### Backend Service

File: `backend/services/requestService.js`

```javascript
// Function mới được thêm vào
async updateDemoLichDiCaFromRequest(request) {
  // Logic cập nhật DemoLichDiCa
}
```

### API Endpoint

```
PUT /api/requests/:id/status
```

**Request Body:**
```json
{
  "status": "approved",
  "note": "Ghi chú của admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật trạng thái thành công",
  "data": {
    "_id": "request_id",
    "status": "approved",
    "processed_by": "admin_id",
    "processed_at": "2025-08-29T10:37:29.254Z"
  }
}
```

## Ví Dụ Sử Dụng

### 1. Phê Duyệt Request qua Admin Dashboard

```javascript
// Trong AdminDashboard.jsx
const handleApprove = async (requestId, adminNote) => {
  try {
    const response = await apiService.updateRequestStatus(requestId, 'approved', adminNote);
    if (response.success) {
      message.success('Đã phê duyệt yêu cầu thành công!');
      // Hệ thống sẽ tự động cập nhật DemoLichDiCa
    }
  } catch (error) {
    console.error('Lỗi khi phê duyệt:', error);
  }
};
```

### 2. Kiểm Tra Kết Quả

Sau khi phê duyệt, kiểm tra collection `schedulecopies`:

```javascript
// MongoDB query
db.schedulecopies.findOne({
  month: 8,
  year: 2025
})

// Kết quả cho monthly_off
{
  "_id": ObjectId("..."),
  "name": "Bản sao tháng 8/2025",
  "month": 8,
  "year": 2025,
  "scheduleData": {
    "68acd255a3fb706794c533a2": {
      "15": "OFF",  // Ngày 15/8: OFF
      "16": "OFF",  // Ngày 16/8: OFF
      "17": "OFF"   // Ngày 17/8: OFF
    }
  }
}

// Kết quả cho annual_leave (1/8 đến 20/8)
{
  "_id": ObjectId("..."),
  "name": "Bản sao tháng 8/2025",
  "month": 8,
  "year": 2025,
  "scheduleData": {
    "68acd255a3fb706794c533a2": {
      "1": "VP",    // Ngày 1/8: VP (ngày đầu)
      "2": "X",     // Ngày 2/8: X
      "3": "X",     // Ngày 3/8: X
      // ... 15 ngày X tiếp theo
      "18": "QL",   // Ngày 18/8: QL (từ ngày 18)
      "19": "QL",   // Ngày 19/8: QL
      "20": "QL"    // Ngày 20/8: QL
    }
  }
}
```

## Test Chức Năng

### Chạy Test Script

```bash
cd backend
node test-request-approval.js
```

Test script sẽ:
1. Tạo request test
2. Phê duyệt request
3. Kiểm tra DemoLichDiCa đã được cập nhật
4. Dọn dẹp dữ liệu test

### Test Manual

1. Tạo request mới qua User Dashboard
2. Đăng nhập admin và phê duyệt request
3. Kiểm tra collection `demolichdicas` trong MongoDB
4. Xem lịch đi ca trong DemoLichCopy component

## Lưu Ý Quan Trọng

### 1. Error Handling

- Nếu có lỗi khi cập nhật DemoLichDiCa, hệ thống vẫn sẽ phê duyệt request
- Lỗi chỉ được log để debug, không ảnh hưởng đến luồng chính

### 2. Performance

- Function `updateDemoLichDiCaFromRequest` chạy bất đồng bộ
- Không block việc phê duyệt request

### 3. Data Consistency

- Sử dụng `findOneAndUpdate` với `upsert: true` để đảm bảo data consistency
- Compound index `{ userId: 1, month: 1, year: 1, unique: true }` đảm bảo unique constraint

## Troubleshooting

### 1. Không thấy cập nhật trong ScheduleCopy

- Kiểm tra console log của backend
- Xác nhận request có `from_date` hợp lệ
- Kiểm tra quyền của user
- Kiểm tra có bản sao nào trong tháng/năm của request không

### 2. Lỗi MongoDB

- Kiểm tra kết nối database
- Xác nhận collection `demolichdicas` tồn tại
- Kiểm tra index và schema

### 3. Lỗi Frontend

- Kiểm tra network tab trong DevTools
- Xác nhận API endpoint đúng
- Kiểm tra response từ backend

## Tương Lai

### 1. Tính Năng Có Thể Thêm

- Rollback khi hủy phê duyệt
- Notification cho user khi request được duyệt
- Audit log cho tất cả thay đổi trạng thái

### 2. Tối Ưu Hóa

- Batch update cho nhiều request cùng lúc
- Cache để giảm database queries
- Background job để xử lý cập nhật

## Kết Luận

Chức năng này giúp tự động hóa việc cập nhật lịch đi ca khi admin phê duyệt request, đảm bảo tính nhất quán dữ liệu giữa hệ thống request và lịch đi ca.

**Lưu ý về phân quyền:** Tôi thấy component này có sử dụng `AccessControl` cho các nút thao tác. Bạn có muốn tôi kiểm tra và cài đặt phân quyền cho các interactive elements khác không?

