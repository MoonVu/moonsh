const mongoose = require('mongoose');

// Schema cho từng tin nhắn
const messageSchema = new mongoose.Schema({
  messageId: { type: Number, required: true },
  replyToMessageId: { type: Number },
  text: { type: String },
  from: {
    id: { type: Number },
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String }
  },
  timestamp: { type: Date, required: true }
}, { _id: false }); // Không tạo _id cho mỗi message

// Schema cho mỗi group conversation
const groupConversationSchema = new mongoose.Schema({
  chatId: { type: Number, required: true },
  groupName: { type: String, required: true },
  messages: { type: [messageSchema], default: [] }
}, { _id: false }); // Không tạo _id cho mỗi group

// Schema chính - 1 document cho mỗi bill
const billConversationSchema = new mongoose.Schema({
  billId: { type: String, required: true, unique: true, index: true }, // Mã đơn duy nhất
  groups: { type: [groupConversationSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'bill_conversations'
});

// Index để query nhanh
billConversationSchema.index({ billId: 1 });

module.exports = mongoose.model('BillConversation', billConversationSchema);

