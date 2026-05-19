const mongoose = require('mongoose');

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed'];
const PROJECT_COLORS = ['zinc', 'blue', 'violet', 'emerald', 'amber', 'rose'];

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: 'planning',
    },
    color: {
      type: String,
      enum: PROJECT_COLORS,
      default: 'blue',
    },
    icon: {
      type: String,
      default: 'folder-kanban',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ workspaceId: 1, createdAt: -1 });

projectSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    title: this.title,
    description: this.description,
    workspaceId: this.workspaceId.toString(),
    createdBy: this.createdBy.toString(),
    members: this.members.map((m) => ({
      id: m._id.toString(),
      user: m.user.toString(),
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    status: this.status,
    color: this.color,
    icon: this.icon,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
module.exports.PROJECT_STATUSES = PROJECT_STATUSES;
module.exports.PROJECT_COLORS = PROJECT_COLORS;
