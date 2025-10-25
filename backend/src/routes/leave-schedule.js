const express = require('express');
const router = express.Router();
const LeaveSchedule = require('../../models/LeaveSchedule');
const { authorize } = require('../middleware/authorize');
const { attachPermissions } = require('../middleware/attachPermissions');
const { authJWT } = require('../middleware/authOptimized'); // Import từ authOptimized

// Middleware để kiểm tra quyền
const requireViewPermission = authorize('leave-schedule', 'view');
const requireEditPermission = authorize('leave-schedule', 'edit');
const requireDeletePermission = authorize('leave-schedule', 'delete');

// GET /api/leave-schedule - Lấy danh sách lịch về phép
router.get('/', authJWT, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      department, 
      status, 
      leaveType,
      arrangementType,
      search 
    } = req.query;

    // Xây dựng filter
    const filter = {};
    
    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (leaveType) {
      filter.leaveType = leaveType;
    }
    
    if (arrangementType) {
      filter.arrangementType = arrangementType;
    }
    
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Tính toán pagination
    const skip = (page - 1) * limit;
    
    // Lấy dữ liệu với populate
    const leaveSchedules = await LeaveSchedule.find(filter)
      .populate('employeeId', 'username fullName email')
      .populate('createdBy', 'username fullName')
      .populate('updatedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số records
    const total = await LeaveSchedule.countDocuments(filter);

    res.json({
      success: true,
      data: leaveSchedules,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leave schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách lịch về phép',
      error: error.message
    });
  }
});

// GET /api/leave-schedule/:id - Lấy chi tiết một lịch về phép
router.get('/:id', requireViewPermission, async (req, res) => {
  try {
    const leaveSchedule = await LeaveSchedule.findById(req.params.id)
      .populate('employeeId', 'username fullName email')
      .populate('createdBy', 'username fullName')
      .populate('updatedBy', 'username fullName');

    if (!leaveSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch về phép'
      });
    }

    res.json({
      success: true,
      data: leaveSchedule
    });
  } catch (error) {
    console.error('Error fetching leave schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thông tin lịch về phép',
      error: error.message
    });
  }
});

// POST /api/leave-schedule - Tạo mới lịch về phép
router.post('/', authJWT, async (req, res) => {
  try {
    const {
      employeeId,
      department,
      employeeName,
      nextLeaveDate,
      leaveStartDate,
      leaveEndDate,
      returnDate,
      leaveDays,
      leaveType,
      arrangementType,
      notes
    } = req.body;

    // Validation cơ bản
    if (!department || !employeeName || !nextLeaveDate || 
        !leaveStartDate || !leaveEndDate || !returnDate || !leaveType || !arrangementType) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc'
      });
    }

    // Tính toán leaveDays nếu không được gửi từ frontend
    let calculatedLeaveDays = leaveDays;
    if (!calculatedLeaveDays || calculatedLeaveDays <= 0) {
      if (leaveType === 'Phép 6 tháng') {
        calculatedLeaveDays = 17;
      } else {
        // Tính số ngày nghỉ phép cho việc riêng
        const start = new Date(leaveStartDate);
        const end = new Date(leaveEndDate);
        const diffTime = Math.abs(end - start);
        calculatedLeaveDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    // Validation leaveDays
    if (calculatedLeaveDays < 1 || calculatedLeaveDays > 17) {
      return res.status(400).json({
        success: false,
        message: 'Số ngày nghỉ phép phải từ 1 đến 17 ngày'
      });
    }

    // Kiểm tra ngày hợp lý
    if (new Date(leaveStartDate) >= new Date(leaveEndDate)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu phải trước ngày kết thúc'
      });
    }

    if (new Date(leaveEndDate) >= new Date(returnDate)) {
      return res.status(400).json({
        success: false,
        message: 'Ngày kết thúc phép phải trước ngày quay lại làm việc'
      });
    }

    // Tạo lịch về phép mới
    const newLeaveSchedule = new LeaveSchedule({
      employeeId,
      department,
      employeeName,
      nextLeaveDate,
      leaveStartDate,
      leaveEndDate,
      returnDate,
      leaveDays: calculatedLeaveDays, // Sử dụng số ngày đã tính toán
      leaveType,
      arrangementType,
      notes,
      createdBy: req.user.id
    });

    await newLeaveSchedule.save();

    // Populate thông tin để trả về
    await newLeaveSchedule.populate([
      { path: 'employeeId', select: 'username fullName email' },
      { path: 'createdBy', select: 'username fullName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Tạo lịch về phép thành công',
      data: newLeaveSchedule
    });
  } catch (error) {
    console.error('Error creating leave schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tạo lịch về phép',
      error: error.message
    });
  }
});

