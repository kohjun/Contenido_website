// routes/user.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authMiddleware'); // Middleware to verify JWT token

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
      nickname: req.user.displayName,
      email: req.user.email,
      role: req.user.role,
      profileImage: req.user.profileImage || '/images/basic_Image.png' // Default to basic image
    });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});




router.get('/user-role', authenticateToken, (req, res) => {
  console.log('Authenticated user role:', req.user?.role); // Log the user's role for debugging

  if (req.user) {
    res.json({ role: req.user.role });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
});

module.exports = router;
