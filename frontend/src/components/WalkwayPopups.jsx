import React from 'react';

const WalkwayPopups = ({
  showAddWalkway,
  setShowAddWalkway,
  walkwayRowIdx,
  setWalkwayRowIdx,
  handleAddWalkway,
  showAddWalkwayCol,
  setShowAddWalkwayCol,
  walkwayColIdx,
  setWalkwayColIdx,
  handleAddWalkwayCol,
  showDeleteWalkwayCol,
  setShowDeleteWalkwayCol,
  deleteWalkwayColIdx,
  setDeleteWalkwayColIdx,
  handleDeleteWalkwayCol,
  totalRows = 10,
  totalCols = 10,
  walkwayColIndexes = []
}) => {
  return (
    <>
      {/* Add Walkway Row Popup */}
      {showAddWalkway && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h4>Thêm lối đi ngang</h4>
            <div className="form-group">
              <label>Vị trí hàng:</label>
              <select
                value={walkwayRowIdx}
                onChange={(e) => setWalkwayRowIdx(parseInt(e.target.value))}
                className="form-select"
              >
                {Array.from({ length: totalRows + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    Hàng số {i}
                  </option>
                ))}
              </select>
            </div>
            <div className="popup-actions">
              <button className="btn btn-primary" onClick={handleAddWalkway}>
                Thêm
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddWalkway(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Walkway Column Popup */}
      {showAddWalkwayCol && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h4>Thêm lối đi dọc</h4>
            <div className="form-group">
              <label>Vị trí cột:</label>
              <select
                value={walkwayColIdx}
                onChange={(e) => setWalkwayColIdx(parseInt(e.target.value))}
                className="form-select"
              >
                {Array.from({ length: totalCols + 1 }, (_, i) => (
                  <option key={i} value={i}>
                    Cột số {i}
                  </option>
                ))}
              </select>
            </div>
            <div className="popup-actions">
              <button className="btn btn-primary" onClick={handleAddWalkwayCol}>
                Thêm
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddWalkwayCol(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Walkway Column Popup */}
      {showDeleteWalkwayCol && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h4>Xóa lối đi dọc</h4>
            <div className="form-group">
              <label>Chọn cột cần xóa:</label>
              <select
                value={deleteWalkwayColIdx}
                onChange={(e) => setDeleteWalkwayColIdx(parseInt(e.target.value))}
                className="form-select"
              >
                {walkwayColIndexes.map((colIdx, index) => (
                  <option key={colIdx} value={index}>
                    Cột số {colIdx}
                  </option>
                ))}
              </select>
            </div>
            <p>Bạn có chắc chắn muốn xóa lối đi dọc ở cột {walkwayColIndexes[deleteWalkwayColIdx] || 0}?</p>
            <div className="popup-actions">
              <button className="btn btn-danger" onClick={handleDeleteWalkwayCol}>
                Xóa
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowDeleteWalkwayCol(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalkwayPopups; 