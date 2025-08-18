// Conteúdo inicial para client.js
// Este arquivo será preenchido com a lógica do frontend conforme as instruções do documento.




// --- FUNÇÕES DE HISTÓRICO DE CONVERSA ---
function saveConversation() {
    if (currentChatHistory.length > 0) {
        if (currentConversationIndex >= 0) {
            conversationsHistory[currentConversationIndex] = [...currentChatHistory];
        } else {
            conversationsHistory.push([...currentChatHistory]);
            currentConversationIndex = conversationsHistory.length - 1;
        }
        localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
        displaySavedConversations();
    }
}

function loadConversation(conversationIndex) {
    messagesContainer.innerHTML = "";
    currentChatHistory = [...conversationsHistory[conversationIndex]];
    currentConversationIndex = conversationIndex;
    
    if (currentChatHistory.length === 0) {
        const emptyStateDiv = document.createElement("div");
        emptyStateDiv.classList.add("empty-chat-state");
        emptyStateDiv.innerHTML = `
            <div class="empty-chat-icon">💬</div>
            <h3>Gustavo, o cara das farm</h3>
            <p>Pergunte sobre farms no Minecraft, mecânicas de redstone, e dicas para otimizar seu mundo!</p>
        `;
        messagesContainer.appendChild(emptyStateDiv);
    } else {
        currentChatHistory.forEach((msg) => {
            if (msg.role === "user" || msg.role === "model") {
                if (msg.parts[0].text !== undefined) {
                    const text = msg.parts[0].text;
                    addMessage(msg.role === "user" ? "você" : "Gustavo", text);
                }
            }
        });
    }
    
    if (window.innerWidth <= 900) {
        sidebar.classList.remove("active");
    }
}

function deleteConversation(index, event) {
    event.stopPropagation();
    conversationsHistory.splice(index, 1);
    
    if (currentConversationIndex === index) {
        clearChat();
        currentConversationIndex = -1;
    } else if (currentConversationIndex > index) {
        currentConversationIndex--;
    }
    
    localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
    displaySavedConversations();
}

function displaySavedConversations() {
    conversationsList.innerHTML = "";
    conversationsHistory.forEach((conversation, index) => {
        const conversationItem = document.createElement("div");
        conversationItem.classList.add("conversation-item");
        
        if (index === currentConversationIndex) {
            conversationItem.classList.add("active");
        }
        
        let userMessageIndex = conversation.findIndex(msg => msg.role === "user" && msg.parts[0].text !== undefined);
        let displayText = "Nova Conversa";
        
        if (userMessageIndex !== -1) {
            const firstUserMessage = conversation[userMessageIndex].parts[0].text.substring(0, 30) + "...";
            const timestamp = conversation[userMessageIndex].timestamp;
            const date = new Date(timestamp);
            const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString();
            displayText = `${formattedDate}: ${firstUserMessage}`;
        } else if (conversation.length > 0) {
            displayText = "Nova Conversa " + (index + 1);
        }
        
        conversationItem.textContent = displayText;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("delete-conversation");
        deleteBtn.innerHTML = "×";
        deleteBtn.title = "Excluir conversa";
        deleteBtn.addEventListener("click", (e) => deleteConversation(index, e));
        conversationItem.appendChild(deleteBtn);
        
        conversationItem.addEventListener("click", () => loadConversation(index));
        conversationsList.appendChild(conversationItem);
    });
}

function newChat() {
    if (currentChatHistory.length > 0) {
        saveConversation();
    }
    
    clearChat();
    currentConversationIndex = -1;
    
    conversationsHistory.push([]);
    currentConversationIndex = conversationsHistory.length - 1;
    localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
    displaySavedConversations();
    
    inputField.focus();
}

function loadConversationsHistoryFromStorage() {
    const savedConversations = localStorage.getItem("conversationsHistory");
    if (savedConversations) {
        try {
            conversationsHistory = JSON.parse(savedConversations);
            displaySavedConversations();
            if (conversationsHistory.length > 0) {
                loadConversation(conversationsHistory.length - 1);
            } else {
                conversationsHistory.push([]);
                currentConversationIndex = 0;
                localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
                displaySavedConversations();
            }
        } catch (error) {
            console.error("Erro ao carregar histórico de conversas:", error);
            localStorage.removeItem("conversationsHistory");
            conversationsHistory = [];
            conversationsHistory.push([]);
            currentConversationIndex = 0;
            localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
            displaySavedConversations();
        }
    } else {
        conversationsHistory.push([]);
        currentConversationIndex = 0;
        localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
        displaySavedConversations();
    }
    
    inputField.focus();
}

