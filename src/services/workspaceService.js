const Workspace = require('../models/Workspace');
const { generateUniqueSlug } = require('../utils/generateSlug');

const createPersonalWorkspace = async (user) => {
  const existing = await Workspace.findOne({
    owner: user._id,
    type: 'personal',
  });

  if (existing) {
    return existing;
  }

  const name = 'Personal';
  const slug = await generateUniqueSlug(Workspace, `${user.name}-personal`);

  return Workspace.create({
    name,
    slug,
    type: 'personal',
    owner: user._id,
    members: [{ user: user._id, role: 'owner' }],
  });
};

const getMemberRole = (workspace, userId) => {
  if (workspace.owner.toString() === userId.toString()) {
    return 'owner';
  }

  const member = workspace.members.find((m) => m.user.toString() === userId.toString());
  return member?.role || null;
};

const canAccessWorkspace = (workspace, userId) => {
  return Boolean(getMemberRole(workspace, userId));
};

const canManageWorkspace = (workspace, userId) => {
  const role = getMemberRole(workspace, userId);
  return role === 'owner' || role === 'admin';
};

const getMemberById = (workspace, memberId) => {
  return workspace.members.id(memberId);
};

const isWorkspaceOwner = (workspace, userId) => {
  return workspace.owner.toString() === userId.toString();
};

const getAssignableRoles = (actorRole) => {
  if (actorRole === 'owner') return ['admin', 'member', 'viewer'];
  if (actorRole === 'admin') return ['member', 'viewer'];
  return [];
};

const canInviteToWorkspace = (workspace, userId) => {
  if (workspace.type !== 'team') return false;
  return canManageWorkspace(workspace, userId);
};

const canAssignRole = (actorRole, targetRole) => {
  return getAssignableRoles(actorRole).includes(targetRole);
};

const canManageTargetMember = (workspace, actorId, targetMember) => {
  if (!targetMember) return false;
  if (isWorkspaceOwner(workspace, targetMember.user)) return false;

  const actorRole = getMemberRole(workspace, actorId);
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin') {
    return targetMember.role === 'member' || targetMember.role === 'viewer';
  }
  return false;
};

const formatMembersWithUsers = async (workspace, User) => {
  const userIds = workspace.members.map((m) => m.user);
  const users = await User.find({ _id: { $in: userIds } }).sort({ name: 1 });
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  return workspace.members.map((member) => {
    const user = userMap.get(member.user.toString());
    const isOwner = isWorkspaceOwner(workspace, member.user);

    return {
      id: member._id.toString(),
      userId: member.user.toString(),
      name: user?.name || 'Unknown',
      email: user?.email || '',
      avatar: user?.avatar || '',
      role: isOwner ? 'owner' : member.role,
      joinedAt: member.joinedAt,
      isOwner,
    };
  });
};

module.exports = {
  createPersonalWorkspace,
  getMemberRole,
  canAccessWorkspace,
  canManageWorkspace,
  getMemberById,
  isWorkspaceOwner,
  getAssignableRoles,
  canInviteToWorkspace,
  canAssignRole,
  canManageTargetMember,
  formatMembersWithUsers,
};
