import React, { useState, useEffect, useMemo } from "react";
import './ViTriChoNgoi.css';
import apiService from './services/api';
import GridRow from './GridRow';

// Demo dữ liệu nhân viên
const initialGrid = [
  [ { name: "FK OWEN", group: "FK" }, { name: "FK GIGI", group: "FK" }, { name: "FK ANGEL", group: "FK" }, null ],
  [ { name: "TT TEDDY", group: "TT" }, null, null, null ],
  [ null, null, null, null ],
];

const GROUP_COLORS = {
  FK: '#f9c6e0',
  TT: '#ffd966',
  CS: '#b6e2b6',
  XNK: '#b3d8fd',
  CSDL: '#f9b6b6',
  TRONG: '#eaeaea',
};

export default function ViTriChoNgoi() {
  const [grid, setGrid] = useState(initialGrid);
  const [dragged, setDragged] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [showAddTag, setShowAddTag] = useState(false);
  const [tagList, setTagList] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [hoverRow, setHoverRow] = useState(null);
  const [hoverCol, setHoverCol] = useState(null);
  const [showDeleteRow, setShowDeleteRow] = useState(false);
  const [showDeleteCol, setShowDeleteCol] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(0);
  const [colToDelete, setColToDelete] = useState(0);
  const [selectedRowsToDelete, setSelectedRowsToDelete] = useState([]);
  const [selectedColsToDelete, setSelectedColsToDelete] = useState([]);
  const [showAddWalkway, setShowAddWalkway] = useState(false);
  const [walkwayRowIdx, setWalkwayRowIdx] = useState(0);
  const [showAddWalkwayCol, setShowAddWalkwayCol] = useState(false);
  const [walkwayColIdx, setWalkwayColIdx] = useState(0);

  const [showDeleteWalkwayCol, setShowDeleteWalkwayCol] = useState(false);
  const [deleteWalkwayColIdx, setDeleteWalkwayColIdx] = useState(0);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [walkwayColIndexes, setWalkwayColIndexes] = useState([]);
  const [walkwayRowIndexes, setWalkwayRowIndexes] = useState([]);
  
  // Thêm state cho đồng bộ
  const [currentVersion, setCurrentVersion] = useState(0);
  const [lastModifiedBy, setLastModifiedBy] = useState('');
  const [lastModifiedAt, setLastModifiedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('Đang đồng bộ...');


  // Lấy danh sách tài khoản từ backend
  useEffect(() => {
    apiService.getUsers()
      .then(users => {
        setAccounts(users.filter(a => a.status !== 'Ngưng sử dụng'));
      })
      .catch((err) => {
        console.error('Lỗi khi gọi API getUsers:', err);
        setAccounts([]);
      });
  }, []);

  // Load dữ liệu từ server khi component mount
  useEffect(() => {
    loadSeatData();
  }, []);

  // Hàm load dữ liệu từ server
  const loadSeatData = async () => {
    try {
      setIsLoading(true);
      setSyncStatus('Đang tải dữ liệu...');
      
      const seatData = await apiService.getSeatData();
      if (seatData) {

        
        // Tính toán walkwayColIndexes từ grid trước khi set
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
         const restoredGrid = restoreWalkwayRows(seatData.grid || initialGrid, finalWalkwayRowIndexes);
         
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

  // Hàm chuẩn hóa grid trước khi lưu để đảm bảo không mất hàng đường đi
  const normalizeGridBeforeSave = (grid) => {
    return (Array.isArray(grid) ? grid : []).map(row => {
      // Nếu là hàng đường đi, giữ nguyên object
      if (row && row.type === 'walkway-horizontal') {
        return row;
      }
      // Nếu là mảng (hàng thường), giữ nguyên
      if (Array.isArray(row)) {
        return row;
      }
      // Nếu không phải cả hai, chuyển thành mảng rỗng
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
        // Nếu hàng hiện tại không phải là walkway-horizontal, khôi phục lại
        if (!currentRow || currentRow.type !== 'walkway-horizontal') {
          newGrid[idx] = { type: 'walkway-horizontal', text: 'Đường đi' };
        }
      }
    });
    
    return newGrid;
  };

  // Hàm lưu dữ liệu lên server
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

  // Auto-sync mỗi 5 giây
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const versionData = await apiService.getSeatVersion();
        if (versionData.version > currentVersion) {

          setSyncStatus('Phát hiện thay đổi, đang cập nhật...');
          await loadSeatData();
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra version:', error);
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [currentVersion]);

  // Cập nhật walkwayColIndexes và walkwayRowIndexes mỗi khi grid thay đổi
  useEffect(() => {
    // Tính toán walkwayColIndexes từ grid hiện tại
    const colIndexes = [];
    grid.forEach(row => {
      if (Array.isArray(row)) {
        row.forEach((cell, idx) => {
          if (cell && cell.type === 'walkway-vertical' && !colIndexes.includes(idx)) {
            colIndexes.push(idx);
          }
        });
      }
    });
    colIndexes.sort((a,b)=>a-b);
    
    // Tính toán walkwayRowIndexes từ grid hiện tại
    const rowIndexes = [];
    grid.forEach((row, idx) => {
      if (row && row.type === 'walkway-horizontal') {
        rowIndexes.push(idx);
      }
    });
    rowIndexes.sort((a,b)=>a-b);
    
    // Đảm bảo grid luôn đúng định dạng
    const normalizedGrid = normalizeGridBeforeSave(grid);
    if (JSON.stringify(normalizedGrid) !== JSON.stringify(grid)) {
      setGrid(normalizedGrid);
    }
    
    // Chỉ cập nhật nếu khác với state hiện tại
    if (JSON.stringify(colIndexes) !== JSON.stringify(walkwayColIndexes)) {
      setWalkwayColIndexes(colIndexes);
    }
    
    if (JSON.stringify(rowIndexes) !== JSON.stringify(walkwayRowIndexes)) {
      setWalkwayRowIndexes(rowIndexes);
    }
  }, [grid, walkwayColIndexes, walkwayRowIndexes]); // Chỉ chạy khi grid thay đổi

  // Lấy danh sách key đã có trên lưới
  const assignedKeys = useMemo(() => (
    (Array.isArray(grid) ? grid : [])
      .flat()
      .filter(Boolean)
      .map(cell => cell._id || cell.username || cell.name || cell.key || cell.tenTaiKhoan)
  ), [grid]);

  // Lọc tài khoản có thể thêm
  const canAddToTag = useMemo(() => (
    (Array.isArray(accounts) ? accounts : []).filter(acc =>
      !tagList.includes(acc._id) && !assignedKeys.includes(acc._id)
    )
  ), [accounts, tagList, assignedKeys]);

  // Danh sách tài khoản trong tagList
  const unassigned = (Array.isArray(accounts) ? accounts : []).filter(acc => (Array.isArray(tagList) ? tagList : []).includes(acc._id));
  const assignedNames = (Array.isArray(grid) ? grid : []).flat().filter(Boolean).map(cell => cell.name);

  // Hàm lấy index thực tế trong grid của các hàng chỗ ngồi
  function getSeatRowIndexes(grid) {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => Array.isArray(row) ? idx : -1).filter(idx => idx !== -1);
  }

  // Hàm lấy index thực tế trong grid của tất cả các hàng (cả thường và đường đi)
  function getAllRowIndexes(grid) {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => {
      if (Array.isArray(row) || (row && row.type === 'walkway-horizontal')) return idx;
      return -1;
    }).filter(idx => idx !== -1);
  }

  // Hàm lấy index thực tế trong grid của các hàng thường (không phải hàng đường đi)
  function getNormalRowIndexes(grid) {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => {
      if (Array.isArray(row)) return idx;
      return -1;
    }).filter(idx => idx !== -1);
  }

  // Hàm lấy index thực tế trong grid của các hàng đường đi
  function getWalkwayRowIndexes(grid) {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => {
      if (row && row.type === 'walkway-horizontal') return idx;
      return -1;
    }).filter(idx => idx !== -1);
  }

  const seatRowIndexes = getSeatRowIndexes(grid);
  const normalRowIndexes = getNormalRowIndexes(grid);
  const allRowIndexes = getAllRowIndexes(grid);
  const walkwayRowIndexesFromGrid = getWalkwayRowIndexes(grid);

  // Thêm hàng thường
  const addRow = () => {
    const normalRows = getNormalRowIndexes(grid);
    const insertIdx = normalRows.length > 0 ? normalRows[normalRows.length - 1] + 1 : 0;
    const newGrid = [...grid];
    
    // Tạo hàng mới với đúng số cột và tự động thêm đường đi dọc
    const newRow = Array(grid[0]?.length || 4).fill(null);
    
    // Thêm đường đi dọc vào hàng mới nếu có
    walkwayColIndexes.forEach(colIdx => {
      if (colIdx < newRow.length) {
        newRow[colIdx] = { type: 'walkway-vertical', text: 'Đường đi' };
      }
    });
    
    newGrid.splice(insertIdx, 0, newRow);
    
    // Cập nhật walkwayRowIndexes sau khi thêm hàng
    const newWalkwayRowIndexes = walkwayRowIndexes.map(idx => 
      idx >= insertIdx ? idx + 1 : idx
    );
    
    setGrid(newGrid);
    setWalkwayRowIndexes(newWalkwayRowIndexes);
    saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, newWalkwayRowIndexes);
  };

  // Thêm cột
  const addCol = () => {
    const newGrid = grid.map(row => Array.isArray(row) ? [...row, null] : row);
    setGrid(newGrid);
    // Không cần cập nhật walkwayColIndexes vì chỉ thêm cột cuối cùng
    saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, walkwayRowIndexes);
  };

  // Bắt đầu kéo
  const handleDragStart = (rowIdx, colIdx) => {
    if (!Array.isArray(grid[rowIdx])) return;
    setDragged({ row: rowIdx, col: colIdx });
  };

  // Kéo qua ô
  const handleDragOver = (e, rowIdx, colIdx) => {
    e.preventDefault();
  };

  // Thả vào ô
  const handleDrop = (rowIdx, colIdx) => {
    if (!dragged) return;
    if (!Array.isArray(grid[rowIdx])) return;
    if (dragged.row === rowIdx && dragged.col === colIdx) return;
    
    // Kiểm tra xem ô đích có phải là walkway-vertical không
    const targetCell = grid[rowIdx][colIdx];
    if (targetCell && targetCell.type === 'walkway-vertical') {

      setDragged(null);
      return;
    }
    
    // Kiểm tra xem hàng đích có phải là walkway-horizontal không
    const targetRow = grid[rowIdx];
    if (targetRow && targetRow.type === 'walkway-horizontal') {

      setDragged(null);
      return;
    }
    
    if (dragged.account) {
      if (grid[rowIdx][colIdx]) {
        setReplaceTarget({ from: dragged, to: { row: rowIdx, col: colIdx } });
      } else {
        const newGrid = grid.map(r => Array.isArray(r) ? [...r] : r);
        newGrid[rowIdx][colIdx] = {
          name: dragged.account.username,
          group: dragged.account.group_name,
          _id: dragged.account._id
        };
        setGrid(newGrid);
        const newTagList = tagList.filter(k => k !== dragged.account._id);
        setTagList(newTagList);
        saveSeatDataToServer(newGrid, newTagList, walkwayColIndexes, walkwayRowIndexes);
      }
      setDragged(null);
      return;
    }
    
    const fromCell = grid[dragged.row][dragged.col];
    const toCell = grid[rowIdx][colIdx];
    if (toCell) {
      setReplaceTarget({ from: dragged, to: { row: rowIdx, col: colIdx } });
    } else {
      const newGrid = grid.map(r => Array.isArray(r) ? [...r] : r);
      newGrid[rowIdx][colIdx] = fromCell;
      newGrid[dragged.row][dragged.col] = null;
      setGrid(newGrid);
      saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, walkwayRowIndexes);
    }
    setDragged(null);
  };

  // Xác nhận thay thế
  const confirmReplace = () => {
    if (!replaceTarget) return;
    const { from, to } = replaceTarget;
    
    // Kiểm tra xem ô đích có phải là walkway-vertical không
    const targetCell = grid[to.row][to.col];
    if (targetCell && targetCell.type === 'walkway-vertical') {

      setReplaceTarget(null);
      return;
    }
    
    // Kiểm tra xem hàng đích có phải là walkway-horizontal không
    const targetRow = grid[to.row];
    if (targetRow && targetRow.type === 'walkway-horizontal') {

      setReplaceTarget(null);
      return;
    }
    
    const newGrid = grid.map((r, i) => {
      if (!Array.isArray(r)) return r;
      return [...r];
    });
    
    if (Array.isArray(newGrid[to.row]) && Array.isArray(newGrid[from.row])) {
      const temp = newGrid[to.row][to.col];
      newGrid[to.row][to.col] = newGrid[from.row][from.col];
      newGrid[from.row][from.col] = temp;
    }
    setGrid(newGrid);
    saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, walkwayRowIndexes);
    setReplaceTarget(null);
  };

  // Hủy thay thế
  const cancelReplace = () => setReplaceTarget(null);

  // Kéo tag từ dưới lên lưới
  const handleTagDragStart = (acc) => {
    setDragged({ account: acc });
  };

  // Xóa nhân viên khỏi lưới
  const handleRemoveFromGrid = (rowIdx, colIdx) => {
    const cell = grid[rowIdx][colIdx];
    if (!cell) return;
    
    // Không cho phép xóa walkway-vertical cells
    if (cell && cell.type === 'walkway-vertical') {

      return;
    }
    
    const newGrid = grid.map(r => Array.isArray(r) ? [...r] : r);
    newGrid[rowIdx][colIdx] = null;
    
    setGrid(newGrid);
    
    let newTagList = tagList;
    if (cell._id && !tagList.includes(cell._id)) {
      newTagList = [...tagList, cell._id];
      setTagList(newTagList);
    }
    
    saveSeatDataToServer(newGrid, newTagList, walkwayColIndexes, walkwayRowIndexes);
  };

  // Thêm nhiều nhân viên vào tagList
  const handleAddMultipleTags = () => {
    const newTagList = [
      ...tagList,
      ...selectedToAdd.filter(k => {
        const acc = (Array.isArray(accounts) ? accounts : []).find(a => a._id === k);
        return acc && !assignedKeys.includes(acc._id) && !tagList.includes(k);
      })
    ];
    setTagList(newTagList);
    saveSeatDataToServer(grid, newTagList, walkwayColIndexes, walkwayRowIndexes);
    setShowAddTag(false);
    setSelectedToAdd([]);
  };

  // Chọn tất cả
  const handleSelectAll = () => {
    if (selectedToAdd.length === canAddToTag.length) setSelectedToAdd([]);
    else setSelectedToAdd(canAddToTag.map(acc => acc._id));
  };

  // Xóa tag khỏi vùng chưa xếp chỗ
  const handleRemoveTag = (_id) => {
    const newTagList = tagList.filter(k => k !== _id);
    setTagList(newTagList);
    saveSeatDataToServer(grid, newTagList, walkwayColIndexes, walkwayRowIndexes);
  };

  // Xóa hàng (cả thường và đường đi)
  const handleRemoveRow = (displayIdx) => {
    const allRows = getAllRowIndexes(grid);
    const realIdx = allRows[displayIdx];
    if (realIdx === undefined) return;
    
    const removedRow = grid[realIdx];
    
    let newTagList = tagList;
    
         // Xử lý các cell trong hàng bị xóa (chỉ nếu là hàng thường)
     if (Array.isArray(removedRow)) {
       removedRow.forEach(cell => {
         if (cell) {
           const acc = (Array.isArray(accounts) ? accounts : []).find(a => a.tenTaiKhoan === cell.name);
           if (acc && !assignedNames.includes(acc.tenTaiKhoan) && !tagList.includes(acc._id)) {
             newTagList = [...newTagList, acc._id];
           }
         }
       });
     }
    
    const newGrid = grid.filter((_, i) => i !== realIdx);
    
    // Cập nhật walkwayRowIndexes sau khi xóa hàng
    const newWalkwayRowIndexes = walkwayRowIndexes
      .filter(idx => idx !== realIdx) // Loại bỏ hàng bị xóa
      .map(idx => idx > realIdx ? idx - 1 : idx); // Dịch chuyển các hàng sau
    
    setGrid(newGrid);
    setTagList(newTagList);
    setWalkwayRowIndexes(newWalkwayRowIndexes);
    saveSeatDataToServer(newGrid, newTagList, walkwayColIndexes, newWalkwayRowIndexes);
  };

  // Xóa nhiều hàng cùng lúc
  const handleRemoveMultipleRows = () => {
    if (selectedRowsToDelete.length === 0) return;
    
    const allRows = getAllRowIndexes(grid);
    const rowsToRemove = selectedRowsToDelete.map(displayIdx => allRows[displayIdx]).sort((a, b) => b - a);
    
    let newTagList = tagList;
    let newGrid = [...grid];
    
    // Xóa từ cuối lên để tránh ảnh hưởng index
    rowsToRemove.forEach(realIdx => {
      const removedRow = newGrid[realIdx];
      
      // Xử lý các cell trong hàng bị xóa (chỉ nếu là hàng thường)
      if (Array.isArray(removedRow)) {
        removedRow.forEach(cell => {
          if (cell) {
            const acc = (Array.isArray(accounts) ? accounts : []).find(a => a.tenTaiKhoan === cell.name);
            if (acc && !assignedNames.includes(acc.tenTaiKhoan) && !tagList.includes(acc._id)) {
              newTagList = [...newTagList, acc._id];
            }
          }
        });
      }
      
      newGrid.splice(realIdx, 1);
    });
    
    // Cập nhật walkwayRowIndexes sau khi xóa hàng
    const newWalkwayRowIndexes = walkwayRowIndexes
      .filter(idx => !rowsToRemove.includes(idx))
      .map(idx => {
        let newIdx = idx;
        rowsToRemove.forEach(removedIdx => {
          if (newIdx > removedIdx) newIdx--;
        });
        return newIdx;
      });
    
    setGrid(newGrid);
    setTagList(newTagList);
    setWalkwayRowIndexes(newWalkwayRowIndexes);
    saveSeatDataToServer(newGrid, newTagList, walkwayColIndexes, newWalkwayRowIndexes);
    setSelectedRowsToDelete([]);
  };

  // Xóa cột
  const handleRemoveCol = (colIdx) => {
    // Kiểm tra xem cột có chứa walkway-vertical không
    const hasWalkwayVertical = grid.some(row => {
      if (Array.isArray(row) && row[colIdx]) {
        return row[colIdx].type === 'walkway-vertical';
      }
      return false;
    });
    
    if (hasWalkwayVertical) {

      return;
    }
    
    let newTagList = tagList;
    const newGrid = grid.map(row => {
      if (!Array.isArray(row)) return row;
      const cell = row[colIdx];
      if (cell) {
        const acc = (Array.isArray(accounts) ? accounts : []).find(a => a.tenTaiKhoan === cell.name);
        if (acc && !assignedNames.includes(acc.tenTaiKhoan) && !tagList.includes(acc._id)) {
          newTagList = [...newTagList, acc._id];
        }
      }
      return row.filter((_, i) => i !== colIdx);
    });
    
    // Cập nhật walkwayColIndexes sau khi xóa cột
    const newWalkwayColIndexes = walkwayColIndexes
      .filter(idx => idx !== colIdx) // Loại bỏ cột bị xóa
      .map(idx => idx > colIdx ? idx - 1 : idx); // Dịch chuyển các cột sau
    
    setGrid(newGrid);
    setTagList(newTagList);
    setWalkwayColIndexes(newWalkwayColIndexes);
    saveSeatDataToServer(newGrid, newTagList, newWalkwayColIndexes, walkwayRowIndexes);
  };

  // Xóa nhiều cột cùng lúc
  const handleRemoveMultipleCols = () => {
    if (selectedColsToDelete.length === 0) return;
    
    const colsToRemove = [...selectedColsToDelete].sort((a, b) => b - a);
    
    // Kiểm tra xem có cột nào chứa walkway-vertical không
    const hasWalkwayVertical = colsToRemove.some(colIdx => 
      grid.some(row => {
        if (Array.isArray(row) && row[colIdx]) {
          return row[colIdx].type === 'walkway-vertical';
        }
        return false;
      })
    );
    
    if (hasWalkwayVertical) {
      return;
    }
    
    let newTagList = tagList;
    let newGrid = grid.map(row => {
      if (!Array.isArray(row)) return row;
      let newRow = [...row];
      
      // Xóa từ cuối lên để tránh ảnh hưởng index
      colsToRemove.forEach(colIdx => {
        const cell = newRow[colIdx];
        if (cell) {
          const acc = (Array.isArray(accounts) ? accounts : []).find(a => a.tenTaiKhoan === cell.name);
          if (acc && !assignedNames.includes(acc.tenTaiKhoan) && !tagList.includes(acc._id)) {
            newTagList = [...newTagList, acc._id];
          }
        }
        newRow.splice(colIdx, 1);
      });
      
      return newRow;
    });
    
    // Cập nhật walkwayColIndexes sau khi xóa cột
    const newWalkwayColIndexes = walkwayColIndexes
      .filter(idx => !colsToRemove.includes(idx))
      .map(idx => {
        let newIdx = idx;
        colsToRemove.forEach(removedIdx => {
          if (newIdx > removedIdx) newIdx--;
        });
        return newIdx;
      });
    
    setGrid(newGrid);
    setTagList(newTagList);
    setWalkwayColIndexes(newWalkwayColIndexes);
    saveSeatDataToServer(newGrid, newTagList, newWalkwayColIndexes, walkwayRowIndexes);
    setSelectedColsToDelete([]);
  };

  // Thêm hàng đường đi ngang
  const handleAddWalkway = () => {
    const newGrid = [...grid];
    newGrid.splice(walkwayRowIdx, 0, { type: 'walkway-horizontal', text: 'Đường đi' });
    
    // Cập nhật walkwayRowIndexes sau khi thêm
    const tempNewWalkwayRowIndexes = [...walkwayRowIndexes, walkwayRowIdx].sort((a, b) => a - b);
    
    setGrid(newGrid);
    setWalkwayRowIndexes(tempNewWalkwayRowIndexes);
    saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, tempNewWalkwayRowIndexes);
    setShowAddWalkway(false);
  };

  // Thêm cột đường đi dọc
  const handleAddWalkwayCol = () => {

    
    const newGrid = grid.map(row => {
      if (row && row.type === 'walkway-horizontal') return row;
      const newRow = [...row];
      newRow.splice(walkwayColIdx, 0, { type: 'walkway-vertical', text: 'Đường đi' });
      return newRow;
    });
    
    // Cập nhật walkwayColIndexes
    const newWalkwayColIndexes = [...walkwayColIndexes, walkwayColIdx].sort((a, b) => a - b);
    

    
    // Cập nhật state trước khi lưu
    setGrid(newGrid);
    setWalkwayColIndexes(newWalkwayColIndexes);
    

    
    // Lưu lên server với dữ liệu mới
    saveSeatDataToServer(newGrid, tagList, newWalkwayColIndexes, walkwayRowIndexes);
    setShowAddWalkwayCol(false);
  };



  // Hàm đồng bộ số cột
  const syncGridCols = (grid) => {
    const maxCols = Math.max(...(Array.isArray(grid) ? grid : []).filter(Array.isArray).map(r => r.length));
    return grid.map(row => {
      if (!Array.isArray(row)) return row;
      if (row.length < maxCols) {
        return [...row, ...Array(maxCols - row.length).fill(null)];
      }
      return row;
    });
  };

  // Xóa đường đi dọc
  const handleDeleteWalkwayCol = () => {
    const walkwayCols = [];
    if ((Array.isArray(grid) ? grid : []).length) {
      const firstRowWithCols = (Array.isArray(grid) ? grid : []).find(Array.isArray);
      if (firstRowWithCols) {
        firstRowWithCols.forEach((cell, idx) => {
          if (cell && cell.type === 'walkway-vertical') {
            walkwayCols.push(idx);
          }
        });
      }
    }

    const realIdx = walkwayCols[deleteWalkwayColIdx];
    if (realIdx === undefined) {
      console.warn("Không tìm thấy walkway-vertical cần xóa");
      return;
    }

    const newGrid = grid.map(row => {
      if (!Array.isArray(row)) return row;
      const newRow = [...row];
      newRow.splice(realIdx, 1);
      return newRow;
    });
    
    const syncedGrid = syncGridCols(newGrid);
    
    // Cập nhật walkwayColIndexes sau khi xóa
    const newWalkwayColIndexes = walkwayColIndexes.filter(idx => idx !== realIdx).map(idx => 
      idx > realIdx ? idx - 1 : idx
    );
    
    setGrid(syncedGrid);
    setWalkwayColIndexes(newWalkwayColIndexes);
    saveSeatDataToServer(syncedGrid, tagList, newWalkwayColIndexes, walkwayRowIndexes);
    setShowDeleteWalkwayCol(false);
  };

  // Hàm tính toán vị trí cột dựa trên tổng số cột
  const getColumnPosition = (colIdx, totalCols) => {
    return {
      left: `${(colIdx / totalCols) * 100}%`,
      width: `${100 / totalCols}%`
    };
  };

  // Hàm safe set grid
  const safeSetGrid = (updater) => setGrid(g => {
    const next = updater(Array.isArray(g) ? g : []);
    return Array.isArray(next) ? next : [];
  });

  if (isLoading) {
    return (
      <div className="vitri-root">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Đang tải dữ liệu...</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>{syncStatus}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="vitri-root">
      {/* Status bar hiển thị trạng thái đồng bộ */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <div>
          <button className="btn-edit" style={{minWidth:120, fontWeight:700, fontSize:17}} onClick={()=>setShowActionPanel(true)}>
            Thao tác
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: syncStatus.includes('Lỗi') ? '#ff4d4f' : '#52c41a' }}>
            {syncStatus}
          </span>
          {lastModifiedBy && (
            <span style={{ color: '#666' }}>
              Sửa lần cuối bởi: {lastModifiedBy}
            </span>
          )}
          {lastModifiedAt && (
            <span style={{ color: '#666' }}>
              {new Date(lastModifiedAt).toLocaleString('vi-VN')}
            </span>
          )}
        </div>
      </div>

      {showActionPanel && (
        <div className="modal-bg" onClick={()=>setShowActionPanel(false)}>
          <div className="modal" style={{minWidth: 320, padding: '28px 24px'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:700, fontSize:20, marginBottom:18, color:'#29547A'}}>Thao tác</div>
            <div className="grid-controls" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={addRow}>+ Thêm hàng</button>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowDeleteRow(true);setRowToDelete(0);setShowActionPanel(false);}}>− Xóa hàng</button>
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={addCol}>+ Thêm cột</button>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowDeleteCol(true);setColToDelete(0);setShowActionPanel(false);}}>− Xóa cột</button>
                             <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowAddWalkway(true);setWalkwayRowIdx(0);setShowActionPanel(false);}}>+ Chèn đường đi ngang</button>
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowAddWalkwayCol(true);setWalkwayColIdx(0);setShowActionPanel(false);}}>+ Chèn đường đi dọc</button>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowDeleteWalkwayCol(true);setDeleteWalkwayColIdx(0);setShowActionPanel(false);}}>− Xóa đường đi dọc</button>
            </div>
            <div style={{marginTop:18, textAlign:'right'}}>
              <button className="btn-edit" style={{fontSize:15, padding:'7px 18px'}} onClick={()=>setShowActionPanel(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
             {/* Popup xóa hàng */}
       {showDeleteRow && (
         <div className="center-popup">
           <h4>Xóa hàng</h4>
           
           {/* Chọn tất cả */}
           <div className="select-all-container">
             <input
               type="checkbox"
               id="select-all-rows"
               checked={selectedRowsToDelete.length === allRowIndexes.length && allRowIndexes.length > 0}
               onChange={(e) => {
                 if (e.target.checked) {
                   setSelectedRowsToDelete(allRowIndexes.map((_, i) => i));
                 } else {
                   setSelectedRowsToDelete([]);
                 }
               }}
             />
             <label htmlFor="select-all-rows">Chọn tất cả hàng</label>
           </div>
           
           {/* Danh sách hàng để chọn */}
           <div className="multi-select-container">
             {allRowIndexes.map((realIdx, i) => {
               const row = grid[realIdx];
               const isWalkway = row && row.type === 'walkway-horizontal';
               const isSelected = selectedRowsToDelete.includes(i);
               
               return (
                 <div
                   key={realIdx}
                   className={`multi-select-item ${isSelected ? 'selected' : ''}`}
                   onClick={() => {
                     if (isSelected) {
                       setSelectedRowsToDelete(prev => prev.filter(idx => idx !== i));
                     } else {
                       setSelectedRowsToDelete(prev => [...prev, i]);
                     }
                   }}
                 >
                   <input
                     type="checkbox"
                     checked={isSelected}
                     onChange={() => {}}
                   />
                   <span>{isWalkway ? `Hàng đường đi số ${i+1}` : `Hàng số ${i+1}`}</span>
                 </div>
               );
             })}
           </div>
           
           <div className="button-group">
             <button 
               className="btn-delete" 
               onClick={() => {
                 if (selectedRowsToDelete.length > 0) {
                   handleRemoveMultipleRows();
                 } else {
                   handleRemoveRow(rowToDelete);
                 }
                 setShowDeleteRow(false);
               }}
               disabled={selectedRowsToDelete.length === 0}
             >
               Xóa {selectedRowsToDelete.length > 0 ? `(${selectedRowsToDelete.length})` : ''}
             </button>
             <button className="btn-edit" onClick={() => {
               setShowDeleteRow(false);
               setSelectedRowsToDelete([]);
             }}>
               Đóng
             </button>
           </div>
         </div>
       )}
             {/* Popup xóa cột */}
       {showDeleteCol && (
         <div className="center-popup">
           <h4>Xóa cột</h4>
           
           {/* Chọn tất cả */}
           <div className="select-all-container">
             <input
               type="checkbox"
               id="select-all-cols"
               checked={selectedColsToDelete.length === (Array.isArray(grid) ? grid[0] : []).length && (Array.isArray(grid) ? grid[0] : []).length > 0}
               onChange={(e) => {
                 if (e.target.checked) {
                   setSelectedColsToDelete((Array.isArray(grid) ? grid[0] : []).map((_, i) => i));
                 } else {
                   setSelectedColsToDelete([]);
                 }
               }}
             />
             <label htmlFor="select-all-cols">Chọn tất cả cột</label>
           </div>
           
           {/* Danh sách cột để chọn */}
           <div className="multi-select-container">
             {(Array.isArray(grid) ? grid[0] : []).map((_, i) => {
               const isSelected = selectedColsToDelete.includes(i);
               const hasWalkway = grid.some(row => {
                 if (Array.isArray(row) && row[i]) {
                   return row[i].type === 'walkway-vertical';
                 }
                 return false;
               });
               
               return (
                 <div
                   key={i}
                   className={`multi-select-item ${isSelected ? 'selected' : ''} ${hasWalkway ? 'disabled' : ''}`}
                   onClick={() => {
                     if (hasWalkway) return; // Không cho phép chọn cột có đường đi dọc
                     if (isSelected) {
                       setSelectedColsToDelete(prev => prev.filter(idx => idx !== i));
                     } else {
                       setSelectedColsToDelete(prev => [...prev, i]);
                     }
                   }}
                   style={hasWalkway ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                 >
                   <input
                     type="checkbox"
                     checked={isSelected}
                     disabled={hasWalkway}
                     onChange={() => {}}
                   />
                   <span>
                     Cột số {i+1}
                     {hasWalkway && <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px' }}>(Có đường đi)</span>}
                   </span>
                 </div>
               );
             })}
           </div>
           
           <div className="button-group">
             <button 
               className="btn-delete" 
               onClick={() => {
                 if (selectedColsToDelete.length > 0) {
                   handleRemoveMultipleCols();
                 } else {
                   handleRemoveCol(colToDelete);
                 }
                 setShowDeleteCol(false);
               }}
               disabled={selectedColsToDelete.length === 0}
             >
               Xóa {selectedColsToDelete.length > 0 ? `(${selectedColsToDelete.length})` : ''}
             </button>
             <button className="btn-edit" onClick={() => {
               setShowDeleteCol(false);
               setSelectedColsToDelete([]);
             }}>
               Đóng
             </button>
           </div>
         </div>
       )}
             {/* Popup chèn đường đi ngang */}
       {showAddWalkway && (
         <div className="center-popup">
           <h4>Chèn đường đi ngang</h4>
           <select value={walkwayRowIdx} onChange={e => setWalkwayRowIdx(Number(e.target.value))}>
             {Array.from({length: (Array.isArray(grid) ? grid : []).length+1}).map((_, i) => (
               <option key={i} value={i}>Sau hàng số {i}</option>
             ))}
           </select>
           <div className="button-group">
             <button className="btn-edit" onClick={handleAddWalkway}>Chèn</button>
             <button className="btn-delete" onClick={()=>setShowAddWalkway(false)}>Đóng</button>
           </div>
         </div>
       )}
             {/* Popup chèn đường đi dọc */}
       {showAddWalkwayCol && (
         <div className="center-popup">
           <h4>Chèn đường đi dọc</h4>
           <select value={walkwayColIdx} onChange={e => setWalkwayColIdx(Number(e.target.value))}>
             {Array.from({length: (Array.isArray(grid) ? grid[0] : [])?.length||0+1}).map((_, i) => (
               <option key={i} value={i}>Sau cột số {i}</option>
             ))}
           </select>
           <div className="button-group">
             <button className="btn-edit" onClick={handleAddWalkwayCol}>Chèn</button>
             <button className="btn-delete" onClick={()=>setShowAddWalkwayCol(false)}>Đóng</button>
           </div>
         </div>
       )}
             
             {/* Popup xóa đường đi dọc */}
       {showDeleteWalkwayCol && (
         <div className="center-popup">
           <h4>Xóa đường đi dọc</h4>
           <select value={deleteWalkwayColIdx} onChange={e => setDeleteWalkwayColIdx(Number(e.target.value))}>
             {(walkwayColIndexes.map((idx, i) => (
               <option key={i} value={i}>Cột đường đi số {i+1} (vị trí {idx})</option>
             )))}
           </select>
           <div className="button-group">
             <button className="btn-delete" onClick={handleDeleteWalkwayCol}>Xóa</button>
             <button className="btn-edit" onClick={()=>setShowDeleteWalkwayCol(false)}>Đóng</button>
           </div>
         </div>
       )}
                                                                                                                                                                       {/* Render grid-table */}
            <div className="grid-table" style={{ position: 'relative' }}>
                                                       
          
          <div className="grid-row" style={{ display: 'flex', marginBottom: 2 }}>
            <div style={{ width: 32 }}></div>
            {(Array.isArray(grid) && Array.isArray(grid[0]) ? grid[0] : []).map((_, colIdx) => (
              <div
                key={colIdx}
                className="remove-col-btn-wrap"
                onMouseEnter={() => setHoverCol(colIdx)}
                onMouseLeave={() => setHoverCol(null)}
                style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}
              >
                {hoverCol === colIdx && (
                  <button className="remove-col-btn" onClick={() => handleRemoveCol(colIdx)} title="Xóa cột">×</button>
                )}
              </div>
            ))}
          </div>
         
         {(Array.isArray(grid) ? grid : []).map((row, rowIdx) => {
           
                       // Kiểm tra xem có phải hàng đường đi không
            if (row && row.type === 'walkway-horizontal') {
              return (
                <div className="walkway-row" key={rowIdx} style={{display:'flex',alignItems:'center',justifyContent:'center',height:40,background:'#e0e6ed',position:'relative'}}>
                  <span style={{fontWeight:600,fontSize:16,color:'#29547A',letterSpacing:1}}>{row?.text || 'Đường đi'}</span>
                </div>
              );
            }
           if (row && row.type === 'wall-horizontal') {
             return (
             <div className="wall-row" key={rowIdx}></div>
             );
           }
           if (Array.isArray(row)) {
             return (
               <GridRow
                 key={rowIdx}
                 row={row}
                 rowIdx={rowIdx}
                 handleDragOver={handleDragOver}
                 handleDrop={handleDrop}
                 handleDragStart={handleDragStart}
                 handleRemoveFromGrid={handleRemoveFromGrid}
                 hoverRow={hoverRow}
                 setHoverRow={setHoverRow}
               />
             );
           }
           return null;
         })}
       </div>
      {/* Vùng tag nhân viên chưa xếp chỗ */}
      <div className="unassigned-tags">
        <h4>Nhân viên chưa xếp chỗ:</h4>
        <div className="tag-list">
          {(Array.isArray(unassigned) ? unassigned : []).map(acc => (
            <div
              key={acc._id}
              className="employee-tag"
              draggable
              onDragStart={() => handleTagDragStart(acc)}
              style={{ position: 'relative' }}
              onMouseEnter={e => e.currentTarget.classList.add('hover')}
              onMouseLeave={e => e.currentTarget.classList.remove('hover')}
            >
              {acc.username} <span className="group-tag">{acc.group_name}</span>
              <button className="remove-tag-btn" onClick={() => handleRemoveTag(acc._id)} title="Xóa tag" style={{ display: 'none' }}>×</button>
            </div>
          ))}
          <button className="add-tag-btn" onClick={() => setShowAddTag(true)}>+ Thêm nhân viên</button>
        </div>
        {showAddTag && (
          <div className="add-tag-popup center-popup">
            <h5>Chọn tài khoản để thêm vào danh sách:</h5>
            <div className="add-tag-list">
              {canAddToTag.length === 0 && <div>Không còn tài khoản nào.</div>}
              {canAddToTag.map(acc => (
                <label key={acc._id} className="add-tag-item" style={{cursor:'pointer'}}>
                  <input
                    type="checkbox"
                    checked={selectedToAdd.includes(acc._id)}
                    onChange={e => {
                      if (e.target.checked) setSelectedToAdd(list => [...list, acc._id]);
                      else setSelectedToAdd(list => list.filter(k => k !== acc._id));
                    }}
                    style={{ marginRight: 8 }}
                  />
                  {acc.username} <span className="group-tag">{acc.group_name}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', justifyContent: 'flex-start' }}>
              <button className="btn-edit" onClick={handleAddMultipleTags} disabled={selectedToAdd.length === 0}>Thêm</button>
              <button className="btn-delete" onClick={() => { setShowAddTag(false); setSelectedToAdd([]); }}>Đóng</button>
              <label style={{ display: 'flex', alignItems: 'center', marginLeft: 12, fontSize: 15 }}>
                <input type="checkbox" checked={selectedToAdd.length === canAddToTag.length && canAddToTag.length > 0} onChange={handleSelectAll} style={{ marginRight: 6 }} />
                Chọn tất cả
              </label>
            </div>
          </div>
        )}
      </div>
      {/* Popup xác nhận thay thế */}
      {replaceTarget && (
        <div className="modal-bg">
          <div className="modal" style={{ minWidth: 320 }}>
            <h3>Bạn có muốn thay thế vị trí<br/>
              <span style={{color:'#12B3D6'}}>
                {dragged?.account?.username || (Array.isArray(grid) ? grid : [])[replaceTarget.from.row][replaceTarget.from.col]?.name}
              </span>
              &nbsp;&gt;&nbsp;
              <span style={{color:'#cf1322'}}>
                {(Array.isArray(grid) ? grid : [])[replaceTarget.to.row][replaceTarget.to.col]?.name}
              </span>
              ?
            </h3>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button className="btn-edit" onClick={confirmReplace}>Đồng ý</button>
              <button className="btn-delete" onClick={cancelReplace} style={{ marginLeft: 8 }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}