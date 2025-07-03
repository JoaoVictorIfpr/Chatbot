import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "@dotenvx/dotenvx";
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Configurar dotenv para carregar variáveis de ambiente
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: 'https://chatbot-omega-lemon.vercel.app' }));
app.use(bodyParser.json());
app.use(express.json()); // Middleware para parsear corpo de requisição JSON

// Servir arquivos estáticos da pasta 'public'
app.use(express.static('public'));

// --- INÍCIO: Fase 3 - Simulação do Ranking ---
// Array para simular o armazenamento de dados de ranking em memória
let dadosRankingVitrine = []; 
// ---------------------------------------------

// Verificar se a chave API existe
const GEMINI_API_KEY = process.env.GEMINI_APIKEY;

if (!GEMINI_API_KEY) {
  console.error("ERRO: Chave API do Gemini não encontrada!");
  console.error("Por favor, crie um arquivo .env na raiz do projeto com o seguinte conteúdo:");
  console.error("GEMINI_APIKEY=sua_chave_api_aqui");
  process.exit(1); // Encerrar o aplicativo se a chave não estiver definida
}

// Configuração do MongoDB
const mongoUri = process.env.MONGO_URI;
let db; // Variável para guardar a referência do banco

// Função para conectar ao MongoDB
async function connectDB() {
    if (db) return db; // Se já conectado, retorna a instância
    if (!mongoUri) {
        console.error("MONGO_URI não definida no .env!");
        console.error("Por favor, adicione MONGO_URI=sua_string_de_conexao_mongodb no arquivo .env");
        return null; 
    }
    // IMPORTANTE: Use a MONGO_URI da atividade que inclui o usuário 'user_log_acess'
    const client = new MongoClient(mongoUri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    try {
        await client.connect();
        // O nome do banco 'IIW2023A_Logs' já está na string de conexão, então db() funciona.
        db = client.db(); 
        console.log("✓ Conectado ao MongoDB Atlas!");
        return db;
    } catch (err) {
        console.error("✗ Falha ao conectar ao MongoDB:", err);
        return null; 
    }
}

// Chamar a função para conectar quando o servidor inicia
connectDB();

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

async function getWeather(args) {
  console.log("Executando getWeather com args:", args);
  const location = args.location;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.error("Chave da API OpenWeatherMap não configurada no .env");
    return { error: "Chave da API OpenWeatherMap não configurada." };
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric&lang=pt_br`;
  
  try {
    const response = await axios.get(url);
    console.log("Resposta da API OpenWeatherMap:", response.data);
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

const availableFunctions = {
  getCurrentTime: getCurrentTime,
  getWeather: getWeather
};

// Endpoint para obter IP e geolocalização do usuário
app.get('/api/user-info', async (req, res) => {
    try {
        let ip = req.headers['x-forwarded-for']?.split(',').shift() || req.socket?.remoteAddress;
        
        if (!ip) {
            return res.status(400).json({ error: "Não foi possível determinar o endereço IP." });
        }

        if (ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }

        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            console.log(`[Servidor] IP local detectado (${ip}), usando IP público de exemplo para teste`);
            ip = '8.8.8.8'; 
        }

        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,city,query`);
        
        if (geoResponse.data.status === 'success') {
            res.json({
                ip: geoResponse.data.query,
                city: geoResponse.data.city,
                country: geoResponse.data.country,
            });
        } else {
            res.status(500).json({ error: geoResponse.data.message || "Erro ao obter geolocalização." });
        }

    } catch (error) {
        console.error("[Servidor] Erro em /api/user-info:", error.message);
        res.status(500).json({ error: "Erro interno ao processar informações do usuário." });
    }
});

// --- ATUALIZADO: Fase 2 - Endpoint de Log ---
// Endpoint para registrar log de conexão no formato da atividade
app.post('/api/log-connection', async (req, res) => {
    if (!db) {
        await connectDB();
        if (!db) return res.status(500).json({ error: "Servidor não conectado ao banco de dados." });
    }

    try {
        const { ip, acao, nomeBot } = req.body; 

        if (!ip || !acao || !nomeBot) {
            return res.status(400).json({ error: "Dados de log incompletos (IP, ação e nome do Bot são obrigatórios)." });
        }

        const agora = new Date();
        const dataFormatada = agora.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const horaFormatada = agora.toTimeString().split(' ')[0]; // Formato HH:MM:SS

        const logEntry = {
            col_data: dataFormatada,
            col_hora: horaFormatada,
            col_IP: ip,
            col_nome_bot: nomeBot,
            col_acao: acao
        };

        const collection = db.collection("tb_cl_user_log_acess"); 
        const result = await collection.insertOne(logEntry);

        console.log('[Servidor] Log de acesso salvo:', result.insertedId);
        res.status(201).json({ message: "Log de acesso salvo com sucesso!", logId: result.insertedId });

    } catch (error) {
        console.error("[Servidor] Erro em /api/log-connection:", error.message);
        res.status(500).json({ error: "Erro interno ao salvar log de acesso." });
    }
});
// ------------------------------------------------

