const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'Moon-secret-key';

// Cấu hình CORS cho production
const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép requests không có origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Danh sách origins được phép
    const allowedOrigins = [
      'http://localhost:3000',
      'http://172.16.1.6:3000',
      'http://172.16.1.6:5000'
    ];
    
    // Kiểm tra origin có trong danh sách cho phép không
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Kiểm tra IP range cho mạng LAN
    const clientIP = origin.replace(/^https?:\/\//, '').split(':')[0];
    if (clientIP.startsWith('172.16.') || clientIP.startsWith('192.168.')) {
      return callback(null, true);
    }
    
    // Log để debug
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Authorization', 'Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

// Kết nối MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Moon';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Kết nối MongoDB thành công'))
.catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// Import models
const User = require('./models/User');
const Task = require('./models/Task');
const Notification = require('./models/Notification');
const Seat = require('./models/Seat');
const ScheduleTab = require('./models/ScheduleTab');
const Schedule = require('./models/Schedule');
const DemoLichDiCa = require('./models/DemoLichDiCa');
const UserPosition = require('./models/UserPosition');
const ScheduleCopy = require('./models/ScheduleCopy');

// Import routes
const scheduleRoutes = require('./routes/schedules');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const usersRoutes = require('./src/routes/users');
const healthRoutes = require('./src/routes/health');
const rolesRoutes = require('./src/routes/roles');
const permissionsRoutes = require('./src/routes/permissions');

// Import new auth middleware
const { attachUser } = require('./src/middleware/auth');

// Legacy authentication middleware (deprecated - chỉ để compatibility)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.log('❌ Legacy token verification failed:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    try {
      // Handle both old and new token formats
      let user;
      if (decoded.userId) {
        // New format from authService - cần populate role từ database
        const fullUser = await User.findById(decoded.userId).populate('role');
        if (!fullUser) {
          return res.status(401).json({ error: 'User không tồn tại' });
        }
        user = {
          _id: fullUser._id,
          id: fullUser._id,
          username: fullUser.username,
          role: fullUser.role, // Populated role object
          groupCode: fullUser.groupCode,
          group_name: fullUser.group_name,
          status: fullUser.status
        };
      } else {
        // Old format from legacy login - cần populate role từ database
        const fullUser = await User.findById(decoded._id).populate('role');
        if (!fullUser) {
          return res.status(401).json({ error: 'User không tồn tại' });
        }
        user = {
          _id: fullUser._id,
          id: fullUser._id,
          username: fullUser.username,
          role: fullUser.role, // Populated role object thay vì string
          groupCode: fullUser.groupCode,
          group_name: fullUser.group_name,
          status: fullUser.status
        };
      }
      
      console.log('✅ Legacy middleware user:', { 
        id: user._id || user.id, 
        username: user.username, 
        role: user.role?._id,
        roleName: user.role?.name,
        hasRoleObject: !!user.role
      });
      req.user = user;
      next();
    } catch (dbError) {
      console.error('❌ Legacy middleware database error:', dbError);
      return res.status(500).json({ error: 'Lỗi xác thực database' });
    }
  });
};

// ==================== NEW AUTH SYSTEM ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);  
app.use('/api/health', healthRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);

// ==================== NEW RBAC ROUTES ====================
app.use('/api/me', require('./src/routes/me'));
app.use('/api/users-rbac', require('./src/routes/users-rbac'));

// ==================== LEGACY ROUTES ====================

// Legacy health check route đã được chuyển sang /api/health router

