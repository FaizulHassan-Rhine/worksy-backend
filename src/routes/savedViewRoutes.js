const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  getSavedViews,
  createSavedView,
  updateSavedView,
  deleteSavedView,
} = require('../controllers/savedViewController');

const router = express.Router();

router.use(protect);

router.route('/').get(getSavedViews).post(createSavedView);
router.route('/:id').patch(updateSavedView).delete(deleteSavedView);

module.exports = router;
