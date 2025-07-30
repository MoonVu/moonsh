# 🌐 Hướng dẫn cấu hình LAN cho Moon Backend

## 📋 Tổng quan
Hướng dẫn này sẽ giúp bạn cấu hình backend để các máy khác trong mạng LAN có thể truy cập được API MongoDB.

## 🔧 Các thay đổi đã thực hiện

### 1. Cấu hình Server lắng nghe trên tất cả interface
- Thay đổi `app.listen(PORT)` thành `app.listen(PORT, '0.0.0.0')`
- Điều này cho phép server lắng nghe trên tất cả các interface mạng, không chỉ localhost

### 2. Cấu hình CORS cho mạng LAN
- Cập nhật CORS để cho phép các IP trong range `172.16.x.x` và `192.168.x.x`
- Thêm logic kiểm tra IP range tự động

### 3. Cập nhật file config.env
- Thêm các IP range vào CORS_ORIGIN
- Cấu hình MongoDB URI với IP local

## 🚀 Cách sử dụng

### Bước 1: Khởi động server
```bash
cd backend
npm start
```

### Bước 2: Kiểm tra kết nối LAN
```bash
cd backend
node test-lan-connection.js
```

### Bước 3: Test từ máy khác
Từ máy khác trong mạng LAN, mở trình duyệt và truy cập:
```
http://172.16.1.6:5000/api/health
```

## 🔒 Cấu hình Firewall (Windows)

### Mở port 5000 trong Windows Firewall:
1. Mở "Windows Defender Firewall with Advanced Security"
2. Chọn "Inbound Rules" → "New Rule"
3. Chọn "Port" → "Next"
4. Chọn "TCP" và nhập "5000" → "Next"
5. Chọn "Allow the connection" → "Next"
6. Chọn tất cả profiles → "Next"
7. Đặt tên "Moon Backend API" → "Finish"

### Hoặc sử dụng PowerShell (Run as Administrator):
```powershell
New-NetFirewallRule -DisplayName "Moon Backend API" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

## 📱 Cấu hình Frontend cho LAN

### Thay đổi API URL trong frontend:
Nếu bạn muốn frontend React cũng có thể truy cập từ LAN, cập nhật API URL:

```javascript
// Thay vì
const API_URL = 'http://localhost:5000';

// Sử dụng
const API_URL = 'http://172.16.1.6:5000';
```

## 🧪 Test kết nối

### Test từ máy chủ:
```bash
curl http://localhost:5000/api/health
curl http://172.16.1.6:5000/api/health
```

### Test từ máy khác:
```bash
curl http://172.16.1.6:5000/api/health
```

## 🔍 Troubleshooting

### 1. Không thể kết nối từ máy khác
- Kiểm tra firewall đã mở port 5000 chưa
- Kiểm tra server có đang chạy không
- Kiểm tra IP có đúng không

### 2. CORS Error
- Kiểm tra cấu hình CORS trong config.env
- Đảm bảo IP client nằm trong range cho phép

### 3. MongoDB Connection Error
- Kiểm tra MongoDB có đang chạy không
- Kiểm tra MONGODB_URI trong config.env

## 📊 Thông tin mạng

### IP hiện tại: `172.16.1.6`
### Port: `5000`
### URL API: `http://172.16.1.6:5000`

## 🔐 Bảo mật

⚠️ **Lưu ý quan trọng:**
- Cấu hình này chỉ dành cho mạng LAN nội bộ
- Không sử dụng cho production trên internet
- Đảm bảo mạng LAN được bảo vệ
- Thay đổi JWT_SECRET trong production

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Server logs trong console
2. Firewall settings
3. Network connectivity
4. MongoDB connection 