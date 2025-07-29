import express from 'express';
import Interview from '../models/Interview.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Create new interview
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, difficulty, topic } = req.body;
    
    const interview = new Interview({
      userId: req.userId,
      type,
      difficulty,
      topic,
      status: 'in-progress'
    });

    await interview.save();
    
    res.status(201).json({
      message: 'Interview created successfully',
      interview
    });
  } catch (error) {
    console.error('Create interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user interviews
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { userId: req.userId };
    if (status) query.status = status;
    
    const interviews = await Interview.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name email');

    const total = await Interview.countDocuments(query);
    
    res.json({
      interviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific interview
router.get('/:id', authenticate, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json(interview);
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update interview
router.put('/:id', authenticate, async (req, res) => {
  try {
    const updates = req.body;
    
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json({
      message: 'Interview updated successfully',
      interview
    });
  } catch (error) {
    console.error('Update interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete interview
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const { scores, feedback, duration } = req.body;
    
    const interview = await Interview.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      {
        $set: {
          status: 'completed',
          scores,
          feedback,
          duration,
          completedAt: new Date()
        }
      },
      { new: true }
    );

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Update user stats
    await User.findByIdAndUpdate(req.userId, {
      $inc: {
        interviewsCompleted: 1,
        totalScore: scores.overall || 0
      }
    });

    res.json({
      message: 'Interview completed successfully',
      interview
    });
  } catch (error) {
    console.error('Complete interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interview statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const stats = await Interview.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: null,
          totalInterviews: { $sum: 1 },
          completedInterviews: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageScore: { $avg: '$scores.overall' },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    const recentInterviews = await Interview.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type difficulty scores createdAt status');

    res.json({
      stats: stats[0] || {
        totalInterviews: 0,
        completedInterviews: 0,
        averageScore: 0,
        totalDuration: 0
      },
      recentInterviews
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;