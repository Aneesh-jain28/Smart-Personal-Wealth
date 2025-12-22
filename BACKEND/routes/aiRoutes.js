const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiController = require('../controllers/aiController');

// All AI routes require authentication
router.post('/chat', protect, aiController.chat);

module.exports = router;
