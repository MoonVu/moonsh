import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import "./Login.css";
import { useLogin, useAuth } from "./hooks/useAuth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [welcomeText, setWelcomeText] = useState("CHÀO MỪNG");
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { login, isLoading, error, clearError } = useLogin();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Redirect location sau khi đăng nhập
  const from = location.state?.from?.pathname || "/";

  // Nếu đã đăng nhập, redirect
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async e => {
    e.preventDefault();
    if (!username || !password) {
      return;
    }
    
    clearError();
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        // Hiệu ứng thành công
        setWelcomeText(`CHÀO MỪNG ${username.toUpperCase()}`);
        setShowSuccess(true);
        
        // Redirect sẽ được xử lý bởi useAuth context
      }
    } catch (err) {
      console.error('Login error:', err);
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
        <div className="shooting_star"></div>
        <div className="shooting_star"></div>
      </div>

      
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
            disabled={isLoading}
          >
            {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
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