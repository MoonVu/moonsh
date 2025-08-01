import React from 'react';

const ReplaceConfirmPopup = ({
  replaceTarget,
  dragged,
  grid,
  confirmReplace,
  cancelReplace
}) => {
  return (
    replaceTarget && (
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
    )
  );
};

export default ReplaceConfirmPopup; 