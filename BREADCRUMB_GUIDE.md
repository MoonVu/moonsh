# 🍞 Hướng dẫn sử dụng Breadcrumb Navigation

## 📋 Tổng quan
Breadcrumb navigation đã được implement trong ứng dụng Moon để:
- **Hiển thị vị trí hiện tại** trong ứng dụng
- **Giữ trạng thái** sau khi refresh (F5)
- **Navigation dễ dàng** giữa các trang

## 🔧 Các tính năng đã implement

### 1. **React Router Integration**
- Sử dụng `useLocation` để lấy thông tin URL hiện tại
- Tự động cập nhật breadcrumb khi URL thay đổi
- Persist state trong URL

### 2. **Breadcrumb Component**
- Hiển thị đường dẫn: `Trang chủ / Quản lý tài khoản`
- Clickable links để navigate
- Responsive design

### 3. **URL-based Navigation**
- Menu sidebar sử dụng React Router
- URL thay đổi khi click menu
- F5 không làm mất vị trí hiện tại

## 🚀 Cách sử dụng

### **Từ người dùng:**
1. Click vào menu sidebar → URL thay đổi
2. Breadcrumb hiển thị vị trí hiện tại
3. Click vào breadcrumb để quay lại
4. F5 → vẫn ở cùng vị trí

### **Từ developer:**
```javascript
// Navigate programmatically
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/taikhoan');

// Lấy thông tin URL hiện tại
import { useLocation } from 'react-router-dom';
const location = useLocation();
console.log(location.pathname); // '/taikhoan'
```

## 📊 Cấu trúc URL

### **Routes hiện tại:**
- `/` - Trang chủ
- `/taikhoan` - Quản lý tài khoản
- `/phanquyen` - Phân quyền
- `/task` - Yêu cầu công việc
- `/vitri` - Vị trí chỗ ngồi
- `/apitest` - API Test
- `/lichdica` - Lịch đi ca

### **Breadcrumb mapping:**
```javascript
const nameMap = {
  'taikhoan': 'Quản lý tài khoản',
  'phanquyen': 'Phân quyền',
  'task': 'Yêu cầu công việc',
  'vitri': 'Vị trí chỗ ngồi',
  'apitest': 'API Test',
  'lichdica': 'Lịch đi ca'
};
```

## 🎨 Styling

### **CSS Classes:**
- `.breadcrumb-nav` - Container chính
- `.breadcrumb-container` - Flex container
- `.breadcrumb-item` - Link items
- `.breadcrumb-item.active` - Current page
- `.breadcrumb-separator` - Dấu "/"

### **Responsive:**
- Mobile: Font size nhỏ hơn
- Desktop: Full size với hover effects

## 🔍 Troubleshooting

### **Breadcrumb không hiển thị:**
1. Kiểm tra React Router đã cài đặt
2. Kiểm tra BrowserRouter wrapper
3. Kiểm tra useLocation hook

### **URL không cập nhật:**
1. Kiểm tra navigate function
2. Kiểm tra route mapping
3. Kiểm tra click handler

### **F5 vẫn reset:**
1. Kiểm tra localStorage
2. Kiểm tra useEffect dependencies
3. Kiểm tra route configuration

## 📝 Thêm routes mới

### **1. Thêm route trong App.js:**
```javascript
<Route path="/newpage" element={<NewComponent />} />
```

### **2. Thêm menu trong SidebarMenu.js:**
```javascript
const routeMap = {
  'newmenu': '/newpage',
  // ... existing routes
};
```

### **3. Thêm breadcrumb name:**
```javascript
const nameMap = {
  'newpage': 'Tên hiển thị',
  // ... existing names
};
```

## 🔐 Bảo mật

### **Protected Routes:**
- Sử dụng `ProtectedRoute` component
- Kiểm tra quyền user trước khi render
- Redirect nếu không có quyền

### **URL Security:**
- Không expose sensitive data trong URL
- Validate route parameters
- Sanitize user input

## 📱 Mobile Support

### **Responsive Design:**
- Breadcrumb tự động wrap trên mobile
- Font size nhỏ hơn trên màn hình nhỏ
- Touch-friendly click targets

## 🎯 Best Practices

1. **Consistent naming** - Sử dụng tên tiếng Việt rõ ràng
2. **Short URLs** - Giữ URL ngắn gọn
3. **Clear hierarchy** - Breadcrumb phản ánh cấu trúc menu
4. **Accessibility** - Hỗ trợ keyboard navigation
5. **Performance** - Lazy load components khi cần

## 🔄 Future Enhancements

- [ ] Nested breadcrumbs cho sub-pages
- [ ] Breadcrumb với icons
- [ ] Custom breadcrumb cho từng page
- [ ] Breadcrumb history tracking
- [ ] Breadcrumb analytics 