// --- NOVO: Fase 3 - Endpoint de Ranking (Simulado) ---
app.post('/api/ranking/registrar-acesso-bot', (req, res) => {
    const { botId, nomeBot, timestampAcesso, usuarioId } = req.body;

    if (!botId || !nomeBot) {
        return res.status(400).json({ error: "ID e Nome do Bot são obrigatórios para o ranking." });
    }

    const acesso = {
        botId,
        nomeBot,
        usuarioId: usuarioId || 'anonimo',
        acessoEm: timestampAcesso ? new Date(timestampAcesso) : new Date(),
        contagem: 1
    };

    const botExistente = dadosRankingVitrine.find(b => b.botId === botId);
    if (botExistente) {
        botExistente.contagem += 1;
        botExistente.ultimoAcesso = acesso.acessoEm;
    } else {
        dadosRankingVitrine.push({
            botId: botId,
            nomeBot: nomeBot,
            contagem: 1,
            ultimoAcesso: acesso.acessoEm
        });
    }
    
    console.log('[Servidor] Dados de ranking atualizados:', dadosRankingVitrine);
    res.status(201).json({ message: `Acesso ao bot ${nomeBot} registrado para ranking.` });
});

// --- NOVO: Fase 3 - Endpoint para Visualizar Ranking (Opcional) ---
app.get('/api/ranking/visualizar', (req, res) => {
    const rankingOrdenado = [...dadosRankingVitrine].sort((a, b) => b.contagem - a.contagem);
    res.json(rankingOrdenado);
});
// ------------------------------------------------------------


