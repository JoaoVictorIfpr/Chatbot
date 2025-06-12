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
    
    let conversationsHistory = [];
    let currentChatHistory = [];
    let currentConversationIndex = -1;

    // --- CORRIGIDO: URL do backend ---
    // Ajuste esta URL para o seu ambiente.
    // Para produção, use a URL do seu serviço no Render. Ex: 'https://seu-app.onrender.com'
    const backendUrl = 'http://localhost:3000/chat'; // Para produção no Render
    // const backendUrl = 'http://localhost:3000'; // Para desenvolvimento local

    // --- ATUALIZADO: Função para registrar conexão do usuário (Fase 2) ---
    async function registrarConexaoUsuario(userInfo) {
        try {
            // Enviar log para o backend com o formato da atividade
            const logData = {
                ip: userInfo.ip,
                acao: "acesso_inicial_chatbot", // Ação definida pela atividade
                nomeBot: "Gustavo - O Cara das Farm" // Nome do seu Bot
                       const logResponse = await fetch(`${backendUrl}/api/log-connection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData),
            });

            if (!logResponse.ok) {
                console.error("Falha ao enviar log de conexão:", await logResponse.text());
            } else {
                const result = await logResponse.json();
                console.log("Log de conexão enviado:", result.message);
            }
        } catch (error) {
            console.error("Erro ao registrar log de conexão do usuário:", error);
        }
    }

    // --- NOVO: Função para registrar acesso para o ranking (Fase 3) ---
    async function registrarAcessoBotParaRanking() {
        try {
            const dataRanking = {
                botId: "gustavoChatbot_v1", // ID único para seu bot
                nomeBot: "Gustavo - O Cara das Farm", // Mesmo nome do log
                timestampAcesso: new Date().toISOString()
            };

            const response = await fetch(`${backendUrl}/api/ranking/registrar-acesso-bot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataRanking)
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Registro de ranking enviado:", result.message);
            } else {
                console.error("Falha ao registrar acesso para ranking:", await response.text());
            }
        } catch (error) {
            console.error("Erro ao registrar acesso para ranking:", error);
        }
    }
    
    //
    // --- O RESTANTE DO SEU CÓDIGO (LÓGICA DO CHAT) PERMANECE IGUAL ---
    //
    
    function renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        } else {
            console.warn("Biblioteca marked não encontrada. Exibindo texto sem formatação.");
            return text;
        }
    }

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
            history: currentChatHistory.slice(0, -1)
        };
        
        try {
            // --- CORRIGIDO: Usando a variável backendUrl consistentemente ---
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
        newChat();
    });
    newChatBtn.addEventListener("click", newChat);

    loadConversationsHistoryFromStorage();
    
    // --- ATUALIZADO: Trigger para registrar conexão e acesso ao ranking ---
    const registrarAcessoInicial = async () => {
        try            const userInfoResponse = await fetch(`${backendUrl}/api/user-info`);           if (!userInfoResponse.ok) {
                console.error("Falha ao obter user-info:", await userInfoResponse.text());
                return;
            }
            const userInfo = await userInfoResponse.json();

            if (userInfo.error) {
                console.error("Erro do servidor ao obter user-info:", userInfo.error);
                return;
            }
            
            // Chamar as duas funções em paralelo
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