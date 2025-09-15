import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    systemInstruction: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('SystemConfig', systemConfigSchema);

