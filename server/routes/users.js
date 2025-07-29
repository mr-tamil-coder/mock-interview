import express from 'express';
import User from '../models/User.js';
import Interview from '../models/Interview.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user dashboard data
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    const interviewStats = await Interview.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: null,
          totalInterviews: { $sum: 1 },
          completedInterviews: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageScore: { $avg: '$scores.overall' },
          thisWeekInterviews: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$createdAt',
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const recentInterviews = await Interview.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type difficulty scores createdAt status duration');

    const skillProgress = await Interview.aggregate([
      { $match: { userId: req.userId, status: 'completed' } },
      { $unwind: '$questions' },
      {
        $group: {
          _id: '$topic',
          averageScore: { $avg: '$questions.score' },
          totalQuestions: { $sum: 1 },
          correctAnswers: {
            $sum: { $cond: ['$questions.isCorrect', 1, 0] }
          }
        }
      }
    ]);

    res.json({
      user,
      stats: interviewStats[0] || {
        totalInterviews: 0,
        completedInterviews: 0,
        averageScore: 0,
        thisWeekInterviews: 0
      },
      recentInterviews,
      skillProgress
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { difficulty, topics, voiceEnabled } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'preferences.difficulty': difficulty,
          'preferences.topics': topics,
          'preferences.voiceEnabled': voiceEnabled
        }
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Preferences updated successfully',
      user
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user progress analytics
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    let dateFilter = new Date();
    switch (timeframe) {
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      case '90d':
        dateFilter.setDate(dateFilter.getDate() - 90);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 30);
    }

    const progressData = await Interview.aggregate([
      {
        $match: {
          userId: req.userId,
          createdAt: { $gte: dateFilter },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          averageScore: { $avg: '$scores.overall' },
          interviewCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    const topicPerformance = await Interview.aggregate([
      {
        $match: {
          userId: req.userId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$topic',
          averageScore: { $avg: '$scores.overall' },
          totalInterviews: { $sum: 1 },
          bestScore: { $max: '$scores.overall' }
        }
      },
      { $sort: { averageScore: -1 } }
    ]);

    res.json({
      progressData,
      topicPerformance,
      timeframe
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { timeframe = 'all', limit = 10 } = req.query;
    
    let matchStage = { status: 'completed' };
    
    if (timeframe !== 'all') {
      let dateFilter = new Date();
      switch (timeframe) {
        case 'week':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case 'month':
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
      }
      matchStage.createdAt = { $gte: dateFilter };
    }

    const leaderboard = await Interview.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          averageScore: { $avg: '$scores.overall' },
          totalInterviews: { $sum: 1 },
          bestScore: { $max: '$scores.overall' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          averageScore: 1,
          totalInterviews: 1,
          bestScore: 1
        }
      },
      { $sort: { averageScore: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      leaderboard,
      timeframe
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;