const mongoose = require('mongoose');

const MEMBER_ROLES = ['owner', 'admin', 'member', 'viewer'];
const WORKSPACE_TYPES = ['personal', 'team'];

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: MEMBER_ROLES,
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: WORKSPACE_TYPES,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
  },
  {
    timestamps: true,
  }
);

workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.user': 1 });

workspaceSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    type: this.type,
    owner: this.owner,
    members: this.members.map((m) => ({
      id: m._id,
      user: m.user,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

workspaceSchema.statics.findAccessibleByUser = function findAccessibleByUser(userId) {
  return this.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).sort({ createdAt: 1 });
};

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;
module.exports.MEMBER_ROLES = MEMBER_ROLES;
module.exports.WORKSPACE_TYPES = WORKSPACE_TYPES;
