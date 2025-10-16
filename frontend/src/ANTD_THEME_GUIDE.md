# Ant Design Theme Configuration Guide

## Tổng quan
Thay vì override CSS thủ công, chúng ta sử dụng `ConfigProvider` theme tokens để quản lý toàn bộ style của Ant Design. Cách này sạch sẽ, không bị xung đột và dễ maintain.

## Cách sửa CSS

### 1. Mở file `src/App.js`
Tìm section `// Ant Design Theme Configuration` (dòng 111)

### 2. Sửa màu sắc trong `token` section:

```javascript
const theme = {
  token: {
    // Màu chính
    colorPrimary: '#1890ff',      // Màu primary (buttons, links)
    colorSuccess: '#52c41a',      // Màu success (thành công)
    colorWarning: '#faad14',      // Màu warning (cảnh báo)
    colorError: '#ff4d4f',        // Màu error (lỗi)
    
    // Màu link
    colorLink: '#1890ff',         // Màu link mặc định
    colorLinkHover: '#40a9ff',    // Màu link khi hover
    colorLinkActive: '#096dd9',   // Màu link khi active
    
    // Màu nền
    colorBgContainer: '#ffffff',  // Nền container
    colorBgLayout: '#f5f5f5',     // Nền layout chính
    
    // Màu border
    colorBorder: '#f0f0f0',       // Màu border mặc định
    colorBorderSecondary: '#f0f0f0', // Màu border phụ
    
    // Màu text
    colorText: '#262626',         // Màu text chính
    colorTextSecondary: '#8c8c8c', // Màu text phụ
    
    // Border radius
    borderRadius: 8,              // Border radius mặc định
    borderRadiusLG: 12,           // Border radius lớn
    borderRadiusSM: 6,            // Border radius nhỏ
    
    // Shadow
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Shadow mặc định
    
    // Font
    fontSize: 14,                 // Font size mặc định
    fontWeightStrong: 600,        // Font weight đậm
    
    // Spacing
    padding: 16,                  // Padding mặc định
    margin: 16,                   // Margin mặc định
    
    // Height
    controlHeight: 36,            // Chiều cao control mặc định
  }
}
```

### 3. Sửa component cụ thể trong `components` section:

```javascript
const theme = {
  components: {
    Button: {
      borderRadius: 8,            // Border radius của button
      fontWeight: 600,            // Font weight của button
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', // Shadow của button
      controlHeight: 36,          // Chiều cao button
    },
    Modal: {
      borderRadius: 16,           // Border radius của modal
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', // Shadow của modal
      paddingLG: 32,              // Padding lớn của modal
    },
    Table: {
      borderRadius: 12,           // Border radius của table
      headerBg: '#fafafa',        // Màu nền header
      headerColor: '#1890ff',     // Màu text header
      rowHoverBg: '#f0f9ff',      // Màu nền khi hover row
      borderColor: '#f0f0f0',     // Màu border
    },
    Card: {
      borderRadius: 12,           // Border radius của card
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)', // Shadow của card
      headerBg: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', // Nền header card
    },
    Input: {
      borderRadius: 8,            // Border radius của input
      controlHeight: 36,          // Chiều cao input
      borderColor: '#f0f0f0',     // Màu border input
      hoverBorderColor: '#40a9ff', // Màu border khi hover
      activeBorderColor: '#1890ff', // Màu border khi focus
    },
    Form: {
      labelColor: '#262626',      // Màu label form
      labelFontSize: 14,          // Font size label
      labelFontWeight: 600,       // Font weight label
    }
  }
}
```

## Các token phổ biến cần biết

### Colors
- `colorPrimary`: Màu chính (buttons, links, highlights)
- `colorSuccess`: Màu thành công (success messages)
- `colorWarning`: Màu cảnh báo (warning messages)
- `colorError`: Màu lỗi (error messages)
- `colorInfo`: Màu thông tin (info messages)

### Backgrounds
- `colorBgContainer`: Nền container chính
- `colorBgElevated`: Nền elevated (modal, dropdown)
- `colorBgLayout`: Nền layout chính
- `colorBgSpotlight`: Nền spotlight (tooltip, popover)

### Borders
- `colorBorder`: Border mặc định
- `colorBorderSecondary`: Border phụ
- `borderRadius`: Border radius mặc định
- `borderRadiusLG`: Border radius lớn
- `borderRadiusSM`: Border radius nhỏ

### Text
- `colorText`: Text chính
- `colorTextSecondary`: Text phụ
- `colorTextTertiary`: Text phụ hơn
- `fontSize`: Font size mặc định
- `fontWeightStrong`: Font weight đậm

### Spacing & Sizing
- `padding`: Padding mặc định
- `paddingLG`: Padding lớn
- `paddingSM`: Padding nhỏ
- `margin`: Margin mặc định
- `controlHeight`: Chiều cao control
- `controlHeightLG`: Chiều cao control lớn
- `controlHeightSM`: Chiều cao control nhỏ

### Effects
- `boxShadow`: Shadow mặc định
- `boxShadowSecondary`: Shadow phụ

## Ví dụ thực tế

### Thay đổi màu primary sang tím:
```javascript
token: {
  colorPrimary: '#722ed1',        // Tím
  colorLink: '#722ed1',           // Link cũng tím
  colorLinkHover: '#9254de',      // Tím nhạt khi hover
}
```

### Thay đổi border radius toàn bộ:
```javascript
token: {
  borderRadius: 12,               // Tăng border radius
  borderRadiusLG: 16,             // Border radius lớn
  borderRadiusSM: 8,              // Border radius nhỏ
}
```

### Thay đổi màu nền:
```javascript
token: {
  colorBgLayout: '#f8f9fa',       // Nền layout sáng hơn
  colorBgContainer: '#ffffff',    // Nền container trắng
}
```

## Lưu ý quan trọng

1. **Không cần restart**: Thay đổi theme sẽ áp dụng ngay lập tức
2. **Không bị đè**: Theme tokens có độ ưu tiên cao nhất
3. **Responsive**: Có thể dùng media queries trong theme
4. **Dark mode**: Có thể tạo theme dark mode riêng
5. **Performance**: Tốt hơn CSS override thủ công

## Troubleshooting

### Màu không thay đổi:
- Kiểm tra tên token có đúng không
- Kiểm tra cú pháp JSON
- Refresh browser

### Component không áp dụng theme:
- Kiểm tra component có trong `components` section không
- Kiểm tra tên property có đúng không

### CSS vẫn bị đè:
- Xóa các CSS override cũ trong các file .css
- Chỉ dùng theme tokens để customize







