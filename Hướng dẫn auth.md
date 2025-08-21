# 🔐 Hướng dẫn Hệ thống Auth & Permissions - Moonne

## 📋 Mục lục
1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [Cấu trúc Roles & Permissions](#cấu-trúc-roles--permissions)
3. [Thêm Permission mới](#thêm-permission-mới)
4. [Sử dụng Permissions trong Code](#sử-dụng-permissions-trong-code)
5. [Ẩn/hiện UI dựa trên quyền](#ẩnhiện-ui-dựa-trên-quyền)
6. [API Protection](#api-protection)
7. [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## 🎯 Tổng quan hệ thống

### Kiến trúc Auth
```
User → Login → JWT Token → Middleware → Role → Permissions → UI/API Access
```

### Các components chính:
- **Backend**: Models (User, Role, Permission), Middleware (auth, authorize)
- **Frontend**: AuthContext, useAuth hook, ProtectedRoute, AdminPage
- **Database**: MongoDB với collections users, roles, permissions

---

## 🎭 Cấu trúc Roles & Permissions

### Roles hiện tại:
- **ADMIN**: Toàn quyền hệ thống
- **XNK**: Xuất Nhập Khoản  
- **CSKH**: Chăm sóc khách hàng
- **FK**: Tài chính (role mặc định)

### Resources hiện tại:
```javascript
- administrator_access     // Quyền quản trị
- user_management         // Quản lý người dùng  
- content_management      // Quản lý nội dung
- financial_management    // Quản lý tài chính
- schedules              // Lịch trình
- tasks                  // Nhiệm vụ
- seats                  // Chỗ ngồi
- notifications          // Thông báo
- reports                // Báo cáo
- system                 // Hệ thống
// ... và nhiều resources khác
```

### Actions hiện tại:
- **view**: Xem
- **edit**: Chỉnh sửa  
- **delete**: Xóa

---

## 🔧 Thêm Permission mới

### Bước 1: Cập nhật Backend Config

**File: `backend/src/config/permissions.js`**

```javascript
// 1. Thêm action mới (nếu cần)
const PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit', 
  DELETE: 'delete',
  CREATE: 'create',      // ✨ MỚI
  APPROVE: 'approve',    // ✨ MỚI
  EXPORT: 'export'       // ✨ MỚI
};

// 2. Thêm resource mới (nếu cần)
const RESOURCES = {
  // ... existing resources
  DOCUMENTS: 'documents',        // ✨ MỚI
  WORKFLOWS: 'workflows',        // ✨ MỚI
  ANALYTICS: 'analytics'         // ✨ MỚI
};

// 3. Cập nhật permissions cho roles
const ROLE_PERMISSIONS = {
  ADMIN: {
    // Thêm permissions cho resources mới
    [RESOURCES.DOCUMENTS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE, PERMISSIONS.CREATE],
    [RESOURCES.WORKFLOWS]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.APPROVE],
    
    // Thêm action mới cho resources có sẵn
    [RESOURCES.SCHEDULES]: [PERMISSIONS.VIEW, PERMISSIONS.EDIT, PERMISSIONS.DELETE, PERMISSIONS.CREATE],
  },
  CSKH: {
    [RESOURCES.DOCUMENTS]: [PERMISSIONS.VIEW, PERMISSIONS.CREATE], // CSKH chỉ xem và tạo
  }
  // ... other roles
};
```

### Bước 2: Cập nhật Frontend

**File: `src/pages/AdminPage.jsx`**

```javascript
// 1. Sync permissions với backend
const PERMISSIONS = {
  VIEW: 'view',
  EDIT: 'edit', 
  DELETE: 'delete',
  CREATE: 'create',      // ✨ MỚI
  APPROVE: 'approve',    // ✨ MỚI
  EXPORT: 'export'       // ✨ MỚI
};

// 2. Thêm resources mới
const RESOURCES = {
  // ... existing
  DOCUMENTS: { key: 'documents', label: 'Documents' },
  WORKFLOWS: { key: 'workflows', label: 'Workflows' },
};

// 3. Cập nhật display names
const RESOURCE_DISPLAY_NAMES = {
  // ... existing
  [RESOURCES.DOCUMENTS.key]: 'Quản lý tài liệu',
  [RESOURCES.WORKFLOWS.key]: 'Quy trình làm việc',
};

const PERMISSION_DISPLAY_NAMES = {
  // ... existing
  [PERMISSIONS.CREATE]: 'Tạo mới',
  [PERMISSIONS.APPROVE]: 'Phê duyệt',
  [PERMISSIONS.EXPORT]: 'Xuất file'
};

// 4. Cập nhật UI matrix (nếu thêm cột mới)
<div className="actions-header">
  <span className="action-header">Xem</span>
  <span className="action-header">Chỉnh sửa</span>
  <span className="action-header">Xóa</span>
  <span className="action-header">Tạo mới</span>    {/* ✨ MỚI */}
  <span className="action-header">Phê duyệt</span>  {/* ✨ MỚI */}
</div>

// 5. Thêm checkboxes mới
<label className="permission-checkbox-container">
  <input
    type="checkbox"
    checked={permissions[resource.key]?.[PERMISSIONS.CREATE] || false}
    onChange={(e) => handlePermissionChange(resource.key, PERMISSIONS.CREATE, e.target.checked)}
    className="permission-checkbox"
  />
  <span className="permission-label-text">Tạo mới</span>
</label>
```

### Bước 3: Cập nhật CSS (nếu thêm cột)

**File: `src/pages/AdminPage.css`**

```css
.actions-header {
  display: grid;
  grid-template-columns: repeat(5, 80px); /* Tăng từ 3 lên 5 */
  gap: 24px;
}

.permission-actions {
  display: grid;
  grid-template-columns: repeat(5, 80px); /* Tăng từ 3 lên 5 */
  gap: 24px;
}
```

### Bước 4: Chạy seed

```bash
cd backend
node update-permissions.js
```

---

## 💻 Sử dụng Permissions trong Code

### 1. 🛡️ Backend API Protection

**Middleware kiểm tra permission:**

```javascript
// backend/src/middleware/auth.js
const { attachUser, requirePermission } = require('./src/middleware/auth');

// Sử dụng trong routes:
app.post('/api/documents', 
  attachUser,                                    // Đính kèm user info
  requirePermission('documents', 'create'),      // Kiểm tra quyền
  async (req, res) => {
    // Logic tạo document
    res.json({ success: true });
  }
);

app.get('/api/reports/export',
  attachUser,
  requirePermission('reports', 'export'),        // Kiểm tra quyền export
  async (req, res) => {
    // Logic export báo cáo
  }
);

app.delete('/api/users/:id',
  attachUser,
  requirePermission('user_management', 'delete'), // Kiểm tra quyền xóa user
  async (req, res) => {
    // Logic xóa user
  }
);
```

**Kiểm tra role cụ thể:**

```javascript
const { requireRole } = require('./src/middleware/auth');

app.get('/api/admin/dashboard',
  attachUser,
  requireRole('ADMIN'),                          // Chỉ ADMIN mới vào được
  async (req, res) => {
    // Dashboard chỉ dành cho admin
  }
);

app.post('/api/financial/approve',
  attachUser,
  requireRole('ADMIN', 'FK'),                    // ADMIN hoặc FK
  async (req, res) => {
    // Logic phê duyệt tài chính
  }
);
```

### 2. 🎨 Frontend UI Control

**Hook useAuth để kiểm tra quyền:**

```javascript
// src/hooks/useAuth.js đã có sẵn hasPermission function

// Trong component:
import { useAuth } from '../hooks/useAuth';

function DocumentsPage() {
  const { user, hasPermission, isAdmin } = useAuth();

  return (
    <div>
      <h1>Quản lý Tài liệu</h1>
      
      {/* Hiển thị danh sách (cần quyền view) */}
      {hasPermission('documents', 'view') ? (
        <DocumentList />
      ) : (
        <div>Bạn không có quyền xem tài liệu</div>
      )}

      {/* Nút tạo mới (cần quyền create) */}
      {hasPermission('documents', 'create') && (
        <button 
          className="btn-primary"
          onClick={() => createDocument()}
        >
          Tạo tài liệu mới
        </button>
      )}

      {/* Nút xuất Excel (cần quyền export) */}
      {hasPermission('documents', 'export') && (
        <button 
          className="btn-secondary"
          onClick={() => exportDocuments()}
        >
          Xuất Excel
        </button>
      )}

      {/* Chỉ admin mới thấy */}
      {isAdmin && (
        <div className="admin-controls">
          <button>Cài đặt hệ thống</button>
        </div>
      )}
    </div>
  );
}
```

### 3. 🔒 Component Protection

**ProtectedRoute component:**

```javascript
// src/components/auth/ProtectedRoute.jsx
import { useAuth } from '../../hooks/useAuth';

function ProtectedRoute({ 
  children, 
  requiredRole = null,           // Yêu cầu role cụ thể
  requiredPermission = null,     // Yêu cầu permission cụ thể
  fallback = null               // Component hiển thị khi không có quyền
}) {
  const { user, hasPermission, isRole } = useAuth();

  // Kiểm tra role
  if (requiredRole && !isRole(requiredRole)) {
    return fallback || <div>Không có quyền truy cập</div>;
  }

  // Kiểm tra permission
  if (requiredPermission) {
    const [resource, action] = requiredPermission.split('.');
    if (!hasPermission(resource, action)) {
      return fallback || <div>Không có quyền thực hiện thao tác này</div>;
    }
  }

  return children;
}

// Sử dụng:
<ProtectedRoute requiredPermission="documents.create">
  <CreateDocumentForm />
</ProtectedRoute>

<ProtectedRoute requiredRole="ADMIN">
  <AdminDashboard />
</ProtectedRoute>
```

**AccessControl component:**

```javascript
// src/components/auth/AccessControl.jsx  
import { useAuth } from '../../hooks/useAuth';

function AccessControl({ 
  permission = null,     // "resource.action"
  role = null,          // "ADMIN" 
  children,
  fallback = null 
}) {
  const { hasPermission, isRole } = useAuth();

  // Kiểm tra permission
  if (permission) {
    const [resource, action] = permission.split('.');
    if (!hasPermission(resource, action)) {
      return fallback;
    }
  }

  // Kiểm tra role
  if (role && !isRole(role)) {
    return fallback;
  }

  return children;
}

// Sử dụng:
<AccessControl permission="schedules.edit">
  <EditScheduleButton />
</AccessControl>

<AccessControl role="ADMIN" fallback={<span>Chỉ admin</span>}>
  <AdminSettings />
</AccessControl>
```

---

## 🎨 Ẩn/hiện UI dựa trên quyền

### 1. 📱 Trong Menu/Navigation

```javascript
// src/SidebarMenu.js
import { useAuth } from './hooks/useAuth';

function SidebarMenu() {
  const { hasPermission, isAdmin } = useAuth();

  return (
    <nav className="sidebar">
      {/* Menu luôn hiển thị */}
      <MenuItem href="/dashboard">Dashboard</MenuItem>
      
      {/* Menu có điều kiện quyền */}
      {hasPermission('schedules', 'view') && (
        <MenuItem href="/schedules">Lịch trình</MenuItem>
      )}
      
      {hasPermission('user_management', 'view') && (
        <MenuItem href="/users">Quản lý người dùng</MenuItem>
      )}
      
      {hasPermission('reports', 'view') && (
        <MenuItem href="/reports">Báo cáo</MenuItem>
      )}
      
      {/* Menu chỉ admin */}
      {isAdmin && (
        <MenuItem href="/admin">Quản trị hệ thống</MenuItem>
      )}
    </nav>
  );
}
```

### 2. 🔘 Trong Buttons/Actions

```javascript
// Trong bất kỳ component nào
function TaskList() {
  const { hasPermission } = useAuth();

  return (
    <div className="task-list">
      {tasks.map(task => (
        <div key={task.id} className="task-item">
          <span>{task.title}</span>
          
          <div className="task-actions">
            {/* Nút sửa - cần quyền edit */}
            {hasPermission('tasks', 'edit') && (
              <button 
                className="btn-edit"
                onClick={() => editTask(task.id)}
              >
                Sửa
              </button>
            )}
            
            {/* Nút xóa - cần quyền delete */}
            {hasPermission('tasks', 'delete') && (
              <button 
                className="btn-delete"
                onClick={() => deleteTask(task.id)}
              >
                Xóa
              </button>
            )}
            
            {/* Nút phê duyệt - chỉ admin hoặc manager */}
            {(hasPermission('tasks', 'approve') || isRole('ADMIN')) && (
              <button 
                className="btn-approve"
                onClick={() => approveTask(task.id)}
              >
                Phê duyệt
              </button>
            )}
          </div>
        </div>
      ))}
      
      {/* Nút tạo mới ở cuối danh sách */}
      {hasPermission('tasks', 'create') && (
        <button 
          className="btn-create"
          onClick={() => createNewTask()}
        >
          + Tạo nhiệm vụ mới
        </button>
      )}
    </div>
  );
}
```

### 3. 📊 Trong Tables/Grids

```javascript
function UserTable() {
  const { hasPermission, isAdmin } = useAuth();

  const columns = [
    { key: 'username', label: 'Tên đăng nhập' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Vai trò' },
    
    // Cột actions - có điều kiện
    ...(hasPermission('user_management', 'edit') || hasPermission('user_management', 'delete') 
      ? [{ key: 'actions', label: 'Thao tác' }] 
      : []
    )
  ];

  return (
    <table className="user-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id}>
            <td>{user.username}</td>
            <td>{user.email}</td>
            <td>{user.role}</td>
            
            {/* Cột actions có điều kiện */}
            {(hasPermission('user_management', 'edit') || hasPermission('user_management', 'delete')) && (
              <td className="actions">
                {hasPermission('user_management', 'edit') && (
                  <button onClick={() => editUser(user.id)}>Sửa</button>
                )}
                
                {hasPermission('user_management', 'delete') && (
                  <button onClick={() => deleteUser(user.id)}>Xóa</button>
                )}
                
                {/* Một số user đặc biệt chỉ admin mới sửa được */}
                {user.isSystemUser && !isAdmin && (
                  <span className="text-muted">Không thể sửa</span>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 4. 📋 Trong Forms

```javascript
function UserForm({ user, isEditing }) {
  const { hasPermission, isAdmin } = useAuth();
  
  // Kiểm tra quyền tổng thể
  if (isEditing && !hasPermission('user_management', 'edit')) {
    return <div>Bạn không có quyền sửa thông tin người dùng</div>;
  }
  
  if (!isEditing && !hasPermission('user_management', 'create')) {
    return <div>Bạn không có quyền tạo người dùng mới</div>;
  }

  return (
    <form>
      {/* Trường cơ bản - ai cũng thấy */}
      <input name="username" placeholder="Tên đăng nhập" />
      <input name="email" placeholder="Email" />
      
      {/* Trường role - chỉ admin hoặc có quyền đặc biệt */}
      {(isAdmin || hasPermission('user_management', 'assign_role')) && (
        <select name="role">
          <option value="FK">FK</option>
          <option value="CSKH">CSKH</option>
          {isAdmin && <option value="ADMIN">ADMIN</option>}
        </select>
      )}
      
      {/* Trường password - chỉ khi tạo mới hoặc có quyền reset */}
      {(!isEditing || hasPermission('user_management', 'reset_password')) && (
        <input name="password" type="password" placeholder="Mật khẩu" />
      )}
      
      <div className="form-actions">
        {/* Nút lưu */}
        <button type="submit">
          {isEditing ? 'Cập nhật' : 'Tạo mới'}
        </button>
        
        {/* Nút xóa - chỉ khi sửa và có quyền */}
        {isEditing && hasPermission('user_management', 'delete') && (
          <button 
            type="button" 
            className="btn-danger"
            onClick={() => deleteUser(user.id)}
          >
            Xóa
          </button>
        )}
      </div>
    </form>
  );
}
```

---

## 🔌 API Protection

### 1. 🛡️ Route Protection

```javascript
// backend/routes/documents.js
const router = express.Router();
const { attachUser, requirePermission, requireRole } = require('../middleware/auth');

// Tất cả routes cần đăng nhập
router.use(attachUser);

// GET - cần quyền view
router.get('/', 
  requirePermission('documents', 'view'),
  async (req, res) => {
    const documents = await Document.find();
    res.json({ success: true, data: documents });
  }
);

// POST - cần quyền create  
router.post('/',
  requirePermission('documents', 'create'),
  async (req, res) => {
    const document = new Document(req.body);
    await document.save();
    res.json({ success: true, data: document });
  }
);

// PUT - cần quyền edit
router.put('/:id',
  requirePermission('documents', 'edit'),
  async (req, res) => {
    const document = await Document.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true, data: document });
  }
);

// DELETE - cần quyền delete
router.delete('/:id',
  requirePermission('documents', 'delete'),
  async (req, res) => {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  }
);

// Export - cần quyền export
router.get('/export',
  requirePermission('documents', 'export'),
  async (req, res) => {
    // Logic export
    res.json({ success: true });
  }
);

// Admin only routes
router.get('/admin/stats',
  requireRole('ADMIN'),
  async (req, res) => {
    // Thống kê chỉ admin xem được
  }
);
```

### 2. 📡 Frontend API Calls

```javascript
// src/services/documentsAPI.js
import { authAPI } from './authAPI';

export const documentsAPI = {
  // GET với kiểm tra quyền
  async getDocuments() {
    try {
      const response = await authAPI.get('/api/documents');
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Bạn không có quyền xem tài liệu');
      }
      throw error;
    }
  },

  // POST với kiểm tra quyền
  async createDocument(documentData) {
    try {
      const response = await authAPI.post('/api/documents', documentData);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Bạn không có quyền tạo tài liệu');
      }
      throw error;
    }
  },

  // DELETE với kiểm tra quyền
  async deleteDocument(id) {
    try {
      const response = await authAPI.delete(`/api/documents/${id}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error('Bạn không có quyền xóa tài liệu');
      }
      throw error;
    }
  }
};

// Sử dụng trong component:
function DocumentsPage() {
  const { hasPermission } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDocuments = async () => {
    if (!hasPermission('documents', 'view')) {
      setError('Bạn không có quyền xem tài liệu');
      return;
    }

    try {
      setLoading(true);
      const data = await documentsAPI.getDocuments();
      setDocuments(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (documentData) => {
    if (!hasPermission('documents', 'create')) {
      alert('Bạn không có quyền tạo tài liệu');
      return;
    }

    try {
      await documentsAPI.createDocument(documentData);
      loadDocuments(); // Reload danh sách
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!hasPermission('documents', 'delete')) {
      alert('Bạn không có quyền xóa tài liệu');
      return;
    }

    if (confirm('Bạn có chắc muốn xóa?')) {
      try {
        await documentsAPI.deleteDocument(id);
        loadDocuments(); // Reload danh sách
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {loading && <div>Đang tải...</div>}
      
      {/* Danh sách */}
      <DocumentList 
        documents={documents}
        onDelete={handleDelete}
        canEdit={hasPermission('documents', 'edit')}
        canDelete={hasPermission('documents', 'delete')}
      />
      
      {/* Nút tạo mới */}
      {hasPermission('documents', 'create') && (
        <CreateDocumentForm onSubmit={handleCreate} />
      )}
    </div>
  );
}
```

---

## 🐛 Debugging & Troubleshooting

### 1. 🔍 Debug Permission Issues

**Kiểm tra user có permissions gì:**

```javascript
// Trong browser console:
const user = JSON.parse(localStorage.getItem('user'));
console.log('User permissions:', user?.permissions);
console.log('User role:', user?.role);

// Hoặc trong component:
function DebugPermissions() {
  const { user, permissions } = useAuth();
  
  return (
    <div style={{ padding: '20px', background: '#f0f0f0' }}>
      <h3>Debug Permissions</h3>
      <p><strong>User:</strong> {user?.username}</p>
      <p><strong>Role:</strong> {user?.role?.name}</p>
      <p><strong>Permissions:</strong></p>
      <pre>{JSON.stringify(permissions, null, 2)}</pre>
    </div>
  );
}
```

**Backend logs:**

```javascript
// Trong middleware, thêm logs:
console.log('🔍 User permissions check:', {
  user: req.user?.username,
  role: req.user?.role?.name,
  requiredResource: resource,
  requiredAction: action,
  hasPermission: req.user.hasPermission(resource, action)
});
```

### 2. ⚠️ Common Issues

**❌ "Role undefined" errors:**
```bash
# Chạy fix user roles:
cd backend
node scripts/fix-user-roles.js
```

**❌ Permissions not updating:**
```bash
# Re-seed permissions:
cd backend
node update-permissions.js
```

**❌ Token expired:**
```javascript
// Force logout và login lại:
localStorage.removeItem('token');
localStorage.removeItem('user');
window.location.reload();
```

### 3. 🧪 Testing Permissions

**Test script:**

```javascript
// backend/test-permissions.js
const { hasPermission } = require('./src/utils/permissionUtils');

async function testPermissions() {
  const testCases = [
    { role: 'ADMIN', resource: 'documents', action: 'create', expected: true },
    { role: 'CSKH', resource: 'documents', action: 'delete', expected: false },
    { role: 'FK', resource: 'financial_management', action: 'edit', expected: true }
  ];

  for (const test of testCases) {
    const result = await hasPermission(test.role, test.resource, test.action);
    console.log(`${test.role} ${test.resource}.${test.action}: ${result} (expected: ${test.expected})`);
  }
}
```

---

## 📚 Quick Reference

### Hooks có sẵn:
```javascript
const { 
  user,                           // User object
  isAuthenticated,               // Boolean
  isAdmin,                       // Boolean
  hasPermission,                 // Function(resource, action)
  isRole,                        // Function(roleName)
  login,                         // Function
  logout                         // Function
} = useAuth();
```

### Middleware có sẵn:
```javascript
const {
  attachUser,                    // Đính kèm user vào request
  requireRole,                   // Yêu cầu role cụ thể
  requirePermission,             // Yêu cầu permission cụ thể
  requireAdmin,                  // Chỉ admin
  optionalAuth                   // Không bắt buộc đăng nhập
} = require('./src/middleware/auth');
```

### Components có sẵn:
```javascript
<ProtectedRoute requiredRole="ADMIN">
<AccessControl permission="documents.edit">
<TokenExpiredNotice />
```

---

## 🎯 Best Practices

1. **Luôn kiểm tra quyền ở cả Frontend và Backend**
2. **Sử dụng meaningful permission names**: `documents.create` thay vì `doc_c`
3. **Group permissions theo resources**: Dễ quản lý hơn
4. **Fallback gracefully**: Hiển thị thông báo thân thiện khi không có quyền
5. **Test thoroughly**: Test cả positive và negative cases
6. **Log permission checks**: Để debug dễ dàng
7. **Keep permissions granular**: Tốt hơn nhiều permissions nhỏ hơn ít permissions lớn

---

*📝 Document này được cập nhật lần cuối: $(date)*
*🔗 Liên hệ: Team Dev Moonne*