function clearChat() {
    messagesContainer.innerHTML = "";
    currentChatHistory = [];
    messagesContainer.scrollTop = 0;
    
    const emptyStateDiv = document.createElement("div");
    emptyStateDiv.classList.add("empty-chat-state");
    emptyStateDiv.innerHTML = `
        <div class="empty-chat-icon">💬</div>
        <h3>Gustavo, o cara das farm</h3>
        <p>Pergunte sobre farms no Minecraft, mecânicas de redstone, e dicas para otimizar seu mundo!</p>
    `;
    messagesContainer.appendChild(emptyStateDiv);
}




async function excluirSessao(sessionId) {
    if (confirm("Tem certeza que deseja excluir esta conversa?")) {
        try {
            const response = await fetch(`/api/chat/historicos/${sessionId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                alert("Conversa excluída com sucesso!");
                // Recarregar conversas ou remover o item da lista
                loadConversationsHistoryFromStorage(); // Simplificado para recarregar tudo
            } else {
                const errorData = await response.json();
                alert(`Erro ao excluir conversa: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Erro ao excluir sessão:", error);
            alert("Erro de rede ao tentar excluir conversa.");
        }
    }
}

async function obterESalvarTitulo(sessionId, elementLi) {
    // Mostrar estado de carregamento
    elementLi.textContent = "Gerando título...";
    elementLi.style.fontStyle = "italic";

    try {
        // 1. Fazer fetch POST para /api/chat/historicos/${sessionId}/gerar-titulo
        const generateTitleResponse = await fetch(`/api/chat/historicos/${sessionId}/gerar-titulo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        if (!generateTitleResponse.ok) {
            const errorData = await generateTitleResponse.json();
            throw new Error(`Erro ao gerar título: ${errorData.error}`);
        }

        const { suggestedTitle } = await generateTitleResponse.json();

        // 2. Mostrar prompt para o usuário com a sugestão
        const userConfirmedTitle = prompt("Sugestão de título: ", suggestedTitle);

        if (userConfirmedTitle !== null && userConfirmedTitle.trim() !== "") {
            // 3. Fazer fetch PUT para /api/chat/historicos/${sessionId} com o título final
            const saveTitleResponse = await fetch(`/api/chat/historicos/${sessionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ titulo: userConfirmedTitle }),
            });

            if (saveTitleResponse.ok) {
                alert("Título salvo com sucesso!");
                // 4. Atualizar o texto do elementoLi na tela
                elementLi.textContent = userConfirmedTitle;
                elementLi.style.fontStyle = "normal";
            } else {
                const errorData = await saveTitleResponse.json();
                throw new Error(`Erro ao salvar título: ${errorData.error}`);
            }
        } else {
            alert("Operação de titulação cancelada ou título vazio.");
            // Restaurar texto original se o usuário cancelar ou inserir vazio
            loadConversationsHistoryFromStorage(); 
        }

    } catch (error) {
        console.error("Erro no processo de titulação:", error);
        alert(`Erro: ${error.message}`);
        // Restaurar texto original em caso de erro
        loadConversationsHistoryFromStorage(); 
    }
}

