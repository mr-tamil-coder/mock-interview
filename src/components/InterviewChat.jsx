import { useState } from 'react'
import { Send, MessageCircle } from 'lucide-react'

function InterviewChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I\'m your AI interviewer. Let\'s start with the Two Sum problem. Take your time to understand the problem and think about your approach.',
      timestamp: new Date()
    },
    {
      id: 2,
      sender: 'ai', 
      text: 'Feel free to talk through your solution as you code. I\'m here to help if you get stuck!',
      timestamp: new Date()
    }
  ])
  
  const [newMessage, setNewMessage] = useState('')

  const sendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: newMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage('')

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        sender: 'ai',
        text: getAIResponse(newMessage),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

  const getAIResponse = (userMessage) => {
    const responses = [
      "That's a good approach! Can you think about the time complexity?",
      "Interesting solution. Have you considered edge cases?",
      "Great thinking! Now let's implement this step by step.",
      "Good observation. What data structure would be most efficient here?",
      "Excellent! Can you explain why this approach works?"
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="interview-chat">
      <div className="chat-header">
        <MessageCircle size={20} />
        <h4>AI Interview Assistant</h4>
      </div>

      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-content">
              <div className="message-text">{message.text}</div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
            <div className="message-avatar">
              {message.sender === 'ai' ? 'AI' : 'You'}
            </div>
          </div>
        ))}
      </div>

      <form className="chat-input" onSubmit={sendMessage}>
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
  )
}

export default InterviewChat