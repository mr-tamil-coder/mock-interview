import mongoose from 'mongoose';

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['dsa', 'system-design', 'behavioral'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  questions: [{
    id: String,
    title: String,
    description: String,
    difficulty: String,
    hints: [String],
    solution: String,
    timeSpent: Number,
    userCode: String,
    isCorrect: Boolean,
    score: Number
  }],
  duration: {
    type: Number, // in seconds
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  scores: {
    overall: Number,
    problemSolving: Number,
    codeQuality: Number,
    communication: Number,
    timeManagement: Number
  },
  feedback: {
    strengths: [String],
    improvements: [String],
    suggestions: [String],
    aiSummary: String
  },
  recordings: {
    video: String,
    audio: String,
    screen: String
  },
  chatHistory: [{
    sender: {
      type: String,
      enum: ['user', 'ai']
    },
    message: String,
    timestamp: Date,
    type: {
      type: String,
      enum: ['text', 'voice', 'code']
    }
  }],
  voiceInteractions: [{
    userInput: String,
    aiResponse: String,
    timestamp: Date,
    audioUrl: String
  }]
}, {
  timestamps: true
});

export default mongoose.model('Interview', interviewSchema);