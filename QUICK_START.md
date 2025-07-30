# 🚀 Moonne Backend - Quick Start Guide

## Bước 1: Chạy Backend Server

```bash
cd backend
node server.js
```

Server sẽ chạy tại: http://localhost:5000

## Bước 2: Test API

### Cách 1: Dùng file HTML test
Mở file `backend/test-api.html` trong browser

### Cách 2: Dùng React App
1. Chạy React app: `npm start`
2. Vào menu "QUẢN TRỊ" > "API Test"
3. Test các chức năng:
   - Health Check
   - Initialize Demo Data
   - Login với admin/admin123
   - Get Tasks, Create Task

## Bước 3: Demo Accounts

Sau khi chạy "Initialize Demo Data", có thể login với:

- **admin** / admin123 (Quản lý - Toàn quyền)
- **user1** / user123 (XNK)
- **user2** / user123 (FK)
- **user3** / user123 (CSKH)

## API Endpoints

- `GET /api/health` - Kiểm tra server
- `POST /api/init-demo` - Khởi tạo dữ liệu demo
- `POST /api/auth/login` - Đăng nhập
- `GET /api/tasks` - Lấy danh sách tasks
- `POST /api/tasks` - Tạo task mới

## Cấu trúc Database

- **users** - Bảng người dùng
- **tasks** - Bảng công việc
- **notifications** - Bảng thông báo

## Next Steps

1. ✅ Backend server đã chạy
2. ✅ API endpoints đã hoạt động
3. ✅ Frontend integration đã sẵn sàng
4. 🔄 Tiếp tục phát triển các tính năng mới

## Troubleshooting

- Nếu server không chạy: Kiểm tra port 5000 có bị chiếm không
- Nếu API lỗi: Kiểm tra CORS settings
- Nếu database lỗi: Xóa file `moonne.db` và restart server 