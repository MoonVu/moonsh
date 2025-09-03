const RequestReport = require('../models/RequestReport');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const DemoLichDiCa = require('../models/DemoLichDiCa'); // Thêm import DemoLichDiCa

class RequestService {
  // Tạo request mới
  async createRequest(requestData) {
    try {
      const request = new RequestReport(requestData);
      const savedRequest = await request.save();
      
      // Populate user info
      await savedRequest.populate('user', 'username group_name');
      
      return savedRequest;
    } catch (error) {
      throw new Error(`Lỗi tạo request: ${error.message}`);
    }
  }



  // Lấy danh sách request của user
  async getUserRequests(userId, filters = {}) {
    try {
      const query = { user_id: userId };
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.request_type) {
        query.request_type = filters.request_type;
      }
      
      if (filters.date_from || filters.date_to) {
        query.created_at = {};
        if (filters.date_from) {
          query.created_at.$gte = new Date(filters.date_from);
        }
        if (filters.date_to) {
          query.created_at.$lte = new Date(filters.date_to);
        }
      }
      
      const requests = await RequestReport.find(query)
        .populate('user', 'username group_name')
        .populate('processed_by', 'username')
        .sort({ created_at: -1 });
      
      return requests;
    } catch (error) {
      throw new Error(`Lỗi lấy danh sách request: ${error.message}`);
    }
  }

  // Lấy tất cả request (cho admin)
  async getAllRequests(filters = {}) {
    try {
      const query = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.request_type) {
        query.request_type = filters.request_type;
      }
      
      if (filters.user_id) {
        query.user_id = filters.user_id;
      }
      
      if (filters.date_from || filters.date_to) {
        query.created_at = {};
        if (filters.date_from) {
          query.created_at.$gte = new Date(filters.date_from);
        }
        if (filters.date_to) {
          query.created_at.$lte = new Date(filters.date_to);
        }
      }
      
      const requests = await RequestReport.find(query)
        .populate('user', 'username group_name groupCode')
        .populate('processed_by', 'username')
        .sort({ created_at: -1 });
      
      return requests;
    } catch (error) {
      throw new Error(`Lỗi lấy tất cả request: ${error.message}`);
    }
  }

  // Cập nhật trạng thái request (admin) - DEPRECATED, sử dụng function bên dưới
  async updateRequestStatus(requestId, newStatus, adminId, note = '') {
    try {
      const request = await RequestReport.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy request');
      }
      
      // Cập nhật trạng thái
      await request.updateStatus(newStatus, adminId, note);
      
      // Nếu request được duyệt, tạo work schedule và cập nhật lịch đi ca
      if (newStatus === 'approved') {
        await this.createWorkScheduleFromRequest(request);
        await this.updateDemoLichDiCaFromRequest(request); // Thêm function mới
      }
      
      // Populate lại thông tin
      await request.populate('user', 'username group_name');
      await request.populate('processed_by', 'username');
      
      return request;
    } catch (error) {
      throw new Error(`Lỗi cập nhật trạng thái request: ${error.message}`);
    }
  }

  // Tạo work schedule từ request đã duyệt
  async createWorkScheduleFromRequest(request) {
    try {
      // Kiểm tra xem đã có work schedule cho ngày này chưa
      const existingSchedule = await WorkSchedule.findOne({
        user_id: request.user_id,
        date: request.metadata.date || request.metadata.from_date
      });
      
      if (existingSchedule) {
        // Cập nhật schedule hiện tại
        existingSchedule.status = WorkSchedule.mapRequestTypeToStatus(request.request_type);
        existingSchedule.note = request.description;
        existingSchedule.request_id = request._id;
        existingSchedule.approved_by = request.processed_by;
        existingSchedule.approved_at = request.processed_at;
        existingSchedule.metadata = WorkSchedule.extractMetadata(request);
        
        return await existingSchedule.save();
      } else {
        // Tạo schedule mới
        return await WorkSchedule.createFromRequest(request);
      }
    } catch (error) {
      throw new Error(`Lỗi tạo work schedule: ${error.message}`);
    }
  }

  // Lấy work schedule của user
  async getUserWorkSchedule(userId, dateFrom, dateTo) {
    try {
      const query = { user_id: userId };
      
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) {
          query.date.$gte = new Date(dateFrom);
        }
        if (dateTo) {
          query.date.$lte = new Date(dateTo);
        }
      }
      
      const schedules = await WorkSchedule.find(query)
        .populate('user', 'username group_name')
        .populate('request', 'content description')
        .populate('approved_by', 'username')
        .sort({ date: 1 });
      
      return schedules;
    } catch (error) {
      throw new Error(`Lỗi lấy work schedule: ${error.message}`);
    }
  }

  // Lấy thống kê request
  async getRequestStats(filters = {}) {
    try {
      const matchStage = {};
      
      if (filters.date_from || filters.date_to) {
        matchStage.created_at = {};
        if (filters.date_from) {
          matchStage.created_at.$gte = new Date(filters.date_from);
        }
        if (filters.date_to) {
          matchStage.created_at.$lte = new Date(filters.date_to);
        }
      }
      
      if (filters.user_id) {
        matchStage.user_id = filters.user_id;
      }
      
      const stats = await RequestReport.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              status: '$status',
              request_type: '$request_type'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.status',
            types: {
              $push: {
                request_type: '$_id.request_type',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        }
      ]);
      
      return stats;
    } catch (error) {
      throw new Error(`Lỗi lấy thống kê: ${error.message}`);
    }
  }

  // Lấy request theo ID
  async getRequestById(requestId) {
    try {
      const request = await RequestReport.findById(requestId)
        .populate('user', 'username group_name groupCode')
        .populate('processed_by', 'username');
      
      return request;
    } catch (error) {
      throw new Error(`Lỗi lấy request: ${error.message}`);
    }
  }

  // Xóa request (chỉ khi còn pending)
  async deleteRequest(requestId, userId, userRole) {
    try {
      const request = await RequestReport.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy request');
      }
      
      if (!request.canEdit(userId, userRole)) {
        throw new Error('Không có quyền xóa request này');
      }
      
      await RequestReport.findByIdAndDelete(requestId);
      return { message: 'Đã xóa request thành công' };
    } catch (error) {
      throw new Error(`Lỗi xóa request: ${error.message}`);
    }
  }

  // Cập nhật nội dung request
  async updateRequest(requestId, updateData) {
    try {
      const request = await RequestReport.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy request');
      }
      
      // Cập nhật các trường được phép
      if (updateData.description !== undefined) {
        request.description = updateData.description;
      }
      
      if (updateData.metadata) {
        request.metadata = {
          ...request.metadata,
          ...updateData.metadata
        };
      }
      
      // Cập nhật thời gian
      request.updated_at = new Date();
      
      const updatedRequest = await request.save();
      
      // Populate user info
      await updatedRequest.populate('user', 'username group_name groupCode');
      
      return updatedRequest;
    } catch (error) {
      throw new Error(`Lỗi cập nhật request: ${error.message}`);
    }
  }

  // Cập nhật trạng thái request (phê duyệt/từ chối) - FUNCTION CHÍNH
  async updateRequestStatus(requestId, newStatus, adminId, adminNote = '') {
    try {
      const request = await RequestReport.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy request');
      }
      
      // Cập nhật trạng thái
      request.status = newStatus;
      request.processed_by = adminId;
      request.processed_at = new Date();
      
      // Cập nhật ghi chú admin nếu có
      if (adminNote) {
        request.admin_note = adminNote;
      }
      
      // Cập nhật thời gian
      request.updated_at = new Date();
      
      const updatedRequest = await request.save();
      
      // Nếu request được duyệt, cập nhật lịch đi ca
      if (newStatus === 'approved') {
        try {
          await this.updateDemoLichDiCaFromRequest(request);
        } catch (demoError) {
          // Không throw error để không ảnh hưởng đến việc phê duyệt request
        }
      }
      
      // Populate user info
      await updatedRequest.populate('user', 'username group_name groupCode');
      await updatedRequest.populate('processed_by', 'username');
      
      return updatedRequest;
    } catch (error) {
      throw new Error(`Lỗi cập nhật trạng thái request: ${error.message}`);
    }
  }

  // Function mới: Cập nhật DemoLichDiCa/ScheduleCopy khi request được duyệt
  async updateDemoLichDiCaFromRequest(request) {
    try {
      const fromDate = request.metadata?.from_date;
      const toDate = request.metadata?.to_date;

      if (!fromDate) {
        return;
      }

      const startDate = new Date(fromDate);
      const month = startDate.getMonth() + 1;
      const year = startDate.getFullYear();
      const userId = request.user_id.toString();

      // Phân chia theo loại request
      if (request.request_type === 'monthly_off') {
        // Cập nhật DemoLichDiCa cho monthly_off (OFF)
        await this.updateDemoLichDiCa(userId, month, year, startDate, toDate, 'OFF');
      } else if (request.request_type === 'half_day_off') {
        // Cập nhật ScheduleCopy cho half_day_off (1/2)
        await this.updateScheduleCopy(userId, month, year, startDate, toDate, '1/2');
      }

    } catch (error) {
      // Silent error để không ảnh hưởng đến việc phê duyệt request
    }
  }

  // Cập nhật DemoLichDiCa cho monthly_off
  async updateDemoLichDiCa(userId, month, year, startDate, toDate, status) {
    try {
      // Tìm hoặc tạo mới bản ghi DemoLichDiCa
      let demoLich = await DemoLichDiCa.findOne({ userId, month, year });

      if (!demoLich) {
        demoLich = new DemoLichDiCa({
          userId,
          month,
          year,
          dailyStatus: {}
        });
      }

      // Giữ dữ liệu cũ - đảm bảo là Object
      const oldData = demoLich.dailyStatus || {};

      // Cập nhật từng ngày
      if (toDate && toDate !== startDate) {
        const endDate = new Date(toDate);
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const day = currentDate.getDate();
          oldData[day.toString()] = status;
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        const day = startDate.getDate();
        oldData[day.toString()] = status;
      }

      demoLich.dailyStatus = oldData;
      demoLich.updatedAt = new Date();

      // BẮT BUỘC: mark field là modified
      demoLich.markModified('dailyStatus');

      await demoLich.save();
      
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật ScheduleCopy cho half_day_off
  async updateScheduleCopy(userId, month, year, startDate, toDate, status) {
    try {
      const ScheduleCopy = require('../models/ScheduleCopy');
      
      // Tìm tất cả ScheduleCopy trong tháng/năm này
      const scheduleCopies = await ScheduleCopy.find({
        month: month,
        year: year
      });

      if (scheduleCopies.length === 0) {
        return;
      }

      // Cập nhật tất cả bản sao
      for (const scheduleCopy of scheduleCopies) {
        // Giữ dữ liệu cũ
        const oldData = scheduleCopy.scheduleData[userId] || {};

        // Cập nhật từng ngày
        if (toDate && toDate !== startDate) {
          const endDate = new Date(toDate);
          const currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            const day = currentDate.getDate();
            oldData[day.toString()] = status;
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          const day = startDate.getDate();
          oldData[day.toString()] = status;
        }

        // Update trực tiếp bằng $set
        await ScheduleCopy.updateOne(
          { _id: scheduleCopy._id },
          { $set: { [`scheduleData.${userId}`]: oldData } }
        );
      }

    } catch (error) {
      // Silent error
    }
  }
}

module.exports = new RequestService();
