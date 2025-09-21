import express from "express";
import multer from "multer";
import path from "path";
import AIService from "../services/aiService.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/audio/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

// Generate interview question
router.post("/generate-question", authenticate, async (req, res) => {
  try {
    const { difficulty, topic, previousQuestions = [] } = req.body;

    const aiService = new AIService();
    const question = await aiService.generateQuestion(
      difficulty,
      topic,
      previousQuestions
    );

    res.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("Generate question error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate question",
    });
  }
});

// Evaluate code submission
router.post("/evaluate-code", authenticate, async (req, res) => {
  try {
    const { code, question, language, interviewId } = req.body;

    const aiService = new AIService();
    const evaluation = await aiService.evaluateCode({
      code,
      question,
      language,
      interviewId,
    });

    res.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error("Code evaluation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to evaluate code",
    });
  }
});

// Process voice input
router.post(
  "/voice-input",
  authenticate,
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No audio file provided",
        });
      }

      const aiService = new AIService();
      const audioPath = req.file.path;

      const result = await aiService.processVoiceInput(audioPath);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Voice input error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process voice input",
      });
    }
  }
);

// Generate text-to-speech
router.post("/text-to-speech", authenticate, async (req, res) => {
  try {
    const { text, voice = "female" } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const aiService = new AIService();
    const audio = await aiService.textToSpeech(text, voice);

    res.json({
      success: true,
      audio,
    });
  } catch (error) {
    console.error("Text-to-speech error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate speech",
    });
  }
});

// Chat with AI interviewer
router.post("/chat", authenticate, async (req, res) => {
  try {
    const { message, context, interviewId } = req.body;

    const aiService = new AIService();
    const response = await aiService.processChatMessage({
      message,
      context,
      interviewId,
      userId: req.userId,
    });

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process chat message",
    });
  }
});

// Generate interview summary
router.post("/generate-summary", authenticate, async (req, res) => {
  try {
    const { interviewId, performance, duration } = req.body;

    const aiService = new AIService();
    const summary = await aiService.generateInterviewSummary({
      interviewId,
      performance,
      duration,
      userId: req.userId,
    });

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Summary generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate summary",
    });
  }
});

// Get user performance insights
router.get("/performance-insights", authenticate, async (req, res) => {
  try {
    const aiService = new AIService();
    const insights = aiService.getUserPerformanceInsights(req.userId);

    res.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("Performance insights error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get performance insights",
    });
  }
});

// Get AI provider status
router.get("/provider-status", authenticate, async (req, res) => {
  try {
    const aiService = new AIService();
    const status = aiService.getProviderStatus();

    res.json({
      success: true,
      providers: status,
    });
  } catch (error) {
    console.error("Provider status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get provider status",
    });
  }
});

// Reset AI providers (for testing)
router.post("/reset-providers", authenticate, async (req, res) => {
  try {
    const aiService = new AIService();
    aiService.resetProviders();

    res.json({
      success: true,
      message: "AI providers reset successfully",
    });
  } catch (error) {
    console.error("Reset providers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset providers",
    });
  }
});

// Get AI interview insights
router.get("/insights/:interviewId", authenticate, async (req, res) => {
  try {
    const { interviewId } = req.params;

    const aiService = new AIService();
    const insights = await aiService.generateInsights(interviewId, req.userId);

    res.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("Insights generation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate insights",
    });
  }
});

// Serve audio files
router.get("/audio/:filename", (req, res) => {
  const filename = req.params.filename;
  const audioPath = path.join(process.cwd(), "uploads", "audio", filename);

  res.sendFile(audioPath, (err) => {
    if (err) {
      res.status(404).json({ message: "Audio file not found" });
    }
  });
});

export default router;
