import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useVoiceAI } from '../hooks/useVoiceAI'
import { 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Clock,
  CheckCircle,
  Monitor,
  MonitorOff,
  AlertTriangle
} from 'lucide-react'
import CodeEditor from './CodeEditor'
import VoiceAIInterface from './VoiceAIInterface'
import apiService from '../services/api'

function InterviewRoom({ onEndInterview }) {
  const { user } = useAuth()
  
  // Interview state
  const [currentInterview, setCurrentInterview] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showSummary, setShowSummary] = useState(false)

  // Camera and screen sharing
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [screenAnalysis, setScreenAnalysis] = useState(null)
  const [suspiciousActivity, setSuspiciousActivity] = useState([])
  
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const screenStreamRef = useRef(null)

  // Voice AI integration
  const interviewContext = {
    phase: currentInterview?.status === 'completed' ? 'wrap_up' : 
           currentQuestion ? 'problem_solving' : 'introduction',
    currentQuestion,
    difficulty: currentInterview?.difficulty,
    topic: currentInterview?.topic,
    questionsCompleted: questions.filter(q => q.completed).length,
    totalQuestions: questions.length
  }

  useEffect(() => {
    initializeInterview()
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
    }
  }, [])

  const initializeInterview = async () => {
    try {
      setLoading(true)
      
      // Create new interview
      const interviewData = {
        type: 'dsa',
        difficulty: 'medium',
        topic: 'arrays'
      }
      
      const response = await apiService.createInterview(interviewData)
      setCurrentInterview(response.interview)
      
      // Generate first question
      const questionResponse = await apiService.generateQuestion({
        difficulty: 'medium',
        topic: 'arrays',
        previousQuestions: []
      })
      
      if (questionResponse.success) {
        setCurrentQuestion(questionResponse.question)
        setQuestions([questionResponse.question])
        setCode(questionResponse.question.starterCode?.javascript || '// Write your solution here\n\n')
      }
    } catch (error) {
      setError('Failed to initialize interview')
      console.error('Interview initialization error:', error)
    } finally {
      setLoading(false)
    }
  }

  const startScreenMonitoring = () => {
    // Monitor tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Monitor copy/paste events
    document.addEventListener('copy', handleCopyEvent)
    document.addEventListener('paste', handlePasteEvent)
    
    // Monitor right-click context menu
    document.addEventListener('contextmenu', handleContextMenu)
  }

  const stopScreenMonitoring = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    document.removeEventListener('copy', handleCopyEvent)
    document.removeEventListener('paste', handlePasteEvent)
    document.removeEventListener('contextmenu', handleContextMenu)
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

  const handleContextMenu = (e) => {
    // Optionally prevent right-click in interview mode
    // e.preventDefault()
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
      });
      
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      
      // Monitor screen share events
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenSharing(false);
      });
      
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      setIsScreenSharing(false);
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

  const handleVoiceInteraction = (interaction) => {
    // Handle voice interaction from VoiceAI component
    console.log('Voice interaction:', interaction)
  }

  const submitCode = async () => {
    if (!currentQuestion || !code.trim()) return

    try {
      setLoading(true)
      
      const response = await apiService.evaluateCode({
        code,
        question: currentQuestion,
        language: 'javascript',
        interviewId: currentInterview._id
      })

      if (response.success) {
        // Update question with evaluation
        const updatedQuestion = {
          ...currentQuestion,
          evaluation: response.evaluation,
          completed: true,
          userCode: code
        }
        
        setQuestions(prev => prev.map((q, index) => 
          index === currentQuestionIndex ? updatedQuestion : q
        ))
        
        setCurrentQuestion(updatedQuestion)
      }
    } catch (error) {
      setError('Failed to evaluate code')
    } finally {
      setLoading(false)
    }
  }

  const nextQuestion = async () => {
    try {
      setLoading(true)
      
      const response = await apiService.generateQuestion({
        difficulty: currentInterview.difficulty,
        topic: currentInterview.topic,
        previousQuestions: questions.map(q => q.title)
      })

      if (response.success) {
        const newQuestion = response.question
        setQuestions(prev => [...prev, newQuestion])
        setCurrentQuestionIndex(prev => prev + 1)
        setCurrentQuestion(newQuestion)
        setCode(newQuestion.starterCode?.javascript || '// Write your solution here\n\n')
      }
    } catch (error) {
      setError('Failed to generate next question')
    } finally {
      setLoading(false)
    }
  }

  const handleEndInterview = async () => {
    try {
      setLoading(true)
      
      const completedQuestions = questions.filter(q => q.completed).length
      const averageScore = questions.reduce((acc, q) => acc + (q.evaluation?.scores?.overall || 0), 0) / questions.length
      
      const performance = {
        questionsAttempted: questions.length,
        questionsCompleted: completedQuestions,
        averageScore: averageScore || 0,
        totalTimeSpent: timeElapsed,
        suspiciousActivities: suspiciousActivity
      }

      await apiService.completeInterview(currentInterview._id, {
        scores: {
          overall: performance.averageScore,
          problemSolving: performance.averageScore,
          codeQuality: 85,
          communication: 80,
          timeManagement: Math.max(100 - (timeElapsed / 60), 60)
        },
        feedback: {
          strengths: ['Good problem-solving approach', 'Clear code structure'],
          improvements: ['Consider edge cases', 'Optimize time complexity'],
          suggestions: ['Practice more DSA problems', 'Focus on communication']
        },
        duration: timeElapsed,
        suspiciousActivities: suspiciousActivity
      })
      
      setShowSummary(true)
    } catch (error) {
      setError('Failed to complete interview')
    } finally {
      setLoading(false)
    }
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

  if (!currentInterview || !currentQuestion) {
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
          <h2>{currentInterview?.type?.toUpperCase() || 'DSA'} Interview Session</h2>
          <div className="interview-meta">
            <span className="timer">
              <Clock size={16} />
              {formatTime(timeElapsed)}
            </span>
            <span className="question-counter">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="difficulty-badge">
              {currentInterview?.difficulty?.toUpperCase() || 'MEDIUM'}
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
          
          {/* Voice AI Interface */}
          <VoiceAIInterface 
            interviewContext={interviewContext}
            onVoiceInteraction={handleVoiceInteraction}
          />
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
                disabled={!code.trim() || loading}
              >
                {loading ? 'Evaluating...' : 'Submit Code'}
              </button>
              
              {currentQuestion?.completed && (
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
            onCodeChange={setCode}
            question={currentQuestion}
            evaluation={currentQuestion?.evaluation}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default InterviewRoom