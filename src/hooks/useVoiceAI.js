import { useState, useEffect, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import voiceAI from '../services/voiceAI';

export const useVoiceAI = (interviewContext) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [error, setError] = useState(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  useEffect(() => {
    setVoiceSupported(browserSupportsSpeechRecognition);
    if (!browserSupportsSpeechRecognition) {
      setError('Speech recognition not supported in this browser');
    }
  }, [browserSupportsSpeechRecognition]);

  // Start voice interaction
  const startListening = useCallback(async () => {
    if (!voiceSupported) {
      setError('Voice recognition not supported');
      return false;
    }

    try {
      setError(null);
      resetTranscript();
      
      const started = await voiceAI.startListening();
      if (started) {
        setIsListening(true);
        return true;
      }
      return false;
    } catch (error) {
      setError('Failed to start voice recognition');
      console.error('Voice start error:', error);
      return false;
    }
  }, [voiceSupported, resetTranscript]);

  // Stop listening and process input
  const stopListening = useCallback(async () => {
    if (!isListening) return;

    try {
      voiceAI.stopListening();
      setIsListening(false);

      if (transcript.trim()) {
        setIsSpeaking(true);
        
        // Process the voice input with AI
        const result = await voiceAI.processVoiceInput(transcript, interviewContext);
        
        // Add to conversation history
        setConversationHistory(prev => [...prev, {
          id: Date.now(),
          userInput: result.transcript,
          aiResponse: result.aiResponse,
          timestamp: new Date()
        }]);

        setIsSpeaking(false);
        resetTranscript();
        
        return result;
      }
    } catch (error) {
      setError('Failed to process voice input');
      console.error('Voice processing error:', error);
      setIsSpeaking(false);
    }
  }, [isListening, transcript, interviewContext, resetTranscript]);

  // Toggle voice interaction
  const toggleVoiceInteraction = useCallback(async () => {
    if (isSpeaking) {
      voiceAI.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }, [isListening, isSpeaking, startListening, stopListening]);

  // Speak AI message
  const speakMessage = useCallback(async (message, options = {}) => {
    if (isSpeaking) {
      voiceAI.stopSpeaking();
    }

    try {
      setIsSpeaking(true);
      await voiceAI.speak(message, options);
      setIsSpeaking(false);
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  // Stop current speech
  const stopSpeaking = useCallback(() => {
    voiceAI.stopSpeaking();
    setIsSpeaking(false);
  }, []);

  // Get communication analysis
  const getCommunicationAnalysis = useCallback(() => {
    return voiceAI.analyzeCommunicationSkills();
  }, []);

  // Generate interview summary with voice analysis
  const generateVoiceSummary = useCallback((interviewData) => {
    return voiceAI.generateInterviewSummary(interviewData);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceAI.cleanup();
    };
  }, []);

  return {
    // State
    isListening,
    isSpeaking,
    voiceSupported,
    transcript,
    conversationHistory,
    error,

    // Actions
    startListening,
    stopListening,
    toggleVoiceInteraction,
    speakMessage,
    stopSpeaking,

    // Analysis
    getCommunicationAnalysis,
    generateVoiceSummary,

    // Utilities
    resetTranscript,
    clearError: () => setError(null)
  };
};