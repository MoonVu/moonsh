// Script debug để kiểm tra dữ liệu seat
const API_BASE_URL = 'http://172.16.1.6:5000';

async function debugSeatData() {
  try {
    console.log('🔍 Đang kiểm tra dữ liệu seat...');
    
    // Lấy dữ liệu seat
    const response = await fetch(`${API_BASE_URL}/api/seat`);
    const data = await response.json();
    
    if (data.success) {
      const seat = data.data;
      console.log('📊 Dữ liệu seat:', seat);
      
      console.log('\n🔍 Kiểm tra walkwayColIndexes:', seat.walkwayColIndexes);
      console.log('🔍 Kiểm tra lastModifiedBy:', seat.lastModifiedBy);
      
      // Kiểm tra grid có walkway-vertical không
      let walkwayCount = 0;
      seat.grid.forEach((row, rowIdx) => {
        if (Array.isArray(row)) {
          row.forEach((cell, colIdx) => {
            if (cell && cell.type === 'walkway-vertical') {
              walkwayCount++;
              console.log(`📍 Tìm thấy walkway-vertical tại row ${rowIdx}, col ${colIdx}:`, cell);
            }
          });
        }
      });
      
      console.log(`\n📈 Tổng số walkway-vertical trong grid: ${walkwayCount}`);
      console.log(`📈 Số walkwayColIndexes: ${seat.walkwayColIndexes.length}`);
      
      if (walkwayCount !== seat.walkwayColIndexes.length) {
        console.log('⚠️  CẢNH BÁO: Số lượng walkway-vertical không khớp với walkwayColIndexes!');
      }
      
    } else {
      console.error('❌ Lỗi khi lấy dữ liệu seat:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
}

// Chạy debug
debugSeatData(); 