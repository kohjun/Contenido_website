// routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID; // Your Kakao REST API Key
const LOGOUT_REDIRECT_URI = 'http://localhost:3000/auth/final-logout'; // URI after Kakao logout

router.get('/kakao', passport.authenticate('kakao'));

router.get('/kakao/callback', passport.authenticate('kakao', { failureRedirect: '/' }), async (req, res) => {
    const profile = req.user;
    const kakaoId = profile.id;
    const displayName = profile.displayName;
    const profileImage = profile._json.properties.profile_image;

    let user = await User.findOne({ kakaoId });
    if (!user) {
        // Example: Assign role based on display name or profile image
        const role = (displayName === 'Admin Name' && profileImage === 'Admin Profile Image URL') ? 'staff' : 'participant';
        
        user = new User({ kakaoId, displayName, profileImage, isVerified: true, role });
        await user.save();
    }

    res.redirect('/events.html');
});

// Route to initiate logout
router.get('/logout', (req, res) => {
    // Redirect to Kakao's logout endpoint
    const kakaoLogoutUrl = `https://kauth.kakao.com/oauth/logout?client_id=${KAKAO_CLIENT_ID}&logout_redirect_uri=${LOGOUT_REDIRECT_URI}`;
    res.redirect(kakaoLogoutUrl);
});

// Final local logout route after Kakao logout
router.get('/final-logout', (req, res, next) => {
    req.logOut((err) => {
        if (err) { return next(err); }

        // Destroy the session completely
        req.session.destroy((err) => {
            if (err) { return next(err); }

            // Redirect to the login page
            res.redirect('/index.html');
        });
    });
});
router.get('/user-role', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ role: req.user.role });
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
});
module.exports = router;
