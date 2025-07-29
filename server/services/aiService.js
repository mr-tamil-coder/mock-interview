import OpenAI from 'openai';
import textToSpeech from '@google-cloud/text-to-speech';
import speech from '@google-cloud/speech';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.ttsClient = new textToSpeech.TextToSpeechClient();
    this.speechClient = new speech.SpeechClient();
  }

  async startInterview(data) {
    const { difficulty, topic, userProfile } = data;
    
    const prompt = `You are an experienced technical interviewer conducting a ${difficulty} level DSA interview focusing on ${topic}. 
    
    User Profile: ${JSON.stringify(userProfile)}
    
    Start the interview with a warm greeting and present the first coding problem. Be encouraging and professional.
    
    Provide:
    1. A greeting message
    2. The first coding problem with clear description
    3. Ask the candidate to think aloud while solving
    
    Keep the tone conversational and supportive.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a friendly, experienced technical interviewer specializing in data structures and algorithms. You help candidates feel comfortable while maintaining professional standards."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const message = completion.choices[0].message.content;
      const audio = await this.textToSpeech(message);
      const question = await this.generateQuestion(difficulty, topic);

      return {
        message,
        audio,
        question
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw new Error('Failed to start interview');
    }
  }

  async evaluateCode(data) {
    const { code, question, language = 'javascript' } = data;
    
    const prompt = `Evaluate this ${language} code solution for the following problem:

Problem: ${question.title}
Description: ${question.description}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide detailed feedback on:
1. Correctness (0-100)
2. Time complexity
3. Space complexity
4. Code quality (0-100)
5. Specific suggestions for improvement
6. Whether the solution passes test cases

Format as JSON with scores and detailed feedback.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert code reviewer and algorithm specialist. Provide constructive, detailed feedback on coding solutions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      const evaluation = JSON.parse(completion.choices[0].message.content);
      
      // Simulate test case execution
      const testResults = await this.runTestCases(code, question.testCases);
      
      return {
        ...evaluation,
        testResults,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Code evaluation error:', error);
      return {
        correctness: 0,
        codeQuality: 0,
        feedback: 'Unable to evaluate code at this time',
        testResults: []
      };
    }
  }

  async processVoiceInput(audioData) {
    try {
      // Convert audio to text
      const transcription = await this.speechToText(audioData);
      
      // Generate AI response
      const aiResponse = await this.generateVoiceResponse(transcription);
      
      // Convert response to speech
      const audio = await this.textToSpeech(aiResponse);
      
      return {
        transcription,
        response: aiResponse,
        audio
      };
    } catch (error) {
      console.error('Voice processing error:', error);
      throw new Error('Failed to process voice input');
    }
  }

  async processChatMessage(data) {
    const { message, context, interviewState } = data;
    
    const prompt = `As a technical interviewer, respond to this candidate message: "${message}"
    
    Context: ${context}
    Interview State: ${JSON.stringify(interviewState)}
    
    Provide helpful guidance while maintaining the interview flow. Be encouraging and provide hints if the candidate is stuck.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are conducting a technical interview. Be helpful, encouraging, and provide appropriate hints without giving away the solution."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      const response = completion.choices[0].message.content;
      const audio = await this.textToSpeech(response);

      return {
        message: response,
        audio,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Chat processing error:', error);
      throw new Error('Failed to process chat message');
    }
  }

  async generateInterviewSummary(data) {
    const { interview, performance, duration } = data;
    
    const prompt = `Generate a comprehensive interview summary based on this data:
    
    Interview Duration: ${duration} minutes
    Questions Attempted: ${interview.questions.length}
    Performance Data: ${JSON.stringify(performance)}
    
    Provide:
    1. Overall performance score (0-100)
    2. Detailed breakdown by category
    3. Strengths identified
    4. Areas for improvement
    5. Specific recommendations
    6. Next steps for preparation
    
    Format as detailed JSON with scores and narrative feedback.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert technical interviewer providing comprehensive feedback and career guidance."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.5
      });

      const summary = JSON.parse(completion.choices[0].message.content);
      const audio = await this.textToSpeech(summary.overallFeedback || 'Interview completed successfully!');

      return {
        ...summary,
        audio,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Summary generation error:', error);
      throw new Error('Failed to generate interview summary');
    }
  }

  async textToSpeech(text) {
    try {
      const request = {
        input: { text },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-F',
          ssmlGender: 'FEMALE'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0
        }
      };

      const [response] = await this.ttsClient.synthesizeSpeech(request);
      const audioId = uuidv4();
      const audioPath = path.join(process.cwd(), 'uploads', 'audio', `${audioId}.mp3`);
      
      // Ensure directory exists
      const dir = path.dirname(audioPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(audioPath, response.audioContent, 'binary');
      
      return {
        audioId,
        url: `/api/audio/${audioId}.mp3`,
        duration: Math.ceil(text.length / 10) // Rough estimate
      };
    } catch (error) {
      console.error('Text-to-speech error:', error);
      return null;
    }
  }

  async speechToText(audioData) {
    try {
      const request = {
        audio: {
          content: audioData
        },
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true
        }
      };

      const [response] = await this.speechClient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      return transcription;
    } catch (error) {
      console.error('Speech-to-text error:', error);
      return 'Unable to transcribe audio';
    }
  }

  async generateQuestion(difficulty, topic) {
    const prompt = `Generate a ${difficulty} level coding question about ${topic}.
    
    Provide:
    1. Problem title
    2. Clear description
    3. Input/output examples
    4. Constraints
    5. 3 helpful hints
    6. Test cases
    
    Format as JSON.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating coding interview questions. Generate clear, well-structured problems."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.7
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Question generation error:', error);
      return this.getDefaultQuestion(difficulty, topic);
    }
  }

  async generateVoiceResponse(transcription) {
    const prompt = `The candidate said: "${transcription}"
    
    As their interviewer, provide an appropriate response. Be encouraging and helpful while maintaining the interview flow.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are conducting a voice-based technical interview. Respond naturally and helpfully."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Voice response error:', error);
      return "I understand. Please continue with your solution.";
    }
  }

  async runTestCases(code, testCases) {
    // Simulate test case execution
    // In production, you'd use a secure code execution environment
    return testCases.map((testCase, index) => ({
      id: index + 1,
      input: testCase.input,
      expected: testCase.expectedOutput,
      actual: testCase.expectedOutput, // Simulated
      passed: Math.random() > 0.3, // Simulated
      executionTime: Math.floor(Math.random() * 100) + 'ms'
    }));
  }

  getDefaultQuestion(difficulty, topic) {
    return {
      title: "Two Sum",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      examples: [
        {
          input: "nums = [2,7,11,15], target = 9",
          output: "[0,1]",
          explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
        }
      ],
      constraints: [
        "2 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "-10^9 <= target <= 10^9"
      ],
      hints: [
        "Use a hash map to store complements",
        "Think about time complexity",
        "One pass solution is possible"
      ],
      testCases: [
        { input: [[2,7,11,15], 9], expectedOutput: [0,1] },
        { input: [[3,2,4], 6], expectedOutput: [1,2] },
        { input: [[3,3], 6], expectedOutput: [0,1] }
      ]
    };
  }
}

export default AIService;