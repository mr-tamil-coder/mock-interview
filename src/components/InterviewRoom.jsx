import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useInterview } from "../hooks/useInterview";
import CodeEditor from "./CodeEditor";
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
  Send,
  MessageCircle,
  Play,
  Square,
} from "lucide-react";

function InterviewRoom({ onEndInterview }) {
  const { user } = useAuth();
  const {
    currentInterview,
    currentQuestion,
    questions,
    currentQuestionIndex,
    code,
    setCode,
    chatMessages,
    loading,
    error,
    interviewStarted,
    startInterview,
    submitCode,
    sendChatMessage,
    sendVoiceInput,
    endInterview,
    canSubmitCode,
    isInterviewActive,
    clearError,
  } = useInterview();

  // Camera and screen sharing
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [screenAnalysis, setScreenAnalysis] = useState(null);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);

  useEffect(() => {
    initializeInterview();
    startCamera();
    startScreenMonitoring();
    initializeSpeechRecognition();

    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      stopCamera();
      stopScreenShare();
      stopScreenMonitoring();
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const initializeInterview = async () => {
    console.log("🎬 Initializing interview...");
    const result = await startInterview({
      type: "dsa",
      difficulty: "medium",
      topic: "arrays",
    });

    if (result && !result.success) {
      console.error("Failed to start interview:", result.error);
    }
  };

  const initializeSpeechRecognition = () => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          console.log("🎤 Speech recognized:", finalTranscript);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
        if (transcript) {
          sendVoiceInput(transcript);
          setTranscript("");
        }
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn("Speech recognition not supported");
    }
  };

  const startScreenMonitoring = () => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopyEvent);
    document.addEventListener("paste", handlePasteEvent);
  };

  const stopScreenMonitoring = () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("copy", handleCopyEvent);
    document.removeEventListener("paste", handlePasteEvent);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      const activity = {
        type: "tab_switch",
        timestamp: new Date(),
        description: "User switched away from interview tab",
      };
      setSuspiciousActivity((prev) => [...prev, activity]);
      setScreenAnalysis({
        suspicious: true,
        activities: ["tab_switch_detected"],
        recommendations: [
          "Stay focused on the interview tab",
          "Avoid switching to other applications",
        ],
      });
    }
  };

  const handleCopyEvent = (e) => {
    const activity = {
      type: "copy_detected",
      timestamp: new Date(),
      description: "Copy operation detected",
    };
    setSuspiciousActivity((prev) => [...prev, activity]);
  };

  const handlePasteEvent = (e) => {
    const activity = {
      type: "paste_detected",
      timestamp: new Date(),
      description: "Paste operation detected",
    };
    setSuspiciousActivity((prev) => [...prev, activity]);
    setScreenAnalysis({
      suspicious: true,
      activities: ["paste_detected"],
      recommendations: [
        "Write code from scratch",
        "Avoid copying from external sources",
      ],
    });
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        setIsScreenSharing(false);
      });
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      setIsScreenSharing(false);
    }
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
      }
    }
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
      }
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
      setTranscript("");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendChatMessage(newMessage);
    setNewMessage("");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatMessageTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (currentInterview?.status === "completed") {
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
                <span className="stat-number">
                  {Math.round(
                    questions.reduce(
                      (acc, q) => acc + (q.evaluation?.scores?.overall || 0),
                      0
                    ) / Math.max(questions.length, 1)
                  )}
                  %
                </span>
                <span className="stat-label">Overall Score</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number">{formatTime(timeElapsed)}</span>
                <span className="stat-label">Duration</span>
              </div>
              <div className="summary-stat">
                <span className="stat-number">
                  {questions.filter((q) => q.completed).length}/
                  {questions.length}
                </span>
                <span className="stat-label">Problems Solved</span>
              </div>
            </div>

            <div className="summary-feedback">
              <h3>AI Feedback</h3>
              <div className="feedback-points">
                {[
                  "Good problem-solving approach",
                  "Clear communication",
                  "Systematic thinking",
                ].map((strength, index) => (
                  <div key={index} className="feedback-point positive">
                    <CheckCircle size={16} />
                    <span>{strength}</span>
                  </div>
                ))}
              </div>

              {suspiciousActivity.length > 0 && (
                <div className="screen-analysis">
                  <h4>Screen Activity Analysis</h4>
                  <p>
                    Your screen activity was monitored for interview integrity.
                  </p>
                  <div className="activity-log">
                    {suspiciousActivity.map((activity, index) => (
                      <div key={index} className="activity-item">
                        <span>
                          {activity.type}: {activity.description}
                        </span>
                      </div>
                    ))}
                  </div>
                  {suspiciousActivity.length > 2 && (
                    <div className="warning">
                      <p>
                        ⚠️ Some activities may need attention in future
                        interviews.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="summary-actions">
              <button className="btn btn-primary" onClick={onEndInterview}>
                Back to Dashboard
              </button>
              <button className="btn btn-secondary">Download Report</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!interviewStarted || loading) {
    return (
      <div className="interview-loading">
        <div className="container">
          <div className="loading-message">
            <h2>
              {loading
                ? "Preparing your interview..."
                : "Starting AI Interview"}
            </h2>
            <p>Our AI interviewer is getting ready to meet you!</p>
            {loading && (
              <>
                <div className="loading-spinner"></div>
                <div className="loading-steps">
                  <div className="step">
                    <span className="step-icon">🔌</span>
                    <span>Connecting to AI servers...</span>
                  </div>
                  <div className="step">
                    <span className="step-icon">🤖</span>
                    <span>Generating personalized questions...</span>
                  </div>
                  <div className="step">
                    <span className="step-icon">📝</span>
                    <span>Setting up your interview room...</span>
                  </div>
                </div>
                <div className="loading-tip">
                  <p>
                    💡 This usually takes 10-30 seconds. If it takes longer, try
                    refreshing the page.
                  </p>
                </div>
              </>
            )}
            {error && (
              <div className="error-message">
                <p>❌ {error}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    clearError();
                    // Retry starting the interview
                    if (currentInterview) {
                      startInterview({
                        type: "dsa",
                        difficulty: "medium",
                        topic: "arrays",
                      });
                    }
                  }}
                >
                  🔄 Retry Interview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
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
              Question {currentQuestionIndex + 1} of{" "}
              {Math.max(questions.length, 1)}
            </span>
            <span className="difficulty-badge">
              {currentQuestion?.difficulty?.toUpperCase() || "MEDIUM"}
            </span>
          </div>
        </div>

        <div className="interview-controls">
          <button
            className={`control-btn ${isCameraOn ? "active" : "inactive"}`}
            onClick={toggleCamera}
          >
            {isCameraOn ? <Camera size={20} /> : <CameraOff size={20} />}
          </button>
          <button
            className={`control-btn ${isMicOn ? "active" : "inactive"}`}
            onClick={toggleMic}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            className={`control-btn ${isRecording ? "recording" : ""}`}
            onClick={toggleVoiceRecording}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            {isRecording ? <Square size={20} /> : <Play size={20} />}
            {isRecording ? "Stop Voice" : "Talk to AI"}
          </button>
          <button
            className={`control-btn ${isScreenSharing ? "active" : "inactive"}`}
            onClick={toggleScreenShare}
            title="Toggle Screen Share"
          >
            {isScreenSharing ? <Monitor size={20} /> : <MonitorOff size={20} />}
            {isScreenSharing ? "Stop Share" : "Share Screen"}
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
          <p>
            Please focus on the interview. Avoid switching tabs or external
            resources.
          </p>
        </div>
      )}

      {isRecording && (
        <div className="voice-recording-banner">
          <div className="recording-indicator">
            <div className="recording-dot"></div>
            <span>Listening... Speak now</span>
          </div>
          {transcript && (
            <div className="live-transcript">
              <span>You said: "{transcript}"</span>
            </div>
          )}
        </div>
      )}

      <div className="interview-content">
        <div className="video-section">
          <div className="video-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              className={`interview-video ${!isCameraOn ? "hidden" : ""}`}
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
              <div className="avatar-circle">AI</div>
              <div className="ai-status">
                {loading ? "Thinking..." : "Ready to help"}
              </div>
            </div>
          </div>
        </div>

        <div className="coding-section">
          <div className="question-panel">
            <div className="question-header">
              <h3>{currentQuestion?.title || "Loading Question..."}</h3>
              <span
                className={`difficulty ${
                  currentQuestion?.difficulty?.toLowerCase() || "medium"
                }`}
              >
                {currentQuestion?.difficulty || "Medium"}
              </span>
            </div>

            <div className="question-content">
              <p>
                {currentQuestion?.description ||
                  "Loading problem description..."}
              </p>

              {currentQuestion?.examples && (
                <div className="example">
                  <strong>Example:</strong>
                  {currentQuestion.examples.map((example, index) => (
                    <pre key={index}>
                      Input: {example.input}
                      Output: {example.output}
                      {example.explanation &&
                        `\nExplanation: ${example.explanation}`}
                    </pre>
                  ))}
                </div>
              )}

              {currentQuestion?.constraints && (
                <div className="constraints">
                  <strong>Constraints:</strong>
                  <ul>
                    {currentQuestion.constraints.map((constraint, index) => (
                      <li key={index}>{constraint}</li>
                    ))}
                  </ul>
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
                disabled={!canSubmitCode || loading}
              >
                {loading ? "Evaluating..." : "Submit Code"}
              </button>

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
            evaluation={currentQuestion?.evaluation}
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
            {chatMessages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  <div className="message-text">{message.message}</div>
                  <div className="message-time">
                    {formatMessageTime(message.timestamp)}
                  </div>
                </div>
                <div className="message-avatar">
                  {message.sender === "ai" ? "AI" : "You"}
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
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!newMessage.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InterviewRoom;
