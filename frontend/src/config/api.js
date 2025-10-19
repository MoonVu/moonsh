// API Configuration
// Tự động detect API URL dựa trên environment variables và current host

const getApiBaseUrl = () => {
  // Ưu tiên sử dụng environment variable từ .env
  if (process.env.REACT_APP_API_BASE_URL) {
    console.log('🔧 Using REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Fallback: Nếu đang chạy trên localhost thì dùng localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Fallback to localhost:5000');
    return 'http://localhost:5000';
  }
  
  // Fallback: Nếu đang chạy trên IP khác thì dùng cùng IP với port 5000
  const fallbackUrl = `http://${window.location.hostname}:5000`;
  console.log('🔧 Fallback to hostname:5000:', fallbackUrl);
  return fallbackUrl;
};

// Export API_BASE_URL để sử dụng trong các file khác
export const API_BASE_URL = getApiBaseUrl();

console.log('🌐 Final API_BASE_URL:', API_BASE_URL);

export default API_BASE_URL;
