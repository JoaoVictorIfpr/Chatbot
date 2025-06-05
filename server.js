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
const port = process.env.PORT || 3000;

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
      console.error("Requisição recebida sem mensagem.");
      return res.status(400).json({ error: "Mensagem ausente na requisição" });
    }
    
    console.log("Mensagem recebida:", message);
    console.log("Histórico recebido:", history && history.length ? `${history.length} mensagens` : "nenhum");
    
    // Definir as ferramentas disponíveis para o modelo
    const tools = [{
      functionDeclarations: [
        {
          name: "getCurrentTime",
          description: "Obtém a data e hora atuais no Brasil (fuso horário de São Paulo).",
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
                description: "A cidade e, opcionalmente, o país para a qual obter a previsão do tempo (ex: 'Curitiba, BR', 'London, UK')."
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
    
    // Lidar com o histórico de conversas
    let processedHistory = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        if (!msg.role || !msg.parts) continue;
        
        const role = msg.role === "user" ? "user" : 
                     msg.role === "model" ? "model" : 
                     msg.role === "function" ? "function" : null;
        
        if (!role) continue;
        
        const processedMsg = { role, parts: [] };
        
        // Garantir que parts seja um array e processar cada parte
        const partsArray = Array.isArray(msg.parts) ? msg.parts : [msg.parts];
        
        for (const part of partsArray) {
          if (part.text) {
            processedMsg.parts.push({ text: part.text });
          }
          else if (part.functionCall) {
            processedMsg.parts.push({
              functionCall: {
                name: part.functionCall.name,
                args: part.functionCall.args
              }
            });
          }
          else if (part.functionResponse) {
            processedMsg.parts.push({
              functionResponse: {
                name: part.functionResponse.name,
                response: part.functionResponse.response
              }
            });
          }
        }
        
        // Adicionar ao histórico processado apenas se tiver partes válidas
        if (processedMsg.parts.length > 0) {
            processedHistory.push(processedMsg);
        }
      }
    }
    
    console.log("Histórico processado para a API:", JSON.stringify(processedHistory));
    
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
Quando te perguntarem o clima, pergunte de qual cidade a pessoa quer.
Agora, receba a dúvida do jogador:
"${message}"
    `;

    let resposta = "";
    let finalResponsePayload = {};
    
    // Usar o modo chat se houver histórico
    if (processedHistory.length > 0) {
      console.log("Iniciando chat com histórico processado");
      
      try {
        const chat = model.startChat({
          history: processedHistory,
          generationConfig: {
            temperature: 0.9,
          }
        });
      
        console.log("Enviando mensagem para o chat:", message);
        const result = await chat.sendMessage(message);
        console.log("Resultado inicial da IA:", JSON.stringify(result));
        
        let functionCallsDetected = [];
        const responseCandidates = result.response.candidates;
        
        // Verificar se há chamadas de função na resposta
        if (responseCandidates && responseCandidates[0].content && responseCandidates[0].content.parts) {
            const functionCallPart = responseCandidates[0].content.parts.find(part => part.functionCall);
            
            if (functionCallPart) {
                const functionCall = functionCallPart.functionCall;
                const functionName = functionCall.name;
                const functionArgs = functionCall.args;
                
                console.log(`Chamada de função detectada: ${functionName}`, functionArgs);
                
                // Executar a função correspondente
                const functionToCall = availableFunctions[functionName];
                let functionResult;
                
                if (functionToCall) {
                    if (functionName === 'getWeather') {
                        functionResult = await functionToCall(functionArgs);
                    } else {
                        functionResult = functionToCall(functionArgs);
                    }
                    console.log(`Resultado da função ${functionName}:`, functionResult);
                    
                    functionCallsDetected.push({
                        name: functionName,
                        args: functionArgs,
                        response: functionResult
                    });
                    
                    // Enviar o resultado da função de volta para a IA
                    console.log("Enviando resultado da função para a IA...");
                    const resultFromFunctionCall = await chat.sendMessage([
                        {
                            functionResponse: {
                                name: functionName,
                                response: functionResult
                            }
                        }
                    ]);
                    console.log("Resultado da IA após execução da função:", JSON.stringify(resultFromFunctionCall));
                    
                    // *** CORREÇÃO APLICADA AQUI ***
                    // Verificar se a IA forneceu uma resposta textual após a função
                    if (resultFromFunctionCall.response && resultFromFunctionCall.response.text) {
                        resposta = resultFromFunctionCall.response.text();
                        console.log("Resposta textual da IA após função:", resposta);
                    } else {
                        // Se não houver texto, usar uma mensagem padrão ou o resultado da função
                        resposta = `Executei a função ${functionName}. Resultado: ${JSON.stringify(functionResult)}`; 
                        console.log(`IA não forneceu texto após ${functionName}. Usando resposta padrão/resultado.`);
                    }
                } else {
                    console.error(`Função ${functionName} não encontrada!`);
                    resposta = `Desculpe, não encontrei a função ${functionName} para executar.`;
                }
            } else {
                // Se não houve chamada de função, pegar a resposta de texto normal
                resposta = result.response.text ? result.response.text() : "Não recebi uma resposta textual.";
                console.log("Nenhuma chamada de função detectada. Resposta textual:", resposta);
            }
        } else {
             // Caso não haja candidates ou parts válidos
             resposta = result.response.text ? result.response.text() : "Não consegui processar a resposta da IA.";
             console.log("Estrutura de resposta inesperada. Resposta textual:", resposta);
        }
        
        // Preparar o payload final da resposta
        finalResponsePayload = { response: resposta };
        if (functionCallsDetected.length > 0) {
            finalResponsePayload.functionCalls = functionCallsDetected;
        }
        
      } catch (error) {
        console.error("Erro durante o modo chat:", error);
        if (error.response) {
          console.error("Detalhes do erro da API:", error.response.data);
        }
        
        // Fallback para geração simples em caso de erro no chat
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
      // Usar geração simples se não houver histórico
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
    
    // Enviar a resposta final para o cliente
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
  // Verificar se a chave OpenWeatherMap está configurada
  const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
  console.log(`Chave API OpenWeatherMap: ${OPENWEATHER_API_KEY ? "✓ Configurada" : "✗ Não configurada (necessária para função de clima)"}`);
});
