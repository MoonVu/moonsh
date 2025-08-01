import { useState } from 'react';

export const useDragAndDrop = (grid, tagList, setGrid, setTagList, saveSeatDataToServer, walkwayColIndexes, walkwayRowIndexes, accounts) => {
  const [dragged, setDragged] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);

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

  return {
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
  };
}; 