import { useMemo } from 'react';

export const useGridOperations = (grid, walkwayColIndexes, walkwayRowIndexes) => {
  // Hàm lấy index thực tế trong grid của các hàng chỗ ngồi
  const getSeatRowIndexes = (grid) => {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => Array.isArray(row) ? idx : -1).filter(idx => idx !== -1);
  };

  // Hàm lấy index thực tế trong grid của tất cả các hàng (cả thường và đường đi)
  const getAllRowIndexes = (grid) => {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => {
      if (Array.isArray(row) || (row && row.type === 'walkway-horizontal')) return idx;
      return -1;
    }).filter(idx => idx !== -1);
  };

  // Hàm lấy index thực tế trong grid của các hàng thường (không phải hàng đường đi)
  const getNormalRowIndexes = (grid) => {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => {
      if (Array.isArray(row)) return idx;
      return -1;
    }).filter(idx => idx !== -1);
  };

  // Hàm lấy index thực tế trong grid của các hàng đường đi
  const getWalkwayRowIndexes = (grid) => {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => {
      if (row && row.type === 'walkway-horizontal') return idx;
      return -1;
    }).filter(idx => idx !== -1);
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

  // Hàm tính toán vị trí cột dựa trên tổng số cột
  const getColumnPosition = (colIdx, totalCols) => {
    return {
      left: `${(colIdx / totalCols) * 100}%`,
      width: `${100 / totalCols}%`
    };
  };

  // Hàm safe set grid
  const safeSetGrid = (updater) => {
    return (setGrid) => {
      setGrid(g => {
        const next = updater(Array.isArray(g) ? g : []);
        return Array.isArray(next) ? next : [];
      });
    };
  };

  // Tính toán các indexes
  const seatRowIndexes = useMemo(() => getSeatRowIndexes(grid), [grid]);
  const normalRowIndexes = useMemo(() => getNormalRowIndexes(grid), [grid]);
  const allRowIndexes = useMemo(() => getAllRowIndexes(grid), [grid]);
  const walkwayRowIndexesFromGrid = useMemo(() => getWalkwayRowIndexes(grid), [grid]);

  return {
    seatRowIndexes,
    normalRowIndexes,
    allRowIndexes,
    walkwayRowIndexesFromGrid,
    getSeatRowIndexes,
    getAllRowIndexes,
    getNormalRowIndexes,
    getWalkwayRowIndexes,
    syncGridCols,
    getColumnPosition,
    safeSetGrid
  };
}; 