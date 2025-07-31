const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

async function checkDragDropData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moonne');
    console.log('✅ Kết nối MongoDB thành công');

    // Kiểm tra collection schedules
    const schedules = await mongoose.connection.db.collection('schedules').find({}).limit(3).toArray();
    console.log('\n📊 SCHEDULES COLLECTION (dữ liệu drag & drop):');
    console.log('Số lượng documents:', schedules.length);
    
    if (schedules.length > 0) {
      console.log('\nDocument đầu tiên:');
      console.log(JSON.stringify(schedules[0], null, 2));
    }

    // Kiểm tra collection userpositions
    const userPositions = await mongoose.connection.db.collection('userpositions').find({}).limit(3).toArray();
    console.log('\n📊 USERPOSITIONS COLLECTION (vị trí làm việc):');
    console.log('Số lượng documents:', userPositions.length);
    
    if (userPositions.length > 0) {
      console.log('\nDocument đầu tiên:');
      console.log(JSON.stringify(userPositions[0], null, 2));
    }

    // Kiểm tra tất cả collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📋 TẤT CẢ COLLECTIONS:');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Đã đóng kết nối MongoDB');
  }
}

checkDragDropData(); 