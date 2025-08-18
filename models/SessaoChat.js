import mongoose from 'mongoose';

const sessaoChatSchema = new mongoose.Schema({
    messages: Array,
    createdAt: { type: Date, default: Date.now },
    titulo: { type: String, default: 'Conversa Sem Título', trim: true }
});

export default mongoose.model("SessaoChat", sessaoChatSchema);

