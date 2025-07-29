import { Play, BarChart3, Clock, Trophy, BookOpen, Target } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import apiService from '../services/api'

function Dashboard({ onStartInterview }) {
  const { user } = useAuth()
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium')
  const [selectedTopic, setSelectedTopic] = useState('arrays')
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const data = await apiService.getDashboardData()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const interviewTypes = [
    {
      id: 'dsa',
      title: 'DSA Interview',
      description: 'Practice data structures and algorithms',
      icon: <BookOpen size={24} />,
      difficulty: ['easy', 'medium', 'hard'],
      duration: '45 min'
    },
    {
      id: 'system',
      title: 'System Design',
      description: 'Design scalable systems',
      icon: <Target size={24} />,
      difficulty: ['medium', 'hard'],
      duration: '60 min'
    }
  ]

  const topics = [
    'Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming',
    'Sorting', 'Searching', 'Hash Tables', 'Stacks & Queues'
  ]

  if (loading) {
    return (
      <div className="dashboard">
        <div className="container">
          <div className="loading-spinner">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  const stats = dashboardData?.stats || {}
  const recentInterviews = dashboardData?.recentInterviews || []

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header animate-fade-in">
          <h1>Welcome back, {user?.name || 'Developer'}!</h1>
          <p>Ready to practice your next interview? Let's get started.</p>
        </div>

        <div className="dashboard-content">
          {/* Quick Start Section */}
          <section className="quick-start animate-slide-up">
            <div className="card">
              <h2>Start New Interview</h2>
              <div className="interview-setup">
                <div className="setup-group">
                  <label>Interview Type</label>
                  <div className="interview-types">
                    {interviewTypes.map(type => (
                      <div key={type.id} className="interview-type-card">
                        <div className="type-icon">{type.icon}</div>
                        <h3>{type.title}</h3>
                        <p>{type.description}</p>
                        <div className="type-meta">
                          <span className="duration">
                            <Clock size={16} />
                            {type.duration}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="setup-group">
                  <label>Topic Focus</label>
                  <select 
                    value={selectedTopic} 
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="setup-select"
                  >
                    {topics.map(topic => (
                      <option key={topic.toLowerCase()} value={topic.toLowerCase()}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="setup-group">
                  <label>Difficulty Level</label>
                  <div className="difficulty-buttons">
                    {['easy', 'medium', 'hard'].map(level => (
                      <button
                        key={level}
                        className={`difficulty-btn ${selectedDifficulty === level ? 'active' : ''}`}
                        onClick={() => setSelectedDifficulty(level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  className="btn btn-primary btn-lg start-interview-btn"
                  onClick={() => onStartInterview({
                    type: 'dsa',
                    difficulty: selectedDifficulty,
                    topic: selectedTopic
                  })}
                >
                  <Play size={20} />
                  Start Interview
                </button>
              </div>
            </div>
          </section>

          {/* Stats & Recent Interviews */}
          <div className="dashboard-grid">
            <section className="stats-section animate-slide-up">
              <div className="card">
                <h2>Your Progress</h2>
                <div className="progress-stats">
                  <div className="stat-box">
                    <div className="stat-icon">
                      <Trophy size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{stats.totalInterviews || 0}</span>
                      <span className="stat-label">Interviews Completed</span>
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-icon">
                      <BarChart3 size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{Math.round(stats.averageScore || 0)}%</span>
                      <span className="stat-label">Average Score</span>
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-icon">
                      <Target size={24} />
                    </div>
                    <div className="stat-info">
                      <span className="stat-number">{stats.thisWeekInterviews || 0}</span>
                      <span className="stat-label">This Week</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="recent-interviews animate-slide-up">
              <div className="card">
                <h2>Recent Interviews</h2>
                <div className="interviews-list">
                  {recentInterviews.map(interview => (
                    <div key={interview.id} className="interview-item">
                      <div className="interview-info">
                        <h3>{interview.type.toUpperCase()} Interview</h3>
                        <p>{new Date(interview.createdAt).toLocaleDateString()} • {Math.round(interview.duration / 60) || 0} min</p>
                      </div>
                      <div className="interview-score">
                        <span className={`score ${(interview.scores?.overall || 0) >= 80 ? 'good' : (interview.scores?.overall || 0) >= 60 ? 'okay' : 'needs-work'}`}>
                          {Math.round(interview.scores?.overall || 0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {recentInterviews.length === 0 && (
                    <div className="no-interviews">
                      <p>No interviews completed yet. Start your first interview above!</p>
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary view-all-btn">
                  View All Interviews
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard