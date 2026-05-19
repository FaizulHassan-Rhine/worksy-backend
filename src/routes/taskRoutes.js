const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { loadTask, requireTaskEdit } = require('../middlewares/taskMiddleware');
const {
  createTask,
  getTodayTasks,
  getTasks,
  getTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
} = require('../controllers/taskController');

const router = express.Router();

router.use(protect);

router.get('/today', getTodayTasks);

router.route('/').get(getTasks).post(createTask);

router
  .route('/:id')
  .get(loadTask, getTask)
  .patch(loadTask, requireTaskEdit, updateTask)
  .delete(loadTask, requireTaskEdit, deleteTask);

router.patch('/:id/status', loadTask, requireTaskEdit, updateTaskStatus);
router.patch('/:id/assign', loadTask, requireTaskEdit, assignTask);

module.exports = router;