// Modificar displaySavedConversations para incluir botões e usar títulos do backend
async function displaySavedConversations() {
    conversationsList.innerHTML = "";
    try {
        const response = await fetch("/api/chat/historicos"); // Supondo um endpoint para listar históricos
        if (!response.ok) {
            throw new Error("Não foi possível carregar os históricos de chat.");
        }
        const historicos = await response.json();

        historicos.forEach(historico => {
            const conversationItem = document.createElement("div");
            conversationItem.classList.add("conversation-item");
            conversationItem.dataset.sessionId = historico._id; // Armazenar o ID da sessão

            const titleSpan = document.createElement("span");
            titleSpan.textContent = historico.titulo || "Conversa Sem Título";
            conversationItem.appendChild(titleSpan);

            // Botão Gerar Título
            const generateTitleBtn = document.createElement("button");
            generateTitleBtn.classList.add("generate-title-btn");
            generateTitleBtn.innerHTML = "✏️"; // Ícone de lápis
            generateTitleBtn.title = "Gerar Título";
            generateTitleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                obterESalvarTitulo(historico._id, titleSpan);
            });
            conversationItem.appendChild(generateTitleBtn);

            // Botão Excluir
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("delete-conversation-btn");
            deleteBtn.innerHTML = "🗑️"; // Ícone de lixeira
            deleteBtn.title = "Excluir Conversa";
            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                excluirSessao(historico._id);
            });
            conversationItem.appendChild(deleteBtn);

            conversationItem.addEventListener("click", () => loadConversation(historico._id)); // Carregar conversa pelo ID
            conversationsList.appendChild(conversationItem);
        });
    } catch (error) {
        console.error("Erro ao exibir conversas salvas:", error);
        conversationsList.innerHTML = `<div class="error-message">${error.message}</div>`;
    }
}

// Adaptação de loadConversation para carregar do backend
async function loadConversation(sessionId) {
    messagesContainer.innerHTML = "";
    try {
        const response = await fetch(`/api/chat/historicos/${sessionId}`); // Supondo um endpoint para buscar histórico por ID
        if (!response.ok) {
            throw new Error("Não foi possível carregar o histórico da conversa.");
        }
        const session = await response.json();
        currentChatHistory = session.messages || [];
        currentConversationIndex = sessionId; // Usar o ID como índice para referência

        if (currentChatHistory.length === 0) {
            const emptyStateDiv = document.createElement("div");
            emptyStateDiv.classList.add("empty-chat-state");
            emptyStateDiv.innerHTML = `
                <div class="empty-chat-icon">💬</div>
                <h3>Gustavo, o cara das farm</h3>
                <p>Pergunte sobre farms no Minecraft, mecânicas de redstone, e dicas para otimizar seu mundo!</p>
            `;
            messagesContainer.appendChild(emptyStateDiv);
        } else {
            currentChatHistory.forEach((msg) => {
                if (msg.role === "user" || msg.role === "model") {
                    if (msg.parts[0].text !== undefined) {
                        const text = msg.parts[0].text;
                        addMessage(msg.role === "user" ? "você" : "Gustavo", text);
                    }
                }
            });
        }

        if (window.innerWidth <= 900) {
            sidebar.classList.remove("active");
        }
    } catch (error) {
        console.error("Erro ao carregar conversa:", error);
        alert(`Erro ao carregar conversa: ${error.message}`);
    }
}

// Adaptação de newChat para criar nova sessão no backend
async function newChat() {
    try {
        const response = await fetch("/api/chat/historicos", { // Supondo um endpoint POST para criar nova sessão
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [] }) // Criar uma sessão vazia inicialmente
        });
        if (!response.ok) {
            throw new Error("Não foi possível iniciar uma nova conversa.");
        }
        const newSession = await response.json();
        clearChat();
        currentChatHistory = [];
        currentConversationIndex = newSession._id; // Usar o ID da nova sessão
        displaySavedConversations(); // Recarregar a lista para mostrar a nova conversa
        inputField.focus();
    } catch (error) {
        console.error("Erro ao iniciar nova conversa:", error);
        alert(`Erro ao iniciar nova conversa: ${error.message}`);
    }
}

// Adaptação de loadConversationsHistoryFromStorage para usar o backend
async function loadConversationsHistoryFromStorage() {
    try {
        const response = await fetch("/api/chat/historicos");
        if (!response.ok) {
            throw new Error("Não foi possível carregar os históricos de chat do servidor.");
        }
        const historicos = await response.json();
        conversationsHistory = historicos; // Agora conversationsHistory guarda os objetos completos do MongoDB
        displaySavedConversations();

        if (conversationsHistory.length > 0) {
            // Carregar a última conversa ativa ou a primeira se não houver ativa
            const lastActiveSessionId = localStorage.getItem("lastActiveSessionId");
            const lastActiveSession = historicos.find(s => s._id === lastActiveSessionId);
            if (lastActiveSession) {
                loadConversation(lastActiveSession._id);
            } else {
                loadConversation(historicos[0]._id);
            }
        } else {
            // Se não houver históricos, criar um novo
            newChat();
        }
    } catch (error) {
        console.error("Erro ao carregar histórico de conversas do servidor:", error);
        alert(`Erro ao carregar histórico: ${error.message}`);
        // Em caso de erro, ainda permitir iniciar uma nova conversa localmente
        newChat();
    }
    inputField.focus();
}

