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

  function addMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);
    messageDiv.innerHTML = `<strong>${sender.toUpperCase()}</strong><br>${text}`;
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
    addMessage("gemini", message);
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
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      addBotMessage("Erro ao se comunicar com o servidor. Tente novamente mais tarde.");
    }
  }

  function saveConversation() {
    if (currentChatHistory.length > 0) {
      conversationsHistory.push([...currentChatHistory]);
      localStorage.setItem("conversationsHistory", JSON.stringify(conversationsHistory));
      displaySavedConversations();
    }
  }

  function loadConversation(conversationIndex) {
    messagesContainer.innerHTML = "";
    currentChatHistory = [...conversationsHistory[conversationIndex]];
    currentChatHistory.forEach((msg) => {
      const text = msg.parts[0].text;
      addMessage(msg.role === "user" ? "você" : "gemini", text);
    });
  }

  function displaySavedConversations() {
    conversationsList.innerHTML = "";
    conversationsHistory.forEach((conversation, index) => {
      const conversationItem = document.createElement("div");
      conversationItem.classList.add("conversation-item");
      let displayText = "Nova Conversa";
      if (conversation.length > 0 && conversation[0].timestamp) {
        const firstMessage = conversation[0].parts[0].text.substring(0, 30) + "...";
        const timestamp = conversation[0].timestamp;
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString();
        displayText = `${formattedDate}: ${firstMessage}`;
      } else if (conversation.length > 0) {
        displayText = conversation[0].parts[0].text.substring(0, 30) + "... (sem data)";
      }
      conversationItem.textContent = displayText;
      conversationItem.addEventListener("click", () => loadConversation(index));
      conversationsList.appendChild(conversationItem);
    });
  }

  function newChat() {
    saveConversation();
    messagesContainer.innerHTML = "";
    currentChatHistory = [];
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