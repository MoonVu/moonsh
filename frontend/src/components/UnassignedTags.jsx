import React from 'react';

const UnassignedTags = ({
  unassigned,
  handleTagDragStart,
  handleRemoveTag,
  showAddTag,
  setShowAddTag,
  canAddToTag,
  selectedToAdd,
  setSelectedToAdd,
  handleAddMultipleTags,
  handleSelectAll
}) => {
  return (
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
  );
};

export default UnassignedTags; 