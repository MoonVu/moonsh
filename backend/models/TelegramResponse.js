const mongoose = require('mongoose');

// Schema cho từng group trong bill
const groupStatusSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  messageId: { type: Number },
  groupName: { type: String, required: true },
  groupTelegramId: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'YES', 'NO', 'CHUA', 'KHONG', 'NHAN', 'CHUA_PROCESSED', 'NHAN_PROCESSED'],
    default: 'PENDING'
  },
  responseUserId: { type: Number },
  responseUserName: { type: String },
  responseType: { type: String }, // diem, chua_diem, khong_phai, chua_tien
  responseTimestamp: { type: Date },
  processor: { type: String }, // Người xử lý trạng thái
  processTime: { type: Date } // Thời gian xử lý
}, { _id: false });

// Schema chính cho bill
const telegramResponseSchema = new mongoose.Schema({
  billId: {
    type: String,
    required: true,
    unique: true, // billId duy nhất
    index: true
  },
  customer: { type: String },
  employee: { type: String },
  caption: { type: String },
  ocrText: { type: String },
  imageUrl: { type: String },
  createdBy: { type: String },
  groupType: { type: String },
  
  // Danh sách các nhóm đã gửi với trạng thái
  groups: [groupStatusSchema],
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'telegram_responses'
});

// Static method để lấy bill theo billId
telegramResponseSchema.statics.getBillByBillId = function(billId) {
  return this.findOne({ billId });
};

// Static method để lấy tất cả bills
telegramResponseSchema.statics.getAllBills = function() {
  return this.find({}).sort({ createdAt: -1 });
};

// Method để cập nhật trạng thái group
telegramResponseSchema.methods.updateGroupStatus = function(chatId, status, responseData = {}) {
  const group = this.groups.find(g => g.chatId === chatId);
  if (group) {
    group.status = status;
    if (responseData.userId) group.responseUserId = responseData.userId;
    if (responseData.userName) group.responseUserName = responseData.userName;
    if (responseData.timestamp) group.responseTimestamp = responseData.timestamp;
    if (responseData.processor) group.processor = responseData.processor;
    if (responseData.processTime) group.processTime = responseData.processTime;
    this.updatedAt = new Date();
  }
  return this;
};

// Method để format cho frontend
telegramResponseSchema.methods.toFrontendFormat = function() {
  return {
    _id: this._id,
    billId: this.billId,
    customer: this.customer,
    employee: this.employee,
    caption: this.caption,
    imageUrl: this.imageUrl,
    createdBy: this.createdBy,
    groupType: this.groupType,
    groups: this.groups,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('TelegramResponse', telegramResponseSchema);