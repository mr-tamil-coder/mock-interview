import Vapi from "@vapi-ai/web"; // <-- CORRECTED THIS LINE

class VapiService {
  constructor() {
    this.vapi = null;
    this.isConnected = false;
    this.isCallActive = false;
    this.currentTranscript = "";
    this.eventHandlers = new Map();
    this.apiKey = "your-vapi-public-key"; // Replace with your Vapi public key
  }

  // Initialize Vapi with your assistant configuration
  async initialize() {
    try {
      this.vapi = new Vapi(this.apiKey);

      // Set up event listeners
      this.vapi.on("call-start", () => {
        console.log("✅ Vapi call started");
        this.isCallActive = true;
        this.emit("call-start");
      });

      this.vapi.on("call-end", () => {
        console.log("📞 Vapi call ended");
        this.isCallActive = false;
        this.emit("call-end");
      });

      this.vapi.on("speech-start", () => {
        console.log("🎤 User started speaking");
        this.emit("speech-start");
      });

      this.vapi.on("speech-end", () => {
        console.log("🎤 User stopped speaking");
        this.emit("speech-end");
      });

      // The 'transcript' event is not standard in the provided docs.
      // Vapi sends transcripts through the 'message' event.
      // You might need to adjust this logic based on the message type.
      this.vapi.on("message", (message) => {
        console.log("💬 Message received:", message);
        if (message.type === "transcript" && message.transcript) {
          console.log("📝 Transcript:", message.transcript);
          this.currentTranscript = message.transcript;
          this.emit("transcript", message);
        }
        this.emit("message", message);
      });

      this.vapi.on("error", (error) => {
        console.error("❌ Vapi error:", error);
        this.emit("error", error);
      });

      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize Vapi:", error);
      return false;
    }
  }

  // Start voice call with AI interviewer
  async startCall(assistantConfig = null) {
    if (!this.vapi) {
      await this.initialize();
    }

    try {
      const defaultAssistant = {
        model: {
          provider: "openai",
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are an experienced technical interviewer conducting a Data Structures and Algorithms interview. 

Your role:
1. Greet the candidate warmly and professionally
2. Present DSA problems appropriate for their level
3. Guide them through problem-solving with hints (don't give solutions)
4. Ask follow-up questions about time/space complexity
5. Encourage good problem-solving practices
6. Provide constructive feedback

Keep responses conversational, encouraging, and under 100 words. Focus on helping the candidate think through problems rather than giving direct answers.`,
            },
          ],
        },
        voice: {
          provider: "playht",
          voiceId: "jennifer",
        },
        firstMessage:
          "Hello! I'm your AI interviewer today. I'm excited to work with you on some data structures and algorithms problems. Are you ready to begin with our first coding challenge?",
      };

      const assistant = assistantConfig || defaultAssistant;

      await this.vapi.start(assistant);
      return true;
    } catch (error) {
      console.error("Failed to start Vapi call:", error);
      return false;
    }
  }

  // End the voice call
  async endCall() {
    if (this.vapi && this.isCallActive) {
      try {
        await this.vapi.stop();
        return true;
      } catch (error) {
        console.error("Failed to end Vapi call:", error);
        return false;
      }
    }
    return false;
  }

  // Send message to AI during call
  async sendMessage(message) {
    if (this.vapi && this.isCallActive) {
      try {
        await this.vapi.send({
          type: "add-message",
          message: {
            role: "user",
            content: message,
          },
        });
        return true;
      } catch (error) {
        console.error("Failed to send message:", error);
        return false;
      }
    }
    return false;
  }

  // Event emitter methods
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Get current state
  getState() {
    return {
      isConnected: this.isConnected,
      isCallActive: this.isCallActive,
      currentTranscript: this.currentTranscript,
    };
  }

  // Cleanup
  cleanup() {
    if (this.isCallActive) {
      this.endCall();
    }
    this.eventHandlers.clear();
  }
}

export default new VapiService();
