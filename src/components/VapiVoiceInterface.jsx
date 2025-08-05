import { useState, useEffect } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Volume2, MessageSquare } from 'lucide-react';
import { useVapiVoice } from '../hooks/useVapiVoice';

function VapiVoiceInterface({ interviewContext, onVoiceInteraction }) {
  const {
    isCallActive,
    isConnected,
    currentTranscript,
    aiSpeaking,
    error,
    conversationHistory,
    startVoiceInterview,
    endVoiceInterview,
    sendVoiceMessage,
    toggleVoiceInterview,
    clearError,
    isVoiceSupported
  } = useVapiVoice(interviewContext);

  const [showHistory, setShowHistory] = useState(false);

  // Notify parent component of voice interactions
  useEffect(() => {
    if (conversationHistory.length > 0) {
      const latest = conversationHistory[conversationHistory.length - 1];
      onVoiceInteraction?.(latest);
    }
  }, [conversationHistory, onVoiceInteraction]);

  if (!isVoiceSupported) {
    return (
      <div className="vapi-voice-interface">
        <div className="voice-error">
          <Phone size={24} />
          <p>Voice AI service unavailable</p>
          <small>Please check your internet connection and try again</small>
        </div>
      </div>
    );
  }

  return (
    <div className="vapi-voice-interface">
      {/* Voice Status */}
      <div className="voice-status-panel">
        <div className="voice-status">
          {!isConnected && (
            <div className="connecting-status">
              <div className="loading-spinner"></div>
              <span>Connecting to voice AI...</span>
            </div>
          )}

          {isConnected && !isCallActive && (
            <div className="ready-status">
              <Phone size={20} />
              <span>Ready to start voice interview</span>
            </div>
          )}

          {isCallActive && aiSpeaking && (
            <div className="ai-speaking">
              <Volume2 size={20} />
              <span>AI Interviewer is speaking...</span>
              <div className="speaking-animation">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
          )}

          {isCallActive && !aiSpeaking && (
            <div className="listening-status">
              <Mic size={20} />
              <span>Listening... Speak now</span>
              <div className="listening-pulse"></div>
            </div>
          )}
        </div>

        {/* Voice Controls */}
        <div className="voice-controls">
          <button
            className={`voice-btn primary ${isCallActive ? 'active' : ''}`}
            onClick={toggleVoiceInterview}
            disabled={!isConnected}
            title={isCallActive ? 'End voice interview' : 'Start voice interview'}
          >
            {isCallActive ? <PhoneOff size={24} /> : <Phone size={24} />}
            <span>{isCallActive ? 'End Call' : 'Start Voice Interview'}</span>
          </button>
        </div>
      </div>

      {/* Live Transcript */}
      {currentTranscript && (
        <div className="live-transcript">
          <div className="transcript-header">
            <MessageSquare size={16} />
            <span>You said:</span>
          </div>
          <div className="transcript-content">
            "{currentTranscript}"
          </div>
        </div>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="conversation-section">
          <button
            className="conversation-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide' : 'Show'} Conversation ({conversationHistory.length} messages)
          </button>

          {showHistory && (
            <div className="conversation-history">
              <div className="conversation-messages">
                {conversationHistory.map(message => (
                  <div key={message.id} className={`conversation-message ${message.role}`}>
                    <div className="message-content">
                      <div className="message-role">
                        {message.role === 'user' ? 'You' : 'AI Interviewer'}:
                      </div>
                      <div className="message-text">{message.content}</div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Instructions */}
      <div className="voice-instructions">
        <h4>Voice Interview Instructions</h4>
        <ul>
          <li>Click "Start Voice Interview" to begin talking with AI</li>
          <li>Speak clearly and explain your thought process</li>
          <li>The AI will guide you through DSA problems</li>
          <li>Ask questions if you need clarification or hints</li>
          <li>Your communication skills are being evaluated</li>
        </ul>
      </div>
    </div>
  );
}

export default VapiVoiceInterface;