/**
 * Auth Context - Quản lý state xác thực và phân quyền
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/authAPI';
import { apiService } from '../services/api';
import { permissionsAPI } from '../services/permissionsAPI';

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
        role: action.payload.user.role?.name || action.payload.user.role,
        permissions: permissionsAPI.extractUserPermissions(action.payload.user),
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
        role: action.payload.role?.name || action.payload.role,
        permissions: permissionsAPI.extractUserPermissions(action.payload)
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
        role: action.payload.user.role?.name || action.payload.user.role,
        permissions: permissionsAPI.extractUserPermissions(action.payload.user),
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
      console.log('🔐 Frontend login attempt:', { username, password: password ? '[HIDDEN]' : 'undefined' });
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await authAPI.login(username, password);
      console.log('📡 Frontend login response:', response);
      
      if (response.success) {
        // Lưu token
        const token = response.data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('authToken', token); // Backup key
        console.log('💾 Token saved to localStorage:', token ? 'YES' : 'NO');
        
        // QUAN TRỌNG: Update API service token
        try {
          apiService.setToken(token);
        } catch (setTokenError) {
          console.error('Error setting token on apiService:', setTokenError);
          // Không throw error vì login đã thành công
        }
        
        // Delay authentication state update để animation có thời gian chạy
        setTimeout(() => {
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: response.data
          });
        }, 1100); // Giảm thời gian delay

        return { success: true };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: response.error
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login error details:', error);
      
      // Xử lý các loại lỗi khác nhau
      let errorMessage = 'Đăng nhập thất bại';
      
      if (error.message) {
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
        } else if (error.message.includes('Mật khẩu không đúng')) {
          errorMessage = 'Mật khẩu không đúng';
        } else if (error.message.includes('Tên đăng nhập không tồn tại')) {
          errorMessage = 'Tên đăng nhập không tồn tại';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Lỗi kết nối mạng. Vui lòng thử lại';
        } else {
          errorMessage = error.message;
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
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

  // Permission helpers sử dụng permissionsAPI
  const hasRole = (...roles) => {
    return permissionsAPI.userHasRole(state.user, ...roles);
  };

  const hasPermission = (resource, action) => {
    return permissionsAPI.userHasPermission(state.user, resource, action);
  };

  const hasScope = (scope) => {
    if (!state.permissions) return false;
    return state.permissions.includes(scope);
  };

  const isAdmin = () => {
    return state.user?.role?.name === 'ADMIN';
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
