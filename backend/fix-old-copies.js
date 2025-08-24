// Script để cập nhật tất cả bản sao cũ để có notesData
const mongoose = require('mongoose');
require('dotenv').config();

// Kết nối database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const ScheduleCopy = require('./models/ScheduleCopy');

async function fixOldCopies() {
  try {
    console.log('🔍 Đang tìm các bản sao cũ không có notesData...');
    
    // Tìm tất cả bản sao không có notesData hoặc notesData là undefined
    const oldCopies = await ScheduleCopy.find({
      $or: [
        { notesData: { $exists: false } },
        { notesData: undefined },
        { notesData: null }
      ]
    });
    
    console.log(`📊 Tìm thấy ${oldCopies.length} bản sao cần cập nhật`);
    
    if (oldCopies.length === 0) {
      console.log('✅ Tất cả bản sao đã có notesData');
      return;
    }
    
    // Cập nhật từng bản sao
    for (const copy of oldCopies) {
      console.log(`🔄 Đang cập nhật bản sao: ${copy.name} (ID: ${copy._id})`);
      
      copy.notesData = copy.notesData || {};
      await copy.save();
      
      console.log(`✅ Đã cập nhật: ${copy.name}`);
    }
    
    console.log('🎉 Hoàn thành cập nhật tất cả bản sao cũ!');
    
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật bản sao cũ:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối database');
  }
}

// Chạy script
fixOldCopies();




