const express = require('express');
const router = express.Router();
const requestService = require('../../services/requestService');
const { attachUser } = require('../middleware/auth');
const { attachPermissions } = require('../middleware/attachPermissions');
const { authorize } = require('../middleware/authorize');

// Middleware để kiểm tra quyền truy cập
const requireAuth = [attachUser, attachPermissions];

// Tạo request mới (user)
router.post('/', requireAuth, async (req, res) => {
  try {
    const requestData = {
      ...req.body,
      user_id: req.user.id
    };
    
    const request = await requestService.createRequest(requestData);
    
    res.status(201).json({
      success: true,
      message: 'Tạo request thành công',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Lấy danh sách request của user hiện tại
router.get('/my-requests', requireAuth, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      request_type: req.query.request_type,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };
    
    const requests = await requestService.getUserRequests(req.user.id, filters);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});



// Lấy tất cả request (admin only)
router.get('/', requireAuth, authorize('requests', 'view'), async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      request_type: req.query.request_type,
      user_id: req.query.user_id,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };
    
    const requests = await requestService.getAllRequests(filters);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Lấy chi tiết request
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await requestService.getRequestById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy request'
      });
    }
    
    // Kiểm tra quyền xem
    if (request.user_id.toString() !== req.user.id && req.user.roleString !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xem request này'
      });
    }
    
    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Cập nhật trạng thái request (admin only)
router.patch('/:id/status', requireAuth, authorize('requests', 'edit'), async (req, res) => {
  try {
    const { status, note } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái mới là bắt buộc'
      });
    }
    
    const request = await requestService.updateRequestStatus(
      req.params.id,
      status,
      req.user.id,
      note
    );
    
    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Cập nhật nội dung request (user chỉ có thể edit request của mình khi còn pending)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const request = await requestService.getRequestById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy request'
      });
    }
    
    // Kiểm tra quyền: chỉ có thể edit request của chính mình
    if (request.user_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền chỉnh sửa request này'
      });
    }
    
    // Chỉ cho phép edit khi status là pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể chỉnh sửa request đang chờ duyệt'
      });
    }
    
    // Cập nhật request
    const updatedRequest = await requestService.updateRequest(
      req.params.id,
      req.body
    );
    
    res.json({
      success: true,
      message: 'Cập nhật request thành công',
      data: updatedRequest
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Xóa request (chỉ khi còn pending)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await requestService.deleteRequest(
      req.params.id,
      req.user.id,
      req.user.roleString
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Lấy work schedule của user
router.get('/work-schedule/:userId?', requireAuth, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Kiểm tra quyền: chỉ có thể xem schedule của chính mình hoặc admin
    if (userId !== req.user.id && req.user.roleString !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xem work schedule này'
      });
    }
    
    const { date_from, date_to } = req.query;
    const schedules = await requestService.getUserWorkSchedule(userId, date_from, date_to);
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Cập nhật trạng thái request (phê duyệt/từ chối) - admin only
router.put('/:id/status', requireAuth, authorize('requests', 'edit'), async (req, res) => {
  try {
    const { status, admin_note } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'approved', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }
    
    // Cập nhật trạng thái request
    const updatedRequest = await requestService.updateRequestStatus(
      req.params.id,
      status,
      req.user.id,
      admin_note
    );
    
    res.json({
      success: true,
      message: `Đã cập nhật trạng thái request thành ${status}`,
      data: updatedRequest
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Lấy thống kê request (admin only)
router.get('/stats/overview', requireAuth, authorize('requests', 'view'), async (req, res) => {
  try {
    const filters = {
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      user_id: req.query.user_id
    };
    
    const stats = await requestService.getRequestStats(filters);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
