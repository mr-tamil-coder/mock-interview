import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'

function VoiceControls({ isRecording, aiSpeaking, onToggleRecording }) {
  return (
    <div className="voice-controls">
      <div className="voice-status">
        {aiSpeaking && (
          <div className="ai-speaking">
            <Volume2 size={16} />
            <span>AI is speaking...</span>
            <div className="speaking-animation">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
        
        {isRecording && (
          <div className="recording-status">
            <div className="recording-dot"></div>
            <span>Listening...</span>
          </div>
        )}
      </div>

      <button
        className={`voice-button ${isRecording ? 'recording' : ''} ${aiSpeaking ? 'disabled' : ''}`}
        onClick={onToggleRecording}
        disabled={aiSpeaking}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
      </button>

      <div className="voice-instructions">
        <p>
          {aiSpeaking 
            ? 'AI is speaking, please wait...'
            : isRecording 
              ? 'Speak now, click to stop'
              : 'Click to start voice input'
          }
        </p>
      </div>
    </div>
  )
}

export default VoiceControls