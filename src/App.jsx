import { useState } from 'react'
import { AuthProvider } from './hooks/useAuth'
import Header from './components/Header'
import LandingPage from './components/LandingPage' 
import Dashboard from './components/Dashboard'
import InterviewRoom from './components/InterviewRoom'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('landing')

  const handleStartInterview = (interviewType) => {
    setCurrentView('interview')
  }

  const handleEndInterview = () => {
    setCurrentView('dashboard')
  }

  return (
    <AuthProvider>
      <div className="app">
        <Header 
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
        
        {currentView === 'landing' && (
          <LandingPage onGetStarted={() => setCurrentView('dashboard')} />
        )}
        
        {currentView === 'dashboard' && (
          <Dashboard 
            onStartInterview={handleStartInterview}
          />
        )}
        
        {currentView === 'interview' && (
          <InterviewRoom 
            onEndInterview={handleEndInterview}
          />
        )}
      </div>
    </AuthProvider>
  )
}

export default App