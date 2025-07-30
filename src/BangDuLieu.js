import React, { useState, useEffect } from "react";
import "./BangDuLieu.css";
import apiService from "./services/api";
import { FaEllipsisV, FaKey } from 'react-icons/fa';

// Hàm kiểm tra quyền quản lý toàn hệ thống
const isFullManager = (groupValue) => {
  return ['CQ', 'PCQ', 'TT'].includes(groupValue);
};

const GROUPS = [
  { label: "Chủ Quản", value: "CQ" },
  { label: "Phó Chủ Quản", value: "PCQ" },
  { label: "Tổ trưởng", value: "TT" },
  { label: "XNK", value: "XNK" },
  { label: "FK", value: "FK", children: [
    { label: "FK-X", value: "FK-X" }
  ]},
  { label: "CSKH", value: "CSKH", children: [
    { label: "CSOL", value: "CSOL" },
    { label: "CSDL", value: "CSDL" },
    { label: "Truyền thông", value: "Truyền thông" }
  ]}
];
const STATUSES = ["Hoạt động", "Ngưng sử dụng", "Tạm khóa"];

const PAGE_SIZE = 15;

const STATUS_LABELS = {
  'Hoạt động': 'Hoạt động',
  'Tạm khóa': 'Tạm khóa',
  'Ngưng sử dụng': 'Ngưng sử dụng',
  1: 'Hoạt động',
  0: 'Tạm khóa',
  2: 'Ngưng sử dụng'
};

