import { GoogleGenerativeAI } from "@google/generative-ai";

class AIService {
  constructor() {
    this.interviewContexts = new Map();
    this.userPerformance = new Map(); // Track user performance
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second base delay

    // Initialize AI providers
    this.initializeAIProviders();
  }

  initializeAIProviders() {
    this.providers = [];

    // Initialize Gemini
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        this.providers.push({
          name: "gemini",
          model: model,
          priority: 1,
          available: true,
        });
        console.log("✅ Gemini AI provider initialized");
      } catch (error) {
        console.error("❌ Gemini initialization failed:", error.message);
      }
    }

    // Initialize OpenRouter (DeepSeek)
    if (
      process.env.OPENROUTER_API_KEY ||
      "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"
    ) {
      try {
        const openRouterKey =
          process.env.OPENROUTER_API_KEY ||
          "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";
        this.providers.push({
          name: "openrouter",
          apiKey: openRouterKey,
          priority: 2,
          available: true,
        });
        console.log("✅ OpenRouter AI provider initialized");
      } catch (error) {
        console.error("❌ OpenRouter initialization failed:", error.message);
      }
    }

    if (this.providers.length === 0) {
      throw new Error(
        "No AI providers available. Please configure GEMINI_API_KEY or OPENROUTER_API_KEY"
      );
    }

    console.log(`🤖 ${this.providers.length} AI provider(s) available`);
  }

  async generateContentWithFallback(prompt) {
    let lastError = null;

    // Try each provider in priority order
    for (const provider of this.providers) {
      if (!provider.available) continue;

      try {
        console.log(`🔄 Trying ${provider.name} provider...`);

        if (provider.name === "gemini") {
          const result = await provider.model.generateContent(prompt);
          const responseText = result.response.text();
          console.log(`✅ ${provider.name} generated content successfully`);
          return responseText;
        } else if (provider.name === "openrouter") {
          const responseText = await this.callOpenRouterAPI(
            prompt,
            provider.apiKey
          );
          console.log(`✅ ${provider.name} generated content successfully`);
          return responseText;
        }
      } catch (error) {
        console.error(`❌ ${provider.name} failed:`, error.message);
        lastError = error;

        // Mark provider as unavailable if it's a rate limit error or invalid model
        if (
          error.message.includes("429") ||
          error.message.includes("Too Many Requests") ||
          error.message.includes("rate limit") ||
          error.message.includes("not a valid model")
        ) {
          provider.available = false;
          console.log(
            `⚠️ ${provider.name} marked as unavailable due to: ${
              error.message.includes("rate limit") ? "rate limit" : "API error"
            }`
          );
        }
      }
    }

    // If all providers failed, throw the last error
    throw lastError || new Error("All AI providers failed");
  }

  async callOpenRouterAPI(prompt, apiKey) {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mock-interview-app.com",
          "X-Title": "Mock Interview AI",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages: [
            {
              role: "system",
              content:
                "You are an expert technical interviewer. You must ALWAYS respond with valid JSON only. Never include explanations, markdown formatting, or additional text outside the JSON structure. Your responses must be parseable JSON objects.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 3000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Reset provider availability (useful for testing)
  resetProviders() {
    this.providers.forEach((provider) => {
      provider.available = true;
    });
    console.log("🔄 All AI providers reset to available");
  }

  // Get provider status
  getProviderStatus() {
    return this.providers.map((provider) => ({
      name: provider.name,
      available: provider.available,
      priority: provider.priority,
    }));
  }

  // Track user's solved questions and performance
  updateUserPerformance(userId, question, performance) {
    if (!this.userPerformance.has(userId)) {
      this.userPerformance.set(userId, {
        solvedQuestions: new Set(),
        performanceByTopic: {},
        averageScore: 0,
        totalInterviews: 0,
        weakAreas: [],
        strongAreas: [],
      });
    }

    const userData = this.userPerformance.get(userId);

    // Track solved questions
    userData.solvedQuestions.add(question.title);

    // Update performance by topic
    if (!userData.performanceByTopic[question.topic]) {
      userData.performanceByTopic[question.topic] = {
        totalQuestions: 0,
        correctAnswers: 0,
        averageScore: 0,
        lastAttempted: null,
      };
    }

    const topicData = userData.performanceByTopic[question.topic];
    topicData.totalQuestions++;
    topicData.lastAttempted = new Date();

    if (performance.scores.overall >= 70) {
      topicData.correctAnswers++;
    }

    topicData.averageScore =
      (topicData.averageScore * (topicData.totalQuestions - 1) +
        performance.scores.overall) /
      topicData.totalQuestions;

    // Update overall performance
    userData.totalInterviews++;
    userData.averageScore =
      (userData.averageScore * (userData.totalInterviews - 1) +
        performance.scores.overall) /
      userData.totalInterviews;

    // Identify weak and strong areas
    this.updateWeakAndStrongAreas(userId);
  }

  updateWeakAndStrongAreas(userId) {
    const userData = this.userPerformance.get(userId);
    const topicPerformance = userData.performanceByTopic;

    const areas = Object.entries(topicPerformance)
      .map(([topic, data]) => ({
        topic,
        averageScore: data.averageScore,
        totalQuestions: data.totalQuestions,
      }))
      .filter((area) => area.totalQuestions >= 2); // Only consider areas with at least 2 attempts

    // Sort by performance
    areas.sort((a, b) => a.averageScore - b.averageScore);

    userData.weakAreas = areas.slice(0, 3).map((area) => area.topic); // Top 3 weak areas
    userData.strongAreas = areas.slice(-3).map((area) => area.topic); // Top 3 strong areas
  }

  async startInterview(data) {
    const { difficulty, topic, userId } = data;

    try {
      console.log(
        `🤖 Starting interview for user ${userId} - ${difficulty} ${topic}`
      );

      // Generate personalized question based on user history
      const question = await this.generatePersonalizedQuestion(
        userId,
        difficulty,
        topic
      );

      if (!question) {
        throw new Error(
          "Failed to generate interview question after all retries and fallbacks"
        );
      }

      // Initialize context
      this.interviewContexts.set(userId, {
        difficulty,
        topic,
        questionsAsked: [question],
        userResponses: [],
        startTime: new Date(),
        currentPhase: "introduction",
      });

      const greeting = `Hello! I'm your AI interviewer today. I'm excited to work with you on ${difficulty} level ${topic} problems. Let's start with our first coding challenge. Take your time to understand the problem and think through your approach. Are you ready?`;

      return {
        message: greeting,
        question: question,
        interviewPhase: "introduction",
      };
    } catch (error) {
      console.error("AI Service Error:", error);
      throw new Error("Failed to start interview: " + error.message);
    }
  }

  async generatePersonalizedQuestion(userId, difficulty, topic) {
    // Get user performance data
    const userData = this.userPerformance.get(userId);
    const userHistory = userData
      ? {
          solvedQuestions: Array.from(userData.solvedQuestions),
          weakAreas: userData.weakAreas,
          strongAreas: userData.strongAreas,
          averageScore: userData.averageScore,
          topicPerformance: userData.performanceByTopic[topic] || null,
        }
      : null;

    // Adjust difficulty based on user performance
    let adjustedDifficulty = difficulty;
    if (userHistory && userHistory.topicPerformance) {
      const topicScore = userHistory.topicPerformance.averageScore;
      if (topicScore < 50 && difficulty === "hard") {
        adjustedDifficulty = "medium";
      } else if (topicScore > 80 && difficulty === "easy") {
        adjustedDifficulty = "medium";
      }
    }

    // Try to generate AI question first
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `🔄 Attempt ${attempt}/${this.maxRetries} to generate personalized question for ${adjustedDifficulty} ${topic}`
        );
        const question = await this.generateAIPersonalizedQuestion(
          adjustedDifficulty,
          topic,
          userHistory
        );
        console.log(
          `✅ Personalized question generated successfully on attempt ${attempt}`
        );
        return question;
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (
          error.message.includes("429") ||
          error.message.includes("Too Many Requests")
        ) {
          if (attempt < this.maxRetries) {
            const delay = this.baseDelay * Math.pow(2, attempt - 1);
            console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
            continue;
          } else {
            console.log(
              `⚠️ All retries exhausted. Using smart fallback questions.`
            );
            return this.getSmartFallbackQuestion(
              userId,
              adjustedDifficulty,
              topic,
              userHistory
            );
          }
        } else {
          console.log(
            `⚠️ Non-rate-limit error. Using smart fallback questions.`
          );
          return this.getSmartFallbackQuestion(
            userId,
            adjustedDifficulty,
            topic,
            userHistory
          );
        }
      }
    }

    return this.getSmartFallbackQuestion(
      userId,
      adjustedDifficulty,
      topic,
      userHistory
    );
  }

  async generateAIPersonalizedQuestion(difficulty, topic, userHistory) {
    const solvedQuestions = userHistory
      ? userHistory.solvedQuestions.join(", ")
      : "none";
    const weakAreas = userHistory ? userHistory.weakAreas.join(", ") : "none";
    const strongAreas = userHistory
      ? userHistory.strongAreas.join(", ")
      : "none";
    const averageScore = userHistory ? userHistory.averageScore : 0;

    const prompt = `You are an expert technical interviewer. Generate a ${difficulty} level Data Structures and Algorithms problem focused on ${topic}.

IMPORTANT CONTEXT:
- User has solved these questions: ${solvedQuestions}
- User's weak areas: ${weakAreas}
- User's strong areas: ${strongAreas}
- User's average score: ${averageScore}

REQUIREMENTS:
1. DO NOT generate any of the already solved questions
2. Focus on areas where the user needs improvement
3. Include commonly asked interview questions for ${topic}
4. Make it challenging but appropriate for ${difficulty} level
5. Include real-world scenarios when possible

CRITICAL: You must respond with ONLY valid JSON. No additional text, explanations, or markdown formatting.

{
  "id": "unique-id",
  "title": "Problem Title",
  "description": "Detailed problem description with clear requirements and real-world context",
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
  "spaceComplexity": "O(1)",
  "interviewTips": "Specific tips for this problem in interviews",
  "commonMistakes": ["Common mistake 1", "Common mistake 2"],
  "followUpQuestions": ["Follow-up question 1", "Follow-up question 2"]
}`;

    try {
      const responseText = await this.generateContentWithFallback(prompt);
      console.log("Raw AI response:", responseText.substring(0, 200) + "...");

      // Try multiple JSON extraction methods
      let jsonString = null;

      // Method 1: Look for JSON between curly braces
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      // Method 2: If no match, try to find JSON after removing markdown
      if (!jsonString) {
        const cleanText = responseText
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
          jsonString = cleanText;
        }
      }

      // Method 3: Try to extract JSON from the entire response
      if (!jsonString) {
        const startIndex = responseText.indexOf("{");
        const endIndex = responseText.lastIndexOf("}");
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonString = responseText.substring(startIndex, endIndex + 1);
        }
      }

      if (!jsonString) {
        console.error("Could not extract JSON from response:", responseText);
        throw new Error("No valid JSON found in AI response");
      }

      const question = JSON.parse(jsonString);
      question.id = `ai_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return question;
    } catch (error) {
      console.error("AI Personalized question generation error:", error);

      // If JSON parsing fails, create a simple fallback question
      if (
        error.message.includes("No valid JSON found") ||
        error.message.includes("JSON")
      ) {
        console.log("Creating fallback question due to JSON parsing error");
        return {
          id: `ai_fallback_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          title: `${
            difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
          } ${topic} Problem`,
          description: `Solve this ${difficulty} level ${topic} problem. This is a personalized question based on your performance.`,
          difficulty: difficulty,
          topic: topic,
          examples: [
            {
              input: "Example input",
              output: "Expected output",
              explanation: "This is how the solution works",
            },
          ],
          constraints: ["1 <= n <= 10^5", "All values are integers"],
          hints: [
            "Think about the problem step by step",
            "Consider edge cases",
          ],
          starterCode: {
            java: "public class Solution {\n    public int[] solve(int[] nums) {\n        // Your code here\n        return new int[0];\n    }\n}",
            javascript:
              "function solve(nums) {\n    // Your code here\n    return [];\n}",
            python: "def solve(nums):\n    # Your code here\n    return []",
            cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums) {\n        // Your code here\n        return {};\n    }\n};",
          },
          testCases: [
            {
              input: "test input",
              expected: "expected output",
              explanation: "test case explanation",
            },
          ],
          timeComplexity: "O(n)",
          spaceComplexity: "O(1)",
          interviewTips: "Focus on understanding the problem before coding",
          commonMistakes: [
            "Not considering edge cases",
            "Poor time complexity",
          ],
          followUpQuestions: [
            "How would you optimize this?",
            "What if the constraints change?",
          ],
        };
      }

      throw error;
    }
  }

  getSmartFallbackQuestion(userId, difficulty, topic, userHistory) {
    console.log(`🔄 Using smart fallback question for ${difficulty} ${topic}`);

    const fallbackQuestions = this.getStaticQuestions();
    const topicMapping = {
      arrays: "arrays",
      strings: "strings",
      linkedlist: "linkedlist",
      trees: "trees",
      graphs: "graphs",
      "dynamic-programming": "dynamic",
      dp: "dynamic",
      dynamic: "dynamic",
      "system-design": "arrays",
      behavioral: "arrays",
    };

    const mappedTopic = topicMapping[topic] || "arrays";
    const topicQuestions =
      fallbackQuestions[mappedTopic] || fallbackQuestions["arrays"];
    const difficultyQuestions =
      topicQuestions[difficulty] || topicQuestions["medium"];

    // Filter out already solved questions
    let availableQuestions = difficultyQuestions;
    if (userHistory && userHistory.solvedQuestions.length > 0) {
      availableQuestions = difficultyQuestions.filter(
        (q) => !userHistory.solvedQuestions.includes(q.title)
      );
    }

    // If no questions available, use all questions but mark as repeated
    if (availableQuestions.length === 0) {
      availableQuestions = difficultyQuestions;
      console.log(
        `⚠️ No new questions available for ${topic}, using repeated questions`
      );
    }

    // Select question based on user's weak areas
    let selectedQuestion;
    if (userHistory && userHistory.weakAreas.includes(topic)) {
      // Prioritize questions that are commonly asked in interviews
      const commonQuestions = availableQuestions.filter((q) =>
        this.isCommonlyAskedQuestion(q.title)
      );
      selectedQuestion =
        commonQuestions.length > 0
          ? commonQuestions[Math.floor(Math.random() * commonQuestions.length)]
          : availableQuestions[
              Math.floor(Math.random() * availableQuestions.length)
            ];
    } else {
      selectedQuestion =
        availableQuestions[
          Math.floor(Math.random() * availableQuestions.length)
        ];
    }

    return {
      ...selectedQuestion,
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      difficulty: difficulty,
      topic: topic,
      isRepeated: userHistory
        ? userHistory.solvedQuestions.includes(selectedQuestion.title)
        : false,
    };
  }

  isCommonlyAskedQuestion(title) {
    const commonlyAsked = [
      "Two Sum",
      "Valid Parentheses",
      "Reverse Linked List",
      "Maximum Depth of Binary Tree",
      "Climbing Stairs",
      "Container With Most Water",
      "Longest Substring Without Repeating Characters",
      "Add Two Numbers",
      "House Robber",
      "Binary Tree Level Order Traversal",
      "Remove Duplicates from Sorted Array",
      "Regular Expression Matching",
      "Edit Distance",
      "Merge k Sorted Lists",
      "Serialize and Deserialize Binary Tree",
      "Number of Islands",
      "Course Schedule",
      "Word Ladder",
    ];
    return commonlyAsked.includes(title);
  }

  // Get user performance insights
  getUserPerformanceInsights(userId) {
    if (!this.userPerformance.has(userId)) {
      return {
        message:
          "No performance data available yet. Start solving questions to get personalized insights!",
        totalQuestions: 0,
        averageScore: 0,
        weakAreas: [],
        strongAreas: [],
        recommendations: [],
      };
    }

    const userData = this.userPerformance.get(userId);
    const insights = {
      totalQuestions: userData.solvedQuestions.size,
      averageScore: Math.round(userData.averageScore),
      weakAreas: userData.weakAreas,
      strongAreas: userData.strongAreas,
      topicBreakdown: userData.performanceByTopic,
      recommendations: this.generateRecommendations(userData),
    };

    return insights;
  }

  generateRecommendations(userData) {
    const recommendations = [];

    if (userData.averageScore < 60) {
      recommendations.push(
        "Focus on fundamental concepts and practice more easy-level problems"
      );
    }

    if (userData.weakAreas.length > 0) {
      recommendations.push(
        `Practice more ${userData.weakAreas.join(
          ", "
        )} problems to improve your weak areas`
      );
    }

    if (userData.solvedQuestions.size < 10) {
      recommendations.push("Solve more problems to build a strong foundation");
    }

    if (userData.averageScore > 80) {
      recommendations.push(
        "Great progress! Try more challenging problems to push your limits"
      );
    }

    return recommendations;
  }

  async generateDSAQuestionWithRetry(difficulty, topic) {
    // This method is now deprecated in favor of generatePersonalizedQuestion
    return await this.generatePersonalizedQuestion(null, difficulty, topic);
  }

  async generateQuestion(difficulty, topic, previousQuestions = []) {
    // This is a wrapper method for compatibility with the routes
    return await this.generatePersonalizedQuestion(null, difficulty, topic);
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
      const responseText = await this.generateContentWithFallback(prompt);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }

      const question = JSON.parse(jsonMatch[0]);
      question.id = `q_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      return question;
    } catch (error) {
      console.error("Question generation error:", error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  getFallbackQuestion(difficulty, topic) {
    console.log(`🔄 Using fallback question for ${difficulty} ${topic}`);

    const fallbackQuestions = this.getStaticQuestions();

    // Map topics to available question categories
    const topicMapping = {
      arrays: "arrays",
      strings: "strings",
      linkedlist: "linkedlist",
      trees: "trees",
      graphs: "trees", // Fallback to trees for graph questions
      "dynamic-programming": "dynamic",
      dp: "dynamic",
      dynamic: "dynamic",
      "system-design": "arrays", // Fallback to arrays for system design
      behavioral: "arrays", // Fallback to arrays for behavioral
    };

    const mappedTopic = topicMapping[topic] || "arrays";
    const topicQuestions =
      fallbackQuestions[mappedTopic] || fallbackQuestions["arrays"];
    const difficultyQuestions =
      topicQuestions[difficulty] || topicQuestions["medium"];

    // Return a random question from the appropriate category
    const randomIndex = Math.floor(Math.random() * difficultyQuestions.length);
    const question = difficultyQuestions[randomIndex];

    return {
      ...question,
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      difficulty: difficulty,
      topic: topic,
    };
  }

  getStaticQuestions() {
    return {
      arrays: {
        easy: [
          {
            title: "Two Sum",
            description:
              "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
            examples: [
              {
                input: "nums = [2,7,11,15], target = 9",
                output: "[0,1]",
                explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]",
              },
            ],
            constraints: [
              "2 <= nums.length <= 10^4",
              "-10^9 <= nums[i] <= 10^9",
              "-10^9 <= target <= 10^9",
            ],
            hints: [
              "Try using a hash map to store numbers you've seen",
              "For each number, check if target - number exists in the map",
            ],
            starterCode: {
              java: "public class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n        return new int[0];\n    }\n}",
              javascript:
                "function twoSum(nums, target) {\n    // Your code here\n    return [];\n}",
              python:
                "def twoSum(nums, target):\n    # Your code here\n    return []",
              cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n        return {};\n    }\n};",
            },
            testCases: [
              {
                input: "[2,7,11,15], 9",
                expected: "[0,1]",
                explanation: "2 + 7 = 9",
              },
              {
                input: "[3,2,4], 6",
                expected: "[1,2]",
                explanation: "2 + 4 = 6",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
          },
          {
            title: "Remove Duplicates from Sorted Array",
            description:
              "Given a sorted array nums, remove the duplicates in-place such that each element appears only once and return the new length. Do not allocate extra space for another array, you must do this by modifying the input array in-place with O(1) extra memory.",
            examples: [
              {
                input: "nums = [1,1,2]",
                output: "2, nums = [1,2,_]",
                explanation:
                  "Your function should return length = 2, with the first two elements of nums being 1 and 2 respectively.",
              },
            ],
            constraints: [
              "1 <= nums.length <= 3 * 10^4",
              "-100 <= nums[i] <= 100",
              "nums is sorted in non-decreasing order",
            ],
            hints: [
              "Use two pointers approach",
              "One pointer for reading, one for writing",
            ],
            starterCode: {
              java: "public class Solution {\n    public int removeDuplicates(int[] nums) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function removeDuplicates(nums) {\n    // Your code here\n    return 0;\n}",
              python:
                "def removeDuplicates(nums):\n    # Your code here\n    return 0",
              cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int removeDuplicates(vector<int>& nums) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: "[1,1,2]",
                expected: "2",
                explanation: "Remove duplicates, length becomes 2",
              },
              {
                input: "[0,0,1,1,1,2,2,3,3,4]",
                expected: "5",
                explanation: "Remove duplicates, length becomes 5",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
          },
        ],
        medium: [
          {
            title: "Container With Most Water",
            description:
              "Given n non-negative integers height where each represents a point at coordinate (i, height[i]), find two lines that together with the x-axis form a container that would hold the maximum amount of water. Return the maximum amount of water a container can store.",
            examples: [
              {
                input: "height = [1,8,6,2,5,4,8,3,7]",
                output: "49",
                explanation:
                  "The maximum area is obtained by choosing height[1] = 8 and height[8] = 7",
              },
            ],
            constraints: [
              "n == height.length",
              "2 <= n <= 10^5",
              "0 <= height[i] <= 10^4",
            ],
            hints: [
              "Use two pointers starting from both ends",
              "Move the pointer with smaller height inward",
            ],
            starterCode: {
              java: "public class Solution {\n    public int maxArea(int[] height) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function maxArea(height) {\n    // Your code here\n    return 0;\n}",
              python:
                "def maxArea(height):\n    // Your code here\n    return 0",
              cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: "[1,8,6,2,5,4,8,3,7]",
                expected: "49",
                explanation: "Maximum area between height[1] and height[8]",
              },
              {
                input: "[1,1]",
                expected: "1",
                explanation: "Minimum area with two lines",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
          },
        ],
        hard: [
          {
            title: "Trapping Rain Water",
            description:
              "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
            examples: [
              {
                input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
                output: "6",
                explanation:
                  "The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.",
              },
            ],
            constraints: [
              "n == height.length",
              "1 <= n <= 2 * 10^4",
              "0 <= height[i] <= 10^5",
            ],
            hints: [
              "Use two pointers approach",
              "Keep track of left and right maximum heights",
            ],
            starterCode: {
              java: "public class Solution {\n    public int trap(int[] height) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function trap(height) {\n    // Your code here\n    return 0;\n}",
              python: "def trap(height):\n    // Your code here\n    return 0",
              cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: "[0,1,0,2,1,0,1,3,2,1,2,1]",
                expected: "6",
                explanation: "6 units of water trapped",
              },
              {
                input: "[4,2,0,3,2,5]",
                expected: "9",
                explanation: "9 units of water trapped",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
          },
        ],
      },
      strings: {
        easy: [
          {
            title: "Valid Parentheses",
            description:
              "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: 1) Open brackets must be closed by the same type of brackets. 2) Open brackets must be closed in the correct order.",
            examples: [
              {
                input: 's = "()"',
                output: "true",
                explanation: "Simple valid parentheses",
              },
            ],
            constraints: [
              "1 <= s.length <= 10^4",
              "s consists of parentheses only '()[]{}'",
            ],
            hints: [
              "Use a stack to keep track of opening brackets",
              "When you see a closing bracket, check if it matches the top of the stack",
            ],
            starterCode: {
              java: "public class Solution {\n    public boolean isValid(String s) {\n        // Your code here\n        return false;\n    }\n}",
              javascript:
                "function isValid(s) {\n    // Your code here\n    return false;\n}",
              python:
                "def isValid(s):\n    // Your code here\n    return False",
              cpp: "#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Your code here\n        return false;\n    }\n};",
            },
            testCases: [
              {
                input: '"()"',
                expected: "true",
                explanation: "Valid parentheses",
              },
              {
                input: '"([)]"',
                expected: "false",
                explanation: "Invalid order",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
          },
        ],
        medium: [
          {
            title: "Longest Substring Without Repeating Characters",
            description:
              "Given a string s, find the length of the longest substring without repeating characters.",
            examples: [
              {
                input: 's = "abcabcbb"',
                output: "3",
                explanation: 'The answer is "abc", with the length of 3.',
              },
            ],
            constraints: [
              "0 <= s.length <= 5 * 10^4",
              "s consists of English letters, digits, symbols and spaces",
            ],
            hints: [
              "Use sliding window technique",
              "Keep track of characters in current window using a set or map",
            ],
            starterCode: {
              java: "public class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function lengthOfLongestSubstring(s) {\n    // Your code here\n    return 0;\n}",
              python:
                "def lengthOfLongestSubstring(s):\n    // Your code here\n    return 0",
              cpp: "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: '"abcabcbb"',
                expected: "3",
                explanation: 'Longest substring is "abc"',
              },
              {
                input: '"bbbbb"',
                expected: "1",
                explanation: 'Longest substring is "b"',
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(min(m,n))",
          },
        ],
        hard: [
          {
            title: "Regular Expression Matching",
            description:
              "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where '.' matches any single character and '*' matches zero or more of the preceding element.",
            examples: [
              {
                input: 's = "aa", p = "a*"',
                output: "true",
                explanation:
                  "'*' means zero or more of the preceding element, 'a'. Therefore, by repeating 'a' once, it becomes \"aa\".",
              },
            ],
            constraints: [
              "1 <= s.length <= 20",
              "1 <= p.length <= 30",
              "s contains only lowercase English letters",
              "p contains only lowercase English letters, '.', and '*'",
            ],
            hints: [
              "Use dynamic programming",
              "Consider all possible matches for '*'",
            ],
            starterCode: {
              java: "public class Solution {\n    public boolean isMatch(String s, String p) {\n        // Your code here\n        return false;\n    }\n}",
              javascript:
                "function isMatch(s, p) {\n    // Your code here\n    return false;\n}",
              python:
                "def isMatch(s, p):\n    // Your code here\n    return False",
              cpp: "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isMatch(string s, string p) {\n        // Your code here\n        return false;\n    }\n};",
            },
            testCases: [
              {
                input: '"aa", "a*"',
                expected: "true",
                explanation: "Pattern matches",
              },
              {
                input: '"ab", ".*"',
                expected: "true",
                explanation: "Pattern matches",
              },
            ],
            timeComplexity: "O(mn)",
            spaceComplexity: "O(mn)",
          },
        ],
      },
      linkedlist: {
        easy: [
          {
            title: "Reverse Linked List",
            description:
              "Given the head of a singly linked list, reverse the list, and return the reversed list.",
            examples: [
              {
                input: "head = [1,2,3,4,5]",
                output: "[5,4,3,2,1]",
                explanation: "The linked list is reversed",
              },
            ],
            constraints: [
              "The number of nodes in the list is in the range [0, 5000]",
              "-5000 <= Node.val <= 5000",
            ],
            hints: [
              "Use three pointers: prev, current, and next",
              "Iteratively reverse the links",
            ],
            starterCode: {
              java: "public class ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\npublic class Solution {\n    public ListNode reverseList(ListNode head) {\n        // Your code here\n        return null;\n    }\n}",
              javascript:
                "function ListNode(val, next) {\n    this.val = (val===undefined ? 0 : val)\n    this.next = (next===undefined ? null : next)\n}\n\nfunction reverseList(head) {\n    // Your code here\n    return null;\n}",
              python:
                "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverseList(head):\n    # Your code here\n    return None",
              cpp: "struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Your code here\n        return nullptr;\n    }\n};",
            },
            testCases: [
              {
                input: "[1,2,3,4,5]",
                expected: "[5,4,3,2,1]",
                explanation: "Reversed linked list",
              },
              {
                input: "[1,2]",
                expected: "[2,1]",
                explanation: "Reversed linked list",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
          },
        ],
        medium: [
          {
            title: "Add Two Numbers",
            description:
              "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
            examples: [
              {
                input: "l1 = [2,4,3], l2 = [5,6,4]",
                output: "[7,0,8]",
                explanation: "342 + 465 = 807",
              },
            ],
            constraints: [
              "The number of nodes in each linked list is in the range [1, 100]",
              "0 <= Node.val <= 9",
              "It is guaranteed that the list represents a number that does not have leading zeros",
            ],
            hints: [
              "Simulate the addition process digit by digit",
              "Keep track of carry from previous addition",
            ],
            starterCode: {
              java: "public class ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\npublic class Solution {\n    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {\n        // Your code here\n        return null;\n    }\n}",
              javascript:
                "function ListNode(val, next) {\n    this.val = (val===undefined ? 0 : val)\n    this.next = (next===undefined ? null : next)\n}\n\nfunction addTwoNumbers(l1, l2) {\n    // Your code here\n    return null;\n}",
              python:
                "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef addTwoNumbers(l1, l2):\n    # Your code here\n    return None",
              cpp: "struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        // Your code here\n        return nullptr;\n    }\n};",
            },
            testCases: [
              {
                input: "[2,4,3], [5,6,4]",
                expected: "[7,0,8]",
                explanation: "342 + 465 = 807",
              },
              { input: "[0], [0]", expected: "[0]", explanation: "0 + 0 = 0" },
            ],
            timeComplexity: "O(max(m,n))",
            spaceComplexity: "O(max(m,n))",
          },
        ],
        hard: [
          {
            title: "Merge k Sorted Lists",
            description:
              "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
            examples: [
              {
                input: "lists = [[1,4,5],[1,3,4],[2,6]]",
                output: "[1,1,2,3,4,4,5,6]",
                explanation: "Merged sorted linked list",
              },
            ],
            constraints: [
              "k == lists.length",
              "0 <= k <= 10^4",
              "0 <= lists[i].length <= 500",
              "-10^4 <= lists[i][j] <= 10^4",
              "lists[i] is sorted in ascending order",
            ],
            hints: [
              "Use a min-heap to always get the smallest element",
              "Compare heads of all lists and pick the minimum",
            ],
            starterCode: {
              java: "public class ListNode {\n    int val;\n    ListNode next;\n    ListNode() {}\n    ListNode(int val) { this.val = val; }\n    ListNode(int val, ListNode next) { this.val = val; this.next = next; }\n}\n\npublic class Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Your code here\n        return null;\n    }\n}",
              javascript:
                "function ListNode(val, next) {\n    this.val = (val===undefined ? 0 : val)\n    this.next = (next===undefined ? null : next)\n}\n\nfunction mergeKLists(lists) {\n    // Your code here\n    return null;\n}",
              python:
                "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef mergeKLists(lists):\n    # Your code here\n    return None",
              cpp: "struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        // Your code here\n        return nullptr;\n    }\n};",
            },
            testCases: [
              {
                input: "[[1,4,5],[1,3,4],[2,6]]",
                expected: "[1,1,2,3,4,4,5,6]",
                explanation: "Merged sorted list",
              },
              { input: "[]", expected: "[]", explanation: "Empty list" },
            ],
            timeComplexity: "O(n log k)",
            spaceComplexity: "O(k)",
          },
        ],
      },
      trees: {
        easy: [
          {
            title: "Maximum Depth of Binary Tree",
            description:
              "Given the root of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
            examples: [
              {
                input: "root = [3,9,20,null,null,15,7]",
                output: "3",
                explanation: "The tree has a maximum depth of 3",
              },
            ],
            constraints: [
              "The number of nodes in the tree is in the range [0, 10^4]",
              "-100 <= Node.val <= 100",
            ],
            hints: [
              "Use recursion to traverse the tree",
              "Return 1 + max(left subtree depth, right subtree depth)",
            ],
            starterCode: {
              java: "public class TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode() {}\n    TreeNode(int val) { this.val = val; }\n    TreeNode(int val, TreeNode left, TreeNode right) {\n        this.val = val;\n        this.left = left;\n        this.right = right;\n    }\n}\n\npublic class Solution {\n    public int maxDepth(TreeNode root) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function TreeNode(val, left, right) {\n    this.val = (val===undefined ? 0 : val)\n    this.left = (left===undefined ? null : left)\n    this.right = (right===undefined ? null : right)\n}\n\nfunction maxDepth(root) {\n    // Your code here\n    return 0;\n}",
              python:
                "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef maxDepth(root):\n    # Your code here\n    return 0",
              cpp: "struct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode() : val(0), left(nullptr), right(nullptr) {}\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n};\n\nclass Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: "[3,9,20,null,null,15,7]",
                expected: "3",
                explanation: "Maximum depth is 3",
              },
              {
                input: "[1,null,2]",
                expected: "2",
                explanation: "Maximum depth is 2",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(h)",
          },
        ],
        medium: [
          {
            title: "Binary Tree Level Order Traversal",
            description:
              "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
            examples: [
              {
                input: "root = [3,9,20,null,null,15,7]",
                output: "[[3],[9,20],[15,7]]",
                explanation:
                  "Level order traversal: level 1: [3], level 2: [9,20], level 3: [15,7]",
              },
            ],
            constraints: [
              "The number of nodes in the tree is in the range [0, 2000]",
              "-1000 <= Node.val <= 1000",
            ],
            hints: [
              "Use a queue for BFS traversal",
              "Process nodes level by level",
            ],
            starterCode: {
              java: "public class TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode() {}\n    TreeNode(int val) { this.val = val; }\n    TreeNode(int val, TreeNode left, TreeNode right) {\n        this.val = val;\n        this.left = left;\n        this.right = right;\n    }\n}\n\npublic class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        // Your code here\n        return new ArrayList<>();\n    }\n}",
              javascript:
                "function TreeNode(val, left, right) {\n    this.val = (val===undefined ? 0 : val)\n    this.left = (left===undefined ? null : left)\n    this.right = (right===undefined ? null : right)\n}\n\nfunction levelOrder(root) {\n    // Your code here\n    return [];\n}",
              python:
                "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef levelOrder(root):\n    # Your code here\n    return []",
              cpp: "struct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode() : val(0), left(nullptr), right(nullptr) {}\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}\n};\n\nclass Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        // Your code here\n        return {};\n    }\n};",
            },
            testCases: [
              {
                input: "[3,9,20,null,null,15,7]",
                expected: "[[3],[9,20],[15,7]]",
                explanation: "Level order traversal",
              },
              { input: "[1]", expected: "[[1]]", explanation: "Single node" },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
          },
        ],
        hard: [
          {
            title: "Serialize and Deserialize Binary Tree",
            description:
              "Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.",
            examples: [
              {
                input: "root = [1,2,3,null,null,4,5]",
                output: "[1,2,3,null,null,4,5]",
                explanation:
                  "Serialize and deserialize should return the same tree",
              },
            ],
            constraints: [
              "The number of nodes in the tree is in the range [0, 10^4]",
              "-1000 <= Node.val <= 1000",
            ],
            hints: [
              "Use preorder traversal for serialization",
              "Use recursion for deserialization",
            ],
            starterCode: {
              java: 'public class TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode(int x) { val = x; }\n}\n\npublic class Codec {\n    public String serialize(TreeNode root) {\n        // Your code here\n        return "";\n    }\n    \n    public TreeNode deserialize(String data) {\n        // Your code here\n        return null;\n    }\n}',
              javascript:
                'function TreeNode(val) {\n    this.val = val;\n    this.left = this.right = null;\n}\n\nfunction serialize(root) {\n    // Your code here\n    return "";\n}\n\nfunction deserialize(data) {\n    // Your code here\n    return null;\n}',
              python:
                'class TreeNode(object):\n    def __init__(self, x):\n        self.val = x\n        self.left = None\n        self.right = None\n\ndef serialize(root):\n    # Your code here\n    return ""\n\ndef deserialize(data):\n    # Your code here\n    return None',
              cpp: 'struct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode(int x) : val(x), left(NULL), right(NULL) {}\n};\n\nclass Codec {\npublic:\n    string serialize(TreeNode* root) {\n        // Your code here\n        return "";\n    }\n    \n    TreeNode* deserialize(string data) {\n        // Your code here\n        return nullptr;\n    }\n};',
            },
            testCases: [
              {
                input: "[1,2,3,null,null,4,5]",
                expected: "[1,2,3,null,null,4,5]",
                explanation: "Serialize and deserialize",
              },
              { input: "[]", expected: "[]", explanation: "Empty tree" },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(n)",
          },
        ],
      },
      graphs: {
        easy: [
          {
            title: "Number of Islands",
            description:
              "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
            examples: [
              {
                input:
                  "grid = [['1','1','1','1','0'],['1','1','0','1','0'],['1','1','0','0','0'],['0','0','0','0','0']]",
                output: "1",
                explanation: "There is one island in the grid",
              },
            ],
            constraints: [
              "m == grid.length",
              "n == grid[i].length",
              "1 <= m, n <= 300",
              "grid[i][j] is '0' or '1'",
            ],
            hints: [
              "Use DFS or BFS to explore connected land cells",
              "Mark visited cells to avoid counting the same island multiple times",
            ],
            starterCode: {
              java: "public class Solution {\n    public int numIslands(char[][] grid) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function numIslands(grid) {\n    // Your code here\n    return 0;\n}",
              python:
                "def numIslands(grid):\n    # Your code here\n    return 0",
              cpp: "class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input:
                  "[['1','1','1','1','0'],['1','1','0','1','0'],['1','1','0','0','0'],['0','0','0','0','0']]",
                expected: "1",
                explanation: "One island",
              },
              {
                input:
                  "[['1','1','0','0','0'],['1','1','0','0','0'],['0','0','1','0','0'],['0','0','0','1','1']]",
                expected: "3",
                explanation: "Three islands",
              },
            ],
            timeComplexity: "O(mn)",
            spaceComplexity: "O(mn)",
          },
        ],
        medium: [
          {
            title: "Course Schedule",
            description:
              "There are a total of numCourses courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where prerequisites[i] = [ai, bi] indicates that you must take course bi first if you want to take course ai. Return true if you can finish all courses. Otherwise, return false.",
            examples: [
              {
                input:
                  "numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]",
                output: "true",
                explanation:
                  "You can finish all courses: 0 -> 1 -> 3, 0 -> 2 -> 3",
              },
            ],
            constraints: [
              "1 <= numCourses <= 2000",
              "0 <= prerequisites.length <= 5000",
              "prerequisites[i].length == 2",
              "0 <= ai, bi < numCourses",
            ],
            hints: [
              "Use topological sorting with DFS or BFS",
              "Detect cycles in the graph",
            ],
            starterCode: {
              java: "public class Solution {\n    public boolean canFinish(int numCourses, int[][] prerequisites) {\n        // Your code here\n        return false;\n    }\n}",
              javascript:
                "function canFinish(numCourses, prerequisites) {\n    // Your code here\n    return false;\n}",
              python:
                "def canFinish(numCourses, prerequisites):\n    # Your code here\n    return False",
              cpp: "class Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        // Your code here\n        return false;\n    }\n};",
            },
            testCases: [
              {
                input: "4, [[1,0],[2,0],[3,1],[3,2]]",
                expected: "true",
                explanation: "Can finish all courses",
              },
              {
                input: "2, [[1,0],[0,1]]",
                expected: "false",
                explanation: "Cycle detected",
              },
            ],
            timeComplexity: "O(V + E)",
            spaceComplexity: "O(V + E)",
          },
        ],
        hard: [
          {
            title: "Word Ladder",
            description:
              "A transformation sequence from word beginWord to word endWord using a dictionary wordList is a sequence of words beginWord -> s1 -> s2 -> ... -> sk such that: Every adjacent pair of words differs by a single letter, and every si for 1 <= i <= k is in wordList. Given two words, beginWord and endWord, and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, or 0 if no such sequence exists.",
            examples: [
              {
                input:
                  'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
                output: "5",
                explanation: "hit -> hot -> dot -> dog -> cog",
              },
            ],
            constraints: [
              "1 <= beginWord.length <= 10",
              "endWord.length == beginWord.length",
              "1 <= wordList.length <= 5000",
              "wordList[i].length == beginWord.length",
            ],
            hints: [
              "Use BFS to find the shortest path",
              "Generate all possible one-letter transformations",
            ],
            starterCode: {
              java: "public class Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function ladderLength(beginWord, endWord, wordList) {\n    // Your code here\n    return 0;\n}",
              python:
                "def ladderLength(beginWord, endWord, wordList):\n    # Your code here\n    return 0",
              cpp: "class Solution {\npublic:\n    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: '"hit", "cog", ["hot","dot","dog","lot","log","cog"]',
                expected: "5",
                explanation: "Shortest path length",
              },
              {
                input: '"hit", "cog", ["hot","dot","dog","lot","log"]',
                expected: "0",
                explanation: "No valid path",
              },
            ],
            timeComplexity: "O(N * L * 26)",
            spaceComplexity: "O(N)",
          },
        ],
      },
      dynamic: {
        easy: [
          {
            title: "Climbing Stairs",
            description:
              "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
            examples: [
              {
                input: "n = 3",
                output: "3",
                explanation:
                  "There are three ways to climb to the top: 1 + 1 + 1, 1 + 2, 2 + 1",
              },
            ],
            constraints: ["1 <= n <= 45"],
            hints: ["Use dynamic programming", "f(n) = f(n-1) + f(n-2)"],
            starterCode: {
              java: "public class Solution {\n    public int climbStairs(int n) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function climbStairs(n) {\n    // Your code here\n    return 0;\n}",
              python:
                "def climbStairs(n):\n    // Your code here\n    return 0",
              cpp: "class Solution {\npublic:\n    int climbStairs(int n) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              { input: "3", expected: "3", explanation: "3 ways to climb" },
              { input: "2", expected: "2", explanation: "2 ways to climb" },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
          },
        ],
        medium: [
          {
            title: "House Robber",
            description:
              "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed, the only constraint stopping you from robbing each of them is that adjacent houses have security systems connected and it will automatically contact the police if two adjacent houses were broken into on the same night. Given an integer array nums representing the amount of money of each house, return the maximum amount of money you can rob tonight without alerting the police.",
            examples: [
              {
                input: "nums = [1,2,3,1]",
                output: "4",
                explanation:
                  "Rob house 1 (money = 1) and then rob house 3 (money = 3). Total amount you can rob = 1 + 3 = 4.",
              },
            ],
            constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
            hints: [
              "Use dynamic programming",
              "At each house, choose to rob or skip based on previous decisions",
            ],
            starterCode: {
              java: "public class Solution {\n    public int rob(int[] nums) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function rob(nums) {\n    // Your code here\n    return 0;\n}",
              python: "def rob(nums):\n    // Your code here\n    return 0",
              cpp: "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: "[1,2,3,1]",
                expected: "4",
                explanation: "Rob houses 1 and 3",
              },
              {
                input: "[2,7,9,3,1]",
                expected: "12",
                explanation: "Rob houses 2, 9, and 1",
              },
            ],
            timeComplexity: "O(n)",
            spaceComplexity: "O(1)",
          },
        ],
        hard: [
          {
            title: "Edit Distance",
            description:
              "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have the following three operations permitted on a word: Insert a character, Delete a character, Replace a character.",
            examples: [
              {
                input: 'word1 = "horse", word2 = "ros"',
                output: "3",
                explanation:
                  "horse → rorse (replace 'h' with 'r'), rorse → rose (remove 'r'), rose → ros (remove 'e')",
              },
            ],
            constraints: [
              "0 <= word1.length, word2.length <= 500",
              "word1 and word2 consist of lowercase English letters",
            ],
            hints: [
              "Use 2D dynamic programming",
              "dp[i][j] = minimum operations to convert word1[0...i-1] to word2[0...j-1]",
            ],
            starterCode: {
              java: "public class Solution {\n    public int minDistance(String word1, String word2) {\n        // Your code here\n        return 0;\n    }\n}",
              javascript:
                "function minDistance(word1, word2) {\n    // Your code here\n    return 0;\n}",
              python:
                "def minDistance(word1, word2):\n    // Your code here\n    return 0",
              cpp: "class Solution {\npublic:\n    int minDistance(string word1, string word2) {\n        // Your code here\n        return 0;\n    }\n};",
            },
            testCases: [
              {
                input: '"horse", "ros"',
                expected: "3",
                explanation: "3 operations needed",
              },
              {
                input: '"intention", "execution"',
                expected: "5",
                explanation: "5 operations needed",
              },
            ],
            timeComplexity: "O(mn)",
            spaceComplexity: "O(mn)",
          },
        ],
      },
    };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async evaluateCode(data) {
    const { code, question, language, userId } = data;

    if (!this.interviewContexts.has(userId)) {
      throw new Error("Interview context not found");
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
  "interviewerComment": "Good solution! Your approach is correct and efficient.",
  "personalizedFeedback": "Based on your performance, here's what you should focus on next..."
}`;

    try {
      const responseText = await this.generateContentWithFallback(prompt);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in evaluation response");
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      // Add to context
      context.userResponses.push({
        question: question.title,
        code,
        language,
        evaluation,
        timestamp: new Date(),
      });

      // Update user performance tracking
      this.updateUserPerformance(userId, question, evaluation);

      return evaluation;
    } catch (error) {
      console.error("Code evaluation error:", error);
      // For evaluation errors, we'll use fallback but don't retry since it's not critical
      const defaultEvaluation = this.getDefaultEvaluation();

      // Still update performance even with fallback evaluation
      this.updateUserPerformance(userId, question, defaultEvaluation);

      return defaultEvaluation;
    }
  }

  async processChatMessage(data) {
    const { message, userId } = data;

    if (!this.interviewContexts.has(userId)) {
      throw new Error("Interview context not found");
    }

    const context = this.interviewContexts.get(userId);
    const currentQuestion =
      context.questionsAsked[context.questionsAsked.length - 1];

    const prompt = `You are conducting a technical interview. The candidate said: "${message}"

Current context:
- Phase: ${context.currentPhase}
- Current question: ${currentQuestion?.title || "None"}
- Difficulty: ${context.difficulty}
- Topic: ${context.topic}

Respond as a helpful interviewer. Provide guidance, hints, or ask follow-up questions. Keep response under 100 words and be encouraging.`;

    try {
      const response = await this.generateContentWithFallback(prompt);

      return {
        message: response,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Chat processing error:", error);
      return {
        message:
          "I understand. Can you tell me more about your approach to this problem?",
        timestamp: new Date(),
      };
    }
  }

  async processVoiceInput(data) {
    const { transcript, userId } = data;

    // Process the voice input as a chat message
    const response = await this.processChatMessage({
      message: transcript,
      userId,
    });

    return {
      transcription: transcript,
      aiResponse: response.message,
      timestamp: new Date(),
    };
  }

  async generateInterviewSummary(data) {
    const { userId, performance } = data;

    if (!this.interviewContexts.has(userId)) {
      throw new Error("Interview context not found");
    }

    const context = this.interviewContexts.get(userId);
    const duration = Math.floor((new Date() - context.startTime) / 1000 / 60);

    const prompt = `Generate an interview summary for a ${
      context.difficulty
    } level ${context.topic} interview.

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
      const responseText = await this.generateContentWithFallback(prompt);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in summary response");
      }

      const summary = JSON.parse(jsonMatch[0]);

      // Clean up context
      this.interviewContexts.delete(userId);

      return summary;
    } catch (error) {
      console.error("Summary generation error:", error);
      return this.getDefaultSummary();
    }
  }

  getDefaultQuestion(difficulty, topic) {
    return {
      id: `default_${Date.now()}`,
      title: "Two Sum",
      description:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      difficulty: difficulty,
      topic: topic,
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]",
        },
      ],
      constraints: [
        "2 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "-10^9 <= target <= 10^9",
      ],
      hints: [
        "Try using a hash map to store numbers you've seen",
        "For each number, check if target - number exists in the map",
      ],
      starterCode: {
        java: "public class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n        return new int[0];\n    }\n}",
        javascript:
          "function twoSum(nums, target) {\n    // Your code here\n    return [];\n}",
        python:
          "def twoSum(nums, target):\n    // Your code here\n    return []",
        cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n        return {};\n    }\n};",
      },
      testCases: [
        {
          input: "[2,7,11,15], 9",
          expected: "[0,1]",
          explanation: "2 + 7 = 9",
        },
        { input: "[3,2,4], 6", expected: "[1,2]", explanation: "2 + 4 = 6" },
      ],
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
    };
  }

  getDefaultEvaluation() {
    return {
      scores: {
        correctness: 70,
        efficiency: 60,
        codeQuality: 75,
        problemSolving: 65,
        overall: 67,
      },
      feedback: {
        strengths: ["Good attempt at solving the problem"],
        improvements: ["Consider optimizing the solution", "Add more comments"],
      },
      testResults: [
        {
          input: "test1",
          expected: "result1",
          actual: "result1",
          passed: true,
          executionTime: "5ms",
        },
        {
          input: "test2",
          expected: "result2",
          actual: "wrong",
          passed: false,
          executionTime: "3ms",
        },
      ],
      complexityAnalysis: {
        timeComplexity: "O(n²)",
        spaceComplexity: "O(1)",
        explanation: "Nested loops create quadratic time complexity",
      },
      interviewerComment:
        "Good effort! Try to optimize your solution for better time complexity.",
    };
  }

  getDefaultSummary() {
    return {
      overallScore: 75,
      breakdown: {
        problemSolving: 70,
        codeQuality: 75,
        communication: 80,
        timeManagement: 70,
      },
      feedback: {
        strengths: ["Good problem-solving approach", "Clear communication"],
        improvements: ["Optimize solutions", "Consider edge cases"],
        suggestions: [
          "Practice more coding problems",
          "Work on algorithm optimization",
        ],
      },
      recommendation:
        "Good performance! Keep practicing to improve your skills.",
    };
  }
}

export default AIService;
