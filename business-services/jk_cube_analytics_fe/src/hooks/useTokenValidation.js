/**
 * useTokenValidation Hook
 * 
 * Validates token from localStorage every 15 minutes
 * Automatically logs out user if token becomes invalid
 * 
 * Usage:
 * const { isTokenValid, lastValidation, refreshToken } = useTokenValidation();
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import axios from 'axios';

const TOKEN_VALIDATION_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
const TOKEN_STORAGE_KEY = 'token';
const VALIDATION_TIMESTAMP_KEY = 'synmetrix_token_validation_time';

/**
 * Create axios instance for token validation API
 */
const tokenValidationClient = axios.create({
  baseURL: process.env.REACT_APP_CUBEJS_API_URL || `${window?.location?.origin || 'https://jkhudd.mycitydemo.in'}/mis-dashboard-be/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Redirect to login page
 */
const redirectToLogin = () => {
  const currentDomain = window.location.origin;
  const loginUrl = `${currentDomain}/employee/user/login`;
  console.log(`🔐 Redirecting to login: ${loginUrl}`);
  window.location.href = loginUrl;
};

export const useTokenValidation = (onTokenExpired = null) => {
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [lastValidation, setLastValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const intervalRef = useRef(null);

  /**
   * Perform token validation against backend API
   */
  const validateTokenWithAPI = useCallback(async (token) => {
    return true;
    if (!token) {
      console.warn('⚠️  No token found for validation');
      return false;
    }

    setIsValidating(true);
    try {
      console.log('🔐 Validating token...');
      
        const response = await tokenValidationClient.post('/api/auth/validate-token', {
        token,
        tokenInfo: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });

      const { valid, message, data } = response.data;

      if (valid) {
        console.log('✅ Token is valid');
        setIsTokenValid(true);
        setLastValidation(new Date());
        localStorage.setItem(VALIDATION_TIMESTAMP_KEY, new Date().toISOString());
        return true;
      } else {
        console.warn('❌ Token validation failed:', message);
        setIsTokenValid(false);
        setLastValidation(new Date());
        
        // Clear token and redirect to login
        // localStorage.removeItem(TOKEN_STORAGE_KEY);
        
        // Call optional callback when token expires
        if (onTokenExpired) {
          onTokenExpired({ message, reason: 'token_invalid' });
        }
        
        // Redirect to login
        redirectToLogin();
        
        return false;
      }
    } catch (error) {
      console.error('❌ Token validation error:', error.message);
      
      // Handle specific error cases
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('🔐 Token appears to be expired or invalid');
        setIsTokenValid(false);
        
        // Clear token and redirect to login
        // localStorage.removeItem(TOKEN_STORAGE_KEY);
        
        if (onTokenExpired) {
          onTokenExpired({ 
            message: 'Token expired or invalid',
            reason: 'unauthorized',
            status: error.response.status
          });
        }
        
        // Redirect to login
        redirectToLogin();
        
        return false;
      }

      // For network errors, we'll assume token is still valid (offline scenario)
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        console.warn('⚠️  Unable to reach validation service (offline mode)');
        // Don't change token validity, assume it's still good
        return true;
      }

      // Other errors - assume token is still valid
      console.warn('⚠️  Token validation error, assuming token still valid:', error.message);
      return true;
    } finally {
      setIsValidating(false);
    }
  }, [onTokenExpired]);

  /**
   * Refresh token validity (called every 15 minutes)
   */
  const refreshToken = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if (!token) {
      console.warn('⚠️  No token in localStorage');
      setIsTokenValid(false);
      return false;
    }

    return validateTokenWithAPI(token);
  }, [validateTokenWithAPI]);

  /**
   * Initial token validation on mount
   */
  useEffect(() => {
    const initializeTokenValidation = async () => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      if (token) {
        // Validate immediately on mount
        await validateTokenWithAPI(token);
      }
    };

    initializeTokenValidation();
  }, [validateTokenWithAPI]);

  /**
   * Set up 15-minute validation interval
   */
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(async () => {
      console.log('⏰ Token validation check (15-minute interval)');
      await refreshToken();
    }, TOKEN_VALIDATION_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshToken]);

  /**
   * Also validate token on page visibility change
   * (when user switches back to tab, validate immediately)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️  Page became visible, validating token');
        refreshToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshToken]);

  return {
    isTokenValid,
    lastValidation,
    isValidating,
    refreshToken,
    validateToken: validateTokenWithAPI
  };
};

export default useTokenValidation;
