# Hướng dẫn Logic Xử lý Popup

## Nguyên tắc cơ bản

**Luôn ưu tiên: Logic xử lý trước → Tắt popup sau**

## Cấu trúc chuẩn

### 1. Xử lý Form Submit

```javascript
const handleSubmit = async () => {
  setLoading(true);
  try {
    // 1. Validate dữ liệu
    if (!formData.name || !formData.email) {
      setError("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    // 2. Thực hiện logic xử lý
    await apiService.createUser(formData);
    
    // 3. Cập nhật state/dữ liệu
    fetchUsers();
    
    // 4. Chỉ sau khi logic hoàn thành thành công, mới tắt popup
    setShowPopup(false);
    setFormData({});
    
  } catch (err) {
    // 5. Nếu có lỗi, KHÔNG tắt popup để user có thể sửa
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 2. Xử lý Xóa

```javascript
const handleDelete = async () => {
  setLoading(true);
  try {
    // 1. Thực hiện logic xóa
    await apiService.deleteUser(userId);
    
    // 2. Cập nhật danh sách
    setUsers(prev => prev.filter(u => u.id !== userId));
    
    // 3. Sau khi logic hoàn thành, mới tắt popup
    setShowDeleteConfirm(false);
    
  } catch (err) {
    // 4. Nếu có lỗi, không tắt popup để user có thể thử lại
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 3. Xử lý Cập nhật

```javascript
const handleUpdate = async () => {
  setLoading(true);
  try {
    // 1. Thực hiện logic cập nhật
    await apiService.updateUser(userId, formData);
    
    // 2. Cập nhật dữ liệu local
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, ...formData } : u
    ));
    
    // 3. Sau khi logic hoàn thành, mới tắt popup
    setShowEdit(false);
    setEditData({});
    
  } catch (err) {
    // 4. Nếu có lỗi, không tắt popup
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

## Lưu ý quan trọng

### ✅ Đúng
- Logic xử lý hoàn thành → Tắt popup
- Có lỗi → Không tắt popup
- Loading state để tránh double submit
- Validate trước khi xử lý

### ❌ Sai
- Tắt popup trước khi logic hoàn thành
- Không xử lý lỗi
- Không có loading state
- Không validate dữ liệu

## Ví dụ thực tế trong dự án

### BangDuLieu.js - Thêm tài khoản
```javascript
const handleAddSave = async () => {
  setLoading(true);
  try {
    // Logic xử lý trước
    await apiService.createUser({
      username: addForm.tenTaiKhoan,
      password: addForm.password || "123456",
      group_name: addForm.group,
      status: addForm.status,
      start_date: addForm.ngayBatDau
    });
    
    // Sau khi logic hoàn thành thành công, mới tắt popup
    setShowAdd(false);
    fetchUsers();
  } catch (err) {
    setError(err.message);
    // Nếu có lỗi, không tắt popup để user có thể sửa
  }
  setLoading(false);
};
```

### TaskYeuCau.js - Nhận task
```javascript
const handleNhanXacNhan = () => {
  // Thực hiện logic nhận task trước
  setData(prev => prev.map(row => row.id === showNhan.id ? {
    ...row,
    nguoiThucHien: user?.tenTaiKhoan || "",
    thoiGianTiepNhan: getTodayGMT7(),
    duKien: duKienNhan
  } : row));
  
  // Sau khi logic hoàn thành, mới tắt popup
  setShowNhan({ show: false, id: null });
  setDuKienNhan("");
  setRowNhan(showNhan.id);
};
```

## Checklist khi implement popup

- [ ] Logic xử lý được thực hiện trước
- [ ] Popup chỉ tắt sau khi logic thành công
- [ ] Có xử lý lỗi và không tắt popup khi lỗi
- [ ] Có loading state để tránh double submit
- [ ] Validate dữ liệu trước khi xử lý
- [ ] Cập nhật state/dữ liệu sau khi logic hoàn thành
- [ ] Reset form sau khi thành công (nếu cần)

## Kết luận

Tuân thủ nguyên tắc "Logic trước, tắt popup sau" sẽ giúp:
- Tránh mất dữ liệu khi có lỗi
- UX tốt hơn cho người dùng
- Code dễ maintain và debug
- Tránh các bug liên quan đến timing 