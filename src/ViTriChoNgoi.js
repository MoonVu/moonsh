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
  const [showAddWalkway, setShowAddWalkway] = useState(false);
  const [walkwayRowIdx, setWalkwayRowIdx] = useState(0);
  const [showAddWalkwayCol, setShowAddWalkwayCol] = useState(false);
  const [walkwayColIdx, setWalkwayColIdx] = useState(0);
  const [showDeleteWalkway, setShowDeleteWalkway] = useState(false);
  const [deleteWalkwayIdx, setDeleteWalkwayIdx] = useState(0);
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
        

        

        

        

         
         setGrid(seatData.grid || initialGrid);
        setTagList(seatData.tagList || []);
        // Ưu tiên walkwayColIndexes từ server, nếu không có thì dùng calculated
        const finalWalkwayIndexes = seatData.walkwayColIndexes && seatData.walkwayColIndexes.length > 0 
          ? seatData.walkwayColIndexes 
          : calculatedIndexes;

        setWalkwayColIndexes(finalWalkwayIndexes);
        // 1. Thêm state cho walkwayRowIndexes
        const tempRowIndexes = [];
        if (seatData.grid) {
          seatData.grid.forEach((row, idx) => {
            if (row && row.type === 'walkway-horizontal') {
              tempRowIndexes.push(idx);
            }
          });
        }
        const finalWalkwayRowIndexes = seatData.walkwayRowIndexes && seatData.walkwayRowIndexes.length > 0
          ? seatData.walkwayRowIndexes
          : tempRowIndexes;
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
      
      const seatData = {
        grid: newGrid,
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
      localStorage.setItem('vitri_grid', JSON.stringify(newGrid));
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

  // Cập nhật walkwayColIndexes mỗi khi grid thay đổi
  useEffect(() => {
    // Tính toán walkwayColIndexes từ grid hiện tại
    const indexes = [];
    grid.forEach(row => {
      if (Array.isArray(row)) {
        row.forEach((cell, idx) => {
          if (cell && cell.type === 'walkway-vertical' && !indexes.includes(idx)) {
            indexes.push(idx);
          }
        });
      }
    });
    indexes.sort((a,b)=>a-b);
    
    // Chỉ cập nhật nếu khác với state hiện tại
    if (JSON.stringify(indexes) !== JSON.stringify(walkwayColIndexes)) {

      setWalkwayColIndexes(indexes);
    }
  }, [grid, walkwayColIndexes]); // Chỉ chạy khi grid thay đổi

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

  const seatRowIndexes = getSeatRowIndexes(grid);

  // Thêm hàng
  const addRow = () => {
    const seatRows = getSeatRowIndexes(grid);
    const insertIdx = seatRows.length > 0 ? seatRows[seatRows.length - 1] + 1 : 0;
    const newGrid = [...grid];
    newGrid.splice(insertIdx, 0, Array(grid[0]?.length || 4).fill(null));
    setGrid(newGrid);
    saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, walkwayRowIndexes);
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

  // Xóa hàng
  const handleRemoveRow = (displayIdx) => {
    const seatRows = getSeatRowIndexes(grid);
    const realIdx = seatRows[displayIdx];
    if (realIdx === undefined) return;
    
    // Kiểm tra xem hàng có phải là walkway-horizontal không
    const removedRow = grid[realIdx];
    if (removedRow && removedRow.type === 'walkway-horizontal') {

      return;
    }
    
    let newTagList = tagList;
    
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
    setGrid(newGrid);
    setTagList(newTagList);
    saveSeatDataToServer(newGrid, newTagList, walkwayColIndexes, walkwayRowIndexes);
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

  // Thêm hàng đường đi ngang
  const handleAddWalkway = () => {
    const newGrid = [...grid];
    newGrid.splice(walkwayRowIdx, 0, { type: 'walkway-horizontal', text: 'Đường đi' });
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

  // Xóa đường đi ngang
  const handleDeleteWalkway = () => {
    const newGrid = grid.filter((_, idx) => idx !== deleteWalkwayIdx);
    const tempNewWalkwayRowIndexes = walkwayRowIndexes.filter(idx => idx !== deleteWalkwayIdx).map(idx => idx > deleteWalkwayIdx ? idx - 1 : idx);
    setGrid(newGrid);
    setWalkwayRowIndexes(tempNewWalkwayRowIndexes);
    saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, tempNewWalkwayRowIndexes);
    setShowDeleteWalkway(false);
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
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={addCol}>+ Thêm cột</button>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowDeleteRow(true);setRowToDelete(0);setShowActionPanel(false);}}>− Xóa hàng</button>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowDeleteCol(true);setColToDelete(0);setShowActionPanel(false);}}>− Xóa cột</button>
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowAddWalkway(true);setWalkwayRowIdx(0);setShowActionPanel(false);}}>+ Chèn đường đi ngang</button>
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowAddWalkwayCol(true);setWalkwayColIdx(0);setShowActionPanel(false);}}>+ Chèn đường đi dọc</button>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={()=>{setShowDeleteWalkway(true);setDeleteWalkwayIdx(0);setShowActionPanel(false);}}>− Xóa đường đi ngang</button>
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
          <select value={rowToDelete} onChange={e => setRowToDelete(Number(e.target.value))} style={{margin:'12px 0',fontSize:16}}>
            {seatRowIndexes.map((realIdx, i) => <option key={realIdx} value={i}>Hàng số {i+1}</option>)}
          </select>
          <div style={{display:'flex',gap:10,marginTop:10}}>
            <button className="btn-delete" onClick={()=>{handleRemoveRow(rowToDelete);setShowDeleteRow(false);}}>Xóa</button>
            <button className="btn-edit" onClick={()=>setShowDeleteRow(false)}>Đóng</button>
          </div>
        </div>
      )}
      {/* Popup xóa cột */}
      {showDeleteCol && (
        <div className="center-popup">
          <h4>Xóa cột</h4>
          <select value={colToDelete} onChange={e => setColToDelete(Number(e.target.value))} style={{margin:'12px 0',fontSize:16}}>
            {(Array.isArray(grid) ? grid[0] : []).map((_, i) => <option key={i} value={i}>Cột số {i+1}</option>)}
          </select>
          <div style={{display:'flex',gap:10,marginTop:10}}>
            <button className="btn-delete" onClick={()=>{handleRemoveCol(colToDelete);setShowDeleteCol(false);}}>Xóa</button>
            <button className="btn-edit" onClick={()=>setShowDeleteCol(false)}>Đóng</button>
          </div>
        </div>
      )}
      {/* Popup chèn đường đi ngang */}
      {showAddWalkway && (
        <div className="center-popup">
          <h4>Chèn đường đi ngang</h4>
          <select value={walkwayRowIdx} onChange={e => setWalkwayRowIdx(Number(e.target.value))} style={{margin:'12px 0',fontSize:16}}>
            {Array.from({length: (Array.isArray(grid) ? grid : []).length+1}).map((_, i) => (
              <option key={i} value={i}>Sau hàng số {i}</option>
            ))}
          </select>
          <div style={{display:'flex',gap:10,marginTop:10}}>
            <button className="btn-edit" onClick={handleAddWalkway}>Chèn</button>
            <button className="btn-delete" onClick={()=>setShowAddWalkway(false)}>Đóng</button>
          </div>
        </div>
      )}
      {/* Popup chèn đường đi dọc */}
      {showAddWalkwayCol && (
        <div className="center-popup">
          <h4>Chèn đường đi dọc</h4>
          <select value={walkwayColIdx} onChange={e => setWalkwayColIdx(Number(e.target.value))} style={{margin:'12px 0',fontSize:16}}>
            {Array.from({length: (Array.isArray(grid) ? grid[0] : [])?.length||0+1}).map((_, i) => (
              <option key={i} value={i}>Sau cột số {i}</option>
            ))}
          </select>
          <div style={{display:'flex',gap:10,marginTop:10}}>
            <button className="btn-edit" onClick={handleAddWalkwayCol}>Chèn</button>
            <button className="btn-delete" onClick={()=>setShowAddWalkwayCol(false)}>Đóng</button>
          </div>
        </div>
      )}
      {/* Popup xóa đường đi ngang */}
      {showDeleteWalkway && (
        <div className="center-popup">
          <h4>Xóa đường đi ngang</h4>
          <select
            value={deleteWalkwayIdx}
            onChange={e => setDeleteWalkwayIdx(Number(e.target.value))}
            style={{margin:'12px 0',fontSize:16}}
          >
            {walkwayRowIndexes.map((realIdx, i) => (
              <option key={realIdx} value={realIdx}>
                Hàng đường đi số {i + 1}
              </option>
            ))}
          </select>
          <div style={{display:'flex',gap:10,marginTop:10}}>
            <button className="btn-delete" onClick={handleDeleteWalkway}>Xóa</button>
            <button className="btn-edit" onClick={()=>setShowDeleteWalkway(false)}>Đóng</button>
          </div>
        </div>
      )}
      {/* Popup xóa đường đi dọc */}
      {showDeleteWalkwayCol && (
        <div className="center-popup">
          <h4>Xóa đường đi dọc</h4>
          <select value={deleteWalkwayColIdx} onChange={e => setDeleteWalkwayColIdx(Number(e.target.value))} style={{margin:'12px 0',fontSize:16}}>
            {(walkwayColIndexes.map((idx, i) => (
              <option key={i} value={i}>Cột đường đi số {i+1} (vị trí {idx})</option>
            )))}
          </select>
          <div style={{display:'flex',gap:10,marginTop:10}}>
            <button className="btn-delete" onClick={handleDeleteWalkwayCol}>Xóa</button>
            <button className="btn-edit" onClick={()=>setShowDeleteWalkwayCol(false)}>Đóng</button>
          </div>
        </div>
      )}
      {/* Render grid-table */}
      <div className="grid-table">
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
          
          // Kiểm tra cả row.type và walkwayRowIndexes
          if ((row && row.type === 'walkway-horizontal') || walkwayRowIndexes.includes(rowIdx)) {
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