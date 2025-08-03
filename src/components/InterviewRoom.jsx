import { useState, useEffect, useRef } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { useAuth } from '../hooks/useAuth'
import { useInterview } from '../hooks/useInterview'
import voiceService from '../services/voiceService'
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Clock,
  CheckCircle,
  Monitor,
  MonitorOff,
  AlertTriangle,
  Play,
  RotateCcw,
  Send,
  MessageCircle
} from 'lucide-react'

function InterviewRoom({ onEndInterview }) {
  const { user } = useAuth()
  const {
    currentInterview,
    currentQuestion,
    questions,
    currentQuestionIndex,
    code,
    setCode,
    isRecording,
    chatMessages,
    aiSpeaking,
    loading,
    error,
    interviewStarted,
    startInterview,
    submitCode,
    nextQuestion,
    startVoiceRecording,
    stopVoiceRecording,
    sendChatMessage,
    endInterview,
    hasNextQuestion,
    canSubmitCode,
    isInterviewActive,
    clearError
  } = useInterview()

  // Camera and screen sharing
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [screenAnalysis, setScreenAnalysis] = useState(null)
  const [suspiciousActivity, setSuspiciousActivity] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [output, setOutput] = useState('')
  const [testResults, setTestResults] = useState([])
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [aiSpeaking, setAiSpeaking] = useState(false)
  
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const screenStreamRef = useRef(null)
  
  // Speech recognition hook
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition()

  useEffect(() => {
    if (!interviewStarted && !loading) {
      initializeInterview()
    }
    startCamera()
    startScreenMonitoring()

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => {
      clearInterval(timer)
      stopCamera()
      stopScreenShare()
      stopScreenMonitoring()
      voiceService.cleanup()
    }
  }, [interviewStarted, loading])

  const initializeInterview = async () => {
    console.log('🎬 Initializing interview...');
    const result = await startInterview({
      type: 'dsa',
      difficulty: 'medium',
      topic: 'arrays'
    })
    
    if (!result.success) {
      console.error('Failed to start interview:', result.error)
      setError(result.error)
    }
  }

  const startScreenMonitoring = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('copy', handleCopyEvent)
    document.addEventListener('paste', handlePasteEvent)
  }

  const stopScreenMonitoring = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('copy', handleCopyEvent)
    document.removeEventListener('paste', handlePasteEvent)
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      const activity = {
        type: 'tab_switch',
        timestamp: new Date(),
        description: 'User switched away from interview tab'
      }
      setSuspiciousActivity(prev => [...prev, activity])
      setScreenAnalysis({
        suspicious: true,
        activities: ['tab_switch_detected'],
        recommendations: ['Stay focused on the interview tab', 'Avoid switching to other applications']
      })
    }
  }

  const handleCopyEvent = (e) => {
    const activity = {
      type: 'copy_detected',
      timestamp: new Date(),
      description: 'Copy operation detected'
    }
    setSuspiciousActivity(prev => [...prev, activity])
  }

  const handlePasteEvent = (e) => {
    const activity = {
      type: 'paste_detected',
      timestamp: new Date(),
      description: 'Paste operation detected'
    }
    setSuspiciousActivity(prev => [...prev, activity])
    setScreenAnalysis({
      suspicious: true,
      activities: ['paste_detected'],
      recommendations: ['Write code from scratch', 'Avoid copying from external sources']
    })
  }

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
      })
      
      screenStreamRef.current = screenStream
      setIsScreenSharing(true)
      
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false)
      })
      
    } catch (error) {
      console.error('Error starting screen share:', error)
    }
  }

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      setIsScreenSharing(false)
    }
  }

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
      stopScreenShare()
    } else {
      startScreenShare()
    }
  }

  const handleVoiceToggle = () => {
    if (isVoiceRecording) {
      stopVoiceRecording()
    } else {
      startVoiceRecording()
    }
  }
  
  const startVoiceRecording = async () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Speech recognition not supported in this browser')
      return
    }
    
    try {
      resetTranscript()
      await SpeechRecognition.startListening({ continuous: true, language: 'en-US' })
      setIsVoiceRecording(true)
      console.log('🎤 Voice recording started')
    } catch (error) {
      console.error('Failed to start voice recording:', error)
    }
  }
  
  const stopVoiceRecording = async () => {
    try {
      SpeechRecognition.stopListening()
      setIsVoiceRecording(false)
      
      if (transcript.trim()) {
        console.log('Voice transcript:', transcript)
        
        // Send to AI for processing
        setAiSpeaking(true)
        sendChatMessage(transcript)
        
        // Generate AI response and speak it
        setTimeout(async () => {
          const aiResponse = generateAIResponse(transcript)
          
          // Use browser text-to-speech
          try {
            await voiceService.speakText(aiResponse, { rate: 0.9, pitch: 1.0 })
          } catch (error) {
            console.error('Text-to-speech error:', error)
          }
          
          setAiSpeaking(false)
        }, 1000)
        
        resetTranscript()
      }
    } catch (error) {
      console.error('Failed to stop voice recording:', error)
      setIsVoiceRecording(false)
    }
  }
  
  const generateAIResponse = (userInput) => {
    const responses = [
      "That's a good approach! Can you explain the time complexity of your solution?",
      "Interesting thinking! Have you considered any edge cases for this problem?",
      "Great explanation! Now let's implement this step by step in your code.",
      "Good observation! What data structure would be most efficient here?",
      "Excellent! Can you walk me through how this algorithm works with an example?"
    ]
    
    // Simple keyword-based responses
    if (userInput.toLowerCase().includes('stuck') || userInput.toLowerCase().includes('help')) {
      return "No worries! Let me give you a hint. Think about what data structure could help you store and retrieve information efficiently."
    }
    
    if (userInput.toLowerCase().includes('time complexity') || userInput.toLowerCase().includes('big o')) {
      return "Great question about complexity! For this problem, we want to aim for O(n) time complexity. Can you think of how to achieve that?"
    }
    
    if (userInput.toLowerCase().includes('array') || userInput.toLowerCase().includes('list')) {
      return "Good! Arrays are indeed useful here. Consider using techniques like two pointers or hash maps to optimize your solution."
    }
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handleCodeChange = (e) => {
    setCode(e.target.value)
  }

  const runCode = async () => {
    setOutput('Running code...')
    
    setTimeout(() => {
      const mockResults = [
        { id: 1, passed: true, input: 'Example 1', expected: 'Expected 1', actual: 'Expected 1' },
        { id: 2, passed: true, input: 'Example 2', expected: 'Expected 2', actual: 'Expected 2' },
        { id: 3, passed: false, input: 'Example 3', expected: 'Expected 3', actual: 'Different' }
      ]
      setTestResults(mockResults)
      
      const passedCount = mockResults.filter(test => test.passed).length
      setOutput(`Test Results: ${passedCount}/${mockResults.length} passed\n\n${passedCount === mockResults.length ? 'All tests passed! ✓' : 'Some tests failed. Check your logic.'}`)
    }, 2000)
  }

  const resetCode = () => {
    const starterCode = currentQuestion?.starterCode?.javascript || '// Write your solution here\nfunction solution(params) {\n    // Your code here\n    \n}'
    setCode(starterCode)
    setOutput('')
    setTestResults([])
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    sendChatMessage(newMessage)
    setNewMessage('')
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatMessageTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (currentInterview?.status === 'completed') {
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
                <span className="stat-number">{Math.round(questions.reduce((acc, q) => acc + (q.evaluation?.scores?.overall || 0), 0) / Math.max(questions.length, 1))}%</span>
                <span className="stat-label">Overall Score</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number">{formatTime(timeElapsed)}</span>
                <span className="stat-label">Duration</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number">{questions.filter(q => q.completed).length}/{questions.length}</span>
                <span className="stat-label">Problems Solved</span>
              </div>
            </div>

            <div className="summary-feedback">
              <h3>AI Feedback</h3>
              <div className="feedback-points">
                {['Good problem-solving approach', 'Clear communication', 'Systematic thinking'].map((strength, index) => (
                  <div key={index} className="feedback-point positive">
                    <CheckCircle size={16} />
                    <span>{strength}</span>
                  </div>
                ))}
                {['Consider edge cases', 'Optimize time complexity', 'Practice more'].map((improvement, index) => (
                  <div key={index + 10} className="feedback-point improvement">
                    <span>{improvement}</span>
                  </div>
                ))}
              </div>
              
              {suspiciousActivity.length > 0 && (
                <div className="screen-analysis">
                  <h4>Screen Activity Analysis</h4>
                  <p>Your screen activity was monitored for interview integrity.</p>
                  <div className="activity-log">
                    {suspiciousActivity.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <span>{activity.type}: {activity.description}</span>
                      </div>
                    ))}
                  </div>
                  {suspiciousActivity.length > 2 && (
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

  if (!interviewStarted || loading) {
    return (
      <div className="interview-loading">
        <div className="container">
          <div className="loading-message">
            <h2>{loading ? 'Preparing your interview...' : 'Starting AI Interview'}</h2>
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
          <h2>DSA Interview Session</h2>
          <div className="interview-meta">
            <span className="timer">
              <Clock size={16} />
              {formatTime(timeElapsed)}
            </span>
            <span className="question-counter">
              Question {currentQuestionIndex + 1} of {Math.max(questions.length, 1)}
            </span>
            <span className="difficulty-badge">
              MEDIUM
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
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {screenAnalysis?.suspicious && (
        <div className="warning-banner">
          <AlertTriangle size={16} />
          <p>Please focus on the interview. Avoid switching tabs or external resources.</p>
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
          
          {/* Voice Controls */}
          <div className="voice-controls">
            <div className="voice-status">
              {aiSpeaking && (
                <div className="ai-speaking">
                  <span>AI is speaking...</span>
                  <div className="speaking-animation">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              )}
              
              {isVoiceRecording && (
                <div className="recording-status">
                  <div className="recording-dot"></div>
                  <span>Listening...</span>
                </div>
              )}
              
              {transcript && (
                <div className="live-transcript">
                  <span>You said: "{transcript}"</span>
                </div>
              )}
              
              {!isVoiceRecording && !aiSpeaking && !transcript && (
                <div className="voice-ready">
                  <span>Ready for voice input</span>
                </div>
              )}
            </div>

            <button
              className={`voice-button ${isVoiceRecording ? 'recording' : ''} ${aiSpeaking ? 'disabled' : ''}`}
              onClick={handleVoiceToggle}
              disabled={aiSpeaking}
              title={isVoiceRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isVoiceRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            <div className="voice-instructions">
              <p>
                {aiSpeaking 
                  ? 'AI is speaking, please wait...'
                  : isVoiceRecording 
                    ? 'Speak now, click to stop'
                    : 'Click to start voice input'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="coding-section">
          <div className="question-panel">
            <div className="question-header">
              <h3>{currentQuestion?.title || 'Loading Question...'}</h3>
              <span className={`difficulty ${currentQuestion?.difficulty?.toLowerCase() || 'medium'}`}>
                {currentQuestion?.difficulty || 'Medium'}
              </span>
            </div>
            
            <div className="question-content">
              <p>{currentQuestion?.description || 'Loading problem description...'}</p>
              
              {currentQuestion?.examples && (
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
              
              {currentQuestion?.hints && (
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
                disabled={!canSubmitCode}
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
                onClick={endInterview}
                disabled={loading}
              >
                Complete Interview
              </button>
            </div>
          </div>

          {/* Code Editor */}
          <CodeEditor 
            code={code}
            onCodeChange={setCode}
            question={currentQuestion}
            evaluation={null}
            loading={loading}
          />
        </div>

        {/* Chat Section */}
        <div className="interview-chat">
          <div className="chat-header">
            <MessageCircle size={20} />
            <h4>AI Interview Assistant</h4>
          </div>

          <div className="chat-messages">
            {chatMessages.map(message => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  <div className="message-text">{message.message}</div>
                  <div className="message-time">{formatMessageTime(message.timestamp)}</div>
                </div>
                <div className="message-avatar">
                  {message.sender === 'ai' ? 'AI' : 'You'}
                </div>
              </div>
            ))}
          </div>

          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ask a question or explain your approach..."
              className="chat-input-field"
            />
            <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default InterviewRoom