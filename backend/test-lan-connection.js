const http = require('http');
const os = require('os');

// Lấy IP của máy hiện tại
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Bỏ qua IPv6 và loopback
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();
const PORT = process.env.PORT || 5000;

console.log('🌐 Thông tin mạng LAN:');
console.log(`📍 IP máy hiện tại: ${localIP}`);
console.log(`🔌 Port server: ${PORT}`);
console.log(`🔗 URL truy cập local: http://localhost:${PORT}/api/health`);
console.log(`🌐 URL truy cập LAN: http://${localIP}:${PORT}/api/health`);
console.log('');

// Test kết nối
console.log('🧪 Đang test kết nối...');

const options = {
  hostname: localIP,
  port: PORT,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Server đang hoạt động! Status: ${res.statusCode}`);
  console.log(`🌐 Các máy khác trong mạng LAN có thể truy cập qua: http://${localIP}:${PORT}`);
  console.log('');
  console.log('📋 Hướng dẫn cho các máy khác:');
  console.log(`1. Mở trình duyệt và truy cập: http://${localIP}:${PORT}/api/health`);
  console.log(`2. Nếu frontend React, thay đổi API_URL thành: http://${localIP}:${PORT}`);
  console.log(`3. Đảm bảo firewall cho phép port ${PORT}`);
});

req.on('error', (err) => {
  console.log(`❌ Không thể kết nối: ${err.message}`);
  console.log('💡 Hãy đảm bảo server đang chạy: npm start');
});

req.on('timeout', () => {
  console.log('⏰ Timeout - Server không phản hồi');
  req.destroy();
});

req.end(); 