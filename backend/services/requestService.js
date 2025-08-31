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
      console.log('🔄 updateRequestStatus được gọi với:', {
        requestId,
        newStatus,
        adminId,
        adminNote
      });

      const request = await RequestReport.findById(requestId);
      if (!request) {
        throw new Error('Không tìm thấy request');
      }
      
      console.log('📋 Request tìm thấy:', {
        id: request._id,
        userId: request.user_id,
        requestType: request.request_type,
        status: request.status,
        fromDate: request.metadata?.from_date,
        toDate: request.metadata?.to_date
      });
      
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
      console.log('✅ Request đã được cập nhật trạng thái:', updatedRequest.status);
      
      // Nếu request được duyệt, cập nhật lịch đi ca
      if (newStatus === 'approved') {
        console.log('🎯 Request được duyệt, bắt đầu cập nhật DemoLichDiCa...');
        try {
          await this.updateDemoLichDiCaFromRequest(request);
          console.log('✅ DemoLichDiCa đã được cập nhật thành công');
        } catch (demoError) {
          console.error('❌ Lỗi khi cập nhật DemoLichDiCa:', demoError);
          // Không throw error để không ảnh hưởng đến việc phê duyệt request
        }
      }
      
      // Populate user info
      await updatedRequest.populate('user', 'username group_name groupCode');
      await updatedRequest.populate('processed_by', 'username');
      
      return updatedRequest;
    } catch (error) {
      console.error('❌ Lỗi trong updateRequestStatus:', error);
      throw new Error(`Lỗi cập nhật trạng thái request: ${error.message}`);
    }
  }

  // Function mới: Cập nhật ScheduleCopy khi request được duyệt
  async updateDemoLichDiCaFromRequest(request) {
    try {
      console.log('🔄 Đang cập nhật ScheduleCopy từ request đã duyệt:', {
        requestId: request._id,
        userId: request.user_id,
        requestType: request.request_type,
        fromDate: request.metadata.from_date,
        toDate: request.metadata.to_date
      });

      // Lấy thông tin ngày từ request
      const fromDate = request.metadata?.from_date;
      const toDate = request.metadata?.to_date;
      
      if (!fromDate) {
        console.log('⚠️ Request không có from_date, bỏ qua cập nhật ScheduleCopy');
        return;
      }

      // Xác định tháng và năm
      const startDate = new Date(fromDate);
      const month = startDate.getMonth() + 1; // getMonth() trả về 0-11
      const year = startDate.getFullYear();

      // Xác định trạng thái dựa trên loại request
      let status = '';
      
      switch (request.request_type) {
        case 'monthly_off':
          status = 'OFF';
          break;
        case 'half_day_off':
          status = '1/2';
          break;
        default:
          console.log('⚠️ Loại request chưa được hỗ trợ:', request.request_type);
          console.log('📝 Chỉ hỗ trợ monthly_off và half_day_off hiện tại');
          return; // Bỏ qua các loại request khác
      }

      console.log('📅 Thông tin cập nhật:', {
        month,
        year,
        status,
        requestType: request.request_type
      });

      // Tìm tất cả ScheduleCopy trong tháng/năm này
      const ScheduleCopy = require('../models/ScheduleCopy');
      
      const scheduleCopies = await ScheduleCopy.find({
        month: month,
        year: year
      });

      console.log(`🔍 Tìm thấy ${scheduleCopies.length} bản sao cho tháng ${month}/${year}`);
      
      if (scheduleCopies.length === 0) {
        console.log('⚠️ Không có bản sao nào cho tháng/năm này, không thể cập nhật');
        return;
      }

      // Cập nhật tất cả bản sao
      for (const scheduleCopy of scheduleCopies) {
        console.log(`🔄 Đang cập nhật bản sao: ${scheduleCopy.name}`);
        
        // Kiểm tra xem có scheduleData không
        if (!scheduleCopy.scheduleData || typeof scheduleCopy.scheduleData !== 'object') {
          console.log('⚠️ Bản sao không có scheduleData hợp lệ, bỏ qua');
          continue;
        }

        // Tìm user trong scheduleData
        const userId = request.user_id.toString();
        
        if (!scheduleCopy.scheduleData[userId]) {
          console.log(`⚠️ User ${userId} không có trong bản sao này, bỏ qua`);
          continue;
        }

        // Tạo mới dailyStatus thay vì cập nhật cũ
        let userDailyStatus = {};

        // Xử lý theo loại request
        if (toDate && toDate !== fromDate) {
          // Request có khoảng thời gian (nhiều ngày) - cho monthly_off và half_day_off
          const endDate = new Date(toDate);
          const currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            const day = currentDate.getDate();
            userDailyStatus[day.toString()] = status;
            
            // Tăng lên 1 ngày
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else {
          // Request chỉ 1 ngày
          const day = startDate.getDate();
          userDailyStatus[day.toString()] = status;
        }

        // Cập nhật scheduleData của user - Force MongoDB nhận ra thay đổi
        scheduleCopy.set(`scheduleData.${userId}`, userDailyStatus);
        scheduleCopy.markModified('scheduleData');
        
        console.log(`📅 Đã cập nhật user ${userId} với ${Object.keys(userDailyStatus).length} ngày`);
        
        // Lưu bản sao
        await scheduleCopy.save();
        console.log(`✅ Đã cập nhật bản sao ${scheduleCopy.name} thành công`);
      }

      console.log('✅ Đã cập nhật tất cả ScheduleCopy thành công');

    } catch (error) {
      console.error('❌ Lỗi khi cập nhật ScheduleCopy:', error);
      // Không throw error để không ảnh hưởng đến việc phê duyệt request
      // Chỉ log lỗi để debug
    }
  }
}

module.exports = new RequestService();
