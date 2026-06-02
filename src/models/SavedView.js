const mongoose = require('mongoose');

const MODULES = ['tasks', 'daily_tasks', 'notes', 'files'];

const savedViewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    module: {
      type: String,
      enum: MODULES,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    display: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

savedViewSchema.index({ userId: 1, workspaceId: 1, module: 1, createdAt: -1 });
savedViewSchema.index({ userId: 1, workspaceId: 1, module: 1, name: 1 }, { unique: true });

savedViewSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    workspaceId: this.workspaceId.toString(),
    module: this.module,
    name: this.name,
    filters: this.filters || {},
    display: this.display || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const SavedView = mongoose.model('SavedView', savedViewSchema);

module.exports = SavedView;
module.exports.SAVED_VIEW_MODULES = MODULES;
