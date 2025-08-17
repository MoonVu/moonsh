import React, { useState, useEffect, useMemo } from "react";
import './ViTriChoNgoi.css';
import apiService from './services/api';
import GridRow from './GridRow';

// Import custom hooks
import { useSeatData } from './hooks/useSeatData';
import { useGridOperations } from './hooks/useGridOperations';
import { useDragAndDrop } from './hooks/useDragAndDrop';

// Import components
import ActionPanel from './components/ActionPanel';
import DeleteRowPopup from './components/DeleteRowPopup';
import DeleteColumnPopup from './components/DeleteColumnPopup';
import WalkwayPopups from './components/WalkwayPopups';
import UnassignedTags from './components/UnassignedTags';
import ReplaceConfirmPopup from './components/ReplaceConfirmPopup';
import StatusBar from './components/StatusBar';

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
  // Custom hooks
  const {
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
    lastModifiedBy,
    lastModifiedAt,
    saveSeatDataToServer
  } = useSeatData();

  const {
    allRowIndexes,
    syncGridCols
  } = useGridOperations(grid, walkwayColIndexes, walkwayRowIndexes);

  const {
    dragged,
    setDragged,
    replaceTarget,
    setReplaceTarget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    confirmReplace,
    cancelReplace,
    handleTagDragStart
  } = useDragAndDrop(grid, tagList, setGrid, setTagList, saveSeatDataToServer, walkwayColIndexes, walkwayRowIndexes);

  // State cho UI
  const [accounts, setAccounts] = useState([]);
  const [showAddTag, setShowAddTag] = useState(false);
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

  // Lấy danh sách tài khoản từ backend
  useEffect(() => {
    apiService.getUsers()
      .then(users => {
        // Handle both array and object response formats
        const usersArray = Array.isArray(users) ? users : (users?.data || []);
        console.log("🔍 ViTriChoNgoi getUsers response:", { 
          type: typeof users, 
          isArray: Array.isArray(users), 
          finalArray: Array.isArray(usersArray),
          count: usersArray.length 
        });
        setAccounts(usersArray.filter(a => a.status !== 'Ngưng sử dụng'));
      })
      .catch((err) => {
        console.error('Lỗi khi gọi API getUsers:', err);
        setAccounts([]);
      });
  }, []);

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
    
    // Chỉ cập nhật nếu khác với state hiện tại
    if (JSON.stringify(colIndexes) !== JSON.stringify(walkwayColIndexes)) {
      setWalkwayColIndexes(colIndexes);
    }
    
    if (JSON.stringify(rowIndexes) !== JSON.stringify(walkwayRowIndexes)) {
      setWalkwayRowIndexes(rowIndexes);
    }
  }, [grid, walkwayColIndexes, walkwayRowIndexes]);

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

  // Thêm hàng thường
  const addRow = () => {
    const normalRows = grid.map((row, idx) => Array.isArray(row) ? idx : -1).filter(idx => idx !== -1);
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
    saveSeatDataToServer(newGrid, tagList, walkwayColIndexes, walkwayRowIndexes);
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
    const allRows = allRowIndexes;
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
    
    const allRows = allRowIndexes;
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
      {/* Status bar */}
      <StatusBar
        syncStatus={syncStatus}
        lastModifiedBy={lastModifiedBy}
        lastModifiedAt={lastModifiedAt}
        setShowActionPanel={setShowActionPanel}
      />

      {/* Action Panel */}
      <ActionPanel
        showActionPanel={showActionPanel}
        setShowActionPanel={setShowActionPanel}
        addRow={addRow}
        addCol={addCol}
        setShowDeleteRow={setShowDeleteRow}
        setShowDeleteCol={setShowDeleteCol}
        setShowAddWalkway={setShowAddWalkway}
        setShowAddWalkwayCol={setShowAddWalkwayCol}
        setShowDeleteWalkwayCol={setShowDeleteWalkwayCol}
        setRowToDelete={setRowToDelete}
        setColToDelete={setColToDelete}
        setWalkwayRowIdx={setWalkwayRowIdx}
        setWalkwayColIdx={setWalkwayColIdx}
        setDeleteWalkwayColIdx={setDeleteWalkwayColIdx}
      />

      {/* Delete Row Popup */}
      <DeleteRowPopup
        showDeleteRow={showDeleteRow}
        setShowDeleteRow={setShowDeleteRow}
        allRowIndexes={allRowIndexes}
        grid={grid}
        selectedRowsToDelete={selectedRowsToDelete}
        setSelectedRowsToDelete={setSelectedRowsToDelete}
        handleRemoveMultipleRows={handleRemoveMultipleRows}
        handleRemoveRow={handleRemoveRow}
        rowToDelete={rowToDelete}
      />

      {/* Delete Column Popup */}
      <DeleteColumnPopup
        showDeleteCol={showDeleteCol}
        setShowDeleteCol={setShowDeleteCol}
        grid={grid}
        selectedColsToDelete={selectedColsToDelete}
        setSelectedColsToDelete={setSelectedColsToDelete}
        handleRemoveMultipleCols={handleRemoveMultipleCols}
        handleRemoveCol={handleRemoveCol}
        colToDelete={colToDelete}
      />

      {/* Walkway Popups */}
      <WalkwayPopups
        showAddWalkway={showAddWalkway}
        setShowAddWalkway={setShowAddWalkway}
        walkwayRowIdx={walkwayRowIdx}
        setWalkwayRowIdx={setWalkwayRowIdx}
        handleAddWalkway={handleAddWalkway}
        showAddWalkwayCol={showAddWalkwayCol}
        setShowAddWalkwayCol={setShowAddWalkwayCol}
        walkwayColIdx={walkwayColIdx}
        setWalkwayColIdx={setWalkwayColIdx}
        handleAddWalkwayCol={handleAddWalkwayCol}
        showDeleteWalkwayCol={showDeleteWalkwayCol}
        setShowDeleteWalkwayCol={setShowDeleteWalkwayCol}
        deleteWalkwayColIdx={deleteWalkwayColIdx}
        setDeleteWalkwayColIdx={setDeleteWalkwayColIdx}
        handleDeleteWalkwayCol={handleDeleteWalkwayCol}
        walkwayColIndexes={walkwayColIndexes}
        grid={grid}
        totalRows={grid.length}
        totalCols={grid[0] && Array.isArray(grid[0]) ? grid[0].length : 0}
      />

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

      {/* Unassigned Tags */}
      <UnassignedTags
        unassigned={unassigned}
        handleTagDragStart={handleTagDragStart}
        handleRemoveTag={handleRemoveTag}
        showAddTag={showAddTag}
        setShowAddTag={setShowAddTag}
        canAddToTag={canAddToTag}
        selectedToAdd={selectedToAdd}
        setSelectedToAdd={setSelectedToAdd}
        handleAddMultipleTags={handleAddMultipleTags}
        handleSelectAll={handleSelectAll}
      />

      {/* Replace Confirm Popup */}
      <ReplaceConfirmPopup
        replaceTarget={replaceTarget}
        dragged={dragged}
        grid={grid}
        confirmReplace={confirmReplace}
        cancelReplace={cancelReplace}
      />
    </div>
  );
}