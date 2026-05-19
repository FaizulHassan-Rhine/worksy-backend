const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { getDashboardStats } = require('../controllers/dashboardController');

const router = express.Router();

router.use(protect);

router.get('/stats', getDashboardStats);

module.exports = router;
