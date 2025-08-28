const mongoose = require('mongoose');

module.exports = {
  async up(db) {
    console.log('🔄 Bắt đầu migration: Tạo collections RequestReport và WorkSchedule');
    
    try {
      // Tạo collection RequestReport
      await db.createCollection('requestreports');
      console.log('✅ Đã tạo collection requestreports');
      
      // Tạo collection WorkSchedule
      await db.createCollection('workschedules');
      console.log('✅ Đã tạo collection workschedules');
      
      // Tạo indexes cho RequestReport
      await db.collection('requestreports').createIndex({ user_id: 1, created_at: -1 });
      await db.collection('requestreports').createIndex({ status: 1, created_at: -1 });
      await db.collection('requestreports').createIndex({ request_type: 1, status: 1 });
      await db.collection('requestreports').createIndex({ 'metadata.date': 1 });
      console.log('✅ Đã tạo indexes cho RequestReport');
      
      // Tạo indexes cho WorkSchedule
      await db.collection('workschedules').createIndex({ user_id: 1, date: 1 }, { unique: true });
      await db.collection('workschedules').createIndex({ date: 1, status: 1 });
      await db.collection('workschedules').createIndex({ user_id: 1, status: 1 });
      await db.collection('workschedules').createIndex({ 'metadata.leave_type': 1 });
      console.log('✅ Đã tạo indexes cho WorkSchedule');
      
      console.log('🎉 Migration hoàn thành thành công!');
      
    } catch (error) {
      console.error('❌ Lỗi trong migration:', error);
      throw error;
    }
  },

  async down(db) {
    console.log('🔄 Bắt đầu rollback migration');
    
    try {
      // Xóa collections
      await db.collection('requestreports').drop();
      console.log('✅ Đã xóa collection requestreports');
      
      await db.collection('workschedules').drop();
      console.log('✅ Đã xóa collection workschedules');
      
      console.log('🎉 Rollback hoàn thành thành công!');
      
    } catch (error) {
      console.error('❌ Lỗi trong rollback:', error);
      throw error;
    }
  }
};

