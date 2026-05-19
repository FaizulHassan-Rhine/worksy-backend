const mongoose = require('mongoose');

const NOTE_TYPES = ['personal', 'project', 'workspace'];

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      default: '',
      maxlength: [50000, 'Content cannot exceed 50000 characters'],
    },
    type: {
      type: String,
      enum: NOTE_TYPES,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ workspaceId: 1, type: 1, updatedAt: -1 });

noteSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    title: this.title,
    content: this.content,
    type: this.type,
    workspaceId: this.workspaceId.toString(),
    projectId: this.projectId ? this.projectId.toString() : null,
    createdBy: this.createdBy.toString(),
    isPrivate: this.isPrivate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
module.exports.NOTE_TYPES = NOTE_TYPES;
