/**
 * Auth Context - Quản lý state xác thực và phân quyền
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/authAPI';

// Initial state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  role: null,
  permissions: [],
  token: null,
  error: null
};

// Actions
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  REFRESH_SUCCESS: 'REFRESH_SUCCESS'
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        role: action.payload.user.role,
        permissions: action.payload.user.permissions || [],
        token: action.payload.token,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        role: null,
        permissions: [],
        token: null,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        role: action.payload.role,
        permissions: action.payload.permissions || []
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.REFRESH_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        role: action.payload.user.role,
        permissions: action.payload.user.permissions || [],
        token: action.payload.token,
        error: null
      };

    default:
      return state;
  }
}

// Create context
const AuthContext = createContext(null);

// Auth provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Khởi tạo auth state từ localStorage
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔍 Không có token, redirect về login');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      console.log('🔍 Đang verify token...');
      // Verify token với backend
      const response = await authAPI.verify(token);
      if (response.success) {
        console.log('✅ Token hợp lệ, user:', response.data.user);
        // Token hợp lệ, set user và token
        dispatch({
          type: AUTH_ACTIONS.REFRESH_SUCCESS,
          payload: {
            user: response.data.user,
            token: token
          }
        });
      } else {
        console.log('❌ Token không hợp lệ, xóa token');
        // Token không hợp lệ, xóa
        localStorage.removeItem('token');
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    } catch (error) {
      console.error('❌ Lỗi khởi tạo auth:', error);
      localStorage.removeItem('token');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  const login = async (username, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await authAPI.login(username, password);
      
      if (response.success) {
        // Lưu token
        localStorage.setItem('token', response.data.token);
        
        // Update state
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: response.data
        });

        return { success: true };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.error
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Lỗi đăng nhập';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Gọi API logout (optional)
      await authAPI.logout();
    } catch (error) {
      console.warn('Lỗi khi logout từ server:', error);
    } finally {
      // Xóa tất cả tokens
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.clear(); // Clear all để chắc chắn
      console.log('🚪 Đã đăng xuất và xóa tokens');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.SET_USER,
          payload: response.data.user
        });
        return response.data.user;
      }
    } catch (error) {
      console.error('❌ Lỗi refresh user:', error);
    }
    return null;
  };

  const changePassword = async (oldPassword, newPassword, confirmPassword) => {
    try {
      const response = await authAPI.changePassword(oldPassword, newPassword, confirmPassword);
      return response;
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Lỗi đổi mật khẩu' 
      };
    }
  };

  // Permission helpers
  const hasRole = (...roles) => {
    return state.role && roles.includes(state.role);
  };

  const hasPermission = (resource, action) => {
    if (!state.permissions) return false;
    const permission = `${resource}.${action}`;
    return state.permissions.includes(permission);
  };

  const hasScope = (scope) => {
    if (!state.permissions) return false;
    return state.permissions.includes(scope);
  };

  const isAdmin = () => {
    return state.role === 'admin';
  };

  const canAccess = (resource, action) => {
    return hasPermission(resource, action);
  };

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    login,
    logout,
    refreshUser,
    changePassword,
    
    // Permission helpers
    hasRole,
    hasPermission,
    hasScope,
    isAdmin,
    canAccess,
    
    // Utilities
    clearError: () => dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook để sử dụng auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC để wrap component với auth
export function withAuth(Component) {
  return function AuthenticatedComponent(props) {
    const auth = useAuth();
    return <Component {...props} auth={auth} />;
  };
}

export default AuthContext;
