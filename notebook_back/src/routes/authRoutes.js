const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.profile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/avatar', authMiddleware, authController.uploadAvatar);
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
