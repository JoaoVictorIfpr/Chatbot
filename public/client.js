// Elementos do DOM
const messagesContainer = document.getElementById("messages");
const inputField = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const newChatBtn = document.getElementById("newChatBtn");
const conversationsList = document.getElementById("conversationsList");
const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
const sidebar = document.getElementById("sidebar");
const aboutMeBtn = document.getElementById("aboutMeBtn");

// Variáveis globais
let currentChatHistory = [];
let conversationsHistory = [];
let currentConversationIndex = -1;
const backendUrl = window.location.origin;

// --- FUNÇÕES AUXILIARES ---
function renderMarkdown(text) {
    // Função simples para renderizar markdown básico
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// --- FUNÇÕES DE INTERFACE ---
function addMessage(sender, text) {
    // Remove estado vazio se existir
    const emptyState = messagesContainer.querySelector(".empty-chat-state");
    if (emptyState) {
        messagesContainer.removeChild(emptyState);
    }

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
    currentChatHistory.push({ 
        role: "user", 
        parts: [{ text: message }], 
        timestamp: Date.now() 
    });
}

function addBotMessage(message) {
    addMessage("Gustavo", message);
    currentChatHistory.push({ 
        role: "model", 
        parts: [{ text: message }], 
        timestamp: Date.now() 
    });
}

function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "bot-message");
    typingDiv.id = "typing-indicator";
    
    const senderHeader = document.createElement("div");
    senderHeader.classList.add("message-sender");
    senderHeader.textContent = "GUSTAVO";
    typingDiv.appendChild(senderHeader);
    
    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.innerHTML = 'Pensando<span class="typing-indicator"><span></span><span></span><span></span></span>';
    
    typingDiv.appendChild(messageContent);
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// --- FUNÇÕES DE CHAT ---
async function sendMessage() {
    const input = inputField.value.trim();
    if (!input) return;
    
    addUserMessage(input);
    inputField.value = "";
    
    sendButton.disabled = true;
    sendButton.textContent = "Enviando...";
    showTypingIndicator();
    
    try {
        const response = await fetch(`${backendUrl}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                message: input,
                history: currentChatHistory.slice(0, -1) // Envia o histórico sem a última mensagem do usuário
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Erro do servidor: ${response.status}`);
        }
        
        const data = await response.json();
        const resposta = data.response || "Desculpe, não entendi sua pergunta. Tente novamente!";
        
        removeTypingIndicator();
        addBotMessage(resposta);
        saveConversation();
        
    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        removeTypingIndicator();
        addBotMessage("❌ Erro ao se comunicar com o servidor. Tente novamente mais tarde.");
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = "Enviar";
        inputField.focus();
    }
}

function clearChat() {
    messagesContainer.innerHTML = "";
    currentChatHistory = [];
    
    const emptyStateDiv = document.createElement("div");
    emptyStateDiv.classList.add("empty-chat-state");
    emptyStateDiv.id = "emptyChatState";
    emptyStateDiv.innerHTML = `
        <div class="empty-chat-icon">⛏️</div>
        <h3>Olá, sou o Gustavo!</h3>
        <p>Especialista em farms do Minecraft. Digite sua pergunta e vamos construir algo incrível!</p>
    `;
    messagesContainer.appendChild(emptyStateDiv);
    inputField.focus();
}

// --- FUNÇÕES DE HISTÓRICO LOCAL ---
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
    
    // Atualizar visual da conversa ativa
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (currentChatHistory.length === 0) {
        clearChat();
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
    
    // Marcar conversa como ativa
    const conversationItems = document.querySelectorAll('.conversation-item');
    if (conversationItems[conversationIndex]) {
        conversationItems[conversationIndex].classList.add('active');
    }
    
    if (window.innerWidth <= 900) {
        sidebar.classList.remove("active");
    }
}

function deleteConversation(index, event) {
    event.stopPropagation();
    
    if (confirm("Tem certeza que deseja excluir esta conversa?")) {
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
}

function displaySavedConversations() {
    conversationsList.innerHTML = "";
    conversationsHistory.forEach((conversation, index) => {
        const conversationItem = document.createElement("div");
        conversationItem.classList.add("conversation-item");
        
        if (index === currentConversationIndex) {
            conversationItem.classList.add("active");
        }
        
        // Criar título e preview
        const titleDiv = document.createElement("div");
        titleDiv.classList.add("conversation-title");
        
        const previewDiv = document.createElement("div");
        previewDiv.classList.add("conversation-preview");
        
        let userMessageIndex = conversation.findIndex(msg => 
            msg.role === "user" && msg.parts[0].text !== undefined
        );
        
        if (userMessageIndex !== -1) {
            const firstUserMessage = conversation[userMessageIndex].parts[0].text;
            titleDiv.textContent = firstUserMessage.length > 30 
                ? firstUserMessage.substring(0, 30) + "..."
                : firstUserMessage;
            
            if (conversation[userMessageIndex].timestamp) {
                const date = new Date(conversation[userMessageIndex].timestamp);
                previewDiv.textContent = date.toLocaleDateString('pt-BR') + " " + 
                                       date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
            } else {
                previewDiv.textContent = "Conversa sem data";
            }
        } else {
            titleDiv.textContent = `Nova Conversa ${index + 1}`;
            previewDiv.textContent = "Conversa vazia";
        }
        
        conversationItem.appendChild(titleDiv);
        conversationItem.appendChild(previewDiv);
        
        // Botão de deletar
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
    currentChatHistory = [];
    currentConversationIndex = -1;
    
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
                clearChat();
            }
        } catch (error) {
            console.error("Erro ao carregar histórico de conversas:", error);
            localStorage.removeItem("conversationsHistory");
            conversationsHistory = [];
            clearChat();
        }
    } else {
        conversationsHistory = [];
        clearChat();
    }
    
    inputField.focus();
}

// --- FUNÇÕES DOS BOTÕES ---
function showAboutMe() {
    const aboutText = `🎮 **Sobre o Gustavo**

Olá! Sou o Gustavo, especialista em Minecraft e farms automáticas!

**Especialidades:**
• 🌱 Farms de todos os tipos (mob, comida, materiais)
• ⚙️ Mecânicas de redstone e automação
• 🏗️ Construções eficientes e otimização
• 💎 Estratégias de mineração e exploração
• 🔧 Troubleshooting de projetos

**Como posso ajudar:**
Pergunte sobre qualquer aspecto do Minecraft! Desde farms básicas até projetos complexos de redstone. Vou te ajudar a construir, otimizar e resolver problemas.

Vamos craftar algo incrível juntos! 🛠️`;

    addBotMessage(aboutText);
}

function toggleSidebar() {
    sidebar.classList.toggle("active");
}

// --- EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
    // Carregar histórico ao iniciar
    loadConversationsHistoryFromStorage();
    
    // Event listeners dos botões
    sendButton.addEventListener("click", sendMessage);
    clearChatBtn.addEventListener("click", () => {
        if (confirm("Tem certeza que deseja limpar esta conversa?")) {
            clearChat();
            currentChatHistory = [];
            saveConversation();
        }
    });
    newChatBtn.addEventListener("click", newChat);
    aboutMeBtn.addEventListener("click", showAboutMe);
    toggleSidebarBtn.addEventListener("click", toggleSidebar);
    
    // Enter para enviar mensagem
    inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 900) {
            if (!sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
                sidebar.classList.remove("active");
            }
        }
    });
    
    // Responsividade
    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            sidebar.classList.remove("active");
        }
    });
    
    // Foco inicial no input
    inputField.focus();
});