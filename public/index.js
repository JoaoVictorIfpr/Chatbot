document.addEventListener("DOMContentLoaded", () => {
    // --- SELETORES DE ELEMENTOS (sem alterações aqui, apenas para contexto) ---
    const chatContainer = document.querySelector(".chat-container");
    const messagesContainer = document.getElementById("messages");
    const inputField = document.getElementById("userInput");
    const sendButton = document.getElementById("send-button");
    const clearChatBtn = document.getElementById("clearChatBtn");
    const newChatBtn = document.getElementById("newChatBtn");
    const conversationsList = document.getElementById("conversationsList");
    const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
    const sidebar = document.querySelector(".sidebar");
    
    // --- NOVO SELETOR PARA O BOTÃO "SOBRE MIM" ---
    const aboutMeBtn = document.getElementById("aboutMeBtn"); // Adicionado

    let conversationsHistory = [];
    let currentChatHistory = [];
    let currentConversationIndex = -1;

    // URL do backend
    const backendUrl = 'https://chatbot-gbxu.onrender.com';

    // --- FUNÇÕES DE REGISTRO (sem alterações) ---
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
    
    // --- FUNÇÕES DO CHAT (sem alterações) ---
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

    // --- FUNÇÕES DE HISTÓRICO DE CONVERSA (sem alterações) ---
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

    // --- EVENT LISTENERS (sem alterações) ---
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

    // --- INICIALIZAÇÃO (sem alterações) ---
    loadConversationsHistoryFromStorage();
    
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

    // ===================================================================
    // =========== NOVO CÓDIGO PARA O BOTÃO "SOBRE MIM" ==================
    // ===================================================================

    if (aboutMeBtn) {
        aboutMeBtn.addEventListener('click', () => {
            // Remove a tela de chat vazio, se ela estiver visível
            const emptyState = messagesContainer.querySelector(".empty-chat-state");
            if (emptyState) {
                messagesContainer.removeChild(emptyState);
            }

            // Texto com as informações do criador (você!)
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

            // Usa a função 'addMessage' existente para exibir a informação.
            // O nome do remetente pode ser "Sistema" ou o nome que preferir.
            addMessage("Sistema", aboutMeText);
        });
    }
});