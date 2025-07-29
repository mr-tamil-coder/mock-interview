import { Play, Code, Brain, TrendingUp, Star, Users, Clock } from 'lucide-react'

function LandingPage({ onGetStarted }) {
  return (
    <main className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content animate-fade-in">
            <h1 className="hero-title">
              Master Your <span className="gradient-text">DSA Interviews</span>
              <br />with AI-Powered Practice
            </h1>
            <p className="hero-subtitle">
              Practice coding interviews with our intelligent AI interviewer. 
              Get real-time feedback, webcam interaction, and detailed performance summaries.
              Completely free to start!
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
                <Play size={20} />
                Start Free Interview
              </button>
              <button className="btn btn-secondary btn-lg">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Everything You Need to Ace Your Interview</h2>
          <div className="features-grid">
            <div className="feature-card animate-slide-up">
              <div className="feature-icon">
                <Brain size={32} />
              </div>
              <h3>AI-Powered Interviews</h3>
              <p>Practice with our advanced AI that adapts to your skill level and provides personalized questions.</p>
            </div>
            
            <div className="feature-card animate-slide-up">
              <div className="feature-icon">
                <Code size={32} />
              </div>
              <h3>Real Coding Environment</h3>
              <p>Write and test your code in a professional IDE with syntax highlighting and debugging tools.</p>
            </div>
            
            <div className="feature-card animate-slide-up">
              <div className="feature-icon">
                <TrendingUp size={32} />
              </div>
              <h3>Performance Analytics</h3>
              <p>Get detailed insights into your performance with comprehensive reports and improvement suggestions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Interviews Completed</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">95%</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">DSA Problems</div>
            </div>
            <div class="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">AI Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Land Your Dream Job?</h2>
            <p>Join thousands of developers who have improved their interview skills with MockAI</p>
            <button className="btn btn-success btn-lg" onClick={onGetStarted}>
              Start Your Free Interview Now
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default LandingPage