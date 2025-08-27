import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createServer } from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.js";
import interviewRoutes from "./routes/interviews.js";
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/users.js";
import { authenticateSocket } from "./middleware/auth.js";
import AIService from "./services/aiService.js";

dotenv.config();

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error(
    "❌ FATAL ERROR: GEMINI_API_KEY not found in .env file."
  );
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("❌ FATAL ERROR: MONGODB_URI not found in .env file.");
  process.exit(1);
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Initialize AI Service
const aiService = new AIService();

// Socket.IO for real-time communication
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
      const response = await aiService.startInterview({
        ...data,
        userId: socket.userId,
      });

      socket.emit("ai-response", {
        type: "start",
        message: response.message,
        question: response.question,
      });

      console.log(`✅ Interview started for user ${socket.userId}`);
    } catch (error) {
      console.error(
        `❌ Start interview error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", {
        message: "Failed to start interview: " + error.message,
      });
    }
  });

  socket.on("submit-code", async (data) => {
    try {
      console.log(`📝 Code submitted by user ${socket.userId}`);
      const evaluation = await aiService.evaluateCode({
        ...data,
        userId: socket.userId,
      });

      socket.emit("code-evaluation", evaluation);
      console.log(`✅ Code evaluated for user ${socket.userId}`);
    } catch (error) {
      console.error(
        `❌ Code evaluation error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { 
        message: "Failed to evaluate code: " + error.message 
      });
    }
  });

  socket.on("voice-input", async (data) => {
    try {
      console.log(`🎤 Voice input from user ${socket.userId}`);
      const response = await aiService.processVoiceInput({
        ...data,
        userId: socket.userId,
      });

      socket.emit("ai-voice-response", {
        transcription: response.transcription,
        aiResponse: response.response,
        timestamp: response.timestamp,
      });
    } catch (error) {
      console.error(
        `❌ Voice input error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { 
        message: "Failed to process voice input: " + error.message 
      });
    }
  });

  socket.on("chat-message", async (data) => {
    try {
      console.log(`💬 Chat message from user ${socket.userId}`);
      const response = await aiService.processChatMessage({
        ...data,
        userId: socket.userId,
      });
      socket.emit("ai-chat-response", response);
    } catch (error) {
      console.error(
        `❌ Chat message error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { 
        message: "Failed to process chat message: " + error.message 
      });
    }
  });

  socket.on("end-interview", async (data) => {
    try {
      console.log(`🏁 Ending interview for user ${socket.userId}`);
      const summary = await aiService.generateInterviewSummary({
        ...data,
        userId: socket.userId,
      });
      socket.emit("interview-summary", summary);
    } catch (error) {
      console.error(
        `❌ Summary generation error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { 
        message: "Failed to generate summary: " + error.message 
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`👋 User disconnected: ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 AI Mock Interview Platform Ready!`);
});
