import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import useTokenValidation from '../hooks/useTokenValidation';
import cubejsApi from '../cubejs/cubejsApi';

const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = 'token';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(true);

  /**
   * Handle token expiration
   */
  const handleTokenExpired = useCallback((expiredInfo) => {
    console.error('🔐 Token expired:', expiredInfo);
    
    // Clear stored data
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('synmetrix_user');
    
    // Clear user state
    setUser(null);
    setTokenValid(false);
    
    // Optional: Show notification to user
    // You can emit an event or use a toast notification here
    window.dispatchEvent(new CustomEvent('tokenExpired', { detail: expiredInfo }));
  }, []);

  /**
   * Initialize token validation hook
   */
  const { isTokenValid, lastValidation, refreshToken } = useTokenValidation(
    handleTokenExpired
  );

  // Sync token validity state
  useEffect(() => {
    setTokenValid(isTokenValid);
  }, [isTokenValid]);

  // Check if user is logged in on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const savedUser = localStorage.getItem('synmetrix_user');
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (savedUser && savedToken) {
        try {
          setUser(JSON.parse(savedUser));
          cubejsApi.setToken(savedToken);
          console.log('✅ User restored from storage');
        } catch (error) {
          console.error('❌ Error parsing saved user:', error);
          localStorage.removeItem('synmetrix_user');
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } else {
        // Auto-login for development
        const autoLoginUser = {
          email: 'admin@gmail.com',
          name: 'Admin User',
          role: 'Administrator',
        };
        setUser(autoLoginUser);
        localStorage.setItem('synmetrix_user', JSON.stringify(autoLoginUser));
        
        // Generate a mock token for development
        const mockToken = 'dev-token-' + Date.now();
        localStorage.setItem(TOKEN_STORAGE_KEY, mockToken);
        cubejsApi.setToken(mockToken);
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Login user with credentials
   */
  const login = (email, password) => {
    // Hardcoded credentials
    const ADMIN_EMAIL = 'admin@gmail.com';
    const ADMIN_PASSWORD = '123456';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const userData = {
        email: ADMIN_EMAIL,
        name: 'Admin User',
        role: 'Administrator',
      };
      setUser(userData);
      localStorage.setItem('synmetrix_user', JSON.stringify(userData));

      // Generate mock token (in production, this would come from auth API)
      const token = 'auth-token-' + Date.now();
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      cubejsApi.setToken(token);
      setTokenValid(true);

      // Trigger initial token validation
      refreshToken();

      return { success: true, token };
    } else {
      return { success: false, error: 'Invalid email or password' };
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    setUser(null);
    setTokenValid(false);
    localStorage.removeItem('synmetrix_user');
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem('synmetrix_token_validation_time');
    cubejsApi.setToken(null);
  };

  /**
   * Manually validate token
   */
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      return await refreshToken();
    }
    return false;
  }, [refreshToken]);

  const value = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user && tokenValid,
    tokenValid,
    lastValidation,
    validateToken,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