// LEGACY Login endpoint - Deprecated! Sử dụng /api/auth/login thay thế
app.post('/api/login', async (req, res) => {
  console.log('⚠️ Warning: Sử dụng legacy login endpoint. Vui lòng chuyển sang /api/auth/login');
  const { username, password } = req.body;
  try {
    // So sánh username không phân biệt hoa thường
    const user = await User.findOne({ username: { $regex: `^${username}$`, $options: 'i' } });
    if (!user) return res.status(401).json({ error: 'Tên đăng nhập không tồn tại' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Sai mật khẩu' });
    // Tạo token với role
    const token = jwt.sign(
      { 
        _id: user._id, 
        username: user.username, 
        group_name: user.group_name,
        role: user.role || 'FK',
        groupCode: user.groupCode 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ success: true, data: { message: 'Login successful', token, user } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  try {
    // Trong JWT, logout thường chỉ cần trả về success
    // Token sẽ được xóa ở phía client
    res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CRUD Task
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // Tất cả user đều có thể xem tất cả task
    const tasks = await Task.find({}).populate('assigned_to created_by');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assigned_to, priority, status } = req.body;
    const task = new Task({
      title,
      description,
      assigned_to,
      priority,
      status,
      created_by: req.user._id
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, assigned_to, priority, status } = req.body;
    const update = { title, description, assigned_to, priority, status };
    const task = await Task.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD Notification
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const notification = new Notification({ user: req.user._id, message });
    await notification.save();
    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { is_read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize demo data
app.post('/api/init-demo', (req, res) => {
  const demoUsers = [
    { username: 'admin', password: 'admin123', group_name: '' },
    { username: 'user1', password: 'user123', group_name: '' },
    { username: 'user2', password: 'user123', group_name: '' },
    { username: 'user3', password: 'user123', group_name: '' }
  ];

  const demoTasks = [
    { title: 'Kiểm tra báo cáo tháng', description: 'Xem xét báo cáo tài chính tháng 12', assigned_to: 'user1', priority: 'Cao' },
    { title: 'Cập nhật hệ thống', description: 'Cập nhật phiên bản mới của phần mềm', assigned_to: 'user2', priority: 'Trung bình' },
    { title: 'Họp team', description: 'Họp định kỳ tuần', assigned_to: 'user3', priority: 'Thấp' }
  ];

  // Insert demo users
  demoUsers.forEach(user => {
    const hashedPassword = bcrypt.hashSync(user.password, 10);
    const demoUser = new User({ username: user.username, password: hashedPassword, group_name: user.group_name });
    demoUser.save();
  });

  // Insert demo tasks
  demoTasks.forEach(task => {
    User.findById(req.user._id)
      .then(user => {
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        const demoTask = new user.tasks({ title: task.title, description: task.description, assigned_to: task.assigned_to, priority: task.priority });
        demoTask.save();
      })
      .catch(err => {
        res.status(500).json({ error: err.message });
      });
  });

  res.json({ message: 'Demo data initialized successfully' });
});

// Lấy danh sách user
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({});
    console.log('📊 /api/users returning:', users.length, 'users');
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('❌ /api/users error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tạo tài khoản mới
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { username, password, group_name, status, start_date } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      group_name,
      status,
      start_date
    });
    await user.save();
    res.json({ success: true, message: 'Tạo tài khoản thành công', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sửa user - MOVED TO /src/routes/users.js

// Xóa user
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Xóa thành công', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Đổi mật khẩu cho user hiện tại
app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Thiếu mật khẩu cũ hoặc mới.' });
    }
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Mật khẩu cũ không đúng.' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quản lý đổi mật khẩu cho user bất kỳ
app.put('/api/users/:id/password', authenticateToken, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'Thiếu mật khẩu mới.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy danh sách sơ đồ chỗ ngồi
app.get('/api/seats', authenticateToken, async (req, res) => {
  try {
    const seats = await Seat.find();
    res.json(seats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Thêm sơ đồ chỗ ngồi mới
app.post('/api/seats', authenticateToken, async (req, res) => {
  try {
    const seat = new Seat(req.body);
    await seat.save();
    res.status(201).json(seat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sửa sơ đồ chỗ ngồi
app.put('/api/seats/:id', authenticateToken, async (req, res) => {
  try {
    const seat = await Seat.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!seat) return res.status(404).json({ error: 'Seat not found' });
    res.json(seat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa sơ đồ chỗ ngồi
app.delete('/api/seats/:id', authenticateToken, async (req, res) => {
  try {
    await Seat.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa chỗ ngồi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy danh sách tab (Quản lý thấy tất cả, user chỉ thấy tab visible)
app.get('/api/schedule-tabs', authenticateToken, async (req, res) => {
  try {
    // Tất cả user đều có thể xem tất cả tab
    const tabs = await ScheduleTab.find({});
    res.json(tabs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo tab mới (DEMO tạo mặc định)
app.post('/api/schedule-tabs', authenticateToken, async (req, res) => {
  try {
    const { name, type, visible, data } = req.body;
    const tab = new ScheduleTab({
      name,
      type,
      visible: visible !== undefined ? visible : true,
      data: data || {},
      created_by: req.user._id || req.user.id
    });
    await tab.save();
    res.json({ success: true, message: 'Tạo tab thành công', tab });
  } catch (err) {
    console.error('❌ Lỗi khi tạo tab:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Sửa tab (đổi tên, đổi trạng thái visible, cập nhật data)
app.put('/api/schedule-tabs/:id', authenticateToken, async (req, res) => {
  try {
    const { name, visible, data } = req.body;
    const tab = await ScheduleTab.findByIdAndUpdate(
      req.params.id,
      { name, visible, data, updated_at: new Date() },
      { new: true, runValidators: true }
    );
    if (!tab) return res.status(404).json({ error: 'Tab không tồn tại' });
    res.json(tab);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa tab (không áp dụng cho DEMO)
app.delete('/api/schedule-tabs/:id', authenticateToken, async (req, res) => {
  try {
    const tab = await ScheduleTab.findById(req.params.id);
    if (!tab) return res.status(404).json({ error: 'Tab không tồn tại' });
    if (tab.type === 'demo') return res.status(400).json({ error: 'Không được xóa tab DEMO' });
    await tab.deleteOne();
    res.json({ message: 'Đã xóa tab thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SCHEDULE API ENDPOINTS ====================

// Schedule routes
app.get('/api/schedules', authenticateToken, async (req, res) => {
  try {
    const schedules = await Schedule.find({});
    res.json({ success: true, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/schedules/full
 * Trả về dữ liệu phân ca đã join thông tin user
 */
app.get('/api/schedules/full', authenticateToken, async (req, res) => {
  try {
    const schedules = await Schedule.find({}).lean();

    // Lấy toàn bộ danh sách users trước
    const users = await User.find({}).lean();

    // Tạo map userId -> userInfo
    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    // Gắn thông tin user vào schedules
    const enrichedSchedules = schedules.map(schedule => {
      const enrichedShifts = (schedule.shifts || []).map(shift => {
        const enrichedUsers = (shift.users || []).map(u => {
          const user = userMap[u.userId.toString()];
          return {
            userId: u.userId,
            name: user ? user.username || user.name : "Không tên",
            group_name: user ? user.group_name : "",
            note: u.note || ""
          };
        });
        return { ...shift, users: enrichedUsers };
      });

      return {
        group: schedule.group,
        shifts: enrichedShifts
      };
    });

    return res.json({ success: true, data: enrichedSchedules });
  } catch (err) {
    console.error('❌ Error fetching full schedules:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy schedule theo group
app.get('/api/schedules/:group', authenticateToken, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ group: req.params.group })
      .populate('shifts.users.userId waiting');
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule không tồn tại' });
    }
    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tạo hoặc cập nhật schedule cho group
app.post('/api/schedules/:group', authenticateToken, async (req, res) => {
  try {
    const { shifts, waiting } = req.body;
    const schedule = await Schedule.findOneAndUpdate(
      { group: req.params.group },
      { shifts, waiting },
      { new: true, upsert: true, runValidators: true }
    ).populate('shifts.users.userId waiting');
    
    res.json({ success: true, data: schedule, message: 'Schedule đã được cập nhật' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cập nhật shifts cho group
app.put('/api/schedules/:group/shifts', authenticateToken, async (req, res) => {
  try {
    const { shifts } = req.body;
    const schedule = await Schedule.findOneAndUpdate(
      { group: req.params.group },
      { shifts },
      { new: true, runValidators: true }
    ).populate('shifts.users.userId waiting');
    
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule không tồn tại' });
    }
    
    res.json({ success: true, data: schedule, message: 'Shifts đã được cập nhật' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cập nhật waiting list cho group
app.put('/api/schedules/:group/waiting', authenticateToken, async (req, res) => {
  try {
    const { waiting } = req.body;
    const schedule = await Schedule.findOneAndUpdate(
      { group: req.params.group },
      { waiting },
      { new: true, runValidators: true }
    ).populate('shifts.users.userId waiting');
    
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule không tồn tại' });
    }
    
    res.json({ success: true, data: schedule, message: 'Waiting list đã được cập nhật' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa schedule
app.delete('/api/schedules/:group', authenticateToken, async (req, res) => {
  try {
    const schedule = await Schedule.findOneAndDelete({ group: req.params.group });
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule không tồn tại' });
    }
    res.json({ success: true, message: 'Schedule đã được xóa' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== DEMO LỊCH ĐI CA API ====================

// Lấy trạng thái hàng ngày của nhân viên theo tháng/năm
app.get('/api/demo-lichdica', authenticateToken, async (req, res) => {
  try {
    const { month, year, userId } = req.query;
    
    if (userId) {
      // Lấy trạng thái của 1 nhân viên cụ thể
      const lich = await DemoLichDiCa.findOne({ userId, month: Number(month), year: Number(year) });
      res.json({ 
        success: true, 
        data: lich ? lich.dailyStatus : new Map() 
      });
    } else {
      // Lấy trạng thái của tất cả nhân viên trong tháng/năm
      const lichList = await DemoLichDiCa.find({ month: Number(month), year: Number(year) });
      const result = {};
      lichList.forEach(lich => {
        result[lich.userId] = lich.dailyStatus;
      });
      res.json({ success: true, data: result });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cập nhật trạng thái hàng ngày của nhân viên
app.post('/api/demo-lichdica', authenticateToken, async (req, res) => {
  try {
    const { userId, month, year, dailyStatus } = req.body;
    
    if (!userId || !month || !year || !dailyStatus) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thiếu tham số userId, month, year, dailyStatus' 
      });
    }

    // Tìm và cập nhật hoặc tạo mới
    const lich = await DemoLichDiCa.findOneAndUpdate(
      { userId, month: Number(month), year: Number(year) },
      { 
        userId, 
        month: Number(month), 
        year: Number(year), 
        dailyStatus: new Map(Object.entries(dailyStatus))
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ 
      success: true, 
      data: lich.dailyStatus,
      message: 'Trạng thái đã được cập nhật' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cập nhật trạng thái của 1 ngày cụ thể
app.put('/api/demo-lichdica/:userId/:day', authenticateToken, async (req, res) => {
  try {
    const { userId, day } = req.params;
    const { month, year, status } = req.body;
    
    if (!month || !year || status === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thiếu tham số month, year, status' 
      });
    }

    const lich = await DemoLichDiCa.findOneAndUpdate(
      { userId, month: Number(month), year: Number(year) },
      { 
        $set: { [`dailyStatus.${day}`]: status }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ 
      success: true, 
      data: lich.dailyStatus,
      message: 'Trạng thái ngày đã được cập nhật' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa lịch phân ca
app.delete('/api/demo-lichdica/:userId', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const lich = await DemoLichDiCa.findOneAndDelete({ 
      userId: req.params.userId, 
      month: Number(month), 
      year: Number(year) 
    });
    if (!lich) return res.status(404).json({ 
      success: false, 
      error: 'Không tìm thấy lịch phân ca' 
    });
    res.json({ success: true, message: 'Đã xóa lịch phân ca' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SCHEDULES THEO THÁNG API ====================

// Sử dụng routes cho schedules theo tháng
app.use('/api/schedules-monthly', authenticateToken, scheduleRoutes);

// ==================== ADDITIONAL USER MANAGEMENT API ====================

// Lấy thông tin user theo ID
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lấy tất cả users (alias cho /api/users)
app.get('/api/users-all', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa user khỏi group shifts
app.delete('/api/schedules/:group/shifts/:userId', authenticateToken, async (req, res) => {
  try {
    const { group, userId } = req.params;
    const schedule = await Schedule.findOne({ group });
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule không tồn tại' });
    }
    
    // Xóa user khỏi tất cả shifts
    schedule.shifts.forEach(shift => {
      shift.users = shift.users.filter(user => user.userId.toString() !== userId);
    });
    
    await schedule.save();
    res.json({ success: true, message: 'User đã được xóa khỏi shifts' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa user khỏi group waiting
app.delete('/api/schedules/:group/waiting/:userId', authenticateToken, async (req, res) => {
  try {
    const { group, userId } = req.params;
    const schedule = await Schedule.findOne({ group });
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule không tồn tại' });
    }
    
    // Xóa user khỏi waiting list
    schedule.waiting = schedule.waiting.filter(user => user.userId.toString() !== userId);
    
    await schedule.save();
    res.json({ success: true, message: 'User đã được xóa khỏi waiting list' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cleanup orphaned users (xóa users không còn tồn tại)
app.post('/api/cleanup-orphaned-users', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.body;
    const query = {};
    if (month && year) {
      query.month = Number(month);
      query.year = Number(year);
    }
    
    const schedules = await Schedule.find(query);
    const allUserIds = new Set();
    
    // Thu thập tất cả userId từ schedules
    schedules.forEach(schedule => {
      schedule.shifts.forEach(shift => {
        shift.users.forEach(user => {
          allUserIds.add(user.userId.toString());
        });
      });
      schedule.waiting.forEach(user => {
        allUserIds.add(user.userId.toString());
      });
    });
    
    // Kiểm tra users nào không tồn tại
    const existingUsers = await User.find({ _id: { $in: Array.from(allUserIds) } });
    const existingUserIds = new Set(existingUsers.map(u => u._id.toString()));
    const orphanedUserIds = Array.from(allUserIds).filter(id => !existingUserIds.has(id));
    
    res.json({ 
      success: true, 
      data: { orphanedUserIds, count: orphanedUserIds.length },
      message: `Tìm thấy ${orphanedUserIds.length} orphaned users` 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Force refresh schedules
app.post('/api/force-refresh-schedules', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thiếu tham số month và year' 
      });
    }
    
    // Có thể thêm logic refresh ở đây nếu cần
    res.json({ 
      success: true, 
      message: `Schedules cho tháng ${month}/${year} đã được refresh` 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== USER POSITION API ====================

// Lưu vị trí làm việc của user
app.post('/api/user-position', authenticateToken, async (req, res) => {
  try {
    const { page, scrollPosition, selectedTab, gridState, formData, componentState } = req.body;
    
    const positionData = {
      userId: req.user._id,
      page: page || '/',
      scrollPosition: scrollPosition || { x: 0, y: 0 },
      selectedTab: selectedTab || '',
      gridState: gridState || {},
      formData: formData || {},
      componentState: componentState || {},
      lastActivity: new Date()
    };

    // Tìm và cập nhật hoặc tạo mới
    const position = await UserPosition.findOneAndUpdate(
      { userId: req.user._id },
      positionData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ 
      success: true, 
      data: position,
      message: 'Vị trí đã được lưu' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy vị trí làm việc của user
app.get('/api/user-position', authenticateToken, async (req, res) => {
  try {
    const position = await UserPosition.findOne({ userId: req.user._id });
    
    if (!position) {
      return res.json({ 
        success: true, 
        data: {
          page: '/',
          scrollPosition: { x: 0, y: 0 },
          selectedTab: '',
          gridState: {},
          formData: {},
          componentState: {}
        }
      });
    }

    res.json({ 
      success: true, 
      data: position 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cập nhật vị trí làm việc của user
app.put('/api/user-position', authenticateToken, async (req, res) => {
  try {
    const { page, scrollPosition, selectedTab, gridState, formData, componentState } = req.body;
    
    const updateData = {
      lastActivity: new Date()
    };

    if (page !== undefined) updateData.page = page;
    if (scrollPosition !== undefined) updateData.scrollPosition = scrollPosition;
    if (selectedTab !== undefined) updateData.selectedTab = selectedTab;
    if (gridState !== undefined) updateData.gridState = gridState;
    if (formData !== undefined) updateData.formData = formData;
    if (componentState !== undefined) updateData.componentState = componentState;

    const position = await UserPosition.findOneAndUpdate(
      { userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!position) {
      return res.status(404).json({ 
        success: false, 
        error: 'Không tìm thấy vị trí của user' 
      });
    }

    res.json({ 
      success: true, 
      data: position,
      message: 'Vị trí đã được cập nhật' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xóa vị trí làm việc của user
app.delete('/api/user-position', authenticateToken, async (req, res) => {
  try {
    const position = await UserPosition.findOneAndDelete({ userId: req.user._id });
    
    if (!position) {
      return res.status(404).json({ 
        success: false, 
        error: 'Không tìm thấy vị trí của user' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Vị trí đã được xóa' 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lấy vị trí của tất cả users
app.get('/api/user-positions', authenticateToken, async (req, res) => {
  try {
    const positions = await UserPosition.find({})
      .populate('user_id', 'username group_name')
      .populate('seat_id', 'name position');
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API endpoints cho Seat (vị trí chỗ ngồi)
app.get('/api/seat', async (req, res) => {
  try {
    let seat = await Seat.findOne().sort({ createdAt: -1 });
    if (!seat) {
      // Tạo dữ liệu mặc định nếu chưa có
      seat = new Seat({
        grid: [
          [ { name: "FK OWEN", group: "" }, { name: "FK GIGI", group: "" }, { name: "FK ANGEL", group: "" }, null ],
          [ { name: "TT TEDDY", group: "" }, null, null, null ],
          [ null, null, null, null ],
        ],
        tagList: [],
        walkwayColIndexes: []
      });
      await seat.save();
    }
    if (seat.grid) {
      seat.grid.forEach((row, rowIdx) => {
        if (Array.isArray(row)) {
          row.forEach((cell, colIdx) => {
            if (cell && cell.type === 'walkway-vertical') {
            }
          });
        }
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        grid: seat.grid,
        tagList: seat.tagList,
        walkwayColIndexes: seat.walkwayColIndexes,
        walkwayRowIndexes: seat.walkwayRowIndexes,
        version: seat.version,
        lastModifiedBy: seat.lastModifiedBy,
        lastModifiedAt: seat.lastModifiedAt
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu seat:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/seat', async (req, res) => {
  try {
    const { grid, tagList, walkwayColIndexes, walkwayRowIndexes, modifiedBy } = req.body;
    
    let seat = await Seat.findOne().sort({ createdAt: -1 });
    if (seat) {
      
      seat.grid = grid;
      seat.tagList = tagList || [];
      seat.walkwayColIndexes = walkwayColIndexes || [];
      seat.walkwayRowIndexes = walkwayRowIndexes || [];
      seat.lastModifiedBy = modifiedBy || '';
      await seat.save();
    } else {
      
      seat = new Seat({
        grid,
        tagList: tagList || [],
        walkwayColIndexes: walkwayColIndexes || [],
        walkwayRowIndexes: walkwayRowIndexes || [],
        lastModifiedBy: modifiedBy || ''
      });
      await seat.save();
    }
    

    if (seat.grid) {
      seat.grid.forEach((row, rowIdx) => {
        if (Array.isArray(row)) {
          row.forEach((cell, colIdx) => {
            if (cell && cell.type === 'walkway-vertical') {
            }
          });
        }
      });
    }
    
    res.json({ 
      success: true, 
      data: {
        grid: seat.grid,
        tagList: seat.tagList,
        walkwayColIndexes: seat.walkwayColIndexes,
        walkwayRowIndexes: seat.walkwayRowIndexes,
        version: seat.version,
        lastModifiedBy: seat.lastModifiedBy,
        lastModifiedAt: seat.lastModifiedAt
      }
    });
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu seat:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.get('/api/seat/version', async (req, res) => {
  try {
    const seat = await Seat.findOne().sort({ createdAt: -1 });
    res.json({ 
      success: true, 
      version: seat?.version || 0,
      lastModifiedAt: seat?.lastModifiedAt,
      lastModifiedBy: seat?.lastModifiedBy
    });
  } catch (error) {
    console.error('Lỗi khi lấy version seat:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==================== SCHEDULE COPY API ====================

// Tạo bản sao lịch đi ca
app.post('/api/schedule-copy', authenticateToken, async (req, res) => {
  try {
    const { month, year, name, scheduleData, phanCa, description, tags } = req.body;
    
    if (!month || !year || !name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thiếu tham số month, year hoặc name' 
      });
    }

    // Tạo bản sao mới
    const scheduleCopy = new ScheduleCopy({
      name,
      month: Number(month),
      year: Number(year),
      scheduleData: new Map(Object.entries(scheduleData || {})),
      phanCa: phanCa || {},
      createdBy: req.user._id,
      description: description || '',
      tags: tags || []
    });

    await scheduleCopy.save();

    res.json({ 
      success: true, 
      message: 'Đã tạo bản sao thành công',
      data: scheduleCopy.getBasicInfo()
    });
  } catch (err) {
    console.error('❌ Lỗi khi tạo bản sao:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Lấy danh sách bản sao
app.get('/api/schedule-copy', authenticateToken, async (req, res) => {
  try {
    const { month, year, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (month && year) {
      query.month = Number(month);
      query.year = Number(year);
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const copies = await ScheduleCopy.find(query)
      .populate('createdBy', 'username group_name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ScheduleCopy.countDocuments(query);

    res.json({ 
      success: true, 
      data: copies.map(copy => copy.getBasicInfo()),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách bản sao:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Lấy chi tiết bản sao
app.get('/api/schedule-copy/:id', authenticateToken, async (req, res) => {
  try {
    const copy = await ScheduleCopy.findById(req.params.id)
      .populate('createdBy', 'username group_name');
    
    if (!copy) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bản sao không tồn tại' 
      });
    }

    res.json({ 
      success: true, 
      data: copy
    });
  } catch (err) {
    console.error('❌ Lỗi khi lấy chi tiết bản sao:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Cập nhật bản sao lịch đi ca
app.put('/api/schedule-copy/:id', authenticateToken, async (req, res) => {
  try {
    const { month, year, name, scheduleData, phanCa, description, tags } = req.body;
    
    const copy = await ScheduleCopy.findById(req.params.id);
    if (!copy) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bản sao không tồn tại' 
      });
    }

    // Cập nhật dữ liệu
    if (month !== undefined) copy.month = Number(month);
    if (year !== undefined) copy.year = Number(year);
    if (name !== undefined) copy.name = name;
    if (scheduleData !== undefined) copy.scheduleData = new Map(Object.entries(scheduleData));
    if (phanCa !== undefined) copy.phanCa = phanCa;
    if (description !== undefined) copy.description = description;
    if (tags !== undefined) copy.tags = tags;

    await copy.save();

    res.json({ 
      success: true, 
      message: 'Đã cập nhật bản sao thành công',
      data: copy.getBasicInfo()
    });
  } catch (err) {
    console.error('❌ Lỗi khi cập nhật bản sao:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Xóa bản sao
app.delete('/api/schedule-copy/:id', authenticateToken, async (req, res) => {
  try {
    const copy = await ScheduleCopy.findByIdAndDelete(req.params.id);
    
    if (!copy) {
      return res.status(404).json({ 
        success: false, 
        error: 'Bản sao không tồn tại' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Đã xóa bản sao thành công',
      data: copy.getBasicInfo()
    });
  } catch (err) {
    console.error('❌ Lỗi khi xóa bản sao:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint không tồn tại' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Moon Backend Server đang chạy trên port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Origins: ${process.env.CORS_ORIGIN || 'http://localhost:3000, http://172.16.1.6:5000'}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 LAN Access: http://172.16.1.6:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Tắt máy chủ...');
  mongoose.connection.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
}); 