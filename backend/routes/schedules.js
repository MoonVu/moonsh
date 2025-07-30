const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const User = require('../models/User');

// Lấy tất cả schedules theo tháng/năm
router.get('/monthly/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    const schedules = await Schedule.find({ 
      month: parseInt(month), 
      year: parseInt(year) 
    }).populate('waiting', 'username group_name')
    .populate('shifts.users.userId', 'username group_name');
    
    // Cleanup null users sau khi populate
    schedules.forEach(schedule => {
      if (schedule.shifts) {
        schedule.shifts.forEach(shift => {
          if (shift.users) {
            // Lọc bỏ users có userId null hoặc không hợp lệ (user đã bị xóa)
            shift.users = shift.users.filter(user => {
              if (!user || !user.userId) return false;
              // Kiểm tra nếu userId là object (đã populate) thì phải có _id
              if (typeof user.userId === 'object' && !user.userId._id) return false;
              return true;
            });
          }
        });
      }
      if (schedule.waiting) {
        // Lọc bỏ waiting users null hoặc không hợp lệ
        schedule.waiting = schedule.waiting.filter(user => {
          if (!user) return false;
          // Kiểm tra nếu user là object (đã populate) thì phải có _id
          if (typeof user === 'object' && !user._id) return false;
          return true;
        });
      }
    });
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lấy schedule theo group và tháng/năm
router.get('/group/:group/:month/:year', async (req, res) => {
  try {
    const { group, month, year } = req.params;
    let schedule = await Schedule.findOne({ 
      group, 
      month: parseInt(month), 
      year: parseInt(year) 
    }).populate('waiting', 'username group_name')
    .populate('shifts.users.userId', 'username group_name');
    
    if (!schedule) {
      return res.json({
        success: false,
        error: 'Schedule không tồn tại cho tháng này'
      });
    }
    
    // Cleanup null users sau khi populate
    if (schedule.shifts) {
      schedule.shifts.forEach(shift => {
        if (shift.users) {
          // Lọc bỏ users có userId null hoặc không hợp lệ (user đã bị xóa)
          shift.users = shift.users.filter(user => {
            if (!user || !user.userId) return false;
            // Kiểm tra nếu userId là object (đã populate) thì phải có _id
            if (typeof user.userId === 'object' && !user.userId._id) return false;
            return true;
          });
        }
      });
    }
    if (schedule.waiting) {
      // Lọc bỏ waiting users null hoặc không hợp lệ
      schedule.waiting = schedule.waiting.filter(user => {
        if (!user) return false;
        // Kiểm tra nếu user là object (đã populate) thì phải có _id
        if (typeof user === 'object' && !user._id) return false;
        return true;
      });
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tạo hoặc cập nhật schedule theo tháng/năm
router.post('/monthly', async (req, res) => {
  try {
    const { group, month, year, shifts, waiting } = req.body;
    
    let schedule = await Schedule.findOne({ 
      group, 
      month: parseInt(month), 
      year: parseInt(year) 
    });
    
    if (schedule) {
      // Cập nhật nếu đã tồn tại
      schedule.shifts = shifts || [];
      schedule.waiting = waiting || [];
      await schedule.save();
    } else {
      // Tạo mới nếu chưa tồn tại
      schedule = new Schedule({
        group,
        month: parseInt(month),
        year: parseInt(year),
        shifts: shifts || [],
        waiting: waiting || []
      });
      await schedule.save();
    }
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cập nhật shifts theo tháng/năm
router.put('/shifts/:group/:month/:year', async (req, res) => {
  try {
    const { group, month, year } = req.params;
    const { shifts } = req.body;
    
    // Sử dụng findOneAndUpdate với upsert để tự động tạo nếu chưa tồn tại
    const schedule = await Schedule.findOneAndUpdate(
      { 
        group, 
        month: parseInt(month), 
        year: parseInt(year) 
      },
      { 
        shifts: shifts || [],
        $setOnInsert: { waiting: [] } // Chỉ set waiting khi tạo mới
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    );
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cập nhật waiting theo tháng/năm
router.put('/waiting/:group/:month/:year', async (req, res) => {
  try {
    const { group, month, year } = req.params;
    const { waiting } = req.body;
    
    // Sử dụng findOneAndUpdate với upsert để tự động tạo nếu chưa tồn tại
    const schedule = await Schedule.findOneAndUpdate(
      { 
        group, 
        month: parseInt(month), 
        year: parseInt(year) 
      },
      { 
        waiting: waiting || [],
        $setOnInsert: { shifts: [] } // Chỉ set shifts khi tạo mới
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true 
      }
    );
    
    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Xóa schedule theo tháng/năm
router.delete('/:group/:month/:year', async (req, res) => {
  try {
    const { group, month, year } = req.params;
    
    const schedule = await Schedule.findOneAndDelete({ 
      group, 
      month: parseInt(month), 
      year: parseInt(year) 
    });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule không tồn tại'
      });
    }
    
    res.json({
      success: true,
      message: 'Đã xóa schedule thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Xóa user khỏi shifts của một nhóm (tất cả tháng)
router.delete('/:group/shifts/remove-user', async (req, res) => {
  try {
    const { group } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId là bắt buộc'
      });
    }
    
    // Tìm tất cả schedules của nhóm này và xóa user khỏi shifts
    const schedules = await Schedule.find({ group });
    let updatedCount = 0;
    
    for (const schedule of schedules) {
      let hasChanges = false;
      
      // Xóa user khỏi tất cả shifts
      if (schedule.shifts && Array.isArray(schedule.shifts)) {
        schedule.shifts.forEach(shift => {
          if (shift.users && Array.isArray(shift.users)) {
            const originalLength = shift.users.length;
            shift.users = shift.users.filter(user => 
              String(user.userId) !== String(userId)
            );
            if (shift.users.length !== originalLength) {
              hasChanges = true;
            }
          }
        });
      }
      
      if (hasChanges) {
        await schedule.save();
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Đã xóa user ${userId} khỏi shifts của nhóm ${group}`,
      updatedSchedules: updatedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Xóa user khỏi waiting list của một nhóm (tất cả tháng)
router.delete('/:group/waiting/remove-user', async (req, res) => {
  try {
    const { group } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId là bắt buộc'
      });
    }
    
    // Tìm tất cả schedules của nhóm này và xóa user khỏi waiting list
    const schedules = await Schedule.find({ group });
    let updatedCount = 0;
    
    for (const schedule of schedules) {
      if (schedule.waiting && Array.isArray(schedule.waiting)) {
        const originalLength = schedule.waiting.length;
        schedule.waiting = schedule.waiting.filter(id => 
          String(id) !== String(userId)
        );
        
        if (schedule.waiting.length !== originalLength) {
          await schedule.save();
          updatedCount++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Đã xóa user ${userId} khỏi waiting list của nhóm ${group}`,
      updatedSchedules: updatedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cleanup orphaned users trong shifts (xóa users không tồn tại)
router.post('/cleanup-orphaned-users', async (req, res) => {
  try {
    const { month, year } = req.body;
    
    // Lấy tất cả users hiện tại
    const allUsers = await User.find({}, '_id');
    const validUserIds = allUsers.map(u => u._id.toString());
    
    // Tìm tất cả schedules
    const query = {};
    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }
    
    const schedules = await Schedule.find(query);
    let cleanedCount = 0;
    
    for (const schedule of schedules) {
      let hasChanges = false;
      
      // Cleanup shifts
      if (schedule.shifts && Array.isArray(schedule.shifts)) {
        schedule.shifts.forEach(shift => {
          if (shift.users && Array.isArray(shift.users)) {
            const originalLength = shift.users.length;
            // Lọc bỏ null users và users không tồn tại
            shift.users = shift.users.filter(user => {
              if (!user || !user.userId) return false; // Lọc bỏ null
              const userId = user.userId?.toString() || user.userId;
              return validUserIds.includes(userId);
            });
            if (shift.users.length !== originalLength) {
              hasChanges = true;
              cleanedCount += (originalLength - shift.users.length);
            }
          }
        });
      }
      
      // Cleanup waiting list
      if (schedule.waiting && Array.isArray(schedule.waiting)) {
        const originalLength = schedule.waiting.length;
        // Lọc bỏ null và users không tồn tại
        schedule.waiting = schedule.waiting.filter(userId => {
          if (!userId) return false; // Lọc bỏ null
          const id = userId.toString();
          return validUserIds.includes(id);
        });
        if (schedule.waiting.length !== originalLength) {
          hasChanges = true;
          cleanedCount += (originalLength - schedule.waiting.length);
        }
      }
      
      if (hasChanges) {
        await schedule.save();
      }
    }
    
    res.json({
      success: true,
      message: `Đã cleanup ${cleanedCount} orphaned users`,
      cleanedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Force refresh và cleanup dữ liệu theo tháng/năm
router.post('/force-refresh/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    
    // Lấy tất cả users hiện tại
    const allUsers = await User.find({}, '_id username group_name');
    const validUserIds = allUsers.map(u => u._id.toString());
    
    // Tìm tất cả schedules của tháng/năm
    const schedules = await Schedule.find({ 
      month: parseInt(month), 
      year: parseInt(year) 
    });
    
    let updatedCount = 0;
    
    for (const schedule of schedules) {
      let hasChanges = false;
      
      // Cleanup và chuẩn hóa shifts
      if (schedule.shifts && Array.isArray(schedule.shifts)) {
        schedule.shifts.forEach(shift => {
          if (shift.users && Array.isArray(shift.users)) {
            const originalLength = shift.users.length;
            // Lọc bỏ null users và users không tồn tại
            shift.users = shift.users.filter(user => {
              if (!user || !user.userId) return false;
              const userId = user.userId?.toString() || user.userId;
              return validUserIds.includes(userId);
            });
            if (shift.users.length !== originalLength) {
              hasChanges = true;
            }
          }
        });
      }
      
      // Cleanup và chuẩn hóa waiting list
      if (schedule.waiting && Array.isArray(schedule.waiting)) {
        const originalLength = schedule.waiting.length;
        // Lọc bỏ null và users không tồn tại
        schedule.waiting = schedule.waiting.filter(userId => {
          if (!userId) return false;
          const id = userId.toString();
          return validUserIds.includes(id);
        });
        if (schedule.waiting.length !== originalLength) {
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        await schedule.save();
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Đã force refresh ${updatedCount} schedules cho tháng ${month}/${year}`,
      updatedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 