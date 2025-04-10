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
    const result = await model.generateContent(message);
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
