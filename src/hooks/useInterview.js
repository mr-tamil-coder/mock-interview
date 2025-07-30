import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.js';
import socketService from '../services/socketService.js';
import voiceService from '../services/voiceService.js';

export const useInterview = () => {
  const [currentInterview, setCurrentInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to socket when component mounts
    socketService.connect();

    // Set up socket event listeners
    socketService.on('ai-response', handleAiResponse);
    socketService.on('ai-voice-response', handleAiVoiceResponse);
    socketService.on('ai-chat-response', handleAiChatResponse);
    socketService.on('code-evaluation', handleCodeEvaluation);
    socketService.on('interview-summary', handleInterviewSummary);
    socketService.on('error', handleSocketError);

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleAiResponse = useCallback((data) => {
    if (data.type === 'start') {
      addChatMessage('ai', data.message);
      if (data.question) {
        setQuestions([data.question]);
        setCurrentQuestionIndex(0);
      }
      if (data.audio) {
        playAiAudio(data.audio);
      }
    }
  }, []);

  const handleAiVoiceResponse = useCallback((data) => {
    addChatMessage('user', data.transcription);
    addChatMessage('ai', data.aiResponse);
    if (data.audio) {
      playAiAudio(data.audio);
    }
  }, []);

  const handleAiChatResponse = useCallback((data) => {
    addChatMessage('ai', data.message);
    if (data.audio) {
      playAiAudio(data.audio);
    }
  }, []);

  const handleCodeEvaluation = useCallback((evaluation) => {
    // Update current question with evaluation results
    setQuestions(prev => prev.map((q, index) => 
      index === currentQuestionIndex 
        ? { ...q, evaluation, userCode: code }
        : q
    ));

    // Add evaluation feedback to chat
    const feedback = `Code evaluation complete! Score: ${evaluation.correctness}/100. ${evaluation.feedback}`;
    addChatMessage('ai', feedback);
  }, [currentQuestionIndex, code]);

  const handleInterviewSummary = useCallback((summary) => {
    setCurrentInterview(prev => ({
      ...prev,
      summary,
      status: 'completed'
    }));
  }, []);

  const handleSocketError = useCallback((error) => {
    setError(error.message);
    console.error('Socket error:', error);
  }, []);

  const startInterview = async (interviewData) => {
    try {
      setLoading(true);
      setError(null);

      // Create interview record
      const response = await apiService.createInterview(interviewData);
      const interview = response.interview;
      
      setCurrentInterview(interview);
      setChatMessages([]);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setCode('');

      // Join interview room
      socketService.joinInterview(interview._id);

      // Start AI interview
      socketService.startInterview({
        interviewId: interview._id,
        userProfile: {
          name: 'Candidate',
          experience: 'Mid-level',
          previousInterviews: 0
        },
        ...interviewData
      });

      return { success: true, interview };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to start interview';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (!currentInterview || !questions[currentQuestionIndex]) return;

    try {
      setLoading(true);
      
      socketService.submitCode({
        interviewId: currentInterview._id,
        questionId: questions[currentQuestionIndex].id,
        code,
        language: 'javascript'
      });

    } catch (error) {
      setError('Failed to submit code');
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setCode('');
    } else {
      // Generate new question
      try {
        const response = await apiService.generateQuestion({
          difficulty: currentInterview.difficulty,
          topic: currentInterview.topic,
          previousQuestions: questions.map(q => q.id)
        });

        if (response.success) {
          setQuestions(prev => [...prev, response.question]);
          setCurrentQuestionIndex(questions.length);
          setCode('');
        }
      } catch (error) {
        setError('Failed to generate next question');
      }
    }
  };

  const startVoiceRecording = async () => {
    try {
      const started = await voiceService.startRecording();
      if (started) {
        setIsRecording(true);
      }
    } catch (error) {
      setError('Failed to start voice recording');
    }
  };

  const stopVoiceRecording = async () => {
    try {
      const audioBlob = await voiceService.stopRecording();
      setIsRecording(false);

      // Send audio to AI for processing
      socketService.sendVoiceInput(await voiceService.blobToBase64(audioBlob));
    } catch (error) {
      setError('Failed to process voice input');
      setIsRecording(false);
    }
  };

  const sendChatMessage = (message) => {
    if (!currentInterview) return;

    addChatMessage('user', message);
    
    socketService.sendChatMessage({
      interviewId: currentInterview._id,
      message,
      context: {
        currentQuestion: questions[currentQuestionIndex],
        code
      }
    });
  };

  const endInterview = async () => {
    if (!currentInterview) return;

    try {
      setLoading(true);

      const performance = {
        questionsAttempted: questions.length,
        questionsCompleted: questions.filter(q => q.evaluation?.correctness > 70).length,
        averageScore: questions.reduce((acc, q) => acc + (q.evaluation?.correctness || 0), 0) / questions.length,
        totalTimeSpent: Date.now() - new Date(currentInterview.createdAt).getTime()
      };

      // Generate AI summary
      socketService.endInterview({
        interviewId: currentInterview._id,
        performance,
        duration: Math.floor(performance.totalTimeSpent / 1000 / 60) // minutes
      });

      // Update interview status
      await apiService.completeInterview(currentInterview._id, {
        scores: {
          overall: performance.averageScore,
          problemSolving: performance.averageScore,
          codeQuality: 85, // Mock data
          communication: 80, // Mock data
          timeManagement: 75 // Mock data
        },
        feedback: {
          strengths: ['Good problem-solving approach', 'Clear communication'],
          improvements: ['Consider edge cases', 'Optimize time complexity'],
          suggestions: ['Practice more dynamic programming problems']
        },
        duration: performance.totalTimeSpent / 1000
      });

    } catch (error) {
      setError('Failed to end interview');
    } finally {
      setLoading(false);
    }
  };

  const addChatMessage = (sender, message) => {
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      message,
      timestamp: new Date()
    }]);
  };

  const playAiAudio = async (audioData) => {
    try {
      setAiSpeaking(true);
      await voiceService.playAudio(audioData);
    } catch (error) {
      console.error('Failed to play AI audio:', error);
    } finally {
      setAiSpeaking(false);
    }
  };

  return {
    // State
    currentInterview,
    questions,
    currentQuestion: questions[currentQuestionIndex],
    currentQuestionIndex,
    code,
    setCode,
    isRecording,
    chatMessages,
    aiSpeaking,
    loading,
    error,

    // Actions
    startInterview,
    submitCode,
    nextQuestion,
    startVoiceRecording,
    stopVoiceRecording,
    sendChatMessage,
    endInterview,

    // Utilities
    hasNextQuestion: currentQuestionIndex < questions.length - 1,
    canSubmitCode: code.trim().length > 0,
    isInterviewActive: currentInterview?.status === 'in-progress'
  };
};