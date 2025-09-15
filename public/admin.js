(() => {
  const backendUrl = window.location.origin;
  const adminPassInput = document.getElementById('adminPass');
  const enterBtn = document.getElementById('enterBtn');
  const panel = document.getElementById('panel');
  const loginBox = document.getElementById('loginBox');
  const cardTotalConversas = document.getElementById('cardTotalConversas');
  const cardTotalMensagens = document.getElementById('cardTotalMensagens');
  const listaUltimas = document.getElementById('listaUltimas');
  const textarea = document.getElementById('systemInstruction');
  const salvarBtn = document.getElementById('salvarBtn');
  const statusMsg = document.getElementById('statusMsg');

  let secret = '';

  function setStatus(msg, ok = true) {
    statusMsg.textContent = msg;
    statusMsg.style.color = ok ? '#5dd167' : '#ff6b6b';
  }

  async function fetchStats() {
    const resp = await fetch(`${backendUrl}/api/admin/stats`, {
      headers: { 'x-admin-secret': secret },
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('Falha ao obter stats');
    const data = await resp.json();
    cardTotalConversas.textContent = data.totalConversas ?? '-';
    cardTotalMensagens.textContent = data.totalMensagens ?? '-';
    listaUltimas.innerHTML = '';
    (data.ultimas5 || []).forEach((c) => {
      const li = document.createElement('li');
      const d = c.createdAt ? new Date(c.createdAt) : null;
      li.textContent = `${c.titulo || 'Sem título'}${d ? ' — ' + d.toLocaleString('pt-BR') : ''}`;
      listaUltimas.appendChild(li);
    });
  }

  async function fetchInstruction() {
    const resp = await fetch(`${backendUrl}/api/admin/system-instruction`, {
      headers: { 'x-admin-secret': secret },
      cache: 'no-store'
    });
    if (!resp.ok) throw new Error('Falha ao obter system instruction');
    const data = await resp.json();
    textarea.value = data.systemInstruction || '';
  }

  async function saveInstruction() {
    const body = { systemInstruction: textarea.value };
    const resp = await fetch(`${backendUrl}/api/admin/system-instruction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('Falha ao salvar system instruction');
    setStatus('Instrução salva com sucesso.');
  }

  enterBtn.addEventListener('click', async () => {
    secret = (adminPassInput.value || '').trim();
    if (!secret) return setStatus('Informe a senha.', false);
    try {
      await fetchStats();
      await fetchInstruction();
      loginBox.classList.add('hidden');
      panel.classList.remove('hidden');
      setStatus('');
    } catch (e) {
      setStatus('Senha inválida ou erro ao acessar.', false);
    }
  });

  salvarBtn.addEventListener('click', async () => {
    try {
      await saveInstruction();
      await fetchStats();
    } catch (e) {
      setStatus('Erro ao salvar.', false);
    }
  });
})();


