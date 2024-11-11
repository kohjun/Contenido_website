  // routes/user.js
  const express = require('express');
  const router = express.Router();
  const authenticateToken = require('../middleware/authMiddleware');
  const User = require('../models/User'); // Ensure User model is imported

  // Route to get user information
  router.get('/info', authenticateToken, (req, res) => {
    console.log('User from JWT:', req.user); // Log the user object to see its contents

    if (req.user) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');

      // Provide profileImage with a default fallback
      res.json({
        id: req.user.id, // User ID 반환
        nickname: req.user.displayName,
        email: req.user.email,
        role: req.user.role,
        profileImage: req.user.profileImage || '/images/basic_Image.png'
      });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });

  // Get all verified users with status for weekly participation
  router.get('/participants/users', async (req, res) => {
    try {
      const users = await User.find({ isVerified: true });
      const userData = users.map(user => ({
        id: user._id,
        displayName: user.displayName,
        profileImage: user.profileImage || '/images/basic_Image.png',
        status: user.status || { week1: 'X', week2: 'X', week3: 'X', week4: 'X' },
      }));
      res.json(userData);
    } catch (error) {
      console.error('Error fetching users:', error.message);
      res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
  });

  // Check the authenticated user's role
  router.get('/user-role', authenticateToken, (req, res) => {
    console.log('Authenticated user role:', req.user?.role);

    if (req.user) {
      res.json({ role: req.user.role });
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  });


 

  module.exports = router;