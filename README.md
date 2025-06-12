# Chatbot Gustavo - Detetive de Conexões

Este projeto é um chatbot especializado em Minecraft que foi expandido para incluir funcionalidades de rastreamento e registro de acessos de usuários.

## Funcionalidades Principais

### Chatbot Original
- Chatbot especializado em Minecraft (farms, redstone, mecânicas)
- Integração com Google Gemini AI
- Função de consulta de clima via OpenWeatherMap
- Interface web responsiva com histórico de conversas

### Novas Funcionalidades - Detetive de Conexões
- **Endpoint GET `/api/user-info`**: Obtém IP público do usuário e sua geolocalização (cidade/país)
- **Endpoint POST `/api/log-connection`**: Registra logs de conexão em banco de dados MongoDB
- **Integração com MongoDB Atlas**: Armazenamento persistente de logs de acesso
- **Frontend atualizado**: Registro automático de conexões quando a página carrega

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Chave API do Google Gemini (obrigatória)
GEMINI_APIKEY=sua_chave_api_gemini_aqui

# Chave API do OpenWeatherMap (opcional, para função de clima)
OPENWEATHER_API_KEY=sua_chave_openweather_aqui

# String de conexão do MongoDB Atlas (nova funcionalidade)
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/chatbotLogsDB?retryWrites=true&w=majority

# Porta do servidor (opcional, padrão é 3000)
PORT=3000
```

### MongoDB Atlas

1. Crie uma conta gratuita no [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Crie um cluster gratuito (M0 Sandbox)
3. Configure acesso ao banco de dados (usuário e senha)
4. Configure acesso à rede (adicione seu IP atual e 0.0.0.0/0 para deploy)
5. Obtenha a string de conexão e adicione à variável `MONGO_URI`

### Instalação

```bash
# Instalar dependências
npm install

# Iniciar o servidor
npm start
# ou
node server.js
```

## Estrutura do Projeto

```
chatbot_project/
├── server.js              # Servidor backend com endpoints
├── public/
│   ├── index.html         # Interface do chatbot
│   ├── index.js           # JavaScript do frontend (atualizado)
│   └── style.css          # Estilos
├── package.json           # Dependências do projeto
├── .env.example          # Exemplo de variáveis de ambiente
└── README.md             # Este arquivo
```

## Endpoints da API

### GET `/api/user-info`
Retorna informações de IP e geolocalização do usuário.

**Resposta:**
```json
{
  "ip": "8.8.8.8",
  "city": "Mountain View",
  "country": "United States"
}
```

### POST `/api/log-connection`
Registra um log de conexão no MongoDB.

**Corpo da requisição:**
```json
{
  "ip": "8.8.8.8",
  "city": "Mountain View",
  "timestamp": "2025-06-12T10:30:00.000Z"
}
```

**Resposta:**
```json
{
  "message": "Log de conexão salvo com sucesso!",
  "logId": "ObjectId"
}
```

### POST `/chat`
Endpoint original do chatbot para conversas com Gustavo.

## Estrutura do Banco de Dados

### Coleção: `accessLogs`
```json
{
  "_id": "ObjectId",
  "ipAddress": "8.8.8.8",
  "city": "Mountain View",
  "connectionTime": "2025-06-12T10:30:00.000Z",
  "createdAt": "2025-06-12T10:30:05.123Z"
}
```

## Deploy

### Render (Backend)
1. Conecte seu repositório GitHub ao Render
2. Configure as variáveis de ambiente no painel do Render
3. Deploy automático a cada push

### Configuração para Produção
No arquivo `public/index.js`, ajuste a URL do backend:
```javascript
const backendUrl = 'http://localhost:3000/chat'; // URL do seu deploy
```

## Funcionalidades Implementadas

✅ Conexão com MongoDB Atlas  
✅ Endpoint para obter IP e geolocalização  
✅ Endpoint para registrar logs de conexão  
✅ Frontend atualizado para enviar logs automaticamente  
✅ Tratamento de IPs locais para desenvolvimento  
✅ Documentação completa  

## Observações de Desenvolvimento

- Para testes locais, IPs privados (127.0.0.1, 192.168.x.x) são automaticamente substituídos por um IP público de exemplo
- O MongoDB é opcional para funcionamento básico do chatbot
- Logs de conexão são registrados automaticamente quando a página carrega
- A funcionalidade funciona tanto em desenvolvimento local quanto em produção

## Tecnologias Utilizadas

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Banco de Dados**: MongoDB Atlas
- **APIs Externas**: 
  - Google Gemini AI
  - OpenWeatherMap
  - ip-api.com (geolocalização)
- **Deploy**: Render

## Autor

Implementação das funcionalidades de rastreamento baseada na atividade B2.P1.A7 - Detetive de Conexões.

