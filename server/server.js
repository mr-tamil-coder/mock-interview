import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviews.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/users.js';
import { authenticateSocket } from './middleware/auth.js';
import AIService from './services/aiService.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory
import fs from 'fs';
import path from 'path';
const uploadsDir = path.join(process.cwd(), 'uploads', 'audio');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.IO for real-time communication
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.userId}`);
  
  socket.on('join-interview', (interviewId) => {
    socket.join(`interview-${interviewId}`);
    console.log(`🎯 User ${socket.userId} joined interview ${interviewId}`);
  });

  socket.on('start-interview', async (data) => {
    try {
      const aiService = new AIService();
      const response = await aiService.startInterview(data);
      
      socket.emit('ai-response', {
        type: 'start',
        message: response.message,
        audio: response.audio,
        question: response.question
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to start interview' });
    }
  });

  socket.on('submit-code', async (data) => {
    try {
      const aiService = new AIService();
      const evaluation = await aiService.evaluateCode(data);
      
      socket.emit('code-evaluation', evaluation);
      
      // Send to interview room
      socket.to(`interview-${data.interviewId}`).emit('code-submitted', {
        userId: socket.userId,
        code: data.code,
        evaluation
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to evaluate code' });
    }
  });

  socket.on('voice-input', async (audioData) => {
    try {
      const aiService = new AIService();
      const response = await aiService.processVoiceInput(audioData);
      
      socket.emit('ai-voice-response', {
        transcription: response.transcription,
        aiResponse: response.response,
        audio: response.audio
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to process voice input' });
    }
  });

  socket.on('chat-message', async (data) => {
    try {
      const aiService = new AIService();
      const response = await aiService.processChatMessage(data);
      
      socket.emit('ai-chat-response', response);
    } catch (error) {
      socket.emit('error', { message: 'Failed to process chat message' });
    }
  });

  socket.on('screen-share-activity', async (data) => {
    try {
      const aiService = new AIService();
      const analysis = await aiService.analyzeScreenShare(data, data.interviewId);
      
      socket.emit('screen-analysis', analysis);
    } catch (error) {
      console.error('Screen share analysis error:', error);
    }
  });
  socket.on('end-interview', async (data) => {
    try {
      const aiService = new AIService();
      const summary = await aiService.generateInterviewSummary(data);
      
      socket.emit('interview-summary', summary);
    } catch (error) {
      socket.emit('error', { message: 'Failed to generate summary' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`👋 User disconnected: ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 AI Mock Interview Platform Ready!`);
  console.log(`📝 Make sure to set your GEMINI_API_KEY in .env file`);
});