import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "@dotenvx/dotenvx";

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_APIKEY);

app.post("/chat", async (req, res) => {
  try {
    // Log do corpo da requisição completo para depuração
    console.log("Corpo da requisição recebido:", JSON.stringify(req.body));
    
    // Extrair mensagem e histórico do corpo da requisição
    const { message, history } = req.body;
    
    // Verificar se há uma mensagem válida
    if (!message) {
      return res.status(400).json({ error: "Mensagem ausente na requisição" });
    }
    
    console.log("Mensagem recebida:", message);
    console.log("Histórico recebido:", history && history.length ? `${history.length} mensagens` : "nenhum");
    
    // Configurar o modelo
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Se temos histórico, usar o modo de chat
    if (history && history.length > 0) {
      // CORREÇÃO: Filtrar o histórico para garantir que a primeira mensagem seja do usuário
      let geminiHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts[0].text }]
      }));
      
      // Se o primeiro item for do modelo, remova-o
      if (geminiHistory.length > 0 && geminiHistory[0].role === "model") {
        geminiHistory = geminiHistory.slice(1);
      }
      
      // Se não sobrou histórico, vamos tratar como primeira mensagem
      if (geminiHistory.length === 0) {
        console.log("Histórico vazio após filtro, usando prompt inicial");
        
        const fullPrompt = `
Você é Gustavo, um especialista altamente qualificado em Minecraft, com foco em farms automáticas, mecânicas avançadas do jogo, otimização de recursos e estratégias para sobrevivência, criativo e até servidores multiplayer.

Sua missão é ajudar qualquer jogador — do iniciante ao avançado — a criar farms eficientes, entender redstone, mecânicas de mobs, produtividade de recursos e como otimizar mundos survival.

Características do seu estilo:
- Fala com empolgação e paixão pelo Minecraft.
- Responde de forma técnica, mas acessível.
- Usa vocabulário simples quando necessário, e técnico quando útil.
- Sempre explica o *porquê* das coisas funcionarem daquele jeito no jogo.
- Usa listas, etapas numeradas e dicas bônus sempre que possível.
- Refere-se a si mesmo como "Gustavo" quando apropriado.
- Se o usuário fizer uma pergunta fora do escopo do Minecraft, responda educadamente que seu foco é exclusivamente Minecraft, e especialmente farms.

Agora, receba a dúvida do jogador:
"${message}"
        `;
        
        const result = await model.generateContent(fullPrompt);
        const text = result.response.text();
        
        console.log("Resposta do modelo:", text.substring(0, 100) + "...");
        res.json({ response: text });
        return;
      }
      
      console.log("Iniciando chat com histórico de", geminiHistory.length, "mensagens");
      
      // Iniciar o chat com o histórico filtrado
      const chat = model.startChat({
        history: geminiHistory,
        generationConfig: {
          temperature: 0.9,
        }
      });
      
      // Enviar a mensagem atual do usuário
      console.log("Enviando mensagem para o chat:", message);
      const result = await chat.sendMessage(message);
      const text = result.response.text();
      
      console.log("Resposta do modelo:", text.substring(0, 100) + "...");
      res.json({ response: text });
    } else {
      // Se for a primeira mensagem, usar o prompt completo
      console.log("Primeira mensagem, usando prompt inicial");
      
      const fullPrompt = `
Você é Gustavo, um especialista altamente qualificado em Minecraft, com foco em farms automáticas, mecânicas avançadas do jogo, otimização de recursos e estratégias para sobrevivência, criativo e até servidores multiplayer.

Sua missão é ajudar qualquer jogador — do iniciante ao avançado — a criar farms eficientes, entender redstone, mecânicas de mobs, produtividade de recursos e como otimizar mundos survival.

Características do seu estilo:
- Fala com empolgação e paixão pelo Minecraft.
- Responde de forma técnica, mas acessível.
- Usa vocabulário simples quando necessário, e técnico quando útil.
- Sempre explica o *porquê* das coisas funcionarem daquele jeito no jogo.
- Usa listas, etapas numeradas e dicas bônus sempre que possível.
- Refere-se a si mesmo como "Gustavo" quando apropriado.
- Se o usuário fizer uma pergunta fora do escopo do Minecraft, responda educadamente que seu foco é exclusivamente Minecraft, e especialmente farms.

Agora, receba a dúvida do jogador:
"${message}"
      `;
      
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      
      console.log("Resposta do modelo:", text.substring(0, 100) + "...");
      res.json({ response: text });
    }
  } catch (error) {
    console.error("Erro detalhado:", error);
    res.status(500).json({ error: "Erro ao gerar resposta: " + error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});