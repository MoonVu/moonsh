import React, { useRef, useState, useEffect } from "react";
import "./UserMenu.css";
import { FaUserCircle, FaChevronDown, FaSignOutAlt, FaKey, FaBell } from "react-icons/fa";
import ClockGMT7 from "./ClockGMT7";
import apiService from "./services/api";

export default function UserMenu({ user, onChangePwd, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [showNoti, setShowNoti] = useState(false);
  const [noti, setNoti] = useState([]);
  const [showNotiDetail, setShowNotiDetail] = useState(null);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const fileInput = React.useRef();
  const notiListRef = React.useRef();
  const notiDetailRef = React.useRef();
  const userMenuRef = React.useRef();
  const userMenuPopupRef = React.useRef();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!user || !user.tenTaiKhoan) return;
    apiService.getNotifications().then(n => setNoti(n)).catch(() => setNoti([]));
  }, [user.tenTaiKhoan]);

  useEffect(() => {
    function handleClickOutside(e) {
      if ((userMenuPopupRef.current && userMenuPopupRef.current.contains(e.target)) ||
          (userMenuRef.current && userMenuRef.current.contains(e.target))) {
        return;
      }
      setShowMenu(false);
    }
    if (showMenu) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  useEffect(() => {
    function handleClickOutsideNoti(e) {
      if (
        (notiListRef.current && notiListRef.current.contains(e.target)) ||
        (notiDetailRef.current && notiDetailRef.current.contains(e.target))
      ) {
        return;
      }
      setShowNoti(false);
      setShowNotiDetail(null);
    }
    if (showNoti || showNotiDetail) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutsideNoti);
      }, 100);
      return () => document.removeEventListener('mousedown', handleClickOutsideNoti);
    }
  }, [showNoti, showNotiDetail]);

  // Sort thông báo mới nhất lên đầu
  const sortedNoti = [...noti].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const displayNoti = sortedNoti.slice(0, 5);

  return (
    <>
    <div className="user-menu-root">
        <div className="user-menu-main">
        <ClockGMT7 inline />
        <div style={{ position: 'relative', display: 'inline-block', marginRight: 10 }}>
            <FaBell className="user-menu-bell" style={{ fontSize: 22, color: noti.some(n => !n.is_read) ? '#2ecc40' : '#29547A', verticalAlign: 'middle', cursor: 'pointer' }} onClick={e => {
            e.stopPropagation();
            setShowNoti(v => !v);
          }} />
            {noti.some(n => !n.is_read) && (
            <span className="user-menu-noti-badge">
                {noti.filter(n => !n.is_read).length}
            </span>
          )}
        </div>
        <div className="user-menu-avatar-wrap">
          {avatar ? (
            <img src={avatar} alt="avatar" className="user-menu-avatar" />
          ) : (
            <FaUserCircle className="user-menu-avatar user-menu-avatar-default" />
          )}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={fileInput}
            onChange={handleAvatarChange}
          />
          <span
            className="user-menu-avatar-upload"
            title="Đổi ảnh đại diện"
            onClick={(e) => {
              e.stopPropagation();
              fileInput.current.click();
            }}
          >
            ✎
          </span>
        </div>
        <div className="user-menu-info">
            <span className="user-menu-name">{user.username || user.tenTaiKhoan}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 14, color: '#29547A', fontWeight: 500 }}>{user.group_name || user.group}</span>
        </div>
          <div className="user-menu-chevron" ref={userMenuRef} onClick={() => setShowMenu((v) => !v)}>
            <FaChevronDown />
          </div>
      {showMenu && (
        <div className="user-menu-popup" ref={userMenuPopupRef} onClick={e => e.stopPropagation()}>
          <div className="user-menu-popup-header">
            <div className="user-menu-popup-avatar-wrap">
              {avatar ? (
                <img src={avatar} alt="avatar" className="user-menu-popup-avatar" />
              ) : (
                <FaUserCircle className="user-menu-popup-avatar user-menu-avatar-default" />
              )}
            </div>
            <div>
                  <div className="user-menu-popup-name">{user.username || user.tenTaiKhoan}</div>
                  <div className="user-menu-popup-role" style={{ marginTop: 2, fontSize: 14, color: '#29547A', fontWeight: 500 }}>{user.group_name || user.group}</div>
            </div>
          </div>
          <div className="user-menu-popup-actions">
                <button className="user-menu-popup-btn" onClick={() => { setShowMenu(false); setShowChangePwd(true); }}>
              <FaKey style={{ marginRight: 15 }} /> Đổi mật khẩu
            </button>
                <button className="user-menu-popup-btn" onClick={async () => {
                  setShowMenu(false);
                  try {
                    await apiService.logout();
                  } catch (e) {
                    console.error("Lỗi khi gọi API logout:", e);
                  }
                  if (onLogout) {
                    onLogout();
                  }
                }}>
              <FaSignOutAlt style={{ marginRight: 15 }} /> Đăng xuất
            </button>
          </div>
        </div>
      )}
          {showChangePwd && (
            <div className="modal-bg">
              <div className="modal">
                <h3>Đổi mật khẩu</h3>
                <div className="form-group">
                  <label>Mật khẩu cũ:</label>
                  <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Mật khẩu mới:</label>
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Xác nhận mật khẩu mới:</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
                </div>
                {pwdError && <div style={{ color: 'red', marginTop: 8 }}>{pwdError}</div>}
                {pwdSuccess && <div style={{ color: 'green', marginTop: 8 }}>{pwdSuccess}</div>}
                <div style={{ marginTop: 16 }}>
                  <button className="btn-edit" onClick={async () => {
                    setPwdError(""); setPwdSuccess("");
                    if (!oldPwd || !newPwd || !confirmPwd) {
                      setPwdError("Vui lòng nhập đủ thông tin!"); return;
                    }
                    if (newPwd !== confirmPwd) {
                      setPwdError("Mật khẩu mới không khớp!"); return;
                    }
                    try {
                      // Thực hiện logic đổi mật khẩu trước
                      await apiService.changePassword({ oldPassword: oldPwd, newPassword: newPwd });
                      
                      // Sau khi logic hoàn thành thành công, mới reset form
                      setPwdSuccess("Đổi mật khẩu thành công!");
                      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
                    } catch (err) {
                      setPwdError(err.message || "Đổi mật khẩu thất bại!");
                      // Nếu có lỗi, không reset form để user có thể sửa
                    }
                  }}>Lưu</button>
                  <button className="btn-delete" onClick={() => { setShowChangePwd(false); setPwdError(""); setPwdSuccess(""); }} style={{ marginLeft: 8 }}>Hủy</button>
                </div>
              </div>
            </div>
          )}
          {showNoti && (
            <div ref={notiListRef} className="user-menu-noti-popup" style={{ position: 'absolute', left: 0, top: 38, zIndex: 20, background: '#fff', boxShadow: '0 2px 8px #0001', borderRadius: 8, minWidth: 260, maxHeight: 320, overflowY: 'auto' }}>
              <div style={{ padding: 10, fontWeight: 700, borderBottom: '1px solid #eee' }}>Thông báo</div>
              {displayNoti.length === 0 ? <div style={{ padding: 10 }}>Không có thông báo</div> : displayNoti.map((n, i) => (
                <div key={n.id || i} style={{
                  padding: 10,
                  borderBottom: '1px solid #f3f3f3',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  background: !n.is_read ? '#e6f7ff' : undefined
                }} onClick={async () => {
                  if (!n.is_read) {
                    await apiService.markNotificationAsRead(n.id);
                    apiService.getNotifications().then(setNoti);
              }
                  setShowNotiDetail(n);
            }}>
                  <div style={{ flex: 1 }}>{n.message}</div>
                  {n.is_read ? <span style={{ color: '#2ecc40', fontSize: 18 }}>&#10003;</span> : null}
            </div>
          ))}
        </div>
      )}
      {showNotiDetail && (
        <div ref={notiDetailRef} className="user-menu-noti-popup" style={{ position: 'absolute', left: 0, top: 70, zIndex: 30, background: '#fff', boxShadow: '0 2px 8px #0001', borderRadius: 8, minWidth: 300, padding: 18, border: '2px solid #1890ff' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Nội dung thông báo</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>{showNotiDetail.message}</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{new Date(showNotiDetail.created_at).toLocaleString('vi-VN')}</div>
          <button className="btn-delete" onClick={() => setShowNotiDetail(null)}>Đóng</button>
        </div>
      )}
    </div>
      </div>
    </>
  );
} 