export default function BangDuLieu() {
  const [data, setData] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [deleteRow, setDeleteRow] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ tenTaiKhoan: "", group: GROUPS[0].value, status: STATUSES[0], ngayBatDau: "", password: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState({ group: [], status: [] });
  const [showFilter, setShowFilter] = useState({ group: false, status: false });
  const filterRef = React.useRef({});
  const [showGroupStats, setShowGroupStats] = useState(false);
  const [showWorkStats, setShowWorkStats] = useState(false);
  const [workStatsData, setWorkStatsData] = useState({ name: '', date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [actionMenuIdx, setActionMenuIdx] = useState(null);
  const [showChangePwdIdx, setShowChangePwdIdx] = useState(null);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdErrorDetail, setPwdErrorDetail] = useState("");
  const actionMenuRef = React.useRef();

  // Lấy user hiện tại từ profile API
  useEffect(() => {
    apiService.getProfile().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  // Lấy danh sách tài khoản từ API
  const fetchUsers = () => {
    setLoading(true);
    apiService.getUsers()
      .then(users => {
        // Map dữ liệu về đúng format cũ
        setData(users.map(u => ({
          key: u.id || u._id,
          tenTaiKhoan: u.username,
          group: u.group_name,
          status: STATUS_LABELS[u.status] || u.status,
          ngayBatDau: u.start_date && u.start_date !== "Chưa nhập" ? new Date(u.start_date).toISOString().slice(0, 10) : ""
        })));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };
  useEffect(() => { fetchUsers(); }, []);

  // Lọc dữ liệu theo tìm kiếm và filter
  const filteredData = data.filter(row =>
    row.tenTaiKhoan.toLowerCase().includes(search.toLowerCase()) &&
    (filter.group.length === 0 || filter.group.includes(row.group)) &&
    (filter.status.length === 0 || filter.status.includes(row.status))
  );
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE) || 1;
  const pagedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Thống kê nhóm quyền (tính cả group con)
  const groupStats = GROUPS.map(g => {
    const values = [g.value, ...(g.children ? g.children.map(c => c.value) : [])];
    return {
      group: g.label,
      count: filteredData.filter(row => values.includes(row.group)).length
    };
  });

  // Xử lý mở popup sửa
  const handleEdit = (row) => {
    setEditRow(row.key);
    setEditForm({ ...row });
    setShowEdit(true);
  };

  // Xử lý thay đổi form sửa
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Lưu sửa
  const handleEditSave = async () => {
    setLoading(true);
    try {
      // Chuẩn bị dữ liệu update
      const updateData = {
        username: editForm.tenTaiKhoan,
        group_name: editForm.group,
        status: editForm.status,
        // Nếu có password mới thì truyền vào, không thì bỏ qua
        ...(editForm.password ? { password: editForm.password } : {})
      };

      // Chỉ thêm start_date nếu có giá trị và không phải "Chưa nhập"
      if (editForm.ngayBatDau && editForm.ngayBatDau !== "Chưa nhập" && editForm.ngayBatDau.trim() !== "") {
        updateData.start_date = editForm.ngayBatDau;
      }

      // Thực hiện logic xử lý trước
      await apiService.updateUser(editRow, updateData);
      
      // Sau khi logic hoàn thành thành công, mới tắt popup
      setShowEdit(false);
      setEditRow(null);
      fetchUsers();
    } catch (err) {
      setError(err.message);
      // Nếu có lỗi, không tắt popup để user có thể sửa
    }
    setLoading(false);
  };

  // Xử lý mở popup xóa
  const handleDelete = (row) => {
    setDeleteRow(row.key);
    setShowDelete(true);
  };

  // Xác nhận xóa
  const handleDeleteConfirm = async () => {
    setLoading(true);
    try {
      // Thực hiện logic xóa user trước
      await apiService.deleteUser(deleteRow);
      
      // Sau khi xóa user thành công, xóa luôn dữ liệu lịch của user này
      try {
        // Lấy thông tin user trước khi xóa để biết userId
        const userToDelete = data.find(u => u.key === deleteRow);
        if (userToDelete) {
          // Xóa dữ liệu lịch của user này từ tất cả các nhóm
          const groups = ['CQ', 'PCQ', 'TT', 'XNK', 'FK', 'FK-X', 'CSKH', 'CSOL', 'CSDL', 'Truyền thông'];
          
          for (const group of groups) {
            try {
              // Xóa user khỏi shifts của nhóm
              await apiService.removeUserFromGroupShifts(group, deleteRow);
              console.log(`✅ Đã xóa user ${deleteRow} khỏi nhóm ${group}`);
            } catch (shiftErr) {
              console.log(`⚠️ Không thể xóa user khỏi shifts nhóm ${group}:`, shiftErr.message);
            }
            
            try {
              // Xóa user khỏi waiting list của nhóm
              await apiService.removeUserFromGroupWaiting(group, deleteRow);
              console.log(`✅ Đã xóa user ${deleteRow} khỏi waiting list nhóm ${group}`);
            } catch (waitingErr) {
              console.log(`⚠️ Không thể xóa user khỏi waiting list nhóm ${group}:`, waitingErr.message);
            }
          }
        }
      } catch (scheduleErr) {
        console.error("❌ Lỗi khi xóa dữ liệu lịch:", scheduleErr);
        // Không throw error vì user đã xóa thành công, chỉ log lỗi
      }

      // Cleanup orphaned users để đảm bảo dữ liệu sạch
      try {
        await apiService.cleanupOrphanedUsers();
        console.log("✅ Đã cleanup orphaned users");
      } catch (cleanupErr) {
        console.error("❌ Lỗi khi cleanup orphaned users:", cleanupErr);
      }
      
      // Sau khi logic hoàn thành thành công, mới tắt popup
      setShowDelete(false);
      setDeleteRow(null);
      fetchUsers();
      
      // Trigger refresh cho DemoLichDiCa để cập nhật dữ liệu
      if (window.refreshSchedules) {
        window.refreshSchedules();
      }
    } catch (err) {
      setError(err.message);
      // Nếu có lỗi, không tắt popup để user có thể thử lại
    }
    setLoading(false);
  };

  // Hủy xóa
  const handleDeleteCancel = () => {
    setShowDelete(false);
    setDeleteRow(null);
  };

  // Xử lý mở popup thêm mới
  const handleAdd = () => {
    setAddForm({ tenTaiKhoan: "", group: GROUPS[0].value, status: STATUSES[0], ngayBatDau: "", password: "" });
    setShowAdd(true);
  };

  // Xử lý thay đổi form thêm mới
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  // Lưu tài khoản mới
  const handleAddSave = async () => {
    setLoading(true);
    try {
      // Thực hiện logic tạo user trước
      await apiService.createUser({
        username: addForm.tenTaiKhoan,
        password: addForm.password || "123456",
        group_name: addForm.group,
        status: addForm.status,
        start_date: addForm.ngayBatDau
      });
      
      // Sau khi logic hoàn thành thành công, mới tắt popup
      setShowAdd(false);
      fetchUsers();
    } catch (err) {
      setError(err.message);
      // Nếu có lỗi, không tắt popup để user có thể sửa
    }
    setLoading(false);
  };

  // Đóng popup filter khi click ngoài
  React.useEffect(() => {
    function handleClick(e) {
      Object.keys(showFilter).forEach(key => {
        if (showFilter[key] && filterRef.current[key] && !filterRef.current[key].contains(e.target)) {
          setShowFilter(f => ({ ...f, [key]: false }));
        }
      });
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showFilter]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuIdx(null);
        setShowChangePwdIdx(null);
        setPwdError("");
        setPwdSuccess("");
      }
    }
    if (actionMenuIdx !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionMenuIdx]);

  // Hàm tính tổng số ngày/tháng/năm làm việc
  function getWorkDuration(dateStr) {
    if (!dateStr) return "";
    const start = new Date(dateStr);
    const now = new Date();
    const diffMs = now - start;
    if (isNaN(diffMs) || diffMs < 0) return "";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30.44);
    let seniority = Math.ceil(months / 12);
    if (seniority < 1) seniority = 1;
    return (
      <>
        <div style={{marginBottom: '8px', fontWeight: '600'}}><b>Tổng số ngày làm việc:</b> {days} ngày</div>
        <div style={{marginBottom: '8px', fontWeight: '600'}}><b>~ {months} tháng</b></div>
        <div style={{fontWeight: '600'}}><b>Thâm niên năm {seniority}</b></div>
      </>
    );
  }

  // Thêm hàm getStatusColorClass để trả về class theo trạng thái
  function getStatusColorClass(status) {
    if (status === 'Hoạt động') return 'status-green';
    if (status === 'Tạm khóa') return 'status-pink';
    if (status === 'Ngưng sử dụng') return 'status-gray';
    return '';
  }

  return (
    <div className="table-container">
      <div className="sticky-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="search-input"
              style={{ minWidth: 220 }}
            />
            <span className="account-count">Số lượng tài khoản: {filteredData.length}</span>
            <button className="counter-btn" onClick={() => setShowGroupStats(true)}>
              Thống kê nhóm quyền
            </button>
          </div>
          <button className="btn-edit" onClick={handleAdd}>Thêm tài khoản mới</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên tài khoản</th>
            <th style={{ position: 'relative' }}>
              Nhóm quyền
              <span className={`filter-icon${filter.group.length ? ' active' : ''}`} onClick={() => setShowFilter(f => ({ ...f, group: !f.group }))}>
                &#x1F50D;
              </span>
              {showFilter.group && (
                <div className="filter-dropdown" ref={el => filterRef.current.group = el} style={{ minWidth: 140 }}>
                  {GROUPS.map(g => (
                    <label key={g.value} style={{ display: 'block', marginBottom: 4 }}>
                      <input type="checkbox" checked={filter.group.includes(g.value)} onChange={() => {
                        setFilter(f => {
                          const arr = f.group.includes(g.value) ? f.group.filter(v => v !== g.value) : [...f.group, g.value];
                          return { ...f, group: arr };
                        });
                      }} /> {g.label}
                    </label>
                  ))}
                  <div className="filter-actions">
                    <button className="btn-filter" onClick={() => setFilter(f => ({ ...f, group: [] }))}>Bỏ lọc</button>
                    <button className="btn-filter" onClick={() => setShowFilter(f => ({ ...f, group: false }))}>Đóng</button>
                  </div>
                </div>
              )}
            </th>
            <th style={{ position: 'relative' }}>
              Trạng thái
              <span className={`filter-icon${filter.status.length ? ' active' : ''}`} onClick={() => setShowFilter(f => ({ ...f, status: !f.status }))}>
                &#x1F50D;
              </span>
              {showFilter.status && (
                <div className="filter-dropdown" ref={el => filterRef.current.status = el} style={{ minWidth: 140 }}>
                  {STATUSES.map(s => (
                    <label key={s} style={{ display: 'block', marginBottom: 4 }}>
                      <input type="checkbox" checked={filter.status.includes(s)} onChange={() => {
                        setFilter(f => {
                          const arr = f.status.includes(s) ? f.status.filter(v => v !== s) : [...f.status, s];
                          return { ...f, status: arr };
                        });
                      }} /> {s}
                    </label>
                  ))}
                  <div className="filter-actions">
                    <button className="btn-filter" onClick={() => setFilter(f => ({ ...f, status: [] }))}>Bỏ lọc</button>
                    <button className="btn-filter" onClick={() => setShowFilter(f => ({ ...f, status: false }))}>Đóng</button>
                  </div>
                </div>
              )}
            </th>
            <th>Ngày bắt đầu làm việc</th>
            <th style={{ textAlign: 'right', width: 80 }}>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {pagedData.map((row, idx) => (
            <tr key={row.key}>
              <td>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
              <td>{row.tenTaiKhoan}</td>
              <td><span className={`tag tag-group`}>{row.group}</span></td>
              <td>
                <span className={getStatusColorClass(row.status)}>{row.status}</span>
              </td>
              <td>
                {row.ngayBatDau && row.ngayBatDau.trim() !== "" ? (
                  <span
                    style={{ cursor: 'pointer', color: '#1890ff', fontWeight: 500 }}
                    onClick={() => { setWorkStatsData({ name: row.tenTaiKhoan, date: row.ngayBatDau }); setShowWorkStats(true); }}
                  >
                    {row.ngayBatDau}
                  </span>
                ) : <span style={{ color: '#aaa' }}>Chưa nhập</span>}
              </td>
              <td style={{ textAlign: 'right', position: 'relative' }}>
                <FaEllipsisV style={{ cursor: 'pointer', fontSize: 20 }} onClick={e => {
                  e.stopPropagation();
                  setActionMenuIdx(idx === actionMenuIdx ? null : idx);
                  setShowChangePwdIdx(null);
                }} />
                {actionMenuIdx === idx && (
                  <div className="action-dropdown-menu" ref={actionMenuRef} style={{ right: 0, left: 'auto', minWidth: 140, maxWidth: 260, wordBreak: 'break-word', overflow: 'visible' }}>
                    <div className="action-dropdown-arrow" />
                    <button className="action-dropdown-btn" onClick={() => { setActionMenuIdx(null); handleEdit(row); }}>Sửa thông tin</button>
                    <button className="action-dropdown-btn" onClick={() => { setShowChangePwdIdx(idx); setPwdError(""); setPwdSuccess(""); }}>Đổi mật khẩu</button>
                    <button className="action-dropdown-btn action-dropdown-btn-danger" onClick={() => { setActionMenuIdx(null); handleDelete(row); }}>Xóa tài khoản</button>
                    {showChangePwdIdx === idx && (
                      <div className="action-dropdown-changepwd">
                        <input type="password" placeholder="Mật khẩu mới" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                        {pwdError && <div style={{ color: 'red', fontSize: 13 }}>{pwdError}</div>}
                        {pwdErrorDetail && <div style={{ color: 'orange', fontSize: 12 }}>{pwdErrorDetail}</div>}
                        {pwdSuccess && <div style={{ color: 'green', fontSize: 13 }}>{pwdSuccess}</div>}
                        <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                          <button className="btn-edit" style={{ flex: 1 }} onClick={async () => {
                            setPwdError(""); setPwdSuccess(""); setPwdErrorDetail("");
                            if (!newPwd) { setPwdError("Vui lòng nhập mật khẩu mới!"); return; }
                            try {
                              await apiService.adminChangePassword({ userId: row.key, newPassword: newPwd });
                              setPwdSuccess("Đổi mật khẩu thành công!");
                              setNewPwd("");
                            } catch (err) {
                              let msg = err.message;
                              let detail = "";
                              if (err.response) {
                                detail = `Status: ${err.response.status}, Body: ${JSON.stringify(err.response.data)}`;
                              } else if (err.stack) {
                                detail = err.stack;
                              }
                              if (msg && msg.includes('body stream already read')) msg = 'Lỗi hệ thống, vui lòng thử lại!';
                              setPwdError(msg || "Đổi mật khẩu thất bại!");
                              setPwdErrorDetail(detail);
                            }
                          }}>Lưu</button>
                          <button className="btn-delete" style={{ flex: 1 }} onClick={() => { setShowChangePwdIdx(null); setPwdError(""); setPwdSuccess(""); setNewPwd(""); }}>Hủy</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination-container">
        <button
          className="pagination-btn"
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            className={`pagination-btn${currentPage === i + 1 ? ' active' : ''}`}
            onClick={() => setCurrentPage(i + 1)}
            style={{ fontWeight: currentPage === i + 1 ? 700 : 500 }}
          >
            {i + 1}
          </button>
        ))}
        <button
          className="pagination-btn"
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>

      {/* Popup thống kê nhóm quyền */}
      {showGroupStats && (
        <div className="modal-bg" onClick={() => setShowGroupStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Thống kê nhóm quyền</h3>
            <ul style={{margin:'16px 0'}}>
              {groupStats.map(g => (
                <li key={g.group} style={{fontSize:16,marginBottom:6,fontWeight:600}}>
                  {g.group}: <span style={{fontWeight:600}}>{g.count}</span>
                </li>
              ))}
            </ul>
            <button className="btn-edit" onClick={() => setShowGroupStats(false)}>Đóng</button>
          </div>
        </div>
      )}

      {/* Popup thêm tài khoản mới */}
      {showAdd && (
        <div className="modal-bg" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Thêm tài khoản mới</h3>
            <div className="form-group">
              <label>Tên tài khoản:</label>
              <input name="tenTaiKhoan" value={addForm.tenTaiKhoan} onChange={handleAddChange} />
            </div>
            <div className="form-group">
              <label>Mật khẩu:</label>
              <input name="password" type="password" value={addForm.password} onChange={handleAddChange} />
            </div>
            <div className="form-group">
              <label>Nhóm quyền:</label>
              <select name="group" value={addForm.group} onChange={handleAddChange}>
                {GROUPS.map(g =>
                  g.children ? (
                    <optgroup key={g.value} label={g.label}>
                      <option value={g.value}>{g.label}</option>
                      {g.children.map(child => (
                        <option key={child.value} value={child.value}>{child.label}</option>
                      ))}
                    </optgroup>
                  ) : (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  )
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Trạng thái:</label>
              <select name="status" value={addForm.status} onChange={handleAddChange}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ngày bắt đầu làm việc:</label>
              <input name="ngayBatDau" type="date" value={addForm.ngayBatDau || ""} onChange={handleAddChange} />
            </div>
            {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            <div style={{ marginTop: 16 }}>
              <button className="btn-edit" onClick={async () => {
                if (!addForm.tenTaiKhoan || !addForm.password) {
                  setError("Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!");
                  return;
                }
                setError("");
                await handleAddSave();
              }}>Lưu</button>
              <button className="btn-delete" onClick={() => setShowAdd(false)} style={{ marginLeft: 8 }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup sửa thông tin */}
      {showEdit && (
        <div className="modal-bg">
          <div className="modal">
            <h3>Sửa thông tin</h3>
            <div className="form-group">
              <label>Tên tài khoản:</label>
              <input 
                name="tenTaiKhoan" 
                value={editForm.tenTaiKhoan} 
                disabled 
                style={{ 
                  backgroundColor: '#f5f5f5', 
                  color: '#666', 
                  cursor: 'not-allowed',
                  border: '1px solid #d9d9d9'
                }} 
              />
            </div>
            <div className="form-group">
              <label>Nhóm quyền:</label>
              <select name="group" value={editForm.group} onChange={handleEditChange}>
                {GROUPS.map(g =>
                  g.children ? (
                    <optgroup key={g.value} label={g.label}>
                      <option value={g.value}>{g.label}</option>
                      {g.children.map(child => (
                        <option key={child.value} value={child.value}>{child.label}</option>
                      ))}
                    </optgroup>
                  ) : (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  )
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Trạng thái:</label>
              <select name="status" value={editForm.status} onChange={handleEditChange}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ngày bắt đầu làm việc: <span style={{ color: '#999', fontSize: '12px' }}>(Tùy chọn)</span></label>
              <input name="ngayBatDau" type="date" value={editForm.ngayBatDau || ""} onChange={handleEditChange} />
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn-edit" onClick={handleEditSave}>Lưu</button>
              <button className="btn-delete" onClick={() => setShowEdit(false)} style={{ marginLeft: 8 }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup xác nhận xóa */}
      {showDelete && (
        <div className="modal-bg">
          <div className="modal">
            <h3>Bạn có chắc chắn muốn xóa không?</h3>
            <div style={{ marginTop: 16 }}>
              <button className="btn-delete" onClick={handleDeleteConfirm}>Đồng ý</button>
              <button className="btn-edit" onClick={handleDeleteCancel} style={{ marginLeft: 8 }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup thống kê ngày làm việc */}
      {showWorkStats && (
        <div className="modal-bg" onClick={() => setShowWorkStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{fontSize: '24px', fontWeight: '700', color: '#18344a', marginBottom: '16px'}}>Thống kê ngày làm việc</h3>
            <div style={{margin:'16px 0', fontSize: '15px', lineHeight: '1.6'}}>
              <div style={{marginBottom: '10px', fontWeight: '500'}}><b>Tài khoản:</b> {workStatsData.name}</div>
              <div style={{marginBottom: '10px', fontWeight: '500'}}><b>Ngày bắt đầu:</b> {workStatsData.date}</div>
              <div style={{marginTop: '12px'}}>{getWorkDuration(workStatsData.date)}</div>
            </div>
            <button className="btn-edit" onClick={() => setShowWorkStats(false)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
} 
