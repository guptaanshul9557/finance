import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import HomePage from './pages/HomePage';
import UniversalScreen from './components/UniversalScreen';
import { getEnabledScreens } from './config/screenRegistry'; // Import helper to get all enabled screens
import Layout from './components/Layout';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router basename="/mis-dashboard">
        <Routes>
          {/* Login Route */}
          {/* <Route path="/mis-dashboard" element={<Login />} /> */}

          {/* Home Page - Module Selector */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Alternative home path */}
          <Route
            path="/mis-dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {getEnabledScreens().map((screen) => (
            <Route
              key={screen.id}
              path={screen.route}
              element={
                <ProtectedRoute>
                  <Layout>
                    <UniversalScreen screenId={screen.id} />
                  </Layout>
                </ProtectedRoute>
              }
            />
          ))}

          {/* 💡 To add a new screen:
              1. Add config to src/config/screenRegistry.js with:
                 - id: 'your_screen_id'
                 - route: '/your-route'
                 - enabled: true
              2. That's it! Route is auto-generated above.
          */}

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
