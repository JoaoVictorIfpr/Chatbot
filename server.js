import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "@dotenvx/dotenvx";
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configurar dotenv para carregar variáveis de ambiente
dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Verificar se a chave API existe
const GEMINI_API_KEY = process.env.GEMINI_APIKEY;

if (!GEMINI_API_KEY) {
  console.error("ERRO: Chave API do Gemini não encontrada!");
  console.error("Por favor, crie um arquivo .env na raiz do projeto com o seguinte conteúdo:");
  console.error("GEMINI_APIKEY=sua_chave_api_aqui");
  process.exit(1); // Encerrar o aplicativo se a chave não estiver definida
}

// Inicializar o cliente do Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Definição das funções que o chatbot pode usar
function getCurrentTime() {
  console.log("Executando getCurrentTime");
  return { 
    currentTime: new Date().toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo' 
    }) 
  };
}

// Função para buscar informações sobre o clima
async function getWeather(args) {
  console.log("Executando getWeather com args:", args);
  const location = args.location;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return { error: "Chave da API OpenWeatherMap não configurada." };
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric&lang=pt_br`;
  
  try {
    const response = await axios.get(url);
    return {
      location: response.data.name,
      temperature: response.data.main.temp,
      description: response.data.weather[0].description
    };
  } catch (error) {
    console.error("Erro ao chamar OpenWeatherMap:", error.response?.data || error.message);
    return { error: error.response?.data?.message || "Não foi possível obter o tempo." };
  }
}

// Mapeamento de funções disponíveis
const availableFunctions = {
  getCurrentTime: getCurrentTime,
  getWeather: getWeather
};

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
    
    // Definir as ferramentas disponíveis para o modelo
    const tools = [{
      functionDeclarations: [
        {
          name: "getCurrentTime",
          description: "Obtém a data e hora atuais no Brasil.",
          parameters: { 
            type: "object", 
            properties: {} // Sem parâmetros necessários
          }
        },
        {
          name: "getWeather",
          description: "Obtém a previsão do tempo atual para uma cidade específica.",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "A cidade para a qual obter a previsão do tempo (ex: 'Curitiba, BR')."
              }
            },
            required: ["location"]
          }
        }
      ]
    }];
    
    // Configurar o modelo com as ferramentas
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      tools: tools
    });
    
    // Lidar com o histórico de conversas - CORREÇÃO AQUI
    let processedHistory = [];
    if (history && history.length > 0) {
      // Convertemos o histórico para o formato que o Gemini espera
      for (const msg of history) {
        // Pular mensagens sem role ou parts
        if (!msg.role || !msg.parts) continue;
        
        const role = msg.role === "user" ? "user" : 
                     msg.role === "model" ? "model" : 
                     msg.role === "function" ? "function" : null;
        
        if (!role) continue; // Pular se não for um papel reconhecido
        
        // Criar uma nova entrada processada
        const processedMsg = { role };
        
        // Lidar com diferentes tipos de parts
        if (msg.parts[0].text) {
          processedMsg.parts = [{ text: msg.parts[0].text }];
          processedHistory.push(processedMsg);
        }
        else if (msg.parts[0].functionCall) {
          processedMsg.parts = [{
            functionCall: {
              name: msg.parts[0].functionCall.name,
              args: msg.parts[0].functionCall.args
            }
          }];
          processedHistory.push(processedMsg);
        }
        else if (msg.parts[0].functionResponse) {
          processedMsg.parts = [{
            functionResponse: {
              name: msg.parts[0].functionResponse.name,
              response: msg.parts[0].functionResponse.response
            }
          }];
          processedHistory.push(processedMsg);
        }
      }
    }
    
    console.log("Histórico processado:", JSON.stringify(processedHistory));
    
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

Se o usuário perguntar sobre data, hora ou clima, você pode usar as ferramentas disponíveis para buscar essas informações.
quando te perguntarem o clima, pergunte de qual cidade a pessoa quer.
Agora, receba a dúvida do jogador:
"${message}"
    `;

    // Decidir se usamos chat baseado em histórico ou geração simples
    let resposta = "";
    
    if (processedHistory.length > 0) {
      console.log("Iniciando chat com histórico processado");
      
      try {
        const chat = model.startChat({
          history: processedHistory,
          generationConfig: {
            temperature: 0.9,
          }
        });
      
        const result = await chat.sendMessage(message);
        
        // Verificar chamadas de função
        let functionCalls = [];
        if (result.response.functionCalls && result.response.functionCalls().length > 0) {
          const functionCall = result.response.functionCalls()[0];
          const functionName = functionCall.name;
          const functionArgs = functionCall.args;
          
          console.log(`Chamada de função detectada: ${functionName}`, functionArgs);
          
          // Executar a função
          const functionToCall = availableFunctions[functionName];
          let functionResult;
          
          if (functionName === 'getWeather') {
            functionResult = await functionToCall(functionArgs);
          } else {
            functionResult = functionToCall(functionArgs);
          }
          
          functionCalls.push({
            name: functionName,
            args: functionArgs,
            response: functionResult
          });
          
          // Enviar o resultado de volta
          const resultFromFunctionCall = await chat.sendMessage([
            {
              functionResponse: {
                name: functionName,
                response: functionResult
              }
            }
          ]);
          
          resposta = resultFromFunctionCall.response.text();
        } else {
          resposta = result.response.text();
        }
        
        // Incluir chamadas de função na resposta, se houver
        if (functionCalls.length > 0) {
          res.json({ 
            response: resposta,
            functionCalls: functionCalls
          });
        } else {
          res.json({ response: resposta });
        }
      } catch (error) {
        console.error("Erro no modo chat:", error);
        // Log detalhado do erro para depuração
        if (error.response) {
          console.error("Erro da API:", error.response.data);
        }
        
        // Fallback para geração de conteúdo simples
        console.log("Tentando fallback para geração simples sem histórico");
        try {
          const result = await model.generateContent(fullPrompt);
          resposta = result.response.text();
          res.json({ response: resposta });
        } catch (fallbackError) {
          console.error("Erro no fallback:", fallbackError);
          res.status(500).json({ 
            error: "Erro ao gerar resposta: " + error.message,
            tip: "Verificar logs do servidor para mais detalhes"
          });
        }
      }
    } else {
      console.log("Usando geração simples sem histórico");
      const result = await model.generateContent(fullPrompt);
      resposta = result.response.text();
      res.json({ response: resposta });
    }
    
  } catch (error) {
    console.error("Erro detalhado:", error);
    res.status(500).json({ 
      error: "Erro ao gerar resposta: " + error.message,
      tip: "Verifique se a chave API do Gemini está correta no arquivo .env"
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Chave API do Gemini: ${GEMINI_API_KEY ? "✓ Configurada" : "✗ Não configurada"}`);
});