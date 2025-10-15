const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const TelegramResponse = require('../models/TelegramResponse');

// Kết nối MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Moon';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Kết nối MongoDB thành công'))
.catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

async function cleanupOldImages() {
  try {
    console.log('🧹 Bắt đầu cleanup ảnh cũ...');
    
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 Thư mục uploads không tồn tại');
      return;
    }
    
    // Lấy tất cả files trong uploads
    const files = fs.readdirSync(uploadsDir);
    console.log(`📊 Tìm thấy ${files.length} files trong uploads`);
    
    // Lấy tất cả imageUrl đang được sử dụng trong database
    const bills = await TelegramResponse.find({}, 'imageUrl').lean();
    const usedImages = new Set();
    
    bills.forEach(bill => {
      if (bill.imageUrl) {
        const filename = path.basename(bill.imageUrl);
        usedImages.add(filename);
      }
    });
    
    console.log(`📊 Có ${usedImages.size} ảnh đang được sử dụng trong database`);
    
    // Xóa ảnh không được sử dụng và cũ hơn 30 ngày
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = stats.mtime;
      
      // Kiểm tra file có được sử dụng không
      const isUsed = usedImages.has(file);
      
      // Kiểm tra file có cũ hơn 30 ngày không
      const isOld = fileAge < thirtyDaysAgo;
      
      if (!isUsed && isOld) {
        try {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Đã xóa: ${file} (${fileAge.toISOString().split('T')[0]})`);
        } catch (error) {
          console.error(`❌ Lỗi xóa file ${file}:`, error.message);
        }
      } else {
        keptCount++;
        if (isUsed) {
          console.log(`✅ Giữ lại: ${file} (đang được sử dụng)`);
        } else {
          console.log(`✅ Giữ lại: ${file} (chưa đủ 30 ngày)`);
        }
      }
    }
    
    console.log(`\n📊 Kết quả cleanup:`);
    console.log(`   - Đã xóa: ${deletedCount} files`);
    console.log(`   - Giữ lại: ${keptCount} files`);
    console.log(`   - Dung lượng tiết kiệm: ~${(deletedCount * 1).toFixed(2)}MB (ước tính 1MB/file)`);
    
  } catch (error) {
    console.error('❌ Lỗi cleanup:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

// Chạy cleanup
cleanupOldImages();


