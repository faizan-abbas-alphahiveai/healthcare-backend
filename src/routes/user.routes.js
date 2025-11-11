const express = require('express');
const userControllers=require('../controllers/user.controller.js');
const { authenticateToken } = require('../middleware/auth.middleware.js');


const router = express.Router();

// New signup OTP flow
router.post('/register', userControllers.registerUser); // Replaces old /register
router.post('/verify-signup-otp', userControllers.verifySignupOTP); // No token needed
router.post('/resend-otp', userControllers.resendOtp);
 
// Multer handled in controller

router.post('/login', userControllers.loginUser);
router.post('/refresh-token', userControllers.refreshToken);
router.post('/logout', userControllers.logoutUser);

// Password reset routes (no authentication required)
router.post('/forgot-password', userControllers.resetPassword);
router.post('/reset-password', userControllers.setNewPassword);



router.get('/', authenticateToken, userControllers.getUserById);

router.post('/verify-otp', userControllers.verifyOTP);
router.use(authenticateToken);
router.get('/generate-otp', userControllers.generateOtp);










// Restaurant specific routes
// router.get('/restaurant/:id', userControllers.getRestaurantById);
// router.get('/restaurants', userControllers.getAllRestaurants);
// router.get('/search/restaurants', userControllers.searchRestaurants);

module.exports = router;