// PUT /api/leave-schedule/:id - Cập nhật lịch về phép
router.put('/:id', requireEditPermission, async (req, res) => {
  try {
    const {
      department,
      employeeName,
      nextLeaveDate,
      leaveStartDate,
      leaveEndDate,
      returnDate,
      leaveDays,
      leaveType,
      arrangementType,
      status,
      notes
    } = req.body;

    const leaveSchedule = await LeaveSchedule.findById(req.params.id);
    
    if (!leaveSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch về phép'
      });
    }

    // Tính toán leaveDays nếu không được gửi từ frontend
    let calculatedLeaveDays = leaveDays;
    if (!calculatedLeaveDays || calculatedLeaveDays <= 0) {
      if (leaveType === 'Phép 6 tháng') {
        calculatedLeaveDays = 17;
      } else {
        // Tính số ngày nghỉ phép cho việc riêng
        const start = new Date(leaveStartDate);
        const end = new Date(leaveEndDate);
        const diffTime = Math.abs(end - start);
        calculatedLeaveDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    // Validation leaveDays
    if (calculatedLeaveDays < 1 || calculatedLeaveDays > 17) {
      return res.status(400).json({
        success: false,
        message: 'Số ngày nghỉ phép phải từ 1 đến 17 ngày'
      });
    }

    // Cập nhật thông tin
    Object.assign(leaveSchedule, {
      department,
      employeeName,
      nextLeaveDate,
      leaveStartDate,
      leaveEndDate,
      returnDate,
      leaveDays: calculatedLeaveDays, // Sử dụng số ngày đã tính toán
      leaveType,
      arrangementType,
      status,
      notes,
      updatedBy: req.user.id
    });

    await leaveSchedule.save();

    // Populate thông tin để trả về
    await leaveSchedule.populate([
      { path: 'employeeId', select: 'username fullName email' },
      { path: 'createdBy', select: 'username fullName' },
      { path: 'updatedBy', select: 'username fullName' }
    ]);

    res.json({
      success: true,
      message: 'Cập nhật lịch về phép thành công',
      data: leaveSchedule
    });
  } catch (error) {
    console.error('Error updating leave schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể cập nhật lịch về phép',
      error: error.message
    });
  }
});

// DELETE /api/leave-schedule/:id - Xóa lịch về phép
router.delete('/:id', requireDeletePermission, async (req, res) => {
  try {
    const leaveSchedule = await LeaveSchedule.findById(req.params.id);
    
    if (!leaveSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch về phép'
      });
    }

    await LeaveSchedule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Xóa lịch về phép thành công'
    });
  } catch (error) {
    console.error('Error deleting leave schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể xóa lịch về phép',
      error: error.message
    });
  }
});

// GET /api/leave-schedule/stats/summary - Thống kê tổng quan
router.get('/stats/summary', requireViewPermission, async (req, res) => {
  try {
    const stats = await LeaveSchedule.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await LeaveSchedule.countDocuments();
    
    const summary = {
      total,
      byStatus: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byType: await LeaveSchedule.aggregate([
        {
          $group: {
            _id: '$leaveType',
            count: { $sum: 1 }
          }
        }
      ])
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching leave schedule stats:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể tải thống kê lịch về phép',
      error: error.message
    });
  }
});

module.exports = router;
