import { useState, useEffect } from 'react';
import apiService from '../services/api';

export const useSeatData = () => {
  const [grid, setGrid] = useState([]);
  const [tagList, setTagList] = useState([]);
  const [walkwayColIndexes, setWalkwayColIndexes] = useState([]);
  const [walkwayRowIndexes, setWalkwayRowIndexes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Đang đồng bộ...');
  const [currentVersion, setCurrentVersion] = useState(0);
  const [lastModifiedBy, setLastModifiedBy] = useState('');
  const [lastModifiedAt, setLastModifiedAt] = useState(null);

  // Hàm chuẩn hóa grid trước khi lưu để đảm bảo không mất hàng đường đi
  const normalizeGridBeforeSave = (grid) => {
    return (Array.isArray(grid) ? grid : []).map(row => {
      if (row && row.type === 'walkway-horizontal') {
        return row;
      }
      if (Array.isArray(row)) {
        return row;
      }
      return [];
    });
  };

  // Hàm khôi phục hàng đường đi khi load dữ liệu
  const restoreWalkwayRows = (grid, walkwayRowIndexes) => {
    if (!Array.isArray(grid) || !Array.isArray(walkwayRowIndexes)) {
      return grid;
    }
    
    const newGrid = [...grid];
    walkwayRowIndexes.forEach(idx => {
      if (idx >= 0 && idx < newGrid.length) {
        const currentRow = newGrid[idx];
        if (!currentRow || currentRow.type !== 'walkway-horizontal') {
          newGrid[idx] = { type: 'walkway-horizontal', text: 'Đường đi' };
        }
      }
    });
    
    return newGrid;
  };

  // Load dữ liệu từ server
  const loadSeatData = async () => {
    try {
      setIsLoading(true);
      setSyncStatus('Đang tải dữ liệu...');
      
      const seatData = await apiService.getSeatData();
      if (seatData) {
        // Tính toán walkwayColIndexes từ grid
        const calculatedIndexes = [];
        if (seatData.grid) {
          seatData.grid.forEach(row => {
            if (Array.isArray(row)) {
              row.forEach((cell, idx) => {
                if (cell && cell.type === 'walkway-vertical' && !calculatedIndexes.includes(idx)) {
                  calculatedIndexes.push(idx);
                }
              });
            }
          });
        }
        calculatedIndexes.sort((a,b)=>a-b);
        
        // Tính toán walkwayRowIndexes từ grid
        const tempRowIndexes = [];
        if (seatData.grid) {
          seatData.grid.forEach((row, idx) => {
            if (row && row.type === 'walkway-horizontal') {
              tempRowIndexes.push(idx);
            }
          });
        }
        tempRowIndexes.sort((a,b)=>a-b);
        
        const finalWalkwayRowIndexes = seatData.walkwayRowIndexes && seatData.walkwayRowIndexes.length > 0
          ? seatData.walkwayRowIndexes
          : tempRowIndexes;
        
        // Khôi phục hàng đường đi nếu cần
        const restoredGrid = restoreWalkwayRows(seatData.grid || [], finalWalkwayRowIndexes);
        
        setGrid(restoredGrid);
        setTagList(seatData.tagList || []);
        
        // Ưu tiên walkwayColIndexes từ server, nếu không có thì dùng calculated
        const finalWalkwayIndexes = seatData.walkwayColIndexes && seatData.walkwayColIndexes.length > 0 
          ? seatData.walkwayColIndexes 
          : calculatedIndexes;

        setWalkwayColIndexes(finalWalkwayIndexes);
        setWalkwayRowIndexes(finalWalkwayRowIndexes);
        setCurrentVersion(seatData.version || 0);
        setLastModifiedBy(seatData.lastModifiedBy || '');
        setLastModifiedAt(seatData.lastModifiedAt);
        setSyncStatus('Đã cập nhật mới');
      }
    } catch (error) {
      console.error('Lỗi khi load dữ liệu seat:', error);
      setSyncStatus('Lỗi đồng bộ - sử dụng dữ liệu local');
      // Fallback về localStorage nếu server lỗi
      const savedGrid = localStorage.getItem('vitri_grid');
      const savedTagList = localStorage.getItem('vitri_taglist');
      if (savedGrid) {
        try {
          setGrid(JSON.parse(savedGrid));
        } catch (e) {
          console.error('Lỗi parse localStorage grid:', e);
        }
      }
      if (savedTagList) {
        try {
          setTagList(JSON.parse(savedTagList));
        } catch (e) {
          console.error('Lỗi parse localStorage tagList:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Lưu dữ liệu lên server
  const saveSeatDataToServer = async (newGrid, newTagList, newWalkwayColIndexes, newWalkwayRowIndexes) => {
    try {
      setSyncStatus('Đang lưu...');
      
      // Lấy thông tin user hiện tại từ localStorage hoặc từ API
      let currentUserInfo = 'Unknown';
      try {
        const userProfile = await apiService.getProfile();
        currentUserInfo = userProfile.tenTaiKhoan || userProfile.username || 'Unknown';
      } catch (error) {
        console.error('Không thể lấy thông tin user:', error);
      }
      
      // Chuẩn hóa grid trước khi lưu
      const normalizedGrid = normalizeGridBeforeSave(newGrid);
      
      const seatData = {
        grid: normalizedGrid,
        tagList: newTagList,
        walkwayColIndexes: newWalkwayColIndexes,
        walkwayRowIndexes: newWalkwayRowIndexes,
        modifiedBy: currentUserInfo
      };
      
      const result = await apiService.saveSeatData(seatData);
      if (result) {
        setCurrentVersion(result.version);
        setLastModifiedBy(result.lastModifiedBy);
        setLastModifiedAt(result.lastModifiedAt);
        setSyncStatus('Đã lưu thành công');
      }
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu seat:', error);
      setSyncStatus('Lỗi lưu - đã lưu local');
      // Fallback về localStorage
      localStorage.setItem('vitri_grid', JSON.stringify(normalizeGridBeforeSave(newGrid)));
      localStorage.setItem('vitri_taglist', JSON.stringify(newTagList));
    }
  };

  // Load dữ liệu khi component mount
  useEffect(() => {
    loadSeatData();
  }, []);

  return {
    grid,
    setGrid,
    tagList,
    setTagList,
    walkwayColIndexes,
    setWalkwayColIndexes,
    walkwayRowIndexes,
    setWalkwayRowIndexes,
    isLoading,
    syncStatus,
    currentVersion,
    lastModifiedBy,
    lastModifiedAt,
    loadSeatData,
    saveSeatDataToServer,
    normalizeGridBeforeSave,
    restoreWalkwayRows
  };
}; 