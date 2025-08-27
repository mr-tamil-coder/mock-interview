import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import interviewRoutes from "./routes/interviews.js";
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/users.js";
import { authenticateSocket } from "./middleware/auth.js";
import AIService from "./services/aiService.js";

dotenv.config();

const app = express();
const server = createServer(app);

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://localhost:5173",
    "http://127.0.0.1:5173",
    "https://127.0.0.1:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Socket.IO Configuration
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mock-interview';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    console.log("🔄 Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Initialize AI Service
let aiService;
try {
  aiService = new AIService();
  console.log("✅ AI Service initialized");
} catch (error) {
  console.error("❌ AI Service initialization error:", error);
}

// Socket.IO Authentication
io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log(`👤 User connected: ${socket.userId}`);

  socket.on("join-interview", (interviewId) => {
    socket.join(`interview-${interviewId}`);
    console.log(`🎯 User ${socket.userId} joined interview ${interviewId}`);
  });

  socket.on("start-interview", async (data) => {
    try {
      console.log(`🚀 Starting interview for user ${socket.userId}:`, data);
      
      if (!aiService) {
        throw new Error("AI Service not available");
      }

      const response = await aiService.startInterview({
        ...data,
        userId: socket.userId,
      });

      socket.emit("ai-response", {
        type: "start",
        message: response.message,
        question: response.question,
        success: true
      });

      console.log(`✅ Interview started for user ${socket.userId}`);
    } catch (error) {
      console.error(`❌ Start interview error for user ${socket.userId}:`, error.message);
      socket.emit("error", {
        message: "Failed to start interview: " + error.message,
        success: false
      });
    }
  });

  socket.on("submit-code", async (data) => {
    try {
      console.log(`📝 Code submitted by user ${socket.userId}`);
      
      if (!aiService) {
        throw new Error("AI Service not available");
      }

      const evaluation = await aiService.evaluateCode({
        ...data,
        userId: socket.userId,
      });

      socket.emit("code-evaluation", {
        ...evaluation,
        success: true
      });
      
      console.log(`✅ Code evaluated for user ${socket.userId}`);
    } catch (error) {
      console.error(`❌ Code evaluation error for user ${socket.userId}:`, error.message);
      socket.emit("error", { 
        message: "Failed to evaluate code: " + error.message,
        success: false
      });
    }
  });

  socket.on("voice-input", async (data) => {
    try {
      console.log(`🎤 Voice input from user ${socket.userId}`);
      
      if (!aiService) {
        throw new Error("AI Service not available");
      }

      const response = await aiService.processVoiceInput({
        ...data,
        userId: socket.userId,
      });

      socket.emit("ai-voice-response", {
        transcription: response.transcription,
        aiResponse: response.aiResponse,
        timestamp: response.timestamp,
        success: true
      });
    } catch (error) {
      console.error(`❌ Voice input error for user ${socket.userId}:`, error.message);
      socket.emit("error", { 
        message: "Failed to process voice input: " + error.message,
        success: false
      });
    }
  });

  socket.on("chat-message", async (data) => {
    try {
      console.log(`💬 Chat message from user ${socket.userId}`);
      
      if (!aiService) {
        throw new Error("AI Service not available");
      }

      const response = await aiService.processChatMessage({
        ...data,
        userId: socket.userId,
      });
      
      socket.emit("ai-chat-response", {
        ...response,
        success: true
      });
    } catch (error) {
      console.error(`❌ Chat message error for user ${socket.userId}:`, error.message);
      socket.emit("error", { 
        message: "Failed to process chat message: " + error.message,
        success: false
      });
    }
  });

  socket.on("end-interview", async (data) => {
    try {
      console.log(`🏁 Ending interview for user ${socket.userId}`);
      
      if (!aiService) {
        throw new Error("AI Service not available");
      }

      const summary = await aiService.generateInterviewSummary({
        ...data,
        userId: socket.userId,
      });
      
      socket.emit("interview-summary", {
        ...summary,
        success: true
      });
    } catch (error) {
      console.error(`❌ Summary generation error for user ${socket.userId}:`, error.message);
      socket.emit("error", { 
        message: "Failed to generate summary: " + error.message,
        success: false
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`👋 User disconnected: ${socket.userId}`);
  });

  socket.on("error", (error) => {
    console.error(`Socket error for user ${socket.userId}:`, error);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at: http://localhost:${PORT}`);
  console.log(`🤖 AI Mock Interview Platform Ready!`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});