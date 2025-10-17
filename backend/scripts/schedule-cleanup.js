const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

console.log('🕐 Bắt đầu schedule cleanup images...');

// Chạy cleanup hàng ngày lúc 2:00 AM
cron.schedule('0 2 * * *', () => {
  console.log('🕐 Chạy cleanup images lúc:', new Date().toISOString());
  
  const cleanupScript = path.join(__dirname, 'cleanup-old-images.js');
  
  exec(`node "${cleanupScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Lỗi chạy cleanup:', error);
      return;
    }
    
    console.log('✅ Cleanup completed:', stdout);
    if (stderr) {
      console.error('⚠️ Warnings:', stderr);
    }
  });
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

console.log('✅ Đã setup cron job: cleanup hàng ngày lúc 2:00 AM');
console.log('📅 Timezone: Asia/Ho_Chi_Minh');
console.log('🔄 Để dừng: Ctrl+C');

// Giữ process chạy
process.on('SIGINT', () => {
  console.log('\n🛑 Đang dừng cron job...');
  process.exit(0);
});





