# GustavoCraft AI — o bot que veste a sua cara
> Chatbot temático de Minecraft, com memória, painel admin e personalidade adaptativa por usuário.

![Demonstração](docs/demo.gif)
<sup>*Substitua `docs/demo.gif` por um GIF/screencast curto mostrando login → conversa → personalização.*</sup>

---

## ✨ Destaques
- **Personalidade por usuário**: cada pessoa define a própria system instruction sem impactar os demais.
- **Hierarquia de configurações**: Usuário > Admin > Persona padrão, aplicada automaticamente em tempo real.
- **Painel admin cinematográfico**: métricas, falhas detectadas, top usuários e edição da instrução global.
- **Histórico persistente**: sessões salvas com contexto completo, prontas para análise.
- **Demo-ready**: UI responsiva, narrativa temática e documentação completa para o portfólio.

## 🧠 Feature set
- Chat Web inspirado em Minecraft com histórico local, markdown e loading states.
- Backend Express + Gemini, com function calling (clima e hora).
- MongoDB Atlas para sessões, system configs e preferências individuais.
- Endpoints protegidos para admin (`x-admin-secret`) e para usuário (`x-user-id`).
- Página de Configurações com feedback em tempo real e detector da personalidade ativa no chat.

## 🛠️ Tech Stack
| Frontend | Backend | IA & APIs | Dados & DevOps |
| --- | --- | --- | --- |
| HTML, CSS (VT323), JS Vanilla | Node.js, Express | Google Gemini 2.5 Flash, OpenWeatherMap, ip-api.com | MongoDB Atlas, Render/Host estático, dotenvx |

---

## 🚀 Quick start
```bash
git clone https://github.com/<seu-usuario>/gustavocraft-ai.git
cd gustavocraft-ai
npm install
cp .env.example .env   # ou crie manualmente
npm start               # servidor em http://localhost:3000
```

### `.env` essencial
```env
GEMINI_APIKEY=coloque_sua_chave
OPENWEATHER_API_KEY=opcional_mas_recomendado
MONGO_URI="mongodb+srv://<user>:<pass>@cluster.mongodb.net/IIW2023A_Logs?retryWrites=true&w=majority"
ADMIN_PASSWORD=senha_para_painel
PORT=3000
```

### Healthcheck
```
curl http://localhost:3000/api/health
```
Resposta esperada (db = 1 significa conectado):
```json
{ "app":"ok","db":"connected","state":1,"geminiModel":"gemini-2.5-flash" }
```

---

## 🧩 Personalização em camadas
1. Usuário navega no chat. O frontend gera um `userId` persistido em `localStorage` (ou use seu ID real se tiver login).
2. A página de Configurações ( `public/configuracoes.html` ) permite salvar a instrução personalizada via `PUT /api/user/preferences`.
3. O backend usa o ID para buscar o documento em `models/User.js`:
   - **Se existir** `customSystemInstruction`, ela é enviada ao Gemini.
   - **Caso contrário**, o servidor busca a instrução global (`SystemConfig`).
   - **Fallback**: persona padrão do GustavoCraft.
4. Um banner no topo do chat mostra qual camada está ativa em tempo real.

---

## 📊 Painel Admin ( `/public/admin.html` )
- Login por segredo (header `x-admin-secret`).
- Métricas: total de conversas, duração média, top usuários, análise de falhas (mensagens onde o bot “não ajudou”).
- Editor da system instruction global com preview instantâneo.
- Atualização automática a cada 30 segundos e botão manual de refresh.

---

## 🌐 Endpoints principais
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Status do app e do MongoDB. |
| POST | `/chat` | Chat principal (usa system instruction efetiva + histórico). |
| GET | `/api/user/preferences` | Retorna a instrução personalizada do usuário logado (`x-user-id`). |
| PUT | `/api/user/preferences` | Salva/atualiza a instrução personalizada do usuário. |
| GET | `/api/admin/system-instruction` | Lê a instrução global (header admin). |
| POST | `/api/admin/system-instruction` | Atualiza a instrução global (header admin). |
| GET | `/api/admin/stats` | KPIs gerais para o painel. |
| GET | `/api/admin/dashboard` | Engajamento, top usuários, falhas recentes. |
| POST | `/api/log-connection` | Loga acesso (atividade Detetive de Conexões). |

---

## 🧪 Quality checklist
- [ ] Usuário sem personalização → bot usa persona global.
- [ ] Usuário define uma instrução e conversa novamente → bot muda imediatamente.
- [ ] Segundo usuário (ou aba anônima) continua na persona global.
- [ ] Painel admin exibe métricas com dados reais do Mongo.
- [ ] `npm start`, `api/health` e fluxo completo executam sem erros no console.

Registre evidências (prints ou GIF) para o Demo Day.

---

## 🎤 Demo Day pitch script
1. **A ideia (30s)**  
   “Criamos o GustavoCraft AI, um bot temático de Minecraft onde cada jogador pode moldar a personalidade do assistente.”
2. **Demo (1m30s)**  
   - Login → conversa com persona global.  
   - Abre Configurações, salva “você é um mestre de yoga…”.  
   - Volta ao chat, mostra a mudança de tom.  
   - (Opcional) Mostra o painel admin em tempo real.
3. **Desafio & aprendizado (1m)**  
   “O maior desafio foi garantir a hierarquia Usuário > Admin > Default sem quebrar o fluxo. Aprendemos a estruturar schemas, proteger endpoints e a ‘vender’ o produto, não só codificar.”

Use o arquivo [`docs/pitch.md`](docs/pitch.md) como guia rápido para o ensaio.

---

## 🔗 Links úteis
- **Frontend (deploy)**: _adicione aqui quando publicar_
- **Backend (deploy)**: _adicione aqui quando publicar_
- **Coleção Postman**: _opcional, mas recomendado_

---

## 📚 Estrutura do projeto
```
Chatbot/
├── server.js
├── db/
├── models/
│   ├── SessaoChat.js
│   ├── SystemConfig.js
│   └── User.js
├── public/
│   ├── index.html / client.js / style.css
│   ├── configuracoes.html / configuracoes.js
│   ├── admin.html / admin.js
│   └── img/
├── docs/
│   └── pitch.md
├── package.json
└── README.md
```

---

## 🙌 Créditos
Projeto desenvolvido como parte da trilha **B4.P1** — Missão “Personalidade Adaptativa” + “Demo Day”.  
Sinta-se livre para clonar, evoluir e apresentar no seu portfólio. Boa demo! 🧱💡

