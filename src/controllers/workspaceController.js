const { z } = require('zod');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { generateUniqueSlug } = require('../utils/generateSlug');
const { ok, fail } = require('../utils/apiResponse');
const {
  createPersonalWorkspace,
  getMemberRole,
  canInviteToWorkspace,
  canAssignRole,
  canManageTargetMember,
  getMemberById,
  isWorkspaceOwner,
  formatMembersWithUsers,
} = require('../services/workspaceService');

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  type: z.enum(['personal', 'team']),
});

const updateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).optional(),
});

const inviteSchema = z.object({
  email: z.string().trim().email('Please provide a valid email'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

const roleUpdateSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

const createWorkspace = async (req, res, next) => {
  try {
    const { name, type } = createSchema.parse(req.body);

    if (type === 'personal') {
      const existing = await Workspace.findOne({
        owner: req.user._id,
        type: 'personal',
      });
      if (existing) {
        return fail(res, 400, 'You already have a personal workspace');
      }
    }

    const slug = await generateUniqueSlug(Workspace, name);

    const workspace = await Workspace.create({
      name,
      slug,
      type,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
    });

    return ok(res, { workspace: workspace.toSafeObject() }, 'Workspace created', 201);
  } catch (error) {
    next(error);
  }
};

const getWorkspaces = async (req, res, next) => {
  try {
    let workspaces = await Workspace.findAccessibleByUser(req.user._id);

    if (workspaces.length === 0) {
      await createPersonalWorkspace(req.user);
      workspaces = await Workspace.findAccessibleByUser(req.user._id);
    }

    return ok(
      res,
      { workspaces: workspaces.map((w) => w.toSafeObject()) },
      'Workspaces fetched'
    );
  } catch (error) {
    next(error);
  }
};

const getWorkspace = async (req, res) => {
  return ok(res, { workspace: req.workspace.toSafeObject() }, 'Workspace fetched');
};

const updateWorkspace = async (req, res, next) => {
  try {
    const { name } = updateSchema.parse(req.body);

    if (name) {
      req.workspace.name = name;
      req.workspace.slug = await generateUniqueSlug(
        Workspace,
        name,
        req.workspace._id
      );
    }

    await req.workspace.save();

    return ok(res, { workspace: req.workspace.toSafeObject() }, 'Workspace updated');
  } catch (error) {
    next(error);
  }
};

const deleteWorkspace = async (req, res, next) => {
  try {
    if (getMemberRole(req.workspace, req.user._id) !== 'owner') {
      return fail(res, 403, 'Only the workspace owner can delete');
    }

    if (req.workspace.type === 'personal') {
      return fail(res, 400, 'Personal workspace cannot be deleted');
    }

    await req.workspace.deleteOne();

    return ok(res, null, 'Workspace deleted');
  } catch (error) {
    next(error);
  }
};

const getWorkspaceMembers = async (req, res, next) => {
  try {
    const members = await formatMembersWithUsers(req.workspace, User);
    const currentUserRole = getMemberRole(req.workspace, req.user._id);

    return ok(
      res,
      {
        members,
        currentUserRole,
        canManage: canInviteToWorkspace(req.workspace, req.user._id),
      },
      'Workspace members fetched'
    );
  } catch (error) {
    next(error);
  }
};

const inviteMember = async (req, res, next) => {
  try {
    if (!canInviteToWorkspace(req.workspace, req.user._id)) {
      return fail(res, 403, 'You do not have permission to invite members');
    }

    const { email, role } = inviteSchema.parse(req.body);
    const actorRole = getMemberRole(req.workspace, req.user._id);

    if (!canAssignRole(actorRole, role)) {
      return fail(res, 403, 'You cannot assign this role');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return fail(res, 404, 'No user found with this email. They must register first.');
    }

    const alreadyMember = req.workspace.members.some(
      (m) => m.user.toString() === user._id.toString()
    );
    if (alreadyMember) {
      return fail(res, 400, 'User is already a member of this workspace');
    }

    req.workspace.members.push({ user: user._id, role });
    await req.workspace.save();

    const members = await formatMembersWithUsers(req.workspace, User);

    return ok(res, { members }, 'Member invited', 201);
  } catch (error) {
    next(error);
  }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = roleUpdateSchema.parse(req.body);
    const member = getMemberById(req.workspace, req.params.memberId);

    if (!member) {
      return fail(res, 404, 'Member not found');
    }

    if (isWorkspaceOwner(req.workspace, member.user)) {
      return fail(res, 400, 'Cannot change the workspace owner role');
    }

    const actorRole = getMemberRole(req.workspace, req.user._id);
    if (!canAssignRole(actorRole, role)) {
      return fail(res, 403, 'You cannot assign this role');
    }

    if (!canManageTargetMember(req.workspace, req.user._id, member)) {
      return fail(res, 403, 'You do not have permission to manage this member');
    }

    member.role = role;
    await req.workspace.save();

    const members = await formatMembersWithUsers(req.workspace, User);

    return ok(res, { members }, 'Member role updated');
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const member = getMemberById(req.workspace, req.params.memberId);

    if (!member) {
      return fail(res, 404, 'Member not found');
    }

    if (isWorkspaceOwner(req.workspace, member.user)) {
      return fail(res, 400, 'Cannot remove the workspace owner');
    }

    if (!canManageTargetMember(req.workspace, req.user._id, member)) {
      const isSelf = member.user.toString() === req.user._id.toString();
      if (!isSelf) {
        return fail(res, 403, 'You do not have permission to remove this member');
      }
      return fail(res, 400, 'You cannot remove yourself. Ask an admin to remove you.');
    }

    member.deleteOne();
    await req.workspace.save();

    const members = await formatMembersWithUsers(req.workspace, User);

    return ok(res, { members }, 'Member removed');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
};
