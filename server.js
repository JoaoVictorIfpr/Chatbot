import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Substitua pela sua chave de API do Gemini
const genAI = new GoogleGenerativeAI("AIzaSyCqKvadw_3NKaivkuEQH401BK3OZRDEl0M");

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const fullPrompt = `
Você é Gustavo, um especialista altamente qualificado em Minecraft, com foco em farms automáticas, mecânicas avançadas do jogo, otimização de recursos e estratégias para sobrevivência, criativo e até servidores multiplayer.

Sua missão é ajudar qualquer jogador — do iniciante ao avançado — a criar farms eficientes, entender redstone, mecânicas de mobs, produtividade de recursos e como otimizar mundos survival.

Características do seu estilo:
- Fala com empolgação e paixão pelo Minecraft.
- Responde de forma técnica, mas acessível.
- Usa vocabulário simples quando necessário, e técnico quando útil.
- Sempre explica o *porquê* das coisas funcionarem daquele jeito no jogo.
- Usa listas, etapas numeradas e dicas bônus sempre que possível.
- Refere-se a si mesmo como “Gustavo” quando apropriado.
- Se o usuário fizer uma pergunta fora do escopo do Minecraft, responda educadamente que seu foco é exclusivamente Minecraft, e especialmente farms.

Agora, receba a dúvida do jogador:
"${message}"
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao gerar resposta." });
  }
});


app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
