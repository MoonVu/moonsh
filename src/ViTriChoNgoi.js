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
  const [grid, setGrid] = useState(() => {
    const saved = localStorage.getItem('vitri_grid');
    try {
      const parsed = saved ? JSON.parse(saved) : initialGrid;
      return Array.isArray(parsed) ? parsed : initialGrid;
    } catch {
      return initialGrid;
    }
  });
  const [dragged, setDragged] = useState(null); // {row, col} hoặc {account}
  const [replaceTarget, setReplaceTarget] = useState(null); // {from, to}
  const [accounts, setAccounts] = useState([]);
  const [showAddTag, setShowAddTag] = useState(false);
  const [tagList, setTagList] = useState(() => {
    const saved = localStorage.getItem('vitri_taglist');
    return saved ? JSON.parse(saved) : [];
  }); // key của acc trong tag
  const [selectedToAdd, setSelectedToAdd] = useState([]); // key[]
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

  // Lấy danh sách tài khoản từ backend, chỉ loại bỏ 'Ngưng sử dụng'
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

  // Lưu grid vào localStorage khi thay đổi
  useEffect(() => {
    // Lưu toàn bộ grid (bao gồm cả walkway-horizontal, walkway-vertical)
    localStorage.setItem('vitri_grid', JSON.stringify(grid));
  }, [grid]);

  // Lưu tagList vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('vitri_taglist', JSON.stringify(tagList));
  }, [tagList]);

  // Cập nhật walkwayColIndexes mỗi khi grid thay đổi
  useEffect(() => {
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
    setWalkwayColIndexes(indexes);
  }, [grid]);

  // Lấy danh sách key đã có trên lưới (ưu tiên _id, username, name)
  const assignedKeys = useMemo(() => (
    (Array.isArray(grid) ? grid : [])
      .flat()
      .filter(Boolean)
      .map(cell => cell._id || cell.username || cell.name || cell.key || cell.tenTaiKhoan)
  ), [grid]);
  // Lọc tài khoản có thể thêm: chỉ loại bỏ những tài khoản đã có trên lưới hoặc trong tagList (ưu tiên _id)
  const canAddToTag = useMemo(() => (
    (Array.isArray(accounts) ? accounts : []).filter(acc =>
      !tagList.includes(acc._id) && !assignedKeys.includes(acc._id)
    )
  ), [accounts, tagList, assignedKeys]);
  // Chỉ log khi debug, không log liên tục khi render
  useEffect(() => {
    // Uncomment để debug khi cần
    // console.log('accounts:', accounts);
    // console.log('tagList:', tagList);
    // console.log('assignedKeys:', assignedKeys);
    // console.log('canAddToTag:', canAddToTag);
  }, [accounts, tagList, assignedKeys, canAddToTag]);

  // Danh sách tài khoản trong tagList (không lọc theo lưới)
  const unassigned = (Array.isArray(accounts) ? accounts : []).filter(acc => (Array.isArray(tagList) ? tagList : []).includes(acc._id));
  // Danh sách có thể thêm vào tagList: chưa có trong tagList và chưa có trên lưới
  const assignedNames = (Array.isArray(grid) ? grid : []).flat().filter(Boolean).map(cell => cell.name);

  // Hàm lấy index thực tế trong grid của các hàng chỗ ngồi (là mảng)
  function getSeatRowIndexes(grid) {
    return (Array.isArray(grid) ? grid : []).map((row, idx) => Array.isArray(row) ? idx : -1).filter(idx => idx !== -1);
  }

  // Khi render, khi xóa, khi đánh số, chỉ dùng các index này
  const seatRowIndexes = getSeatRowIndexes(grid);

  // Thêm hàng: thêm vào sau hàng chỗ ngồi cuối cùng
  const addRow = () => {
    const seatRows = getSeatRowIndexes(grid);
    const insertIdx = seatRows.length > 0 ? seatRows[seatRows.length - 1] + 1 : 0;
    setGrid(g => {
      const newGrid = [...g];
      newGrid.splice(insertIdx, 0, Array(g[0]?.length || 4).fill(null));
      return newGrid;
    });
  };

  // Thêm cột
  const addCol = () => {
    setGrid(g => g.map(row => Array.isArray(row) ? [...row, null] : row));
  };

  // Bắt đầu kéo
  const handleDragStart = (rowIdx, colIdx) => {
    if (!Array.isArray(grid[rowIdx])) return; // Không cho kéo ở walkway
    setDragged({ row: rowIdx, col: colIdx });
  };
  // Kéo qua ô
  const handleDragOver = (e, rowIdx, colIdx) => {
    e.preventDefault();
  };
  // Thả vào ô
  const handleDrop = (rowIdx, colIdx) => {
    if (!dragged) return;
    if (!Array.isArray(grid[rowIdx])) return; // Không cho thả vào walkway
    if (dragged.row === rowIdx && dragged.col === colIdx) return;
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
        setTagList(list => list.filter(k => k !== dragged.account._id));
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
    }
    setDragged(null);
  };
  // Xác nhận thay thế
  const confirmReplace = () => {
    if (!replaceTarget) return;
    const { from, to } = replaceTarget;
    const newGrid = grid.map((r, i) => {
      if (!Array.isArray(r)) return r;
      return [...r];
    });
    // Đổi chỗ 2 ô (chỉ nếu cả 2 dòng là mảng)
    if (Array.isArray(newGrid[to.row]) && Array.isArray(newGrid[from.row])) {
      const temp = newGrid[to.row][to.col];
      newGrid[to.row][to.col] = newGrid[from.row][from.col];
      newGrid[from.row][from.col] = temp;
    }
    setGrid(newGrid);
    setReplaceTarget(null);
  };
  // Hủy thay thế
  const cancelReplace = () => setReplaceTarget(null);

  // Kéo tag từ dưới lên lưới
  const handleTagDragStart = (acc) => {
    setDragged({ account: acc });
  };

  // Xóa nhân viên khỏi lưới (đưa về tag)
  const handleRemoveFromGrid = (rowIdx, colIdx) => {
    const cell = grid[rowIdx][colIdx];
    if (!cell) return;
    setGrid(g => {
      const newGrid = g.map(r => Array.isArray(r) ? [...r] : r);
      newGrid[rowIdx][colIdx] = null;
      return newGrid;
    });
    // Thêm lại vào tagList nếu chưa có
    if (cell._id && !tagList.includes(cell._id)) {
      setTagList(list => [...list, cell._id]);
    }
  };

  // Thêm nhiều nhân viên vào tagList
  const handleAddMultipleTags = () => {
    setTagList(list => [
      ...list,
      ...selectedToAdd.filter(k => {
        const acc = (Array.isArray(accounts) ? accounts : []).find(a => a._id === k);
        return acc && !assignedKeys.includes(acc._id) && !list.includes(k);
      })
    ]);
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
    setTagList(list => list.filter(k => k !== _id));
  };

  // Xóa hàng: chỉ xóa hàng chỗ ngồi, không xóa walkway
  const handleRemoveRow = (displayIdx) => {
    const seatRows = getSeatRowIndexes(grid);
    const realIdx = seatRows[displayIdx];
    if (realIdx === undefined) return;
    setGrid(g => {
      const removedRow = g[realIdx];
      if (Array.isArray(removedRow)) {
      removedRow.forEach(cell => {
        if (cell) {
            const acc = (Array.isArray(accounts) ? accounts : []).find(a => a.tenTaiKhoan === cell.name);
            if (acc && !assignedNames.includes(acc.tenTaiKhoan) && !(Array.isArray(tagList) ? tagList : []).includes(acc._id)) setTagList(list => [...list, acc._id]);
        }
      });
      }
      return g.filter((_, i) => i !== realIdx);
    });
  };
  // Xóa cột
  const handleRemoveCol = (colIdx) => {
    safeSetGrid(g => g.map(row => {
      if (!Array.isArray(row)) return row;
      const cell = row[colIdx];
      if (cell) {
        const acc = (Array.isArray(accounts) ? accounts : []).find(a => a.tenTaiKhoan === cell.name);
        if (acc && !assignedNames.includes(acc.tenTaiKhoan) && !(Array.isArray(tagList) ? tagList : []).includes(acc._id)) setTagList(list => [...list, acc._id]);
      }
      return row.filter((_, i) => i !== colIdx);
    }));
  };

  // Thêm hàng đường đi ngang vào grid
  const handleAddWalkway = () => {
    setGrid(g => {
      const newGrid = [...g];
      newGrid.splice(walkwayRowIdx, 0, { type: 'walkway-horizontal' });
      return newGrid;
    });
    setShowAddWalkway(false);
  };

  // Thêm cột đường đi dọc vào grid
  const handleAddWalkwayCol = () => {
    setGrid(g => g.map(row => {
      if (row && row.type === 'walkway-horizontal') return row;
      const newRow = [...row];
      newRow.splice(walkwayColIdx, 0, { type: 'walkway-vertical' });
      return newRow;
    }));
    setShowAddWalkwayCol(false);
  };

  // Tạo mảng walkwayRowIndexes để xác định đúng vị trí các hàng walkway-horizontal
  const walkwayRowIndexes = (Array.isArray(grid) ? grid : []).map((row, idx) => (row?.type === 'walkway-horizontal' ? idx : -1))
    .filter(idx => idx >= 0);

  // Sửa lại handleDeleteWalkway để xóa đúng index thực tế
  const handleDeleteWalkway = () => {
    setGrid(g => g.filter((_, idx) => idx !== deleteWalkwayIdx));
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

const handleDeleteWalkwayCol = () => {
  // Tìm danh sách các index cột có walkway-vertical
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

  setGrid(g => {
    const newGrid = g.map(row => {
      if (!Array.isArray(row)) return row;
      const newRow = [...row];
      newRow.splice(realIdx, 1); // Xóa luôn vì chắc chắn là walkway
      return newRow;
    });
    return syncGridCols(newGrid);
  });

  setShowDeleteWalkwayCol(false);
};

  // Sửa các hàm như sau:
  const safeSetGrid = (updater) => setGrid(g => {
    const next = updater(Array.isArray(g) ? g : []);
    return Array.isArray(next) ? next : [];
  });

  return (
    <div className="vitri-root">
      <div style={{marginBottom: 16}}>
        <button className="btn-edit" style={{minWidth:120, fontWeight:700, fontSize:17}} onClick={()=>setShowActionPanel(true)}>Thao tác</button>
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
              <option key={idx} value={idx}>Cột đường đi số {i+1}</option>
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
          if (row && row.type === 'walkway-horizontal') {
            return (
            <div className="walkway-row" key={rowIdx} style={{display:'flex',alignItems:'center',justifyContent:'center',height:40,background:'#e0e6ed',position:'relative'}}>
              <span style={{fontWeight:600,fontSize:16,color:'#29547A',letterSpacing:1}}>Đường đi</span>
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