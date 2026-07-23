/**
 * useEnsureSchema Hook
 * 
 * Checks if Cube.js schema exists before loading screen
 * Auto-generates schema if missing
 */

import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

// Create axios instance with CORS handling
const apiClient = axios.create({
  baseURL:  window.location.origin,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include credentials for CORS
});

export function useEnsureSchema(screenConfig) {
  const [schemaReady, setSchemaReady] = useState(false);
  const [schemaError, setSchemaError] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureSchema = useCallback(async () => {
    if (!screenConfig || !screenConfig.cubeName) {
      setLoading(false);
      setSchemaReady(true);
      return;
    }

    try {
      setLoading(true);
      setSchemaError(null);

      const response = await apiClient.post('/api/schema/ensure', {
        screenId: screenConfig.id,
        cubeName: screenConfig.cubeName,
      });

      const data = response.data;

      if (data.success) {
        if (data.created) {
          console.log(`✅ Schema ${screenConfig.cubeName} was auto-generated`);
          
          // Wait a moment for Cube.js to reload the schema
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(`✅ Schema ${screenConfig.cubeName} already exists`);
        }
        
        setSchemaReady(true);
      } else {
        throw new Error(data.error || 'Failed to ensure schema');
      }
    } catch (error) {
      console.error('❌ Error ensuring schema:', error);
      setSchemaError(error.message);
      setSchemaReady(false);
    } finally {
      setLoading(false);
    }
  }, [screenConfig]);

  useEffect(() => {
    ensureSchema();
  }, [ensureSchema]);

  return { schemaReady, loading, error: schemaError };
}

/**
 * useCheckSchema Hook
 * 
 * Simply checks if schema exists (doesn't create)
 */
export function useCheckSchema(cubeName) {
  const [exists, setExists] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkSchema = useCallback(async () => {
    if (!cubeName) {
      setChecking(false);
      return;
    }

    try {
      const response = await apiClient.get(`/api/schema/check/${cubeName}`);
      const data = response.data;
      
      setExists(data.exists);
    } catch (error) {
      console.error('Error checking schema:', error);
      setExists(false);
    } finally {
      setChecking(false);
    }
  }, [cubeName]);

  useEffect(() => {
    checkSchema();
  }, [checkSchema]);

  return { exists, checking };
}
