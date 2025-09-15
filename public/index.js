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






    // --- FUNÇÕES DE REGISTRO (sem alterações) ---



    
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


    }

    function addBotMessage(message) {
        addMessage("Gustavo", message);


    }

    function addFunctionCall(name, args) {


    }

    function addFunctionResponse(name, response) {


    }




    // --- EVENT LISTENERS (sem alterações) ---
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
    }



    clearChatBtn.addEventListener("click", () => {

    });



    


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