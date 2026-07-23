/**
 * Token Validation Routes
 * 
 * Endpoints for token validation and refresh
 * GET/POST /api/auth/validate-token
 */

const express = require('express');
const router = express.Router();
const { validateToken, refreshTokenValidity } = require('../services/tokenService');

/**
 * Validate Token Endpoint
 * POST /api/auth/validate-token
 * 
 * Body: {
 *   token: 'auth-token-from-localStorage',
 *   tokenInfo: { ... } // optional additional info
 * }
 * 
 * Response: {
 *   valid: boolean,
 *   message: string,
 *   status: number,
 *   data: object
 * }
 */
router.post('/validate-token', async (req, res) => {
  try {
    const { token, tokenInfo = {} } = req.body;

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: 'Token is required',
        status: 400,
        error: 'MISSING_TOKEN'
      });
    }

    // Validate the token
      const result = await validateToken(token, tokenInfo);
      console.log({result});
      

    // Return appropriate HTTP status based on validation result
    const statusCode = result.valid ? 200 : (result.status || 401);
    
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('❌ Token validation endpoint error:', error.message);
    
    res.status(500).json({
      valid: false,
      message: 'Internal server error during token validation',
      status: 500,
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * Refresh Token Validity Endpoint
 * GET /api/auth/refresh-token
 * 
 * Query: ?token=auth-token-from-localStorage
 * 
 * Response: {
 *   valid: boolean,
 *   message: string,
 *   status: number,
 *   lastRefresh: ISO string,
 *   nextRefresh: ISO string (in 15 minutes)
 * }
 */
router.get('/refresh-token', async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(400).json({
        valid: false,
        message: 'Token is required in query or Authorization header',
        status: 400,
        error: 'MISSING_TOKEN'
      });
    }

    // Refresh token validity
    const result = await refreshTokenValidity(token);
    
    const now = new Date();
    const nextRefresh = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    const statusCode = result.valid ? 200 : (result.status || 401);
    
    res.status(statusCode).json({
      ...result,
      lastRefresh: now.toISOString(),
      nextRefresh: nextRefresh.toISOString()
    });
  } catch (error) {
    console.error('❌ Token refresh endpoint error:', error.message);
    
    res.status(500).json({
      valid: false,
      message: 'Internal server error during token refresh',
      status: 500,
      error: 'SERVER_ERROR',
      lastRefresh: new Date().toISOString()
    });
  }
});

/**
 * Health Check with Token Validation
 * GET /api/auth/health
 * 
 * Query: ?token=optional-token
 */
router.get('/health', async (req, res) => {
  try {
    const token = req.query.token;
    let tokenStatus = { valid: false, checked: false };

    // If token provided, validate it
    if (token) {
      tokenStatus = await refreshTokenValidity(token);
      tokenStatus.checked = true;
    }

    res.status(200).json({
      status: 'OK',
      service: 'Token Validation Service',
      timestamp: new Date().toISOString(),
      environment: process.env.APP_ENV || 'DEV',
      tokenStatus
    });
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    
    res.status(500).json({
      status: 'ERROR',
      service: 'Token Validation Service',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
