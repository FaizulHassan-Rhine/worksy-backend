const mongoose = require('mongoose');

const ACTIVITY_ACTIONS = [
  'task_created',
  'task_updated',
  'task_deleted',
  'task_status_changed',
  'task_assigned',
  'project_created',
  'project_updated',
  'project_deleted',
  'note_created',
  'note_updated',
  'note_deleted',
  'file_uploaded',
  'file_deleted',
];

const ACTIVITY_ENTITY_TYPES = ['task', 'project', 'note', 'file', 'workspace', 'system'];

const activitySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ACTIVITY_ENTITY_TYPES,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [160, 'Title cannot exceed 160 characters'],
    },
    details: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Details cannot exceed 500 characters'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

activitySchema.index({ workspaceId: 1, createdAt: -1 });
activitySchema.index({ workspaceId: 1, actorId: 1, createdAt: -1 });

activitySchema.methods.toSafeObject = function toSafeObject(actor = null) {
  return {
    id: this._id.toString(),
    workspaceId: this.workspaceId.toString(),
    actor: actor
      ? {
          id: actor._id.toString(),
          name: actor.name,
          email: actor.email,
          avatar: actor.avatar || '',
        }
      : { id: this.actorId.toString(), name: null, email: null, avatar: '' },
    action: this.action,
    entityType: this.entityType,
    entityId: this.entityId.toString(),
    title: this.title,
    details: this.details,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
module.exports.ACTIVITY_ACTIONS = ACTIVITY_ACTIONS;
module.exports.ACTIVITY_ENTITY_TYPES = ACTIVITY_ENTITY_TYPES;
