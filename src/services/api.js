import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(userData) {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async login(credentials) {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  async updateProfile(updates) {
    const response = await this.api.put('/auth/profile', updates);
    return response.data;
  }

  // Interview endpoints
  async createInterview(interviewData) {
    const response = await this.api.post('/interviews', interviewData);
    return response.data;
  }

  async getInterviews(params = {}) {
    const response = await this.api.get('/interviews', { params });
    return response.data;
  }

  async getInterview(id) {
    const response = await this.api.get(`/interviews/${id}`);
    return response.data;
  }

  async updateInterview(id, updates) {
    const response = await this.api.put(`/interviews/${id}`, updates);
    return response.data;
  }

  async completeInterview(id, data) {
    const response = await this.api.post(`/interviews/${id}/complete`, data);
    return response.data;
  }

  async getInterviewStats() {
    const response = await this.api.get('/interviews/stats/overview');
    return response.data;
  }

  // AI endpoints
  async generateQuestion(params) {
    const response = await this.api.post('/ai/generate-question', params);
    return response.data;
  }

  async evaluateCode(data) {
    const response = await this.api.post('/ai/evaluate-code', data);
    return response.data;
  }

  async processVoiceInput(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-input.webm');
    
    const response = await this.api.post('/ai/voice-input', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async textToSpeech(text, voice = 'female') {
    const response = await this.api.post('/ai/text-to-speech', { text, voice });
    return response.data;
  }

  async chatWithAI(message, context, interviewId) {
    const response = await this.api.post('/ai/chat', {
      message,
      context,
      interviewId
    });
    return response.data;
  }

  async generateSummary(interviewId, performance, duration) {
    const response = await this.api.post('/ai/generate-summary', {
      interviewId,
      performance,
      duration
    });
    return response.data;
  }

  async getInsights(interviewId) {
    const response = await this.api.get(`/ai/insights/${interviewId}`);
    return response.data;
  }

  // User endpoints
  async getDashboardData() {
    const response = await this.api.get('/users/dashboard');
    return response.data;
  }

  async updatePreferences(preferences) {
    const response = await this.api.put('/users/preferences', preferences);
    return response.data;
  }

  async getAnalytics(timeframe = '30d') {
    const response = await this.api.get('/users/analytics', {
      params: { timeframe }
    });
    return response.data;
  }

  async getLeaderboard(timeframe = 'all', limit = 10) {
    const response = await this.api.get('/users/leaderboard', {
      params: { timeframe, limit }
    });
    return response.data;
  }

  // Utility methods
  getAudioUrl(filename) {
    return `${API_BASE_URL}/ai/audio/${filename}`;
  }

  setAuthToken(token) {
    localStorage.setItem('token', token);
  }

  removeAuthToken() {
    localStorage.removeItem('token');
  }

  getAuthToken() {
    return localStorage.getItem('token');
  }
}

export default new ApiService();