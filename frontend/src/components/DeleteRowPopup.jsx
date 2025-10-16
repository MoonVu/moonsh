import React from 'react';

const DeleteRowPopup = ({
  showDeleteRow,
  setShowDeleteRow,
  allRowIndexes,
  grid,
  selectedRowsToDelete,
  setSelectedRowsToDelete,
  handleRemoveMultipleRows,
  handleRemoveRow,
  rowToDelete
}) => {
  return (
    showDeleteRow && (
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
    )
  );
};

export default DeleteRowPopup; 