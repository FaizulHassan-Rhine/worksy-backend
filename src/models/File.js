const mongoose = require('mongoose');

const FILE_CATEGORIES = ['image', 'pdf', 'document', 'archive', 'other'];

const fileSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileCategory: {
      type: String,
      enum: FILE_CATEGORIES,
      default: 'other',
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.index({ workspaceId: 1, createdAt: -1 });

fileSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    fileName: this.fileName,
    fileUrl: this.fileUrl,
    fileType: this.fileType,
    fileCategory: this.fileCategory,
    fileSize: this.fileSize,
    uploadedBy: this.uploadedBy.toString(),
    workspaceId: this.workspaceId.toString(),
    projectId: this.projectId ? this.projectId.toString() : null,
    taskId: this.taskId ? this.taskId.toString() : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const File = mongoose.model('File', fileSchema);

module.exports = File;
module.exports.FILE_CATEGORIES = FILE_CATEGORIES;
