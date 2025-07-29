import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  tags: [String],
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  constraints: [String],
  hints: [String],
  solution: {
    javascript: String,
    python: String,
    java: String,
    cpp: String
  },
  testCases: [{
    input: mongoose.Schema.Types.Mixed,
    expectedOutput: mongoose.Schema.Types.Mixed,
    isHidden: {
      type: Boolean,
      default: false
    }
  }],
  timeComplexity: String,
  spaceComplexity: String,
  companies: [String],
  frequency: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Question', questionSchema);