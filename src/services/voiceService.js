class VoiceService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
    this.audioContext = null;
  }

  // Initialize voice services
  async initialize() {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
      });

      // Initialize audio context for better audio processing
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      console.log("✅ Voice service initialized");
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize voice service:", error);
      return false;
    }
  }

  // Start recording audio
  async startRecording() {
    if (!this.stream) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      console.log("🎤 Recording started");
      return true;
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      return false;
    }
  }

  // Stop recording and return audio blob
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error("Not currently recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: "audio/webm;codecs=opus",
        });

        this.isRecording = false;
        this.audioChunks = [];

        console.log("🎤 Recording stopped, blob size:", audioBlob.size);
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (error) => {
        console.error("❌ Recording error:", error);
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  // Play audio from URL or blob
  async playAudio(audioSource) {
    try {
      let audioUrl;

      if (audioSource instanceof Blob) {
        audioUrl = URL.createObjectURL(audioSource);
      } else if (typeof audioSource === "string") {
        audioUrl = audioSource;
      } else if (audioSource.url) {
        audioUrl = `http://localhost:5000${audioSource.url}`;
      } else {
        throw new Error("Invalid audio source");
      }

      const audio = new Audio(audioUrl);
      audio.crossOrigin = "anonymous";

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          if (audioSource instanceof Blob) {
            URL.revokeObjectURL(audioUrl);
          }
          resolve();
        };

        audio.onerror = (error) => {
          console.error("❌ Audio playback error:", error);
          if (audioSource instanceof Blob) {
            URL.revokeObjectURL(audioUrl);
          }
          reject(error);
        };

        // Handle autoplay restrictions
        audio.play().catch((error) => {
          console.warn("Autoplay prevented:", error);
          resolve(); // Don't reject, just resolve silently
        });
      });
    } catch (error) {
      console.error("❌ Failed to play audio:", error);
      throw error;
    }
  }

  // Convert audio blob to base64
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Get audio duration
  async getAudioDuration(audioBlob) {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };

      audio.src = url;
    });
  }

  // Check if recording is supported
  isRecordingSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder
    );
  }

  // Check if speech synthesis is supported
  isSpeechSynthesisSupported() {
    return "speechSynthesis" in window;
  }

  // Get available voices
  getAvailableVoices() {
    if (!this.isSpeechSynthesisSupported()) return [];
    return speechSynthesis.getVoices();
  }

  // Speak text using browser TTS (fallback)
  async speakText(text, options = {}) {
    if (!this.isSpeechSynthesisSupported()) {
      throw new Error("Speech synthesis not supported");
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      if (options.voice) {
        const voices = this.getAvailableVoices();
        const selectedVoice = voices.find(
          (voice) =>
            voice.name.includes(options.voice) ||
            voice.lang.includes(options.voice)
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onend = resolve;
      utterance.onerror = reject;

      speechSynthesis.speak(utterance);
    });
  }

  // Stop current speech
  stopSpeaking() {
    if (this.isSpeechSynthesisSupported()) {
      speechSynthesis.cancel();
    }
  }

  // Cleanup resources
  cleanup() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.stopSpeaking();
    this.audioChunks = [];
    this.isRecording = false;
  }

  // Get recording state
  getRecordingState() {
    return {
      isRecording: this.isRecording,
      isSupported: this.isRecordingSupported(),
      hasPermission: !!this.stream,
      audioContextState: this.audioContext?.state || 'closed'
    };
  }

  // Resume audio context if suspended (for autoplay restrictions)
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
}

export default new VoiceService();
