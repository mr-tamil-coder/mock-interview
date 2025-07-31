import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Headphones } from 'lucide-react';
import { useVoiceAI } from '../hooks/useVoiceAI';

function VoiceAIInterface({ interviewContext, onVoiceInteraction }) {
  const {
    isListening,
    isSpeaking,
    voiceSupported,
    transcript,
    conversationHistory,
    error,
    toggleVoiceInteraction,
    speakMessage,
    stopSpeaking,
    getCommunicationAnalysis,
    clearError
  } = useVoiceAI(interviewContext);

  const [showTranscript, setShowTranscript] = useState(false);
  const [communicationScore, setCommunicationScore] = useState(null);

  // Update parent component when voice interaction occurs
  useEffect(() => {
    if (conversationHistory.length > 0) {
      const latest = conversationHistory[conversationHistory.length - 1];
      onVoiceInteraction?.(latest);
    }
  }, [conversationHistory, onVoiceInteraction]);

  // Update communication score periodically
  useEffect(() => {
    if (conversationHistory.length > 0) {
      const analysis = getCommunicationAnalysis();
      setCommunicationScore(analysis);
    }
  }, [conversationHistory, getCommunicationAnalysis]);

  // Auto-speak AI introduction when interview starts
  useEffect(() => {
    if (interviewContext?.phase === 'introduction' && voiceSupported) {
      const introMessage = `Hello! I'm your AI interviewer today. I'm excited to work with you on some data structures and algorithms problems. Are you ready to begin?`;
      speakMessage(introMessage);
    }
  }, [interviewContext?.phase, voiceSupported, speakMessage]);

  if (!voiceSupported) {
    return (
      <div className="voice-ai-interface">
        <div className="voice-error">
          <VolumeX size={24} />
          <p>Voice features not supported in this browser</p>
          <small>Please use Chrome, Edge, or Safari for voice interaction</small>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-ai-interface">
      {/* Voice Controls */}
      <div className="voice-controls-panel">
        <div className="voice-status">
          {isSpeaking && (
            <div className="ai-speaking-indicator">
              <Volume2 size={20} />
              <span>AI is speaking...</span>
              <div className="speaking-animation">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
          )}
          
          {isListening && (
            <div className="listening-indicator">
              <Mic size={20} />
              <span>Listening...</span>
              <div className="listening-pulse"></div>
            </div>
          )}
          
          {!isListening && !isSpeaking && (
            <div className="voice-ready">
              <Headphones size={20} />
              <span>Ready for voice interaction</span>
            </div>
          )}
        </div>

        <div className="voice-actions">
          <button
            className={`voice-btn primary ${isListening ? 'listening' : ''} ${isSpeaking ? 'disabled' : ''}`}
            onClick={toggleVoiceInteraction}
            disabled={isSpeaking}
            title={isListening ? 'Stop listening' : 'Start voice interaction'}
          >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            <span>{isListening ? 'Stop' : 'Talk to AI'}</span>
          </button>

          {isSpeaking && (
            <button
              className="voice-btn secondary"
              onClick={stopSpeaking}
              title="Stop AI speech"
            >
              <VolumeX size={20} />
              <span>Stop AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Transcript */}
      {(isListening || transcript) && (
        <div className="live-transcript">
          <div className="transcript-header">
            <MessageSquare size={16} />
            <span>Live Transcript</span>
          </div>
          <div className="transcript-content">
            {transcript || 'Start speaking...'}
          </div>
        </div>
      )}

      {/* Communication Score */}
      {communicationScore && (
        <div className="communication-score">
          <h4>Communication Analysis</h4>
          <div className="score-grid">
            <div className="score-item">
              <span className="score-label">Clarity</span>
              <div className="score-bar">
                <div 
                  className="score-fill" 
                  style={{ width: `${communicationScore.clarity}%` }}
                ></div>
              </div>
              <span className="score-value">{Math.round(communicationScore.clarity)}%</span>
            </div>
            <div className="score-item">
              <span className="score-label">Technical</span>
              <div className="score-bar">
                <div 
                  className="score-fill" 
                  style={{ width: `${communicationScore.technicalCommunication}%` }}
                ></div>
              </div>
              <span className="score-value">{Math.round(communicationScore.technicalCommunication)}%</span>
            </div>
            <div className="score-item">
              <span className="score-label">Confidence</span>
              <div className="score-bar">
                <div 
                  className="score-fill" 
                  style={{ width: `${communicationScore.confidence}%` }}
                ></div>
              </div>
              <span className="score-value">{Math.round(communicationScore.confidence)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Conversation History Toggle */}
      {conversationHistory.length > 0 && (
        <div className="conversation-toggle">
          <button
            className="btn-link"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            {showTranscript ? 'Hide' : 'Show'} Conversation ({conversationHistory.length})
          </button>
        </div>
      )}

      {/* Conversation History */}
      {showTranscript && (
        <div className="conversation-history">
          <div className="conversation-header">
            <h4>Voice Conversation</h4>
          </div>
          <div className="conversation-messages">
            {conversationHistory.map(item => (
              <div key={item.id} className="conversation-item">
                <div className="user-message">
                  <strong>You:</strong> {item.userInput}
                </div>
                <div className="ai-message">
                  <strong>AI:</strong> {item.aiResponse}
                </div>
                <div className="message-time">
                  {item.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="voice-error">
          <p>{error}</p>
          <button className="btn-link" onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}

      {/* Voice Instructions */}
      <div className="voice-instructions">
        <h4>Voice Interaction Tips</h4>
        <ul>
          <li>Click "Talk to AI" to start voice interaction</li>
          <li>Speak clearly and explain your thought process</li>
          <li>Ask questions if you need clarification</li>
          <li>The AI will provide hints and guidance</li>
          <li>Your communication skills are being analyzed</li>
        </ul>
      </div>
    </div>
  );
}

export default VoiceAIInterface;