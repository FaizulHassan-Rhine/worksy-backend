const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { getMessages, createMessage } = require('../controllers/messageController');

const router = express.Router();

router.use(protect);

router.route('/').get(getMessages).post(createMessage);

module.exports = router;