// Adaptação de saveConversation para usar o backend
async function saveConversation() {
    if (currentChatHistory.length === 0) return; // Não salvar conversas vazias

    try {
        const payload = { messages: currentChatHistory };
        let response;
        if (currentConversationIndex && currentConversationIndex !== -1) {
            // Atualizar conversa existente
            response = await fetch(`/api/chat/historicos/${currentConversationIndex}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        } else {
            // Criar nova conversa (isso deve ser tratado por newChat, mas como fallback)
            response = await fetch("/api/chat/historicos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const newSession = await response.json();
            currentConversationIndex = newSession._id; // Atualizar o ID da sessão atual
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Falha ao salvar conversa: ${errorData.error}`);
        }
        displaySavedConversations(); // Atualizar a lista após salvar
        localStorage.setItem("lastActiveSessionId", currentConversationIndex); // Salvar a última sessão ativa
    } catch (error) {
        console.error("Erro ao salvar conversa:", error);
        alert(`Erro ao salvar conversa: ${error.message}`);
    }
}

// Adaptação de addMessage para salvar no backend
function addMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender === "você" ? "user-message" : "bot-message");
    
    const senderHeader = document.createElement("div");
    senderHeader.classList.add("message-sender");
    senderHeader.textContent = sender.toUpperCase();
    messageDiv.appendChild(senderHeader);
    
    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    
    if (sender !== "você") {
        messageContent.innerHTML = renderMarkdown(text);
    } else {
        messageContent.textContent = text;
    }
    
    messageDiv.appendChild(messageContent);
    messageDiv.dataset.timestamp = Date.now();
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Adaptação de addUserMessage e addBotMessage para salvar no backend
function addUserMessage(message) {
    addMessage("você", message);
    currentChatHistory.push({ role: "user", parts: [{ text: message }], timestamp: Date.now() });
    saveConversation();
}

function addBotMessage(message) {
    addMessage("Gustavo", message);
    currentChatHistory.push({ role: "model", parts: [{ text: message }], timestamp: Date.now() });
    saveConversation();
}

function addFunctionCall(name, args) {
    currentChatHistory.push({ role: "model", parts: [{ functionCall: { name: name, args: args } }], timestamp: Date.now() });
    saveConversation();
}

function addFunctionResponse(name, response) {
    currentChatHistory.push({ role: "function", parts: [{ functionResponse: { name: name, response: response } }], timestamp: Date.now() });
    saveConversation();
}