// Endpoint principal do Chatbot (sem alterações)
app.post("/chat", async (req, res) => {
  try {
    console.log("Corpo da requisição recebido:", JSON.stringify(req.body));
    
    const { message, history } = req.body;
    
    if (!message) {
      console.error("Requisição recebida sem mensagem.");
      return res.status(400).json({ error: "Mensagem ausente na requisição" });
    }
    
    console.log("Mensagem recebida:", message);
    console.log("Histórico recebido:", history && history.length ? `${history.length} mensagens` : "nenhum");
    
    const tools = [{
      functionDeclarations: [
        {
          name: "getCurrentTime",
          description: "Obtém a data e hora atuais no Brasil (fuso horário de São Paulo).",
          parameters: { type: "object", properties: {} }
        },
        {
          name: "getWeather",
          description: "Obtém a previsão do tempo atual para uma cidade específica.",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "A cidade e, opcionalmente, o país para a qual obter a previsão do tempo (ex: 'Curitiba, BR', 'London, UK')."
              }
            },
            required: ["location"]
          }
        }
      ]
    }];
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      tools: tools
    });
    
    let processedHistory = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        if (!msg.role || !msg.parts) continue;
        const role = msg.role === "user" ? "user" : 
                     msg.role === "model" ? "model" : 
                     msg.role === "function" ? "function" : null;
        if (!role) continue;
        const processedMsg = { role, parts: [] };
        const partsArray = Array.isArray(msg.parts) ? msg.parts : [msg.parts];
        for (const part of partsArray) {
          if (part.text) {
            processedMsg.parts.push({ text: part.text });
          }
          else if (part.functionCall) {
            processedMsg.parts.push({ functionCall: { name: part.functionCall.name, args: part.functionCall.args } });
          }
          else if (part.functionResponse) {
            processedMsg.parts.push({ functionResponse: { name: part.functionResponse.name, response: part.functionResponse.response } });
          }
        }
        if (processedMsg.parts.length > 0) {
            processedHistory.push(processedMsg);
        }
      }
    }
    
    console.log("Histórico processado para a API:", JSON.stringify(processedHistory));
    
    const fullPrompt = `
Você é Gustavo, um especialista altamente qualificado em Minecraft... (o resto do seu prompt aqui)
"${message}"
    `;

    let resposta = "";
    let finalResponsePayload = {};
    
    if (processedHistory.length > 0) {
      console.log("Iniciando chat com histórico processado");
      try {
        const chat = model.startChat({
          history: processedHistory,
          generationConfig: { temperature: 0.9 }
        });
        const result = await chat.sendMessage(message);
        let functionCallsDetected = [];
        const responseCandidates = result.response.candidates;
        
        if (responseCandidates && responseCandidates[0].content && responseCandidates[0].content.parts) {
            const functionCallPart = responseCandidates[0].content.parts.find(part => part.functionCall);
            
            if (functionCallPart) {
                const functionCall = functionCallPart.functionCall;
                const functionName = functionCall.name;
                const functionArgs = functionCall.args;
                
                console.log(`Chamada de função detectada: ${functionName}`, functionArgs);
                
                const functionToCall = availableFunctions[functionName];
                let functionResult;
                
                if (functionToCall) {
                    if (functionName === 'getWeather') {
                        functionResult = await functionToCall(functionArgs);
                    } else {
                        functionResult = functionToCall(functionArgs);
                    }
                    console.log(`Resultado da função ${functionName}:`, functionResult);
                    functionCallsDetected.push({ name: functionName, args: functionArgs, response: functionResult });
                    
                    const resultFromFunctionCall = await chat.sendMessage([
                        { functionResponse: { name: functionName, response: functionResult } }
                    ]);
                    
                    if (resultFromFunctionCall.response && resultFromFunctionCall.response.text) {
                        resposta = resultFromFunctionCall.response.text();
                    } else {
                        resposta = `Executei a função ${functionName}. Resultado: ${JSON.stringify(functionResult)}`; 
                    }
                } else {
                    console.error(`Função ${functionName} não encontrada!`);
                    resposta = `Desculpe, não encontrei a função ${functionName} para executar.`;
                }
            } else {
                resposta = result.response.text ? result.response.text() : "Não recebi uma resposta textual.";
            }
        } else {
             resposta = result.response.text ? result.response.text() : "Não consegui processar a resposta da IA.";
        }
        
        finalResponsePayload = { response: resposta };
        if (functionCallsDetected.length > 0) {
            finalResponsePayload.functionCalls = functionCallsDetected;
        }
        
      } catch (error) {
        console.error("Erro durante o modo chat:", error);
        if (error.response) {
          console.error("Detalhes do erro da API:", error.response.data);
        }
        
        console.log("Tentando fallback para geração simples sem histórico...");
        try {
          const result = await model.generateContent(fullPrompt);
          resposta = result.response.text ? result.response.text() : "Ocorreu um erro e não consegui gerar uma resposta no fallback.";
          finalResponsePayload = { response: resposta };
        } catch (fallbackError) {
          console.error("Erro no fallback:", fallbackError);
          return res.status(500).json({ 
            error: "Erro ao gerar resposta (fallback): " + fallbackError.message,
            tip: "Verificar logs do servidor para mais detalhes"
          });
        }
      }
    } else {
      console.log("Usando geração simples sem histórico");
      try {
          const result = await model.generateContent(fullPrompt);
          resposta = result.response.text ? result.response.text() : "Não recebi uma resposta textual inicial.";
          finalResponsePayload = { response: resposta };
      } catch (genError) {
          console.error("Erro na geração simples:", genError);
          return res.status(500).json({ 
            error: "Erro ao gerar resposta (simples): " + genError.message,
            tip: "Verificar logs do servidor para mais detalhes"
          });
      }
    }
    
    console.log("Enviando payload final para o cliente:", JSON.stringify(finalResponsePayload));
    res.json(finalResponsePayload);
    
  } catch (error) {
    console.error("Erro geral no endpoint /chat:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor: " + error.message,
      tip: "Verifique os logs do servidor e a chave API do Gemini no arquivo .env"
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log(`Chave API do Gemini: ${GEMINI_API_KEY ? "✓ Configurada" : "✗ Não configurada"}`);
  const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
  console.log(`Chave API OpenWeatherMap: ${OPENWEATHER_API_KEY ? "✓ Configurada" : "✗ Não configurada (necessária para função de clima)"}`);
  console.log(`URI do MongoDB: ${mongoUri ? "✓ Configurada" : "✗ Não configurada"}`);
});
