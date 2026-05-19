const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
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
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ workspaceId: 1, projectId: 1, recipientId: 1, createdAt: -1 });

messageSchema.methods.toSafeObject = function toSafeObject(senderUser, fileDoc) {
  const sender = senderUser || this.sender;
  const senderObj =
    sender && typeof sender === 'object' && sender.name
      ? {
          id: sender._id.toString(),
          name: sender.name,
          email: sender.email,
          avatar: sender.avatar || '',
        }
      : {
          id: this.sender.toString(),
          name: 'Unknown',
          email: '',
          avatar: '',
        };

  const file = fileDoc || this.fileId;
  let fileObj = null;
  if (file && typeof file === 'object' && file.fileName) {
    fileObj = file.toSafeObject ? file.toSafeObject() : {
      id: file._id.toString(),
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      fileCategory: file.fileCategory,
      fileSize: file.fileSize,
    };
  }

  return {
    id: this._id.toString(),
    workspaceId: this.workspaceId.toString(),
    projectId: this.projectId ? this.projectId.toString() : null,
    recipientId: this.recipientId ? this.recipientId.toString() : null,
    sender: senderObj,
    content: this.content,
    file: fileObj,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
