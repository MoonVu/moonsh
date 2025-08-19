import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShowForPermission as AccessControl } from './auth/AccessControl';

const ActionPanel = ({ 
  showActionPanel, 
  setShowActionPanel,
  addRow,
  addCol,
  setShowDeleteRow,
  setShowDeleteCol,
  setShowAddWalkway,
  setShowAddWalkwayCol,
  setShowDeleteWalkwayCol,
  setRowToDelete,
  setColToDelete,
  setWalkwayRowIdx,
  setWalkwayColIdx,
  setDeleteWalkwayColIdx
}) => {
  return (
    showActionPanel && (
      <div className="modal-bg" onClick={() => setShowActionPanel(false)}>
        <div className="modal" style={{minWidth: 320, padding: '28px 24px'}} onClick={e => e.stopPropagation()}>
          <div style={{fontWeight:700, fontSize:20, marginBottom:18, color:'#29547A'}}>Thao tác</div>
          <div className="grid-controls" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
            <AccessControl resource="seats" action="edit" fallback={null}>
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={addRow}>+ Thêm hàng</button>
            </AccessControl>
            
            <AccessControl resource="seats" action="delete" fallback={null}>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={() => {
                setShowDeleteRow(true);
                setRowToDelete(0);
                setShowActionPanel(false);
              }}>− Xóa hàng</button>
            </AccessControl>
            
            <AccessControl resource="seats" action="edit" fallback={null}>
              <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={addCol}>+ Thêm cột</button>
            </AccessControl>
            
            <AccessControl resource="seats" action="delete" fallback={null}>
              <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={() => {
                setShowDeleteCol(true);
                setColToDelete(0);
                setShowActionPanel(false);
              }}>− Xóa cột</button>
            </AccessControl>
            <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={() => {
              setShowAddWalkway(true);
              setWalkwayRowIdx(0);
              setShowActionPanel(false);
            }}>+ Chèn đường đi ngang</button>
            <button className="btn-edit" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={() => {
              setShowAddWalkwayCol(true);
              setWalkwayColIdx(0);
              setShowActionPanel(false);
            }}>+ Chèn đường đi dọc</button>
            <button className="btn-delete" style={{minWidth:0, fontSize:15, padding:'7px 0'}} onClick={() => {
              setShowDeleteWalkwayCol(true);
              setDeleteWalkwayColIdx(0);
              setShowActionPanel(false);
            }}>− Xóa đường đi dọc</button>
          </div>
          <div style={{marginTop:18, textAlign:'right'}}>
            <button className="btn-edit" style={{fontSize:15, padding:'7px 18px'}} onClick={() => setShowActionPanel(false)}>Đóng</button>
          </div>
        </div>
      </div>
    )
  );
};

export default ActionPanel; 