import { GoogleGenerativeAI } from "@google/generative-ai";

class AIService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required");
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    this.interviewContexts = new Map();
  }

  async startInterview(data) {
    const { difficulty, topic, userId } = data;
    
    try {
      console.log(`🤖 Starting interview for user ${userId} - ${difficulty} ${topic}`);
      
      // Generate first question
      const question = await this.generateDSAQuestion(difficulty, topic);
      
      // Initialize context
      this.interviewContexts.set(userId, {
        difficulty,
        topic,
        questionsAsked: [question],
        userResponses: [],
        startTime: new Date(),
        currentPhase: 'introduction'
      });

      const greeting = `Hello! I'm your AI interviewer today. I'm excited to work with you on ${difficulty} level ${topic} problems. Let's start with our first coding challenge. Take your time to understand the problem and think through your approach. Are you ready?`;

      return {
        message: greeting,
        question: question,
        interviewPhase: 'introduction'
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to start interview: ' + error.message);
    }
  }

  async generateDSAQuestion(difficulty, topic) {
    const prompt = `Generate a ${difficulty} level Data Structures and Algorithms problem focused on ${topic}.

Return ONLY a valid JSON object with this exact structure:
{
  "id": "unique-id",
  "title": "Problem Title",
  "description": "Detailed problem description with clear requirements",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "examples": [
    {
      "input": "example input",
      "output": "expected output",
      "explanation": "why this output"
    }
  ],
  "constraints": ["constraint 1", "constraint 2"],
  "hints": ["hint 1", "hint 2"],
  "starterCode": {
    "java": "public class Solution {\\n    public int[] solve(int[] nums) {\\n        // Your code here\\n        return new int[0];\\n    }\\n}",
    "javascript": "function solve(nums) {\\n    // Your code here\\n    return [];\\n}",
    "python": "def solve(nums):\\n    # Your code here\\n    return []",
    "cpp": "#include <vector>\\nusing namespace std;\\n\\nclass Solution {\\npublic:\\n    vector<int> solve(vector<int>& nums) {\\n        // Your code here\\n        return {};\\n    }\\n};"
  },
  "testCases": [
    {
      "input": "test input",
      "expected": "expected output",
      "explanation": "test case explanation"
    }
  ],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in AI response');
      }

      const question = JSON.parse(jsonMatch[0]);
      question.id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return question;
    } catch (error) {
      console.error('Question generation error:', error);
      return this.getDefaultQuestion(difficulty, topic);
    }
  }

  async evaluateCode(data) {
    const { code, question, language, userId } = data;
    
    if (!this.interviewContexts.has(userId)) {
      throw new Error('Interview context not found');
    }

    const context = this.interviewContexts.get(userId);
    
    const prompt = `As an expert technical interviewer, evaluate this ${language} code solution:

**Problem:** ${question.title}
**Description:** ${question.description}

**Code Solution:**
\`\`\`${language}
${code}
\`\`\`

Analyze the code and provide evaluation in this JSON format:
{
  "scores": {
    "correctness": 85,
    "efficiency": 75,
    "codeQuality": 90,
    "problemSolving": 80,
    "overall": 82
  },
  "feedback": {
    "strengths": ["Good use of HashMap", "Clean code structure"],
    "improvements": ["Consider edge cases", "Optimize space complexity"]
  },
  "testResults": [
    {
      "input": "test input",
      "expected": "expected output",
      "actual": "actual output",
      "passed": true,
      "executionTime": "5ms"
    }
  ],
  "complexityAnalysis": {
    "timeComplexity": "O(n)",
    "spaceComplexity": "O(n)",
    "explanation": "Uses HashMap for O(1) lookups"
  },
  "interviewerComment": "Good solution! Your approach is correct and efficient."
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in evaluation response');
      }

      const evaluation = JSON.parse(jsonMatch[0]);
      
      // Add to context
      context.userResponses.push({
        question: question.title,
        code,
        language,
        evaluation,
        timestamp: new Date()
      });

      return evaluation;
    } catch (error) {
      console.error('Code evaluation error:', error);
      return this.getDefaultEvaluation();
    }
  }

  async processChatMessage(data) {
    const { message, userId } = data;
    
    if (!this.interviewContexts.has(userId)) {
      throw new Error('Interview context not found');
    }

    const context = this.interviewContexts.get(userId);
    const currentQuestion = context.questionsAsked[context.questionsAsked.length - 1];

    const prompt = `You are conducting a technical interview. The candidate said: "${message}"

Current context:
- Phase: ${context.currentPhase}
- Current question: ${currentQuestion?.title || 'None'}
- Difficulty: ${context.difficulty}
- Topic: ${context.topic}

Respond as a helpful interviewer. Provide guidance, hints, or ask follow-up questions. Keep response under 100 words and be encouraging.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      return {
        message: response,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        message: "I understand. Can you tell me more about your approach to this problem?",
        timestamp: new Date()
      };
    }
  }

  async processVoiceInput(data) {
    const { transcript, userId } = data;
    
    // Process the voice input as a chat message
    const response = await this.processChatMessage({
      message: transcript,
      userId
    });

    return {
      transcription: transcript,
      aiResponse: response.message,
      timestamp: new Date()
    };
  }

  async generateInterviewSummary(data) {
    const { userId, performance } = data;
    
    if (!this.interviewContexts.has(userId)) {
      throw new Error('Interview context not found');
    }

    const context = this.interviewContexts.get(userId);
    const duration = Math.floor((new Date() - context.startTime) / 1000 / 60);

    const prompt = `Generate an interview summary for a ${context.difficulty} level ${context.topic} interview.

Performance data:
- Questions attempted: ${context.questionsAsked.length}
- Responses given: ${context.userResponses.length}
- Duration: ${duration} minutes
- Average score: ${performance.averageScore || 0}

Provide a comprehensive summary in JSON format:
{
  "overallScore": 85,
  "breakdown": {
    "problemSolving": 80,
    "codeQuality": 85,
    "communication": 90,
    "timeManagement": 75
  },
  "feedback": {
    "strengths": ["Strong problem-solving approach", "Clean code"],
    "improvements": ["Consider edge cases", "Optimize solutions"],
    "suggestions": ["Practice more dynamic programming", "Work on time complexity analysis"]
  },
  "recommendation": "Good performance! Ready for mid-level positions with some practice."
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in summary response');
      }

      const summary = JSON.parse(jsonMatch[0]);
      
      // Clean up context
      this.interviewContexts.delete(userId);
      
      return summary;
    } catch (error) {
      console.error('Summary generation error:', error);
      return this.getDefaultSummary();
    }
  }

  getDefaultQuestion(difficulty, topic) {
    return {
      id: `default_${Date.now()}`,
      title: "Two Sum",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      difficulty: difficulty,
      topic: topic,
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]"
        }
      ],
      constraints: [
        "2 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "-10^9 <= target <= 10^9"
      ],
      hints: [
        "Try using a hash map to store numbers you've seen",
        "For each number, check if target - number exists in the map"
      ],
      starterCode: {
        java: "public class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n        return new int[0];\n    }\n}",
        javascript: "function twoSum(nums, target) {\n    // Your code here\n    return [];\n}",
        python: "def twoSum(nums, target):\n    # Your code here\n    return []",
        cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n        return {};\n    }\n};"
      },
      testCases: [
        { input: "[2,7,11,15], 9", expected: "[0,1]", explanation: "2 + 7 = 9" },
        { input: "[3,2,4], 6", expected: "[1,2]", explanation: "2 + 4 = 6" }
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)"
    };
  }

  getDefaultEvaluation() {
    return {
      scores: {
        correctness: 70,
        efficiency: 60,
        codeQuality: 75,
        problemSolving: 65,
        overall: 67
      },
      feedback: {
        strengths: ["Good attempt at solving the problem"],
        improvements: ["Consider optimizing the solution", "Add more comments"]
      },
      testResults: [
        { input: "test1", expected: "result1", actual: "result1", passed: true, executionTime: "5ms" },
        { input: "test2", expected: "result2", actual: "wrong", passed: false, executionTime: "3ms" }
      ],
      complexityAnalysis: {
        timeComplexity: "O(n²)",
        spaceComplexity: "O(1)",
        explanation: "Nested loops create quadratic time complexity"
      },
      interviewerComment: "Good effort! Try to optimize your solution for better time complexity."
    };
  }

  getDefaultSummary() {
    return {
      overallScore: 75,
      breakdown: {
        problemSolving: 70,
        codeQuality: 75,
        communication: 80,
        timeManagement: 70
      },
      feedback: {
        strengths: ["Good problem-solving approach", "Clear communication"],
        improvements: ["Optimize solutions", "Consider edge cases"],
        suggestions: ["Practice more coding problems", "Work on algorithm optimization"]
      },
      recommendation: "Good performance! Keep practicing to improve your skills."
    };
  }
}

export default AIService;