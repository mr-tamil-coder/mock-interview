import { useState, useEffect, useCallback } from "react";
import apiService from "../services/api.js";
import socketService from "../services/socketService.js";

export const useInterview = () => {
  const [currentInterview, setCurrentInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interviewStarted, setInterviewStarted] = useState(false);

  useEffect(() => {
    // Connect to socket when component mounts
    socketService.connect();

    // Set up socket event listeners
    socketService.on("ai-response", handleAiResponse);
    socketService.on("ai-voice-response", handleAiVoiceResponse);
    socketService.on("ai-chat-response", handleAiChatResponse);
    socketService.on("code-evaluation", handleCodeEvaluation);
    socketService.on("interview-summary", handleInterviewSummary);
    socketService.on("error", handleSocketError);

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleAiResponse = useCallback((data) => {
    console.log("🤖 AI Response received:", data);

    if (data.type === "start") {
      // Clear timeout since we got a response
      if (window.interviewTimeoutId) {
        clearTimeout(window.interviewTimeoutId);
        window.interviewTimeoutId = null;
      }

      addChatMessage("ai", data.message);

      if (data.question) {
        setQuestions([data.question]);
        setCurrentQuestionIndex(0);

        // Set starter code based on question
        const starterCode =
          data.question.starterCode?.java ||
          data.question.starterCode?.javascript ||
          "// Write your solution here\n\n";
        setCode(starterCode);
      }

      setInterviewStarted(true);
      setLoading(false);
    }
  }, []);

  const handleAiVoiceResponse = useCallback((data) => {
    console.log("🎤 Voice response received:", data);
    addChatMessage("user", data.transcription);
    addChatMessage("ai", data.aiResponse);
  }, []);

  const handleAiChatResponse = useCallback((data) => {
    console.log("💬 Chat response received:", data);
    addChatMessage("ai", data.message);
  }, []);

  const handleCodeEvaluation = useCallback(
    (evaluation) => {
      console.log("📊 Code evaluation received:", evaluation);

      // Update current question with evaluation results
      setQuestions((prev) =>
        prev.map((q, index) =>
          index === currentQuestionIndex
            ? { ...q, evaluation, userCode: code, completed: true }
            : q
        )
      );

      // Add evaluation feedback to chat
      const overallScore = evaluation.scores?.overall || 0;
      const feedback = `Code evaluation complete! Overall Score: ${overallScore}/100. ${
        evaluation.interviewerComment || "Good effort!"
      }`;
      addChatMessage("ai", feedback);

      setLoading(false);
    },
    [currentQuestionIndex, code]
  );

  const handleInterviewSummary = useCallback((summary) => {
    console.log("📋 Interview summary received:", summary);
    setCurrentInterview((prev) => ({
      ...prev,
      summary,
      status: "completed",
    }));
    setLoading(false);
  }, []);

  const handleSocketError = useCallback((error) => {
    console.error("❌ Socket error:", error);
    setError(error.message);
    setLoading(false);
  }, []);

  const startInterview = async (interviewData) => {
    try {
      setLoading(true);
      setError(null);
      console.log("🚀 Starting interview with data:", interviewData);

      // Create interview record
      const response = await apiService.createInterview(interviewData);
      const interview = response.interview;

      setCurrentInterview(interview);
      setChatMessages([]);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      setCode("");

      // Join interview room
      socketService.joinInterview(interview._id);

      // Start AI interview
      console.log("🤖 Sending start-interview event");
      socketService.startInterview({
        interviewId: interview._id,
        ...interviewData,
      });

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.error("⏰ Interview start timeout - no response received");
        setError(
          "Interview failed to start. Please try again or check your connection."
        );
        setLoading(false);
      }, 30000); // 30 second timeout

      // Store timeout ID to clear if successful
      window.interviewTimeoutId = timeoutId;

      return { success: true, interview };
    } catch (error) {
      console.error("❌ Interview start error:", error);
      const message =
        error.response?.data?.message || "Failed to start interview";
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const submitCode = async () => {
    if (!currentInterview || !questions[currentQuestionIndex] || !code.trim()) {
      setError("Please write some code before submitting");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("📝 Submitting code for evaluation");
      socketService.submitCode({
        interviewId: currentInterview._id,
        questionId: questions[currentQuestionIndex].id,
        question: questions[currentQuestionIndex],
        code,
        language: "java", // Default to Java as requested
      });
    } catch (error) {
      console.error("❌ Code submission error:", error);
      setError("Failed to submit code");
      setLoading(false);
    }
  };

  const sendChatMessage = (message) => {
    if (!currentInterview || !message.trim()) return;

    console.log("💬 Sending chat message:", message);
    addChatMessage("user", message);

    socketService.sendChatMessage({
      interviewId: currentInterview._id,
      message,
      context: {
        currentQuestion: questions[currentQuestionIndex],
        code,
      },
    });
  };

  const sendVoiceInput = (transcript) => {
    if (!currentInterview || !transcript.trim()) return;

    console.log("🎤 Sending voice input:", transcript);

    socketService.sendVoiceInput({
      interviewId: currentInterview._id,
      transcript,
      context: {
        currentQuestion: questions[currentQuestionIndex],
        code,
      },
    });
  };

  const endInterview = async () => {
    if (!currentInterview) return;

    try {
      setLoading(true);
      setError(null);

      const performance = {
        questionsAttempted: questions.length,
        questionsCompleted: questions.filter(
          (q) => q.evaluation?.scores?.overall > 70
        ).length,
        averageScore:
          questions.reduce(
            (acc, q) => acc + (q.evaluation?.scores?.overall || 0),
            0
          ) / Math.max(questions.length, 1),
        totalTimeSpent:
          Date.now() - new Date(currentInterview.createdAt).getTime(),
      };

      console.log("🏁 Ending interview with performance:", performance);

      // Generate AI summary
      socketService.endInterview({
        interviewId: currentInterview._id,
        performance,
        duration: Math.floor(performance.totalTimeSpent / 1000 / 60), // minutes
      });

      // Update interview status
      await apiService.completeInterview(currentInterview._id, {
        scores: {
          overall: performance.averageScore,
          problemSolving: performance.averageScore,
          codeQuality: 85,
          communication: 80,
          timeManagement: 75,
        },
        feedback: {
          strengths: ["Good problem-solving approach", "Clear communication"],
          improvements: ["Consider edge cases", "Optimize time complexity"],
          suggestions: ["Practice more dynamic programming problems"],
        },
        duration: performance.totalTimeSpent / 1000,
      });
    } catch (error) {
      console.error("❌ End interview error:", error);
      setError("Failed to end interview");
      setLoading(false);
    }
  };

  const addChatMessage = (sender, message) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        sender,
        message,
        timestamp: new Date(),
      },
    ]);
  };

  return {
    // State
    currentInterview,
    questions,
    currentQuestion: questions[currentQuestionIndex],
    currentQuestionIndex,
    code,
    setCode,
    chatMessages,
    loading,
    error,
    interviewStarted,

    // Actions
    startInterview,
    submitCode,
    sendChatMessage,
    sendVoiceInput,
    endInterview,

    // Utilities
    canSubmitCode: code.trim().length > 0 && !loading,
    isInterviewActive:
      currentInterview?.status !== "completed" && interviewStarted,
    clearError: () => setError(null),
  };
};
