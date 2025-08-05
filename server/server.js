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
import fs from "fs";
import path from "path";

dotenv.config();

// --- IMPROVEMENT: Validate required environment variables and exit if missing ---
if (!process.env.GEMINI_API_KEY) {
  console.error(
    "❌ FATAL ERROR: GEMINI_API_KEY not found in .env file. AI services will not work."
  );
  process.exit(1); // Exit the application if the key is missing
}
if (!process.env.MONGODB_URI) {
  console.error("❌ FATAL ERROR: MONGODB_URI not found in .env file.");
  process.exit(1);
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Create uploads directory
const uploadsDir = path.join(process.cwd(), "uploads", "audio");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// Socket.IO for real-time communication
io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log(`👤 User connected: ${socket.userId}`);

  // --- BUG FIX: Create a single AI Service instance per connection ---
  // This instance will maintain the context of the entire interview for this user.
  const aiService = new AIService(socket.userId); // Pass userId if your service needs it for context

  socket.on("join-interview", (interviewId) => {
    socket.join(`interview-${interviewId}`);
    console.log(`🎯 User ${socket.userId} joined interview ${interviewId}`);
  });

  socket.on("start-interview", async (data) => {
    try {
      // --- BUG FIX: Reuse the existing aiService instance ---
      const response = await aiService.startInterview({
        ...data,
        userId: socket.userId, // Already in constructor, but can be passed again if needed
      });

      socket.emit("ai-response", {
        type: "start",
        message: response.message,
        audio: response.audio,
        question: response.question,
      });

      console.log(`✅ Interview started for user ${socket.userId}`);
    } catch (error) {
      // --- IMPROVEMENT: Better error handling ---
      console.error(
        `❌ Start interview error for user ${socket.userId}:`,
        error.message
      );
      const isRateLimitError = error.status === 429;
      socket.emit("error", {
        message: isRateLimitError
          ? "The AI is receiving too many requests. Please wait a moment."
          : "Failed to start interview.",
        isRateLimitError,
      });
    }
  });

  socket.on("submit-code", async (data) => {
    try {
      // --- BUG FIX: Reuse the existing aiService instance ---
      const evaluation = await aiService.evaluateCode(data);

      socket.emit("code-evaluation", evaluation);

      socket.to(`interview-${data.interviewId}`).emit("code-submitted", {
        userId: socket.userId,
        code: data.code,
        evaluation,
      });
    } catch (error) {
      console.error(
        `❌ Code evaluation error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { message: "Failed to evaluate code" });
    }
  });

  socket.on("voice-input", async (audioData) => {
    try {
      // --- BUG FIX: Reuse the existing aiService instance ---
      const response = await aiService.processVoiceInput(audioData);

      socket.emit("ai-voice-response", {
        transcription: response.transcription,
        aiResponse: response.response,
        audio: response.audio,
      });
    } catch (error) {
      console.error(
        `❌ Voice input error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { message: "Failed to process voice input" });
    }
  });

  socket.on("chat-message", async (data) => {
    try {
      // --- BUG FIX: Reuse the existing aiService instance ---
      const response = await aiService.processChatMessage(data);
      socket.emit("ai-chat-response", response);
    } catch (error) {
      console.error(
        `❌ Chat message error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { message: "Failed to process chat message" });
    }
  });

  // (Assuming screen-share and end-interview follow the same pattern)
  // ... other event handlers also reusing the same aiService instance ...

  socket.on("end-interview", async (data) => {
    try {
      // --- BUG FIX: Reuse the existing aiService instance ---
      const summary = await aiService.generateInterviewSummary(data);
      socket.emit("interview-summary", summary);
    } catch (error) {
      console.error(
        `❌ Summary generation error for user ${socket.userId}:`,
        error.message
      );
      socket.emit("error", { message: "Failed to generate summary" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`👋 User disconnected: ${socket.userId}`);
    // --- IMPROVEMENT: Add a cleanup method in your AIService if needed ---
    // This could clear caches, close streams, or save final state.
    if (aiService && typeof aiService.cleanup === "function") {
      aiService.cleanup();
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 AI Mock Interview Platform Ready!`);
});
