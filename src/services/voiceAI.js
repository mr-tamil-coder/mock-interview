import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

class VoiceAI {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.speechSynthesis = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.conversationContext = [];
    this.interviewState = {
      phase: 'introduction',
      currentQuestion: null,
      userResponses: [],
      codeSubmissions: []
    };
    
    this.initializeVoices();
  }

  // Initialize available voices
  initializeVoices() {
    const loadVoices = () => {
      this.voices = this.speechSynthesis.getVoices();
      // Select a professional female voice for AI interviewer
      this.selectedVoice = this.voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen') ||
        voice.gender === 'female'
      ) || this.voices.find(voice => voice.lang.startsWith('en')) || this.voices[0];
    };

    loadVoices();
    this.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Start listening for user input
  async startListening() {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      throw new Error('Speech recognition not supported in this browser');
    }

    try {
      await SpeechRecognition.startListening({
        continuous: true,
        language: 'en-US',
        interimResults: true
      });
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start listening:', error);
      return false;
    }
  }

  // Stop listening
  stopListening() {
    SpeechRecognition.stopListening();
    this.isListening = false;
  }

  // Speak AI response with natural voice
  async speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (this.isSpeaking) {
        this.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings for natural AI interviewer
      utterance.voice = this.selectedVoice;
      utterance.rate = options.rate || 0.9; // Slightly slower for clarity
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 0.8;
      
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.currentUtterance = utterance;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (error) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        reject(error);
      };

      this.speechSynthesis.speak(utterance);
    });
  }

  // Stop current speech
  stopSpeaking() {
    if (this.isSpeaking) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  // Process user voice input and generate AI response
  async processVoiceInput(transcript, interviewContext) {
    try {
      // Add user input to conversation context
      this.conversationContext.push({
        role: 'user',
        content: transcript,
        timestamp: new Date()
      });

      // Generate contextual AI response
      const aiResponse = await this.generateAIResponse(transcript, interviewContext);
      
      // Add AI response to context
      this.conversationContext.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      });

      // Speak the response
      await this.speak(aiResponse);

      return {
        transcript,
        aiResponse,
        conversationId: Date.now()
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      throw error;
    }
  }

  // Generate intelligent AI responses based on context
  async generateAIResponse(userInput, context) {
    const { phase, currentQuestion, difficulty, topic } = context;
    
    // Analyze user input for intent and content
    const inputAnalysis = this.analyzeUserInput(userInput);
    
    let response = '';

    switch (phase) {
      case 'introduction':
        response = this.generateIntroductionResponse(userInput, inputAnalysis);
        break;
      case 'problem_solving':
        response = this.generateProblemSolvingResponse(userInput, inputAnalysis, currentQuestion);
        break;
      case 'code_review':
        response = this.generateCodeReviewResponse(userInput, inputAnalysis);
        break;
      case 'wrap_up':
        response = this.generateWrapUpResponse(userInput, inputAnalysis);
        break;
      default:
        response = this.generateDefaultResponse(userInput, inputAnalysis);
    }

    return response;
  }

  // Analyze user input for intent and sentiment
  analyzeUserInput(input) {
    const lowerInput = input.toLowerCase();
    
    return {
      isQuestion: lowerInput.includes('?') || lowerInput.startsWith('what') || lowerInput.startsWith('how') || lowerInput.startsWith('why'),
      isConfused: lowerInput.includes('confused') || lowerInput.includes("don't understand") || lowerInput.includes('unclear'),
      isConfident: lowerInput.includes('yes') || lowerInput.includes('sure') || lowerInput.includes('confident'),
      needsHelp: lowerInput.includes('help') || lowerInput.includes('hint') || lowerInput.includes('stuck'),
      isExplaining: lowerInput.includes('approach') || lowerInput.includes('solution') || lowerInput.includes('algorithm'),
      sentiment: this.analyzeSentiment(lowerInput)
    };
  }

  // Simple sentiment analysis
  analyzeSentiment(text) {
    const positiveWords = ['good', 'great', 'excellent', 'confident', 'ready', 'understand', 'clear'];
    const negativeWords = ['difficult', 'hard', 'confused', 'stuck', 'unclear', 'worried', 'nervous'];
    
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  // Generate responses for different interview phases
  generateIntroductionResponse(input, analysis) {
    const responses = {
      greeting: [
        "Hello! I'm your AI interviewer today. I'm excited to work with you on some data structures and algorithms problems.",
        "Welcome to your mock interview! I'm here to help you practice and improve your coding skills.",
        "Great to meet you! Let's start with a coding challenge that will help assess your problem-solving abilities."
      ],
      ready: [
        "Excellent! Let's begin with our first problem. I'll present a medium-level array problem for you to solve.",
        "Perfect! I have a great data structures problem for you. Take your time to understand it and think through your approach.",
        "Wonderful! Remember, I'm here to help if you get stuck. Let's dive into our first coding challenge."
      ],
      nervous: [
        "Don't worry, this is just practice! Take a deep breath. I'm here to guide you through the process.",
        "It's completely normal to feel nervous. Remember, this is a learning experience. Let's take it step by step.",
        "No pressure at all! Think of me as a friendly coding partner. We'll work through this together."
      ]
    };

    if (analysis.isConfident || input.toLowerCase().includes('ready')) {
      return responses.ready[Math.floor(Math.random() * responses.ready.length)];
    } else if (analysis.sentiment === 'negative' || input.toLowerCase().includes('nervous')) {
      return responses.nervous[Math.floor(Math.random() * responses.nervous.length)];
    } else {
      return responses.greeting[Math.floor(Math.random() * responses.greeting.length)];
    }
  }

  generateProblemSolvingResponse(input, analysis, question) {
    if (analysis.needsHelp) {
      return this.generateHint(question);
    }
    
    if (analysis.isExplaining) {
      return "That sounds like a good approach! Can you walk me through the time complexity of your solution? And have you considered any edge cases?";
    }
    
    if (analysis.isQuestion) {
      return "That's a great question! Let me clarify that for you. " + this.generateClarification(input, question);
    }
    
    if (analysis.isConfused) {
      return "No worries! Let's break this down step by step. " + this.generateSimplifiedExplanation(question);
    }

    const encouragingResponses = [
      "Good thinking! Keep going with that approach.",
      "I like where you're heading with this. Can you elaborate on your solution?",
      "Interesting approach! How would you handle the implementation details?",
      "That's a solid start. What's your next step?",
      "Great observation! How does that help us solve the problem?"
    ];

    return encouragingResponses[Math.floor(Math.random() * encouragingResponses.length)];
  }

  generateHint(question) {
    const hints = [
      "Think about what data structure might help you store and retrieve information efficiently.",
      "Consider the time complexity - can we do better than a brute force approach?",
      "What if we use a hash map to store values we've seen before?",
      "Try thinking about this problem in terms of two pointers or sliding window technique.",
      "Break the problem down into smaller subproblems. What's the base case?"
    ];
    
    return "Here's a hint: " + hints[Math.floor(Math.random() * hints.length)];
  }

  generateClarification(input, question) {
    const clarifications = [
      "The input constraints are important here - we're dealing with arrays of size up to 10^4.",
      "Yes, you can assume all inputs are valid unless stated otherwise.",
      "The expected time complexity for an optimal solution would be O(n) or O(n log n).",
      "You can use any built-in data structures that your language provides.",
      "Focus on correctness first, then we can optimize for efficiency."
    ];
    
    return clarifications[Math.floor(Math.random() * clarifications.length)];
  }

  generateSimplifiedExplanation(question) {
    return "Let's start with a simple example and work through it step by step. This will help clarify the problem requirements.";
  }

  generateCodeReviewResponse(input, analysis) {
    const reviewResponses = [
      "Let me analyze your code... I can see you're using a good approach here. The logic looks sound.",
      "Your solution handles the main cases well. Have you tested it with edge cases like empty arrays?",
      "Good implementation! The time complexity looks optimal. Can we improve the space complexity?",
      "I notice you're using nested loops here. Can we optimize this to reduce the time complexity?",
      "Excellent work! Your code is clean and readable. Let's discuss the algorithmic complexity."
    ];

    return reviewResponses[Math.floor(Math.random() * reviewResponses.length)];
  }

  generateWrapUpResponse(input, analysis) {
    const wrapUpResponses = [
      "Great job today! You showed strong problem-solving skills and clear communication.",
      "Excellent work! Your approach to breaking down complex problems was impressive.",
      "Well done! You demonstrated good coding practices and algorithmic thinking.",
      "Outstanding performance! Your ability to explain your thought process was very clear.",
      "Fantastic interview! You handled the challenges well and showed great technical knowledge."
    ];

    return wrapUpResponses[Math.floor(Math.random() * wrapUpResponses.length)];
  }

  generateDefaultResponse(input, analysis) {
    const defaultResponses = [
      "I understand. Can you tell me more about your approach to this problem?",
      "That's interesting. How would you implement that solution?",
      "Good point. What do you think the time complexity would be?",
      "I see. Can you walk me through your reasoning?",
      "Okay, let's explore that idea further."
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  // Analyze communication skills during the interview
  analyzeCommunicationSkills() {
    const responses = this.conversationContext.filter(msg => msg.role === 'user');
    
    let clarity = 0;
    let technicalCommunication = 0;
    let confidence = 0;
    let structure = 0;
    let engagement = 0;

    responses.forEach(response => {
      const analysis = this.analyzeUserInput(response.content);
      
      // Clarity - based on sentence structure and vocabulary
      clarity += response.content.length > 20 ? 20 : 10;
      
      // Technical communication - use of technical terms
      const techTerms = ['algorithm', 'complexity', 'data structure', 'array', 'hash', 'loop', 'recursive'];
      const techScore = techTerms.filter(term => response.content.toLowerCase().includes(term)).length * 15;
      technicalCommunication += Math.min(techScore, 25);
      
      // Confidence - based on sentiment and certainty words
      if (analysis.sentiment === 'positive') confidence += 20;
      if (analysis.isConfident) confidence += 15;
      
      // Structure - logical flow and explanation
      if (analysis.isExplaining) structure += 20;
      
      // Engagement - asking questions and showing interest
      if (analysis.isQuestion) engagement += 15;
    });

    // Normalize scores to 0-100
    const totalResponses = Math.max(responses.length, 1);
    
    return {
      clarity: Math.min(clarity / totalResponses * 5, 100),
      technicalCommunication: Math.min(technicalCommunication / totalResponses * 4, 100),
      confidence: Math.min(confidence / totalResponses * 5, 100),
      structure: Math.min(structure / totalResponses * 5, 100),
      engagement: Math.min(engagement / totalResponses * 6, 100)
    };
  }

  // Generate comprehensive interview summary
  generateInterviewSummary(interviewData) {
    const communicationScores = this.analyzeCommunicationSkills();
    const overallCommunicationScore = Object.values(communicationScores).reduce((a, b) => a + b, 0) / 5;
    
    return {
      communicationAnalysis: {
        scores: communicationScores,
        overall: Math.round(overallCommunicationScore),
        feedback: this.generateCommunicationFeedback(communicationScores)
      },
      voiceInteractionStats: {
        totalInteractions: this.conversationContext.filter(msg => msg.role === 'user').length,
        averageResponseLength: this.calculateAverageResponseLength(),
        conversationFlow: this.analyzeConversationFlow()
      },
      recommendations: this.generateVoiceRecommendations(communicationScores)
    };
  }

  generateCommunicationFeedback(scores) {
    const feedback = {
      strengths: [],
      improvements: [],
      suggestions: []
    };

    // Analyze strengths
    if (scores.clarity > 80) feedback.strengths.push("Excellent clarity in communication");
    if (scores.technicalCommunication > 75) feedback.strengths.push("Strong technical vocabulary");
    if (scores.confidence > 80) feedback.strengths.push("Confident delivery and presentation");
    if (scores.structure > 75) feedback.strengths.push("Well-structured explanations");
    if (scores.engagement > 80) feedback.strengths.push("Great engagement and curiosity");

    // Identify improvements
    if (scores.clarity < 60) feedback.improvements.push("Work on speaking more clearly and concisely");
    if (scores.technicalCommunication < 60) feedback.improvements.push("Use more technical terminology when explaining solutions");
    if (scores.confidence < 60) feedback.improvements.push("Practice speaking with more confidence");
    if (scores.structure < 60) feedback.improvements.push("Structure your explanations more logically");
    if (scores.engagement < 60) feedback.improvements.push("Ask more clarifying questions");

    // Generate suggestions
    feedback.suggestions = [
      "Practice explaining algorithms out loud daily",
      "Record yourself solving problems and review your communication",
      "Join coding discussion groups to improve technical communication",
      "Practice the STAR method for structured responses",
      "Work on maintaining eye contact and confident body language"
    ];

    return feedback;
  }

  calculateAverageResponseLength() {
    const userResponses = this.conversationContext.filter(msg => msg.role === 'user');
    const totalLength = userResponses.reduce((sum, response) => sum + response.content.length, 0);
    return Math.round(totalLength / Math.max(userResponses.length, 1));
  }

  analyzeConversationFlow() {
    const responses = this.conversationContext.filter(msg => msg.role === 'user');
    let flowScore = 0;
    
    for (let i = 1; i < responses.length; i++) {
      const current = responses[i];
      const previous = responses[i - 1];
      
      // Check if responses build on each other
      if (current.content.length > previous.content.length * 0.8) {
        flowScore += 10;
      }
    }
    
    return Math.min(flowScore, 100);
  }

  generateVoiceRecommendations(scores) {
    const recommendations = [];
    
    if (scores.clarity < 70) {
      recommendations.push("Practice speaking slowly and enunciating clearly");
    }
    
    if (scores.technicalCommunication < 70) {
      recommendations.push("Study technical terminology and practice using it in explanations");
    }
    
    if (scores.confidence < 70) {
      recommendations.push("Practice mock interviews to build confidence");
    }
    
    if (scores.structure < 70) {
      recommendations.push("Use frameworks like 'Problem-Approach-Implementation-Testing' for structured responses");
    }
    
    if (scores.engagement < 70) {
      recommendations.push("Ask more questions to show curiosity and engagement");
    }
    
    return recommendations;
  }

  // Cleanup resources
  cleanup() {
    this.stopListening();
    this.stopSpeaking();
    this.conversationContext = [];
  }

  // Get current state
  getState() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      hasVoiceSupport: SpeechRecognition.browserSupportsSpeechRecognition(),
      conversationLength: this.conversationContext.length
    };
  }
}

export default new VoiceAI();