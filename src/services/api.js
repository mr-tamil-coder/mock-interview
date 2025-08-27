import axios from 'axios';

// Dynamic API base URL that works with both HTTP and HTTPS
const getApiBaseUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000/api`;
};

class ApiService {
  constructor() {
    this.baseURL = getApiBaseUrl();
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error('❌ API Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
          console.log('🔐 Unauthorized - clearing token');
          this.removeAuthToken();
          // Don't redirect automatically, let components handle it
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(userData) {
    try {
      console.log('📝 Registering user:', userData.email);
      const response = await this.api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async login(credentials) {
    try {
      console.log('🔐 Logging in user:', credentials.email);
      const response = await this.api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('❌ Get current user failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateProfile(updates) {
    try {
      const response = await this.api.put('/auth/profile', updates);
      return response.data;
    } catch (error) {
      console.error('❌ Profile update failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Interview endpoints
  async createInterview(interviewData) {
    try {
      console.log('🎯 Creating interview:', interviewData);
      const response = await this.api.post('/interviews', interviewData);
      return response.data;
    } catch (error) {
      console.error('❌ Create interview failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async getInterviews(params = {}) {
    try {
      const response = await this.api.get('/interviews', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Get interviews failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async getInterview(id) {
    try {
      const response = await this.api.get(`/interviews/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get interview failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateInterview(id, updates) {
    try {
      const response = await this.api.put(`/interviews/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('❌ Update interview failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async completeInterview(id, data) {
    try {
      const response = await this.api.post(`/interviews/${id}/complete`, data);
      return response.data;
    } catch (error) {
      console.error('❌ Complete interview failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async getInterviewStats() {
    try {
      const response = await this.api.get('/interviews/stats/overview');
      return response.data;
    } catch (error) {
      console.error('❌ Get interview stats failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // User endpoints
  async getDashboardData() {
    try {
      console.log('📊 Loading dashboard data...');
      const response = await this.api.get('/users/dashboard');
      return response.data;
    } catch (error) {
      console.error('❌ Get dashboard data failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async updatePreferences(preferences) {
    try {
      const response = await this.api.put('/users/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('❌ Update preferences failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseURL.replace('/api', '')}/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  // Token management
  setAuthToken(token) {
    localStorage.setItem('token', token);
    console.log('🔐 Auth token saved');
  }

  removeAuthToken() {
    localStorage.removeItem('token');
    console.log('🔐 Auth token removed');
  }

  getAuthToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return !!this.getAuthToken();
  }
}

export default new ApiService();