import { useState, useEffect, useCallback } from 'react';
import vapiService from '../services/vapiService';

export const useVapiVoice = (interviewContext) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    // Initialize Vapi service
    const initializeVapi = async () => {
      const initialized = await vapiService.initialize();
      setIsConnected(initialized);
      if (!initialized) {
        setError('Failed to initialize voice service');
      }
    };

    initializeVapi();

    // Set up event listeners
    vapiService.on('call-start', () => {
      setIsCallActive(true);
      setError(null);
    });

    vapiService.on('call-end', () => {
      setIsCallActive(false);
      setCurrentTranscript('');
    });

    vapiService.on('speech-start', () => {
      setAiSpeaking(false);
    });

    vapiService.on('speech-end', () => {
      // User finished speaking
    });

    vapiService.on('transcript', (transcript) => {
      setCurrentTranscript(transcript.text);
      
      // Add to conversation history
      if (transcript.role === 'user') {
        setConversationHistory(prev => [...prev, {
          id: Date.now(),
          role: 'user',
          content: transcript.text,
          timestamp: new Date()
        }]);
      }
    });

    vapiService.on('message', (message) => {
      setAiSpeaking(true);
      
      // Add AI response to conversation history
      setConversationHistory(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: message.content || message.text,
        timestamp: new Date()
      }]);

      // Stop speaking indicator after a delay
      setTimeout(() => {
        setAiSpeaking(false);
      }, 2000);
    });

    vapiService.on('error', (error) => {
      setError(error.message || 'Voice service error');
      setIsCallActive(false);
      setAiSpeaking(false);
    });

    return () => {
      vapiService.cleanup();
    };
  }, []);

  // Start voice interview
  const startVoiceInterview = useCallback(async () => {
    if (!isConnected) {
      setError('Voice service not connected');
      return false;
    }

    try {
      setError(null);
      
      // Create interview-specific assistant configuration
      const assistantConfig = {
        model: {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are conducting a ${interviewContext?.difficulty || 'medium'} level DSA interview focusing on ${interviewContext?.topic || 'arrays'}.

Your responsibilities:
1. Present coding problems clearly and concisely
2. Guide the candidate through problem-solving without giving direct answers
3. Ask about time and space complexity
4. Provide hints when the candidate is stuck
5. Encourage good coding practices
6. Give constructive feedback

Keep responses under 100 words and maintain an encouraging, professional tone.`
            }
          ]
        },
        voice: {
          provider: 'playht',
          voiceId: 'jennifer'
        },
        firstMessage: `Hello! I'm your AI interviewer. Today we'll work on ${interviewContext?.difficulty || 'medium'} level ${interviewContext?.topic || 'array'} problems. I'll present problems, and you can explain your approach. Ready to start with our first coding challenge?`
      };

      const success = await vapiService.startCall(assistantConfig);
      return success;
    } catch (error) {
      setError('Failed to start voice interview');
      return false;
    }
  }, [isConnected, interviewContext]);

  // End voice interview
  const endVoiceInterview = useCallback(async () => {
    try {
      const success = await vapiService.endCall();
      return success;
    } catch (error) {
      setError('Failed to end voice interview');
      return false;
    }
  }, []);

  // Send message during interview
  const sendVoiceMessage = useCallback(async (message) => {
    try {
      const success = await vapiService.sendMessage(message);
      return success;
    } catch (error) {
      setError('Failed to send message');
      return false;
    }
  }, []);

  // Toggle voice interview
  const toggleVoiceInterview = useCallback(async () => {
    if (isCallActive) {
      return await endVoiceInterview();
    } else {
      return await startVoiceInterview();
    }
  }, [isCallActive, startVoiceInterview, endVoiceInterview]);

  return {
    // State
    isCallActive,
    isConnected,
    currentTranscript,
    aiSpeaking,
    error,
    conversationHistory,

    // Actions
    startVoiceInterview,
    endVoiceInterview,
    sendVoiceMessage,
    toggleVoiceInterview,

    // Utilities
    clearError: () => setError(null),
    isVoiceSupported: isConnected
  };
};