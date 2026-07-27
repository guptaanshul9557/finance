import cubejs from '@cubejs-client/core';

// Change this to your backend server URL when hosting separately
const API_URL = process.env.REACT_APP_CUBEJS_API_URL || `${window?.location?.origin || 'http://localhost:4000'}/mis-dashboard-be/v1`;
// process.env.REACT_APP_CUBEJS_API_URL || 
// Example: 'http://192.168.0.100:4000/mis-dashboard-be/v1' or 'https://api.yourdomain.com/mis-dashboard-be/v1'

// Create wrapper to support dynamic token updates
class CubejsApiWrapper {
  constructor() {
    this.token = null;
    this.client = null;
    this.initializeClient();
  }

  initializeClient() {
    this.client = cubejs(this.token, {
      apiUrl: API_URL,
    });
  }

  setToken(token) {
    this.token = token;
    this.initializeClient();
    return this;
  }

  // Delegate all other method calls to the underlying client
  load(query) {
    return this.client.load(query);
  }

  invalidateCache() {
    return this.client.invalidateCache();
  }

  sql(query) {
    return this.client.sql(query);
  }
}

const cubejsApi = new CubejsApiWrapper();

export default cubejsApi;
