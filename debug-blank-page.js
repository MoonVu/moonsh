// Debug script để kiểm tra nguyên nhân trang trắng
console.log('🔍 Bắt đầu debug trang trắng...');

// Kiểm tra React và ReactDOM
try {
  console.log('✅ React version:', React.version);
  console.log('✅ ReactDOM version:', ReactDOM.version);
} catch (error) {
  console.error('❌ Lỗi React:', error);
}

// Kiểm tra localStorage
try {
  const authToken = localStorage.getItem('authToken');
  console.log('🔑 Auth token:', authToken ? 'Có' : 'Không có');
} catch (error) {
  console.error('❌ Lỗi localStorage:', error);
}

// Kiểm tra API connection
async function testAPI() {
  try {
    console.log('🌐 Đang test API connection...');
    const response = await fetch('http://172.16.1.6:5000/api/health');
    const data = await response.json();
    console.log('✅ API response:', data);
  } catch (error) {
    console.error('❌ API error:', error);
  }
}

// Kiểm tra window object
try {
  console.log('🌍 Window object:', typeof window);
  console.log('📄 Document object:', typeof document);
  console.log('🎯 Root element:', document.getElementById('root'));
} catch (error) {
  console.error('❌ DOM error:', error);
}

// Chạy test API
testAPI();

console.log('🔍 Debug hoàn tất'); 