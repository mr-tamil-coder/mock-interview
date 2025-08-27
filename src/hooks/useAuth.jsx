import { useState, useEffect, createContext, useContext } from 'react';
import apiService from '../services/api.js';

const AuthContext = createContext();

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
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = apiService.getAuthToken();
      
      if (token) {
        console.log('🔐 Token found, checking user status...');
        const userData = await apiService.getCurrentUser();
        setUser(userData);
        console.log('✅ User authenticated:', userData.name);
      } else {
        console.log('🔐 No token found');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      apiService.removeAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('🔐 Attempting login...');
      const response = await apiService.login(credentials);
      
      if (response.token && response.user) {
        apiService.setAuthToken(response.token);
        setUser(response.user);
        console.log('✅ Login successful:', response.user.name);
        return { success: true, user: response.user };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      console.error('❌ Login error:', message);
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('📝 Attempting registration...');
      const response = await apiService.register(userData);
      
      if (response.token && response.user) {
        apiService.setAuthToken(response.token);
        setUser(response.user);
        console.log('✅ Registration successful:', response.user.name);
        return { success: true, user: response.user };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      console.error('❌ Registration error:', message);
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🔐 Logging out user...');
    apiService.removeAuthToken();
    setUser(null);
    setError(null);
    console.log('✅ Logout successful');
  };

  const updateProfile = async (updates) => {
    try {
      setError(null);
      const response = await apiService.updateProfile(updates);
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};