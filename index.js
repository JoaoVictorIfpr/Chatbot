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
    
    // Salvar o histórico após cada mensagem
    saveConversation();
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
    
    // Salvar o histórico após cada mensagem
    saveConversation();
  }

  // Função para adicionar chamada de função ao histórico (não visível para o usuário)
  function addFunctionCall(name, args) {
    currentChatHistory.push({
      role: "model",
      parts: [{
        functionCall: {
          name: name,
          args: args
        }
      }],
      timestamp: Date.now()
    });
    
    // Salvar após adicionar a chamada de função
    saveConversation();
  }

  // Função para adicionar resposta de função ao histórico (não visível para o usuário)
  function addFunctionResponse(name, response) {
    currentChatHistory.push({
      role: "function",
      parts: [{
        functionResponse: {
          name: name,
          response: response
        }
      }],
      timestamp: Date.now()
    });
    
    // Salvar após adicionar a resposta da função
    saveConversation();
  }

  async function sendMessage() {
    const input = inputField.value.trim();
    console.log("Valor do inputField (no sendMessage):", input);
    if (!input) {
      console.log("Input vazio, não enviando.");
      return;
    }
    
    // Remover o estado vazio se existir
    const emptyState = messagesContainer.querySelector(".empty-chat-state");
    if (emptyState) {
      messagesContainer.removeChild(emptyState);
    }
    
    addUserMessage(input);
    inputField.value = "";
    
    // Desabilitar botão de envio e mostrar indicador de loading
    sendButton.disabled = true;
    sendButton.textContent = "Enviando...";
    
    // Enviando o histórico completo para manter o contexto incluindo function calls
    const payload = {
      message: input,
      history: currentChatHistory.slice(0, -1) // Exclui a mensagem atual do usuário que acabamos de adicionar
    };
    
    console.log("Dados enviados para a API:", JSON.stringify(payload));
    
    try {
      // Altere a URL para apontar para seu servidor local
      const response = await fetch(`https://chatbot-gbxu.onrender.com/`, {
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
      
      // Adicionar quaisquer chamadas de função e respostas ao histórico
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
      // Reabilitar botão de envio
      sendButton.disabled = false;
      sendButton.textContent = "Enviar";
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
        currentConversationIndex = conversationsHistory.length - 1;
      }
      localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
      displaySavedConversations();
    }
  }

  function loadConversation(conversationIndex) {
    messagesContainer.innerHTML = "";
    currentChatHistory = [...conversationsHistory[conversationIndex]];
    currentConversationIndex = conversationIndex; // Definir o índice da conversa atual
    
    if (currentChatHistory.length === 0) {
      // Se a conversa estiver vazia, mostrar o estado vazio
      const emptyStateDiv = document.createElement("div");
      emptyStateDiv.classList.add("empty-chat-state");
      emptyStateDiv.innerHTML = `
        <div class="empty-chat-icon">💬</div>
        <h3>Gustavo, o cara das farm</h3>
        <p>Pergunte sobre farms no Minecraft, mecânicas de redstone, e dicas para otimizar seu mundo!</p>
      `;
      messagesContainer.appendChild(emptyStateDiv);
    } else {
      // Se tiver mensagens, exibi-las
      currentChatHistory.forEach((msg) => {
        if (msg.role === "user" || msg.role === "model") {
          // Se é uma mensagem de texto normal (não uma chamada de função)
          if (msg.parts[0].text !== undefined) {
            const text = msg.parts[0].text;
            addMessage(msg.role === "user" ? "você" : "Gustavo", text);
          }
          // Ignoramos as functionCalls e functionResponses pois não precisam ser mostradas na UI
        }
      });
    }
    
    // Fechar sidebar em dispositivos móveis após selecionar conversa
    if (window.innerWidth <= 900) {
      sidebar.classList.remove("active");
    }
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
      let userMessageIndex = conversation.findIndex(msg => 
        msg.role === "user" && msg.parts[0].text !== undefined
      );
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
    // Salvar a conversa atual antes de criar uma nova
    if (currentChatHistory.length > 0) {
      saveConversation();
    }
    
    clearChat();
    currentConversationIndex = -1; // Indicar que estamos em uma nova conversa
    
    // Criar uma nova conversa vazia sem mensagem de boas-vindas
    conversationsHistory.push([]);
    currentConversationIndex = conversationsHistory.length - 1;
    localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
    displaySavedConversations();
    
    // Definir o foco no campo de entrada para o usuário começar a digitar
    inputField.focus();
  }

  function loadConversationsHistoryFromStorage() {
    const savedConversations = localStorage.getItem("conversationsHistory");
    if (savedConversations) {
      try {
        conversationsHistory = JSON.parse(savedConversations);
        displaySavedConversations();
        if (conversationsHistory.length > 0) {
          // Carregar a última conversa salva
          loadConversation(conversationsHistory.length - 1);
        } else {
          // Criar uma nova conversa vazia se não houver conversas salvas
          conversationsHistory.push([]);
          currentConversationIndex = 0;
          localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
          displaySavedConversations();
        }
      } catch (error) {
        console.error("Erro ao carregar histórico de conversas:", error);
        localStorage.removeItem("conversationsHistory"); // Limpar o histórico corrompido
        conversationsHistory = [];
        
        // Criar uma nova conversa vazia após erro
        conversationsHistory.push([]);
        currentConversationIndex = 0;
        localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
        displaySavedConversations();
      }
    } else {
      // Iniciar com uma nova conversa vazia
      conversationsHistory.push([]);
      currentConversationIndex = 0;
      localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
      displaySavedConversations();
    }
    
    // Definir o foco no campo de entrada para o usuário começar a digitar
    inputField.focus();
  }

  function clearChat() {
    messagesContainer.innerHTML = "";
    currentChatHistory = [];
    messagesContainer.scrollTop = 0;
    
    // Adicionar uma dica visual quando o chat estiver vazio
    const emptyStateDiv = document.createElement("div");
    emptyStateDiv.classList.add("empty-chat-state");
    emptyStateDiv.innerHTML = `
      <div class="empty-chat-icon">💬</div>
      <h3>Gustavo, o cara das farm</h3>
      <p>Pergunte sobre farms no Minecraft, mecânicas de redstone, e dicas para otimizar seu mundo!</p>
    `;
    messagesContainer.appendChild(emptyStateDiv);
  }

  // Toggle sidebar em dispositivos móveis
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
    newChat(); // Iniciar nova conversa após limpar o chat
  });
  newChatBtn.addEventListener("click", newChat);

  loadConversationsHistoryFromStorage();
  console.log("Elemento inputField:", inputField);
});