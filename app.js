// Load environment variables
require('dotenv').config();

// Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const app = express();
const path = require('path');


// Passport configuration
require('./config/passportConfig')(passport);

// Middleware setup
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((error) => console.error('MongoDB connection error:', error));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
}));   

// Passport middleware initialization
app.use(passport.initialize());
app.use(passport.session());

// Route handlers
app.use('/auth', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/user', require('./routes/user'));
app.use('/reviews', require('./routes/reviews'));

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on https://www.contenido.kr:${PORT}`);
});

