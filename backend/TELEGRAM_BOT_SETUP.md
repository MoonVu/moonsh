# 🤖 Hướng dẫn cài đặt Telegram Bot

## 📋 Tổng quan
Hệ thống Telegram Bot cho phép gửi bill (ảnh + caption + nút Yes/No) vào group Telegram và theo dõi phản hồi từ thành viên.

## 🚀 Cài đặt

### 1. Cài đặt dependencies
```bash
cd backend
npm install
```

### 2. Tạo Telegram Bot
1. Mở Telegram và tìm `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên cho bot (ví dụ: "Moonne Bill Bot")
4. Đặt username cho bot (ví dụ: "moonne_bill_bot")
5. Lưu lại **BOT_TOKEN** được cung cấp

### 3. Lấy Group Chat ID
1. Thêm bot vào group Telegram của bạn
2. Gửi một tin nhắn bất kỳ trong group
3. Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Tìm `"chat":{"id":-1001234567890}` - đây là **GROUP_CHAT_ID**

### 4. Cấu hình Bot
Mở file `backend/bot.js` và thay đổi:

```javascript
// ⚠️ THAY ĐỔI CÁC THÔNG TIN SAU:
const BOT_TOKEN = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz";  // Token từ BotFather
const GROUP_CHAT_ID = -1001234567890; // ID nhóm thật
```

### 5. Chạy hệ thống

#### Chạy Backend Server:
```bash
cd backend
npm run start:server
```

#### Chạy Telegram Bot (terminal khác):
```bash
cd backend
npm run start:bot
```

## 📱 Sử dụng

### 1. Truy cập ứng dụng
- Đăng nhập vào hệ thống
- Vào menu **CSKH > Đơn nạp tiền**
- Hoặc truy cập trực tiếp: `http://localhost:3000/nap`

### 2. Gửi Bill
1. **Bill ID**: Nhập ID bill (để trống để tự động tạo)
2. **Ảnh Bill**: 
   - Upload từ máy tính (JPG, PNG, GIF)
   - **Paste ảnh từ clipboard** (Ctrl+V) - hỗ trợ Lightshot, screenshot, copy từ ứng dụng khác
3. **Caption**: Thêm mô tả tùy chọn
4. **Gửi Bill**: Nhấn nút để gửi vào group Telegram

### 3. Theo dõi phản hồi
- Khi thành viên group bấm **Yes** hoặc **No**
- Bot sẽ trả lời trong group: "Tên người đã chọn YES/NO cho bill BillID"
- Dữ liệu được gửi về backend và log ra console

## 🔧 API Endpoints

### POST /api/sendBill
Gửi bill vào group Telegram (sử dụng FormData + multer)
```
FormData:
- billId: "BILL_20241201120000_ABC1"
- caption: "Bill nạp tiền tháng 12"
- image: [File object]
```

### POST /api/telegram
Nhận phản hồi từ bot (tự động)
```json
{
  "billId": "BILL_20241201120000_ABC1",
  "choice": "YES",
  "isYes": true,
  "userId": 123456789,
  "userName": "Nguyễn Văn A",
  "username": "nguyenvana",
  "timestamp": "2024-12-01T12:00:00.000Z"
}
```

## 🛠️ Troubleshooting

### Bot không hoạt động
- Kiểm tra BOT_TOKEN có đúng không
- Kiểm tra bot đã được thêm vào group chưa
- Kiểm tra GROUP_CHAT_ID có đúng không

### Không nhận được phản hồi
- Kiểm tra bot có quyền gửi tin nhắn trong group
- Kiểm tra backend có đang chạy không
- Kiểm tra console log của bot

### Lỗi gửi ảnh
- Kiểm tra kích thước ảnh < 10MB
- Kiểm tra định dạng ảnh (JPG, PNG, GIF)
- Kiểm tra kết nối mạng
- **Paste ảnh**: Đảm bảo tính năng paste đã được bật (nút "Paste: ON")

### Tính năng Paste ảnh
- **Bật/Tắt**: Click nút "Paste: ON/OFF" bên cạnh "Ảnh Bill"
- **Sử dụng**: Nhấn Ctrl+V sau khi copy ảnh từ Lightshot, screenshot, hoặc ứng dụng khác
- **Hỗ trợ**: Tất cả định dạng ảnh được hỗ trợ bởi clipboard

## 📊 Monitoring

### Console Logs
Backend sẽ log các thông tin:
```
📤 Gửi bill BILL_123 vào group...
✅ Đã gửi bill BILL_123 vào group. Message ID: 1234
📨 Nhận phản hồi từ Telegram: {billId: "BILL_123", choice: "YES"}
```

### Lịch sử Bill
- Ứng dụng lưu lịch sử 10 bill gần nhất
- Hiển thị trong component TelegramBillSender
- Lưu trong localStorage

## 🔒 Bảo mật

- Bot token cần được bảo mật
- Chỉ thêm bot vào group tin cậy
- Có thể thêm whitelist user ID nếu cần
- Log tất cả hoạt động để audit

## 🚀 Mở rộng

### Lưu vào Database
Hiện tại dữ liệu chỉ log ra console. Có thể mở rộng để lưu vào MongoDB:

```javascript
// Trong server.js, API /api/telegram
const billResponse = new BillResponse({
  billId,
  choice,
  isYes,
  userId,
  userName,
  timestamp: new Date()
});
await billResponse.save();
```

### Thêm tính năng
- Gửi nhiều ảnh cùng lúc
- Template caption có sẵn
- Thống kê phản hồi
- Notification realtime
- Webhook thay vì polling

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Console logs của backend và bot
2. Network tab trong browser DevTools
3. Telegram Bot API documentation
4. Contact admin để được hỗ trợ
