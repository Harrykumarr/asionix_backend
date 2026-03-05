const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Registration
router.post('/register', authController.register);

// Standard Login
router.post('/login', authController.login);
router.post('/admin-login', authController.adminLogin);

// OTP Flows
router.post('/request-otp', authController.requestOtp);
router.post('/verify-otp', authController.verifyOtp);

// Password Reset
router.post('/reset-password', authController.resetPassword);

module.exports = router;
