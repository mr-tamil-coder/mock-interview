import { io } from 'socket.io-client';
import apiService from './api.js';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  connect() {
    const token = apiService.getAuthToken();
    
    if (!token) {
      console.error('No auth token found');
      return;
    }

    this.socket = io('http://localhost:5000', {
      auth: {
        token
      },
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  setupEventListeners() {
    // AI Response events
    this.socket.on('ai-response', (data) => {
      this.emit('ai-response', data);
    });

    this.socket.on('ai-voice-response', (data) => {
      this.emit('ai-voice-response', data);
    });

    this.socket.on('ai-chat-response', (data) => {
      this.emit('ai-chat-response', data);
    });

    // Code evaluation events
    this.socket.on('code-evaluation', (data) => {
      this.emit('code-evaluation', data);
    });

    this.socket.on('code-submitted', (data) => {
      this.emit('code-submitted', data);
    });

    // Interview events
    this.socket.on('interview-summary', (data) => {
      this.emit('interview-summary', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  // Event emitter methods
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Interview methods
  joinInterview(interviewId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-interview', interviewId);
    }
  }

  startInterview(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('start-interview', data);
    }
  }

  submitCode(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('submit-code', data);
    }
  }

  sendVoiceInput(audioData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice-input', audioData);
    }
  }

  sendChatMessage(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('chat-message', data);
    }
  }

  endInterview(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('end-interview', data);
    }
  }

  // Utility methods
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();