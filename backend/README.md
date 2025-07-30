# Moonne Backend Server

Backend server cho ứng dụng Moonne với Express.js và SQLite.

## Cài đặt

```bash
npm install
```

## Chạy server

### Development mode (với auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server sẽ chạy tại: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `GET /api/user/profile` - Lấy thông tin user (cần token)

### Tasks
- `GET /api/tasks` - Lấy danh sách tasks (cần token)
- `POST /api/tasks` - Tạo task mới (cần token)
- `PUT /api/tasks/:id` - Cập nhật task (cần token)
- `DELETE /api/tasks/:id` - Xóa task (cần token)

### Notifications
- `GET /api/notifications` - Lấy notifications (cần token)
- `PUT /api/notifications/:id/read` - Đánh dấu đã đọc (cần token)

### System
- `GET /api/health` - Kiểm tra server status
- `POST /api/init-demo` - Khởi tạo dữ liệu demo

## Demo Accounts

Sau khi chạy `POST /api/init-demo`, bạn có thể đăng nhập với:

- **admin** / admin123 (Quản lý - Toàn quyền)
- **user1** / user123 (XNK)
- **user2** / user123 (FK)
- **user3** / user123 (CSKH)

## Database

Server sử dụng SQLite với file `moonne.db` được tạo tự động.

## Environment Variables

- `PORT` - Port server (mặc định: 5000)
- `JWT_SECRET` - Secret key cho JWT (mặc định: 'moonne-secret-key') 