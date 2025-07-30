import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useInterview } from '../hooks/useInterview'
import socketService from '../services/socketService'
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Send,
  Code,
  MessageCircle,
  Clock,
  CheckCircle,
  Monitor,
  MonitorOff
} from 'lucide-react'
import CodeEditor from './CodeEditor'
import InterviewChat from './InterviewChat'
import VoiceControls from './VoiceControls'

function InterviewRoom({ onEndInterview }) {
  const { user } = useAuth()
  const {
    currentInterview,
    currentQuestion,
    currentQuestionIndex,
    questions,
    code,
    setCode,
    isRecording,
    chatMessages,
    aiSpeaking,
    loading,
    error,
    submitCode,
    nextQuestion,
    startVoiceRecording,
    stopVoiceRecording,
    sendChatMessage,
    endInterview,
    hasNextQuestion,
    canSubmitCode,
    isInterviewActive
  } = useInterview()

  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [screenAnalysis, setScreenAnalysis] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const screenStreamRef = useRef(null)

  useEffect(() => {
    startCamera()
    
    // Set current interview for socket service
    if (currentInterview?._id) {
      socketService.setCurrentInterview(currentInterview._id);
    }
    
    // Listen for screen analysis
    socketService.on('screen-analysis', handleScreenAnalysis);
    
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => {
      clearInterval(timer)
      stopCamera()
      stopScreenShare()
      socketService.off('screen-analysis', handleScreenAnalysis);
    }
  }, [])

  const handleScreenAnalysis = (analysis) => {
    setScreenAnalysis(analysis);
    
    if (analysis.suspicious) {
      // Show warning to user
      console.warn('Suspicious activity detected:', analysis.activities);
    }
  };
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      
      // Monitor screen share events
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false);
        socketService.sendScreenShareActivity('screen_share_ended', currentInterview._id);
      });
      
      // Simulate activity monitoring
      const activityInterval = setInterval(() => {
        if (isScreenSharing) {
          const activities = [
            'coding_in_editor',
            'reading_problem',
            'thinking_pause',
            'tab_switch_detected'
          ];
          const randomActivity = activities[Math.floor(Math.random() * activities.length)];
          socketService.sendScreenShareActivity(randomActivity, currentInterview._id);
        } else {
          clearInterval(activityInterval);
        }
      }, 10000); // Check every 10 seconds
      
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      setIsScreenSharing(false);
      socketService.sendScreenShareActivity('screen_share_ended', currentInterview._id);
    }
  };
  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn)
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn
      }
    }
  }

  const toggleMic = () => {
    setIsMicOn(!isMicOn)
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !isMicOn
      }
    }
  }

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };
  const handleVoiceToggle = () => {
    if (isRecording) {
      stopVoiceRecording()
    } else {
      startVoiceRecording()
    }
  }

  const handleEndInterview = async () => {
    await endInterview()
    setShowSummary(true)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (showSummary || currentInterview?.status === 'completed') {
    return (
      <div className="interview-summary">
        <div className="container">
          <div className="summary-card animate-fade-in">
            <div className="summary-header">
              <CheckCircle size={48} className="success-icon" />
              <h1>Interview Completed!</h1>
              <p>Great job! Here's your performance summary.</p>
            </div>

            <div className="summary-stats">
              <div className="summary-stat">
                <span className="stat-number">{Math.round(currentInterview?.scores?.overall || 0)}%</span>
                <span className="stat-label">Overall Score</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number">{formatTime(timeElapsed)}</span>
                <span className="stat-label">Duration</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number">{questions.filter(q => q.evaluation?.correctness > 70).length}/{questions.length}</span>
                <span className="stat-label">Problems Solved</span>
              </div>
            </div>

            <div className="summary-feedback">
              <h3>AI Feedback</h3>
              <div className="feedback-points">
                {currentInterview?.feedback?.strengths?.map((strength, index) => (
                  <div key={index} className="feedback-point positive">
                    <CheckCircle size={16} />
                    <span>{strength}</span>
                  </div>
                ))}
                {currentInterview?.feedback?.improvements?.map((improvement, index) => (
                  <div key={index} className="feedback-point improvement">
                    <span>{improvement}</span>
                  </div>
                ))}
              </div>
              
              {screenAnalysis && (
                <div className="screen-analysis">
                  <h4>Screen Activity Analysis</h4>
                  <p>Your screen activity was monitored for interview integrity.</p>
                  {screenAnalysis.suspicious && (
                    <div className="warning">
                      <p>⚠️ Some activities may need attention in future interviews.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="summary-actions">
              <button className="btn btn-primary" onClick={onEndInterview}>
                Back to Dashboard
              </button>
              <button className="btn btn-secondary">
                Download Report
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentInterview || !currentQuestion) {
    return (
      <div className="interview-loading">
        <div className="container">
          <div className="loading-message">
            <h2>Preparing your interview...</h2>
            <p>Our AI interviewer is getting ready to meet you!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="interview-room">
      <div className="interview-header">
        <div className="interview-info">
          <h2>{currentInterview.type.toUpperCase()} Interview Session</h2>
          <div className="interview-meta">
            <span className="timer">
              <Clock size={16} />
              {formatTime(timeElapsed)}
            </span>
            <span className="question-counter">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="difficulty-badge">
              {currentInterview.difficulty.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="interview-controls">
          <button 
            className={`control-btn ${isCameraOn ? 'active' : 'inactive'}`}
            onClick={toggleCamera}
          >
            {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>
          <button 
            className={`control-btn ${isMicOn ? 'active' : 'inactive'}`}
            onClick={toggleMic}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button 
            className={`control-btn ${isScreenSharing ? 'active' : 'inactive'}`}
            onClick={toggleScreenShare}
            title="Toggle Screen Share"
          >
            {isScreenSharing ? <Monitor size={20} /> : <MonitorOff size={20} />}
            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
          </button>
          <button 
            className={`control-btn ${isRecording ? 'recording' : ''} ${aiSpeaking ? 'disabled' : ''}`}
            onClick={handleVoiceToggle}
            disabled={aiSpeaking}
          >
            {isRecording ? <Square size={20} /> : <Play size={20} />}
            {isRecording ? 'Stop' : 'Record'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      {screenAnalysis?.suspicious && (
        <div className="warning-banner">
          <p>⚠️ Please focus on the interview. Avoid switching tabs or external resources.</p>
        </div>
      )}
      <div className="interview-content">
        <div className="video-section">
          <div className="video-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              className={`interview-video ${!isCameraOn ? 'hidden' : ''}`}
            />
            {!isCameraOn && (
              <div className="video-placeholder">
                <CameraOff size={48} />
                <span>Camera Off</span>
              </div>
            )}
          </div>
          
          <div className="ai-avatar">
            <div className="avatar-container">
              <div className="avatar-circle">
                <span>AI</span>
              </div>
              <div className="ai-status">
                <span>{aiSpeaking ? '🗣️ AI Speaking...' : '👂 AI Listening'}</span>
              </div>
              <div className={`speaking-indicator ${aiSpeaking ? 'active' : ''}`}>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="coding-section">
          <div className="question-panel">
            <div className="question-header">
              <h3>{currentQuestion.title}</h3>
              <span className={`difficulty ${currentQuestion.difficulty?.toLowerCase() || 'medium'}`}>
                {currentQuestion.difficulty || 'Medium'}
              </span>
            </div>
            
            <div className="question-content">
              <p>{currentQuestion.description}</p>
              {currentQuestion.examples && (
              <div className="example">
                <strong>Example:</strong>
                  {currentQuestion.examples.map((example, index) => (
                    <pre key={index}>
                      Input: {example.input}
                      Output: {example.output}
                      {example.explanation && `\nExplanation: ${example.explanation}`}
                    </pre>
                  ))}
              </div>
              )}
              
              {currentQuestion.hints && (
              <div className="hints">
                <strong>Hints:</strong>
                <ul>
                    {currentQuestion.hints.map((hint, index) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              </div>
              )}
            </div>

            <div className="question-actions">
              <button 
                className="btn btn-success" 
                onClick={submitCode}
                disabled={!canSubmitCode || loading}
              >
                {loading ? 'Evaluating...' : 'Submit Code'}
              </button>
              
              {hasNextQuestion && (
                <button 
                  className="btn btn-primary" 
                  onClick={nextQuestion}
                  disabled={loading}
                >
                  Next Question
                </button>
              )}
              
              <button 
                className="btn btn-secondary" 
                onClick={handleEndInterview}
                disabled={loading}
              >
                  Complete Interview
              </button>
            </div>
          </div>

          <CodeEditor 
            code={code}
            onChange={setCode}
            question={currentQuestion}
            evaluation={currentQuestion.evaluation}
            loading={loading}
          />
        </div>

        <InterviewChat 
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          aiSpeaking={aiSpeaking}
        />
      </div>
      
      <VoiceControls 
        isRecording={isRecording}
        aiSpeaking={aiSpeaking}
        onToggleRecording={handleVoiceToggle}
      />
    </div>
  )
}

export default InterviewRoom