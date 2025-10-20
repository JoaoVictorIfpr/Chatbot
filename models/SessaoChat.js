import mongoose from 'mongoose';

const MessagePartSchema = new mongoose.Schema(
  {
    text: { type: String, default: '' },
    functionCall: {
      name: { type: String },
      args: { type: mongoose.Schema.Types.Mixed },
    },
    functionResponse: {
      name: { type: String },
      response: { type: mongoose.Schema.Types.Mixed },
    },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'model', 'function'], required: true },
    parts: { type: [MessagePartSchema], default: [] },
    timestamp: { type: Number },
  },
  { _id: false }
);

const sessaoChatSchema = new mongoose.Schema(
  {
    messages: { type: [MessageSchema], default: [] },
    titulo: { type: String, default: 'Conversa Sem Título', trim: true },
    userId: { type: String, index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.model('SessaoChat', sessaoChatSchema);

