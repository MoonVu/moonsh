import React, { useState } from "react";
import "./Login.css";
import apiService from "./services/api";

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcomeText, setWelcomeText] = useState("CHÀO MỪNG");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!username || !password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await apiService.login(username, password);
      
      // Hiệu ứng thành công - chỉ thay đổi text và rơi xuống
      setWelcomeText(`CHÀO MỪNG ${username.toUpperCase()}`);
      setShowSuccess(true);
      
      // Sau 1 giây mới vào ứng dụng
      setTimeout(() => {
        onLoginSuccess && onLoginSuccess();
      }, 1000);
      
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      {/* Background shooting stars */}
      <div className="night">
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
      </div>
      
      {/* Logo SHBET chìm phía sau */}
      <div className="logo-background">SHBET</div>
      
      {/* Form đăng nhập */}
      <div className="login-box">
        {/* Logo SHBET trong form */}
        <img src="/SHBET_NewC.png" alt="SHBET Logo" className="login-logo" />
        
        <h1 className={showSuccess ? 'success' : ''}>{welcomeText}</h1>
        
        <form onSubmit={handleSubmit} style={{ display: showSuccess ? 'none' : 'flex' }}>
          <input 
            className="login-input"
            type="text" 
            placeholder="Tên đăng nhập" 
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input 
            className="login-input"
            type="password" 
            placeholder="Mật khẩu" 
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <div className="login-error">{error}</div>}
          <button 
            className="login-btn" 
            type="submit" 
            disabled={loading}
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        
        {/* Bubbles background */}
        <ul className="bg-bubbles">
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
      </div>
      
      <div className="login-copyright">Bản quyền thuộc về Moon SHBET</div>
    </div>
  );
} 