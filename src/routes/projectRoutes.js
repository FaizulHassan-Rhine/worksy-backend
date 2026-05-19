const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { loadProject, requireProjectEdit } = require('../middlewares/projectMiddleware');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');

const router = express.Router();

router.use(protect);

router.route('/').get(getProjects).post(createProject);

router
  .route('/:id')
  .get(loadProject, getProject)
  .patch(loadProject, requireProjectEdit, updateProject)
  .delete(loadProject, requireProjectEdit, deleteProject);

module.exports = router;
