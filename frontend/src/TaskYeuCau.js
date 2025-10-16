import React, { useState, useEffect, useRef } from "react";
import "./TaskYeuCau.css";
import { FaEdit, FaPencilAlt } from "react-icons/fa";

const STATUS = [
  { value: "Chưa bắt đầu", color: "status-blue" },
  { value: "Đang thực hiện", color: "status-yellow" },
  { value: "Đã hoàn thành", color: "status-green" },
  { value: "Hủy, không làm được", color: "status-red" },
  { value: "Ưu tiên", color: "status-priority" }
];
const LOCAL_KEY = "taskyeucau_data";

// Mảng rỗng cho người yêu cầu
const NGUOI_YEU_CAU = [];

export default function TaskYeuCau({ user }) {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showDelete, setShowDelete] = useState({ show: false, id: null });
  const [showNhan, setShowNhan] = useState({ show: false, id: null });
  const [duKienNhan, setDuKienNhan] = useState("");
  const [rowNhan, setRowNhan] = useState(null);
  const [rowEditStatus, setRowEditStatus] = useState(null);

  // Đặt emptyForm bên trong component để dùng được user
  const emptyForm = {
    task: "",
    status: STATUS[0].value,
    nguoiYeuCau: user?.tenTaiKhoan || "",
    nguoiThucHien: "",
    ngayYeuCau: getTodayGMT7(),
    thoiGianTiepNhan: "",
    duKien: "",
    thoiGianHoanThanh: "",
    ghiChu: ""
  };
  const [form, setForm] = useState({ ...emptyForm });

  // Filter state (multi-select)
  const [filter, setFilter] = useState({ status: [], nguoiYeuCau: [], nguoiThucHien: [] });
  const [showFilter, setShowFilter] = useState({ status: false, nguoiYeuCau: false, nguoiThucHien: false });
  const filterRef = useRef({});

  // Filtered data (multi)
  const filteredData = data.filter(row => {
    return (
      (filter.status.length === 0 || filter.status.includes(row.status)) &&
      (filter.nguoiYeuCau.length === 0 || filter.nguoiYeuCau.includes(row.nguoiYeuCau)) &&
      (filter.nguoiThucHien.length === 0 || filter.nguoiThucHien.includes(row.nguoiThucHien))
    );
  });

  // Counters
  const countTotal = filteredData.length;
  const countChuaThucHien = filteredData.filter(row => row.status === "Chưa bắt đầu").length;
  const countDaHoanThanh = filteredData.filter(row => row.status === "Đã hoàn thành").length;
  const countDaHuy = filteredData.filter(row => row.status === "Hủy, không làm được").length;

  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  }, [data]);

  // Đóng filter khi click ngoài
  useEffect(() => {
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

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === "nguoiThucHien" && value && !form.thoiGianTiepNhan) {
      setForm(f => ({ ...f, nguoiThucHien: value, thoiGianTiepNhan: getTodayGMT7() }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleAdd = () => {
    if (!form.task.trim()) return;
    setData(prev => [
      ...prev,
      { ...form, status: STATUS[0].value, ngayYeuCau: getTodayGMT7(), id: Date.now() }
    ]);
    setForm({ ...emptyForm });
    setAdding(false);
  };

  const handleEdit = (row) => {
    setEditing(row.id);
    setForm(row);
  };

  const handleSave = () => {
    setData(prev => prev.map(row => row.id === editing ? { ...form, id: editing } : row));
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const handleDelete = (id) => {
    setShowDelete({ show: true, id });
  };

  const handleDeleteXacNhan = () => {
    // Thực hiện logic xóa trước
    setData(prev => prev.filter(row => row.id !== showDelete.id));
    
    // Sau khi logic hoàn thành, mới tắt popup
    setShowDelete({ show: false, id: null });
  };

  const handleCancel = () => {
    setEditing(null);
    setAdding(false);
    setForm({ ...emptyForm });
  };

  // Nhận task
  const handleNhan = (row) => {
    setShowNhan({ show: true, id: row.id });
    setDuKienNhan(row.duKien || "");
    setRowNhan(row.id);
  };
  const handleNhanXacNhan = () => {
    // Thực hiện logic nhận task trước
    setData(prev => prev.map(row => row.id === showNhan.id ? {
      ...row,
      nguoiThucHien: user?.tenTaiKhoan || "",
      thoiGianTiepNhan: getTodayGMT7(),
      duKien: duKienNhan
    } : row));
    
    // Sau khi logic hoàn thành, mới tắt popup
    setShowNhan({ show: false, id: null });
    setDuKienNhan("");
    setRowNhan(showNhan.id);
  };

  return (
    <div className="taskyeucau-root">
      <h2>Bảng yêu cầu công việc</h2>
      {/* Bộ đếm và filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="taskyeucau-counter">
          Số lượng task: <b>{countTotal}</b> &nbsp;|&nbsp; Chưa thực hiện: <b>{countChuaThucHien}</b> &nbsp;|&nbsp; Đã hoàn thành: <b>{countDaHoanThanh}</b> &nbsp;|&nbsp; Đã hủy: <b>{countDaHuy}</b>
        </div>
      </div>
      <div className="taskyeucau-table-wrap">
        <table className="taskyeucau-table">
          <colgroup>
            <col style={{ width: '48px' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '110px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>STT</th>
              <th>Task yêu cầu</th>
              <th style={{ position: 'relative' }}>
                Trạng thái
                <span className={`filter-icon${filter.status.length ? ' active' : ''}`} onClick={() => setShowFilter(f => ({ ...f, status: !f.status }))}>
                  &#x1F50D;
                </span>
                {showFilter.status && (
                  <div className="filter-dropdown" ref={el => filterRef.current.status = el}>
                    {STATUS.map(s => (
                      <label key={s.value}>
                        <input type="checkbox" checked={filter.status.includes(s.value)} onChange={e => {
                          setFilter(f => {
                            const arr = f.status.includes(s.value)
                              ? f.status.filter(v => v !== s.value)
                              : [...f.status, s.value];
                            return { ...f, status: arr };
                          });
                        }} />
                        {s.value}
                      </label>
                    ))}
                    <div className="filter-actions">
                      <button className="btn-filter" onClick={() => setFilter(f => ({ ...f, status: [] }))}>Bỏ lọc</button>
                      <button className="btn-filter" onClick={() => setShowFilter(f => ({ ...f, status: false }))}>Đóng</button>
                    </div>
                  </div>
                )}
              </th>
              <th style={{ position: 'relative' }}>
                Người yêu cầu
                <span className={`filter-icon${filter.nguoiYeuCau.length ? ' active' : ''}`} onClick={() => setShowFilter(f => ({ ...f, nguoiYeuCau: !f.nguoiYeuCau }))}>
                  &#x1F50D;
                </span>
                {showFilter.nguoiYeuCau && (
                  <div className="filter-dropdown" ref={el => filterRef.current.nguoiYeuCau = el}>
                    {[...new Set(data.map(row => row.nguoiYeuCau).filter(Boolean))].map(u => (
                      <label key={u}>
                        <input type="checkbox" checked={filter.nguoiYeuCau.includes(u)} onChange={e => {
                          setFilter(f => {
                            const arr = f.nguoiYeuCau.includes(u)
                              ? f.nguoiYeuCau.filter(v => v !== u)
                              : [...f.nguoiYeuCau, u];
                            return { ...f, nguoiYeuCau: arr };
                          });
                        }} />
                        {u}
                      </label>
                    ))}
                    <div className="filter-actions">
                      <button className="btn-filter" onClick={() => setFilter(f => ({ ...f, nguoiYeuCau: [] }))}>Bỏ lọc</button>
                      <button className="btn-filter" onClick={() => setShowFilter(f => ({ ...f, nguoiYeuCau: false }))}>Đóng</button>
                    </div>
                  </div>
                )}
              </th>
              <th style={{ position: 'relative' }}>
                Người thực hiện
                <span className={`filter-icon${filter.nguoiThucHien.length ? ' active' : ''}`} onClick={() => setShowFilter(f => ({ ...f, nguoiThucHien: !f.nguoiThucHien }))}>
                  &#x1F50D;
                </span>
                {showFilter.nguoiThucHien && (
                  <div className="filter-dropdown" ref={el => filterRef.current.nguoiThucHien = el}>
                    {[...new Set(data.map(row => row.nguoiThucHien).filter(Boolean))].map(u => (
                      <label key={u}>
                        <input type="checkbox" checked={filter.nguoiThucHien.includes(u)} onChange={e => {
                          setFilter(f => {
                            const arr = f.nguoiThucHien.includes(u)
                              ? f.nguoiThucHien.filter(v => v !== u)
                              : [...f.nguoiThucHien, u];
                            return { ...f, nguoiThucHien: arr };
                          });
                        }} />
                        {u}
                      </label>
                    ))}
                    <div className="filter-actions">
                      <button className="btn-filter" onClick={() => setFilter(f => ({ ...f, nguoiThucHien: [] }))}>Bỏ lọc</button>
                      <button className="btn-filter" onClick={() => setShowFilter(f => ({ ...f, nguoiThucHien: false }))}>Đóng</button>
                    </div>
                  </div>
                )}
              </th>
              <th>Ngày yêu cầu</th>
              <th>Thời gian tiếp nhận</th>
              <th>Dự kiến</th>
              <th>Thời gian hoàn thành</th>
              <th>Ghi chú</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => (
              editing === row.id ? (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>{idx + 1}</td>
                  <td><input name="task" value={form.task} onChange={handleChange} placeholder="Task yêu cầu" /></td>
                  <td>
                    <select name="status" value={form.status} onChange={handleChange}>
                      {STATUS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                    </select>
                  </td>
                  <td>
                    <input value={user?.tenTaiKhoan || ""} disabled style={{ background: '#f7fdff', color: '#29547A', fontWeight: 500, border: 'none', width: '100%', textAlign: 'center' }} />
                  </td>
                  <td>
                    <select name="nguoiThucHien" value={form.nguoiThucHien} onChange={handleChange}>
                      <option value="">-- Chọn --</option>
                      {NGUOI_YEU_CAU.map(u => <option key={u.tenTaiKhoan} value={u.tenTaiKhoan}>{u.tenTaiKhoan}</option>)}
                    </select>
                  </td>
                  <td><input name="ngayYeuCau" value={form.ngayYeuCau} disabled style={{ textAlign: 'center', background: '#f7fdff', color: '#29547A', border: 'none', width: '100%' }} /></td>
                  <td><input name="thoiGianTiepNhan" value={form.thoiGianTiepNhan} disabled style={{ textAlign: 'center', background: '#f7fdff', color: '#29547A', border: 'none', width: '100%' }} /></td>
                  <td><input name="duKien" type="date" value={form.duKien} onChange={handleChange} min={form.ngayYeuCau} style={{ textAlign: 'center' }} /></td>
                  <td style={{ textAlign: 'center' }}>{getThoiGianHoanThanh(form)}</td>
                  <td><textarea name="ghiChu" value={form.ghiChu} onChange={handleChange} placeholder="Ghi chú" style={{ minWidth: 80, textAlign: 'center' }} /></td>
                  <td>
                    <button className="btn-edit" onClick={handleSave}>Lưu</button>
                    <button className="btn-delete" onClick={handleCancel}>Hủy</button>
                  </td>
                </tr>
              ) : (
                <tr key={row.id}>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>{idx + 1}</td>
                  <td style={{ textAlign: 'left', fontWeight: 500 }}>{row.task}</td>
                  <td>
                    {rowEditStatus === row.id && row.nguoiThucHien === user?.tenTaiKhoan ? (
                      <select name="status" value={row.status} onChange={e => {
                        setData(prev => prev.map(r => r.id === row.id ? { ...r, status: e.target.value } : r));
                        setRowEditStatus(null);
                      }} onBlur={() => setRowEditStatus(null)} autoFocus>
                        {STATUS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                      </select>
                    ) : (
                      <>
                        <span className={getStatusColor(row.status)}>{row.status}</span>
                        {row.nguoiThucHien === user?.tenTaiKhoan && (
                          <button style={{ background: 'none', border: 'none', marginLeft: 6, cursor: 'pointer', padding: 0, verticalAlign: 'middle', display: 'inline-block' }} title="Sửa trạng thái" onClick={() => setRowEditStatus(row.id)}>
                            <FaPencilAlt size={15} color="#29547A" style={{ verticalAlign: 'middle', display: 'inline-block' }} />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>{row.nguoiYeuCau}</td>
                  <td style={{ textAlign: 'center' }}>{row.nguoiThucHien}</td>
                  <td style={{ textAlign: 'center' }}>{formatDate(row.ngayYeuCau)}</td>
                  <td style={{ textAlign: 'center' }}>{formatDate(row.thoiGianTiepNhan)}</td>
                  <td style={{ textAlign: 'center' }}>{formatDate(row.duKien)}</td>
                  <td style={{ textAlign: 'center' }}>{getThoiGianHoanThanh(row)}</td>
                  <td style={{ minWidth: 80, textAlign: 'center' }}>{row.ghiChu}</td>
                  <td>
                    {!row.nguoiThucHien && (
                      <button className="btn-nhan" onClick={() => handleNhan(row)}>Nhận</button>
                    )}
                    <button className="btn-edit" onClick={() => handleEdit(row)}>Sửa</button>
                    <button className="btn-delete" onClick={() => handleDelete(row.id)}>Xóa</button>
                  </td>
                </tr>
              )
            ))}
            {adding && (
              <tr>
                <td></td>
                <td><input name="task" value={form.task} onChange={handleChange} placeholder="Task yêu cầu" /></td>
                <td>
                  <select name="status" value={form.status} disabled>
                    {STATUS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                  </select>
                </td>
                <td>
                  <input value={user?.tenTaiKhoan || ""} disabled style={{ background: '#f7fdff', color: '#29547A', fontWeight: 500, border: 'none', width: '100%', textAlign: 'center' }} />
                </td>
                <td></td>
                <td><input name="ngayYeuCau" value={form.ngayYeuCau} disabled style={{ textAlign: 'center', background: '#f7fdff', color: '#29547A', border: 'none', width: '100%' }} /></td>
                <td></td>
                <td></td>
                <td style={{ textAlign: 'center' }}>{getThoiGianHoanThanh(form)}</td>
                <td><textarea name="ghiChu" value={form.ghiChu} onChange={handleChange} placeholder="Ghi chú" style={{ minWidth: 80, textAlign: 'center' }} /></td>
                <td>
                  <button className="btn-edit btn-them-moi" onClick={handleAdd}>Thêm</button>
                  <button className="btn-delete" onClick={handleCancel}>Hủy</button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!adding && (
          <div style={{ marginTop: 12 }}>
            <button className="btn-edit btn-them-moi" onClick={() => { setAdding(true); setForm({ ...emptyForm }); }}>+ Thêm mới</button>
          </div>
        )}
        {/* Popup nhận task */}
        {showNhan.show && (
          <div className="popup-overlay">
            <div className="popup-box">
              <h4>Nhận task</h4>
              <div style={{ margin: '10px 0' }}>
                <b>Thời gian dự kiến hoàn thành:</b><br />
                <input type="date" value={duKienNhan} min={getTodayGMT7()} onChange={e => setDuKienNhan(e.target.value)} />
              </div>
              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <button className="btn-edit" onClick={handleNhanXacNhan} disabled={!duKienNhan}>Xác nhận</button>
                <button className="btn-delete" onClick={() => setShowNhan({ show: false, id: null })}>Hủy</button>
              </div>
            </div>
          </div>
        )}
        {/* Popup xác nhận xóa */}
        {showDelete.show && (
          <div className="popup-overlay">
            <div className="popup-box">
              <h4>Bạn chắc chắn muốn xóa task này?</h4>
              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <button className="btn-delete" onClick={handleDeleteXacNhan}>Xóa</button>
                <button className="btn-edit" onClick={() => setShowDelete({ show: false, id: null })}>Hủy</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTodayGMT7() {
  const now = new Date();
  // GMT+7 offset
  const gmt7 = new Date(now.getTime() + (7 - now.getTimezoneOffset() / 60) * 60 * 60 * 1000);
  return gmt7.toISOString().slice(0, 10);
}

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN");
}

function getThoiGianHoanThanh(row) {
  if (!row || !row.duKien) return "";
  if (row.status === "Đã hoàn thành") return "Đã hoàn thành";
  if (row.status === "Hủy, không làm được") return "Đã hủy";
  const today = getTodayGMT7();
  const dToday = new Date(today);
  const dDuKien = new Date(row.duKien);
  const diff = Math.ceil((dDuKien - dToday) / (1000 * 60 * 60 * 24));
  if (isNaN(diff)) return "";
  if (diff > 0) return `Còn ${diff} ngày`;
  if (diff < 0) return `Quá hạn ${Math.abs(diff)} ngày`;
  return "Hôm nay";
}

function getStatusColor(status) {
  if (status === "Chưa bắt đầu") return "badge-outlined";
  if (status === "Đang thực hiện") return "badge-dashed";
  if (status === "Đã hoàn thành") return "badge-filled";
  if (status === "Hủy, không làm được") return "badge-solid";
  if (status === "Ưu tiên") return "badge-solid";
  return "";
} 