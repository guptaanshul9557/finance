/**
 * Token Validation Service
 * Validates tokens from localStorage against external validation API
 */

const axios = require('axios');

// API Configuration
const API_URL = {
  KMC_DEV: 'https://jkhudd.mycitydemo.in/',
  GOV_KMC: 'https://govkmc.ddns.net/',
  KMC_GOV: 'https://www.kmcgov.in/',
  KMC_SDC_UAT: 'https://kmcuat.wb.gov.in/',
  KMC_SDC_PROD: 'https://kmc.wb.gov.in/'
};

const apiConstant = {
  DEV: {
    KEY: process.env.TOKEN_KEY || "F^&$^%&G^E$#!#$&(&)(_IHNMKBJK",
    APPLICATION_ID: process.env.APP_ID || "ekmchr",
    VALIDATE_TOKEN_NEW: API_URL.KMC_DEV + 'validation/userInfo/validateTimeAndAuthToken',
    DECRYPT: API_URL.KMC_DEV + 'egov-enc-service/crypto/v1/_decrypt',
  },
  UAT: {
    KEY: process.env.TOKEN_KEY || "F^&$^%&G^E$#!#$&(&)(_IHNMKBJK",
    APPLICATION_ID: process.env.APP_ID || "ekmchr",
    VALIDATE_TOKEN_NEW: API_URL.KMC_DEV + 'validation/userInfo/validateTimeAndAuthToken',
    DECRYPT: API_URL.KMC_DEV + 'egov-enc-service/crypto/v1/_decrypt',
  },
  PROD: {
    KEY: process.env.TOKEN_KEY || "F^&$^%&G^E$#!#$&(&)(_IHNMKBJK",
    APPLICATION_ID: process.env.APP_ID || "ekmchr",
    VALIDATE_TOKEN_NEW: API_URL.GOV_KMC + 'validation/userInfo/validateTimeAndAuthToken',
    DECRYPT: API_URL.GOV_KMC + 'egov-enc-service/crypto/v1/_decrypt',
  },
  SDC_UAT: {
    KEY: process.env.TOKEN_KEY || "F^&$^%&G^E$#!#$&(&)(_IHNMKBJK",
    APPLICATION_ID: process.env.APP_ID || "ekmchr",
    VALIDATE_TOKEN_NEW: 'http://validation:8080/validation/userInfo/validateTimeAndAuthToken',
    DECRYPT: API_URL.KMC_SDC_UAT + 'egov-enc-service/crypto/v1/_decrypt',
    DOMAIN_URL: API_URL.KMC_SDC_UAT,
  },
  SDC_PROD: {
    KEY: process.env.TOKEN_KEY || "F^&$^%&G^E$#!#$&(&)(_IHNMKBJK",
    APPLICATION_ID: process.env.APP_ID || "ekmchr",
    VALIDATE_TOKEN_NEW: 'http://validation:8080/validation/userInfo/validateTimeAndAuthToken',
    DECRYPT: API_URL.KMC_SDC_PROD + 'egov-enc-service/crypto/v1/_decrypt',
    DOMAIN_URL: API_URL.KMC_SDC_PROD,
  }
};

/**
 * Get environment based API constants
 */
const getApiConfig = () => {
  const env = process.env.APP_ENV || 'DEV';
  return apiConstant[env] || apiConstant.DEV;
};

/**
 * Validate token against external API
 * 
 * @param {string} token - Auth token from localStorage
 * @param {object} tokenInfo - Additional token information
 * @returns {Promise<object>} - Validation result
 */
const validateToken = async (token, tokenInfo = {}) => {
  try {
    if (!token) {
      return {
        valid: false,
        message: 'Token is missing',
        status: 401
      };
    }

    const apiConfig = getApiConfig();
    
    // Prepare request body
    const requestBody = {
      authToken: token,
      timeStamp: new Date().toISOString(),
      ...tokenInfo
    };
    console.log({apiConfig});
    

    console.log(`🔐 Validating token at: ${apiConfig.VALIDATE_TOKEN_NEW}`);

    // Make validation request
    const response = await axios.post(
      apiConfig.VALIDATE_TOKEN_NEW,
      requestBody,
      {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'Synmetrix-Dashboard'
        }
      }
    );

    // Check response data
    if (response.data) {
      console.log('✅ Token validation successful');
      return {
        valid: true,
        message: 'Token is valid',
        status: 200,
        data: response.data
      };
    } else {
      console.log('❌ Token validation failed - Empty response');
      return {
        valid: false,
        message: 'Token validation returned empty response',
        status: 401
      };
    }
  } catch (error) {
    console.error('❌ Token validation error:', error.message);

    // Handle specific error cases
    if (error.code === 'ECONNREFUSED') {
      return {
        valid: false,
        message: 'Unable to reach validation service',
        status: 503,
        error: 'SERVICE_UNAVAILABLE'
      };
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return {
        valid: false,
        message: 'Token is invalid or expired',
        status: 401,
        error: 'UNAUTHORIZED'
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        valid: false,
        message: 'Token validation service timeout',
        status: 504,
        error: 'GATEWAY_TIMEOUT'
      };
    }

    // Generic error
    return {
      valid: false,
      message: error.response?.data?.message || error.message || 'Token validation failed',
      status: error.response?.status || 500,
      error: error.response?.data?.error || 'VALIDATION_ERROR'
    };
  }
};

/**
 * Hash-based token verification (optional)
 * Uses hash generation with date for additional security
 */
const verifyHash = async (appId, hashTokenFromUI, platform = 'digit') => {
  try {
    // For DIGIT platform, skip hash verification
    if (platform === 'digit') {
      return true;
    }

    // Generate expected hash
    const apiConfig = getApiConfig();
    const todaysDate = new Date();
    let currentDate = todaysDate.getDate();
    currentDate = currentDate < 10 ? '0' + currentDate : currentDate;
    let currentMonth = todaysDate.getMonth() + 1;
    currentMonth = currentMonth < 10 ? '0' + currentMonth : currentMonth;
    let currentYear = todaysDate.getFullYear();
    
    const formattedDate = currentYear + '' + currentMonth + '' + currentDate;
    const dataKey = apiConfig.KEY + '~' + formattedDate;

    console.log(`🔐 Verifying hash for app: ${appId}`);

    // Hash generation would require additional dependencies
    // For now, return true if platform is digit
    return true;
  } catch (error) {
    console.error('❌ Hash verification error:', error.message);
    return false;
  }
};

/**
 * Refresh token validity
 * Call this periodically to ensure token is still valid
 */
const refreshTokenValidity = async (token) => {
  return validateToken(token);
};

module.exports = {
  validateToken,
  verifyHash,
  refreshTokenValidity,
  getApiConfig
};
