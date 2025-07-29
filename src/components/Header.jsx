import { User, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import LoginModal from './LoginModal'

function Header({ currentView, setCurrentView }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { user, logout } = useAuth()

  const handleGetStarted = () => {
    if (user) {
      setCurrentView('dashboard')
    } else {
      setShowLoginModal(true)
    }
  }

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo" onClick={() => setCurrentView('landing')}>
              <h2 className="gradient-text">MockAI Interview</h2>
            </div>

            <nav className={`nav ${isMenuOpen ? 'nav-open' : ''}`}>
              <button 
                className="nav-link"
                onClick={() => setCurrentView('landing')}
              >
                Home
              </button>
              {user && (
                <button 
                  className="nav-link"
                  onClick={() => setCurrentView('dashboard')}
                >
                  Dashboard
                </button>
              )}
              <button className="nav-link">Features</button>
              <button className="nav-link">Pricing</button>
            </nav>

            <div className="header-actions">
              {user ? (
                <div className="user-menu">
                  <div className="user-avatar">
                    <User size={24} />
                  </div>
                  <span className="user-name">{user.name}</span>
                  <button className="btn btn-secondary" onClick={logout}>
                    Logout
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={handleGetStarted}>
                  Get Started Free
                </button>
              )}

              <button 
                className="menu-toggle"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false)
            setCurrentView('dashboard')
          }}
        />
      )}
    </>
  )
}

export default Header