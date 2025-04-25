document.addEventListener("DOMContentLoaded", () => {
  const chatContainer = document.querySelector(".chat-container");
  const messagesContainer = document.getElementById("messages");
  const inputField = document.getElementById("userInput");
  const sendButton = document.getElementById("send-button");
  const clearChatBtn = document.getElementById("clearChatBtn");
  const newChatBtn = document.getElementById("newChatBtn");
  const conversationsList = document.getElementById("conversationsList");
  let conversationsHistory = [];
  let currentChatHistory = [];
  let currentConversationIndex = -1;

  function renderMarkdown(text) {
    // Verificar se marked está disponível
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
    
    // Adicionar o cabeçalho com o nome do remetente
    const senderHeader = document.createElement("div");
    senderHeader.classList.add("message-sender");
    senderHeader.textContent = sender.toUpperCase();
    messageDiv.appendChild(senderHeader);
    
    // Criar um container para o conteúdo da mensagem
    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    
    // Se for uma mensagem do bot, processar o markdown
    if (sender !== "você") {
      messageContent.innerHTML = renderMarkdown(text);
    } else {
      // Se for uma mensagem do usuário, exibir como texto simples
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
      parts: [{
        text: message
      }],
      timestamp: Date.now()
    });
  }

  function addBotMessage(message) {
    console.log("Mensagem recebida para addBotMessage:", message);
    addMessage("Gustavo", message);
    currentChatHistory.push({
      role: "model",
      parts: [{
        text: message
      }],
      timestamp: Date.now()
    });
  }

  async function sendMessage() {
    const input = inputField.value.trim();
    console.log("Valor do inputField (no sendMessage):", input);
    if (!input) {
      console.log("Input vazio, não enviando.");
      return;
    }
    
    addUserMessage(input);
    inputField.value = "";
    
    // Modificado: Enviando apenas a última mensagem e o contexto da conversa
    const lastUserMessage = input;
    const chatContext = currentChatHistory.slice(0, -1); // Histórico anterior
    
    const payload = {
      message: lastUserMessage,
      history: chatContext
    };
    
    console.log("Dados enviados para a API:", JSON.stringify(payload));
    
    try {
      const response = await fetch(`https://chatbot-gbxu.onrender.com/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
      });
      
      console.log("Resposta da API bruta:", response);
      const data = await response.json();
      console.log("Resposta da API JSON:", data);
      
      const resposta = data.response || "Desculpe, não entendi sua pergunta. Tente novamente!";
      console.log("Resposta a ser exibida:", resposta);
      addBotMessage(resposta);
      
      // Salvar a conversa após cada troca de mensagens
      if (currentConversationIndex >= 0) {
        // Atualizar conversa existente
        conversationsHistory[currentConversationIndex] = [...currentChatHistory];
      }
      localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
      displaySavedConversations();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      addBotMessage("Erro ao se comunicar com o servidor. Tente novamente mais tarde.");
    }
  }

  function saveConversation() {
    if (currentChatHistory.length > 0) {
      // Se estamos editando uma conversa existente
      if (currentConversationIndex >= 0) {
        conversationsHistory[currentConversationIndex] = [...currentChatHistory];
      } else {
        // Nova conversa
        conversationsHistory.push([...currentChatHistory]);
      }
      localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
      displaySavedConversations();
    }
  }

  function loadConversation(conversationIndex) {
    messagesContainer.innerHTML = "";
    currentChatHistory = [...conversationsHistory[conversationIndex]];
    currentConversationIndex = conversationIndex; // Definir o índice da conversa atual
    
    currentChatHistory.forEach((msg) => {
      const text = msg.parts[0].text;
      addMessage(msg.role === "user" ? "você" : "gemini", text);
    });
  }

  function deleteConversation(index, event) {
    // Evitar que o clique se propague para o item da conversa
    event.stopPropagation();
    
    // Remover a conversa do array
    conversationsHistory.splice(index, 1);
    
    // Se estávamos visualizando a conversa que foi excluída
    if (currentConversationIndex === index) {
      clearChat();
      currentConversationIndex = -1;
    } else if (currentConversationIndex > index) {
      // Ajustar o índice se necessário
      currentConversationIndex--;
    }
    
    // Atualizar o armazenamento local e a exibição
    localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
    displaySavedConversations();
  }

  function displaySavedConversations() {
    conversationsList.innerHTML = "";
    conversationsHistory.forEach((conversation, index) => {
      const conversationItem = document.createElement("div");
      conversationItem.classList.add("conversation-item");
      
      // Verificar se é a conversa atual
      if (index === currentConversationIndex) {
        conversationItem.classList.add("active");
      }
      
      // Encontrar a primeira mensagem do usuário (não do bot)
      let userMessageIndex = conversation.findIndex(msg => msg.role === "user");
      let displayText = "Nova Conversa";
      
      if (userMessageIndex !== -1) {
        // Encontrou mensagem do usuário
        const firstUserMessage = conversation[userMessageIndex].parts[0].text.substring(0, 30) + "...";
        const timestamp = conversation[userMessageIndex].timestamp;
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString();
        displayText = `${formattedDate}: ${firstUserMessage}`;
      } else if (conversation.length > 0) {
        // Se não há mensagem do usuário, use a primeira mensagem (provavelmente do bot)
        displayText = "Nova Conversa " + (index + 1);
      }
      
      conversationItem.textContent = displayText;
      
      // Adicionar botão de exclusão
      const deleteBtn = document.createElement("button");
      deleteBtn.classList.add("delete-conversation");
      deleteBtn.innerHTML = "×";
      deleteBtn.title = "Excluir conversa";
      deleteBtn.addEventListener("click", (e) => deleteConversation(index, e));
      conversationItem.appendChild(deleteBtn);
      
      // Evento de clique no item da conversa
      conversationItem.addEventListener("click", () => loadConversation(index));
      
      conversationsList.appendChild(conversationItem);
    });
  }

  function newChat() {
    saveConversation();
    clearChat();
    currentConversationIndex = -1; // Indicar que estamos em uma nova conversa
    setTimeout(() => addBotMessage("Qual Farm iremos fazer hoje?"), 500);
  }

  function loadConversationsHistoryFromStorage() {
    const savedConversations = localStorage.getItem("conversationsHistory");
    if (savedConversations) {
      conversationsHistory = JSON.parse(savedConversations);
      displaySavedConversations();
      if (conversationsHistory.length > 0) {
        loadConversation(conversationsHistory.length - 1);
      } else {
        setTimeout(() => addBotMessage("Qual Farm iremos fazer hoje?"), 500);
      }
    } else {
      setTimeout(() => addBotMessage("Qual Farm iremos fazer hoje?"), 500);
    }
  }

  function clearChat() {
    messagesContainer.innerHTML = "";
    currentChatHistory = [];
    messagesContainer.scrollTop = 0;
  }

  sendButton.addEventListener("click", sendMessage);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
  clearChatBtn.addEventListener("click", clearChat);
  newChatBtn.addEventListener("click", newChat);

  loadConversationsHistoryFromStorage();
  console.log("Elemento inputField:", inputField);
});