const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  loadWorkspace,
  requireWorkspaceAccess,
  requireWorkspaceManage,
} = require('../middlewares/workspaceMiddleware');
const {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} = require('../controllers/workspaceController');

const router = express.Router();

router.use(protect);

router.route('/').get(getWorkspaces).post(createWorkspace);

router.get('/:id/members', loadWorkspace, requireWorkspaceAccess, getWorkspaceMembers);

router.post('/:id/invite', loadWorkspace, requireWorkspaceManage, inviteMember);
router.patch(
  '/:id/members/:memberId/role',
  loadWorkspace,
  requireWorkspaceManage,
  updateMemberRole
);
router.delete(
  '/:id/members/:memberId',
  loadWorkspace,
  requireWorkspaceManage,
  removeMember
);

router
  .route('/:id')
  .get(loadWorkspace, requireWorkspaceAccess, getWorkspace)
  .patch(loadWorkspace, requireWorkspaceManage, updateWorkspace)
  .delete(loadWorkspace, requireWorkspaceManage, deleteWorkspace);

module.exports = router;