// Adaptação de sendMessage para usar o backend
async function sendMessage() {
    const input = inputField.value.trim();
    if (!input) return;
    
    const emptyState = messagesContainer.querySelector(".empty-chat-state");
    if (emptyState) {
        messagesContainer.removeChild(emptyState);
    }
    
    addUserMessage(input);
    inputField.value = "";
    
    sendButton.disabled = true;
    sendButton.textContent = "Enviando...";
    
    const payload = {
        message: input,
        history: currentChatHistory.slice(0, -1) // Envia o histórico atualizado
    };
    
    try {
        const response = await fetch(`${backendUrl}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        const resposta = data.response || "Desculpe, não entendi sua pergunta. Tente novamente!";
        
        if (data.functionCalls && data.functionCalls.length > 0) {
            for (const call of data.functionCalls) {
                addFunctionCall(call.name, call.args);
                if (call.response) {
                    addFunctionResponse(call.name, call.response);
                }
            }
        }
        
        addBotMessage(resposta);
        
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        addBotMessage("Erro ao se comunicar com o servidor. Tente novamente mais tarde.");
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Enviar";
    }
}

// Adaptação de clearChat para usar o backend
function clearChat() {
    messagesContainer.innerHTML = "";
    currentChatHistory = [];
    messagesContainer.scrollTop = 0;
    
    const emptyStateDiv = document.createElement("div");
    emptyStateDiv.classList.add("empty-chat-state");
    emptyStateDiv.innerHTML = `
        <div class="empty-chat-icon">💬</div>
        <h3>Gustavo, o cara das farm</h3>
        <p>Pergunte sobre farms no Minecraft, mecânicas de redstone, e dicas para otimizar seu mundo!</p>
    `;
    messagesContainer.appendChild(emptyStateDiv);
}

// Adaptação dos event listeners para usar as novas funções
document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.querySelector(".chat-container");
    const messagesContainer = document.getElementById("messages");
    const inputField = document.getElementById("userInput");
    const sendButton = document.getElementById("send-button");
    const clearChatBtn = document.getElementById("clearChatBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const conversationsList = document.getElementById("conversationsList");
    const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    const sidebar = document.querySelector(".sidebar");
    const aboutMeBtn = document.getElementById("aboutMeBtn");

    let currentChatHistory = [];
    let currentConversationIndex = null; // Agora guarda o _id da sessão
    let conversationsHistory = []; // Para guardar a lista de sessões do backend

    const backendUrl = window.location.origin; // Usa a origem atual para o backend

    // Funções auxiliares (manter ou adaptar conforme necessário)
    function renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        } else {
            console.warn("Biblioteca marked não encontrada. Exibindo texto sem formatação.");
            return text;
        }
    }

    // Event Listeners
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
    }

    sendButton.addEventListener("click", sendMessage);
    inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
    clearChatBtn.addEventListener("click", () => {
        clearChat();
        newChat(); // Inicia uma nova conversa no backend
    });
    newChatBtn.addEventListener("click", newChat);

    if (aboutMeBtn) {
        aboutMeBtn.addEventListener("click", () => {
            const emptyState = messagesContainer.querySelector(".empty-chat-state");
            if (emptyState) {
                messagesContainer.removeChild(emptyState);
            }
            const aboutMeText = `
### 👨‍💻 Criador do Chatbot: João Victor

---

Eu sou o desenvolvedor por trás deste chatbot! Aqui estão algumas das minhas informações no estilo Minecraft:

* **🏷️ TAG DE JOGADOR:** João Victor
* **📍 PONTO DE SPAWN:** Assis Chateaubriand - PR
* **📅 DATA DE CRIAÇÃO:** 17/04/2007
* **🛠️ GUILDA / CLÃ:** IFPR (Turma: iiw2023a)
* **🌟 MISSÃO ATUAL:** Minerando conhecimento e construindo o futuro no Instituto Federal do Paraná!

Espero que goste de interagir com o **Gustavo, o cara das farm**!
            `;
            addMessage("Sistema", aboutMeText);
        });
    }

    // Inicialização
    loadConversationsHistoryFromStorage();

    // Funções de registro (manter inalteradas, pois dependem do backend)
    async function registrarConexaoUsuario(userInfo) {
        try {
            const logData = {
                ip: userInfo.ip,
                acao: "acesso_inicial_chatbot",
                nomeBot: "Gustavo - O Cara das Farm"
            };
            const logResponse = await fetch(`${backendUrl}/api/log-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData),
            });
            if (!logResponse.ok) console.error("Falha ao enviar log de conexão:", await logResponse.text());
        } catch (error) {
            console.error("Erro ao registrar log de conexão do usuário:", error);
        }
    }

    async function registrarAcessoBotParaRanking() {
        try {
            const dataRanking = {
                botId: "gustavoChatbot_v1",
                nomeBot: "Gustavo - O Cara das Farm",
                timestampAcesso: new Date().toISOString()
            };
            const response = await fetch(`${backendUrl}/api/ranking/registrar-acesso-bot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataRanking)
            });
            if (!response.ok) console.error("Falha ao registrar acesso para ranking:", await response.text());
        } catch (error) {
            console.error("Erro ao registrar acesso para ranking:", error);
        }
    }

    const registrarAcessoInicial = async () => {
        try {
            const userInfoResponse = await fetch(`${backendUrl}/api/user-info`);
            if (!userInfoResponse.ok) return;
            const userInfo = await userInfoResponse.json();
            if (userInfo.error) return;
            
            await Promise.all([
                registrarConexaoUsuario(userInfo),
                registrarAcessoBotParaRanking()
            ]);

        } catch (error) {
            console.error("Erro no processo de registro inicial:", error);
        }
    };
    
    registrarAcessoInicial();
});



const backendUrl = window.location.origin;


