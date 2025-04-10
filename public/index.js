async function sendMessage() {
  const userInput = document.getElementById('user-input').value;
  if (!userInput) return;

  addMessage(userInput, 'user-message');

  try {
    const response = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: userInput })
    });

    const data = await response.json();

    if (data.text) {
      addMessage(data.text, 'bot-message');
    } else {
      addMessage('Erro ao obter resposta do bot.', 'bot-message');
    }
  } catch (error) {
    addMessage('Erro na conexão com o servidor.', 'bot-message');
    console.error(error);
  }

  document.getElementById('user-input').value = '';
}

function addMessage(message, className) {
  const chatContainer = document.getElementById('chat-container');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${className}`;
  messageDiv.textContent = message;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}
