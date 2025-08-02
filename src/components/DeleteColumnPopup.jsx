import React from 'react';

const DeleteColumnPopup = ({ 
  showDeleteCol, 
  setShowDeleteCol, 
  selectedColsToDelete, 
  setSelectedColsToDelete, 
  handleRemoveMultipleCols 
}) => {
  if (!showDeleteCol) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <h4>Xóa cột</h4>
        <p>Bạn có chắc chắn muốn xóa {selectedColsToDelete.length} cột đã chọn?</p>
        
        <div className="popup-actions">
          <button 
            className="btn btn-danger" 
            onClick={handleRemoveMultipleCols}
          >
            Xóa
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowDeleteCol(false);
              setSelectedColsToDelete([]);
            }}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteColumnPopup; 