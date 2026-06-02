const mongoose = require('mongoose');

const NOTIFICATION_TYPES = ['task_assigned', 'task_due_today', 'task_overdue'];
const ENTITY_TYPES = ['task', 'project', 'note', 'file', 'workspace', 'system'];

const notificationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    entityType: {
      type: String,
      enum: ENTITY_TYPES,
      default: 'system',
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
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

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, workspaceId: 1, createdAt: -1 });

notificationSchema.methods.toSafeObject = function toSafeObject(actor = null) {
  return {
    id: this._id.toString(),
    workspaceId: this.workspaceId.toString(),
    userId: this.userId.toString(),
    actor: actor
      ? {
          id: actor._id.toString(),
          name: actor.name,
          email: actor.email,
          avatar: actor.avatar || '',
        }
      : this.actorId
        ? { id: this.actorId.toString(), name: null, email: null, avatar: '' }
        : null,
    type: this.type,
    title: this.title,
    message: this.message,
    entityType: this.entityType,
    entityId: this.entityId ? this.entityId.toString() : null,
    isRead: this.isRead,
    readAt: this.readAt,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
module.exports.ENTITY_TYPES = ENTITY_TYPES;
